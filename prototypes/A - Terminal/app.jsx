// App entry — TERMINAL
const { useState: ua, useEffect: uea } = React;

function App() {
  const [active, setActive] = ua('overview');
  const [activeRun, setActiveRun] = ua(MOCK.runs[0]);
  const [cmdK, setCmdK] = ua(false);
  const [toasts, setToasts] = ua([]);
  const addToast = (t) => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { id, ...t }]);
  };
  const removeToast = (id) => setToasts(ts => ts.filter(t => t.id !== id));

  uea(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdK(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'r' && e.shiftKey) { e.preventDefault(); setActive('run'); }
      if (e.key === 'Escape') setCmdK(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const onRun = () => {
    setActive('run');
    addToast({ msg: 'Open run pipeline · press ▶ to start', tone: 'ok' });
  };

  const screenProps = { activeRun, setActiveRun, setActive, addToast };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', color: 'var(--fg)',
      fontFamily: 'var(--sans)',
    }}>
      <Topbar activeRun={activeRun} setActiveRun={setActiveRun} onCmdK={() => setCmdK(true)} onRun={onRun} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar active={active} setActive={setActive} />
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Breadcrumbs active={active} activeRun={activeRun} />
          <div style={{ flex: 1, overflow: 'auto' }}>
            {active === 'overview' && <ScreenOverview {...screenProps} />}
            {active === 'run' && <ScreenRun {...screenProps} />}
            {active === 'sources' && <ScreenSources {...screenProps} />}
            {active === 'business' && <ScreenBusiness {...screenProps} />}
            {active === 'quality' && <ScreenQuality {...screenProps} />}
            {active === 'rules' && <ScreenRules />}
            {active === 'audit-trades' && <ScreenAuditTrades />}
            {active === 'audit-pipeline' && <ScreenAuditPipeline />}
            {active === 'audit-access' && <ScreenAuditAccess />}
            {active === 'history' && <ScreenHistory />}
            {active === 'settings' && <ScreenSettings />}
          </div>
        </main>
      </div>
      <CmdK open={cmdK} onClose={() => setCmdK(false)} setActive={setActive} />
      <div>
        {toasts.map(t => <Toast key={t.id} msg={t.msg} tone={t.tone} onClose={() => removeToast(t.id)} />)}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
