import { useQuery } from '@tanstack/react-query';

import {
  getQualityReport,
  downloadQualityReport,
} from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/fmt';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Gauge } from '@/components/charts/Gauge';
import { ConsistencyDonut } from '@/components/charts/ConsistencyDonut';
import { HBars } from '@/components/charts/HBars';
import { Table, type Col } from '@/components/tables/Table';
import { Row, BigStat } from '@/components/ui/Row';
import type { QualityReport } from '@/lib/api/types';

const COMPONENT_LABELS: Record<string, string> = {
  completeness: 'COMPLETENESS',
  uniqueness: 'UNIQUENESS',
  consistency: 'CONSISTENCY',
  validity: 'VALIDITY',
  outliers: 'OUTLIERS',
};
const COMPONENT_COLORS: Record<string, string> = {
  completeness: '#4ade80',
  uniqueness: '#60a5fa',
  consistency: '#a78bfa',
  validity: '#fbbf24',
  outliers: '#f87171',
};

export function QualityReportScreen() {
  const activeRun = useStore((s) => s.activeRun);

  const { data, isLoading, error } = useQuery({
    queryKey: ['quality-report', activeRun?.run_id],
    queryFn: () => getQualityReport(activeRun?.run_id),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <Panel title="Quality Report">
          <div className="py-10 text-center font-mono text-sm text-muted">— LOADING —</div>
        </Panel>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4">
        <Panel title="Quality Report">
          <div className="py-10 text-center font-mono">
            <div className="text-fg text-base mb-2">— NO REPORT YET —</div>
            <div className="text-muted text-sm">
              Execute a pipeline run first; the quality report renders the last one.
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <QualityReportContent
      data={data}
      runId={activeRun?.run_id}
      tradesIn={activeRun?.trades_in ?? 0}
    />
  );
}

function QualityReportContent({
  data,
  runId,
  tradesIn,
}: {
  data: QualityReport;
  runId?: string;
  tradesIn: number;
}) {
  const score = data.score ?? 0;
  const weights = data.weights ?? {};

  // Backend exposes each component as a 0..1 ratio plus a weighted global
  // score. We compute the displayed sub-score per axis = ratio * 100.
  const components = [
    { key: 'completeness', ratio: avgCompleteness(data.completeness) },
    { key: 'uniqueness', ratio: data.uniqueness ?? 0 },
    { key: 'consistency', ratio: data.consistency ?? 0 },
    { key: 'validity', ratio: data.validity ?? 0 },
    {
      key: 'outliers',
      ratio: tradesIn > 0 ? Math.max(0, 1 - data.outliers_detected / tradesIn) : 1,
    },
  ].map((c) => ({
    key: c.key,
    label: COMPONENT_LABELS[c.key] ?? c.key.toUpperCase(),
    color: COMPONENT_COLORS[c.key] ?? '#fbbf24',
    score: c.ratio * 100,
    weight: weights[c.key] ?? 0,
  }));

  const completenessRows = Object.entries(data.completeness ?? {}).map(([col, v]) => ({
    col,
    nulls: v.nulls,
    pct: v.pct_null,
  }));

  const completenessCols: Col<(typeof completenessRows)[number]>[] = [
    { label: 'COLUMN', render: (r) => r.col },
    { label: 'NULLS', align: 'right', render: (r) => fmt.num(r.nulls) },
    {
      label: '%',
      align: 'right',
      render: (r) => (
        <span style={{ color: r.pct > 5 ? '#f87171' : r.pct > 1 ? '#fbbf24' : '#4ade80' }}>
          {r.pct.toFixed(2)}%
        </span>
      ),
    },
    {
      label: '',
      render: (r) => (
        <div style={{ width: 80, height: 4, background: 'var(--border)' }}>
          <div
            style={{
              width: `${Math.min(r.pct * 4, 100)}%`,
              height: '100%',
              background:
                r.pct > 5 ? '#f87171' : r.pct > 1 ? '#fbbf24' : '#4ade80',
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Header: gauge + weighted components + downloads */}
      <div
        className="bg-panel p-5 grid gap-6 items-center"
        style={{
          border: '1px solid var(--border)',
          gridTemplateColumns: 'auto 1fr auto',
        }}
      >
        <Gauge value={score} size={170} label="GLOBAL SCORE" />
        <div>
          <div className="font-mono text-xs text-muted tracking-wider mb-2.5">
            WEIGHTED COMPONENTS
          </div>
          <div className="flex flex-col gap-2">
            {components.map((c) => (
              <div
                key={c.key}
                className="grid items-center"
                style={{ gridTemplateColumns: '160px 1fr 60px 50px', gap: 10 }}
              >
                <span className="font-mono text-sm text-fg">{c.label}</span>
                <div style={{ height: 6, background: 'var(--border)' }}>
                  <div
                    style={{
                      width: `${c.score}%`,
                      height: '100%',
                      background: c.color,
                    }}
                  />
                </div>
                <span
                  className="font-mono text-sm text-right"
                  style={{ color: c.color }}
                >
                  {c.score.toFixed(1)}
                </span>
                <span className="font-mono text-xs text-muted">w·{c.weight}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Btn kind="solid" onClick={() => downloadQualityReport('json', runId)}>
            DOWNLOAD JSON
          </Btn>
          <Btn kind="solid" onClick={() => downloadQualityReport('csv', runId)}>
            DOWNLOAD CSV
          </Btn>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: '1.4fr 1fr 1fr' }}>
        <Panel title="Completeness · Nulls by Column">
          <Table
            dense
            cols={completenessCols}
            rows={completenessRows}
            emptyLabel="— NO COLUMN DATA —"
          />
        </Panel>
        <Panel title="Uniqueness">
          <BigStat value={fmt.num(data.duplicates ?? 0)} sub="duplicate trade_ids" color="#fbbf24" />
          <div className="mt-3 font-mono text-sm">
            <Row k="UNIQUE RATIO" v={fmt.pct((data.uniqueness ?? 0) * 100, 2)} />
            <Row k="TOTAL ROWS" v={fmt.num(tradesIn)} />
            <Row k="DEDUP STRATEGY" v="KEEP FIRST" />
          </div>
        </Panel>
        <Panel title="Consistency · |notional − price·qty|">
          <div className="flex items-center gap-3">
            <ConsistencyDonut value={(data.consistency ?? 0) * 100} />
            <div className="flex-1 font-mono text-sm">
              <Row
                k="WITHIN TOLERANCE"
                v={fmt.num(Math.round((data.consistency ?? 0) * tradesIn))}
              />
              <Row
                k="OUTSIDE"
                v={fmt.num(
                  Math.max(0, tradesIn - Math.round((data.consistency ?? 0) * tradesIn))
                )}
              />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Panel title="Validity · Domain Checks">
          <HBars
            data={[
              { label: 'GLOBAL', value: (data.validity ?? 0) * 100 },
            ]}
            max={100}
            color="#a78bfa"
            valueFmt={(v) => `${v.toFixed(2)}%`}
          />
          <div className="mt-3 font-mono text-xs text-muted">
            Backend exposes validity as a single weighted ratio across side, currency,
            asset_class, status. Per-axis breakdown is in the backlog.
          </div>
        </Panel>
        <Panel title="Outliers Detected">
          <div className="grid gap-4 items-center" style={{ gridTemplateColumns: 'auto 1fr' }}>
            <BigStat value={fmt.num(data.outliers_detected ?? 0)} sub="OUTLIERS" color="#f87171" />
            <div className="flex flex-col gap-1 font-mono text-sm">
              <Row k="DETECTION METHOD" v="IQR" />
              <Row
                k="OUTLIER RATIO"
                v={tradesIn > 0
                  ? fmt.pct((data.outliers_detected / tradesIn) * 100, 2)
                  : '—'}
              />
            </div>
          </div>
        </Panel>
      </div>

      {runId && (
        <div className="font-mono text-xs text-muted">
          RUN <span className="text-fg">{fmt.short(runId, 22)}</span>
        </div>
      )}
    </div>
  );
}

function avgCompleteness(completeness: QualityReport['completeness']): number {
  const entries = Object.values(completeness ?? {});
  if (entries.length === 0) return 1;
  const avgNullPct = entries.reduce((a, b) => a + b.pct_null, 0) / entries.length;
  return Math.max(0, 1 - avgNullPct / 100);
}
