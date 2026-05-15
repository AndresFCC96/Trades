// App — SENTINEL
const { useState: uSn2, useEffect: uSn2E } = React;

function App() {
  const [active, setActive] = uSn2('overview');
  const [activeRun, setActiveRun] = uSn2(MOCK.runs[0]);
  const [cmdK, setCmdK] = uSn2(false);
  const [toasts, setToasts] = uSn2([]);
  const addToast = (t) => { const id = Date.now() + Math.random(); setToasts(ts => [...ts, { id, ...t }]); };
  const removeToast = (id) => setToasts(ts => ts.filter(t => t.id !== id));

  uSn2E(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdK(true); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'r') { e.preventDefault(); setActive('run'); }
      if (e.key === 'Escape') setCmdK(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const onRun = () => { setActive('run'); addToast({ msg: 'Configure parameters and execute', tone: 'ok' }); };
  const props = { activeRun, setActiveRun, setActive, addToast };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--paper)' }}>
      <TopbarD activeRun={activeRun} setActiveRun={setActiveRun} onCmdK={() => setCmdK(true)} onRun={onRun} />
      <div style={{ display: 'flex', flex: 1 }}>
        <SidebarD active={active} setActive={setActive} />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Breadcrumbs active={active} activeRun={activeRun} />
          {active === 'overview' && <ScreenOverviewD {...props} />}
          {active === 'run' && <ScreenRunD {...props} />}
          {active === 'sources' && <ScreenSourcesD {...props} />}
          {active === 'business' && <ScreenBusinessD {...props} />}
          {active === 'quality' && <ScreenQualityD {...props} />}
          {active === 'rules' && <ScreenRulesD />}
          {active === 'audit-trades' && <ScreenAuditTradesD />}
          {active === 'audit-pipeline' && <ScreenAuditPipelineD />}
          {active === 'audit-access' && <ScreenAuditAccessD />}
          {active === 'history' && <ScreenHistoryD />}
          {active === 'settings' && <ScreenSettingsD />}
          <footer style={{
            padding: '16px 24px', marginTop: 32, borderTop: '1px solid var(--border)',
            background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between',
            fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--sans)',
          }}>
            <span>Sentinel · Trade Operations & Compliance · v0.4.2 · build a3f8c19</span>
            <span>© 2026 · All transactions recorded · ISO 27001 / SOC 2 compliant</span>
          </footer>
        </main>
      </div>
      <CmdKD open={cmdK} onClose={() => setCmdK(false)} setActive={setActive} />
      <div>
        {toasts.map(t => <ToastD key={t.id} msg={t.msg} tone={t.tone} onClose={() => removeToast(t.id)} />)}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
