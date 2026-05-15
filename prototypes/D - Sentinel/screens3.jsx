// Screens 3: Rules, Audit, History, Settings — SENTINEL
const { useState: uD3 } = React;

// =============================================================
// VALIDATION RULES
// =============================================================
function ScreenRulesD() {
  const [openSections, setOpenSections] = uD3({ critical: true, business: true, context: true });
  const [rules, setRules] = uD3(MOCK.rules);
  const groups = {
    critical: { label: 'Critical Rules', range: 'RV-01 — RV-06', tone: BRICK },
    business: { label: 'Business Rules', range: 'RV-07 — RV-12', tone: AMBER },
    context: { label: 'Contextual Rules', range: 'RV-13 — RV-14', tone: NAVY_2 },
  };
  return (
    <div data-screen-label="06 Validation Rules" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card eyebrow="Rule register" title="Validation rules · register" headerAccent
        right={<div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" style={{ background: 'transparent', color: '#fff', borderColor: GOLD }}>Edit thresholds</Btn>
          <Btn kind="primary" size="sm">Save & sign-off</Btn>
        </div>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)' }}>
          <RecField label="Total rules" value="14" />
          <RecField label="Enabled" value="12" />
          <RecField label="Disabled" value="2" />
          <RecField label="Source" value="settings.yaml" mono />
        </div>
      </Card>

      {Object.entries(groups).map(([gid, g]) => {
        const items = rules.filter(r => r.group === gid);
        const totalRej = items.reduce((a, b) => a + b.rejected, 0);
        const open = openSections[gid];
        return (
          <Card key={gid} eyebrow={g.label} title={g.range}
            right={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{items.length} rules · {totalRej} rejected</span>
              <span onClick={() => setOpenSections(s => ({ ...s, [gid]: !s[gid] }))}
                style={{ cursor: 'pointer', fontSize: 14, color: 'var(--muted)', padding: '0 6px' }}>{open ? '▾' : '▸'}</span>
            </div>}>
            {open && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--border)' }}>
                {items.map(r => <RuleCardD key={r.id} rule={r} tone={g.tone}
                  onToggle={() => setRules(rs => rs.map(x => x.id === r.id ? { ...x, enabled: !x.enabled } : x))} />)}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

const RuleCardD = ({ rule, tone, onToggle }) => {
  const trend = Array.from({ length: 12 }, () => Math.round(Math.random() * rule.rejected));
  return (
    <div style={{ background: 'var(--surface)', padding: 14, opacity: rule.enabled ? 1 : 0.55 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Stamp color={tone}>{rule.id}</Stamp>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{rule.name}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{rule.desc}</div>
        </div>
        <button onClick={onToggle} style={{
          width: 36, height: 18, background: rule.enabled ? FOREST : 'var(--border-strong)',
          border: 'none', cursor: 'pointer', position: 'relative',
        }}>
          <span style={{
            position: 'absolute', top: 2, left: rule.enabled ? 20 : 2,
            width: 14, height: 14, background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 0.15s',
          }} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12, alignItems: 'center', marginTop: 10 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: 'var(--muted)' }}>Rejected this run</span>
            <span style={{ fontFamily: 'var(--mono)', color: tone, fontWeight: 600 }}>{rule.rejected}</span>
          </div>
          <div style={{ height: 5, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div style={{ width: `${Math.min((rule.rejected / 40) * 100, 100)}%`, height: '100%', background: tone }} />
          </div>
        </div>
        <Spark data={trend} color={tone} />
      </div>
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
          {rule.group === 'business' && 'threshold: 0.05'}
          {rule.group === 'critical' && 'tolerance: ±0.01'}
          {rule.group === 'context' && 'iqr_factor: 3.0'}
        </span>
        <Btn size="sm">View rejected →</Btn>
      </div>
    </div>
  );
};

// =============================================================
// AUDIT — Rejected trades
// =============================================================
function ScreenAuditTradesD() {
  const [filter, setFilter] = uD3('');
  const [ruleFilter, setRuleFilter] = uD3('all');
  const filtered = MOCK.rejected.filter(r =>
    (filter === '' || r.trade_id.includes(filter) || r.rule_description.toLowerCase().includes(filter.toLowerCase())) &&
    (ruleFilter === 'all' || r.rule_id === ruleFilter)
  );
  return (
    <div data-screen-label="07a Rejected Trades" style={{ padding: 20 }}>
      <Card eyebrow="Audit log · Form A-01" title={`Rejected trades · ${filtered.length} of ${MOCK.rejected.length}`} headerAccent
        right={<div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" style={{ background: 'transparent', color: '#fff', borderColor: GOLD }}>Export JSON</Btn>
          <Btn size="sm" style={{ background: 'transparent', color: '#fff', borderColor: GOLD }}>Export CSV</Btn>
          <Btn kind="primary" size="sm">PDF</Btn>
        </div>}>
        <div style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, background: 'var(--surface-2)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Field label="Search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="trade_id or rule…" />
          </div>
          <div style={{ width: 160 }}>
            <div style={{ fontSize: 11, color: 'var(--ink)', marginBottom: 4, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Rule</div>
            <select value={ruleFilter} onChange={e => setRuleFilter(e.target.value)} style={selectD}>
              <option value="all">All rules</option>
              {MOCK.rules.map(r => <option key={r.id} value={r.id}>{r.id}</option>)}
            </select>
          </div>
        </div>
        <Tbl cols={[
          { label: 'Timestamp UTC', mono: true, tone: 'muted', render: r => fmt.dt(r.ts) },
          { label: 'Trade ID', mono: true, render: r => r.trade_id },
          { label: 'Rule', render: r => <Stamp color={BRICK}>{r.rule_id}</Stamp> },
          { label: 'Description', render: r => r.rule_description },
          { label: 'Field', mono: true, render: r => <span style={{ color: NAVY_2 }}>{r.field}</span> },
          { label: 'Value', mono: true, render: r => <span style={{ color: BRICK }}>{r.value}</span> },
        ]} rows={filtered.slice(0, 60)} />
        <div style={{ padding: 12, background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
          <span>Showing 1—{Math.min(60, filtered.length)} of {filtered.length}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <Btn size="sm" disabled>← Prev</Btn>
            <Btn size="sm">Next →</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

// =============================================================
// AUDIT — Pipeline runs
// =============================================================
function ScreenAuditPipelineD() {
  const runs = MOCK.runs.slice(0, 8);
  const [expanded, setExpanded] = uD3({});
  return (
    <div data-screen-label="07b Pipeline Audit" style={{ padding: 20 }}>
      <Card eyebrow="Audit log · Form A-02" title="Pipeline runs · stage events" headerAccent
        right={<Btn size="sm" style={{ background: 'transparent', color: '#fff', borderColor: GOLD }}>Export</Btn>}>
        {runs.map(r => {
          const open = expanded[r.run_id];
          return (
            <div key={r.run_id} style={{ borderBottom: '1px solid var(--border)' }}>
              <div onClick={() => setExpanded(s => ({ ...s, [r.run_id]: !s[r.run_id] }))} style={{
                display: 'grid', gridTemplateColumns: '20px 1fr 130px 90px 100px 80px 70px',
                padding: '10px 16px', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13,
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{r.run_id}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{fmt.dt(r.started_at).slice(0, 19)}</span>
                <Stamp color={r.mode === 'kafka' ? GOLD : NAVY}>{r.mode}</Stamp>
                <Stamp color={FOREST}>4/4 OK</Stamp>
                <span style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt.dur(r.duration_ms)}</span>
                <span style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: r.quality_score >= 80 ? FOREST : AMBER }}>{r.quality_score}</span>
              </div>
              {open && (
                <div style={{ padding: '8px 28px 12px', background: 'var(--surface-2)' }}>
                  {['Generate', 'Extract', 'Validate', 'Transform'].map((stg, i) => (
                    <div key={stg} style={{
                      display: 'grid', gridTemplateColumns: '20px 100px 1fr 80px 80px 80px',
                      padding: '4px 0', alignItems: 'center', gap: 10, fontSize: 12,
                    }}>
                      <span style={{ color: FOREST }}>✓</span>
                      <Stamp color={FOREST}>{stg}</Stamp>
                      <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)' }}>+{i * 230}ms</span>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{fmt.num(r.trades_in)} in</span>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{fmt.num(r.trades_out)} out</span>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{Math.round(r.duration_ms / 4)}ms</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// =============================================================
// AUDIT — Access log
// =============================================================
function ScreenAuditAccessD() {
  const [codeFilter, setCodeFilter] = uD3('all');
  const data = MOCK.apiAccess.filter(r =>
    codeFilter === 'all' ||
    (codeFilter === '2xx' && r.code < 300) ||
    (codeFilter === '4xx' && r.code >= 400 && r.code < 500) ||
    (codeFilter === '5xx' && r.code >= 500)
  );
  return (
    <div data-screen-label="07c Access Log" style={{ padding: 20 }}>
      <Card eyebrow="Audit log · Form A-03" title={`API access · ${data.length} of ${MOCK.apiAccess.length} requests`} headerAccent
        right={<Btn size="sm" style={{ background: 'transparent', color: '#fff', borderColor: GOLD }}>Export</Btn>}>
        <div style={{ padding: 12, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          {[['all', 'All'], ['2xx', '2xx Success'], ['4xx', '4xx Client'], ['5xx', '5xx Server']].map(([id, l]) => (
            <button key={id} onClick={() => setCodeFilter(id)} style={{
              padding: '5px 12px', background: codeFilter === id ? NAVY : 'var(--surface)',
              border: `1px solid ${codeFilter === id ? NAVY : 'var(--border-strong)'}`,
              color: codeFilter === id ? '#fff' : NAVY,
              cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: codeFilter === id ? 600 : 500,
            }}>{l}</button>
          ))}
        </div>
        <Tbl cols={[
          { label: 'Timestamp UTC', mono: true, tone: 'muted', render: r => fmt.dt(r.ts) },
          { label: 'Method', render: r => <Stamp color={r.method === 'GET' ? NAVY_2 : GOLD}>{r.method}</Stamp> },
          { label: 'Endpoint', mono: true, render: r => r.endpoint },
          { label: 'Code', align: 'right', render: r => (
            <Stamp color={r.code < 300 ? FOREST : r.code < 500 ? AMBER : BRICK}>{r.code}</Stamp>
          )},
          { label: 'Actor (IP)', mono: true, tone: 'muted', render: r => r.actor },
        ]} rows={data} />
      </Card>
    </div>
  );
}

const selectD = {
  padding: '5px 10px', background: 'var(--surface)', border: '1px solid var(--border-strong)',
  fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)', height: 30, width: '100%',
};

// =============================================================
// HISTORY
// =============================================================
function ScreenHistoryD() {
  const [selected, setSelected] = uD3([]);
  const [compare, setCompare] = uD3(false);
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  return (
    <div data-screen-label="08 History" style={{ padding: 20 }}>
      <Card eyebrow="Run history" title={`Pipeline run history · ${MOCK.runs.length} records`} headerAccent
        right={<div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" style={{ background: 'transparent', color: '#fff', borderColor: GOLD }}>Export</Btn>
          <Btn kind="primary" size="sm" disabled={selected.length < 2} onClick={() => setCompare(true)}>Compare ({selected.length})</Btn>
        </div>}>
        <div style={{ padding: 12, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 140px 140px 140px', gap: 8 }}>
          <Field label="Search" placeholder="Filter run_id…" />
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink)', marginBottom: 4, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Mode</div>
            <select style={selectD}>
              <option>All</option><option>dataframe</option><option>kafka</option><option>csv</option><option>api</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink)', marginBottom: 4, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Score</div>
            <select style={selectD}>
              <option>Any</option><option>≥ 80</option><option>60—80</option><option>&lt; 60</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink)', marginBottom: 4, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Date</div>
            <input type="date" style={selectD} />
          </div>
        </div>
        <Tbl cols={[
          { label: '', render: r => <input type="checkbox" checked={selected.includes(r.run_id)} onChange={() => toggle(r.run_id)} style={{ accentColor: 'var(--ink)' }} /> },
          { label: 'Run ID', mono: true, render: r => fmt.short(r.run_id, 22) },
          { label: 'Started', tone: 'muted', mono: true, render: r => fmt.dt(r.started_at).slice(0, 19) },
          { label: 'Mode', render: r => <Stamp color={r.mode === 'kafka' ? GOLD : NAVY}>{r.mode}</Stamp> },
          { label: 'Duration', align: 'right', mono: true, render: r => fmt.dur(r.duration_ms) },
          { label: 'In', align: 'right', mono: true, render: r => fmt.num(r.trades_in) },
          { label: 'Out', align: 'right', mono: true, render: r => fmt.num(r.trades_out) },
          { label: 'Rej', align: 'right', mono: true, render: r => <span style={{ color: BRICK }}>{r.trades_in - r.trades_out}</span> },
          { label: 'Notional', align: 'right', mono: true, render: r => fmt.usd(r.notional) },
          { label: 'Quality', align: 'right', render: r => <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: r.quality_score >= 80 ? FOREST : AMBER }}>{r.quality_score}</span> },
          { label: 'Tags', render: () => <Stamp>prod</Stamp> },
        ]} rows={MOCK.runs} />
      </Card>

      {compare && (
        <div onClick={() => setCompare(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(10,37,64,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '90%', maxWidth: 1000, maxHeight: '85vh', overflow: 'auto',
            background: 'var(--surface)', border: `1px solid ${NAVY}`,
          }}>
            <div style={{ padding: '14px 18px', background: NAVY, color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600 }}>Compare runs · {selected.length} records</div>
              <span onClick={() => setCompare(false)} style={{ cursor: 'pointer' }}>✕</span>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: `200px repeat(${selected.length}, 1fr)`, gap: 12 }}>
              <div />
              {MOCK.runs.filter(r => selected.includes(r.run_id)).map(r => (
                <div key={r.run_id} style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{fmt.short(r.run_id, 20)}</div>
              ))}
              {[
                ['Started', r => fmt.dt(r.started_at).slice(0, 19)],
                ['Mode', r => r.mode],
                ['Duration', r => fmt.dur(r.duration_ms)],
                ['Trades in', r => fmt.num(r.trades_in)],
                ['Trades out', r => fmt.num(r.trades_out)],
                ['Rejected', r => fmt.num(r.trades_in - r.trades_out)],
                ['Notional', r => fmt.usd(r.notional)],
                ['Quality', r => r.quality_score],
              ].map(([k, fn]) => (
                <React.Fragment key={k}>
                  <div style={{ color: 'var(--muted)', padding: '6px 0', fontSize: 12 }}>{k}</div>
                  {MOCK.runs.filter(r => selected.includes(r.run_id)).map(r => (
                    <div key={r.run_id} style={{ padding: '6px 0', fontSize: 13, fontFamily: 'var(--mono)' }}>{fn(r)}</div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// SETTINGS
// =============================================================
function ScreenSettingsD() {
  const [tab, setTab] = uD3('thresholds');
  const tabs = [
    ['general', 'General'], ['thresholds', 'Validator thresholds'], ['catalogs', 'Generator catalogs'],
    ['retention', 'Audit retention'], ['api', 'API'], ['kafka', 'Kafka clusters'],
  ];
  return (
    <div data-screen-label="09 Settings" style={{ padding: 20, display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
      <Card eyebrow="Configuration" title="Sections">
        <nav>
          {tabs.map(([id, l]) => (
            <div key={id} onClick={() => setTab(id)} style={{
              padding: '10px 14px', cursor: 'pointer', fontSize: 13,
              background: tab === id ? '#eef3f9' : 'transparent',
              borderLeft: tab === id ? `3px solid ${NAVY}` : '3px solid transparent',
              fontWeight: tab === id ? 600 : 500,
              color: tab === id ? NAVY : 'var(--ink)',
              borderBottom: '1px solid var(--border)',
            }}>{l}</div>
          ))}
        </nav>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'thresholds' && (
          <>
            <Card eyebrow="Critical rules" title="RV-01 — RV-06">
              <Pad>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="NOTIONAL_TOLERANCE" value="0.01" hint="RV-05 · |notional − price·qty|" mono required />
                  <Field label="TIMESTAMP_WINDOW_S" value="86400" hint="RV-06" mono required />
                  <Field label="REQUIRED_FIELDS" value="trade_id, timestamp, side, price, qty" hint="RV-01" mono required />
                  <Field label="TRADE_ID_UNIQUE_SCOPE" value="batch" hint="RV-04" required />
                </div>
              </Pad>
            </Card>
            <Card eyebrow="Business rules" title="RV-07 — RV-12">
              <Pad>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="PRICE_BAND_PCT" value="0.05" hint="RV-08" mono required />
                  <Field label="MAX_TRADER_NOTIONAL" value="50000000" hint="RV-09" mono required />
                  <Field label="COUNTERPARTY_MAX_PCT" value="0.20" hint="RV-11" mono required />
                  <Field label="VENUE_WHITELIST_PATH" value="config/venues.yaml" hint="RV-12" mono required />
                </div>
              </Pad>
            </Card>
            <Card eyebrow="Contextual rules" title="RV-13 — RV-14">
              <Pad>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="WASH_DETECTION_WINDOW_MIN" value="15" hint="RV-13" mono required />
                  <Field label="IQR_FACTOR" value="3.0" hint="RV-14" mono required />
                </div>
              </Pad>
            </Card>
            <Card eyebrow="Audit trail" title="Change preview">
              <Pad>
                <pre style={{
                  fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--surface-2)',
                  padding: 14, margin: 0, lineHeight: 1.7, color: 'var(--ink)', border: '1px solid var(--border)',
                }}>
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
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Cambios serán registrados en el audit log con timestamp UTC. Aplican al próximo run.
                  </div>
                  <Btn>Discard</Btn>
                  <Btn kind="primary">Sign & apply</Btn>
                </div>
              </Pad>
            </Card>
          </>
        )}
        {tab !== 'thresholds' && (
          <Card eyebrow="Configuration" title={tabs.find(([id]) => id === tab)[1]}>
            <Pad>
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)', marginBottom: 8 }}>{tabs.find(([id]) => id === tab)[1]}</div>
                <div style={{ fontSize: 13 }}>Editor visual sobre settings.yaml para esta sección</div>
              </div>
            </Pad>
          </Card>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenRulesD, ScreenAuditTradesD, ScreenAuditPipelineD, ScreenAuditAccessD, ScreenHistoryD, ScreenSettingsD });
