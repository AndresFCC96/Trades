// Primitives shared across screens — TERMINAL style
const { useState, useEffect, useRef, useMemo, Fragment } = React;

// ============== Layout primitives ==============
const Panel = ({ title, right, children, style, dense, scrollable }) => (
  <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 2, ...style }}>
    {title && (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid var(--border)',
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 0.6,
        color: 'var(--muted)', textTransform: 'uppercase',
      }}>
        <span>{title}</span>
        {right}
      </div>
    )}
    <div style={{ padding: dense ? 8 : 12, overflow: scrollable ? 'auto' : 'visible' }}>
      {children}
    </div>
  </div>
);

const Badge = ({ tone = 'neutral', children, mono = true, style }) => {
  const tones = {
    neutral: { bg: '#1a1f2a', fg: '#9aa4b2', border: '#252b38' },
    ok: { bg: 'rgba(74,222,128,0.08)', fg: '#4ade80', border: 'rgba(74,222,128,0.3)' },
    warn: { bg: 'rgba(251,191,36,0.08)', fg: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
    crit: { bg: 'rgba(248,113,113,0.08)', fg: '#f87171', border: 'rgba(248,113,113,0.3)' },
    info: { bg: 'rgba(96,165,250,0.08)', fg: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
    accent: { bg: 'rgba(167,139,250,0.08)', fg: '#a78bfa', border: 'rgba(167,139,250,0.3)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 6px', borderRadius: 2,
      fontFamily: mono ? 'var(--mono)' : 'var(--sans)',
      fontSize: 10, fontWeight: 500, letterSpacing: 0.4,
      background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
      ...style,
    }}>{children}</span>
  );
};

const Btn = ({ kind = 'ghost', size = 'sm', children, onClick, style, disabled }) => {
  const base = {
    padding: size === 'lg' ? '10px 16px' : size === 'md' ? '7px 12px' : '4px 10px',
    fontSize: size === 'lg' ? 13 : 11,
    fontFamily: 'var(--mono)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    border: '1px solid var(--border)',
    borderRadius: 2,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.1s',
  };
  const kinds = {
    ghost: { background: 'transparent', color: 'var(--fg)' },
    solid: { background: 'var(--panel-2)', color: 'var(--fg)', borderColor: 'var(--border)' },
    primary: { background: '#4ade80', color: '#0a0c10', borderColor: '#4ade80', fontWeight: 600 },
    danger: { background: 'rgba(248,113,113,0.08)', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
};

const KPI = ({ label, value, sub, tone = 'neutral', children, right }) => {
  const toneColor = { ok: '#4ade80', warn: '#fbbf24', crit: '#f87171', info: '#60a5fa', neutral: 'var(--fg)' }[tone];
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 2,
      padding: '12px 14px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
        background: toneColor,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)',
          letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6,
        }}>{label}</div>
        {right}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 500, color: toneColor, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
      {children && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  );
};

// ============== Charts ==============
const Sparkline = ({ data, w = 80, h = 22, color = '#4ade80' }) => {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" />
    </svg>
  );
};

const Gauge = ({ value, size = 140, label = 'SCORE' }) => {
  const tone = value >= 80 ? '#4ade80' : value >= 60 ? '#fbbf24' : '#f87171';
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c * 0.75;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="6"
        strokeDasharray={`${c * 0.75} ${c}`} transform={`rotate(135 ${size / 2} ${size / 2})`} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="6"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="square" transform={`rotate(135 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle"
        style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 600, fill: tone }}>
        {value.toFixed(1)}
      </text>
      <text x={size / 2} y={size / 2 + 22} textAnchor="middle"
        style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: 'var(--muted)', letterSpacing: 0.8 }}>
        {label}
      </text>
    </svg>
  );
};

const AreaChart = ({ data, w = 600, h = 180, color = '#4ade80' }) => {
  const min = 0, max = 100;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / (max - min)) * (h - 20) - 10]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const grid = [0, 25, 50, 75, 100];
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {grid.map(g => {
        const y = h - (g / 100) * (h - 20) - 10;
        return (
          <g key={g}>
            <line x1="0" y1={y} x2={w} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2,3" />
            <text x="4" y={y - 2} style={{ fontFamily: 'var(--mono)', fontSize: 8, fill: 'var(--muted)' }}>{g}</text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" />
      {pts.map((p, i) => i % 3 === 0 && <circle key={i} cx={p[0]} cy={p[1]} r="1.5" fill={color} />)}
    </svg>
  );
};

const HBars = ({ data, max, color = '#fbbf24', valueFmt = (v) => v, w = 320 }) => {
  const m = max || Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 60px', gap: 8, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 11 }}>
          <span style={{ color: 'var(--fg)' }}>{d.label}</span>
          <div style={{ background: 'var(--border)', height: 10, borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ width: `${(d.value / m) * 100}%`, height: '100%', background: color }} />
          </div>
          <span style={{ color: 'var(--muted)', textAlign: 'right' }}>{valueFmt(d.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ============== Tables ==============
const Table = ({ cols, rows, dense, onRow, sticky = true }) => (
  <div style={{ overflow: 'auto', maxHeight: '100%' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: 11 }}>
      <thead style={sticky ? { position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 1 } : {}}>
        <tr>
          {cols.map((c, i) => (
            <th key={i} style={{
              textAlign: c.align || 'left', padding: dense ? '4px 8px' : '6px 10px',
              borderBottom: '1px solid var(--border)',
              color: 'var(--muted)', fontWeight: 500, fontSize: 10,
              letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap',
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
                padding: dense ? '4px 8px' : '6px 10px', textAlign: c.align || 'left',
                color: c.tone === 'muted' ? 'var(--muted)' : 'var(--fg)',
                whiteSpace: c.wrap ? 'normal' : 'nowrap',
              }}>{c.render ? c.render(row) : row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Expose
Object.assign(window, { Panel, Badge, Btn, KPI, Sparkline, Gauge, AreaChart, HBars, Table });
