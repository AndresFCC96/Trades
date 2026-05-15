// Shell — MODERN (Pipely): collapsible sidebar, topbar, breadcrumbs
const { useState: usS, useEffect: useS_e } = React;

const NAV_B = [
  { id: 'overview', label: 'Overview', icon: '◇', section: 'main' },
  { id: 'run', label: 'Run Pipeline', icon: '▷', section: 'main' },
  { id: 'sources', label: 'Data Sources', icon: '☁', section: 'main' },
  { id: 'business', label: 'Business Report', icon: '◧', section: 'reports', parent: 'reports' },
  { id: 'quality', label: 'Quality Report', icon: '◨', section: 'reports', parent: 'reports' },
  { id: 'rules', label: 'Validation Rules', icon: '⌗', section: 'reports' },
  { id: 'audit-trades', label: 'Rejected Trades', icon: '⌫', section: 'audit', parent: 'audit' },
  { id: 'audit-pipeline', label: 'Pipeline Runs', icon: '⌥', section: 'audit', parent: 'audit' },
  { id: 'audit-access', label: 'API Access', icon: '⌘', section: 'audit', parent: 'audit' },
  { id: 'history', label: 'History', icon: '◴', section: 'audit' },
  { id: 'settings', label: 'Settings', icon: '⚙', section: 'system' },
];

const SidebarM = ({ active, setActive, collapsed, setCollapsed, theme, setTheme }) => {
  const sections = { main: 'MAIN', reports: 'ANALYSIS', audit: 'AUDIT', system: 'SYSTEM' };
  const grouped = {};
  NAV_B.forEach(n => { (grouped[n.section] = grouped[n.section] || []).push(n); });

  return (
    <aside style={{
      width: collapsed ? 64 : 232,
      transition: 'width 0.18s',
      background: 'var(--bg-soft)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Brand */}
      <div style={{
        padding: collapsed ? '16px 12px' : '16px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--border-soft)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
          boxShadow: '0 2px 8px rgba(124,92,255,0.3)',
        }}>P</div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', letterSpacing: -0.3 }}>Pipely</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>v0.4.2</div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, overflow: 'auto', padding: '12px 8px' }}>
        {Object.entries(grouped).map(([sec, items]) => (
          <div key={sec} style={{ marginBottom: 14 }}>
            {!collapsed && (
              <div style={{ padding: '6px 10px', fontSize: 10, color: 'var(--muted)', letterSpacing: 0.6, fontWeight: 600 }}>
                {sections[sec]}
              </div>
            )}
            {items.map(n => {
              const isActive = n.id === active;
              return (
                <div key={n.id} onClick={() => setActive(n.id)} title={collapsed ? n.label : ''}
                  style={{
                    padding: collapsed ? '8px 12px' : '7px 10px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: 13, cursor: 'pointer', borderRadius: 6,
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--fg)',
                    fontWeight: isActive ? 600 : 500,
                    marginBottom: 2,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--chip)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ color: isActive ? 'var(--accent)' : 'var(--muted)', width: 16, textAlign: 'center', fontSize: 14 }}>{n.icon}</span>
                  {!collapsed && <span>{n.label}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: 10, borderTop: '1px solid var(--border-soft)', display: 'flex', gap: 6, justifyContent: collapsed ? 'center' : 'space-between', alignItems: 'center' }}>
        <button onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar"
          style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: 6, borderRadius: 6 }}>
          {collapsed ? '›' : '‹'}
        </button>
        {!collapsed && (
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{theme === 'light' ? '☼' : '☾'}</span><span style={{ fontSize: 12 }}>{theme === 'light' ? 'Light' : 'Dark'}</span>
          </button>
        )}
      </div>
    </aside>
  );
};

const TopbarM = ({ activeRun, setActiveRun, onCmdK, onRun, theme, setTheme }) => {
  const [open, setOpen] = usS(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: 56, borderBottom: '1px solid var(--border)',
      background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Pill tone="ok" dot>API healthy · 12ms</Pill>
        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Workspace</span>
        <span style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>trades-prod</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        <button onClick={onCmdK} style={{
          background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 30,
          fontSize: 12, color: 'var(--muted)', cursor: 'pointer', minWidth: 220,
        }}>
          <span>Search runs, rules, audits…</span>
          <span style={{ padding: '1px 6px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 10, fontFamily: 'var(--mono)', background: 'var(--surface)' }}>⌘K</span>
        </button>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpen(!open)} style={{
            background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: 'var(--fg)', cursor: 'pointer',
          }}>
            <span style={{ color: 'var(--muted)' }}>Run:</span>
            <span style={{ fontFamily: 'var(--mono)' }}>{fmt.short(activeRun.run_id, 16)}</span>
            <Pill tone={activeRun.quality_score >= 80 ? 'ok' : 'warn'}>{activeRun.quality_score}</Pill>
            <span style={{ color: 'var(--muted)' }}>▾</span>
          </button>
          {open && (
            <div style={{
              position: 'absolute', right: 0, top: '110%', marginTop: 4,
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
              minWidth: 400, maxHeight: 420, overflow: 'auto', zIndex: 60,
              boxShadow: 'var(--shadow-lg)', padding: 6,
            }}>
              {MOCK.runs.slice(0, 12).map(r => (
                <div key={r.run_id} onClick={() => { setActiveRun(r); setOpen(false); }}
                  style={{
                    padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                    display: 'grid', gridTemplateColumns: '1fr 80px 50px', gap: 8, alignItems: 'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg)' }}>{fmt.short(r.run_id, 24)}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fmt.dt(r.started_at)}</div>
                  </div>
                  <Pill tone={r.mode === 'kafka' ? 'accent' : 'neutral'} style={{ justifySelf: 'start' }}>{r.mode}</Pill>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: r.quality_score >= 80 ? 'var(--ok)' : 'var(--warn)', textAlign: 'right', fontWeight: 600 }}>
                    {r.quality_score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button kind="primary" onClick={onRun}>
          <span>▷</span>
          <span>Run pipeline</span>
        </Button>
        <div style={{ width: 1, height: 22, background: 'var(--border)' }} />
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 600,
        }}>AM</div>
      </div>
    </div>
  );
};

const BreadcrumbsM = ({ active, activeRun }) => {
  const item = NAV_B.find(n => n.id === active);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 28px 0', gap: 8,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
          <span>Workspace</span><span>›</span>
          {item?.parent && (<><span style={{ textTransform: 'capitalize' }}>{item.parent}</span><span>›</span></>)}
          <span style={{ color: 'var(--fg)' }}>{item?.label}</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--fg)', letterSpacing: -0.6 }}>
          {item?.label}
        </h1>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
        <div>Active run · <span style={{ color: 'var(--fg)', fontFamily: 'var(--mono)' }}>{fmt.short(activeRun.run_id, 22)}</span></div>
        <div style={{ marginTop: 2 }}>{fmt.dt(activeRun.started_at)}</div>
      </div>
    </div>
  );
};

const CmdKM = ({ open, onClose, setActive }) => {
  const [q, setQ] = usS('');
  if (!open) return null;
  const filtered = NAV_B.filter(n => n.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,15,25,0.4)', zIndex: 200,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh',
      backdropFilter: 'blur(8px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 580, background: 'var(--surface)', borderRadius: 14,
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
      }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-soft)' }}>
          <span style={{ color: 'var(--muted)', fontSize: 16 }}>⌕</span>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search or jump to…"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: 'var(--fg)', fontFamily: 'inherit' }} />
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>ESC</span>
        </div>
        <div style={{ maxHeight: 360, overflow: 'auto', padding: 8 }}>
          {filtered.map(n => (
            <div key={n.id} onClick={() => { setActive(n.id); onClose(); }}
              style={{
                padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 13, cursor: 'pointer', borderRadius: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ color: 'var(--muted)', width: 16 }}>{n.icon}</span>
              <span style={{ color: 'var(--fg)' }}>{n.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>Go →</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ToastM = ({ msg, tone = 'ok', onClose }) => {
  useS_e(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, []);
  const color = { ok: 'var(--ok)', warn: 'var(--warn)', crit: 'var(--crit)' }[tone];
  return (
    <div style={{
      position: 'fixed', right: 20, top: 80, zIndex: 300,
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '12px 14px', minWidth: 280, boxShadow: 'var(--shadow-lg)',
      fontSize: 13, color: 'var(--fg)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%', background: `${color}20`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 12,
      }}>{tone === 'ok' ? '✓' : tone === 'warn' ? '!' : '✕'}</span>
      <span style={{ flex: 1 }}>{msg}</span>
      <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</span>
    </div>
  );
};

Object.assign(window, { NAV_B, SidebarM, TopbarM, BreadcrumbsM, CmdKM, ToastM });
