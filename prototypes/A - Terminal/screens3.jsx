// Screens: Reports Business & Quality — TERMINAL
const { useState: us3, useMemo: um3 } = React;

// =============================================================
// BUSINESS REPORT
// =============================================================
function ScreenBusiness({ activeRun }) {
  const ac = MOCK.assetClasses;
  const cp = MOCK.counterparties;
  const venues = MOCK.venues;
  const byHour = MOCK.byHour;
  const totalNotional = ac.reduce((a, b) => a + b.notional, 0);

  return (
    <div data-screen-label="04 Business Report" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
          RUN <span style={{ color: 'var(--fg)' }}>{activeRun.run_id}</span>
          <span style={{ marginLeft: 16 }}>EXECUTED <span style={{ color: 'var(--fg)' }}>{fmt.dt(activeRun.started_at)}</span></span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn kind="solid">DOWNLOAD JSON</Btn>
          <Btn kind="solid">DOWNLOAD CSV</Btn>
        </div>
      </div>

      {/* Summary banner */}
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)', borderLeft: '3px solid #4ade80',
        padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
      }}>
        <SummaryStat label="TOTAL TRADES" value={fmt.num(activeRun.trades_out)} />
        <SummaryStat label="TOTAL NOTIONAL" value={fmt.usd(totalNotional)} accent />
        <SummaryStat label="ASSET CLASSES" value="5" />
        <SummaryStat label="VENUES" value="7" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        <Panel title="By Asset Class">
          <Table dense cols={[
            { label: 'CLASS', render: r => <span style={{ color: '#a78bfa' }}>{r.name}</span> },
            { label: 'TOTAL NOTIONAL', align: 'right', render: r => fmt.usd(r.notional) },
            { label: 'AVG PRICE', align: 'right', render: r => r.avg_price.toLocaleString() },
            { label: 'TRADES', align: 'right', render: r => fmt.num(r.count) },
            { label: 'BUY / SELL', render: r => (
              <div style={{ display: 'flex', height: 8, width: 120, background: 'var(--border)' }}>
                <div style={{ width: `${r.buy}%`, background: '#4ade80' }} title={`BUY ${r.buy}%`} />
                <div style={{ width: `${100 - r.buy}%`, background: '#f87171' }} title={`SELL ${100 - r.buy}%`} />
              </div>
            )},
            { label: '%', align: 'right', render: r => `${((r.notional / totalNotional) * 100).toFixed(1)}%` },
          ]} rows={ac} />
        </Panel>
        <Panel title="Notional Donut">
          <DonutChart data={ac.map(a => ({ label: a.name, value: a.notional }))}
            colors={['#4ade80', '#60a5fa', '#a78bfa', '#fbbf24', '#f87171']} />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <RiskCard tone="crit" label="HIGH RISK" count={234} pct={2.4} />
        <RiskCard tone="warn" label="MEDIUM RISK" count={1284} pct={13.0} />
        <RiskCard tone="ok" label="LOW RISK" count={8329} pct={84.6} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        <Panel title="Top Counterparties">
          <Table dense cols={[
            { label: '#', align: 'right', render: (r) => <span style={{ color: 'var(--muted)' }}>{r._rank}</span> },
            { label: 'COUNTERPARTY (PSEUDO)', render: r => <span style={{ color: 'var(--fg)' }}>{r.id}</span> },
            { label: 'ALIAS', render: r => <span style={{ color: 'var(--muted)' }}>{r.name}</span> },
            { label: 'TOTAL VOLUME', align: 'right', render: r => fmt.usd(r.volume) },
            { label: 'SHARE', render: r => (
              <div style={{ width: 100, height: 6, background: 'var(--border)' }}>
                <div style={{ width: `${(r.volume / cp[0].volume) * 100}%`, height: '100%', background: '#60a5fa' }} />
              </div>
            )},
          ]} rows={cp.map((c, i) => ({ ...c, _rank: i + 1 }))} />
        </Panel>
        <Panel title="Venue Concentration · Treemap">
          <Treemap data={venues} />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Panel title="By Day · Trades + Notional">
          <DualLineChart data={MOCK.byDay} />
        </Panel>
        <Panel title="By Hour · Distribution">
          <HourHistogram data={byHour} />
        </Panel>
      </div>
    </div>
  );
}

const SummaryStat = ({ label, value, accent }) => (
  <div>
    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 0.6 }}>{label}</div>
    <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: accent ? '#4ade80' : 'var(--fg)', marginTop: 2 }}>{value}</div>
  </div>
);

const RiskCard = ({ tone, label, count, pct }) => {
  const color = { crit: '#f87171', warn: '#fbbf24', ok: '#4ade80' }[tone];
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, padding: 16 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 32, color: 'var(--fg)' }}>{fmt.num(count)}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ marginTop: 10, height: 4, background: 'var(--border)' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
};

const DonutChart = ({ data, colors }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  let acc = 0;
  const r = 70, R = 90;
  const segs = data.map((d, i) => {
    const a0 = (acc / total) * 2 * Math.PI; acc += d.value;
    const a1 = (acc / total) * 2 * Math.PI;
    const x0 = 100 + R * Math.sin(a0), y0 = 100 - R * Math.cos(a0);
    const x1 = 100 + R * Math.sin(a1), y1 = 100 - R * Math.cos(a1);
    const x2 = 100 + r * Math.sin(a1), y2 = 100 - r * Math.cos(a1);
    const x3 = 100 + r * Math.sin(a0), y3 = 100 - r * Math.cos(a0);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`;
    return { p, color: colors[i % colors.length], d };
  });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'center' }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        {segs.map((s, i) => <path key={i} d={s.p} fill={s.color} />)}
        <text x="100" y="100" textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 16, fill: 'var(--fg)' }}>
          {fmt.usd(total)}
        </text>
        <text x="100" y="116" textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: 'var(--muted)' }}>TOTAL</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '12px 1fr 60px', gap: 6, fontFamily: 'var(--mono)', fontSize: 10, alignItems: 'center' }}>
            <span style={{ width: 10, height: 10, background: colors[i % colors.length] }} />
            <span>{d.label}</span>
            <span style={{ color: 'var(--muted)', textAlign: 'right' }}>{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Treemap = ({ data }) => {
  // Simple slice-and-dice
  const total = data.reduce((a, b) => a + b.share, 0);
  let x = 0, y = 0;
  const W = 280, H = 200;
  const cells = [];
  // Largest first
  const sorted = [...data].sort((a, b) => b.share - a.share);
  // Layout: first 2 take left full-height, rest stack right
  const left = sorted.slice(0, 1);
  const right = sorted.slice(1);
  const leftSum = left.reduce((a, b) => a + b.share, 0);
  const leftW = (leftSum / total) * W;
  const rightW = W - leftW;
  let ly = 0;
  left.forEach(d => {
    const h = (d.share / leftSum) * H;
    cells.push({ x: 0, y: ly, w: leftW, h, d });
    ly += h;
  });
  const rightSum = right.reduce((a, b) => a + b.share, 0);
  let ry = 0;
  right.forEach((d, i) => {
    const h = (d.share / rightSum) * H;
    cells.push({ x: leftW, y: ry, w: rightW, h, d });
    ry += h;
  });
  const colors = ['#4ade80', '#60a5fa', '#a78bfa', '#fbbf24', '#f87171', '#34d399', '#fb923c'];
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {cells.map((c, i) => (
        <g key={i}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} fill={colors[i % colors.length]} opacity="0.7" stroke="#0a0c10" strokeWidth="1" />
          <text x={c.x + 6} y={c.y + 16} style={{ fontFamily: 'var(--mono)', fontSize: 11, fill: '#0a0c10', fontWeight: 600 }}>{c.d.name}</text>
          <text x={c.x + 6} y={c.y + 30} style={{ fontFamily: 'var(--mono)', fontSize: 10, fill: '#0a0c10' }}>{c.d.share}% · {fmt.usd(c.d.notional)}</text>
        </g>
      ))}
    </svg>
  );
};

const DualLineChart = ({ data }) => {
  const w = 380, h = 180;
  const maxCount = Math.max(...data.map(d => d.count));
  const maxNot = Math.max(...data.map(d => d.notional));
  const ptsCount = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - 20 - (d.count / maxCount) * (h - 30)}`).join(' ');
  const ptsNot = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - 20 - (d.notional / maxNot) * (h - 30)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={ptsCount} fill="none" stroke="#4ade80" strokeWidth="1.4" />
      <polyline points={ptsNot} fill="none" stroke="#60a5fa" strokeWidth="1.4" strokeDasharray="3,2" />
      {data.map((d, i) => i % 2 === 0 && (
        <text key={i} x={(i / (data.length - 1)) * w} y={h - 4} style={{ fontFamily: 'var(--mono)', fontSize: 8, fill: 'var(--muted)' }}>{d.day.slice(8)}</text>
      ))}
      <text x={6} y={12} style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: '#4ade80' }}>● trades</text>
      <text x={70} y={12} style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: '#60a5fa' }}>--- notional</text>
    </svg>
  );
};

const HourHistogram = ({ data }) => {
  const w = 380, h = 180;
  const max = Math.max(...data.map(d => d.count));
  const bw = w / 24;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {data.map((d, i) => {
        const bh = (d.count / max) * (h - 30);
        return (
          <g key={i}>
            <rect x={i * bw + 1} y={h - 20 - bh} width={bw - 2} height={bh} fill="#a78bfa" opacity={0.4 + (d.count / max) * 0.6} />
            {i % 3 === 0 && <text x={i * bw + bw / 2} y={h - 4} textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 8, fill: 'var(--muted)' }}>{i.toString().padStart(2, '0')}</text>}
          </g>
        );
      })}
    </svg>
  );
};

// =============================================================
// QUALITY REPORT
// =============================================================
function ScreenQuality({ activeRun }) {
  const score = activeRun.quality_score;
  const components = [
    { name: 'COMPLETENESS', score: 96.3, weight: 0.25, color: '#4ade80' },
    { name: 'UNIQUENESS', score: 99.1, weight: 0.15, color: '#60a5fa' },
    { name: 'CONSISTENCY', score: 88.4, weight: 0.20, color: '#a78bfa' },
    { name: 'VALIDITY', score: 92.7, weight: 0.25, color: '#fbbf24' },
    { name: 'OUTLIERS', score: 74.2, weight: 0.15, color: '#f87171' },
  ];
  return (
    <div data-screen-label="05 Quality Report" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24,
        background: 'var(--panel)', border: '1px solid var(--border)', padding: 20, alignItems: 'center',
      }}>
        <Gauge value={score} size={170} label="GLOBAL SCORE" />
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 0.6, marginBottom: 10 }}>WEIGHTED COMPONENTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {components.map(c => (
              <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 60px 50px', gap: 10, alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)' }}>{c.name}</span>
                <div style={{ height: 6, background: 'var(--border)' }}>
                  <div style={{ width: `${c.score}%`, height: '100%', background: c.color }} />
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: c.color, textAlign: 'right' }}>{c.score.toFixed(1)}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>w·{c.weight}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Btn kind="solid">DOWNLOAD JSON</Btn>
          <Btn kind="solid">DOWNLOAD CSV</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12 }}>
        <Panel title="Completeness · Nulls by Column">
          <Table dense cols={[
            { label: 'COLUMN', render: r => r.col },
            { label: 'NULLS', align: 'right', render: r => fmt.num(r.nulls) },
            { label: '%', align: 'right', render: r => <span style={{ color: r.pct > 5 ? '#f87171' : r.pct > 1 ? '#fbbf24' : '#4ade80' }}>{r.pct.toFixed(2)}%</span> },
            { label: '', render: r => (
              <div style={{ width: 80, height: 4, background: 'var(--border)' }}>
                <div style={{ width: `${Math.min(r.pct * 4, 100)}%`, height: '100%', background: r.pct > 5 ? '#f87171' : r.pct > 1 ? '#fbbf24' : '#4ade80' }} />
              </div>
            )},
          ]} rows={[
            { col: 'trade_id', nulls: 0, pct: 0 }, { col: 'timestamp', nulls: 12, pct: 0.12 },
            { col: 'side', nulls: 4, pct: 0.04 }, { col: 'asset_class', nulls: 23, pct: 0.23 },
            { col: 'instrument', nulls: 38, pct: 0.38 }, { col: 'currency', nulls: 91, pct: 0.91 },
            { col: 'quantity', nulls: 8, pct: 0.08 }, { col: 'price', nulls: 14, pct: 0.14 },
            { col: 'notional', nulls: 142, pct: 1.42 }, { col: 'trader_id', nulls: 487, pct: 4.87 },
            { col: 'counterparty_id', nulls: 612, pct: 6.12 }, { col: 'venue', nulls: 28, pct: 0.28 },
          ]} />
        </Panel>
        <Panel title="Uniqueness">
          <BigStat value={fmt.num(127)} sub="duplicate trade_ids" color="#fbbf24" />
          <div style={{ marginTop: 12, fontFamily: 'var(--mono)', fontSize: 11 }}>
            <Row k="UNIQUE RATIO" v="98.71%" />
            <Row k="TOTAL ROWS" v={fmt.num(activeRun.trades_in)} />
            <Row k="DEDUP STRATEGY" v="KEEP FIRST" />
          </div>
        </Panel>
        <Panel title="Consistency · |notional − price·qty|">
          <ConsistencyDonut value={88.4} />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Panel title="Validity · Domain Checks">
          <HBars data={[
            { label: 'SIDE', value: 99.97 },
            { label: 'CURRENCY', value: 98.42 },
            { label: 'ASSET_CLASS', value: 97.81 },
            { label: 'STATUS', value: 99.12 },
          ]} max={100} color="#a78bfa" valueFmt={v => `${v.toFixed(2)}%`} />
        </Panel>
        <Panel title="Outliers Detected" right={<Btn kind="solid">VIEW OUTLIERS →</Btn>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center' }}>
            <BigStat value={fmt.num(384)} sub="OUTLIERS" color="#f87171" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'var(--mono)', fontSize: 11 }}>
              <Row k="PRICE IQR (Z>3)" v="247" />
              <Row k="QTY EXTREME" v="89" />
              <Row k="NOTIONAL ANOMALY" v="48" />
              <Row k="DETECTION METHOD" v="IQR + Z-SCORE" />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

const Row = ({ k, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-soft)' }}>
    <span style={{ color: 'var(--muted)' }}>{k}</span>
    <span style={{ color: 'var(--fg)' }}>{v}</span>
  </div>
);

const BigStat = ({ value, sub, color }) => (
  <div>
    <div style={{ fontFamily: 'var(--mono)', fontSize: 38, fontWeight: 500, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 0.6, marginTop: 4 }}>{sub}</div>
  </div>
);

const ConsistencyDonut = ({ value }) => {
  const r = 60, c = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle cx="75" cy="75" r={r} fill="none" stroke="#a78bfa" strokeWidth="10"
          strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 75 75)" strokeLinecap="square" />
        <text x="75" y="80" textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 22, fill: '#a78bfa' }}>{value}%</text>
      </svg>
      <div style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 11 }}>
        <Row k="WITHIN TOLERANCE" v="8,704" />
        <Row k="OUTSIDE" v="1,143" />
        <Row k="TOLERANCE" v="±0.01" />
      </div>
    </div>
  );
};

Object.assign(window, { ScreenBusiness, ScreenQuality });
