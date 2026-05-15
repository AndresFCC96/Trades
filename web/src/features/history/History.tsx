import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getPipelineHistory } from '@/lib/api/endpoints';
import { fmt } from '@/lib/fmt';
import { useStore } from '@/lib/store';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { inputBoxStyle } from '@/components/ui/Field';
import { Table, type Col } from '@/components/tables/Table';
import type { Run } from '@/lib/api/types';
import { downloadCsv, downloadJson } from '@/features/audit/exportRows';

type ScoreFilter = 'any' | '>=80' | '60-80' | '<60';

export function History() {
  const setActiveRun = useStore((s) => s.setActiveRun);

  const [filter, setFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('any');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['pipeline-history'],
    queryFn: getPipelineHistory,
    refetchInterval: 15_000,
  });

  const modes = useMemo(() => {
    const s = new Set<string>();
    for (const r of history) s.add(r.mode);
    return Array.from(s).sort();
  }, [history]);

  const filtered = useMemo(() => {
    const f = filter.toLowerCase();
    return history
      .slice()
      .reverse()
      .filter((r) => {
        if (f && !r.run_id.toLowerCase().includes(f)) return false;
        if (modeFilter !== 'all' && r.mode !== modeFilter) return false;
        if (scoreFilter === '>=80' && r.quality_score < 80) return false;
        if (
          scoreFilter === '60-80' &&
          (r.quality_score < 60 || r.quality_score >= 80)
        )
          return false;
        if (scoreFilter === '<60' && r.quality_score >= 60) return false;
        return true;
      });
  }, [history, filter, modeFilter, scoreFilter]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedRuns = history.filter((r) => selected.has(r.run_id));

  const cols: Col<Run>[] = [
    {
      label: '',
      render: (r) => (
        <input
          type="checkbox"
          checked={selected.has(r.run_id)}
          onChange={() => toggle(r.run_id)}
          style={{ accentColor: '#4ade80' }}
        />
      ),
    },
    {
      label: 'RUN_ID',
      render: (r) => (
        <span
          className="cursor-pointer text-fg hover:opacity-80"
          onClick={() => setActiveRun(r)}
          title="Set as active run"
        >
          {fmt.short(r.run_id, 24)}
        </span>
      ),
    },
    {
      label: 'STARTED',
      render: (r) => <span className="text-muted">{fmt.dt(r.started_at)}</span>,
    },
    {
      label: 'MODE',
      render: (r) => <Badge tone={r.mode === 'stream' ? 'accent' : 'neutral'}>{r.mode}</Badge>,
    },
    { label: 'DURATION', align: 'right', render: (r) => fmt.dur(r.duration_ms) },
    { label: 'IN', align: 'right', render: (r) => fmt.num(r.trades_in) },
    { label: 'OUT', align: 'right', render: (r) => fmt.num(r.trades_out) },
    {
      label: 'REJ',
      align: 'right',
      render: (r) => (
        <span style={{ color: '#f87171' }}>{fmt.num(r.trades_in - r.trades_out)}</span>
      ),
    },
    {
      label: 'SCORE',
      align: 'right',
      render: (r) => (
        <span
          style={{
            color: r.quality_score >= 80 ? '#4ade80' : r.quality_score >= 60 ? '#fbbf24' : '#f87171',
          }}
        >
          {r.quality_score.toFixed(1)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4">
      <Panel
        title={`Pipeline Run History · ${history.length} runs${isLoading ? ' (loading…)' : ''}`}
        right={
          <div className="flex gap-1.5">
            <Btn
              kind={selected.size >= 2 ? 'primary' : 'solid'}
              disabled={selected.size < 2}
              onClick={() => setCompareOpen(true)}
            >
              COMPARE {selected.size}
            </Btn>
            <Btn kind="solid" onClick={() => downloadJson(filtered, 'pipeline_history')}>
              EXPORT JSON
            </Btn>
            <Btn
              kind="solid"
              onClick={() => downloadCsv(filtered as Array<Record<string, unknown>>, 'pipeline_history')}
            >
              EXPORT CSV
            </Btn>
          </div>
        }
      >
        <div className="flex gap-2 mb-2.5">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter run_id…"
            style={{ ...inputBoxStyle, flex: 1, marginTop: 0 }}
          />
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            style={{ ...inputBoxStyle, marginTop: 0, width: 130, appearance: 'menulist' }}
          >
            <option value="all">ALL MODES</option>
            {modes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value as ScoreFilter)}
            style={{ ...inputBoxStyle, marginTop: 0, width: 140, appearance: 'menulist' }}
          >
            <option value="any">SCORE: ANY</option>
            <option value=">=80">SCORE ≥ 80</option>
            <option value="60-80">SCORE 60—80</option>
            <option value="<60">SCORE &lt; 60</option>
          </select>
        </div>
        <div style={{ maxHeight: 540, overflow: 'auto' }}>
          <Table dense sticky cols={cols} rows={filtered} emptyLabel="— NO RUNS MATCH —" />
        </div>
      </Panel>

      {compareOpen && selectedRuns.length >= 2 && (
        <CompareModal runs={selectedRuns} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );
}

function CompareModal({ runs, onClose }: { runs: Run[]; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', padding: 40 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-panel rounded-[2px]"
        style={{
          width: '90%',
          maxWidth: 1100,
          maxHeight: '85vh',
          overflow: 'auto',
          border: '1px solid var(--border)',
        }}
      >
        <div
          className="flex justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="font-mono text-fg" style={{ fontSize: 12 }}>
            COMPARE · {runs.length} RUNS
          </span>
          <span onClick={onClose} className="cursor-pointer text-muted" role="button">
            ✕
          </span>
        </div>
        <div
          className="p-4 grid gap-3 font-mono text-sm"
          style={{ gridTemplateColumns: `200px repeat(${runs.length}, 1fr)` }}
        >
          <div />
          {runs.map((r) => (
            <div key={r.run_id} className="text-fg">
              {fmt.short(r.run_id, 20)}
            </div>
          ))}
          {(
            [
              ['STARTED', (r: Run) => fmt.dt(r.started_at)],
              ['MODE', (r: Run) => r.mode],
              ['DURATION', (r: Run) => fmt.dur(r.duration_ms)],
              ['TRADES IN', (r: Run) => fmt.num(r.trades_in)],
              ['TRADES OUT', (r: Run) => fmt.num(r.trades_out)],
              ['REJECTED', (r: Run) => fmt.num(r.trades_in - r.trades_out)],
              ['SCORE', (r: Run) => r.quality_score.toFixed(1)],
            ] as Array<[string, (r: Run) => string]>
          ).map(([k, fn]) => (
            <Cells key={k} label={k} fn={fn} runs={runs} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Cells({
  label,
  fn,
  runs,
}: {
  label: string;
  fn: (r: Run) => string;
  runs: Run[];
}) {
  return (
    <>
      <div className="text-muted">{label}</div>
      {runs.map((r) => (
        <div key={r.run_id}>{fn(r)}</div>
      ))}
    </>
  );
}
