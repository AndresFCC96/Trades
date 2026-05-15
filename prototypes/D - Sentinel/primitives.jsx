// Primitives — SENTINEL (compliance / traditional banking)
const { useState, useEffect, useRef, useMemo, Fragment } = React;

const NAVY = '#0a2540';
const NAVY_2 = '#1c4377';
const GOLD = '#b08533';
const GOLD_2 = '#d4a93f';
const FOREST = '#15803d';
const AMBER = '#b45309';
const BRICK = '#991b1b';

// ============== Layout primitives ==============
const Card = ({ title, subtitle, eyebrow, right, children, style, headerAccent }) => (
  <section style={{
    background: 'var(--surface)', border: '1px solid var(--border)',
    boxShadow: '1px 1px 0 var(--border)',
    ...style,
  }}>
    {(title || eyebrow) && (
      <header style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: headerAccent ? NAVY : 'var(--surface-2)',
        color: headerAccent ? '#fff' : 'var(--ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          {eyebrow && <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1,
            color: headerAccent ? GOLD_2 : 'var(--muted)', textTransform: 'uppercase',
          }}>{eyebrow}</div>}
          {title && <div style={{
            fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: 'inherit', marginTop: eyebrow ? 2 : 0,
          }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {right}
      </header>
    )}
    <div>{children}</div>
  </section>
);

const Pad = ({ children, style }) => <div style={{ padding: 16, ...style }}>{children}</div>;

const Stamp = ({ children, color, style }) => {
  color = color || 'var(--ink)';
  return (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 8px', border: `1px solid ${color}`, color,
    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
    letterSpacing: 0.6, textTransform: 'uppercase', background: 'var(--surface)',
    ...style,
  }}>{children}</span>
);};

const Btn = ({ kind = 'ghost', size = 'md', children, onClick, style, disabled }) => {
  const base = {
    padding: size === 'lg' ? '10px 18px' : size === 'sm' ? '4px 10px' : '7px 14px',
    fontSize: size === 'lg' ? 14 : size === 'sm' ? 12 : 13,
    fontFamily: 'var(--sans)', fontWeight: 500,
    border: '1px solid', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'all 0.1s',
  };
  const kinds = {
    ghost: { background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--border-strong)' },
    solid: { background: NAVY, color: '#fff', borderColor: NAVY },
    primary: { background: GOLD, color: '#fff', borderColor: GOLD_2 },
    danger: { background: 'var(--surface)', color: BRICK, borderColor: BRICK },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
};

const Field = ({ label, hint, value, onChange, type = 'text', placeholder, suffix, required, mono }) => (
  <label style={{ display: 'block' }}>
    {label && (
      <div style={{ fontSize: 11, color: 'var(--ink)', marginBottom: 4, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', fontFamily: 'var(--sans)' }}>
        {label} {required && <span style={{ color: BRICK }}>*</span>}
      </div>
    )}
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'var(--surface)', border: '1px solid var(--border-strong)',
      padding: '0 10px', height: 30,
    }}>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          flex: 1, padding: '6px 0', border: 'none', background: 'transparent',
          color: 'var(--ink)', fontSize: 13, outline: 'none',
          fontFamily: mono || type === 'number' || type === 'password' ? 'var(--mono)' : 'var(--sans)',
        }} />
      {suffix && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{suffix}</span>}
    </div>
    {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>{hint}</div>}
  </label>
);

const Slider = ({ min, max, step, value, onChange, label, hint, format, required }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>
        {label} {required && <span style={{ color: BRICK }}>*</span>}
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{format ? format(value) : value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(+e.target.value)}
      style={{ width: '100%', accentColor: 'var(--ink)' }} />
    {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>{hint}</div>}
  </div>
);

// ============== KPI ==============
const Kpi = ({ label, value, sub, color, right }) => { color = color || 'var(--ink)'; return (
  <div style={{
    background: 'var(--surface)', border: '1px solid var(--border-strong)',
    padding: '14px 16px', position: 'relative',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{label}</div>
      {right}
    </div>
    <div style={{
      fontFamily: 'var(--serif)', fontSize: 32, color, fontWeight: 600,
      lineHeight: 1.1, marginTop: 8, letterSpacing: '-0.02em',
      fontVariantNumeric: 'tabular-nums',
    }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
  </div>
); };

// ============== Charts ==============
const Gauge = ({ value, size = 140, label }) => {
  const tone = value >= 80 ? FOREST : value >= 60 ? AMBER : BRICK;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r + 4} fill="none" stroke="var(--border-strong)" strokeWidth="1" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="8"
        strokeDasharray={`${dash} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: 'var(--serif)', fontSize: size * 0.24, fontWeight: 600, fill: tone }}>
        {value.toFixed(1)}
      </text>
      {label && <text x={size / 2} y={size * 0.78} textAnchor="middle"
        style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </text>}
    </svg>
  );
};

const Spark = ({ data, w = 100, h = 26, color = NAVY }) => {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

const AreaChart = ({ data, w = 600, h = 200, color = NAVY, yMax = 100 }) => {
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - (v / yMax) * (h - 30) - 18]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L ${w} ${h - 18} L 0 ${h - 18} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {[0, 25, 50, 75, 100].map(g => {
        const y = h - 18 - (g / yMax) * (h - 30);
        return (
          <g key={g}>
            <line x1="0" y1={y} x2={w} y2={y} stroke="var(--border)" strokeWidth="0.5" />
            <text x="2" y={y - 2} style={{ fontFamily: 'var(--mono)', fontSize: 8, fill: 'var(--muted)' }}>{g}</text>
          </g>
        );
      })}
      <path d={area} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
};

const Bars = ({ data, color = NAVY, valueFmt = v => v }) => {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 60px', gap: 10, alignItems: 'center', fontSize: 12 }}>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{d.label}</span>
          <div style={{ height: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', position: 'relative' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: color }} />
          </div>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', textAlign: 'right' }}>{valueFmt(d.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ============== Table ==============
const Tbl = ({ cols, rows, onRow, sticky = true, bordered = true }) => (
  <div style={{ overflow: 'auto' }}>
    <table style={{
      width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--sans)',
    }}>
      <thead style={sticky ? { position: 'sticky', top: 0, background: NAVY, zIndex: 1 } : { background: NAVY }}>
        <tr>
          {cols.map((c, i) => (
            <th key={i} style={{
              textAlign: c.align || 'left', padding: '8px 12px',
              color: '#fff', fontWeight: 600, fontSize: 11, fontFamily: 'var(--sans)',
              letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap',
              borderRight: bordered && i < cols.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
            }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} onClick={() => onRow && onRow(row)}
            style={{
              cursor: onRow ? 'pointer' : 'default',
              borderBottom: '1px solid var(--border)',
              background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)'}>
            {cols.map((c, ci) => (
              <td key={ci} style={{
                padding: '8px 12px', textAlign: c.align || 'left',
                color: c.tone === 'muted' ? 'var(--muted)' : NAVY,
                whiteSpace: c.wrap ? 'normal' : 'nowrap',
                fontFamily: c.mono ? 'var(--mono)' : 'inherit',
                fontVariantNumeric: c.mono || c.align === 'right' ? 'tabular-nums' : 'normal',
                borderRight: bordered && ci < cols.length - 1 ? '1px solid var(--border)' : 'none',
              }}>{c.render ? c.render(row) : row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

Object.assign(window, {
  NAVY, NAVY_2, GOLD, GOLD_2, FOREST, AMBER, BRICK,
  Card, Pad, Stamp, Btn, Field, Slider, Kpi, Gauge, Spark, AreaChart, Bars, Tbl,
});
