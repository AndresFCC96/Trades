// Screens: Overview, Run Pipeline — TERMINAL style
const { useState: uS, useEffect: uE, useMemo: uM } = React;

// =============================================================
// OVERVIEW
// =============================================================
function ScreenOverview({ activeRun, setActive }) {
  const recent = MOCK.runs.slice(0, 10);
  const scores = MOCK.runs.slice(-30).map(r => r.quality_score);
  const rejections = MOCK.runs.slice(-10).map(r => r.trades_in - r.trades_out);
  const ruleRejects = [...MOCK.rules].sort((a, b) => b.rejected - a.rejected).slice(0, 5);

  return (
    <div data-screen-label="01 Overview" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KPI label="Quality Score" value={activeRun.quality_score.toFixed(1)}
          tone={activeRun.quality_score >= 80 ? 'ok' : activeRun.quality_score >= 60 ? 'warn' : 'crit'}
          sub="UMBRAL ≥ 80" right={<Gauge value={activeRun.quality_score} size={52} label="" />}>
        </KPI>
        <KPI label="Trades Processed" value={`${fmt.num(activeRun.trades_out)}`} tone="info"
          sub={`IN ${fmt.num(activeRun.trades_in)} · ${fmt.pct((activeRun.trades_out / activeRun.trades_in) * 100)} OK`}>
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ flex: activeRun.trades_out, height: 4, background: '#4ade80' }} />
            <div style={{ flex: activeRun.trades_in - activeRun.trades_out, height: 4, background: '#f87171' }} />
          </div>
        </KPI>
        <KPI label="Rejected Trades" value={fmt.num(activeRun.trades_in - activeRun.trades_out)} tone="crit"
          sub={`${fmt.pct(((activeRun.trades_in - activeRun.trades_out) / activeRun.trades_in) * 100)} del batch`}
          right={<Sparkline data={rejections} color="#f87171" />} />
        <KPI label="Total Notional (USD)" value={fmt.usd(activeRun.notional)} tone="ok"
          sub="14 ASSET CLASSES · 7 VENUES" />
      </div>

      {/* charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
        <Panel title="Quality Score · Last 30 Runs"
          right={<span style={{ color: 'var(--muted)' }}>SCORE 0—100 · 30 RUNS</span>}>
          <AreaChart data={scores} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
            <span>30 RUNS AGO</span><span>15</span><span>NOW</span>
          </div>
        </Panel>
        <Panel title="Top Rejections by Rule">
          <HBars data={ruleRejects.map(r => ({ label: r.id, value: r.rejected }))}
            color="#fbbf24" valueFmt={v => v.toString()} />
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-soft)',
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 0.4 }}>
            TOTAL REJECTED <span style={{ color: '#f87171' }}>{fmt.num(ruleRejects.reduce((a, b) => a + b.rejected, 0))}</span>
          </div>
        </Panel>
      </div>

      {/* Recent Runs */}
      <Panel title="Recent Runs · Last 10"
        right={<Btn onClick={() => setActive('history')}>VIEW HISTORY →</Btn>}>
        <Table dense cols={[
          { label: 'RUN_ID', render: r => <span style={{ color: 'var(--fg)' }}>{r.run_id}</span> },
          { label: 'STARTED', render: r => <span style={{ color: 'var(--muted)' }}>{fmt.dt(r.started_at)}</span> },
          { label: 'DURATION', align: 'right', render: r => fmt.dur(r.duration_ms) },
          { label: 'MODE', render: r => <Badge tone={r.mode === 'kafka' ? 'accent' : 'neutral'}>{r.mode}</Badge> },
          { label: 'IN', align: 'right', render: r => fmt.num(r.trades_in) },
          { label: 'OUT', align: 'right', render: r => fmt.num(r.trades_out) },
          { label: 'REJ', align: 'right', render: r => <span style={{ color: '#f87171' }}>{fmt.num(r.trades_in - r.trades_out)}</span> },
          { label: 'SCORE', align: 'right', render: r => (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: r.quality_score >= 80 ? '#4ade80' : r.quality_score >= 60 ? '#fbbf24' : '#f87171', minWidth: 32, textAlign: 'right' }}>
                {r.quality_score}
              </span>
              <div style={{ width: 40, height: 4, background: 'var(--border)' }}>
                <div style={{ width: `${r.quality_score}%`, height: '100%',
                  background: r.quality_score >= 80 ? '#4ade80' : r.quality_score >= 60 ? '#fbbf24' : '#f87171' }} />
              </div>
            </div>
          )},
          { label: '', align: 'right', render: () => <span style={{ color: 'var(--muted)' }}>VIEW · DL</span> },
        ]} rows={recent} />
      </Panel>
    </div>
  );
}

// =============================================================
// RUN PIPELINE
// =============================================================
function ScreenRun({ activeRun, setActiveRun, addToast }) {
  const [tab, setTab] = uS('generate');
  const [n, setN] = uS(10000);
  const [seed, setSeed] = uS(42);
  const [nullRate, setNullRate] = uS(0.02);
  const [outlierRate, setOutlierRate] = uS(0.01);
  const [persist, setPersist] = uS(false);
  const [running, setRunning] = uS(false);
  const [stages, setStages] = uS([
    { id: 'generate', name: 'GENERATE', status: 'idle', dur: null, tin: null, tout: null },
    { id: 'extract', name: 'EXTRACT', status: 'idle', dur: null, tin: null, tout: null },
    { id: 'validate', name: 'VALIDATE', status: 'idle', dur: null, tin: null, tout: null },
    { id: 'transform', name: 'TRANSFORM', status: 'idle', dur: null, tin: null, tout: null },
  ]);
  const [result, setResult] = uS(null);

  const runPipeline = async () => {
    setRunning(true);
    setResult(null);
    const fresh = stages.map(s => ({ ...s, status: 'idle', dur: null, tin: null, tout: null }));
    setStages(fresh);
    let curr = [...fresh];
    let trades = n;
    for (let i = 0; i < curr.length; i++) {
      curr[i] = { ...curr[i], status: 'running' };
      setStages([...curr]);
      const dur = 200 + Math.random() * 600;
      await new Promise(r => setTimeout(r, dur));
      const tin = trades;
      trades = i === 2 ? Math.round(trades * 0.964) : trades;
      curr[i] = { ...curr[i], status: 'ok', dur: Math.round(dur), tin, tout: trades };
      setStages([...curr]);
    }
    const newRun = {
      run_id: `run_${Date.now().toString(16)}_new`,
      started_at: new Date().toISOString(),
      duration_ms: curr.reduce((a, b) => a + b.dur, 0),
      mode: 'dataframe',
      trades_in: n,
      trades_out: trades,
      quality_score: 87.3,
      notional: 1.34e9,
    };
    setResult(newRun);
    setActiveRun(newRun);
    setRunning(false);
    addToast({ msg: `Pipeline OK · score 87.3 · ${fmt.dur(newRun.duration_ms)}`, tone: 'ok' });
  };

  return (
    <div data-screen-label="02 Run Pipeline" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1100 }}>
      <Panel title="Pipeline Configuration">
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          {[['generate', 'GENERATE SYNTHETIC'], ['load', 'LOAD FROM SOURCE']].map(([id, label]) => (
            <div key={id} onClick={() => setTab(id)} style={{
              padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 0.6,
              cursor: 'pointer', color: tab === id ? '#4ade80' : 'var(--muted)',
              borderBottom: tab === id ? '2px solid #4ade80' : '2px solid transparent',
            }}>{label}</div>
          ))}
        </div>

        {tab === 'generate' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <Field label="N_TRADES" value={fmt.num(n)} hint="0 — 10,000,000">
              <input type="range" min={1000} max={1000000} step={1000} value={n}
                onChange={e => setN(+e.target.value)} style={inputRange} />
              <input type="number" value={n} onChange={e => setN(+e.target.value)} style={inputBox} />
            </Field>
            <Field label="SEED" value={seed.toString()}>
              <input type="number" value={seed} onChange={e => setSeed(+e.target.value)} style={inputBox} />
            </Field>
            <Field label="NULL_RATE" value={`${(nullRate * 100).toFixed(1)}%`} hint="Probabilidad de campos null">
              <input type="range" min={0} max={1} step={0.01} value={nullRate}
                onChange={e => setNullRate(+e.target.value)} style={inputRange} />
            </Field>
            <Field label="OUTLIER_RATE" value={`${(outlierRate * 100).toFixed(1)}%`} hint="Probabilidad de outliers">
              <input type="range" min={0} max={1} step={0.01} value={outlierRate}
                onChange={e => setOutlierRate(+e.target.value)} style={inputRange} />
            </Field>
            <Field label="PERSIST RAW CSV">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)' }}>
                <span style={{
                  width: 28, height: 14, background: persist ? '#4ade80' : 'var(--border)',
                  borderRadius: 2, position: 'relative', cursor: 'pointer',
                }} onClick={() => setPersist(!persist)}>
                  <span style={{
                    position: 'absolute', top: 1, left: persist ? 15 : 1,
                    width: 12, height: 12, background: 'var(--knob)', transition: 'left 0.15s',
                  }} />
                </span>
                <span>{persist ? 'ENABLED · /data/raw/' : 'DISABLED'}</span>
              </label>
            </Field>
          </div>
        )}

        {tab === 'load' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[['csv', 'CSV UPLOAD', 'Files /data/in'], ['api', 'HTTP API', 'REST endpoint'], ['kafka', 'KAFKA TOPIC', 'Streaming consumer']].map(([id, name, desc]) => (
              <div key={id} style={{
                padding: 14, border: '1px solid var(--border)', borderRadius: 2,
                cursor: 'pointer', background: 'var(--panel)',
              }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#4ade80', letterSpacing: 0.6 }}>{name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{desc}</div>
                <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg)' }}>Configurar →</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Btn kind="primary" size="lg" onClick={runPipeline} disabled={running}>
            {running ? '▮▮ RUNNING…' : '▶ RUN PIPELINE'}
          </Btn>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
            ATAJO ⌘R · El run se persistirá en /audit/pipeline
          </span>
        </div>
      </Panel>

      <Panel title="Stage Execution">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 20px'.replace('20px', '0'), gap: 0, position: 'relative' }}>
          {stages.map((s, i) => (
            <Stage key={s.id} stage={s} isLast={i === stages.length - 1} />
          ))}
        </div>

        {result && (
          <div style={{
            marginTop: 16, padding: '12px 16px',
            background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.3)',
            borderLeft: '3px solid #4ade80',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#4ade80', fontWeight: 600 }}>
                ✓ RUN COMPLETED · {fmt.dur(result.duration_ms)} · QUALITY 87.3
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                {result.run_id} · {fmt.num(result.trades_in)} in → {fmt.num(result.trades_out)} out · {fmt.num(result.trades_in - result.trades_out)} rejected
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn kind="solid">VIEW REPORT →</Btn>
              <Btn>DOWNLOAD</Btn>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

const Field = ({ label, value, hint, children }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 0.6 }}>{label}</span>
      {value && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)' }}>{value}</span>}
    </div>
    {children}
    {hint && <div style={{ marginTop: 4, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>{hint}</div>}
  </div>
);

const inputBox = {
  width: '100%', boxSizing: 'border-box', padding: '6px 10px', marginTop: 6,
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 2,
  fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)', outline: 'none',
};
const inputRange = { width: '100%', accentColor: '#4ade80' };

const Stage = ({ stage, isLast }) => {
  const color = stage.status === 'ok' ? '#4ade80' : stage.status === 'running' ? '#fbbf24' : stage.status === 'fail' ? '#f87171' : 'var(--muted)';
  const icon = stage.status === 'ok' ? '✓' : stage.status === 'running' ? '◐' : stage.status === 'fail' ? '✕' : '○';
  return (
    <div style={{ position: 'relative', padding: '14px 14px', border: '1px solid var(--border)', background: 'var(--panel)', borderRadius: 2, marginRight: isLast ? 0 : 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 22, height: 22, border: `1px solid ${color}`, color,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 12, borderRadius: 2,
          animation: stage.status === 'running' ? 'spin 1s linear infinite' : 'none',
        }}>{icon}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)', letterSpacing: 0.6 }}>{stage.name}</span>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
        {stage.status === 'idle' ? '— IDLE' : stage.status === 'running' ? 'PROCESANDO…' : 'OK'}
      </div>
      {stage.dur != null && (
        <div style={{ marginTop: 4, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg)' }}>
          {fmt.dur(stage.dur)} · {fmt.num(stage.tin)}→{fmt.num(stage.tout)}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { ScreenOverview, ScreenRun });
