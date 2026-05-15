// Screens: Business, Quality — MODERN
const { useState: ub3 } = React;

// =============================================================
// BUSINESS
// =============================================================
function ScreenBusinessB({ activeRun }) {
  const ac = MOCK.assetClasses;
  const cp = MOCK.counterparties;
  const venues = MOCK.venues;
  const byHour = MOCK.byHour;
  const totalNotional = ac.reduce((a, b) => a + b.notional, 0);
  const colors = ['var(--accent)', 'var(--accent-2)', '#06b6d4', '#f59e0b', '#ef4444'];

  return (
    <div data-screen-label="04 Business Report" style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pill>Run · <span style={{ fontFamily: 'var(--mono)' }}>{fmt.short(activeRun.run_id, 22)}</span></Pill>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button kind="ghost" size="sm">Export JSON</Button>
          <Button kind="ghost" size="sm">Export CSV</Button>
          <Button kind="primary" size="sm">Share report</Button>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <SummaryB label="Total trades" value={fmt.num(activeRun.trades_out)} delta="+2.1%" />
          <SummaryB label="Total notional" value={fmt.usd(totalNotional)} delta="+8.3%" accent />
          <SummaryB label="Asset classes" value="5" />
          <SummaryB label="Venues" value="7" />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <Card title="By asset class" padded={false}>
          <TableM cols={[
            { label: 'Class', render: r => <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.name}</span> },
            { label: 'Total notional', align: 'right', mono: true, render: r => fmt.usd(r.notional) },
            { label: 'Avg price', align: 'right', mono: true, render: r => r.avg_price.toLocaleString() },
            { label: 'Trades', align: 'right', mono: true, render: r => fmt.num(r.count) },
            { label: 'Buy / Sell', render: r => (
              <div style={{ display: 'flex', height: 8, width: 120, borderRadius: 999, overflow: 'hidden', background: 'var(--chip)' }}>
                <div style={{ width: `${r.buy}%`, background: 'var(--ok)' }} />
                <div style={{ width: `${100 - r.buy}%`, background: 'var(--crit)' }} />
              </div>
            )},
            { label: 'Share', align: 'right', render: r => `${((r.notional / totalNotional) * 100).toFixed(1)}%` },
          ]} rows={ac} />
        </Card>

        <Card title="Notional distribution">
          <DonutB data={ac.map(a => ({ label: a.name, value: a.notional }))} colors={colors} />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <RiskCardB tone="crit" label="High risk" count={234} pct={2.4} desc="Notional >$5M · trader outlier" />
        <RiskCardB tone="warn" label="Medium risk" count={1284} pct={13.0} desc="Price band warning" />
        <RiskCardB tone="ok" label="Low risk" count={8329} pct={84.6} desc="Within all thresholds" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <Card title="Top counterparties" subtitle="Pseudo IDs · ranked by volume" padded={false}>
          <TableM cols={[
            { label: '#', align: 'right', render: r => <span style={{ color: 'var(--muted)' }}>{r._rank}</span> },
            { label: 'Counterparty', mono: true, render: r => r.id },
            { label: 'Alias', tone: 'muted', render: r => r.name },
            { label: 'Volume', align: 'right', mono: true, render: r => fmt.usd(r.volume) },
            { label: 'Share', render: r => (
              <div style={{ width: 100, height: 6, background: 'var(--chip)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${(r.volume / cp[0].volume) * 100}%`, height: '100%', background: 'var(--accent)' }} />
              </div>
            )},
          ]} rows={cp.map((c, i) => ({ ...c, _rank: i + 1 }))} />
        </Card>

        <Card title="Venue concentration" subtitle="Share by venue">
          <TreemapB data={venues} colors={colors} />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="By day" subtitle="Trades and notional · last 14 days">
          <DualLineB data={MOCK.byDay} />
        </Card>
        <Card title="By hour" subtitle="Hourly distribution · 0-23h UTC">
          <HourHistB data={byHour} />
        </Card>
      </div>
    </div>
  );
}

const SummaryB = ({ label, value, delta, accent }) => (
  <div>
    <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
      <div style={{ fontSize: 26, fontWeight: 600, color: accent ? 'var(--accent)' : 'var(--fg)', letterSpacing: -0.6 }}>{value}</div>
      {delta && <span style={{ fontSize: 12, color: delta.startsWith('+') ? 'var(--ok)' : 'var(--crit)', fontWeight: 500 }}>{delta}</span>}
    </div>
  </div>
);

const RiskCardB = ({ tone, label, count, pct, desc }) => {
  const color = { crit: 'var(--crit)', warn: 'var(--warn)', ok: 'var(--ok)' }[tone];
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <Pill tone={tone} dot>{label}</Pill>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--fg)', letterSpacing: -0.6 }}>{fmt.num(count)}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{desc}</div>
      <div style={{ marginTop: 12, height: 5, background: 'var(--chip)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </Card>
  );
};

const DonutB = ({ data, colors }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  let acc = 0;
  const r = 60, R = 88;
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
    <div>
      <svg width="100%" height="200" viewBox="0 0 200 200">
        {segs.map((s, i) => <path key={i} d={s.p} fill={s.color} />)}
        <text x="100" y="98" textAnchor="middle" style={{ fontSize: 18, fontWeight: 600, fill: 'var(--fg)' }}>
          {fmt.usd(total)}
        </text>
        <text x="100" y="114" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--muted)' }}>Total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '14px 1fr 60px', gap: 8, alignItems: 'center', fontSize: 12 }}>
            <span style={{ width: 10, height: 10, background: colors[i % colors.length], borderRadius: 3 }} />
            <span>{d.label}</span>
            <span style={{ color: 'var(--muted)', textAlign: 'right', fontFamily: 'var(--mono)' }}>{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TreemapB = ({ data, colors }) => {
  const total = data.reduce((a, b) => a + b.share, 0);
  const sorted = [...data].sort((a, b) => b.share - a.share);
  const W = 280, H = 220;
  const cells = [];
  // Recursive squarify-ish: just split in half by value
  function layout(items, x, y, w, h) {
    if (items.length === 0) return;
    if (items.length === 1) { cells.push({ x, y, w, h, d: items[0] }); return; }
    const half = items.reduce((a, b) => a + b.share, 0) / 2;
    let s = 0, idx = 0;
    for (let i = 0; i < items.length; i++) { s += items[i].share; if (s >= half) { idx = i + 1; break; } }
    const left = items.slice(0, idx), right = items.slice(idx);
    const leftSum = left.reduce((a, b) => a + b.share, 0);
    const ratio = leftSum / (leftSum + right.reduce((a, b) => a + b.share, 0));
    if (w > h) {
      layout(left, x, y, w * ratio, h);
      layout(right, x + w * ratio, y, w * (1 - ratio), h);
    } else {
      layout(left, x, y, w, h * ratio);
      layout(right, x, y + h * ratio, w, h * (1 - ratio));
    }
  }
  layout(sorted, 0, 0, W, H);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', borderRadius: 8 }}>
      {cells.map((c, i) => (
        <g key={i}>
          <rect x={c.x + 1} y={c.y + 1} width={c.w - 2} height={c.h - 2}
            fill={colors[i % colors.length]} opacity={0.85} rx="4" />
          <text x={c.x + 8} y={c.y + 18} style={{ fontSize: 11, fill: '#fff', fontWeight: 600 }}>{c.d.name}</text>
          {c.h > 36 && <text x={c.x + 8} y={c.y + 32} style={{ fontSize: 10, fill: 'rgba(255,255,255,0.85)' }}>{c.d.share}%</text>}
        </g>
      ))}
    </svg>
  );
};

const DualLineB = ({ data }) => {
  const w = 400, h = 200;
  const maxCount = Math.max(...data.map(d => d.count));
  const maxNot = Math.max(...data.map(d => d.notional));
  const ptsCount = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - 24 - (d.count / maxCount) * (h - 36)}`).join(' ');
  const ptsNot = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - 24 - (d.notional / maxNot) * (h - 36)}`).join(' ');
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {[0.25, 0.5, 0.75, 1].map((g, i) => (
          <line key={i} x1="0" y1={h - 24 - g * (h - 36)} x2={w} y2={h - 24 - g * (h - 36)} stroke="var(--border-soft)" strokeWidth="1" />
        ))}
        <polyline points={ptsCount} fill="none" stroke="var(--accent)" strokeWidth="2" />
        <polyline points={ptsNot} fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeDasharray="4,3" />
        {data.map((d, i) => i % 2 === 0 && (
          <text key={i} x={(i / (data.length - 1)) * w} y={h - 6} textAnchor="middle"
            style={{ fontSize: 9, fill: 'var(--muted)', fontFamily: 'var(--mono)' }}>{d.day.slice(5)}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, marginTop: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 2, background: 'var(--accent)' }} />
          <span style={{ color: 'var(--muted)' }}>Trade count</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 2, background: 'var(--accent-2)' }} />
          <span style={{ color: 'var(--muted)' }}>Notional</span>
        </span>
      </div>
    </div>
  );
};

const HourHistB = ({ data }) => {
  const w = 400, h = 200, bw = w / 24;
  const max = Math.max(...data.map(d => d.count));
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {data.map((d, i) => {
        const bh = (d.count / max) * (h - 30);
        return (
          <g key={i}>
            <rect x={i * bw + 1.5} y={h - 20 - bh} width={bw - 3} height={bh}
              fill="var(--accent)" opacity={0.4 + (d.count / max) * 0.5} rx="2" />
            {i % 3 === 0 && <text x={i * bw + bw / 2} y={h - 5} textAnchor="middle"
              style={{ fontSize: 9, fill: 'var(--muted)', fontFamily: 'var(--mono)' }}>{i.toString().padStart(2, '0')}</text>}
          </g>
        );
      })}
    </svg>
  );
};

// =============================================================
// QUALITY
// =============================================================
function ScreenQualityB({ activeRun }) {
  const score = activeRun.quality_score;
  const components = [
    { name: 'Completeness', score: 96.3, weight: 0.25, color: 'var(--ok)' },
    { name: 'Uniqueness', score: 99.1, weight: 0.15, color: 'var(--info)' },
    { name: 'Consistency', score: 88.4, weight: 0.20, color: 'var(--accent)' },
    { name: 'Validity', score: 92.7, weight: 0.25, color: 'var(--warn)' },
    { name: 'Outliers', score: 74.2, weight: 0.15, color: 'var(--crit)' },
  ];
  return (
    <div data-screen-label="05 Quality Report" style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 28, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <RadialGauge value={score} size={180} label="Quality" />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>vs. promedio · <span style={{ color: 'var(--ok)' }}>+2.4</span></div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>Weighted components</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {components.map(c => (
                <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 60px 50px', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--fg)' }}>{c.name}</span>
                  <div style={{ height: 8, background: 'var(--chip)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${c.score}%`, height: '100%', background: c.color, borderRadius: 999 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: c.color, textAlign: 'right' }}>{c.score.toFixed(1)}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>w·{c.weight}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button kind="ghost">Download JSON</Button>
            <Button kind="ghost">Download CSV</Button>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 16 }}>
        <Card title="Completeness · Nulls by column" padded={false}>
          <TableM cols={[
            { label: 'Column', mono: true, render: r => r.col },
            { label: 'Nulls', align: 'right', mono: true, render: r => fmt.num(r.nulls) },
            { label: '%', align: 'right', render: r => (
              <span style={{ fontFamily: 'var(--mono)', color: r.pct > 5 ? 'var(--crit)' : r.pct > 1 ? 'var(--warn)' : 'var(--ok)', fontWeight: 500 }}>
                {r.pct.toFixed(2)}%
              </span>
            )},
            { label: '', render: r => (
              <div style={{ width: 80, height: 5, background: 'var(--chip)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(r.pct * 4, 100)}%`, height: '100%', background: r.pct > 5 ? 'var(--crit)' : r.pct > 1 ? 'var(--warn)' : 'var(--ok)' }} />
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
        </Card>
        <Card title="Uniqueness">
          <BigB value={fmt.num(127)} sub="Duplicate trade_ids" color="var(--warn)" />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <RowB k="Unique ratio" v="98.71%" />
            <RowB k="Total rows" v={fmt.num(activeRun.trades_in)} />
            <RowB k="Dedup strategy" v="keep_first" />
          </div>
        </Card>
        <Card title="Consistency" subtitle="|notional − price·qty|">
          <ConsistencyDonutB value={88.4} />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Validity · Domain checks">
          <HBarsM data={[
            { label: 'side', value: 99.97 }, { label: 'currency', value: 98.42 },
            { label: 'asset_class', value: 97.81 }, { label: 'status', value: 99.12 },
          ]} max={100} color="var(--accent)" valueFmt={v => `${v.toFixed(2)}%`} />
        </Card>
        <Card title="Outliers detected" right={<Button kind="ghost" size="sm">View outliers →</Button>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'center' }}>
            <BigB value={fmt.num(384)} sub="Outliers" color="var(--crit)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <RowB k="Price IQR (Z>3)" v="247" />
              <RowB k="Qty extreme" v="89" />
              <RowB k="Notional anomaly" v="48" />
              <RowB k="Detection" v="IQR + Z-score" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

const RowB = ({ k, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 13 }}>
    <span style={{ color: 'var(--muted)' }}>{k}</span>
    <span style={{ color: 'var(--fg)', fontFamily: 'var(--mono)', fontWeight: 500 }}>{v}</span>
  </div>
);

const BigB = ({ value, sub, color }) => (
  <div>
    <div style={{ fontSize: 38, fontWeight: 600, color, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>
  </div>
);

const ConsistencyDonutB = ({ value }) => {
  const r = 56, c = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--chip)" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--accent)" strokeWidth="10"
          strokeDasharray={`${(value / 100) * c} ${c}`} strokeLinecap="round"
          transform="rotate(-90 70 70)" />
        <text x="70" y="76" textAnchor="middle" style={{ fontSize: 20, fontWeight: 600, fill: 'var(--accent)' }}>{value}%</text>
      </svg>
      <div style={{ flex: 1 }}>
        <RowB k="Within tolerance" v="8,704" />
        <RowB k="Outside" v="1,143" />
        <RowB k="Tolerance" v="±0.01" />
      </div>
    </div>
  );
};

Object.assign(window, { ScreenBusinessB, ScreenQualityB });
