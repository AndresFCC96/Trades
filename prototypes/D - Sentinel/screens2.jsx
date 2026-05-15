// Screens 2: Sources, Business, Quality — SENTINEL
const { useState: uD2, useEffect: uD2E } = React;

// =============================================================
// DATA SOURCES (Kafka hero)
// =============================================================
function ScreenSourcesD({ addToast }) {
  const [tab, setTab] = uD2('kafka');
  return (
    <div data-screen-label="03 Data Sources" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card eyebrow="Source configuration" title="Data Sources" headerAccent>
        <div style={{ display: 'flex', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
          {[
            ['file', '◰ File upload'],
            ['http', '◱ HTTP endpoint'],
            ['kafka', '◲ Kafka streaming'],
            ['saved', '◳ Saved (3)'],
          ].map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '12px 18px', background: tab === id ? 'var(--surface)' : 'transparent',
              border: 'none', borderRight: '1px solid var(--border)',
              cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13,
              fontWeight: tab === id ? 600 : 500,
              color: tab === id ? NAVY : 'var(--muted)',
              borderBottom: tab === id ? '3px solid ' + GOLD : '3px solid transparent',
              marginBottom: -1,
            }}>{l}</button>
          ))}
        </div>
        <Pad>
          {tab === 'kafka' && <KafkaD addToast={addToast} />}
          {tab === 'file' && <FileD />}
          {tab === 'http' && <HttpD addToast={addToast} />}
          {tab === 'saved' && <SavedD />}
        </Pad>
      </Card>
    </div>
  );
}

function KafkaD({ addToast }) {
  const [streaming, setStreaming] = uD2(true);
  const [msgPerSec, setMsgPerSec] = uD2(247);
  const [lag, setLag] = uD2(1284);
  const [total, setTotal] = uD2(82441);
  const [errors] = uD2(3);
  const [history, setHistory] = uD2(Array.from({ length: 60 }, () => 180 + Math.random() * 140));
  const [feed, setFeed] = uD2(initialFeedD());
  const [batchSize, setBatchSize] = uD2(1000);
  const [maxLat, setMaxLat] = uD2(5);
  const [onError, setOnError] = uD2('dlq');

  function initialFeedD() {
    return Array.from({ length: 14 }, (_, i) => makeTradeD(i, false));
  }
  function makeTradeD(i, isNew) {
    const sides = ['BUY', 'SELL']; const ccy = ['USD', 'EUR', 'GBP', 'JPY'];
    const inst = ['AAPL', 'MSFT', 'TSLA', 'EURUSD', 'BTCUSD', 'GBPJPY', 'NVDA', 'SPY'];
    return {
      ts: new Date(Date.now() - i * 800).toISOString().slice(11, 23),
      id: `t_${Math.random().toString(16).slice(2, 10)}`,
      side: sides[Math.floor(Math.random() * 2)],
      instrument: inst[Math.floor(Math.random() * inst.length)],
      qty: 100 + Math.floor(Math.random() * 4000),
      price: (50 + Math.random() * 250).toFixed(2),
      ccy: ccy[Math.floor(Math.random() * ccy.length)],
      isNew,
    };
  }

  uD2E(() => {
    if (!streaming) return;
    const id = setInterval(() => {
      const rate = 200 + Math.random() * 100;
      setMsgPerSec(Math.round(rate));
      setHistory(h => [...h.slice(1), rate]);
      setTotal(t => t + Math.round(rate / 4));
      setLag(l => Math.max(0, l + (Math.random() - 0.55) * 200));
      setFeed(f => {
        const adds = Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => makeTradeD(0, true));
        return [...adds, ...f.slice(0, 30).map(t => ({ ...t, isNew: false }))];
      });
    }, 1100);
    return () => clearInterval(id);
  }, [streaming]);

  return (
    <div>
      {/* Hero Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.6fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card eyebrow="Connection" title="Cluster">
          <Pad>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Bootstrap servers" value="kafka-prod-01.tradesys:9092" required mono />
              <Field label="Topic" value="trades.raw.v1" required mono />
              <Field label="Consumer group" value="pipeline-prod-consumer" required mono />
              <Field label="Security protocol" value="SASL_SSL" required suffix="▾" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Field label="Username" value="pipeline-svc" required mono />
                <Field label="Password" value="••••••" type="password" required />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <Btn size="sm">Test connection</Btn>
                <Stamp color={FOREST}>● Connected · 8 partitions</Stamp>
              </div>
            </div>
          </Pad>
        </Card>

        <Card eyebrow="Stream control" title="Real-time consumer" headerAccent
          right={<Stamp color={streaming ? '#fff' : GOLD_2} style={{ background: 'transparent', borderColor: streaming ? '#22c55e' : GOLD_2, color: streaming ? '#22c55e' : GOLD_2 }}>{streaming ? '● Live' : '○ Paused'}</Stamp>}>
          <Pad>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, marginBottom: 14 }}>
              <button onClick={() => setStreaming(!streaming)} style={{
                width: 100, height: 100, border: `2px solid ${streaming ? FOREST : 'var(--border-strong)'}`,
                background: streaming ? '#f0fdf4' : 'var(--surface-2)',
                cursor: 'pointer', color: streaming ? FOREST : 'var(--muted)',
                fontFamily: 'var(--serif)', fontSize: 22,
                animation: streaming ? 'pulseD 2.2s infinite' : 'none',
              }}>{streaming ? '▮▮' : '▶'}<div style={{ fontSize: 9, marginTop: 2, fontFamily: 'var(--mono)', letterSpacing: 1 }}>{streaming ? 'LIVE' : 'PAUSED'}</div></button>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <MetricD label="Messages/sec" value={msgPerSec.toString()} color={FOREST} />
                <MetricD label="Consumer lag" value={fmt.num(Math.round(lag))} color={lag > 2000 ? AMBER : FOREST} />
                <MetricD label="Total consumed" value={fmt.num(total)} color={NAVY} />
                <MetricD label="Errors" value={errors.toString()} color={errors > 0 ? BRICK : FOREST} />
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Throughput · last 60s</span>
                <span style={{ fontSize: 11, color: 'var(--ink)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{Math.round(history[history.length - 1])} msg/s</span>
              </div>
              <AreaChart data={history} color={NAVY} yMax={400} h={70} />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
              <Btn size="sm" onClick={() => setStreaming(false)} disabled={!streaming}>Pause</Btn>
              <Btn size="sm" onClick={() => setStreaming(true)} disabled={streaming}>Resume</Btn>
              <Btn kind="danger" size="sm" onClick={() => { setStreaming(false); addToast({ msg: 'Stream stopped by operator', tone: 'warn' }); }}>Stop</Btn>
            </div>
          </Pad>
        </Card>

        <Card eyebrow="Buffer policy" title="Batching">
          <Pad>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Slider min={100} max={10000} step={100} value={batchSize} onChange={setBatchSize}
                label="Batch size" format={v => `${fmt.num(v)} trades`} hint="Records buffered before processing" />
              <Slider min={1} max={30} step={1} value={maxLat} onChange={setMaxLat}
                label="Max latency" format={v => `${v}s`} hint="Maximum flush latency" />
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 600, marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' }}>On error</div>
                {[['skip', 'Skip message', 'Continue to next'],
                  ['dlq', 'Dead-letter queue', 'Route to trades.dlq.v1'],
                  ['halt', 'Halt stream', 'Stop consumer immediately']].map(([id, l, sub]) => (
                  <label key={id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                    border: `1px solid ${onError === id ? NAVY : 'var(--border)'}`,
                    background: onError === id ? '#eef3f9' : 'var(--surface)',
                    cursor: 'pointer', marginBottom: 4,
                  }}>
                    <input type="radio" checked={onError === id} onChange={() => setOnError(id)} style={{ accentColor: 'var(--ink)' }} />
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>{l}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </Pad>
        </Card>
      </div>

      <Card eyebrow="Live audit feed" title={`Incoming trades · ${feed.length} buffered`}
        right={<Stamp color={FOREST}>● Live · trades.raw.v1</Stamp>}>
        <div style={{ maxHeight: 320, overflow: 'auto' }}>
          <Tbl cols={[
            { label: 'Arrived', mono: true, tone: 'muted', render: r => r.ts.slice(0, 12) },
            { label: 'Trade ID', mono: true, render: r => r.id },
            { label: 'Side', render: r => <Stamp color={r.side === 'BUY' ? FOREST : BRICK}>{r.side}</Stamp> },
            { label: 'Instrument', mono: true, render: r => r.instrument },
            { label: 'Qty', align: 'right', mono: true, render: r => fmt.num(r.qty) },
            { label: 'Price', align: 'right', mono: true, render: r => r.price },
            { label: 'CCY', mono: true, render: r => r.ccy },
            { label: 'Status', render: () => <Stamp color={FOREST}>OK</Stamp> },
          ]} rows={feed.map(r => ({ ...r, _new: r.isNew }))}
          />
        </div>
      </Card>
    </div>
  );
}

const MetricD = ({ label, value, color }) => (
  <div style={{ background: 'var(--surface-2)', padding: '8px 10px', border: '1px solid var(--border)', borderLeft: `3px solid ${color}` }}>
    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{value}</div>
  </div>
);

function FileD() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
      <div>
        <div style={{
          border: '2px dashed var(--border-strong)', padding: '40px 20px',
          textAlign: 'center', background: 'var(--surface-2)',
        }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 38, color: 'var(--ink)' }}>◰</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginTop: 10 }}>Drop CSV / XLSX / Parquet</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Max 500 MB · TradeSchema (13 columns)</div>
          <div style={{ marginTop: 14 }}><Btn kind="primary">Browse files</Btn></div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Tbl cols={[
            { label: 'File', render: r => r.name },
            { label: 'Size', mono: true, render: r => r.size },
            { label: 'Rows', mono: true, align: 'right', render: r => r.rows },
            { label: 'Status', render: r => <Stamp color={r.st === 'ok' ? FOREST : AMBER}>{r.st === 'ok' ? 'Validated' : 'Mapping needed'}</Stamp> },
          ]} rows={[
            { name: 'trades_2026-05-14.csv', size: '12.4 MB', rows: '9,847', st: 'ok' },
            { name: 'trades_eod_05-13.parquet', size: '4.1 MB', rows: '11,200', st: 'ok' },
            { name: 'fx_intraday.xlsx', size: '880 KB', rows: '432', st: 'warn' },
          ]} />
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>Schema validation · trades_2026-05-14.csv</div>
        <Tbl cols={[
          { label: 'Column', mono: true, render: r => r.col },
          { label: 'Type', mono: true, tone: 'muted', render: r => r.type },
          { label: 'Result', render: r => <Stamp color={r.tone === FOREST ? FOREST : r.tone === AMBER ? AMBER : BRICK}>{r.msg}</Stamp> },
        ]} rows={[
          { col: 'trade_id', type: 'string', msg: 'OK', tone: FOREST },
          { col: 'timestamp', type: 'datetime', msg: 'OK', tone: FOREST },
          { col: 'side', type: 'string', msg: 'OK', tone: FOREST },
          { col: 'asset_class', type: 'string', msg: 'OK', tone: FOREST },
          { col: 'instrument', type: 'string', msg: 'OK', tone: FOREST },
          { col: 'currency', type: 'ccy', msg: 'OK', tone: FOREST },
          { col: 'quantity', type: 'float', msg: 'OK', tone: FOREST },
          { col: 'price', type: 'float', msg: 'OK', tone: FOREST },
          { col: 'notional', type: 'float', msg: 'OK', tone: FOREST },
          { col: 'trader_id', type: 'string', msg: 'Map → trader_user', tone: AMBER },
          { col: 'counterparty_id', type: 'string', msg: 'Missing', tone: BRICK },
          { col: 'venue', type: 'string', msg: 'OK', tone: FOREST },
        ]} />
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <Btn>Mapping wizard</Btn>
          <Btn kind="primary">Approve & use →</Btn>
        </div>
      </div>
    </div>
  );
}

function HttpD({ addToast }) {
  const [tested, setTested] = uD2(false);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Endpoint URL" value="https://api.example.com/v1/trades" required />
        <Field label="Authentication" value="Bearer token" required suffix="▾" />
        <Field label="Token" value="••••••••••••" type="password" required />
        <Field label="Schedule" value="On-demand" suffix="▾" />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={() => { setTested(true); addToast({ msg: 'Connection test passed · 142ms', tone: 'ok' }); }}>Test connection</Btn>
          <Btn kind="primary">Save & use</Btn>
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
          Response · {tested ? <Stamp color={FOREST} style={{ marginLeft: 8 }}>HTTP 200 · 142ms</Stamp> : <span style={{ color: 'var(--muted)' }}>— Not tested</span>}
        </div>
        <pre style={{
          fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--surface)',
          border: '1px solid var(--border-strong)', padding: 14, margin: 0, lineHeight: 1.7,
          color: 'var(--ink)', minHeight: 360, overflow: 'auto',
        }}>{`{
  "trades": [
    {
      "trade_id":        "t_30d4f1a9",
      "timestamp":       "2026-05-14T14:23:17.482Z",
      "side":            "BUY",
      "asset_class":     "EQUITY",
      "instrument":      "AAPL",
      "currency":        "USD",
      "quantity":        1200,
      "price":           187.42,
      "notional":        224904.00,
      "trader_id":       "tr_88421",
      "counterparty_id": "cp_a3f2c19b",
      "venue":           "NASDAQ"
    }
    /* 486 more records ... */
  ],
  "next_page": "/v1/trades?cursor=eyJpZCI6NDg3fQ"
}`}</pre>
      </div>
    </div>
  );
}

function SavedD() {
  return (
    <Tbl cols={[
      { label: 'Name', render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
      { label: 'Host', mono: true, render: r => r.host },
      { label: 'Protocol', render: r => <Stamp>{r.proto}</Stamp> },
      { label: 'Topic', mono: true, render: r => r.topic },
      { label: 'Last used', tone: 'muted', render: r => r.last },
      { label: 'Status', render: r => <Stamp color={r.status === 'ok' ? FOREST : AMBER}>{r.status === 'ok' ? 'Online' : 'Degraded'}</Stamp> },
      { label: '', align: 'right', render: () => <Btn size="sm">Use →</Btn> },
    ]} rows={[
      { name: 'prod-us-east', host: 'kafka-prod-01:9092', proto: 'SASL_SSL', topic: 'trades.raw.v1', last: '2m ago', status: 'ok' },
      { name: 'prod-eu-west', host: 'kafka-eu.tradesys:9092', proto: 'SASL_SSL', topic: 'trades.eu.raw', last: '8m ago', status: 'ok' },
      { name: 'staging', host: 'kafka-stage:9092', proto: 'SSL', topic: 'trades.stage', last: '1d ago', status: 'warn' },
    ]} />
  );
}

// =============================================================
// BUSINESS REPORT
// =============================================================
function ScreenBusinessD({ activeRun }) {
  const ac = MOCK.assetClasses;
  const cp = MOCK.counterparties;
  const venues = MOCK.venues;
  const totalNotional = ac.reduce((a, b) => a + b.notional, 0);

  return (
    <div data-screen-label="04 Business Report" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card eyebrow="Business report · Form B-04" title="Trade activity summary" headerAccent
        right={<div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" style={{ background: 'transparent', color: '#fff', borderColor: GOLD }}>JSON</Btn>
          <Btn size="sm" style={{ background: 'transparent', color: '#fff', borderColor: GOLD }}>CSV</Btn>
          <Btn kind="primary" size="sm">PDF report</Btn>
        </div>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)' }}>
          <RecField label="Run reference" value={fmt.short(activeRun.run_id, 22)} mono />
          <RecField label="Trades processed" value={fmt.num(activeRun.trades_out)} />
          <RecField label="Total notional" value={fmt.usd(totalNotional)} />
          <RecField label="Coverage" value="5 asset classes · 7 venues" />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
        <Card eyebrow="Section 1" title="By asset class">
          <Tbl cols={[
            { label: 'Class', render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
            { label: 'Total notional', align: 'right', mono: true, render: r => fmt.usd(r.notional) },
            { label: 'Avg price', align: 'right', mono: true, render: r => r.avg_price.toLocaleString() },
            { label: 'Trade count', align: 'right', mono: true, render: r => fmt.num(r.count) },
            { label: 'Buy / Sell', render: r => (
              <div style={{ display: 'flex', height: 10, width: 110, border: '1px solid var(--border)' }}>
                <div style={{ width: `${r.buy}%`, background: FOREST }} />
                <div style={{ width: `${100 - r.buy}%`, background: BRICK }} />
              </div>
            )},
            { label: 'Share', align: 'right', mono: true, render: r => `${((r.notional / totalNotional) * 100).toFixed(1)}%` },
          ]} rows={ac} />
        </Card>
        <Card eyebrow="Section 2" title="Notional distribution">
          <Pad>
            <DonutD data={ac.map(a => ({ label: a.name, value: a.notional }))} />
          </Pad>
        </Card>
      </div>

      <Card eyebrow="Section 3" title="Risk distribution">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border)' }}>
          <RiskBoxD tone={BRICK} label="High risk" count={234} pct={2.4} desc="Notional > $5M · trader limit warning" />
          <RiskBoxD tone={AMBER} label="Medium risk" count={1284} pct={13.0} desc="Price band warning" />
          <RiskBoxD tone={FOREST} label="Low risk" count={8329} pct={84.6} desc="Within all thresholds" />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        <Card eyebrow="Section 4" title="Top counterparties" subtitle="Pseudonymized · ranked by volume">
          <Tbl cols={[
            { label: '#', align: 'right', mono: true, render: (r) => r._rank },
            { label: 'Counterparty', mono: true, render: r => r.id },
            { label: 'Alias', tone: 'muted', render: r => r.name },
            { label: 'Volume', align: 'right', mono: true, render: r => fmt.usd(r.volume) },
            { label: 'Share', render: r => (
              <div style={{ width: 100, height: 6, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ width: `${(r.volume / cp[0].volume) * 100}%`, height: '100%', background: GOLD }} />
              </div>
            )},
          ]} rows={cp.slice(0, 7).map((c, i) => ({ ...c, _rank: i + 1 }))} />
        </Card>
        <Card eyebrow="Section 5" title="Venue concentration">
          <Pad>
            <TreemapD data={venues} />
          </Pad>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card eyebrow="Section 6" title="Trading activity by day">
          <Pad><DualLineD data={MOCK.byDay} /></Pad>
        </Card>
        <Card eyebrow="Section 7" title="Trading activity by hour">
          <Pad><HourHistD data={MOCK.byHour} /></Pad>
        </Card>
      </div>

      <Card eyebrow="Sign-off" title="Compliance attestation">
        <Pad>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 24, alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
              I attest that this report has been reviewed and that the data presented accurately reflects the trades processed in the referenced pipeline run.
            </div>
            <div style={{ borderTop: '1px solid ' + NAVY, paddingTop: 6, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', width: 220 }}>
              <span style={{ color: 'var(--ink)', fontFamily: 'var(--sans)', fontWeight: 600 }}>A. Morales</span><br />
              Compliance Analyst<br />
              2026-05-14T21:15:00Z
            </div>
            <Btn kind="primary">Sign & lock</Btn>
          </div>
        </Pad>
      </Card>
    </div>
  );
}

const DonutD = ({ data }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  let acc = 0;
  const r = 60, R = 90;
  const colors = [NAVY, NAVY_2, GOLD, AMBER, BRICK];
  const segs = data.map((d, i) => {
    const a0 = (acc / total) * 2 * Math.PI; acc += d.value;
    const a1 = (acc / total) * 2 * Math.PI;
    const x0 = 100 + R * Math.sin(a0), y0 = 100 - R * Math.cos(a0);
    const x1 = 100 + R * Math.sin(a1), y1 = 100 - R * Math.cos(a1);
    const x2 = 100 + r * Math.sin(a1), y2 = 100 - r * Math.cos(a1);
    const x3 = 100 + r * Math.sin(a0), y3 = 100 - r * Math.cos(a0);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`;
    return { p, color: colors[i % colors.length], d };
  });
  return (
    <div>
      <svg width="100%" height="200" viewBox="0 0 200 200">
        {segs.map((s, i) => <path key={i} d={s.p} fill={s.color} stroke="#fff" strokeWidth="1" />)}
        <text x="100" y="98" textAnchor="middle" style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 600, fill: NAVY }}>
          {fmt.usd(total)}
        </text>
        <text x="100" y="115" textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: 'var(--muted)', letterSpacing: 0.6, textTransform: 'uppercase' }}>Total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '14px 1fr 60px', gap: 8, alignItems: 'center', fontSize: 11 }}>
            <span style={{ width: 12, height: 12, background: colors[i % colors.length] }} />
            <span>{d.label}</span>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', textAlign: 'right' }}>{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const RiskBoxD = ({ tone, label, count, pct, desc }) => (
  <div style={{ background: 'var(--surface)', padding: 18, borderTop: `4px solid ${tone}` }}>
    <Stamp color={tone}>{label}</Stamp>
    <div style={{ fontFamily: 'var(--serif)', fontSize: 36, marginTop: 12, color: tone, lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt.num(count)}</div>
    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)', marginTop: 4 }}>{pct.toFixed(1)}% of batch</div>
    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>{desc}</div>
  </div>
);

const TreemapD = ({ data }) => {
  const sorted = [...data].sort((a, b) => b.share - a.share);
  const W = 320, H = 220, colors = [NAVY, NAVY_2, GOLD, AMBER, BRICK, '#5f7a99', '#8a6e3c'];
  const cells = [];
  function layout(items, x, y, w, h) {
    if (items.length === 1) { cells.push({ x, y, w, h, d: items[0] }); return; }
    const half = items.reduce((a, b) => a + b.share, 0) / 2;
    let s = 0, idx = 0;
    for (let i = 0; i < items.length; i++) { s += items[i].share; if (s >= half) { idx = i + 1; break; } }
    const left = items.slice(0, idx), right = items.slice(idx);
    const ratio = left.reduce((a, b) => a + b.share, 0) / items.reduce((a, b) => a + b.share, 0);
    if (w > h) { layout(left, x, y, w * ratio, h); layout(right, x + w * ratio, y, w * (1 - ratio), h); }
    else { layout(left, x, y, w, h * ratio); layout(right, x, y + h * ratio, w, h * (1 - ratio)); }
  }
  layout(sorted, 0, 0, W, H);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {cells.map((c, i) => (
        <g key={i}>
          <rect x={c.x + 1} y={c.y + 1} width={c.w - 2} height={c.h - 2} fill={colors[i % colors.length]} />
          <text x={c.x + 8} y={c.y + 18} style={{ fontFamily: 'var(--sans)', fontSize: 12, fill: '#fff', fontWeight: 600 }}>{c.d.name}</text>
          {c.h > 36 && <text x={c.x + 8} y={c.y + 32} style={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'rgba(255,255,255,0.85)' }}>{c.d.share}%</text>}
        </g>
      ))}
    </svg>
  );
};

const DualLineD = ({ data }) => {
  const w = 400, h = 200, maxC = Math.max(...data.map(d => d.count)), maxN = Math.max(...data.map(d => d.notional));
  const ptsC = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - 24 - (d.count / maxC) * (h - 40)}`).join(' ');
  const ptsN = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - 24 - (d.notional / maxN) * (h - 40)}`).join(' ');
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {[0.25, 0.5, 0.75, 1].map((g, i) => (
          <line key={i} x1="0" y1={h - 24 - g * (h - 40)} x2={w} y2={h - 24 - g * (h - 40)} stroke="var(--border)" strokeWidth="0.5" />
        ))}
        <polyline points={ptsC} fill="none" stroke={NAVY} strokeWidth="1.8" />
        <polyline points={ptsN} fill="none" stroke={GOLD} strokeWidth="1.8" strokeDasharray="4,3" />
        {data.map((d, i) => i % 2 === 0 && (
          <text key={i} x={(i / (data.length - 1)) * w} y={h - 4} textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: 'var(--muted)' }}>{d.day.slice(5)}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <Stamp color={NAVY}>Trade count</Stamp>
        <Stamp color={GOLD}>Notional</Stamp>
      </div>
    </div>
  );
};

const HourHistD = ({ data }) => {
  const w = 400, h = 200, bw = w / 24, max = Math.max(...data.map(d => d.count));
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {data.map((d, i) => {
        const bh = (d.count / max) * (h - 30);
        return (
          <g key={i}>
            <rect x={i * bw + 1} y={h - 20 - bh} width={bw - 2} height={bh} fill={NAVY} opacity={0.45 + (d.count / max) * 0.5} />
            {i % 3 === 0 && <text x={i * bw + bw / 2} y={h - 5} textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: 'var(--muted)' }}>{i.toString().padStart(2, '0')}</text>}
          </g>
        );
      })}
    </svg>
  );
};

// =============================================================
// QUALITY REPORT
// =============================================================
function ScreenQualityD({ activeRun }) {
  const score = activeRun.quality_score;
  return (
    <div data-screen-label="05 Quality Report" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card eyebrow="Quality report · Form Q-05" title="Data quality assessment" headerAccent
        right={<div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" style={{ background: 'transparent', color: '#fff', borderColor: GOLD }}>JSON</Btn>
          <Btn size="sm" style={{ background: 'transparent', color: '#fff', borderColor: GOLD }}>CSV</Btn>
        </div>}>
        <Pad>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Gauge value={score} size={170} label="Global score" />
              <Stamp color={score >= 80 ? FOREST : AMBER}>{score >= 80 ? 'Pass' : 'Review'}</Stamp>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 14 }}>Weighted components</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Completeness', 96.3, FOREST, 0.25],
                  ['Uniqueness', 99.1, NAVY, 0.15],
                  ['Consistency', 88.4, NAVY_2, 0.20],
                  ['Validity', 92.7, AMBER, 0.25],
                  ['Outliers', 74.2, BRICK, 0.15],
                ].map(([n, v, c, w]) => (
                  <div key={n} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 60px 50px', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{n}</span>
                    <div style={{ height: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div style={{ width: `${v}%`, height: '100%', background: c }} />
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 600, color: c }}>{v.toFixed(1)}</span>
                    <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--muted)', fontSize: 11 }}>w·{w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Pad>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12 }}>
        <Card eyebrow="Section 1" title="Completeness · Nulls by column">
          <Tbl cols={[
            { label: 'Column', mono: true, render: r => r.col },
            { label: 'Nulls', align: 'right', mono: true, render: r => fmt.num(r.nulls) },
            { label: 'Pct', align: 'right', render: r => <span style={{ fontFamily: 'var(--mono)', color: r.pct > 5 ? BRICK : r.pct > 1 ? AMBER : FOREST, fontWeight: 600 }}>{r.pct.toFixed(2)}%</span> },
            { label: '', render: r => (
              <div style={{ width: 60, height: 4, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ width: `${Math.min(r.pct * 4, 100)}%`, height: '100%', background: r.pct > 5 ? BRICK : r.pct > 1 ? AMBER : FOREST }} />
              </div>
            )},
          ]} rows={[
            { col: 'trade_id', nulls: 0, pct: 0 }, { col: 'timestamp', nulls: 12, pct: 0.12 },
            { col: 'side', nulls: 4, pct: 0.04 }, { col: 'asset_class', nulls: 23, pct: 0.23 },
            { col: 'currency', nulls: 91, pct: 0.91 }, { col: 'price', nulls: 14, pct: 0.14 },
            { col: 'notional', nulls: 142, pct: 1.42 }, { col: 'trader_id', nulls: 487, pct: 4.87 },
            { col: 'counterparty_id', nulls: 612, pct: 6.12 }, { col: 'venue', nulls: 28, pct: 0.28 },
          ]} />
        </Card>
        <Card eyebrow="Section 2" title="Uniqueness">
          <Pad>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 44, fontWeight: 600, color: AMBER, lineHeight: 1 }}>127</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Duplicate trade_ids</div>
            <div style={{ marginTop: 16 }}>
              <RowD k="Unique ratio" v="98.71%" />
              <RowD k="Total rows" v={fmt.num(activeRun.trades_in)} />
              <RowD k="Strategy" v="keep_first" />
            </div>
          </Pad>
        </Card>
        <Card eyebrow="Section 3" title="Consistency · |notional − price·qty|">
          <Pad>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Gauge value={88.4} size={110} label="" />
              <div style={{ flex: 1 }}>
                <RowD k="Within tol." v="8,704" />
                <RowD k="Outside" v="1,143" />
                <RowD k="Tolerance" v="±0.01" />
              </div>
            </div>
          </Pad>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card eyebrow="Section 4" title="Validity · Domain checks">
          <Pad>
            <Bars data={[
              { label: 'side', value: 99.97 }, { label: 'currency', value: 98.42 },
              { label: 'asset_class', value: 97.81 }, { label: 'status', value: 99.12 },
            ]} color={NAVY} valueFmt={v => `${v.toFixed(2)}%`} />
          </Pad>
        </Card>
        <Card eyebrow="Section 5" title="Outliers detected"
          right={<Btn size="sm">View all →</Btn>}>
          <Pad>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 18, alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 44, fontWeight: 600, color: BRICK, lineHeight: 1 }}>384</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Total outliers</div>
              </div>
              <div>
                <RowD k="Price IQR (Z>3)" v="247" />
                <RowD k="Qty extreme" v="89" />
                <RowD k="Notional anomaly" v="48" />
                <RowD k="Method" v="IQR + Z-score" />
              </div>
            </div>
          </Pad>
        </Card>
      </div>
    </div>
  );
}

const RowD = ({ k, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
    <span style={{ color: 'var(--muted)' }}>{k}</span>
    <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)', fontWeight: 600 }}>{v}</span>
  </div>
);

Object.assign(window, { ScreenSourcesD, ScreenBusinessD, ScreenQualityD });
