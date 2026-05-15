// Shell — ATLAS: top tabs, no sidebar, notebook header
const { useState: usAt, useEffect: usAtE } = React;

const NAV_C = [
  { id: 'overview', label: 'Overview' },
  { id: 'run', label: 'Run' },
  { id: 'sources', label: 'Data Sources' },
  { id: 'business', label: 'Business' },
  { id: 'quality', label: 'Quality' },
  { id: 'rules', label: 'Rules' },
  { id: 'audit', label: 'Audit' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
];

const HeaderC = ({ active, setActive, activeRun, setActiveRun, onCmdK, onRun }) => {
  const [open, setOpen] = usAt(false);
  return (
    <header style={{
      borderBottom: '1px solid var(--rule)', background: 'var(--paper)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* top brand strip */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px', borderBottom: '1px solid var(--rule)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 28, height: 28, background: 'var(--ink)', color: 'var(--paper)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500, fontStyle: 'italic',
            }}>A</div>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>Atlas</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 0.5, marginTop: 2 }}>TRADE PIPELINE · v0.4.2</div>
            </div>
          </div>
          <div style={{ width: 1, height: 22, background: 'var(--rule)' }} />
          <Tag color={CHART.green}>API healthy · 12ms</Tag>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onCmdK} style={{
            background: 'transparent', border: '1px solid var(--rule-strong)',
            padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 24,
            fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>
            <span>Search…</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>⌘K</span>
          </button>

          <div style={{ position: 'relative' }}>
            <button onClick={() => setOpen(!open)} style={{
              background: 'transparent', border: '1px solid var(--rule-strong)',
              padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)', cursor: 'pointer',
            }}>
              <span style={{ color: 'var(--muted)' }}>run</span>
              <span>{fmt.short(activeRun.run_id, 18)}</span>
              <span style={{ color: activeRun.quality_score >= 80 ? CHART.green : CHART.amber, fontWeight: 600 }}>{activeRun.quality_score}</span>
              <span style={{ color: 'var(--muted)' }}>▾</span>
            </button>
            {open && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', marginTop: 2,
                background: 'var(--paper)', border: '1px solid var(--ink)',
                minWidth: 380, maxHeight: 400, overflow: 'auto', zIndex: 60,
                boxShadow: '4px 4px 0 var(--ink)',
              }}>
                {MOCK.runs.slice(0, 12).map(r => (
                  <div key={r.run_id} onClick={() => { setActiveRun(r); setOpen(false); }}
                    style={{
                      padding: '8px 12px', borderBottom: '1px solid var(--rule)', cursor: 'pointer',
                      display: 'grid', gridTemplateColumns: '1fr 80px 50px', gap: 8, alignItems: 'center',
                      fontFamily: 'var(--mono)', fontSize: 12,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span>{fmt.short(r.run_id, 24)}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>{fmt.dt(r.started_at).slice(11, 19)}</span>
                    <span style={{ color: r.quality_score >= 80 ? CHART.green : CHART.amber, textAlign: 'right', fontWeight: 600 }}>
                      {r.quality_score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Btn kind="solid" onClick={onRun}>▷ Run pipeline</Btn>
          <div style={{
            width: 28, height: 28, background: CHART.violet, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--serif)', fontSize: 12, fontWeight: 500,
          }}>AM</div>
        </div>
      </div>

      {/* tab nav */}
      <nav style={{
        display: 'flex', padding: '0 32px', gap: 0, alignItems: 'flex-end',
      }}>
        {NAV_C.map((n, i) => {
          const isActive = n.id === active;
          return (
            <div key={n.id} onClick={() => setActive(n.id)} style={{
              padding: '14px 20px', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontSize: 13, fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--ink)' : 'var(--muted)',
              borderBottom: isActive ? `2px solid var(--ink)` : '2px solid transparent',
              marginBottom: -1,
              position: 'relative',
            }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginRight: 8 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {n.label}
            </div>
          );
        })}
      </nav>
    </header>
  );
};

const PageHeader = ({ chapter, title, lede, meta }) => (
  <div style={{ padding: '40px 32px 28px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'flex-end' }}>
    <div>
      {chapter && <Eyebrow style={{ marginBottom: 12 }}>{chapter}</Eyebrow>}
      <Headline size="xxl" style={{ maxWidth: 720 }}>{title}</Headline>
      {lede && (
        <p style={{
          fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1.5,
          color: 'var(--ink-2)', maxWidth: 640, marginTop: 16,
          letterSpacing: '-0.005em', fontWeight: 400,
        }}>{lede}</p>
      )}
    </div>
    {meta && (
      <div style={{ textAlign: 'right' }}>
        <Eyebrow>{meta.label}</Eyebrow>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, marginTop: 6, color: 'var(--ink)' }}>{meta.value}</div>
        {meta.sub && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{meta.sub}</div>}
      </div>
    )}
  </div>
);

const CmdKC = ({ open, onClose, setActive }) => {
  const [q, setQ] = usAt('');
  if (!open) return null;
  const filtered = NAV_C.filter(n => n.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.4)', zIndex: 200,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, background: 'var(--paper)', border: '1px solid var(--ink)',
        boxShadow: '8px 8px 0 var(--ink)',
      }}>
        <input autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search or jump…"
          style={{
            width: '100%', padding: '14px 18px',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--rule)', outline: 'none',
            fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', boxSizing: 'border-box',
          }} />
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {filtered.map((n, i) => (
            <div key={n.id} onClick={() => { setActive(n.id); onClose(); }}
              style={{
                padding: '10px 18px', display: 'grid', gridTemplateColumns: '30px 1fr auto', gap: 8,
                fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--rule)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ color: 'var(--ink)' }}>{n.label}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>↵</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ToastC = ({ msg, tone = 'ok', onClose }) => {
  usAtE(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, []);
  const color = { ok: CHART.green, warn: CHART.amber, crit: CHART.red }[tone];
  return (
    <div style={{
      position: 'fixed', right: 24, top: 90, zIndex: 300,
      background: 'var(--paper)', border: '1px solid var(--ink)',
      padding: '10px 16px', minWidth: 280, boxShadow: '4px 4px 0 var(--ink)',
      fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ width: 8, height: 8, background: color, borderRadius: '50%' }} />
      <span style={{ flex: 1 }}>{msg}</span>
      <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--muted)' }}>✕</span>
    </div>
  );
};

Object.assign(window, { NAV_C, HeaderC, PageHeader, CmdKC, ToastC });
