// Primitives — MODERN style (Pipely)
const { useState, useEffect, useRef, useMemo, Fragment } = React;

// ============== Layout primitives ==============
const Card = ({ title, subtitle, right, children, style, padded = true, hoverable }) => (
  <div style={{
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-sm)',
    transition: hoverable ? 'box-shadow 0.15s, transform 0.15s' : 'none',
    ...style,
  }}
    onMouseEnter={hoverable ? (e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } : null}
    onMouseLeave={hoverable ? (e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } : null}>
    {(title || right) && (
      <div style={{
        padding: '14px 18px 12px', borderBottom: '1px solid var(--border-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div>
          {title && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', letterSpacing: -0.2 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
    )}
    {children && (
      <div style={{ padding: padded ? 18 : 0 }}>{children}</div>
    )}
  </div>
);

const Pill = ({ tone = 'neutral', children, style, dot }) => {
  const tones = {
    neutral: { bg: 'var(--chip)', fg: 'var(--fg-2)', dot: 'var(--muted)' },
    ok: { bg: 'rgba(34,197,94,0.10)', fg: 'var(--ok)', dot: 'var(--ok)' },
    warn: { bg: 'rgba(245,158,11,0.10)', fg: 'var(--warn)', dot: 'var(--warn)' },
    crit: { bg: 'rgba(239,68,68,0.10)', fg: 'var(--crit)', dot: 'var(--crit)' },
    info: { bg: 'rgba(59,130,246,0.10)', fg: 'var(--info)', dot: 'var(--info)' },
    accent: { bg: 'rgba(124,92,255,0.10)', fg: 'var(--accent)', dot: 'var(--accent)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 500,
      background: t.bg, color: t.fg, ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dot }} />}
      {children}
    </span>
  );
};

const Button = ({ kind = 'ghost', size = 'md', children, onClick, style, disabled, icon }) => {
  const base = {
    padding: size === 'lg' ? '10px 18px' : size === 'sm' ? '5px 11px' : '7px 14px',
    fontSize: size === 'lg' ? 14 : size === 'sm' ? 12 : 13,
    fontWeight: 500,
    border: '1px solid transparent',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.12s',
    fontFamily: 'inherit',
    letterSpacing: -0.1,
  };
  const kinds = {
    ghost: { background: 'transparent', color: 'var(--fg)', borderColor: 'var(--border)' },
    soft: { background: 'var(--chip)', color: 'var(--fg)' },
    primary: { background: 'var(--accent)', color: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.15)' },
    dark: { background: 'var(--fg)', color: 'var(--surface)' },
    danger: { background: 'rgba(239,68,68,0.10)', color: 'var(--crit)' },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
};

const KpiCard = ({ label, value, sub, delta, tone = 'neutral', children, right, accent }) => (
  <div style={{
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 18, boxShadow: 'var(--shadow-sm)',
    position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{label}</div>
      {right}
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--fg)', letterSpacing: -0.6, lineHeight: 1.1 }}>{value}</div>
      {delta && (
        <span style={{ fontSize: 12, fontWeight: 500, color: delta.startsWith('+') ? 'var(--ok)' : delta.startsWith('-') ? 'var(--crit)' : 'var(--muted)' }}>
          {delta}
        </span>
      )}
    </div>
    {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
    {children && <div style={{ marginTop: 10 }}>{children}</div>}
  </div>
);

// ============== Charts ==============
const Spark = ({ data, w = 90, h = 28, color = 'var(--accent)', fill = true }) => {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / range) * (h - 4) - 2]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {fill && <path d={`${line} L ${w} ${h} L 0 ${h} Z`} fill={color} opacity="0.10" />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const RadialGauge = ({ value, size = 140, label = 'Score', sublabel }) => {
  const tone = value >= 80 ? 'var(--ok)' : value >= 60 ? 'var(--warn)' : 'var(--crit)';
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: size * 0.22, fontWeight: 600, fill: 'var(--fg)' }}>
        {value.toFixed(1)}
      </text>
      <text x={size / 2} y={size / 2 + size * 0.18} textAnchor="middle"
        style={{ fontSize: 10, fontWeight: 500, fill: 'var(--muted)', letterSpacing: 0.4 }}>
        {label}
      </text>
    </svg>
  );
};

const AreaChartM = ({ data, w = 600, h = 200, color = 'var(--accent)', yMax = 100 }) => {
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - (v / yMax) * (h - 20) - 10]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L ${w} ${h - 10} L 0 ${h - 10} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="modGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map(g => {
        const y = h - (g / yMax) * (h - 20) - 10;
        return <line key={g} x1="0" y1={y} x2={w} y2={y} stroke="var(--border-soft)" strokeWidth="1" />;
      })}
      <path d={area} fill="url(#modGrad)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {pts.map((p, i) => i % 5 === 0 && <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--surface)" stroke={color} strokeWidth="1.5" />)}
    </svg>
  );
};

const HBarsM = ({ data, max, color = 'var(--accent)', valueFmt = (v) => v }) => {
  const m = max || Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 500 }}>{d.label}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{valueFmt(d.value)}</span>
          </div>
          <div style={{ background: 'var(--chip)', height: 8, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${(d.value / m) * 100}%`, height: '100%', background: color, borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ============== Table ==============
const TableM = ({ cols, rows, onRow, sticky = true }) => (
  <div style={{ overflow: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead style={sticky ? { position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 } : {}}>
        <tr>
          {cols.map((c, i) => (
            <th key={i} style={{
              textAlign: c.align || 'left', padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              color: 'var(--muted)', fontWeight: 500, fontSize: 11,
              letterSpacing: 0.3, textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} onClick={() => onRow && onRow(row)}
            style={{ cursor: onRow ? 'pointer' : 'default', borderBottom: '1px solid var(--border-soft)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {cols.map((c, ci) => (
              <td key={ci} style={{
                padding: '10px 14px', textAlign: c.align || 'left',
                color: c.tone === 'muted' ? 'var(--muted)' : 'var(--fg)',
                whiteSpace: c.wrap ? 'normal' : 'nowrap',
                fontFamily: c.mono ? 'var(--mono)' : 'inherit',
                fontSize: c.mono ? 12 : 13,
              }}>{c.render ? c.render(row) : row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Field / input
const Input = ({ label, hint, value, onChange, type = 'text', placeholder, suffix, style }) => (
  <label style={{ display: 'block', ...style }}>
    {label && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>{label}</div>}
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '0 12px',
      transition: 'border 0.12s, box-shadow 0.12s',
    }}>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          flex: 1, padding: '8px 0', border: 'none', background: 'transparent',
          color: 'var(--fg)', fontSize: 13, outline: 'none',
          fontFamily: type === 'number' ? 'var(--mono)' : 'inherit',
        }} />
      {suffix && <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{suffix}</span>}
    </div>
    {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{hint}</div>}
  </label>
);

const Slider = ({ min, max, step, value, onChange, label, hint, format }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--fg)', fontFamily: 'var(--mono)', fontWeight: 500 }}>{format ? format(value) : value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(+e.target.value)}
      style={{ width: '100%', accentColor: 'var(--accent)' }} />
    {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{hint}</div>}
  </div>
);

const Toggle = ({ checked, onChange, label, sub }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
    <span onClick={(e) => { e.preventDefault(); onChange(!checked); }} style={{
      width: 36, height: 20, borderRadius: 999,
      background: checked ? 'var(--accent)' : 'var(--chip-strong)',
      position: 'relative', transition: 'background 0.15s',
      flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.15s',
      }} />
    </span>
    {label && (
      <div>
        <div style={{ fontSize: 13, color: 'var(--fg)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>}
      </div>
    )}
  </label>
);

Object.assign(window, { Card, Pill, Button, KpiCard, Spark, RadialGauge, AreaChartM, HBarsM, TableM, Input, Slider, Toggle });
