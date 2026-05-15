// App entry — MODERN (Pipely)
const { useState: uA, useEffect: uAE } = React;

function App() {
  const [active, setActive] = uA('overview');
  const [activeRun, setActiveRun] = uA(MOCK.runs[0]);
  const [cmdK, setCmdK] = uA(false);
  const [toasts, setToasts] = uA([]);
  const [collapsed, setCollapsed] = uA(false);
  // Sync initial theme with the shared switcher (reads data-theme set by _switcher.js)
  const [theme, setThemeState] = uA(() =>
    (typeof document !== 'undefined' && document.documentElement.dataset.theme) || 'light'
  );
  const setTheme = (t) => {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    localStorage.setItem('tradesys-theme-B', t);
    // Update switcher icon
    const sw = document.querySelector('#proto-switcher .ps-theme');
    if (sw) sw.textContent = t === 'dark' ? '☾' : '☼';
  };

  uAE(() => {
    document.documentElement.dataset.theme = theme;
    // Listen to switcher theme changes via storage
    const onStorage = (e) => { if (e.key === 'tradesys-theme-B' && e.newValue) setThemeState(e.newValue); };
    window.addEventListener('storage', onStorage);
    // Poll for switcher click (same-tab no storage event)
    const id = setInterval(() => {
      const t = document.documentElement.dataset.theme;
      if (t && t !== theme) setThemeState(t);
    }, 250);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(id); };
  }, [theme]);

  const addToast = (t) => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { id, ...t }]);
  };
  const removeToast = (id) => setToasts(ts => ts.filter(t => t.id !== id));

  uAE(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdK(true); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'r') { e.preventDefault(); setActive('run'); }
      if (e.key === 'Escape') setCmdK(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const onRun = () => {
    setActive('run');
    addToast({ msg: 'Run pipeline · configure & press ▷', tone: 'ok' });
  };

  const props = { activeRun, setActiveRun, setActive, addToast };

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'var(--bg)', color: 'var(--fg)',
      fontFamily: 'var(--sans)',
    }}>
      <SidebarM active={active} setActive={setActive} collapsed={collapsed} setCollapsed={setCollapsed} theme={theme} setTheme={setTheme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopbarM activeRun={activeRun} setActiveRun={setActiveRun}
          onCmdK={() => setCmdK(true)} onRun={onRun} theme={theme} setTheme={setTheme} />
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          <BreadcrumbsM active={active} activeRun={activeRun} />
          {active === 'overview' && <ScreenOverviewB {...props} />}
          {active === 'run' && <ScreenRunB {...props} />}
          {active === 'sources' && <ScreenSourcesB {...props} />}
          {active === 'business' && <ScreenBusinessB {...props} />}
          {active === 'quality' && <ScreenQualityB {...props} />}
          {active === 'rules' && <ScreenRulesB />}
          {active === 'audit-trades' && <ScreenAuditTradesB />}
          {active === 'audit-pipeline' && <ScreenAuditPipelineB />}
          {active === 'audit-access' && <ScreenAuditAccessB />}
          {active === 'history' && <ScreenHistoryB />}
          {active === 'settings' && <ScreenSettingsB />}
        </main>
      </div>
      <CmdKM open={cmdK} onClose={() => setCmdK(false)} setActive={setActive} />
      <div>
        {toasts.map(t => <ToastM key={t.id} msg={t.msg} tone={t.tone} onClose={() => removeToast(t.id)} />)}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
