import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import {
  getPipelineHistory,
  getBusinessReport,
  getAuditTrades,
} from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/fmt';

import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Btn } from '@/components/ui/Btn';
import { KPI } from '@/components/ui/KPI';
import { Gauge } from '@/components/charts/Gauge';
import { Sparkline } from '@/components/charts/Sparkline';
import { AreaChart } from '@/components/charts/AreaChart';
import { HBars } from '@/components/charts/HBars';
import { Table, type Col } from '@/components/tables/Table';
import type { Run, AuditEvent } from '@/lib/api/types';

export function Overview() {
  const navigate = useNavigate();
  const activeRun = useStore((s) => s.activeRun);
  const setActiveRun = useStore((s) => s.setActiveRun);

  const { data: history = [], isLoading: histLoading } = useQuery({
    queryKey: ['pipeline-history'],
    queryFn: getPipelineHistory,
    refetchInterval: 15_000,
  });

  // Auto-pick last run if nothing selected
  useEffect(() => {
    if (!activeRun && history.length > 0) {
      setActiveRun(history[history.length - 1]);
    }
  }, [activeRun, history, setActiveRun]);

  const hasRun = !!activeRun;

  const { data: business } = useQuery({
    queryKey: ['business-report'],
    queryFn: getBusinessReport,
    enabled: hasRun,
    retry: false,
  });

  const { data: rejections = [] } = useQuery({
    queryKey: ['audit-trades'],
    queryFn: getAuditTrades,
    enabled: hasRun,
    retry: false,
  });

  // ------- Derived series (computed before any early return so the hook
  //         order stays stable across renders) ----------------------
  const recent = history.slice().reverse().slice(0, 10);
  const last30 = history.slice(-30);
  const scores = last30.map((r) => r.quality_score);
  const rejectionsSeries = last30.slice(-10).map((r) => r.trades_in - r.trades_out);

  const ruleRejects = useMemo(() => {
    const byRule = new Map<string, number>();
    for (const ev of rejections as AuditEvent[]) {
      const id = (ev.rule_id as string) ?? 'UNKNOWN';
      byRule.set(id, (byRule.get(id) ?? 0) + 1);
    }
    return Array.from(byRule.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [rejections]);

  // ------- Empty state ---------------------------------------------
  if (!histLoading && history.length === 0) {
    return (
      <div className="p-4">
        <Panel title="Overview">
          <div className="py-12 text-center font-mono">
            <div className="text-fg text-base mb-2">— NO RUNS YET —</div>
            <div className="text-muted text-sm mb-6">
              Press ▶ RUN PIPELINE on the top bar to execute the first run.
            </div>
            <Btn kind="primary" size="md" onClick={() => navigate({ to: '/run' })}>
              ▶ START FIRST RUN
            </Btn>
          </div>
        </Panel>
      </div>
    );
  }
  const totalRejected = ruleRejects.reduce((a, b) => a + b.value, 0);

  const tradesIn = activeRun?.trades_in ?? 0;
  const tradesOut = activeRun?.trades_out ?? 0;
  const rejected = tradesIn - tradesOut;
  const score = activeRun?.quality_score ?? 0;
  const totalNotional = business?.summary?.total_notional ?? 0;
  const assetClassCount = business?.by_asset_class?.length ?? 0;
  const venueCount = business?.venue_concentration?.length ?? 0;

  const scoreTone = score >= 80 ? 'ok' : score >= 60 ? 'warn' : 'crit';

  // ------- Recent runs table cols ------------------------------------
  const cols: Col<Run>[] = [
    {
      label: 'RUN_ID',
      render: (r) => <span className="text-fg">{fmt.short(r.run_id, 22)}</span>,
    },
    {
      label: 'STARTED',
      render: (r) => <span className="text-muted">{fmt.dt(r.started_at)}</span>,
    },
    { label: 'DURATION', align: 'right', render: (r) => fmt.dur(r.duration_ms) },
    {
      label: 'MODE',
      render: (r) => <Badge tone={r.mode === 'stream' ? 'accent' : 'neutral'}>{r.mode}</Badge>,
    },
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
      render: (r) => {
        const color =
          r.quality_score >= 80 ? '#4ade80' : r.quality_score >= 60 ? '#fbbf24' : '#f87171';
        return (
          <div className="inline-flex items-center gap-1.5">
            <span style={{ color, minWidth: 32, textAlign: 'right' }}>
              {r.quality_score.toFixed(0)}
            </span>
            <div style={{ width: 40, height: 4, background: 'var(--border)' }}>
              <div
                style={{ width: `${r.quality_score}%`, height: '100%', background: color }}
              />
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* KPI row */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KPI
          label="Quality Score"
          value={score.toFixed(1)}
          tone={scoreTone}
          sub="UMBRAL ≥ 80"
          right={<Gauge value={score} size={52} label="" />}
        >
          <span />
        </KPI>
        <KPI
          label="Trades Processed"
          value={fmt.num(tradesOut)}
          tone="info"
          sub={`IN ${fmt.num(tradesIn)} · ${fmt.pct((tradesOut / Math.max(tradesIn, 1)) * 100)} OK`}
        >
          <div className="flex gap-1">
            <div style={{ flex: tradesOut, height: 4, background: '#4ade80' }} />
            <div style={{ flex: Math.max(rejected, 0), height: 4, background: '#f87171' }} />
          </div>
        </KPI>
        <KPI
          label="Rejected Trades"
          value={fmt.num(rejected)}
          tone="crit"
          sub={`${fmt.pct((rejected / Math.max(tradesIn, 1)) * 100)} del batch`}
          right={
            rejectionsSeries.length > 1 ? (
              <Sparkline data={rejectionsSeries} color="#f87171" />
            ) : undefined
          }
        />
        <KPI
          label="Total Notional (USD)"
          value={totalNotional > 0 ? fmt.usd(totalNotional) : '—'}
          tone="ok"
          sub={`${assetClassCount} ASSET CLASSES · ${venueCount} VENUES`}
        />
      </div>

      {/* charts row */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <Panel
          title="Quality Score · Last 30 Runs"
          right={<span className="text-muted">SCORE 0—100 · {last30.length} RUNS</span>}
        >
          <AreaChart data={scores.length > 1 ? scores : [score, score]} />
          <div className="flex justify-between mt-1.5 font-mono text-[9px] text-muted">
            <span>{last30.length} RUNS AGO</span>
            <span>{Math.floor(last30.length / 2)}</span>
            <span>NOW</span>
          </div>
        </Panel>
        <Panel title="Top Rejections by Rule">
          {ruleRejects.length > 0 ? (
            <>
              <HBars data={ruleRejects} color="#fbbf24" />
              <div className="mt-2.5 pt-2.5 border-t border-border-soft font-mono text-xs text-muted tracking-wider">
                TOTAL REJECTED <span style={{ color: '#f87171' }}>{fmt.num(totalRejected)}</span>
              </div>
            </>
          ) : (
            <div className="py-6 text-center font-mono text-sm text-muted">
              — NO REJECTIONS RECORDED —
            </div>
          )}
        </Panel>
      </div>

      {/* Recent Runs */}
      <Panel
        title="Recent Runs · Last 10"
        right={<Btn onClick={() => navigate({ to: '/history' })}>VIEW HISTORY →</Btn>}
      >
        <Table
          dense
          cols={cols}
          rows={recent}
          onRow={(r) => setActiveRun(r)}
          emptyLabel="— NO RUNS YET —"
        />
      </Panel>
    </div>
  );
}
