// Primitives — ATLAS (data-viz first, editorial)
const { useState, useEffect, useRef, useMemo, Fragment } = React;

// Chart color palette — multi-hue, saturated for chart protagonism
const CHART = {
  blue: '#2d5cf6',
  teal: '#0d9488',
  pink: '#db2777',
  orange: '#ea580c',
  violet: '#7c3aed',
  amber: '#d97706',
  green: '#15803d',
  red: '#dc2626',
};
const SERIES = [CHART.blue, CHART.teal, CHART.pink, CHART.orange, CHART.violet, CHART.amber, CHART.green];

// ============== Layout primitives ==============
const Block = ({ children, style }) => (
  <section style={{ ...style }}>{children}</section>
);

const Eyebrow = ({ children, style }) => (
  <div style={{
    fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.4,
    textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500, ...style,
  }}>{children}</div>
);

const Headline = ({ children, size = 'lg', style, as }) => {
  const sizes = {
    xs: { fontSize: 14, lineHeight: 1.3 },
    sm: { fontSize: 16, lineHeight: 1.3 },
    md: { fontSize: 20, lineHeight: 1.25 },
    lg: { fontSize: 28, lineHeight: 1.15 },
    xl: { fontSize: 40, lineHeight: 1.05 },
    xxl: { fontSize: 56, lineHeight: 1 },
  };
  const Tag = as || (size === 'xxl' || size === 'xl' ? 'h1' : 'h2');
  return (
    <Tag style={{
      fontFamily: 'var(--serif)', fontWeight: 500,
      color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0,
      ...sizes[size], ...style,
    }}>{children}</Tag>
  );
};

const FigCaption = ({ children, style }) => (
  <div style={{
    fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)',
    lineHeight: 1.5, ...style,
  }}>{children}</div>
);

const Divider = ({ style }) => (
  <div style={{ height: 1, background: 'var(--rule)', ...style }} />
);

const Tag = ({ children, color = 'var(--ink)', style }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500,
    color, letterSpacing: 0.3, ...style,
  }}>
    <span style={{ width: 8, height: 8, background: color, borderRadius: 1 }} />
    {children}
  </span>
);

const Btn = ({ kind = 'ghost', size = 'md', children, onClick, style, disabled }) => {
  const base = {
    padding: size === 'lg' ? '10px 20px' : size === 'sm' ? '4px 10px' : '7px 14px',
    fontSize: size === 'lg' ? 14 : size === 'sm' ? 12 : 13,
    fontFamily: 'var(--sans)', fontWeight: 500,
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'all 0.12s',
    letterSpacing: -0.1,
  };
  const kinds = {
    ghost: { background: 'transparent', color: 'var(--ink)', borderColor: 'var(--rule-strong)' },
    solid: { background: 'var(--ink)', color: 'var(--paper)' },
    primary: { background: CHART.blue, color: '#fff' },
    pill: { background: 'var(--chip)', color: 'var(--ink)', borderRadius: 999 },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
};

// ============== Charts ==============
const BigNumber = ({ value, label, sub, color = 'var(--ink)', size = 'lg' }) => {
  const sizes = { sm: 32, md: 44, lg: 56, xl: 72 };
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div style={{
        fontFamily: 'var(--serif)', fontSize: sizes[size], color, lineHeight: 1,
        marginTop: 6, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', fontWeight: 500,
      }}>{value}</div>
      {sub && <FigCaption style={{ marginTop: 4 }}>{sub}</FigCaption>}
    </div>
  );
};

const RingGauge = ({ value, size = 200, label }) => {
  const tone = value >= 80 ? CHART.green : value >= 60 ? CHART.amber : CHART.red;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rule)" strokeWidth="2" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="8"
        strokeLinecap="butt" strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: 'var(--serif)', fontSize: size * 0.28, fontWeight: 500, fill: 'var(--ink)', letterSpacing: '-0.04em' }}>
        {value.toFixed(1)}
      </text>
      {label && <text x={size / 2} y={size * 0.78} textAnchor="middle"
        style={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </text>}
    </svg>
  );
};

const LineMulti = ({ series, w = 800, h = 280, yMax = 100, yLabel = '', xLabels = [] }) => {
  // series: [{name, color, data}]
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {/* y axis grid */}
      {[0, 25, 50, 75, 100].map(g => {
        const y = h - 30 - (g / yMax) * (h - 50);
        return (
          <g key={g}>
            <line x1="32" y1={y} x2={w} y2={y} stroke="var(--rule)" strokeWidth="0.5" />
            <text x="0" y={y + 3} style={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--muted)' }}>{g}</text>
          </g>
        );
      })}
      {/* X labels */}
      {xLabels.map((l, i) => (
        <text key={i} x={32 + (i / (xLabels.length - 1)) * (w - 40)} y={h - 8} textAnchor="middle"
          style={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--muted)' }}>{l}</text>
      ))}
      {series.map(s => {
        const pts = s.data.map((v, i) => `${32 + (i / (s.data.length - 1)) * (w - 40)},${h - 30 - (v / yMax) * (h - 50)}`).join(' ');
        return (
          <g key={s.name}>
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2" />
            {s.data.map((v, i) => i === s.data.length - 1 && (
              <circle key={i} cx={32 + (i / (s.data.length - 1)) * (w - 40)} cy={h - 30 - (v / yMax) * (h - 50)} r="4" fill={s.color} />
            ))}
          </g>
        );
      })}
      {/* end labels */}
      {series.map((s, si) => {
        const lastV = s.data[s.data.length - 1];
        return (
          <text key={s.name} x={w + 6} y={h - 30 - (lastV / yMax) * (h - 50) + 4}
            style={{ fontFamily: 'var(--sans)', fontSize: 11, fill: s.color, fontWeight: 600 }}>
            {s.name} · {lastV.toFixed(1)}
          </text>
        );
      })}
      {yLabel && <text x="-20" y={h / 2} transform={`rotate(-90 0 ${h / 2})`}
        style={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {yLabel}
      </text>}
    </svg>
  );
};

const AreaStream = ({ data, w = 600, h = 200, color = CHART.blue, label = '' }) => {
  const min = 0, max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - (v / max) * (h - 20) - 10]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L ${w} ${h - 10} L 0 ${h - 10} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" />
    </svg>
  );
};

const Bars = ({ data, color = CHART.blue, valueFmt = v => v, horizontal = true }) => {
  const max = Math.max(...data.map(d => d.value));
  if (horizontal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 70px', gap: 12, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)' }}>{d.label}</span>
            <div style={{ height: 18, background: 'var(--chip)', position: 'relative' }}>
              <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: color }} />
              <span style={{ position: 'absolute', right: 8, top: 1, fontSize: 11, color: '#fff', fontFamily: 'var(--mono)', fontWeight: 500 }}>
                {(d.value / max * 100).toFixed(0)}%
              </span>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>{valueFmt(d.value)}</span>
          </div>
        ))}
      </div>
    );
  }
};

// ============== Table ==============
const Tbl = ({ cols, rows, dense, onRow, sticky = true }) => (
  <div style={{ overflow: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--sans)' }}>
      <thead style={sticky ? { position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 1 } : {}}>
        <tr>
          {cols.map((c, i) => (
            <th key={i} style={{
              textAlign: c.align || 'left', padding: dense ? '6px 10px' : '10px 14px',
              borderBottom: '2px solid var(--ink)',
              color: 'var(--ink)', fontWeight: 600, fontSize: 11, fontFamily: 'var(--mono)',
              letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} onClick={() => onRow && onRow(row)}
            style={{ cursor: onRow ? 'pointer' : 'default', borderBottom: '1px solid var(--rule)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {cols.map((c, ci) => (
              <td key={ci} style={{
                padding: dense ? '6px 10px' : '10px 14px', textAlign: c.align || 'left',
                color: c.tone === 'muted' ? 'var(--muted)' : 'var(--ink)',
                whiteSpace: c.wrap ? 'normal' : 'nowrap',
                fontFamily: c.mono ? 'var(--mono)' : 'inherit',
                fontVariantNumeric: c.mono || c.align === 'right' ? 'tabular-nums' : 'normal',
              }}>{c.render ? c.render(row) : row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Input
const Inp = ({ label, value, onChange, type = 'text', placeholder, hint, suffix }) => (
  <label style={{ display: 'block' }}>
    {label && <Eyebrow style={{ marginBottom: 6 }}>{label}</Eyebrow>}
    <div style={{
      display: 'flex', alignItems: 'center',
      borderBottom: '1px solid var(--ink)',
      padding: '6px 0',
    }}>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          flex: 1, border: 'none', background: 'transparent',
          color: 'var(--ink)', fontSize: 14, outline: 'none',
          fontFamily: type === 'number' ? 'var(--mono)' : 'var(--sans)',
        }} />
      {suffix && <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{suffix}</span>}
    </div>
    {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{hint}</div>}
  </label>
);

const Rng = ({ min, max, step, value, onChange, label, hint, format }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
      <Eyebrow>{label}</Eyebrow>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{format ? format(value) : value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(+e.target.value)}
      style={{ width: '100%', accentColor: CHART.blue }} />
    {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{hint}</div>}
  </div>
);

Object.assign(window, {
  CHART, SERIES, Block, Eyebrow, Headline, FigCaption, Divider, Tag, Btn,
  BigNumber, RingGauge, LineMulti, AreaStream, Bars, Tbl, Inp, Rng,
});
