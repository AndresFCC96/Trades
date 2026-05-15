// Screens 2: Sources, Business, Quality — ATLAS
const { useState: uC2, useEffect: uC2E } = React;

// =============================================================
// DATA SOURCES (Kafka hero)
// =============================================================
function ScreenSourcesC({ addToast }) {
  const [tab, setTab] = uC2('kafka');
  return (
    <div data-screen-label="03 Data Sources">
      <PageHeader chapter="03 · Data Sources"
        title="Three ways to bring trades into the pipeline."
        lede="Carga desde archivos, consume desde un endpoint HTTP, o subscríbete a un topic de Kafka." />

      <div style={{ padding: '0 32px 28px' }}>
        <div style={{ borderTop: '1px solid var(--ink)', display: 'flex', gap: 0, marginBottom: 32 }}>
          {[['file', 'File upload'], ['http', 'HTTP endpoint'], ['kafka', 'Kafka streaming'], ['saved', 'Saved (3)']].map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '14px 24px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontSize: 14, fontWeight: tab === id ? 600 : 500,
              color: tab === id ? 'var(--ink)' : 'var(--muted)',
              borderBottom: tab === id ? '3px solid var(--ink)' : '3px solid transparent',
              marginBottom: -1, marginTop: -1,
            }}>{l}</button>
          ))}
        </div>

        {tab === 'kafka' && <KafkaC addToast={addToast} />}
        {tab === 'file' && <FileC />}
        {tab === 'http' && <HttpC addToast={addToast} />}
        {tab === 'saved' && <SavedC />}
      </div>
    </div>
  );
}

function KafkaC({ addToast }) {
  const [streaming, setStreaming] = uC2(true);
  const [msgPerSec, setMsgPerSec] = uC2(247);
  const [lag, setLag] = uC2(1284);
  const [total, setTotal] = uC2(82441);
  const [errors] = uC2(3);
  const [history, setHistory] = uC2(Array.from({ length: 60 }, () => 180 + Math.random() * 140));
  const [feed, setFeed] = uC2(initialFeedC());
  const [batchSize, setBatchSize] = uC2(1000);
  const [maxLat, setMaxLat] = uC2(5);
  const [onError, setOnError] = uC2('dlq');

  function initialFeedC() {
    return Array.from({ length: 12 }, (_, i) => makeTradeC(i, false));
  }
  function makeTradeC(i, isNew) {
    const sides = ['BUY', 'SELL']; const ccy = ['USD', 'EUR', 'GBP', 'JPY'];
    const inst = ['AAPL', 'MSFT', 'TSLA', 'EURUSD', 'BTCUSD', 'GBPJPY', 'NVDA'];
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

  uC2E(() => {
    if (!streaming) return;
    const id = setInterval(() => {
      const rate = 200 + Math.random() * 100;
      setMsgPerSec(Math.round(rate));
      setHistory(h => [...h.slice(1), rate]);
      setTotal(t => t + Math.round(rate / 4));
      setLag(l => Math.max(0, l + (Math.random() - 0.55) * 200));
      setFeed(f => {
        const adds = Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => makeTradeC(0, true));
        return [...adds, ...f.slice(0, 28).map(t => ({ ...t, isNew: false }))];
      });
    }, 1100);
    return () => clearInterval(id);
  }, [streaming]);

  return (
    <div>
      {/* Hero Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 48, alignItems: 'center' }}>
        <div>
          <Eyebrow>Figure 1 · Live stream throughput</Eyebrow>
          <Headline size="lg" style={{ marginTop: 8, marginBottom: 20 }}>
            {Math.round(history[history.length - 1])} <span style={{ fontFamily: 'var(--sans)', fontSize: 18, color: 'var(--muted)', fontWeight: 400 }}>msg/s</span>
          </Headline>
          <AreaStream data={history} color={CHART.green} w={500} h={140} />
          <FigCaption style={{ marginTop: 8 }}>
            Throughput de los últimos 60 segundos · topic <span style={{ fontFamily: 'var(--mono)' }}>trades.raw.v1</span>
          </FigCaption>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button onClick={() => setStreaming(!streaming)} style={{
              width: 90, height: 90,
              background: streaming ? CHART.green : 'var(--chip)',
              border: 'none', cursor: 'pointer', color: '#fff',
              fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 500,
              boxShadow: streaming ? `6px 6px 0 var(--ink)` : 'none',
              animation: streaming ? 'pulseC 2.2s infinite' : 'none',
            }}>{streaming ? '▮▮' : '▷'}</button>
            <div>
              <Eyebrow>Status</Eyebrow>
              <Headline size="md" style={{ marginTop: 4, color: streaming ? CHART.green : 'var(--muted)' }}>
                {streaming ? 'Streaming' : 'Paused'}
              </Headline>
              <FigCaption style={{ marginTop: 4 }}>pipeline-prod-consumer · 8 partitions</FigCaption>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--rule)' }}>
            <MetricC label="MESSAGES/SEC" value={msgPerSec.toString()} color={CHART.green} />
            <MetricC label="CONSUMER LAG" value={fmt.num(Math.round(lag))} color={lag > 2000 ? CHART.amber : CHART.green} />
            <MetricC label="TOTAL CONSUMED" value={fmt.num(total)} color={CHART.blue} />
            <MetricC label="ERRORS" value={errors.toString()} color={errors > 0 ? CHART.red : CHART.green} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn onClick={() => setStreaming(false)} disabled={!streaming}>Pause</Btn>
            <Btn onClick={() => setStreaming(true)} disabled={streaming}>Resume</Btn>
            <Btn onClick={() => { setStreaming(false); addToast({ msg: 'Stream stopped', tone: 'warn' }); }}>Stop</Btn>
          </div>
        </div>
      </div>

      <Divider style={{ marginBottom: 40 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
        {/* Cluster config */}
        <div>
          <Eyebrow>Connection</Eyebrow>
          <Headline size="md" style={{ marginTop: 6, marginBottom: 18 }}>Cluster</Headline>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Inp label="BOOTSTRAP SERVERS" value="kafka-prod-01.tradesys:9092" />
            <Inp label="TOPIC" value="trades.raw.v1" />
            <Inp label="CONSUMER GROUP" value="pipeline-prod-consumer" />
            <Inp label="SECURITY PROTOCOL" value="SASL_SSL" suffix="▾" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Inp label="USERNAME" value="pipeline-svc" />
              <Inp label="PASSWORD" type="password" value="••••••" />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
              <Btn>Test connection</Btn>
              <Tag color={CHART.green}>Connected</Tag>
            </div>
          </div>
        </div>

        {/* Buffer */}
        <div>
          <Eyebrow>Buffer & batching</Eyebrow>
          <Headline size="md" style={{ marginTop: 6, marginBottom: 18 }}>Flush policy</Headline>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Rng min={100} max={10000} step={100} value={batchSize} onChange={setBatchSize}
              label="BATCH SIZE" format={v => `${fmt.num(v)} trades`} hint="Antes de procesar" />
            <Rng min={1} max={30} step={1} value={maxLat} onChange={setMaxLat}
              label="MAX LATENCY" format={v => `${v}s`} hint="Flush máximo" />
            <div>
              <Eyebrow style={{ marginBottom: 8 }}>ON ERROR</Eyebrow>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[['skip', 'Skip message'], ['dlq', 'Dead-letter queue'], ['halt', 'Halt stream']].map(([id, l]) => (
                  <label key={id} style={{
                    padding: '8px 12px', borderLeft: `3px solid ${onError === id ? CHART.blue : 'transparent'}`,
                    background: onError === id ? 'rgba(45,92,246,0.08)' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <input type="radio" checked={onError === id} onChange={() => setOnError(id)} style={{ accentColor: CHART.blue }} />
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{l}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <Eyebrow>Live preview</Eyebrow>
          <Headline size="md" style={{ marginTop: 6, marginBottom: 18 }}>Arriving trades</Headline>
          <div style={{ maxHeight: 420, overflow: 'auto', border: '1px solid var(--rule-strong)' }}>
            {feed.map((t, i) => (
              <div key={`${t.id}-${i}`} style={{
                padding: '8px 12px', borderBottom: '1px solid var(--rule)',
                background: t.isNew ? 'rgba(21,128,61,0.18)' : 'transparent',
                transition: 'background 1.5s',
                display: 'grid', gridTemplateColumns: '70px 1fr 50px', gap: 8, alignItems: 'center',
              }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{t.ts.slice(0, 12)}</span>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>{t.instrument} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {t.price} {t.ccy}</span></div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{t.id} · qty {fmt.num(t.qty)}</div>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: t.side === 'BUY' ? CHART.green : CHART.red, textAlign: 'right' }}>{t.side}</span>
              </div>
            ))}
          </div>
          <FigCaption style={{ marginTop: 8 }}>Las filas en verde son trades recién llegados</FigCaption>
        </div>
      </div>
    </div>
  );
}

const MetricC = ({ label, value, color }) => (
  <div style={{ background: 'var(--paper)', padding: '14px 16px' }}>
    <Eyebrow>{label}</Eyebrow>
    <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color, marginTop: 4, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{value}</div>
  </div>
);

function FileC() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48 }}>
      <div>
        <div style={{
          border: '2px dashed var(--rule-strong)', padding: '60px 20px', textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 48, color: 'var(--muted)' }}>⇣</div>
          <Headline size="md" style={{ marginTop: 12 }}>Drop CSV / XLSX / Parquet here</Headline>
          <FigCaption style={{ marginTop: 6 }}>Max 500 MB · schema: TradeSchema (13 cols)</FigCaption>
          <div style={{ marginTop: 20 }}><Btn kind="solid">Browse files</Btn></div>
        </div>
        <Eyebrow style={{ marginTop: 32, marginBottom: 12 }}>Recent uploads</Eyebrow>
        {[
          ['trades_2026-05-14.csv', '12.4 MB', '9,847', 'ok'],
          ['trades_eod_05-13.parquet', '4.1 MB', '11,200', 'ok'],
          ['fx_intraday.xlsx', '880 KB', '432', 'warn'],
        ].map(([name, size, rows, st], i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 90px 60px', gap: 12, alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid var(--rule)',
          }}>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 13 }}>{name}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{size}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{rows} rows</span>
            <Tag color={st === 'ok' ? CHART.green : CHART.amber}>{st}</Tag>
          </div>
        ))}
      </div>

      <div>
        <Eyebrow>Schema validation</Eyebrow>
        <Headline size="md" style={{ marginTop: 6, marginBottom: 18 }}>trades_2026-05-14.csv</Headline>
        {[
          ['trade_id', 'string', 'OK', CHART.green], ['timestamp', 'datetime', 'OK', CHART.green],
          ['side', 'string', 'OK', CHART.green], ['asset_class', 'string', 'OK', CHART.green],
          ['instrument', 'string', 'OK', CHART.green], ['currency', 'ccy', 'OK', CHART.green],
          ['quantity', 'float', 'OK', CHART.green], ['price', 'float', 'OK', CHART.green],
          ['notional', 'float', 'OK', CHART.green], ['trader_id', 'string', 'Map → trader_user', CHART.amber],
          ['counterparty_id', 'string', 'Missing', CHART.red], ['venue', 'string', 'OK', CHART.green],
        ].map(([col, type, msg, c], i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 130px', gap: 8, alignItems: 'center',
            padding: '6px 0', borderBottom: '1px solid var(--rule)', fontSize: 12,
          }}>
            <span style={{ fontFamily: 'var(--mono)' }}>{col}</span>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{type}</span>
            <Tag color={c}>{msg}</Tag>
          </div>
        ))}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Btn>Mapping wizard</Btn>
          <Btn kind="primary">Use for next run →</Btn>
        </div>
      </div>
    </div>
  );
}

function HttpC({ addToast }) {
  const [tested, setTested] = uC2(false);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Inp label="ENDPOINT URL" value="https://api.example.com/v1/trades" />
        <Inp label="AUTH" value="Bearer token" suffix="▾" />
        <Inp label="TOKEN" type="password" value="••••••••••••" />
        <Inp label="SCHEDULE" value="On-demand" suffix="▾" />
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => { setTested(true); addToast({ msg: 'GET 200 · 142ms', tone: 'ok' }); }}>Test connection</Btn>
          <Btn kind="primary">Save & use</Btn>
        </div>
      </div>
      <div>
        <Eyebrow>Response</Eyebrow>
        <Headline size="md" style={{ marginTop: 6, marginBottom: 14 }}>
          {tested ? 'HTTP 200 · 142ms · 487 trades' : '— No request yet'}
        </Headline>
        <pre style={{
          fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--chip)', padding: 16,
          margin: 0, lineHeight: 1.6, color: 'var(--ink)', border: '1px solid var(--rule)',
          minHeight: 320, overflow: 'auto',
        }}>{`{
  "trades": [
    {
      "trade_id": "t_30d4f1a9",
      "timestamp": "2026-05-14T14:23:17.482Z",
      "side": "BUY",
      "asset_class": "EQUITY",
      "instrument": "AAPL",
      "currency": "USD",
      "quantity": 1200,
      "price": 187.42,
      "notional": 224904.00,
      "trader_id": "tr_88421",
      "counterparty_id": "cp_a3f2c19b",
      "venue": "NASDAQ"
    }
    /* 486 more ... */
  ],
  "next_page": "/v1/trades?cursor=..."
}`}</pre>
      </div>
    </div>
  );
}

function SavedC() {
  return (
    <div>
      <Eyebrow>Saved connections</Eyebrow>
      <Headline size="md" style={{ marginTop: 6, marginBottom: 24 }}>3 clusters configured</Headline>
      <Tbl cols={[
        { label: 'NAME', render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
        { label: 'HOST', mono: true, render: r => r.host },
        { label: 'PROTO', render: r => <Tag>{r.proto}</Tag> },
        { label: 'TOPIC', mono: true, render: r => r.topic },
        { label: 'LAST', tone: 'muted', render: r => r.last },
        { label: 'STATUS', render: r => <Tag color={r.status === 'ok' ? CHART.green : CHART.amber}>{r.status === 'ok' ? 'Online' : 'Degraded'}</Tag> },
        { label: '', align: 'right', render: () => <Btn size="sm">Use →</Btn> },
      ]} rows={[
        { name: 'prod-us-east', host: 'kafka-prod-01:9092', proto: 'SASL_SSL', topic: 'trades.raw.v1', last: '2m ago', status: 'ok' },
        { name: 'prod-eu-west', host: 'kafka-eu.tradesys:9092', proto: 'SASL_SSL', topic: 'trades.eu.raw', last: '8m ago', status: 'ok' },
        { name: 'staging', host: 'kafka-stage:9092', proto: 'SSL', topic: 'trades.stage', last: '1d ago', status: 'warn' },
      ]} />
    </div>
  );
}

// =============================================================
// BUSINESS — full editorial layout, charts dominate
// =============================================================
function ScreenBusinessC({ activeRun }) {
  const ac = MOCK.assetClasses;
  const cp = MOCK.counterparties;
  const venues = MOCK.venues;
  const byHour = MOCK.byHour;
  const byDay = MOCK.byDay;
  const totalNotional = ac.reduce((a, b) => a + b.notional, 0);
  const colors = [CHART.blue, CHART.teal, CHART.pink, CHART.orange, CHART.violet];

  return (
    <div data-screen-label="04 Business Report">
      <PageHeader chapter="04 · Business"
        title={`${fmt.usd(totalNotional)} traded across 5 asset classes and 7 venues.`}
        lede="Reporte de negocio del último run. Cada figura puede descargarse individualmente."
        meta={{ label: 'Run', value: fmt.short(activeRun.run_id, 22), sub: fmt.dt(activeRun.started_at) }} />

      <div style={{ padding: '0 32px 28px' }}>
        {/* Hero: by asset class as full-width treatment */}
        <Block>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'flex-end', marginBottom: 24 }}>
            <div>
              <Eyebrow>Figure 1 · Notional by asset class</Eyebrow>
              <Headline size="lg" style={{ marginTop: 8 }}>FX leads with $521M; equity is close behind.</Headline>
            </div>
            <FigCaption>5 asset classes ordenados por volumen total. La distribución buy/sell se muestra a la derecha de cada barra.</FigCaption>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ac.map((a, i) => (
                <div key={a.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600 }}>{a.name}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>{fmt.usd(a.notional)} · {fmt.num(a.count)}</span>
                  </div>
                  <div style={{ display: 'flex', height: 14, alignItems: 'center' }}>
                    <div style={{ width: `${(a.notional / 600e6) * 80}%`, height: '100%', background: colors[i] }} />
                  </div>
                  <div style={{ display: 'flex', height: 4, marginTop: 4, background: 'var(--chip)' }}>
                    <div style={{ width: `${a.buy}%`, height: '100%', background: CHART.green }} title={`buy ${a.buy}%`} />
                    <div style={{ width: `${100 - a.buy}%`, height: '100%', background: CHART.red }} title={`sell ${100 - a.buy}%`} />
                  </div>
                </div>
              ))}
            </div>

            <DonutC data={ac.map((a, i) => ({ label: a.name, value: a.notional, color: colors[i] }))} />
          </div>
        </Block>

        <Divider style={{ margin: '48px 0' }} />

        {/* Risk distribution */}
        <Block>
          <Eyebrow>Figure 2 · Risk distribution</Eyebrow>
          <Headline size="lg" style={{ marginTop: 8, marginBottom: 24 }}>84.6% of trades sit comfortably in low-risk territory.</Headline>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderTop: '1px solid var(--rule-strong)', borderBottom: '1px solid var(--rule-strong)' }}>
            <RiskCellC label="High" count={234} pct={2.4} color={CHART.red} desc="Notional >$5M · trader outlier" />
            <RiskCellC label="Medium" count={1284} pct={13.0} color={CHART.amber} desc="Price band warning" />
            <RiskCellC label="Low" count={8329} pct={84.6} color={CHART.green} desc="Within all thresholds" last />
          </div>
        </Block>

        <Divider style={{ margin: '48px 0' }} />

        {/* Counterparties */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48 }}>
          <Block>
            <Eyebrow>Table 1 · Top counterparties</Eyebrow>
            <Headline size="md" style={{ marginTop: 6, marginBottom: 16 }}>Ranked by volume · pseudonymized IDs</Headline>
            <Tbl cols={[
              { label: '#', align: 'right', mono: true, render: (r) => r._rank },
              { label: 'Counterparty', mono: true, render: r => r.id },
              { label: 'Alias', tone: 'muted', render: r => r.name },
              { label: 'Volume', align: 'right', mono: true, render: r => fmt.usd(r.volume) },
              { label: 'Share', render: r => (
                <div style={{ width: 120, height: 5, background: 'var(--chip)' }}>
                  <div style={{ width: `${(r.volume / cp[0].volume) * 100}%`, height: '100%', background: CHART.violet }} />
                </div>
              )},
            ]} rows={cp.slice(0, 7).map((c, i) => ({ ...c, _rank: i + 1 }))} />
          </Block>

          <Block>
            <Eyebrow>Figure 3 · Venue concentration</Eyebrow>
            <Headline size="md" style={{ marginTop: 6, marginBottom: 16 }}>Share by venue</Headline>
            <TreemapC data={venues} colors={colors} />
          </Block>
        </div>

        <Divider style={{ margin: '48px 0' }} />

        {/* Time series */}
        <Block>
          <Eyebrow>Figure 4 · Trading activity over time</Eyebrow>
          <Headline size="md" style={{ marginTop: 6, marginBottom: 16 }}>By day & hour</Headline>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32 }}>
            <DualLineC data={byDay} />
            <HourHistC data={byHour} />
          </div>
        </Block>
      </div>
    </div>
  );
}

const DonutC = ({ data }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  let acc = 0;
  const r = 70, R = 100;
  const segs = data.map(d => {
    const a0 = (acc / total) * 2 * Math.PI; acc += d.value;
    const a1 = (acc / total) * 2 * Math.PI;
    const x0 = 120 + R * Math.sin(a0), y0 = 120 - R * Math.cos(a0);
    const x1 = 120 + R * Math.sin(a1), y1 = 120 - R * Math.cos(a1);
    const x2 = 120 + r * Math.sin(a1), y2 = 120 - r * Math.cos(a1);
    const x3 = 120 + r * Math.sin(a0), y3 = 120 - r * Math.cos(a0);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`;
    return { p, d };
  });
  return (
    <svg width="100%" viewBox="0 0 240 240">
      {segs.map((s, i) => <path key={i} d={s.p} fill={s.d.color} />)}
      <text x="120" y="116" textAnchor="middle" style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, fill: 'var(--ink)' }}>
        {fmt.usd(total)}
      </text>
      <text x="120" y="134" textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Total notional</text>
    </svg>
  );
};

const RiskCellC = ({ label, count, pct, color, desc, last }) => (
  <div style={{
    padding: '24px 28px', borderLeft: '1px solid var(--rule-strong)',
    borderRight: last ? '1px solid var(--rule-strong)' : 'none',
  }}>
    <Tag color={color}>{label} risk</Tag>
    <div style={{ fontFamily: 'var(--serif)', fontSize: 56, marginTop: 14, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', fontWeight: 500 }}>
      {fmt.num(count)}
    </div>
    <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--ink)', marginTop: 6, fontWeight: 500 }}>{pct.toFixed(1)}%</div>
    <FigCaption style={{ marginTop: 10 }}>{desc}</FigCaption>
  </div>
);

const TreemapC = ({ data, colors }) => {
  const total = data.reduce((a, b) => a + b.share, 0);
  const sorted = [...data].sort((a, b) => b.share - a.share);
  const W = 320, H = 240;
  const cells = [];
  function layout(items, x, y, w, h) {
    if (items.length === 0) return;
    if (items.length === 1) { cells.push({ x, y, w, h, d: items[0] }); return; }
    const half = items.reduce((a, b) => a + b.share, 0) / 2;
    let s = 0, idx = 0;
    for (let i = 0; i < items.length; i++) { s += items[i].share; if (s >= half) { idx = i + 1; break; } }
    const left = items.slice(0, idx), right = items.slice(idx);
    const leftSum = left.reduce((a, b) => a + b.share, 0);
    const ratio = leftSum / (leftSum + right.reduce((a, b) => a + b.share, 0));
    if (w > h) { layout(left, x, y, w * ratio, h); layout(right, x + w * ratio, y, w * (1 - ratio), h); }
    else { layout(left, x, y, w, h * ratio); layout(right, x, y + h * ratio, w, h * (1 - ratio)); }
  }
  layout(sorted, 0, 0, W, H);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {cells.map((c, i) => (
        <g key={i}>
          <rect x={c.x + 1} y={c.y + 1} width={c.w - 2} height={c.h - 2} fill={colors[i % colors.length]} opacity={0.85} />
          <text x={c.x + 10} y={c.y + 20} style={{ fontFamily: 'var(--sans)', fontSize: 13, fill: '#fff', fontWeight: 600 }}>{c.d.name}</text>
          {c.h > 40 && <text x={c.x + 10} y={c.y + 34} style={{ fontFamily: 'var(--mono)', fontSize: 11, fill: 'rgba(255,255,255,0.85)' }}>{c.d.share}%</text>}
        </g>
      ))}
    </svg>
  );
};

const DualLineC = ({ data }) => {
  const w = 500, h = 220;
  const maxC = Math.max(...data.map(d => d.count));
  const maxN = Math.max(...data.map(d => d.notional));
  const ptsC = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - 24 - (d.count / maxC) * (h - 36)}`).join(' ');
  const ptsN = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - 24 - (d.notional / maxN) * (h - 36)}`).join(' ');
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
        {[0.25, 0.5, 0.75, 1].map((g, i) => (
          <line key={i} x1="0" y1={h - 24 - g * (h - 36)} x2={w} y2={h - 24 - g * (h - 36)} stroke="var(--rule)" strokeWidth="0.5" />
        ))}
        <polyline points={ptsC} fill="none" stroke={CHART.blue} strokeWidth="2" />
        <polyline points={ptsN} fill="none" stroke={CHART.orange} strokeWidth="2" strokeDasharray="4,3" />
        {data.map((d, i) => i % 2 === 0 && (
          <text key={i} x={(i / (data.length - 1)) * w} y={h - 4} textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--muted)' }}>{d.day.slice(5)}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <Tag color={CHART.blue}>Trade count</Tag>
        <Tag color={CHART.orange}>Notional (USD)</Tag>
      </div>
    </div>
  );
};

const HourHistC = ({ data }) => {
  const w = 320, h = 220, bw = w / 24;
  const max = Math.max(...data.map(d => d.count));
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {data.map((d, i) => {
        const bh = (d.count / max) * (h - 30);
        return (
          <g key={i}>
            <rect x={i * bw + 1} y={h - 22 - bh} width={bw - 2} height={bh} fill={CHART.teal} opacity={0.4 + (d.count / max) * 0.55} />
            {i % 3 === 0 && <text x={i * bw + bw / 2} y={h - 6} textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: 'var(--muted)' }}>{i.toString().padStart(2, '0')}</text>}
          </g>
        );
      })}
    </svg>
  );
};

// =============================================================
// QUALITY
// =============================================================
function ScreenQualityC({ activeRun }) {
  const score = activeRun.quality_score;
  return (
    <div data-screen-label="05 Quality Report">
      <PageHeader chapter="05 · Quality"
        title={`A quality score of ${score.toFixed(1)} this run.`}
        lede="Cinco componentes ponderados: completeness, uniqueness, consistency, validity, outliers."
        meta={{ label: 'Components', value: '5 weighted', sub: 'sum 1.00' }} />

      <div style={{ padding: '0 32px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 56, alignItems: 'center', padding: '32px 0', borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--rule-strong)' }}>
          <RingGauge value={score} size={220} label="Quality" />
          <div>
            <Eyebrow>Weighted components</Eyebrow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
              {[
                ['Completeness', 96.3, CHART.green, 0.25],
                ['Uniqueness', 99.1, CHART.teal, 0.15],
                ['Consistency', 88.4, CHART.blue, 0.20],
                ['Validity', 92.7, CHART.amber, 0.25],
                ['Outliers', 74.2, CHART.red, 0.15],
              ].map(([n, v, c, w]) => (
                <div key={n} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 60px 50px', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500 }}>{n}</span>
                  <div style={{ height: 6, background: 'var(--chip)' }}>
                    <div style={{ width: `${v}%`, height: '100%', background: c }} />
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 600, color: c }}>{v.toFixed(1)}</span>
                  <span style={{ fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--muted)', fontSize: 11 }}>w·{w}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Btn>JSON</Btn>
            <Btn>CSV</Btn>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 32, marginTop: 40 }}>
          <Block>
            <Eyebrow>Table 1 · Completeness</Eyebrow>
            <Headline size="md" style={{ marginTop: 6, marginBottom: 16 }}>Null counts by column</Headline>
            <Tbl dense cols={[
              { label: 'Column', mono: true, render: r => r.col },
              { label: 'Nulls', align: 'right', mono: true, render: r => fmt.num(r.nulls) },
              { label: '%', align: 'right', render: r => <span style={{ fontFamily: 'var(--mono)', color: r.pct > 5 ? CHART.red : r.pct > 1 ? CHART.amber : CHART.green, fontWeight: 600 }}>{r.pct.toFixed(2)}%</span> },
            ]} rows={[
              { col: 'trade_id', nulls: 0, pct: 0 }, { col: 'timestamp', nulls: 12, pct: 0.12 },
              { col: 'side', nulls: 4, pct: 0.04 }, { col: 'asset_class', nulls: 23, pct: 0.23 },
              { col: 'currency', nulls: 91, pct: 0.91 }, { col: 'price', nulls: 14, pct: 0.14 },
              { col: 'notional', nulls: 142, pct: 1.42 }, { col: 'trader_id', nulls: 487, pct: 4.87 },
              { col: 'counterparty_id', nulls: 612, pct: 6.12 },
            ]} />
          </Block>
          <Block>
            <Eyebrow>Uniqueness</Eyebrow>
            <BigNumber value="127" label="" sub="Duplicate trade_ids" color={CHART.amber} size="xl" />
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <RowC k="Unique ratio" v="98.71%" />
              <RowC k="Total rows" v={fmt.num(activeRun.trades_in)} />
              <RowC k="Strategy" v="keep_first" />
            </div>
          </Block>
          <Block>
            <Eyebrow>Consistency</Eyebrow>
            <Headline size="md" style={{ marginTop: 6, marginBottom: 16 }}>|notional − price·qty|</Headline>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <RingGauge value={88.4} size={120} label="" />
              <div style={{ flex: 1 }}>
                <RowC k="Within tol." v="8,704" />
                <RowC k="Outside" v="1,143" />
                <RowC k="Tolerance" v="±0.01" />
              </div>
            </div>
          </Block>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 32 }}>
          <Block>
            <Eyebrow>Validity · Domain checks</Eyebrow>
            <Headline size="md" style={{ marginTop: 6, marginBottom: 20 }}>Values within expected domain</Headline>
            <Bars data={[
              { label: 'side', value: 99.97 }, { label: 'currency', value: 98.42 },
              { label: 'asset_class', value: 97.81 }, { label: 'status', value: 99.12 },
            ]} color={CHART.violet} valueFmt={v => `${v.toFixed(2)}%`} />
          </Block>
          <Block>
            <Eyebrow>Outliers detected</Eyebrow>
            <Headline size="md" style={{ marginTop: 6, marginBottom: 16 }}>384 anomalous trades</Headline>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center' }}>
              <BigNumber value="384" label="" color={CHART.red} size="xl" />
              <div>
                <RowC k="Price IQR (Z>3)" v="247" />
                <RowC k="Qty extreme" v="89" />
                <RowC k="Notional anomaly" v="48" />
                <RowC k="Method" v="IQR + Z-score" />
              </div>
            </div>
            <div style={{ marginTop: 16 }}><Btn>View all outliers →</Btn></div>
          </Block>
        </div>
      </div>
    </div>
  );
}

const RowC = ({ k, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--rule)', fontSize: 13 }}>
    <span style={{ color: 'var(--muted)' }}>{k}</span>
    <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)', fontWeight: 500 }}>{v}</span>
  </div>
);

Object.assign(window, { ScreenSourcesC, ScreenBusinessC, ScreenQualityC });
