// App — ATLAS
const { useState: uAt, useEffect: uAtE } = React;

function App() {
  const [active, setActive] = uAt('overview');
  const [activeRun, setActiveRun] = uAt(MOCK.runs[0]);
  const [cmdK, setCmdK] = uAt(false);
  const [toasts, setToasts] = uAt([]);
  const addToast = (t) => { const id = Date.now() + Math.random(); setToasts(ts => [...ts, { id, ...t }]); };
  const removeToast = (id) => setToasts(ts => ts.filter(t => t.id !== id));

  uAtE(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdK(true); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'r') { e.preventDefault(); setActive('run'); }
      if (e.key === 'Escape') setCmdK(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const onRun = () => { setActive('run'); addToast({ msg: 'Configure & press ▷', tone: 'ok' }); };
  const props = { activeRun, setActiveRun, setActive, addToast };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)' }}>
      <HeaderC active={active} setActive={setActive} activeRun={activeRun} setActiveRun={setActiveRun}
        onCmdK={() => setCmdK(true)} onRun={onRun} />
      <main>
        {active === 'overview' && <ScreenOverviewC {...props} />}
        {active === 'run' && <ScreenRunC {...props} />}
        {active === 'sources' && <ScreenSourcesC {...props} />}
        {active === 'business' && <ScreenBusinessC {...props} />}
        {active === 'quality' && <ScreenQualityC {...props} />}
        {active === 'rules' && <ScreenRulesC />}
        {active === 'audit' && <ScreenAuditC />}
        {active === 'history' && <ScreenHistoryC />}
        {active === 'settings' && <ScreenSettingsC />}
      </main>
      <CmdKC open={cmdK} onClose={() => setCmdK(false)} setActive={setActive} />
      <div>
        {toasts.map(t => <ToastC key={t.id} msg={t.msg} tone={t.tone} onClose={() => removeToast(t.id)} />)}
      </div>
      <footer style={{
        borderTop: '1px solid var(--rule)', padding: '24px 32px', marginTop: 60,
        fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>ATLAS · Trade Pipeline · v0.4.2 · build a3f8c19</span>
        <span>© 2026 · ⌘K to search · escape to close</span>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
