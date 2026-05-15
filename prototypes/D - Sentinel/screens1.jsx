// Screens 1: Overview + Run — SENTINEL
const { useState: uD1, useEffect: uD1E } = React;

// =============================================================
// OVERVIEW
// =============================================================
function ScreenOverviewD({ activeRun, setActive }) {
  const recent = MOCK.runs.slice(0, 8);
  const scores = MOCK.runs.slice(-30).map(r => r.quality_score);
  const rejections = MOCK.runs.slice(-12).map(r => r.trades_in - r.trades_out);
  const ruleRejects = [...MOCK.rules].sort((a, b) => b.rejected - a.rejected).slice(0, 5);
  const totalRej = activeRun.trades_in - activeRun.trades_out;

  return (
    <div data-screen-label="01 Overview" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi label="Quality Score" value={activeRun.quality_score.toFixed(1)}
          color={activeRun.quality_score >= 80 ? FOREST : AMBER}
          sub="Threshold ≥ 80 · trend ↗ +2.4"
          right={<Stamp color={activeRun.quality_score >= 80 ? FOREST : AMBER}>Pass</Stamp>} />
        <Kpi label="Trades Processed" value={fmt.num(activeRun.trades_out)}
          sub={`from ${fmt.num(activeRun.trades_in)} input · ${fmt.pct((activeRun.trades_out / activeRun.trades_in) * 100)} retention`} />
        <Kpi label="Rejected" value={fmt.num(totalRej)} color={BRICK}
          sub={`${fmt.pct((totalRej / activeRun.trades_in) * 100)} of batch`}
          right={<Spark data={rejections} color={BRICK} />} />
        <Kpi label="Total Notional (USD)" value={fmt.usd(activeRun.notional)}
          sub="14 asset classes · 7 venues" />
      </div>

      {/* Compliance summary banner */}
      <Card eyebrow="Compliance summary" title="Run audit record" headerAccent
        right={<div style={{ display: 'flex', gap: 8 }}>
          <Btn kind="primary" size="sm">Sign-off ▶</Btn>
          <Btn size="sm" style={{ color: '#fff', background: 'transparent', borderColor: GOLD }}>Export PDF</Btn>
        </div>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: 'var(--border)' }}>
          <RecField label="Run ID" value={fmt.short(activeRun.run_id, 22)} mono />
          <RecField label="Started" value={fmt.dt(activeRun.started_at)} mono />
          <RecField label="Duration" value={fmt.dur(activeRun.duration_ms)} />
          <RecField label="Mode" value={activeRun.mode} stamp />
          <RecField label="Validated by" value="A. Morales" />
        </div>
      </Card>

      {/* Chart row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
        <Card eyebrow="Figure 1" title="Quality score over time"
          subtitle="Last 30 runs · 0 — 100 scale"
          right={<Stamp>30 RUNS</Stamp>}>
          <Pad>
            <AreaChart data={scores} color={NAVY} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
              <span>30 RUNS AGO</span><span>15</span><span>LATEST</span>
            </div>
          </Pad>
        </Card>
        <Card eyebrow="Figure 2" title="Top rejections by rule" subtitle="Current run">
          <Pad>
            <Bars data={ruleRejects.map(r => ({ label: r.id, value: r.rejected }))}
              color={AMBER} valueFmt={v => v.toString()} />
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Total rejected</span>
              <span style={{ color: BRICK, fontWeight: 600, fontFamily: 'var(--mono)' }}>{ruleRejects.reduce((a, b) => a + b.rejected, 0)}</span>
            </div>
          </Pad>
        </Card>
      </div>

      <Card eyebrow="Table 1" title="Recent pipeline runs" subtitle="Last 8 executions"
        right={<Btn size="sm" onClick={() => setActive('history')}>View full history →</Btn>}>
        <Tbl cols={[
          { label: 'Run ID', mono: true, render: r => fmt.short(r.run_id, 22) },
          { label: 'Started', mono: true, tone: 'muted', render: r => fmt.dt(r.started_at).slice(0, 19) },
          { label: 'Duration', align: 'right', mono: true, render: r => fmt.dur(r.duration_ms) },
          { label: 'Mode', render: r => <Stamp color={r.mode === 'kafka' ? GOLD : NAVY}>{r.mode}</Stamp> },
          { label: 'In', align: 'right', mono: true, render: r => fmt.num(r.trades_in) },
          { label: 'Out', align: 'right', mono: true, render: r => fmt.num(r.trades_out) },
          { label: 'Rejected', align: 'right', mono: true, render: r => <span style={{ color: BRICK }}>{fmt.num(r.trades_in - r.trades_out)}</span> },
          { label: 'Quality', align: 'right', render: r => (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 50, height: 4, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ width: `${r.quality_score}%`, height: '100%', background: r.quality_score >= 80 ? FOREST : AMBER }} />
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: r.quality_score >= 80 ? FOREST : AMBER }}>{r.quality_score}</span>
            </div>
          )},
          { label: 'Status', render: r => <Stamp color={FOREST}>Recorded</Stamp> },
        ]} rows={recent} />
      </Card>
    </div>
  );
}

const RecField = ({ label, value, mono, stamp }) => (
  <div style={{ background: 'var(--surface)', padding: '10px 14px' }}>
    <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: 'var(--muted)', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
    {stamp ? <div style={{ marginTop: 4 }}><Stamp>{value}</Stamp></div> :
      <div style={{
        fontSize: 13, fontFamily: mono ? 'var(--mono)' : 'var(--sans)',
        color: 'var(--ink)', fontWeight: 500, marginTop: 4,
      }}>{value}</div>
    }
  </div>
);

// =============================================================
// RUN PIPELINE
// =============================================================
function ScreenRunD({ activeRun, setActiveRun, addToast }) {
  const [tab, setTab] = uD1('generate');
  const [n, setN] = uD1(10000);
  const [seed, setSeed] = uD1(42);
  const [nullRate, setNullRate] = uD1(0.02);
  const [outlierRate, setOutlierRate] = uD1(0.01);
  const [running, setRunning] = uD1(false);
  const [stages, setStages] = uD1([
    { id: 'generate', name: 'Generate', status: 'idle' },
    { id: 'extract', name: 'Extract', status: 'idle' },
    { id: 'validate', name: 'Validate', status: 'idle' },
    { id: 'transform', name: 'Transform', status: 'idle' },
  ]);
  const [result, setResult] = uD1(null);

  const runPipeline = async () => {
    setRunning(true); setResult(null);
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
      run_id: `run_${Date.now().toString(16)}_new`, started_at: new Date().toISOString(),
      duration_ms: curr.reduce((a, b) => a + b.dur, 0), mode: 'dataframe',
      trades_in: n, trades_out: trades, quality_score: 87.3, notional: 1.34e9,
    };
    setResult(newRun); setActiveRun(newRun); setRunning(false);
    addToast({ msg: `Execution recorded · Quality 87.3 · ${fmt.dur(newRun.duration_ms)}`, tone: 'ok' });
  };

  return (
    <div data-screen-label="02 Run Pipeline" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200 }}>
      <Card eyebrow="Configuration" title="Pipeline parameters" headerAccent>
        <Pad>
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
            {[['generate', 'Generate synthetic'], ['load', 'Load from external source']].map(([id, l]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--sans)', fontSize: 13, fontWeight: tab === id ? 600 : 500,
                color: tab === id ? NAVY : 'var(--muted)',
                borderBottom: tab === id ? `2px solid ${NAVY}` : '2px solid transparent',
                marginBottom: -1,
              }}>{l}</button>
            ))}
          </div>

          {tab === 'generate' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Slider min={1000} max={1000000} step={1000} value={n} onChange={setN} required
                  label="Number of trades" format={v => fmt.num(v)} hint="Permitted range: 0 — 10,000,000" />
                <Field label="Random seed" type="number" value={seed} onChange={e => setSeed(+e.target.value)} required
                  hint="Used for reproducibility. Same seed → same dataset." />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Slider min={0} max={1} step={0.01} value={nullRate} onChange={setNullRate}
                  label="Null rate" format={v => `${(v * 100).toFixed(1)}%`} hint="Probability of null fields per row" />
                <Slider min={0} max={1} step={0.01} value={outlierRate} onChange={setOutlierRate}
                  label="Outlier rate" format={v => `${(v * 100).toFixed(1)}%`} hint="Probability of outlier price / quantity" />
              </div>
            </div>
          )}

          {tab === 'load' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                ['CSV upload', 'Upload a file from your system', '◰'],
                ['HTTP API', 'Subscribe to a REST endpoint', '◱'],
                ['Kafka topic', 'Consume from a Kafka topic', '◲'],
              ].map(([name, desc, icon]) => (
                <div key={name} style={{
                  padding: 16, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 22, color: 'var(--ink)' }}>{icon}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginTop: 8 }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{desc}</div>
                  <div style={{ marginTop: 10, fontSize: 12, color: GOLD, fontWeight: 600 }}>Configure →</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Btn kind="primary" size="lg" onClick={runPipeline} disabled={running}>
              {running ? '◐ Executing…' : '▶ Execute pipeline'}
            </Btn>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
              All executions are recorded in the audit log with timestamp UTC and the validator&apos;s identity.
            </span>
          </div>
        </Pad>
      </Card>

      <Card eyebrow="Execution log" title="Stage progress">
        <Pad>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border-strong)' }}>
            {stages.map((s, i) => <StageD key={s.id} stage={s} idx={i} />)}
          </div>

          {result && (
            <div style={{
              marginTop: 20, padding: '16px 18px',
              borderTop: `3px solid ${FOREST}`, background: '#f0fdf4',
              border: `1px solid ${FOREST}`,
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Stamp color={FOREST}>✓ Execution complete</Stamp>
                  <Stamp color={NAVY}>Recorded</Stamp>
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginTop: 8 }}>
                  Quality 87.3 · {fmt.dur(result.duration_ms)} · {fmt.num(result.trades_out)} processed
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                  {result.run_id} · {fmt.num(result.trades_in)} → {fmt.num(result.trades_out)} · {fmt.num(result.trades_in - result.trades_out)} rejected
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn>Download record</Btn>
                <Btn kind="primary">View report →</Btn>
              </div>
            </div>
          )}
        </Pad>
      </Card>
    </div>
  );
}

const StageD = ({ stage, idx }) => {
  const isOk = stage.status === 'ok';
  const isRun = stage.status === 'running';
  const tone = isOk ? FOREST : isRun ? NAVY : 'var(--muted)';
  return (
    <div style={{ background: 'var(--surface)', padding: 16, minHeight: 110 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 26, height: 26, border: `1px solid ${tone}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 11, color: tone, fontWeight: 600,
        }}>{idx + 1}</span>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 0.6, textTransform: 'uppercase' }}>STAGE {idx + 1}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{stage.name}</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: isRun ? 'italic' : 'normal' }}>
        {stage.status === 'idle' ? '— Awaiting execution' : stage.status === 'running' ? 'Processing…' : 'Complete'}
      </div>
      {stage.dur != null && (
        <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink)' }}>
          {fmt.dur(stage.dur)} · {fmt.num(stage.tin)} → {fmt.num(stage.tout)}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { ScreenOverviewD, ScreenRunD });
