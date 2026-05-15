// Shell — SENTINEL (compliance / banking)
const { useState: uSn, useEffect: uSnE } = React;

const NAV_D = [
  { id: 'overview', label: 'Overview', section: 'analysis', icon: '◧' },
  { id: 'run', label: 'Run Pipeline', section: 'analysis', icon: '▶' },
  { id: 'sources', label: 'Data Sources', section: 'analysis', icon: '◰' },
  { id: 'business', label: 'Business Report', section: 'reports', icon: '◳' },
  { id: 'quality', label: 'Quality Report', section: 'reports', icon: '◴' },
  { id: 'rules', label: 'Validation Rules', section: 'reports', icon: '◫' },
  { id: 'audit-trades', label: 'Rejected Trades', section: 'compliance', icon: '⊟' },
  { id: 'audit-pipeline', label: 'Pipeline Audit', section: 'compliance', icon: '⊟' },
  { id: 'audit-access', label: 'Access Log', section: 'compliance', icon: '⊟' },
  { id: 'history', label: 'Run History', section: 'compliance', icon: '◷' },
  { id: 'settings', label: 'Settings', section: 'system', icon: '⚙' },
];

const SECTIONS = {
  analysis: 'Operations',
  reports: 'Analysis & Reports',
  compliance: 'Audit & Compliance',
  system: 'System',
};

const TopbarD = ({ activeRun, setActiveRun, onCmdK, onRun }) => {
  const [open, setOpen] = uSn(false);
  return (
    <div style={{ background: NAVY, color: '#fff', position: 'sticky', top: 0, zIndex: 50 }}>
      {/* Top bar with logo + meta */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 56, borderBottom: `1px solid ${NAVY_2}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, border: `2px solid ${GOLD}`, background: NAVY,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600, color: GOLD,
            }}>S</div>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 600, color: '#fff', letterSpacing: -0.2, lineHeight: 1.1 }}>
                Sentinel
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: GOLD_2, letterSpacing: 0.8, marginTop: 2 }}>
                TRADE OPERATIONS & COMPLIANCE
              </div>
            </div>
          </div>
          <div style={{ width: 1, height: 24, background: NAVY_2 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.2)' }} />
            <span style={{ fontFamily: 'var(--sans)', fontSize: 12 }}>
              <span style={{ color: '#a4b8d0' }}>API Status:</span> <span style={{ color: '#fff', fontWeight: 600 }}>Operational</span> · 12ms
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onCmdK} style={{
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${NAVY_2}`,
            padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 16,
            fontFamily: 'var(--sans)', fontSize: 12, color: '#a4b8d0', cursor: 'pointer',
            minWidth: 220,
          }}>
            <span>Search…</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '1px 5px', border: '1px solid ' + NAVY_2, color: '#fff' }}>⌘K</span>
          </button>

          <div style={{ position: 'relative' }}>
            <button onClick={() => setOpen(!open)} style={{
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${NAVY_2}`,
              padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: 'var(--mono)', fontSize: 12, color: '#fff', cursor: 'pointer',
            }}>
              <span style={{ color: '#a4b8d0', fontFamily: 'var(--sans)' }}>Active run:</span>
              <span>{fmt.short(activeRun.run_id, 16)}</span>
              <span style={{ color: activeRun.quality_score >= 80 ? '#4ade80' : GOLD_2, fontWeight: 600 }}>{activeRun.quality_score}</span>
              <span>▾</span>
            </button>
            {open && (
              <div style={{
                position: 'absolute', right: 0, top: '110%',
                background: 'var(--surface)', border: `1px solid var(--border-strong)`, color: 'var(--ink)',
                minWidth: 400, maxHeight: 420, overflow: 'auto', zIndex: 60,
                boxShadow: '0 8px 24px rgba(10,37,64,0.2)',
              }}>
                <div style={{ padding: '8px 12px', background: NAVY, color: '#fff', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Last 12 runs
                </div>
                {MOCK.runs.slice(0, 12).map(r => (
                  <div key={r.run_id} onClick={() => { setActiveRun(r); setOpen(false); }}
                    style={{
                      padding: '8px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                      display: 'grid', gridTemplateColumns: '1fr 90px 60px', gap: 8, alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt.short(r.run_id, 24)}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{fmt.dt(r.started_at).slice(11, 19)}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, textAlign: 'right', color: r.quality_score >= 80 ? FOREST : AMBER }}>
                      {r.quality_score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Btn kind="primary" onClick={onRun}>Execute pipeline</Btn>
          <div style={{ width: 1, height: 24, background: NAVY_2 }} />
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
            fontFamily: 'var(--sans)', fontSize: 11, color: '#a4b8d0', lineHeight: 1.3,
          }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>A. Morales</span>
            <span>Compliance Analyst</span>
          </div>
          <div style={{
            width: 34, height: 34, border: `1px solid ${GOLD}`, background: NAVY_2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--serif)', fontSize: 13, color: GOLD, fontWeight: 600,
          }}>AM</div>
        </div>
      </div>

      {/* Gold accent rule */}
      <div style={{ height: 3, background: GOLD }} />
    </div>
  );
};

const SidebarD = ({ active, setActive }) => {
  const grouped = {};
  NAV_D.forEach(n => { (grouped[n.section] = grouped[n.section] || []).push(n); });
  return (
    <aside style={{
      width: 240, background: 'var(--surface)', borderRight: '1px solid var(--border-strong)',
      flexShrink: 0, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
          Workspace
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)', fontWeight: 600, marginTop: 4 }}>
          Trade Operations
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Global · Production</div>
      </div>

      <nav style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {Object.entries(grouped).map(([sec, items]) => (
          <div key={sec} style={{ marginBottom: 8 }}>
            <div style={{
              padding: '12px 16px 6px', fontFamily: 'var(--sans)', fontSize: 10,
              color: 'var(--muted)', letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 700,
            }}>{SECTIONS[sec]}</div>
            {items.map(n => {
              const isActive = n.id === active;
              return (
                <div key={n.id} onClick={() => setActive(n.id)} style={{
                  padding: '7px 16px',
                  display: 'grid', gridTemplateColumns: '20px 1fr', gap: 8, alignItems: 'center',
                  fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer',
                  background: isActive ? '#eef3f9' : 'transparent',
                  color: isActive ? NAVY : 'var(--ink)',
                  borderLeft: isActive ? `3px solid ${NAVY}` : '3px solid transparent',
                  fontWeight: isActive ? 600 : 400,
                  paddingLeft: isActive ? 13 : 16,
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ color: isActive ? NAVY : 'var(--muted)' }}>{n.icon}</span>
                  <span>{n.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: 12, borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>BUILD</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink)', fontWeight: 600 }}>a3f8c19 · 2026-05-14</div>
      </div>
    </aside>
  );
};

const Breadcrumbs = ({ active, activeRun }) => {
  const item = NAV_D.find(n => n.id === active);
  return (
    <div style={{
      padding: '14px 24px', background: 'var(--surface-2)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>Workspace</span><span>›</span>
          <span style={{ textTransform: 'capitalize' }}>{SECTIONS[item?.section || 'analysis']}</span><span>›</span>
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{item?.label}</span>
        </div>
        <h1 style={{
          margin: '4px 0 0', fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.3,
        }}>{item?.label}</h1>
      </div>
      <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)' }}>
        <div>Active run · <span style={{ color: 'var(--ink)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmt.short(activeRun.run_id, 22)}</span></div>
        <div style={{ marginTop: 2 }}>Recorded at {fmt.dt(activeRun.started_at)}</div>
      </div>
    </div>
  );
};

const CmdKD = ({ open, onClose, setActive }) => {
  const [q, setQ] = uSn('');
  if (!open) return null;
  const filtered = NAV_D.filter(n => n.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(10,37,64,0.4)', zIndex: 200,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, background: 'var(--surface)', border: `1px solid ${NAVY}`,
        boxShadow: '0 20px 60px rgba(10,37,64,0.4)',
      }}>
        <div style={{ padding: '10px 14px', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⌕</span>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search or jump to…"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: '#fff', fontFamily: 'var(--sans)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#a4b8d0' }}>ESC</span>
        </div>
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {filtered.map(n => (
            <div key={n.id} onClick={() => { setActive(n.id); onClose(); }}
              style={{
                padding: '8px 14px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 13,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
              <span style={{ color: 'var(--muted)', width: 20 }}>{n.icon}</span>
              <span>{n.label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{SECTIONS[n.section]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ToastD = ({ msg, tone = 'ok', onClose }) => {
  uSnE(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, []);
  const color = { ok: FOREST, warn: AMBER, crit: BRICK }[tone];
  return (
    <div style={{
      position: 'fixed', right: 24, top: 80, zIndex: 300,
      background: 'var(--surface)', border: `1px solid ${color}`, borderLeft: `4px solid ${color}`,
      padding: '12px 16px', minWidth: 320,
      fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 12px rgba(10,37,64,0.15)',
    }}>
      <span style={{ color, fontWeight: 600 }}>{tone === 'ok' ? '✓' : tone === 'warn' ? '!' : '✕'}</span>
      <span style={{ flex: 1 }}>{msg}</span>
      <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--muted)' }}>✕</span>
    </div>
  );
};

Object.assign(window, { NAV_D, SECTIONS, TopbarD, SidebarD, Breadcrumbs, CmdKD, ToastD });
