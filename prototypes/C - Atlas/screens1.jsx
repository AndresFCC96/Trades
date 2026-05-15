// Screens 1: Overview, Run — ATLAS (data-viz first)
const { useState: uC1, useEffect: uC1E } = React;

// =============================================================
// OVERVIEW — asymmetric notebook layout, chart-first
// =============================================================
function ScreenOverviewC({ activeRun, setActive }) {
  const scores = MOCK.runs.slice(-30).map(r => r.quality_score);
  const completenessSeries = MOCK.runs.slice(-30).map(() => 92 + Math.random() * 7);
  const consistencySeries = MOCK.runs.slice(-30).map(() => 80 + Math.random() * 12);
  const ruleRejects = [...MOCK.rules].sort((a, b) => b.rejected - a.rejected).slice(0, 7);
  const totalRej = activeRun.trades_in - activeRun.trades_out;
  const recent = MOCK.runs.slice(0, 8);
  const xLabels = ['30 runs ago', '20', '10', 'latest'];

  return (
    <div data-screen-label="01 Overview">
      <PageHeader chapter="01 · Overview"
        title="A pipeline producing 9.4K trades per run with 87.3 quality."
        lede="Snapshot del último run y tendencias de los últimos 30. Los charts son el documento principal."
        meta={{ label: 'Active run', value: fmt.short(activeRun.run_id, 22), sub: fmt.dt(activeRun.started_at) }} />

      <div style={{ padding: '0 32px 28px' }}>
        {/* Editorial KPI strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
          borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--rule-strong)',
          padding: '24px 0',
        }}>
          <KpiCell label="Quality score" value={activeRun.quality_score.toFixed(1)}
            color={activeRun.quality_score >= 80 ? CHART.green : CHART.amber}
            sub="threshold ≥ 80 · trend ↗ +2.4" />
          <KpiCell label="Trades processed" value={fmt.num(activeRun.trades_out)}
            sub={`from ${fmt.num(activeRun.trades_in)} · ${fmt.pct((activeRun.trades_out / activeRun.trades_in) * 100)} ok`} />
          <KpiCell label="Rejected" value={fmt.num(totalRej)} color={CHART.red}
            sub={`${fmt.pct((totalRej / activeRun.trades_in) * 100)} of batch`} />
          <KpiCell label="Total notional" value={fmt.usd(activeRun.notional)}
            sub="14 asset classes · 7 venues · USD" last />
        </div>

        {/* Hero chart */}
        <Block style={{ marginTop: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 24, marginBottom: 16, alignItems: 'flex-end' }}>
            <div>
              <Eyebrow>Figure 1 · Quality components over time</Eyebrow>
              <Headline size="md" style={{ marginTop: 6 }}>Three of five components stay above 90; consistency drags.</Headline>
            </div>
            <FigCaption>
              Cada línea es un componente del quality score (escala 0–100). El total ponderado es el score global del último run.
            </FigCaption>
          </div>
          <div style={{ padding: '24px 60px 24px 0' }}>
            <LineMulti
              series={[
                { name: 'Completeness', color: CHART.green, data: completenessSeries },
                { name: 'Consistency', color: CHART.orange, data: consistencySeries },
                { name: 'Quality (total)', color: CHART.blue, data: scores },
              ]}
              w={900} h={300} xLabels={xLabels}
            />
          </div>
        </Block>

        <Divider style={{ margin: '40px 0' }} />

        {/* Asymmetric two-col */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 48 }}>
          <Block>
            <Eyebrow>Figure 2 · Rejections by rule</Eyebrow>
            <Headline size="md" style={{ marginTop: 6, marginBottom: 20 }}>
              RV-05 (notional coherence) is the dominant cause — 31 rejections this run.
            </Headline>
            <Bars data={ruleRejects.map((r, i) => ({ label: r.id, value: r.rejected }))}
              color={CHART.pink} valueFmt={v => v.toString()} />
            <FigCaption style={{ marginTop: 14 }}>
              Total rechazos: <strong style={{ color: 'var(--ink)' }}>{ruleRejects.reduce((a, b) => a + b.rejected, 0)}</strong> · ver Reports · Quality para análisis detallado.
            </FigCaption>
          </Block>

          <Block>
            <Eyebrow>Quality gauge</Eyebrow>
            <Headline size="md" style={{ marginTop: 6, marginBottom: 14 }}>
              Score global
            </Headline>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RingGauge value={activeRun.quality_score} size={220} label="Last run" />
            </div>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Completeness', 96.3, CHART.green, 0.25],
                ['Uniqueness', 99.1, CHART.teal, 0.15],
                ['Consistency', 88.4, CHART.blue, 0.20],
                ['Validity', 92.7, CHART.amber, 0.25],
                ['Outliers', 74.2, CHART.red, 0.15],
              ].map(([n, v, c, w]) => (
                <div key={n} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 40px 40px', gap: 8, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ fontFamily: 'var(--sans)' }}>{n}</span>
                  <div style={{ height: 4, background: 'var(--chip)' }}>
                    <div style={{ width: `${v}%`, height: '100%', background: c }} />
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 600, color: c }}>{v.toFixed(1)}</span>
                  <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--muted)' }}>w·{w}</span>
                </div>
              ))}
            </div>
          </Block>
        </div>

        <Divider style={{ margin: '40px 0' }} />

        {/* Recent runs table */}
        <Block>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <Eyebrow>Table 1 · Recent runs</Eyebrow>
              <Headline size="md" style={{ marginTop: 6 }}>Last 8 pipeline executions.</Headline>
            </div>
            <Btn onClick={() => setActive('history')}>View full history →</Btn>
          </div>
          <Tbl cols={[
            { label: 'Run ID', mono: true, render: r => fmt.short(r.run_id, 24) },
            { label: 'Started', tone: 'muted', mono: true, render: r => fmt.dt(r.started_at).slice(0, 19) },
            { label: 'Duration', align: 'right', mono: true, render: r => fmt.dur(r.duration_ms) },
            { label: 'Mode', render: r => <Tag color={r.mode === 'kafka' ? CHART.violet : 'var(--ink)'}>{r.mode}</Tag> },
            { label: 'In', align: 'right', mono: true, render: r => fmt.num(r.trades_in) },
            { label: 'Out', align: 'right', mono: true, render: r => fmt.num(r.trades_out) },
            { label: 'Rejected', align: 'right', mono: true, render: r => <span style={{ color: CHART.red }}>{fmt.num(r.trades_in - r.trades_out)}</span> },
            { label: 'Quality', align: 'right', render: r => (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 60, height: 3, background: 'var(--chip)' }}>
                  <div style={{ width: `${r.quality_score}%`, height: '100%', background: r.quality_score >= 80 ? CHART.green : CHART.amber }} />
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: r.quality_score >= 80 ? CHART.green : CHART.amber }}>{r.quality_score}</span>
              </div>
            )},
          ]} rows={recent} />
        </Block>
      </div>
    </div>
  );
}

const KpiCell = ({ label, value, sub, color, last }) => (
  <div style={{
    padding: '0 28px', borderLeft: '1px solid var(--rule-strong)',
    ...(last ? {} : {}),
  }}>
    <Eyebrow>{label}</Eyebrow>
    <div style={{
      fontFamily: 'var(--serif)', fontSize: 48, lineHeight: 1, marginTop: 12,
      color: color || 'var(--ink)', letterSpacing: '-0.04em', fontWeight: 500,
      fontVariantNumeric: 'tabular-nums',
    }}>{value}</div>
    {sub && <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>{sub}</div>}
  </div>
);

// =============================================================
// RUN PIPELINE
// =============================================================
function ScreenRunC({ activeRun, setActiveRun, addToast }) {
  const [tab, setTab] = uC1('generate');
  const [n, setN] = uC1(10000);
  const [seed, setSeed] = uC1(42);
  const [nullRate, setNullRate] = uC1(0.02);
  const [outlierRate, setOutlierRate] = uC1(0.01);
  const [running, setRunning] = uC1(false);
  const [stages, setStages] = uC1([
    { id: 'generate', name: 'Generate', status: 'idle' },
    { id: 'extract', name: 'Extract', status: 'idle' },
    { id: 'validate', name: 'Validate', status: 'idle' },
    { id: 'transform', name: 'Transform', status: 'idle' },
  ]);
  const [result, setResult] = uC1(null);

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
    addToast({ msg: `Run complete · score 87.3 · ${fmt.dur(newRun.duration_ms)}`, tone: 'ok' });
  };

  return (
    <div data-screen-label="02 Run Pipeline">
      <PageHeader chapter="02 · Run"
        title="Configure parameters and execute the pipeline."
        lede="Cuatro etapas: generación, extracción, validación, transformación. El resultado queda registrado en historial." />

      <div style={{ padding: '0 32px 28px' }}>
        <div style={{ borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--rule-strong)', padding: '20px 0', display: 'grid', gridTemplateColumns: '180px 1fr', gap: 32, marginBottom: 40 }}>
          <Eyebrow>Source</Eyebrow>
          <div style={{ display: 'flex', gap: 24 }}>
            {[['generate', 'Generate synthetic'], ['load', 'Load from source']].map(([id, l]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: '4px 0', background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--sans)', fontSize: 15, fontWeight: tab === id ? 600 : 500,
                color: tab === id ? 'var(--ink)' : 'var(--muted)',
                borderBottom: tab === id ? '2px solid var(--ink)' : '2px solid transparent',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {tab === 'generate' && (
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr', gap: 32, marginBottom: 40 }}>
            <Eyebrow>Parameters</Eyebrow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <Rng min={1000} max={1000000} step={1000} value={n} onChange={setN}
                label="N_TRADES" format={v => fmt.num(v)} hint="Rango 0 – 10,000,000" />
              <Inp label="SEED" type="number" value={seed} onChange={e => setSeed(+e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <Rng min={0} max={1} step={0.01} value={nullRate} onChange={setNullRate}
                label="NULL_RATE" format={v => `${(v * 100).toFixed(1)}%`} hint="Probabilidad campos null" />
              <Rng min={0} max={1} step={0.01} value={outlierRate} onChange={setOutlierRate}
                label="OUTLIER_RATE" format={v => `${(v * 100).toFixed(1)}%`} hint="Probabilidad outliers" />
            </div>
          </div>
        )}

        {tab === 'load' && (
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 32, marginBottom: 40 }}>
            <Eyebrow>Source type</Eyebrow>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[['CSV upload', 'archivo local'], ['HTTP API', 'endpoint REST'], ['Kafka topic', 'streaming']].map(([name, desc]) => (
                <div key={name} style={{
                  padding: 16, border: '1px solid var(--rule-strong)', cursor: 'pointer',
                }}>
                  <Headline size="sm">{name}</Headline>
                  <FigCaption style={{ marginTop: 4 }}>{desc}</FigCaption>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: CHART.blue, marginTop: 12 }}>Configure →</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Divider style={{ margin: '24px 0' }} />

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 40 }}>
          <Btn kind="primary" size="lg" onClick={runPipeline} disabled={running}>
            {running ? '◐ Running…' : '▷ Execute pipeline'}
          </Btn>
          <FigCaption>Shortcut <kbd style={kbdStyleC}>⌘</kbd> <kbd style={kbdStyleC}>⇧</kbd> <kbd style={kbdStyleC}>R</kbd></FigCaption>
        </div>

        <Eyebrow>Stage execution</Eyebrow>
        <Headline size="md" style={{ marginTop: 6, marginBottom: 24 }}>Pipeline stages</Headline>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--rule-strong)' }}>
          {stages.map((s, i) => <StageC key={s.id} stage={s} idx={i} />)}
        </div>

        {result && (
          <div style={{
            marginTop: 32, padding: '24px 28px',
            borderTop: `3px solid ${CHART.green}`,
            background: 'rgba(21,128,61,0.08)',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center',
          }}>
            <div>
              <Eyebrow style={{ color: CHART.green }}>RUN COMPLETED</Eyebrow>
              <Headline size="md" style={{ marginTop: 8 }}>
                Quality 87.3 · {fmt.dur(result.duration_ms)} · {fmt.num(result.trades_out)} trades processed
              </Headline>
              <FigCaption style={{ marginTop: 8, fontFamily: 'var(--mono)' }}>
                {result.run_id} · {fmt.num(result.trades_in)} → {fmt.num(result.trades_out)} · {fmt.num(result.trades_in - result.trades_out)} rejected
              </FigCaption>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn>Download</Btn>
              <Btn kind="primary">View report →</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const kbdStyleC = {
  display: 'inline-block', padding: '1px 5px', fontSize: 10, fontFamily: 'var(--mono)',
  background: 'var(--chip)', border: '1px solid var(--rule-strong)', borderRadius: 2, color: 'var(--ink)',
};

const StageC = ({ stage, idx }) => {
  const isOk = stage.status === 'ok';
  const isRun = stage.status === 'running';
  const c = isOk ? CHART.green : isRun ? CHART.blue : 'var(--muted)';
  return (
    <div style={{ background: 'var(--paper)', padding: 20, minHeight: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 1,
        }}>STAGE {String(idx + 1).padStart(2, '0')}</span>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: c,
          animation: isRun ? 'blink 0.9s infinite' : 'none',
        }} />
      </div>
      <Headline size="md" style={{ color: c }}>{stage.name}</Headline>
      <FigCaption style={{ marginTop: 8 }}>
        {stage.status === 'idle' ? '— Awaiting execution' : stage.status === 'running' ? 'Processing…' : 'Complete'}
      </FigCaption>
      {stage.dur != null && (
        <div style={{ marginTop: 12, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink)' }}>
          {fmt.dur(stage.dur)} · {fmt.num(stage.tin)} → {fmt.num(stage.tout)}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { ScreenOverviewC, ScreenRunC });
