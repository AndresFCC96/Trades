import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  getBusinessReport,
  downloadBusinessReport,
} from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/fmt';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { SummaryStat } from '@/components/ui/SummaryStat';
import { RiskCard } from '@/components/ui/RiskCard';
import { Table, type Col } from '@/components/tables/Table';
import { DonutChart } from '@/components/charts/DonutChart';
import { Treemap } from '@/components/charts/Treemap';
import { DualLineChart } from '@/components/charts/DualLineChart';
import { HourHistogram } from '@/components/charts/HourHistogram';
import type { BusinessReport } from '@/lib/api/types';

export function BusinessReportScreen() {
  const activeRun = useStore((s) => s.activeRun);

  const { data, isLoading, error } = useQuery({
    queryKey: ['business-report'],
    queryFn: getBusinessReport,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <Panel title="Business Report">
          <div className="py-10 text-center font-mono text-sm text-muted">— LOADING —</div>
        </Panel>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4">
        <Panel title="Business Report">
          <div className="py-10 text-center font-mono">
            <div className="text-fg text-base mb-2">— NO REPORT YET —</div>
            <div className="text-muted text-sm">
              Execute a pipeline run first; the business report renders the last one.
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return <BusinessReportContent data={data} runId={activeRun?.run_id} startedAt={activeRun?.started_at} />;
}

function BusinessReportContent({
  data,
  runId,
  startedAt,
}: {
  data: BusinessReport;
  runId?: string;
  startedAt?: string;
}) {
  const totalNotional = data.summary?.total_notional ?? 0;
  const totalTrades = data.summary?.total_trades ?? 0;
  const ac = data.by_asset_class ?? [];
  const cp = data.top_counterparties ?? [];
  const venues = data.venue_concentration ?? [];
  const byDay = data.by_day ?? [];
  const byHour = data.by_hour ?? [];
  const risk = data.risk_distribution ?? { high: 0, medium: 0, low: 0 };

  const riskTotal = Math.max(risk.high + risk.medium + risk.low, 1);

  // Asset-class rows enriched with computed buy-pct + share
  const acRows = useMemo(
    () =>
      ac.map((row) => ({
        ...row,
        buy_pct_num: Math.round((row.buy_pct ?? 0) * 100),
        share: totalNotional > 0 ? (row.total_notional / totalNotional) * 100 : 0,
      })),
    [ac, totalNotional]
  );

  const acCols: Col<(typeof acRows)[number]>[] = [
    {
      label: 'CLASS',
      render: (r) => <span style={{ color: '#a78bfa' }}>{r.asset_class}</span>,
    },
    {
      label: 'TOTAL NOTIONAL',
      align: 'right',
      render: (r) => fmt.usd(r.total_notional),
    },
    {
      label: 'AVG PRICE',
      align: 'right',
      render: (r) => r.avg_price?.toLocaleString() ?? '—',
    },
    {
      label: 'TRADES',
      align: 'right',
      render: (r) => fmt.num(r.trade_count),
    },
    {
      label: 'BUY / SELL',
      render: (r) => (
        <div className="flex h-2" style={{ width: 120, background: 'var(--border)' }}>
          <div
            style={{ width: `${r.buy_pct_num}%`, background: '#4ade80' }}
            title={`BUY ${r.buy_pct_num}%`}
          />
          <div
            style={{ width: `${100 - r.buy_pct_num}%`, background: '#f87171' }}
            title={`SELL ${100 - r.buy_pct_num}%`}
          />
        </div>
      ),
    },
    {
      label: '%',
      align: 'right',
      render: (r) => `${r.share.toFixed(1)}%`,
    },
  ];

  const cpRows = cp.map((c, i) => ({ ...c, _rank: i + 1 }));
  const cpMax = cpRows.length > 0 ? cpRows[0].total_volume : 1;
  const cpCols: Col<(typeof cpRows)[number]>[] = [
    { label: '#', align: 'right', render: (r) => <span className="text-muted">{r._rank}</span> },
    {
      label: 'COUNTERPARTY (PSEUDO)',
      render: (r) => <span className="text-fg">{r.counterparty_id}</span>,
    },
    {
      label: 'TOTAL VOLUME',
      align: 'right',
      render: (r) => fmt.usd(r.total_volume),
    },
    {
      label: 'TRADES',
      align: 'right',
      render: (r) => fmt.num(r.trade_count),
    },
    {
      label: 'SHARE',
      render: (r) => (
        <div style={{ width: 100, height: 6, background: 'var(--border)' }}>
          <div
            style={{
              width: `${(r.total_volume / cpMax) * 100}%`,
              height: '100%',
              background: '#60a5fa',
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="font-mono text-sm text-muted">
          {runId && (
            <>
              RUN <span className="text-fg">{fmt.short(runId, 22)}</span>
              {startedAt && (
                <span className="ml-4">
                  EXECUTED <span className="text-fg">{fmt.dt(startedAt)}</span>
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex gap-1.5">
          <Btn kind="solid" onClick={() => downloadBusinessReport('json')}>
            DOWNLOAD JSON
          </Btn>
          <Btn kind="solid" onClick={() => downloadBusinessReport('csv')}>
            DOWNLOAD CSV
          </Btn>
        </div>
      </div>

      {/* Summary banner */}
      <div
        className="bg-panel grid gap-4 px-4 py-3.5"
        style={{
          border: '1px solid var(--border)',
          borderLeft: '3px solid #4ade80',
          gridTemplateColumns: 'repeat(4, 1fr)',
        }}
      >
        <SummaryStat label="TOTAL TRADES" value={fmt.num(totalTrades)} />
        <SummaryStat label="TOTAL NOTIONAL" value={fmt.usd(totalNotional)} accent />
        <SummaryStat label="ASSET CLASSES" value={ac.length} />
        <SummaryStat label="VENUES" value={venues.length} />
      </div>

      {/* By Asset Class + Donut */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <Panel title="By Asset Class">
          <Table
            dense
            cols={acCols}
            rows={acRows}
            emptyLabel="— NO ASSET-CLASS BREAKDOWN —"
          />
        </Panel>
        <Panel title="Notional Donut">
          {ac.length > 0 ? (
            <DonutChart
              data={ac.map((a) => ({ label: a.asset_class, value: a.total_notional }))}
            />
          ) : (
            <div className="py-6 text-center font-mono text-sm text-muted">— EMPTY —</div>
          )}
        </Panel>
      </div>

      {/* Risk distribution */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <RiskCard tone="crit" label="HIGH RISK" count={risk.high} pct={(risk.high / riskTotal) * 100} />
        <RiskCard
          tone="warn"
          label="MEDIUM RISK"
          count={risk.medium}
          pct={(risk.medium / riskTotal) * 100}
        />
        <RiskCard tone="ok" label="LOW RISK" count={risk.low} pct={(risk.low / riskTotal) * 100} />
      </div>

      {/* Counterparties + Venue treemap */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <Panel title="Top Counterparties">
          <Table dense cols={cpCols} rows={cpRows} emptyLabel="— NO COUNTERPARTIES —" />
        </Panel>
        <Panel title="Venue Concentration · Treemap">
          {venues.length > 0 ? (
            <Treemap
              data={venues.map((v) => ({
                name: v.venue,
                share: (v.share ?? 0) * 100,
                notional: v.total_notional,
              }))}
            />
          ) : (
            <div className="py-6 text-center font-mono text-sm text-muted">— EMPTY —</div>
          )}
        </Panel>
      </div>

      {/* Temporal */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Panel title="By Day · Trades + Notional">
          {byDay.length > 1 ? (
            <DualLineChart
              data={byDay.map((d) => ({
                day: d.day,
                count: d.trade_count,
                notional: d.total_notional,
              }))}
            />
          ) : (
            <div className="py-6 text-center font-mono text-sm text-muted">
              — NEED 2+ DAYS OF DATA —
            </div>
          )}
        </Panel>
        <Panel title="By Hour · Distribution">
          {byHour.length > 0 ? (
            <HourHistogram data={byHour} />
          ) : (
            <div className="py-6 text-center font-mono text-sm text-muted">— EMPTY —</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
