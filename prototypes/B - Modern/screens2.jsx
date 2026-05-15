// Screens: Data Sources (Kafka hero), Business, Quality — MODERN
const { useState: ub2, useEffect: ub2_e } = React;

// =============================================================
// DATA SOURCES
// =============================================================
function ScreenSourcesB({ addToast }) {
  const [tab, setTab] = ub2('kafka');
  return (
    <div data-screen-label="03 Data Sources" style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--chip)', borderRadius: 10, width: 'fit-content' }}>
        {[
          ['file', '☁ File upload'],
          ['http', '⇄ HTTP endpoint'],
          ['kafka', '⥄ Kafka streaming'],
          ['saved', '☰ Saved (3)'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '7px 16px', fontSize: 13, borderRadius: 7, border: 'none', cursor: 'pointer',
            background: tab === id ? 'var(--surface)' : 'transparent',
            color: tab === id ? 'var(--fg)' : 'var(--muted)',
            boxShadow: tab === id ? 'var(--shadow-sm)' : 'none',
            fontWeight: tab === id ? 600 : 500, fontFamily: 'inherit',
          }}>{label}</button>
        ))}
      </div>
      {tab === 'file' && <FileUploadB />}
      {tab === 'http' && <HttpB addToast={addToast} />}
      {tab === 'kafka' && <KafkaB addToast={addToast} />}
      {tab === 'saved' && <SavedB />}
    </div>
  );
}

function FileUploadB() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
      <Card title="Drop files here" subtitle="CSV, XLSX or Parquet · max 500MB">
        <div style={{
          border: '2px dashed var(--border)', borderRadius: 12, padding: '40px 20px',
          textAlign: 'center', background: 'var(--bg-soft)',
        }}>
          <div style={{ fontSize: 40, color: 'var(--muted)' }}>☁</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginTop: 8 }}>
            Arrastra archivos o haz click para browse
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Schema esperado: TradeSchema (13 columns)
          </div>
          <Button kind="primary" style={{ marginTop: 16 }}>Browse files</Button>
        </div>

        <div style={{ marginTop: 20, fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
          Recent uploads
        </div>
        {[
          { name: 'trades_2026-05-14.csv', size: '12.4 MB', rows: '9,847', status: 'ok' },
          { name: 'trades_eod_05-13.parquet', size: '4.1 MB', rows: '11,200', status: 'ok' },
          { name: 'fx_intraday.xlsx', size: '880 KB', rows: '432', status: 'warn' },
        ].map((f, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '20px 1fr 80px 90px 80px',
            padding: '10px 12px', alignItems: 'center', gap: 10,
            background: 'var(--bg-soft)', borderRadius: 8, marginBottom: 6, fontSize: 13,
          }}>
            <span>📄</span>
            <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{f.name}</span>
            <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>{f.size}</span>
            <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>{f.rows} rows</span>
            <Pill tone={f.status === 'ok' ? 'ok' : 'warn'} dot>{f.status}</Pill>
          </div>
        ))}
      </Card>

      <Card title="Schema validation" subtitle="trades_2026-05-14.csv">
        {[
          ['trade_id', 'string', 'OK', 'ok'], ['timestamp', 'datetime', 'OK', 'ok'],
          ['side', 'string', 'OK', 'ok'], ['asset_class', 'string', 'OK', 'ok'],
          ['instrument', 'string', 'OK', 'ok'], ['currency', 'ccy', 'OK', 'ok'],
          ['quantity', 'float', 'OK', 'ok'], ['price', 'float', 'OK', 'ok'],
          ['notional', 'float', 'OK', 'ok'], ['trader_id', 'string', 'Map → trader_user', 'warn'],
          ['counterparty_id', 'string', 'Missing', 'crit'], ['venue', 'string', 'OK', 'ok'],
        ].map(([col, type, msg, tone], i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 130px',
            padding: '8px 0', alignItems: 'center', fontSize: 13,
            borderBottom: '1px solid var(--border-soft)',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg)' }}>{col}</span>
            <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>{type}</span>
            <Pill tone={tone} dot>{msg}</Pill>
          </div>
        ))}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button kind="ghost">Mapping wizard</Button>
          <Button kind="primary">Use for next run →</Button>
        </div>
      </Card>
    </div>
  );
}

function HttpB({ addToast }) {
  const [url, setUrl] = ub2('https://api.example.com/v1/trades');
  const [auth, setAuth] = ub2('bearer');
  const [testing, setTesting] = ub2(false);
  const [result, setResult] = ub2(null);
  const test = () => {
    setTesting(true);
    setTimeout(() => {
      setResult({ code: 200, ms: 142, trades: 487 });
      setTesting(false);
      addToast({ msg: 'GET 200 · 142ms · 487 trades', tone: 'ok' });
    }, 700);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card title="Endpoint configuration">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="URL" value={url} onChange={e => setUrl(e.target.value)} />
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>Authentication</div>
            <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--chip)', borderRadius: 8 }}>
              {[['none', 'None'], ['bearer', 'Bearer'], ['apikey', 'API Key']].map(([id, l]) => (
                <button key={id} onClick={() => setAuth(id)} style={{
                  flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: auth === id ? 'var(--surface)' : 'transparent',
                  color: auth === id ? 'var(--fg)' : 'var(--muted)',
                  boxShadow: auth === id ? 'var(--shadow-sm)' : 'none',
                  fontWeight: auth === id ? 600 : 500, fontFamily: 'inherit',
                }}>{l}</button>
              ))}
            </div>
          </div>
          {auth === 'bearer' && <Input label="Token" type="password" value="••••••••••••" />}
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>Extra headers</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
              <Input placeholder="X-Trace-Id" />
              <Input placeholder="value" />
              <Button kind="ghost" size="sm">+</Button>
            </div>
          </div>
          <Input label="Schedule" placeholder="On-demand" suffix="▾" />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Button kind="ghost" onClick={test} disabled={testing}>
              {testing ? '◐ Testing…' : '▷ Test connection'}
            </Button>
            <Button kind="primary">Save & use</Button>
          </div>
        </div>
      </Card>

      <Card title="Response preview">
        {result ? (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <Pill tone="ok" dot>HTTP {result.code}</Pill>
              <Pill>{result.ms}ms</Pill>
              <Pill tone="info">{result.trades} trades</Pill>
            </div>
            <pre style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)',
              background: 'var(--bg-soft)', padding: 14, borderRadius: 8,
              maxHeight: 360, overflow: 'auto', margin: 0, lineHeight: 1.6,
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
      "venue": "NASDAQ",
      "status": "NEW"
    }
    /* 486 more ... */
  ],
  "next_page": "/v1/trades?cursor=..."
}`}</pre>
          </>
        ) : (
          <div style={{
            padding: '50px 20px', textAlign: 'center',
            background: 'var(--bg-soft)', borderRadius: 10, color: 'var(--muted)', fontSize: 13,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⇄</div>
            Test connection to preview response
          </div>
        )}
      </Card>
    </div>
  );
}

function KafkaB({ addToast }) {
  const [streaming, setStreaming] = ub2(true);
  const [msgPerSec, setMsgPerSec] = ub2(247);
  const [lag, setLag] = ub2(1284);
  const [total, setTotal] = ub2(82441);
  const [errors, setErrors] = ub2(3);
  const [history, setHistory] = ub2(Array.from({ length: 60 }, () => 180 + Math.random() * 140));
  const [batchSize, setBatchSize] = ub2(1000);
  const [maxLat, setMaxLat] = ub2(5);
  const [onError, setOnError] = ub2('dlq');
  const [feed, setFeed] = ub2(initialFeedB());

  function initialFeedB() {
    return Array.from({ length: 14 }, (_, i) => makeTradeB(i, false));
  }
  function makeTradeB(i, isNew) {
    const sides = ['BUY', 'SELL']; const ccy = ['USD', 'EUR', 'GBP', 'JPY'];
    const inst = ['AAPL', 'MSFT', 'TSLA', 'EURUSD', 'BTCUSD', 'GBPJPY', 'NVDA', 'SPY'];
    return {
      ts: new Date(Date.now() - i * 800).toISOString().slice(11, 23),
      id: `t_${Math.random().toString(16).slice(2, 10)}`,
      side: sides[Math.floor(Math.random() * 2)],
      instrument: inst[Math.floor(Math.random() * inst.length)],
      qty: (100 + Math.floor(Math.random() * 4000)).toLocaleString(),
      price: (50 + Math.random() * 250).toFixed(2),
      ccy: ccy[Math.floor(Math.random() * ccy.length)],
      isNew,
    };
  }

  ub2_e(() => {
    if (!streaming) return;
    const id = setInterval(() => {
      const rate = 200 + Math.random() * 100;
      setMsgPerSec(Math.round(rate));
      setHistory(h => [...h.slice(1), rate]);
      setTotal(t => t + Math.round(rate / 4));
      setLag(l => Math.max(0, l + (Math.random() - 0.55) * 200));
      setFeed(f => {
        const adds = Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => makeTradeB(0, true));
        return [...adds, ...f.slice(0, 30).map(t => ({ ...t, isNew: false }))];
      });
    }, 1200);
    return () => clearInterval(id);
  }, [streaming]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stream control HERO */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setStreaming(!streaming)} style={{
              width: 120, height: 120, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: streaming
                ? 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.04) 70%)'
                : 'var(--chip)',
              position: 'relative',
              animation: streaming ? 'pulseBigB 2.2s infinite' : 'none',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: streaming ? 'var(--ok)' : 'var(--chip-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 24, margin: 'auto',
                boxShadow: streaming ? '0 4px 14px rgba(34,197,94,0.45)' : 'none',
              }}>{streaming ? '▮▮' : '▷'}</div>
            </button>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', fontWeight: 500, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Status
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, textAlign: 'center', color: streaming ? 'var(--ok)' : 'var(--muted)' }}>
                {streaming ? 'Streaming' : 'Paused'}
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Kafka stream · trades.raw.v1</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', letterSpacing: -0.3, marginTop: 2 }}>
                  Real-time consumer · pipeline-prod-consumer
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button kind="ghost" onClick={() => setStreaming(false)} disabled={!streaming}>Pause</Button>
                <Button kind="ghost" onClick={() => setStreaming(true)} disabled={streaming}>Resume</Button>
                <Button kind="danger" onClick={() => { setStreaming(false); addToast({ msg: 'Stream stopped', tone: 'warn' }); }}>Stop</Button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <Metric label="Messages/sec" value={msgPerSec.toString()} tone="ok" />
              <Metric label="Consumer lag" value={fmt.num(Math.round(lag))} tone={lag > 2000 ? 'warn' : 'ok'} />
              <Metric label="Total consumed" value={fmt.num(total)} tone="info" />
              <Metric label="Errors" value={errors.toString()} tone={errors > 0 ? 'crit' : 'ok'} />
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, letterSpacing: 0.4, textTransform: 'uppercase' }}>Throughput · last 60s</span>
                <span style={{ fontSize: 11, color: 'var(--ok)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{Math.round(history[history.length - 1])} msg/s</span>
              </div>
              <ThroughputB data={history} />
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Card title="Cluster connection">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input label="Bootstrap servers" value="kafka-prod-01.tradesys:9092" />
            <Input label="Topic" value="trades.raw.v1" />
            <Input label="Consumer group" value="pipeline-prod-consumer" />
            <Input label="Security protocol" value="SASL_SSL" suffix="▾" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Input label="Username" value="pipeline-svc" />
              <Input label="Password" type="password" value="••••••" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <Button kind="ghost" size="sm">Test</Button>
              <Pill tone="ok" dot>Connected · 8 partitions</Pill>
            </div>
          </div>
        </Card>

        <Card title="Buffer & batching">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Slider label="Batch size" min={100} max={10000} step={100} value={batchSize}
              onChange={setBatchSize} format={v => `${fmt.num(v)} trades`} hint="Antes de procesar" />
            <Slider label="Max latency" min={1} max={30} step={1} value={maxLat}
              onChange={setMaxLat} format={v => `${v}s`} hint="Flush máximo" />
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>On error</div>
              {[['skip', 'Skip message', 'Continúa con el siguiente'],
                ['dlq', 'Dead letter queue', 'Mueve a trades.dlq.v1'],
                ['halt', 'Halt stream', 'Detiene el consumer']].map(([id, l, sub]) => (
                <label key={id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  border: `1px solid ${onError === id ? 'var(--accent)' : 'var(--border)'}`,
                  background: onError === id ? 'var(--accent-soft)' : 'transparent',
                  borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                }}>
                  <input type="radio" checked={onError === id} onChange={() => setOnError(id)} style={{ accentColor: 'var(--accent)' }} />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{l}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Live stream preview" subtitle={`${feed.length} trades in buffer`} right={<Pill tone="ok" dot>Live</Pill>} padded={false}>
          <div style={{ maxHeight: 480, overflow: 'auto' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '88px 1fr 50px 70px',
              padding: '8px 14px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border-soft)',
              fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase',
            }}>
              <span>Time</span><span>Trade</span><span>Side</span><span style={{ textAlign: 'right' }}>Qty</span>
            </div>
            {feed.map((t, i) => (
              <div key={`${t.id}-${i}`} style={{
                display: 'grid', gridTemplateColumns: '88px 1fr 50px 70px',
                padding: '7px 14px', alignItems: 'center',
                borderBottom: '1px solid var(--border-soft)',
                background: t.isNew ? 'rgba(34,197,94,0.10)' : 'transparent',
                transition: 'background 1.6s ease-out',
                fontSize: 12,
              }}>
                <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>{t.ts.slice(0, 12)}</span>
                <div>
                  <div style={{ color: 'var(--fg)', fontWeight: 500 }}>{t.instrument} · {t.price} {t.ccy}</div>
                  <div style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 10 }}>{t.id}</div>
                </div>
                <Pill tone={t.side === 'BUY' ? 'ok' : 'crit'} style={{ fontSize: 10, padding: '1px 6px' }}>{t.side}</Pill>
                <span style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--fg)' }}>{t.qty}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

const Metric = ({ label, value, tone = 'neutral' }) => {
  const color = { ok: 'var(--ok)', warn: 'var(--warn)', crit: 'var(--crit)', info: 'var(--info)', neutral: 'var(--fg)' }[tone];
  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg-soft)', borderRadius: 10, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color, letterSpacing: -0.4, marginTop: 4, fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  );
};

const ThroughputB = ({ data }) => {
  const w = 600, h = 70, min = 0, max = 400;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min)) * (h - 4) - 2}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="thrModGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ok)" stopOpacity="0.30" />
          <stop offset="100%" stopColor="var(--ok)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#thrModGrad)" />
      <polyline points={pts} fill="none" stroke="var(--ok)" strokeWidth="1.5" />
    </svg>
  );
};

function SavedB() {
  return (
    <Card title="Saved connections" padded={false}>
      <TableM cols={[
        { label: 'Name', render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
        { label: 'Host', mono: true, render: r => r.host },
        { label: 'Protocol', render: r => <Pill>{r.proto}</Pill> },
        { label: 'Topic', mono: true, render: r => r.topic },
        { label: 'Last used', tone: 'muted', render: r => r.last },
        { label: 'Status', render: r => <Pill tone={r.status} dot>{r.status === 'ok' ? 'Online' : 'Degraded'}</Pill> },
        { label: '', align: 'right', render: () => <Button kind="ghost" size="sm">Use →</Button> },
      ]} rows={[
        { name: 'prod-us-east', host: 'kafka-prod-01:9092', proto: 'SASL_SSL', topic: 'trades.raw.v1', last: '2m ago', status: 'ok' },
        { name: 'prod-eu-west', host: 'kafka-eu.tradesys:9092', proto: 'SASL_SSL', topic: 'trades.eu.raw', last: '8m ago', status: 'ok' },
        { name: 'staging', host: 'kafka-stage:9092', proto: 'SSL', topic: 'trades.stage', last: '1d ago', status: 'warn' },
      ]} />
    </Card>
  );
}

Object.assign(window, { ScreenSourcesB });
