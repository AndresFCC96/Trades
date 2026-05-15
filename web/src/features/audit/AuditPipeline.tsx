import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getAuditPipeline } from '@/lib/api/endpoints';
import { fmt } from '@/lib/fmt';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import type { AuditEvent } from '@/lib/api/types';
import { downloadCsv, downloadJson } from './exportRows';

type RunGroup = {
  run_id: string;
  started_at: string;
  stages: AuditEvent[];
  total_in: number;
  total_out: number;
  total_dur_ms: number;
  ok_count: number;
};

export function AuditPipeline() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Pull a wide slice (4 events per run, so up to ~2500 runs) and
  // group client-side; switching to server-side grouping is a backlog.
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['audit-pipeline'],
    queryFn: () => getAuditPipeline({ limit: 10_000 }),
    refetchInterval: 10_000,
  });
  const events = pageData?.events ?? [];

  const groups: RunGroup[] = useMemo(() => {
    const m = new Map<string, RunGroup>();
    for (const ev of events) {
      const runId = (ev.pipeline_run_id as string) ?? 'unknown';
      const ts = (ev.timestamp_utc as string) ?? '';
      const trades_in = Number(ev.trades_in ?? 0);
      const trades_out = Number(ev.trades_out ?? 0);
      const dur = Number(ev.duration_ms ?? 0);
      const status = (ev.status as string) ?? 'unknown';
      const existing = m.get(runId);
      if (existing) {
        existing.stages.push(ev);
        existing.total_dur_ms += dur;
        if (trades_in > existing.total_in) existing.total_in = trades_in;
        if (trades_out > 0) existing.total_out = trades_out;
        if (status === 'ok') existing.ok_count += 1;
      } else {
        m.set(runId, {
          run_id: runId,
          started_at: ts,
          stages: [ev],
          total_in: trades_in,
          total_out: trades_out,
          total_dur_ms: dur,
          ok_count: status === 'ok' ? 1 : 0,
        });
      }
    }
    return Array.from(m.values()).sort((a, b) => b.started_at.localeCompare(a.started_at));
  }, [events]);

  return (
    <div className="p-4">
      <Panel
        title={`Pipeline Runs · ${groups.length} runs · ${events.length} stage events${isLoading ? ' (loading…)' : ''}`}
        right={
          <div className="flex gap-1.5">
            <Btn
              kind="solid"
              onClick={() => downloadJson(events, 'pipeline_audit')}
              disabled={events.length === 0}
            >
              EXPORT JSON
            </Btn>
            <Btn
              kind="solid"
              onClick={() => downloadCsv(events as Array<Record<string, unknown>>, 'pipeline_audit')}
              disabled={events.length === 0}
            >
              EXPORT CSV
            </Btn>
          </div>
        }
      >
        {groups.length === 0 ? (
          <div className="py-10 text-center font-mono text-sm text-muted">
            — NO PIPELINE RUNS RECORDED —
          </div>
        ) : (
          groups.map((g) => {
            const isOpen = !!expanded[g.run_id];
            const allOk = g.ok_count === g.stages.length;
            return (
              <div
                key={g.run_id}
                style={{ borderBottom: '1px solid var(--border-soft)' }}
              >
                <div
                  onClick={() => setExpanded((s) => ({ ...s, [g.run_id]: !s[g.run_id] }))}
                  className="grid items-center cursor-pointer font-mono text-sm"
                  style={{
                    gridTemplateColumns: '20px 1fr 130px 110px 70px 90px',
                    padding: '8px 6px',
                  }}
                >
                  <span className="text-muted">{isOpen ? '▾' : '▸'}</span>
                  <span>{fmt.short(g.run_id, 24)}</span>
                  <span className="text-muted">{fmt.dt(g.started_at)}</span>
                  <Badge tone={allOk ? 'ok' : 'crit'}>
                    {allOk ? '●' : '⚠'} {g.ok_count}/{g.stages.length} OK
                  </Badge>
                  <span style={{ textAlign: 'right' }}>{fmt.dur(g.total_dur_ms)}</span>
                  <span style={{ textAlign: 'right' }} className="text-muted">
                    {fmt.num(g.total_out)} / {fmt.num(g.total_in)}
                  </span>
                </div>
                {isOpen && (
                  <div className="bg-bg" style={{ padding: '6px 20px 12px' }}>
                    {g.stages
                      .slice()
                      .sort((a, b) =>
                        ((a.timestamp_utc as string) ?? '').localeCompare(
                          (b.timestamp_utc as string) ?? ''
                        )
                      )
                      .map((s, i) => {
                        const ok = (s.status as string) === 'ok';
                        return (
                          <div
                            key={i}
                            className="grid items-center font-mono"
                            style={{
                              gridTemplateColumns: '14px 100px 1fr 80px 80px 90px',
                              padding: '4px 0',
                              fontSize: 10,
                            }}
                          >
                            <span style={{ color: ok ? '#4ade80' : '#f87171' }}>
                              {ok ? '✓' : '✕'}
                            </span>
                            <Badge tone={ok ? 'ok' : 'crit'}>
                              {String(s.stage ?? '?').toUpperCase()}
                            </Badge>
                            <span className="text-muted">
                              {fmt.dt((s.timestamp_utc as string) ?? '')}
                            </span>
                            <span
                              className="text-muted"
                              style={{ textAlign: 'right' }}
                            >
                              {fmt.num(Number(s.trades_in ?? 0))} in
                            </span>
                            <span
                              className="text-muted"
                              style={{ textAlign: 'right' }}
                            >
                              {fmt.num(Number(s.trades_out ?? 0))} out
                            </span>
                            <span style={{ textAlign: 'right' }}>
                              {fmt.dur(Number(s.duration_ms ?? 0))}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Panel>
    </div>
  );
}
