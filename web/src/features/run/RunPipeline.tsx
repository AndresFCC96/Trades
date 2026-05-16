import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { runPipeline, getAuditPipeline } from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/fmt';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Field, inputBoxStyle, inputRangeStyle } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';

import {
  StageStepper,
  INITIAL_STAGES,
  type Stage,
} from './StageStepper';
import type { RunPipelineRequest, RunPipelineResponse } from '@/lib/api/types';

type Tab = 'generate' | 'load';

export function RunPipeline() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  const setActiveRun = useStore((s) => s.setActiveRun);

  const [tab, setTab] = useState<Tab>('generate');
  const [n, setN] = useState(10_000);
  const [seed, setSeed] = useState(42);
  const [nullRate, setNullRate] = useState(0.02);
  const [outlierRate, setOutlierRate] = useState(0.01);
  const [persist, setPersist] = useState(false);

  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [result, setResult] = useState<RunPipelineResponse | null>(null);
  const animationTimers = useRef<number[]>([]);

  // Cleanup timers if component unmounts mid-run
  useEffect(() => () => animationTimers.current.forEach(clearTimeout), []);

  const mutation = useMutation({
    mutationFn: (body: RunPipelineRequest) => runPipeline(body),
    onMutate: () => {
      setResult(null);
      kickoffStageAnimation();
    },
    onSuccess: async (res) => {
      // Stop the animation: mark all stages as OK (with audit durations if available)
      animationTimers.current.forEach(clearTimeout);
      animationTimers.current = [];
      await applyAuditDurations(res.run_id);
      setResult(res);
      // Best-effort: extract Run-shaped object for the store from the response
      setActiveRun({
        run_id: res.run_id,
        started_at: res.started_at,
        finished_at: res.finished_at,
        duration_ms: res.duration_ms,
        mode: res.mode,
        trades_in: res.validation_summary.total_in,
        trades_out: res.validation_summary.total_out,
        quality_score: res.quality_score,
      });
      qc.invalidateQueries({ queryKey: ['pipeline-history'] });
      qc.invalidateQueries({ queryKey: ['business-report'] });
      qc.invalidateQueries({ queryKey: ['quality-report'] });
      qc.invalidateQueries({ queryKey: ['audit-trades'] });
      addToast(
        `Run OK · score ${fmt.fixed(res.quality_score, 1)} · ${fmt.dur(res.duration_ms)}`,
        'ok'
      );
    },
    onError: (err) => {
      animationTimers.current.forEach(clearTimeout);
      animationTimers.current = [];
      setStages((curr) =>
        curr.map((s) => (s.status === 'running' ? { ...s, status: 'fail' } : s))
      );
      addToast(`Run failed · ${(err as Error).message}`, 'crit');
    },
  });

  function kickoffStageAnimation() {
    const fresh: Stage[] = INITIAL_STAGES.map((s) => ({ ...s }));
    setStages(fresh);
    // Walk each stage as running → ok with ~700ms steps (purely cosmetic;
    // real durations come from the audit log after success)
    const step = 700;
    fresh.forEach((_, i) => {
      const tStart = window.setTimeout(() => {
        setStages((curr) =>
          curr.map((s, j) => (j === i ? { ...s, status: 'running' } : s))
        );
      }, i * step);
      animationTimers.current.push(tStart);
    });
  }

  async function applyAuditDurations(runId: string) {
    try {
      // Filter by run_id server-side; only 4 stage events expected per run.
      const page = await getAuditPipeline({ run_id: runId, limit: 50 });
      const stageEvents = page.events.filter(
        (e) => (e['status'] as string) === 'ok'
      );
      // Aggregate per stage
      const byStage = new Map<string, { dur: number; tin: number; tout: number }>();
      for (const ev of stageEvents) {
        const name = (ev['stage'] as string)?.toUpperCase();
        if (!name) continue;
        byStage.set(name, {
          dur: Number(ev['duration_ms'] ?? 0),
          tin: Number(ev['trades_in'] ?? 0),
          tout: Number(ev['trades_out'] ?? 0),
        });
      }
      setStages((curr) =>
        curr.map((s) => {
          const m = byStage.get(s.name);
          return {
            ...s,
            status: 'ok',
            dur: m?.dur ?? null,
            tin: m?.tin ?? null,
            tout: m?.tout ?? null,
          };
        })
      );
    } catch {
      setStages((curr) => curr.map((s) => ({ ...s, status: 'ok' })));
    }
  }

  function onRun() {
    if (tab === 'load') {
      navigate({ to: '/sources' });
      return;
    }
    mutation.mutate({
      n_trades: n,
      seed,
      null_rate: nullRate,
      outlier_rate: outlierRate,
      mode: 'dataframe',
    });
  }

  const running = mutation.isPending;

  return (
    <div className="p-4 flex flex-col gap-4" style={{ maxWidth: 1100 }}>
      <Panel title="Pipeline Configuration">
        <div className="flex border-b border-border mb-4">
          {(
            [
              ['generate', 'GENERATE SYNTHETIC'],
              ['load', 'LOAD FROM SOURCE'],
            ] as Array<[Tab, string]>
          ).map(([id, label]) => (
            <div
              key={id}
              onClick={() => setTab(id)}
              className="px-4 py-2 font-mono text-sm tracking-wider cursor-pointer"
              style={{
                color: tab === id ? '#4ade80' : 'var(--muted)',
                borderBottom: tab === id ? '2px solid #4ade80' : '2px solid transparent',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {tab === 'generate' && (
          <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="N_TRADES" value={fmt.num(n)} hint="0 — 10,000,000">
              <input
                type="range"
                min={1000}
                max={1_000_000}
                step={1000}
                value={n}
                onChange={(e) => setN(+e.target.value)}
                style={inputRangeStyle}
              />
              <input
                type="number"
                value={n}
                onChange={(e) => setN(+e.target.value)}
                style={inputBoxStyle}
              />
            </Field>
            <Field label="SEED" value={String(seed)}>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(+e.target.value)}
                style={inputBoxStyle}
              />
            </Field>
            <Field
              label="NULL_RATE"
              value={`${(nullRate * 100).toFixed(1)}%`}
              hint="Probabilidad de campos null"
            >
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={nullRate}
                onChange={(e) => setNullRate(+e.target.value)}
                style={inputRangeStyle}
              />
            </Field>
            <Field
              label="OUTLIER_RATE"
              value={`${(outlierRate * 100).toFixed(1)}%`}
              hint="Probabilidad de outliers"
            >
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={outlierRate}
                onChange={(e) => setOutlierRate(+e.target.value)}
                style={inputRangeStyle}
              />
            </Field>
            <Field label="PERSIST RAW CSV">
              <Toggle
                checked={persist}
                onChange={() => setPersist(!persist)}
                label={persist ? 'ENABLED · outputs/raw/' : 'DISABLED'}
              />
            </Field>
          </div>
        )}

        {tab === 'load' && (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              ['csv', 'CSV / XLSX / PARQUET', 'File upload + schema mapping'],
              ['http', 'HTTP ENDPOINT', 'REST endpoint'],
              ['kafka', 'KAFKA TOPIC', 'Streaming consumer'],
            ].map(([id, name, desc]) => (
              <div
                key={id}
                onClick={() => navigate({ to: '/sources' })}
                className="p-3.5 bg-panel rounded-[2px] cursor-pointer"
                style={{ border: '1px solid var(--border)' }}
              >
                <div className="font-mono text-sm tracking-wider" style={{ color: '#4ade80' }}>
                  {name}
                </div>
                <div className="font-mono text-xs text-muted mt-1">{desc}</div>
                <div className="mt-2.5 font-mono text-xs text-fg">Configurar →</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Btn kind="primary" size="lg" onClick={onRun} disabled={running}>
            {running ? '▮▮ RUNNING…' : '▶ RUN PIPELINE'}
          </Btn>
          <span className="font-mono text-xs text-muted">
            ATAJO ⌘⇧R · El run se persiste en /audit/pipeline
          </span>
        </div>
      </Panel>

      <Panel title="Stage Execution">
        <StageStepper stages={stages} />

        {result && (
          <div
            className="mt-4 px-4 py-3 flex items-center justify-between"
            style={{
              background: 'rgba(74,222,128,0.06)',
              border: '1px solid rgba(74,222,128,0.3)',
              borderLeft: '3px solid #4ade80',
            }}
          >
            <div>
              <div
                className="font-mono font-semibold"
                style={{ color: '#4ade80', fontSize: 12 }}
              >
                ✓ RUN COMPLETED · {fmt.dur(result.duration_ms)} · QUALITY{' '}
                {fmt.fixed(result.quality_score, 1)}
              </div>
              <div className="font-mono text-xs text-muted mt-1">
                {result.run_id} · {fmt.num(result.validation_summary.total_in)} in →{' '}
                {fmt.num(result.validation_summary.total_out)} out ·{' '}
                {fmt.num(
                  result.validation_summary.total_in - result.validation_summary.total_out
                )}{' '}
                rejected
              </div>
            </div>
            <div className="flex gap-2">
              <Btn
                kind="solid"
                onClick={() => navigate({ to: '/reports/business' })}
              >
                VIEW REPORT →
              </Btn>
              <Btn onClick={() => navigate({ to: '/' })}>BACK TO OVERVIEW</Btn>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
