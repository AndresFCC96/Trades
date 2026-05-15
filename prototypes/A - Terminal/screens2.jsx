// Screens: Data Sources (Kafka hero), Business, Quality — TERMINAL
const { useState: us2, useEffect: ue2, useMemo: um2, useRef: ur2 } = React;

// =============================================================
// DATA SOURCES (Kafka hero)
// =============================================================
function ScreenSources({ addToast }) {
  const [tab, setTab] = us2('kafka');
  return (
    <div data-screen-label="03 Data Sources" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {[['file', '⇣ FILE UPLOAD'], ['http', '⇄ HTTP ENDPOINT'], ['kafka', '⥄ KAFKA STREAMING'], ['saved', '☰ SAVED CLUSTERS · 3']].map(([id, label]) => (
          <div key={id} onClick={() => setTab(id)} style={{
            padding: '10px 18px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 0.6,
            cursor: 'pointer', color: tab === id ? '#4ade80' : 'var(--muted)',
            borderBottom: tab === id ? '2px solid #4ade80' : '2px solid transparent',
          }}>{label}</div>
        ))}
      </div>
      {tab === 'file' && <FileUploadTab />}
      {tab === 'http' && <HttpTab addToast={addToast} />}
      {tab === 'kafka' && <KafkaTab addToast={addToast} />}
      {tab === 'saved' && <SavedTab />}
    </div>
  );
}

function FileUploadTab() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
      <Panel title="Drop Zone">
        <div style={{
          border: '2px dashed var(--border)', borderRadius: 2, padding: 40,
          textAlign: 'center', fontFamily: 'var(--mono)',
        }}>
          <div style={{ fontSize: 36, color: 'var(--muted)' }}>⇣</div>
          <div style={{ fontSize: 13, color: 'var(--fg)', marginTop: 8 }}>DRAG CSV / XLSX / PARQUET</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>o click para browse · max 500MB</div>
          <Btn kind="solid" size="md" style={{ marginTop: 16 }}>BROWSE FILES</Btn>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 0.6, marginBottom: 6 }}>RECENT UPLOADS</div>
          {[
            { name: 'trades_2026-05-14.csv', size: '12.4MB', rows: '9,847', status: 'ok' },
            { name: 'trades_eod_05-13.parquet', size: '4.1MB', rows: '11,200', status: 'ok' },
            { name: 'fx_intraday.xlsx', size: '880KB', rows: '432', status: 'warn' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px',
              padding: '6px 10px', borderBottom: '1px solid var(--border-soft)',
              fontFamily: 'var(--mono)', fontSize: 11, alignItems: 'center',
            }}>
              <span style={{ color: 'var(--fg)' }}>{f.name}</span>
              <span style={{ color: 'var(--muted)' }}>{f.size}</span>
              <span style={{ color: 'var(--muted)' }}>{f.rows} rows</span>
              <Badge tone={f.status === 'ok' ? 'ok' : 'warn'}>{f.status.toUpperCase()}</Badge>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Schema Validation · trades_2026-05-14.csv">
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
          {[
            ['trade_id', 'string', 'OK', 'ok'], ['timestamp', 'datetime', 'OK', 'ok'],
            ['side', 'string', 'OK', 'ok'], ['asset_class', 'string', 'OK', 'ok'],
            ['instrument', 'string', 'OK', 'ok'], ['currency', 'ccy', 'OK', 'ok'],
            ['quantity', 'float', 'OK', 'ok'], ['price', 'float', 'OK', 'ok'],
            ['notional', 'float', 'OK', 'ok'], ['trader_id', 'string', 'MAP→ trader_user', 'warn'],
            ['counterparty_id', 'string', 'MISSING', 'crit'], ['venue', 'string', 'OK', 'ok'],
            ['status', 'string', 'OK', 'ok'],
          ].map(([col, type, msg, tone], i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 110px',
              padding: '4px 8px', borderBottom: '1px solid var(--border-soft)', alignItems: 'center',
            }}>
              <span style={{ color: 'var(--fg)' }}>{col}</span>
              <span style={{ color: 'var(--muted)' }}>{type}</span>
              <Badge tone={tone}>{msg}</Badge>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <Btn kind="solid">OPEN MAPPING WIZARD</Btn>
          <Btn kind="primary">USE FOR NEXT RUN →</Btn>
        </div>
      </Panel>
    </div>
  );
}

function HttpTab({ addToast }) {
  const [url, setUrl] = us2('https://api.example.com/v1/trades');
  const [auth, setAuth] = us2('bearer');
  const [testing, setTesting] = us2(false);
  const [result, setResult] = us2(null);
  const test = () => {
    setTesting(true);
    setTimeout(() => {
      setResult({ code: 200, ms: 142, sample: { trades: 487, next_page: '/v1/trades?cursor=eyJpZCI6NDg3fQ' } });
      setTesting(false);
      addToast({ msg: 'GET 200 · 142ms · 487 trades', tone: 'ok' });
    }, 800);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Panel title="Endpoint Configuration">
        <Field label="URL"><input value={url} onChange={e => setUrl(e.target.value)} style={inputBox} /></Field>
        <div style={{ marginTop: 12 }}>
          <Field label="AUTH">
            <div style={{ display: 'flex', gap: 4 }}>
              {[['none', 'NONE'], ['bearer', 'BEARER'], ['apikey', 'API KEY']].map(([id, l]) => (
                <button key={id} onClick={() => setAuth(id)} style={{
                  padding: '6px 12px', background: auth === id ? '#1a1f2a' : 'transparent',
                  border: '1px solid var(--border)', borderRadius: 2,
                  color: auth === id ? '#4ade80' : 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11,
                  cursor: 'pointer',
                }}>{l}</button>
              ))}
            </div>
          </Field>
        </div>
        {auth === 'bearer' && (
          <Field label="TOKEN">
            <input type="password" placeholder="••••••••••••••••" style={inputBox} />
          </Field>
        )}
        <Field label="HEADERS">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 24px', gap: 4 }}>
            <input placeholder="X-Trace-Id" style={inputBox} />
            <input placeholder="value" style={inputBox} />
            <Btn>+</Btn>
          </div>
        </Field>
        <Field label="SCHEDULE">
          <select style={{ ...inputBox, appearance: 'menulist' }}>
            <option>ON-DEMAND</option>
            <option>EVERY 5 MIN</option>
            <option>EVERY 1 HOUR</option>
            <option>CRON: 0 */6 * * *</option>
          </select>
        </Field>
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <Btn kind="solid" onClick={test} disabled={testing}>{testing ? '◐ TESTING…' : '▶ TEST CONNECTION'}</Btn>
          <Btn kind="primary">SAVE & USE</Btn>
        </div>
      </Panel>

      <Panel title="Response Preview">
        {result ? (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <Badge tone="ok">HTTP {result.code}</Badge>
              <Badge>{result.ms}ms</Badge>
              <Badge tone="info">{result.sample.trades} trades</Badge>
            </div>
            <pre style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)',
              background: 'var(--bg)', padding: 12, border: '1px solid var(--border)',
              maxHeight: 320, overflow: 'auto', margin: 0,
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
    },
    /* ... 486 more ... */
  ],
  "next_page": "${result.sample.next_page}"
}`}</pre>
          </>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
            PRESS "TEST CONNECTION" TO PREVIEW RESPONSE
          </div>
        )}
      </Panel>
    </div>
  );
}

function KafkaTab({ addToast }) {
  const [streaming, setStreaming] = us2(true);
  const [msgPerSec, setMsgPerSec] = us2(247);
  const [lag, setLag] = us2(1284);
  const [total, setTotal] = us2(82441);
  const [errors, setErrors] = us2(3);
  const [history, setHistory] = us2(Array.from({ length: 60 }, () => 180 + Math.random() * 140));
  const [batchSize, setBatchSize] = us2(1000);
  const [maxLat, setMaxLat] = us2(5);
  const [onError, setOnError] = us2('dlq');
  const [feed, setFeed] = us2(initialFeed());

  function initialFeed() {
    return Array.from({ length: 14 }, (_, i) => makeTrade(i, false));
  }
  function makeTrade(i, isNew) {
    const sides = ['BUY', 'SELL']; const ccy = ['USD', 'EUR', 'GBP', 'JPY']; const inst = ['AAPL', 'MSFT', 'TSLA', 'EURUSD', 'BTCUSD', 'GBPJPY', 'NVDA', 'SPY'];
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

  ue2(() => {
    if (!streaming) return;
    const id = setInterval(() => {
      const rate = 200 + Math.random() * 100;
      setMsgPerSec(Math.round(rate));
      setHistory(h => [...h.slice(1), rate]);
      setTotal(t => t + Math.round(rate / 4));
      setLag(l => Math.max(0, l + (Math.random() - 0.55) * 200));
      // Add 1-2 new trades to feed
      setFeed(f => {
        const adds = Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => makeTrade(0, true));
        return [...adds, ...f.slice(0, 30).map(t => ({ ...t, isNew: false }))];
      });
    }, 1100);
    return () => clearInterval(id);
  }, [streaming]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.6fr 1fr', gap: 12 }}>
        {/* Cluster connection */}
        <Panel title="Cluster Connection">
          <Field label="BOOTSTRAP SERVERS"><input defaultValue="kafka-prod-01.tradesys:9092" style={inputBox} /></Field>
          <Field label="TOPIC"><input defaultValue="trades.raw.v1" style={inputBox} /></Field>
          <Field label="CONSUMER GROUP"><input defaultValue="pipeline-prod-consumer" style={inputBox} /></Field>
          <Field label="SECURITY PROTOCOL">
            <select style={{ ...inputBox, appearance: 'menulist' }}>
              <option>SASL_SSL</option><option>SSL</option><option>PLAINTEXT</option>
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="USERNAME"><input defaultValue="pipeline-svc" style={inputBox} /></Field>
            <Field label="PASSWORD"><input type="password" defaultValue="••••••••••" style={inputBox} /></Field>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Btn kind="solid">TEST</Btn>
            <Badge tone="ok">● CONNECTED · 8 PARTITIONS</Badge>
          </div>
        </Panel>

        {/* Stream control HERO */}
        <Panel title="Stream Control" right={<Badge tone={streaming ? 'ok' : 'neutral'}>{streaming ? '● LIVE' : '○ STOPPED'}</Badge>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center', marginBottom: 14 }}>
            <button onClick={() => setStreaming(!streaming)} style={{
              width: 100, height: 100, borderRadius: '50%',
              background: streaming ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
              border: `2px solid ${streaming ? '#4ade80' : 'var(--border)'}`,
              cursor: 'pointer', position: 'relative',
              animation: streaming ? 'pulseBig 2s infinite' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 26, color: streaming ? '#4ade80' : 'var(--muted)',
              }}>{streaming ? '▮▮' : '▶'}</div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 9, color: streaming ? '#4ade80' : 'var(--muted)',
                letterSpacing: 1, marginTop: -4,
              }}>{streaming ? 'STREAMING' : 'PAUSED'}</div>
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <MetricChip label="MSG/SEC" value={msgPerSec.toString()} color="#4ade80" />
              <MetricChip label="CONSUMER LAG" value={fmt.num(Math.round(lag))} color={lag > 2000 ? '#fbbf24' : '#4ade80'} />
              <MetricChip label="TOTAL CONSUMED" value={fmt.num(total)} color="#60a5fa" />
              <MetricChip label="ERRORS" value={errors.toString()} color={errors > 0 ? '#f87171' : '#4ade80'} />
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>THROUGHPUT · LAST 60s</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#4ade80' }}>{Math.round(history[history.length - 1])} msg/s</span>
            </div>
            <ThroughputChart data={history} />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
            <Btn onClick={() => setStreaming(false)} disabled={!streaming}>PAUSE</Btn>
            <Btn onClick={() => setStreaming(true)} disabled={streaming}>RESUME</Btn>
            <Btn kind="danger" onClick={() => { setStreaming(false); addToast({ msg: 'Stream stopped', tone: 'warn' }); }}>STOP</Btn>
          </div>
        </Panel>

        {/* Buffer & batching */}
        <Panel title="Buffer & Batching">
          <Field label="BATCH SIZE" value={`${fmt.num(batchSize)} trades`} hint="Antes de procesar">
            <input type="range" min={100} max={10000} step={100} value={batchSize}
              onChange={e => setBatchSize(+e.target.value)} style={inputRange} />
          </Field>
          <Field label="MAX LATENCY" value={`${maxLat}s`} hint="Flush time max">
            <input type="range" min={1} max={30} step={1} value={maxLat}
              onChange={e => setMaxLat(+e.target.value)} style={inputRange} />
          </Field>
          <Field label="ON ERROR">
            <div style={{ display: 'grid', gap: 4 }}>
              {[['skip', 'SKIP MESSAGE'], ['dlq', 'DEAD LETTER QUEUE'], ['halt', 'HALT STREAM']].map(([id, l]) => (
                <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, border: '1px solid var(--border)', cursor: 'pointer', background: onError === id ? 'rgba(74,222,128,0.06)' : 'transparent' }}>
                  <input type="radio" checked={onError === id} onChange={() => setOnError(id)} style={{ accentColor: '#4ade80' }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: onError === id ? '#4ade80' : 'var(--fg)' }}>{l}</span>
                </label>
              ))}
            </div>
          </Field>
        </Panel>
      </div>

      <Panel title="Live Stream Preview · trades.raw.v1"
        right={<span style={{ color: '#4ade80' }}>● {feed.length} TRADES BUFFER</span>}>
        <div style={{ maxHeight: 280, overflow: 'auto', fontFamily: 'var(--mono)', fontSize: 11 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '130px 110px 60px 110px 90px 90px 60px 50px',
            padding: '6px 10px', position: 'sticky', top: 0, background: 'var(--panel)',
            borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: 10, letterSpacing: 0.6,
          }}>
            <span>ARRIVED_AT</span><span>TRADE_ID</span><span>SIDE</span>
            <span>INSTRUMENT</span><span style={{ textAlign: 'right' }}>QTY</span>
            <span style={{ textAlign: 'right' }}>PRICE</span><span>CCY</span><span style={{ textAlign: 'right' }}>STATUS</span>
          </div>
          {feed.map((t, i) => (
            <div key={`${t.id}-${i}`} style={{
              display: 'grid', gridTemplateColumns: '130px 110px 60px 110px 90px 90px 60px 50px',
              padding: '4px 10px', borderBottom: '1px solid var(--border-soft)',
              background: t.isNew ? 'rgba(74,222,128,0.12)' : 'transparent',
              transition: 'background 1.5s',
              alignItems: 'center',
            }}>
              <span style={{ color: 'var(--muted)' }}>{t.ts}</span>
              <span>{t.id}</span>
              <span style={{ color: t.side === 'BUY' ? '#4ade80' : '#f87171' }}>{t.side}</span>
              <span>{t.instrument}</span>
              <span style={{ textAlign: 'right' }}>{t.qty}</span>
              <span style={{ textAlign: 'right' }}>{t.price}</span>
              <span style={{ color: 'var(--muted)' }}>{t.ccy}</span>
              <span style={{ textAlign: 'right' }}>
                <Badge tone="ok" style={{ fontSize: 9, padding: '0 4px' }}>OK</Badge>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const MetricChip = ({ label, value, color }) => (
  <div style={{
    padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)',
    borderLeft: `2px solid ${color}`,
  }}>
    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 0.6 }}>{label}</div>
    <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 500, color, lineHeight: 1.2, marginTop: 2 }}>{value}</div>
  </div>
);

const ThroughputChart = ({ data }) => {
  const w = 600, h = 60;
  const min = 0, max = 400;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min)) * (h - 4) - 2}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="thrGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#thrGrad)" />
      <polyline points={pts} fill="none" stroke="#4ade80" strokeWidth="1.2" />
    </svg>
  );
};

function SavedTab() {
  return (
    <Panel title="Saved Connections">
      <Table dense rows={[
        { name: 'prod-us-east', host: 'kafka-prod-01:9092', proto: 'SASL_SSL', topic: 'trades.raw.v1', last: '2m ago', status: 'ok' },
        { name: 'prod-eu-west', host: 'kafka-eu.tradesys:9092', proto: 'SASL_SSL', topic: 'trades.eu.raw', last: '8m ago', status: 'ok' },
        { name: 'staging', host: 'kafka-stage:9092', proto: 'SSL', topic: 'trades.stage', last: '1d ago', status: 'warn' },
      ]} cols={[
        { label: 'NAME', render: r => r.name },
        { label: 'HOST', render: r => <span style={{ color: 'var(--muted)' }}>{r.host}</span> },
        { label: 'PROTO', render: r => <Badge>{r.proto}</Badge> },
        { label: 'TOPIC', render: r => r.topic },
        { label: 'LAST USED', render: r => <span style={{ color: 'var(--muted)' }}>{r.last}</span> },
        { label: 'STATUS', render: r => <Badge tone={r.status}>{r.status === 'ok' ? '● ONLINE' : '◐ DEGRADED'}</Badge> },
        { label: '', align: 'right', render: () => <Btn>USE →</Btn> },
      ]} />
    </Panel>
  );
}

Object.assign(window, { ScreenSources });
