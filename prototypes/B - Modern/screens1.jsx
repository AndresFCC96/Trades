// Screens: Overview, Run Pipeline — MODERN
const { useState: ub1 } = React;

// =============================================================
// OVERVIEW
// =============================================================
function ScreenOverviewB({ activeRun, setActive }) {
  const recent = MOCK.runs.slice(0, 10);
  const scores = MOCK.runs.slice(-30).map(r => r.quality_score);
  const rejections = MOCK.runs.slice(-12).map(r => r.trades_in - r.trades_out);
  const ruleRejects = [...MOCK.rules].sort((a, b) => b.rejected - a.rejected).slice(0, 5);
  const totalRej = activeRun.trades_in - activeRun.trades_out;

  return (
    <div data-screen-label="01 Overview" style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Quality Score" value={activeRun.quality_score.toFixed(1)}
          delta="+2.4"
          sub="Promedio 30 runs · 82.1"
          right={<RadialGauge value={activeRun.quality_score} size={56} label="" />} />
        <KpiCard label="Trades Processed" value={fmt.num(activeRun.trades_out)}
          sub={`de ${fmt.num(activeRun.trades_in)} · ${fmt.pct((activeRun.trades_out / activeRun.trades_in) * 100)} pasaron validación`}>
          <div style={{ display: 'flex', height: 4, borderRadius: 999, overflow: 'hidden', gap: 0 }}>
            <div style={{ flex: activeRun.trades_out, background: 'var(--ok)' }} />
            <div style={{ flex: totalRej, background: 'var(--crit)' }} />
          </div>
        </KpiCard>
        <KpiCard label="Rejected Trades" value={fmt.num(totalRej)}
          delta="-12"
          sub={`${fmt.pct((totalRej / activeRun.trades_in) * 100)} del batch`}
          right={<Spark data={rejections} color="var(--crit)" />} />
        <KpiCard label="Total Notional" value={fmt.usd(activeRun.notional)}
          delta="+8.3%" sub="14 asset classes · 7 venues" />
      </div>

      {/* Chart row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
        <Card title="Quality score over time" subtitle="Últimos 30 runs"
          right={<Pill>Score 0–100</Pill>}>
          <AreaChartM data={scores} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
            <span>30 runs ago</span><span>15</span><span>Latest</span>
          </div>
        </Card>
        <Card title="Top rejections by rule" subtitle="Último run">
          <HBarsM data={ruleRejects.map(r => ({ label: r.id, value: r.rejected }))}
            color="var(--warn)" valueFmt={v => v.toString()} />
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--muted)' }}>Total rejected</span>
            <span style={{ color: 'var(--crit)', fontWeight: 600, fontFamily: 'var(--mono)' }}>{fmt.num(ruleRejects.reduce((a, b) => a + b.rejected, 0))}</span>
          </div>
        </Card>
      </div>

      {/* Recent Runs */}
      <Card title="Recent runs" subtitle="Últimos 10 ejecutados"
        right={<Button kind="ghost" onClick={() => setActive('history')}>View all →</Button>}
        padded={false}>
        <TableM cols={[
          { label: 'Run ID', render: r => <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt.short(r.run_id, 22)}</span> },
          { label: 'Started', render: r => <span style={{ color: 'var(--muted)' }}>{fmt.dt(r.started_at).slice(0, 19)}</span> },
          { label: 'Duration', align: 'right', mono: true, render: r => fmt.dur(r.duration_ms) },
          { label: 'Mode', render: r => <Pill tone={r.mode === 'kafka' ? 'accent' : 'neutral'}>{r.mode}</Pill> },
          { label: 'In', align: 'right', mono: true, render: r => fmt.num(r.trades_in) },
          { label: 'Out', align: 'right', mono: true, render: r => fmt.num(r.trades_out) },
          { label: 'Rejected', align: 'right', mono: true, render: r => <span style={{ color: 'var(--crit)' }}>{fmt.num(r.trades_in - r.trades_out)}</span> },
          { label: 'Quality', align: 'right', render: r => (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 50, height: 5, background: 'var(--chip)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${r.quality_score}%`, height: '100%', background: r.quality_score >= 80 ? 'var(--ok)' : 'var(--warn)' }} />
              </div>
              <span style={{ fontFamily: 'var(--mono)', minWidth: 28, fontWeight: 600, color: r.quality_score >= 80 ? 'var(--ok)' : 'var(--warn)' }}>{r.quality_score}</span>
            </div>
          )},
          { label: '', align: 'right', render: () => (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <Button size="sm" kind="ghost">View</Button>
            </div>
          )},
        ]} rows={recent} />
      </Card>
    </div>
  );
}

// =============================================================
// RUN PIPELINE
// =============================================================
function ScreenRunB({ activeRun, setActiveRun, addToast }) {
  const [tab, setTab] = ub1('generate');
  const [n, setN] = ub1(10000);
  const [seed, setSeed] = ub1(42);
  const [nullRate, setNullRate] = ub1(0.02);
  const [outlierRate, setOutlierRate] = ub1(0.01);
  const [persist, setPersist] = ub1(false);
  const [running, setRunning] = ub1(false);
  const [stages, setStages] = ub1([
    { id: 'generate', name: 'Generate', icon: '✦', status: 'idle' },
    { id: 'extract', name: 'Extract', icon: '⇣', status: 'idle' },
    { id: 'validate', name: 'Validate', icon: '✓', status: 'idle' },
    { id: 'transform', name: 'Transform', icon: '⇆', status: 'idle' },
  ]);
  const [result, setResult] = ub1(null);

  const runPipeline = async () => {
    setRunning(true);
    setResult(null);
    let curr = stages.map(s => ({ ...s, status: 'idle', dur: null, tin: null, tout: null }));
    setStages(curr);
    let trades = n;
    for (let i = 0; i < curr.length; i++) {
      curr[i] = { ...curr[i], status: 'running' };
      setStages([...curr]);
      const dur = 250 + Math.random() * 700;
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
      mode: 'dataframe', trades_in: n, trades_out: trades,
      quality_score: 87.3, notional: 1.34e9,
    };
    setResult(newRun); setActiveRun(newRun); setRunning(false);
    addToast({ msg: `Pipeline completed · score 87.3 · ${fmt.dur(newRun.duration_ms)}`, tone: 'ok' });
  };

  return (
    <div data-screen-label="02 Run Pipeline" style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200 }}>
      <Card title="Pipeline configuration" subtitle="Configura los parámetros y ejecuta">
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--chip)', borderRadius: 8, marginBottom: 20, width: 'fit-content' }}>
          {[['generate', '✦ Generate synthetic'], ['load', '☁ Load from source']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '6px 14px', fontSize: 12, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === id ? 'var(--surface)' : 'transparent',
              color: tab === id ? 'var(--fg)' : 'var(--muted)',
              boxShadow: tab === id ? 'var(--shadow-sm)' : 'none',
              fontWeight: tab === id ? 600 : 500, fontFamily: 'inherit',
            }}>{label}</button>
          ))}
        </div>

        {tab === 'generate' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <Slider label="N trades" min={1000} max={1000000} step={1000} value={n} onChange={setN}
                format={v => fmt.num(v)} hint="Rango 0 – 10,000,000" />
              <div style={{ marginTop: 14 }}><Input label="Seed" type="number" value={seed} onChange={e => setSeed(+e.target.value)} /></div>
              <div style={{ marginTop: 14 }}>
                <Toggle checked={persist} onChange={setPersist}
                  label="Persist raw CSV" sub="Guarda los trades generados en /data/raw/" />
              </div>
            </div>
            <div>
              <Slider label="Null rate" min={0} max={1} step={0.01} value={nullRate} onChange={setNullRate}
                format={v => `${(v * 100).toFixed(1)}%`} hint="Probabilidad de campos null" />
              <div style={{ marginTop: 18 }}>
                <Slider label="Outlier rate" min={0} max={1} step={0.01} value={outlierRate} onChange={setOutlierRate}
                  format={v => `${(v * 100).toFixed(1)}%`} hint="Probabilidad de outliers en price/qty" />
              </div>
              <div style={{ marginTop: 18, padding: 12, background: 'var(--accent-soft)', borderRadius: 8, fontSize: 12, color: 'var(--fg-2)' }}>
                <strong style={{ color: 'var(--accent)' }}>Estimación:</strong> ~{Math.round(n * (nullRate + outlierRate))} trades problemáticos esperados
              </div>
            </div>
          </div>
        )}

        {tab === 'load' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              ['csv', '☁', 'CSV Upload', 'Sube un archivo desde tu equipo'],
              ['api', '⇄', 'HTTP API', 'Conecta a un endpoint REST'],
              ['kafka', '⥄', 'Kafka Topic', 'Consume desde streaming'],
            ].map(([id, icon, name, desc]) => (
              <div key={id} style={{
                padding: 18, border: '1px solid var(--border)', borderRadius: 10,
                cursor: 'pointer', background: 'var(--surface)',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}>
                <div style={{ fontSize: 24 }}>{icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8, color: 'var(--fg)' }}>{name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{desc}</div>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>Configurar →</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-soft)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <Button kind="primary" size="lg" onClick={runPipeline} disabled={running}>
            <span>{running ? '◐' : '▷'}</span>
            <span>{running ? 'Running pipeline…' : 'Run pipeline'}</span>
          </Button>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Atajo <kbd style={kbdStyle}>⌘</kbd> <kbd style={kbdStyle}>⇧</kbd> <kbd style={kbdStyle}>R</kbd>
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
            Estimación · ~{(n / 8500).toFixed(1)}s
          </span>
        </div>
      </Card>

      <Card title="Stage execution" subtitle="Las 4 etapas del pipeline">
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {stages.map((s, i) => (
            <StageB key={s.id} stage={s} isLast={i === stages.length - 1} />
          ))}
        </div>

        {result && (
          <div style={{
            marginTop: 20, padding: '16px 20px', borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))',
            border: '1px solid rgba(34,197,94,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', background: 'var(--ok)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 600,
              }}>✓</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                  Run completed in {fmt.dur(result.duration_ms)} · Quality 87.3
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                  {result.run_id} · {fmt.num(result.trades_in)} → {fmt.num(result.trades_out)} · {fmt.num(result.trades_in - result.trades_out)} rejected
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button kind="ghost">Download</Button>
              <Button kind="primary">View report →</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

const kbdStyle = {
  display: 'inline-block', padding: '1px 5px', fontSize: 10, fontFamily: 'var(--mono)',
  background: 'var(--chip)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--fg-2)',
};

const StageB = ({ stage, isLast }) => {
  const isOk = stage.status === 'ok';
  const isRunning = stage.status === 'running';
  const tone = isOk ? 'var(--ok)' : isRunning ? 'var(--accent)' : 'var(--muted)';
  return (
    <div style={{ position: 'relative' }}>
      {!isLast && (
        <div style={{
          position: 'absolute', right: -16, top: 24, width: 16, height: 2,
          background: isOk ? 'var(--ok)' : 'var(--border)',
          zIndex: 0,
        }} />
      )}
      <div style={{
        padding: 16, border: `1px solid ${isOk || isRunning ? tone : 'var(--border)'}`,
        borderRadius: 10, background: 'var(--surface)',
        boxShadow: isRunning ? `0 0 0 3px ${'var(--accent-soft)'}` : 'none',
        transition: 'all 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: isOk ? 'rgba(34,197,94,0.10)' : isRunning ? 'var(--accent-soft)' : 'var(--chip)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: tone, fontSize: 16,
            animation: isRunning ? 'spin 1.5s linear infinite' : 'none',
          }}>{isOk ? '✓' : stage.icon}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{stage.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{
              stage.status === 'idle' ? 'Idle' : stage.status === 'running' ? 'Processing…' : 'Completed'
            }</div>
          </div>
        </div>
        {stage.dur != null && (
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            {fmt.dur(stage.dur)} · {fmt.num(stage.tin)} → {fmt.num(stage.tout)}
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { ScreenOverviewB, ScreenRunB });
