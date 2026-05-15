// Screens: Rules, Audit, History, Settings — TERMINAL
const { useState: us4 } = React;

// =============================================================
// VALIDATION RULES
// =============================================================
function ScreenRules() {
  const [openSections, setOpenSections] = us4({ critical: true, business: true, context: true });
  const [rules, setRules] = us4(MOCK.rules);
  const groups = {
    critical: { label: 'CRÍTICAS', range: 'RV-01..RV-06', color: '#f87171' },
    business: { label: 'NEGOCIO', range: 'RV-07..RV-12', color: '#fbbf24' },
    context: { label: 'CONTEXTUALES', range: 'RV-13..RV-14', color: '#a78bfa' },
  };

  return (
    <div data-screen-label="06 Validation Rules" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel title="14 Rules · 12 Enabled · 2 Disabled"
        right={<div style={{ display: 'flex', gap: 6 }}>
          <Btn kind="solid">CONFIGURE THRESHOLDS</Btn>
          <Btn kind="primary">SAVE CHANGES</Btn>
        </div>}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
          Configura las reglas de validación · cambios aplican al próximo run · valores leídos de <span style={{ color: 'var(--fg)' }}>settings.yaml</span>
        </div>
      </Panel>

      {Object.entries(groups).map(([gid, g]) => {
        const items = rules.filter(r => r.group === gid);
        const open = openSections[gid];
        return (
          <div key={gid}>
            <div onClick={() => setOpenSections(s => ({ ...s, [gid]: !s[gid] }))} style={{
              padding: '10px 14px', background: 'var(--panel)', border: '1px solid var(--border)',
              borderLeft: `3px solid ${g.color}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: g.color, letterSpacing: 0.8 }}>
                  {open ? '▾' : '▸'} {g.label}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{g.range} · {items.length} reglas</span>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                REJECTED <span style={{ color: g.color }}>{items.reduce((a, b) => a + b.rejected, 0)}</span>
              </div>
            </div>
            {open && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
                {items.map(r => <RuleCard key={r.id} rule={r}
                  onToggle={() => setRules(rs => rs.map(x => x.id === r.id ? { ...x, enabled: !x.enabled } : x))} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const RuleCard = ({ rule, onToggle }) => {
  const trend = Array.from({ length: 12 }, () => Math.round(Math.random() * rule.rejected));
  const color = { critical: '#f87171', business: '#fbbf24', context: '#a78bfa' }[rule.group];
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)', padding: 12,
      opacity: rule.enabled ? 1 : 0.5,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge tone={rule.group === 'critical' ? 'crit' : rule.group === 'business' ? 'warn' : 'accent'}>{rule.id}</Badge>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg)' }}>{rule.name}</span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{rule.desc}</div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <span style={{
            width: 28, height: 14, background: rule.enabled ? '#4ade80' : 'var(--border)',
            borderRadius: 2, position: 'relative',
          }} onClick={onToggle}>
            <span style={{
              position: 'absolute', top: 1, left: rule.enabled ? 15 : 1,
              width: 12, height: 12, background: 'var(--knob)', transition: 'left 0.15s',
            }} />
          </span>
        </label>
      </div>
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
            <span>REJECTED THIS RUN</span>
            <span style={{ color }}>{rule.rejected}</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)' }}>
            <div style={{ width: `${Math.min((rule.rejected / 40) * 100, 100)}%`, height: '100%', background: color }} />
          </div>
        </div>
        <Sparkline data={trend} color={color} w={80} h={20} />
      </div>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
          {rule.group === 'business' && 'threshold: 0.05'}
          {rule.group === 'critical' && 'tolerance: ±0.01'}
          {rule.group === 'context' && 'iqr_factor: 3.0'}
        </span>
        <Btn>VIEW REJECTED →</Btn>
      </div>
    </div>
  );
};

// =============================================================
// AUDIT (3 sub-pages)
// =============================================================
function ScreenAuditTrades() {
  const [filter, setFilter] = us4('');
  const [ruleFilter, setRuleFilter] = us4('all');
  const filtered = MOCK.rejected.filter(r =>
    (filter === '' || r.trade_id.includes(filter) || r.rule_description.toLowerCase().includes(filter.toLowerCase())) &&
    (ruleFilter === 'all' || r.rule_id === ruleFilter)
  );
  return (
    <div data-screen-label="07a Audit · Rejected" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Panel title={`Rejected Trades · ${filtered.length} of ${MOCK.rejected.length}`}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search trade_id / rule…" style={{ ...inputBox, flex: 1, marginTop: 0 }} />
          <select value={ruleFilter} onChange={e => setRuleFilter(e.target.value)} style={{ ...inputBox, marginTop: 0, width: 140, appearance: 'menulist' }}>
            <option value="all">ALL RULES</option>
            {MOCK.rules.map(r => <option key={r.id} value={r.id}>{r.id}</option>)}
          </select>
          <Btn kind="solid">EXPORT JSON</Btn>
          <Btn kind="solid">EXPORT CSV</Btn>
        </div>
        <div style={{ maxHeight: 540, overflow: 'auto' }}>
          <Table dense sticky cols={[
            { label: 'TIMESTAMP_UTC', render: r => <span style={{ color: 'var(--muted)' }}>{fmt.dt(r.ts)}</span> },
            { label: 'TRADE_ID', render: r => r.trade_id },
            { label: 'RULE', render: r => <Badge tone="crit">{r.rule_id}</Badge> },
            { label: 'DESCRIPTION', render: r => <span style={{ color: 'var(--fg)' }}>{r.rule_description}</span> },
            { label: 'FIELD', render: r => <span style={{ color: '#a78bfa' }}>{r.field}</span> },
            { label: 'VALUE', render: r => <span style={{ color: '#f87171' }}>{r.value}</span> },
          ]} rows={filtered.slice(0, 50)} />
        </div>
        <div style={{ padding: '10px 0 0', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
          <span>SHOWING 1—{Math.min(50, filtered.length)} OF {filtered.length}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn disabled>← PREV</Btn>
            <Btn>NEXT →</Btn>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ScreenAuditPipeline() {
  const groupedByRun = MOCK.runs.slice(0, 8);
  const [expanded, setExpanded] = us4({});
  return (
    <div data-screen-label="07b Audit · Pipeline" style={{ padding: 16 }}>
      <Panel title={`Pipeline Runs · ${groupedByRun.length} runs · 32 stage events`}
        right={<div style={{ display: 'flex', gap: 6 }}><Btn kind="solid">EXPORT JSON</Btn><Btn kind="solid">EXPORT CSV</Btn></div>}>
        {groupedByRun.map(r => {
          const isOpen = expanded[r.run_id];
          return (
            <div key={r.run_id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div onClick={() => setExpanded(s => ({ ...s, [r.run_id]: !s[r.run_id] }))} style={{
                display: 'grid', gridTemplateColumns: '20px 1fr 110px 90px 110px 70px 60px',
                padding: '8px 6px', alignItems: 'center', cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: 11,
              }}>
                <span style={{ color: 'var(--muted)' }}>{isOpen ? '▾' : '▸'}</span>
                <span>{r.run_id}</span>
                <span style={{ color: 'var(--muted)' }}>{fmt.dt(r.started_at)}</span>
                <Badge tone={r.mode === 'kafka' ? 'accent' : 'neutral'}>{r.mode}</Badge>
                <Badge tone="ok">● 4/4 OK</Badge>
                <span style={{ textAlign: 'right' }}>{fmt.dur(r.duration_ms)}</span>
                <span style={{ textAlign: 'right', color: r.quality_score >= 80 ? '#4ade80' : '#fbbf24' }}>{r.quality_score}</span>
              </div>
              {isOpen && (
                <div style={{ background: 'var(--bg)', padding: '6px 20px 12px' }}>
                  {['GENERATE', 'EXTRACT', 'VALIDATE', 'TRANSFORM'].map((stg, i) => (
                    <div key={stg} style={{
                      display: 'grid', gridTemplateColumns: '14px 100px 1fr 80px 80px 90px',
                      padding: '4px 0', fontFamily: 'var(--mono)', fontSize: 10, alignItems: 'center',
                    }}>
                      <span style={{ color: '#4ade80' }}>✓</span>
                      <Badge tone="ok">{stg}</Badge>
                      <span style={{ color: 'var(--muted)' }}>{fmt.dt(r.started_at).slice(0, 19)} +{i * 230}ms</span>
                      <span style={{ textAlign: 'right', color: 'var(--muted)' }}>{fmt.num(r.trades_in)} in</span>
                      <span style={{ textAlign: 'right', color: 'var(--muted)' }}>{fmt.num(r.trades_out)} out</span>
                      <span style={{ textAlign: 'right' }}>{Math.round(r.duration_ms / 4)}ms</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

function ScreenAuditAccess() {
  const [codeFilter, setCodeFilter] = us4('all');
  const data = MOCK.apiAccess.filter(r =>
    codeFilter === 'all' ||
    (codeFilter === '2xx' && r.code < 300) ||
    (codeFilter === '4xx' && r.code >= 400 && r.code < 500) ||
    (codeFilter === '5xx' && r.code >= 500)
  );
  return (
    <div data-screen-label="07c Audit · Access" style={{ padding: 16 }}>
      <Panel title={`API Access · ${data.length} of ${MOCK.apiAccess.length} requests`}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          {[['all', 'ALL'], ['2xx', '2XX'], ['4xx', '4XX'], ['5xx', '5XX']].map(([id, l]) => (
            <button key={id} onClick={() => setCodeFilter(id)} style={{
              padding: '4px 10px', background: codeFilter === id ? '#1a1f2a' : 'transparent',
              border: '1px solid var(--border)', color: codeFilter === id ? '#4ade80' : 'var(--fg)',
              fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer', borderRadius: 2,
            }}>{l}</button>
          ))}
          <span style={{ marginLeft: 'auto' }} />
          <Btn kind="solid">EXPORT JSON</Btn>
          <Btn kind="solid">EXPORT CSV</Btn>
        </div>
        <div style={{ maxHeight: 540, overflow: 'auto' }}>
          <Table dense sticky cols={[
            { label: 'TIMESTAMP_UTC', render: r => <span style={{ color: 'var(--muted)' }}>{fmt.dt(r.ts)}</span> },
            { label: 'METHOD', render: r => <Badge tone={r.method === 'GET' ? 'info' : 'accent'}>{r.method}</Badge> },
            { label: 'ENDPOINT', render: r => <span style={{ color: 'var(--fg)' }}>{r.endpoint}</span> },
            { label: 'CODE', align: 'right', render: r => (
              <Badge tone={r.code < 300 ? 'ok' : r.code < 500 ? 'warn' : 'crit'}>{r.code}</Badge>
            )},
            { label: 'ACTOR (IP)', render: r => <span style={{ color: 'var(--muted)' }}>{r.actor}</span> },
          ]} rows={data} />
        </div>
      </Panel>
    </div>
  );
}

// =============================================================
// HISTORY
// =============================================================
function ScreenHistory() {
  const [selected, setSelected] = us4([]);
  const [compare, setCompare] = us4(false);
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  return (
    <div data-screen-label="08 History" style={{ padding: 16 }}>
      <Panel title={`Pipeline Run History · ${MOCK.runs.length} runs`}
        right={<div style={{ display: 'flex', gap: 6 }}>
          <Btn kind={selected.length >= 2 ? 'primary' : 'solid'}
            disabled={selected.length < 2}
            onClick={() => setCompare(true)}>
            COMPARE {selected.length}/{selected.length >= 2 ? selected.length : 2}
          </Btn>
          <Btn kind="solid">EXPORT</Btn>
        </div>}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input placeholder="Filter run_id…" style={{ ...inputBox, flex: 1, marginTop: 0 }} />
          <select style={{ ...inputBox, marginTop: 0, width: 120, appearance: 'menulist' }}>
            <option>ALL MODES</option><option>dataframe</option><option>kafka</option><option>csv</option><option>api</option>
          </select>
          <select style={{ ...inputBox, marginTop: 0, width: 130, appearance: 'menulist' }}>
            <option>SCORE: ANY</option><option>SCORE ≥ 80</option><option>SCORE 60—80</option><option>SCORE &lt; 60</option>
          </select>
          <input type="date" style={{ ...inputBox, marginTop: 0, width: 140 }} />
        </div>
        <div style={{ maxHeight: 540, overflow: 'auto' }}>
          <Table dense sticky cols={[
            { label: '', render: r => <input type="checkbox" checked={selected.includes(r.run_id)} onChange={() => toggle(r.run_id)} style={{ accentColor: '#4ade80' }} /> },
            { label: 'RUN_ID', render: r => r.run_id },
            { label: 'STARTED', render: r => <span style={{ color: 'var(--muted)' }}>{fmt.dt(r.started_at)}</span> },
            { label: 'MODE', render: r => <Badge tone={r.mode === 'kafka' ? 'accent' : 'neutral'}>{r.mode}</Badge> },
            { label: 'DURATION', align: 'right', render: r => fmt.dur(r.duration_ms) },
            { label: 'IN', align: 'right', render: r => fmt.num(r.trades_in) },
            { label: 'OUT', align: 'right', render: r => fmt.num(r.trades_out) },
            { label: 'REJ', align: 'right', render: r => <span style={{ color: '#f87171' }}>{r.trades_in - r.trades_out}</span> },
            { label: 'NOTIONAL', align: 'right', render: r => fmt.usd(r.notional) },
            { label: 'SCORE', align: 'right', render: r => <span style={{ color: r.quality_score >= 80 ? '#4ade80' : '#fbbf24' }}>{r.quality_score}</span> },
            { label: 'TAGS', render: () => <Badge>prod</Badge> },
          ]} rows={MOCK.runs} />
        </div>
      </Panel>
      {compare && <CompareModal runs={MOCK.runs.filter(r => selected.includes(r.run_id))} onClose={() => setCompare(false)} />}
    </div>
  );
}

const CompareModal = ({ runs, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '90%', maxWidth: 1100, maxHeight: '85vh', overflow: 'auto',
      background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 2,
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg)' }}>COMPARE · {runs.length} RUNS</span>
        <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--muted)' }}>✕</span>
      </div>
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: `200px repeat(${runs.length}, 1fr)`, gap: 12, fontFamily: 'var(--mono)', fontSize: 11 }}>
        <div />
        {runs.map(r => <div key={r.run_id} style={{ color: 'var(--fg)' }}>{fmt.short(r.run_id, 20)}</div>)}
        {[
          ['STARTED', r => fmt.dt(r.started_at)],
          ['MODE', r => r.mode],
          ['DURATION', r => fmt.dur(r.duration_ms)],
          ['TRADES IN', r => fmt.num(r.trades_in)],
          ['TRADES OUT', r => fmt.num(r.trades_out)],
          ['REJECTED', r => fmt.num(r.trades_in - r.trades_out)],
          ['NOTIONAL', r => fmt.usd(r.notional)],
          ['SCORE', r => r.quality_score],
        ].map(([k, fn]) => (
          <React.Fragment key={k}>
            <div style={{ color: 'var(--muted)' }}>{k}</div>
            {runs.map(r => <div key={r.run_id}>{fn(r)}</div>)}
          </React.Fragment>
        ))}
      </div>
    </div>
  </div>
);

// =============================================================
// SETTINGS
// =============================================================
function ScreenSettings() {
  const [tab, setTab] = us4('thresholds');
  return (
    <div data-screen-label="09 Settings" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {[['general', 'GENERAL'], ['thresholds', 'VALIDATOR THRESHOLDS'], ['catalogs', 'GENERATOR CATALOGS'], ['retention', 'AUDIT RETENTION'], ['api', 'API'], ['kafka', 'KAFKA CLUSTERS']].map(([id, l]) => (
          <div key={id} onClick={() => setTab(id)} style={{
            padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 0.6, cursor: 'pointer',
            color: tab === id ? '#4ade80' : 'var(--muted)',
            borderBottom: tab === id ? '2px solid #4ade80' : '2px solid transparent',
          }}>{l}</div>
        ))}
      </div>

      {tab === 'thresholds' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Panel title="Critical Rules">
            <Field label="NOTIONAL_TOLERANCE" hint="RV-05 · |notional − price·qty|"><input defaultValue="0.01" style={inputBox} /></Field>
            <Field label="TIMESTAMP_WINDOW_SECONDS" hint="RV-06"><input defaultValue="86400" style={inputBox} /></Field>
            <Field label="REQUIRED_FIELDS" hint="RV-01"><input defaultValue="trade_id, timestamp, side, price, quantity, currency" style={inputBox} /></Field>
          </Panel>
          <Panel title="Business Rules">
            <Field label="PRICE_BAND_PCT" hint="RV-08"><input defaultValue="0.05" style={inputBox} /></Field>
            <Field label="MAX_TRADER_NOTIONAL" hint="RV-09"><input defaultValue="50000000" style={inputBox} /></Field>
            <Field label="COUNTERPARTY_MAX_PCT" hint="RV-11"><input defaultValue="0.20" style={inputBox} /></Field>
            <Field label="VENUE_WHITELIST_PATH" hint="RV-12"><input defaultValue="config/venues.yaml" style={inputBox} /></Field>
          </Panel>
          <Panel title="Contextual Rules">
            <Field label="WASH_DETECTION_WINDOW_MIN" hint="RV-13"><input defaultValue="15" style={inputBox} /></Field>
            <Field label="IQR_FACTOR" hint="RV-14"><input defaultValue="3.0" style={inputBox} /></Field>
          </Panel>
          <Panel title="Preview · settings.yaml diff">
            <pre style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg)', margin: 0, lineHeight: 1.5, background: 'var(--bg)', padding: 10, border: '1px solid var(--border)' }}>
{`  validator:
    critical:
-     notional_tolerance: 0.005
+     notional_tolerance: 0.01
      timestamp_window_s: 86400
    business:
      price_band_pct: 0.05
-     max_trader_notional: 30_000_000
+     max_trader_notional: 50_000_000`}
            </pre>
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <Btn kind="primary">SAVE</Btn>
              <Btn>DISCARD</Btn>
            </div>
          </Panel>
        </div>
      )}

      {tab !== 'thresholds' && (
        <Panel title={`${tab.toUpperCase()} · CONFIG`}>
          <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
            ─── {tab.toUpperCase()} CONFIG ───
            <div style={{ marginTop: 8 }}>Editor visual sobre settings.yaml correspondiente</div>
          </div>
        </Panel>
      )}
    </div>
  );
}

Object.assign(window, { ScreenRules, ScreenAuditTrades, ScreenAuditPipeline, ScreenAuditAccess, ScreenHistory, ScreenSettings });
