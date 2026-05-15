// Shell: sidebar + topbar + layout — TERMINAL style
const { useState: useS, useEffect: useE } = React;

const NAV = [
  { id: 'overview', label: 'Overview', icon: '◆', section: 1 },
  { id: 'run', label: 'Run Pipeline', icon: '▶', section: 1 },
  { id: 'sources', label: 'Data Sources', icon: '⇣', section: 1 },
  { id: 'business', label: 'Reports · Business', icon: '▤', section: 2, parent: 'reports' },
  { id: 'quality', label: 'Reports · Quality', icon: '▥', section: 2, parent: 'reports' },
  { id: 'rules', label: 'Validation Rules', icon: '⊞', section: 2 },
  { id: 'audit-trades', label: 'Audit · Rejected', icon: '⊟', section: 3, parent: 'audit' },
  { id: 'audit-pipeline', label: 'Audit · Pipeline', icon: '⊟', section: 3, parent: 'audit' },
  { id: 'audit-access', label: 'Audit · Access', icon: '⊟', section: 3, parent: 'audit' },
  { id: 'history', label: 'History', icon: '◷', section: 3 },
  { id: 'settings', label: 'Settings', icon: '⚙', section: 4 },
];

const Topbar = ({ activeRun, setActiveRun, onCmdK, onRun }) => {
  const [open, setOpen] = useS(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', height: 44, borderBottom: '1px solid var(--border)',
      background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, letterSpacing: 1.5,
          color: 'var(--fg)',
        }}>
          <span style={{ color: '#4ade80' }}>▮</span> TRADESYS
          <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>v0.4.2</span>
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 11 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#4ade80',
            boxShadow: '0 0 0 3px rgba(74,222,128,0.15)',
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ color: 'var(--muted)' }}>API</span>
          <span style={{ color: '#4ade80' }}>HEALTHY</span>
          <span style={{ color: 'var(--muted)' }}>· 12ms</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        <button onClick={onCmdK} style={{
          background: 'transparent', border: '1px solid var(--border)', borderRadius: 2,
          padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', cursor: 'pointer',
        }}>
          <span>Search...</span>
          <span style={{ padding: '1px 4px', border: '1px solid var(--border)', borderRadius: 2, fontSize: 9 }}>⌘K</span>
        </button>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpen(!open)} style={{
            background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 2,
            padding: '5px 10px', fontFamily: 'var(--mono)', fontSize: 11,
            color: 'var(--fg)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: 'var(--muted)' }}>RUN</span>
            <span>{fmt.short(activeRun.run_id, 18)}</span>
            <span style={{ color: '#4ade80' }}>{activeRun.quality_score}</span>
            <span style={{ color: 'var(--muted)' }}>▾</span>
          </button>
          {open && (
            <div style={{
              position: 'absolute', right: 0, top: '110%',
              background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 2,
              minWidth: 360, maxHeight: 400, overflow: 'auto', zIndex: 60,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {MOCK.runs.slice(0, 12).map(r => (
                <div key={r.run_id} onClick={() => { setActiveRun(r); setOpen(false); }}
                  style={{
                    padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 100px 50px',
                    gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border-soft)',
                    cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-strong)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span>{fmt.short(r.run_id, 22)}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 10 }}>{fmt.dt(r.started_at).slice(11, 19)}</span>
                  <span style={{ color: r.quality_score >= 80 ? '#4ade80' : '#fbbf24', textAlign: 'right' }}>
                    {r.quality_score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Btn kind="primary" onClick={onRun}>▶ RUN PIPELINE</Btn>
        <div style={{ width: 1, height: 20, background: 'var(--border)', marginLeft: 4 }} />
        <div style={{
          width: 28, height: 28, borderRadius: 2, background: 'var(--panel-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 11, color: '#a78bfa', border: '1px solid var(--border)',
        }}>AM</div>
      </div>
    </div>
  );
};

const Sidebar = ({ active, setActive }) => {
  const sections = {
    1: 'MAIN',
    2: 'ANALYSIS',
    3: 'AUDIT',
    4: 'SYSTEM',
  };
  const grouped = {};
  NAV.forEach(n => { (grouped[n.section] = grouped[n.section] || []).push(n); });

  return (
    <aside style={{
      width: 220, borderRight: '1px solid var(--border)',
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      flexShrink: 0, padding: '12px 0',
    }}>
      {Object.entries(grouped).map(([sec, items]) => (
        <div key={sec} style={{ marginBottom: 16 }}>
          <div style={{
            padding: '4px 16px', fontFamily: 'var(--mono)', fontSize: 9,
            color: 'var(--muted)', letterSpacing: 1, marginBottom: 4,
          }}>{sections[sec]}</div>
          {items.map(n => {
            const isActive = n.id === active;
            return (
              <div key={n.id} onClick={() => setActive(n.id)} style={{
                padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 10,
                fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
                background: isActive ? 'rgba(74,222,128,0.06)' : 'transparent',
                color: isActive ? '#4ade80' : 'var(--fg)',
                borderLeft: isActive ? '2px solid #4ade80' : '2px solid transparent',
                position: 'relative',
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--row-hover)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ color: isActive ? '#4ade80' : 'var(--muted)', width: 10 }}>{n.icon}</span>
                <span>{n.label}</span>
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 0.6 }}>
          BUILD <span style={{ color: 'var(--fg)' }}>a3f8c19</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
          <span style={{ color: '#4ade80' }}>●</span> main · 9h ago
        </div>
      </div>
    </aside>
  );
};

const Breadcrumbs = ({ active, activeRun }) => {
  const item = NAV.find(n => n.id === active);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 16px', borderBottom: '1px solid var(--border)',
      fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)',
      background: 'var(--bg)',
    }}>
      <span>HOME</span>
      <span>/</span>
      {item?.parent && (<><span>{item.parent.toUpperCase()}</span><span>/</span></>)}
      <span style={{ color: 'var(--fg)' }}>{item?.label.toUpperCase()}</span>
      <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
        RUN <span style={{ color: 'var(--fg)' }}>{fmt.short(activeRun.run_id, 22)}</span> · {fmt.dt(activeRun.started_at)}
      </span>
    </div>
  );
};

const CmdK = ({ open, onClose, setActive }) => {
  const [q, setQ] = useS('');
  if (!open) return null;
  const filtered = NAV.filter(n => n.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 2, boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
      }}>
        <input autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="Type a command or search…"
          style={{
            width: '100%', padding: '14px 16px', background: 'transparent',
            border: 'none', borderBottom: '1px solid var(--border)',
            fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--fg)', outline: 'none',
            boxSizing: 'border-box',
          }} />
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {filtered.map(n => (
            <div key={n.id} onClick={() => { setActive(n.id); onClose(); }}
              style={{
                padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12,
                fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-strong)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ color: 'var(--muted)' }}>{n.icon}</span>
              <span style={{ color: 'var(--fg)' }}>{n.label}</span>
              <span style={{ color: 'var(--muted)', marginLeft: 'auto', fontSize: 10 }}>GO</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Toast = ({ msg, tone = 'ok', onClose }) => {
  useE(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, []);
  const color = { ok: '#4ade80', warn: '#fbbf24', crit: '#f87171' }[tone];
  return (
    <div style={{
      position: 'fixed', right: 16, top: 60, zIndex: 300,
      background: 'var(--panel)', border: `1px solid ${color}`, borderLeft: `3px solid ${color}`,
      borderRadius: 2, padding: '10px 14px', minWidth: 280,
      fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ color }}>{tone === 'ok' ? '✓' : tone === 'warn' ? '⚠' : '✕'}</span>
      <span>{msg}</span>
      <span onClick={onClose} style={{ marginLeft: 'auto', cursor: 'pointer', color: 'var(--muted)' }}>✕</span>
    </div>
  );
};

Object.assign(window, { NAV, Topbar, Sidebar, Breadcrumbs, CmdK, Toast });
