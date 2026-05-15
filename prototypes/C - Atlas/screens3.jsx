// Screens 3: Rules, Audit, History, Settings — ATLAS
const { useState: uC3 } = React;

// =============================================================
// RULES
// =============================================================
function ScreenRulesC() {
  const [openSections, setOpenSections] = uC3({ critical: true, business: true, context: true });
  const [rules, setRules] = uC3(MOCK.rules);
  const groups = {
    critical: { label: 'Critical', range: 'RV-01 — RV-06', color: CHART.red },
    business: { label: 'Business', range: 'RV-07 — RV-12', color: CHART.amber },
    context: { label: 'Contextual', range: 'RV-13 — RV-14', color: CHART.violet },
  };

  return (
    <div data-screen-label="06 Validation Rules">
      <PageHeader chapter="06 · Rules"
        title="Fourteen validation rules in three groups."
        lede="Critical · Business · Contextual. Cada regla puede toggling enable/disable y tiene su threshold configurable." />

      <div style={{ padding: '0 32px 28px' }}>
        <div style={{ borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--rule-strong)', padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 32 }}>
            <span style={{ fontSize: 14 }}><strong style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>14</strong> total</span>
            <span style={{ fontSize: 14 }}><strong style={{ fontFamily: 'var(--serif)', fontSize: 18, color: CHART.green }}>12</strong> enabled</span>
            <span style={{ fontSize: 14 }}><strong style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--muted)' }}>2</strong> disabled</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn>Thresholds</Btn>
            <Btn kind="primary">Save changes</Btn>
          </div>
        </div>

        {Object.entries(groups).map(([gid, g]) => {
          const items = rules.filter(r => r.group === gid);
          const totalRej = items.reduce((a, b) => a + b.rejected, 0);
          const open = openSections[gid];
          return (
            <div key={gid} style={{ marginBottom: 32 }}>
              <div onClick={() => setOpenSections(s => ({ ...s, [gid]: !s[gid] }))} style={{
                padding: '14px 0', borderBottom: '2px solid var(--ink)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
                  <Tag color={g.color}>{g.label}</Tag>
                  <Headline size="md">{g.range}</Headline>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{items.length} rules</span>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: g.color, fontWeight: 600 }}>
                  {totalRej} rejected
                </span>
              </div>
              {open && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--rule)', marginTop: 1 }}>
                  {items.map(r => <RuleCardC key={r.id} rule={r}
                    onToggle={() => setRules(rs => rs.map(x => x.id === r.id ? { ...x, enabled: !x.enabled } : x))} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const RuleCardC = ({ rule, onToggle }) => {
  const trend = Array.from({ length: 12 }, () => Math.round(Math.random() * rule.rejected));
  const color = rule.group === 'critical' ? CHART.red : rule.group === 'business' ? CHART.amber : CHART.violet;
  return (
    <div style={{
      background: 'var(--paper)', padding: 20,
      opacity: rule.enabled ? 1 : 0.5,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color={color}>{rule.id}</Tag>
            <Headline size="sm">{rule.name}</Headline>
          </div>
          <FigCaption style={{ marginTop: 6 }}>{rule.desc}</FigCaption>
        </div>
        <button onClick={onToggle} style={{
          width: 32, height: 18, background: rule.enabled ? CHART.green : 'var(--rule-strong)',
          border: 'none', cursor: 'pointer', position: 'relative', borderRadius: 0,
        }}>
          <span style={{
            position: 'absolute', top: 2, left: rule.enabled ? 16 : 2,
            width: 14, height: 14, background: '#fff', transition: 'left 0.15s',
          }} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 14, alignItems: 'center', marginTop: 14 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
            <span>Rejected this run</span>
            <span style={{ fontFamily: 'var(--mono)', color, fontWeight: 600 }}>{rule.rejected}</span>
          </div>
          <div style={{ height: 3, background: 'var(--chip)' }}>
            <div style={{ width: `${Math.min((rule.rejected / 40) * 100, 100)}%`, height: '100%', background: color }} />
          </div>
        </div>
        <SparkC data={trend} color={color} />
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

const SparkC = ({ data, color }) => {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const w = 100, h = 24;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

// =============================================================
// AUDIT (combined navigation with sub-tabs)
// =============================================================
function ScreenAuditC() {
  const [sub, setSub] = uC3('trades');
  return (
    <div data-screen-label="07 Audit">
      <PageHeader chapter="07 · Audit"
        title="Three audit logs: rejected trades, pipeline runs, API access."
        lede="Trazabilidad completa. Cada registro persiste con timestamp UTC y puede exportarse." />

      <div style={{ padding: '0 32px 28px' }}>
        <div style={{ borderTop: '1px solid var(--ink)', display: 'flex', marginBottom: 24 }}>
          {[['trades', 'Rejected trades'], ['pipeline', 'Pipeline runs'], ['access', 'API access']].map(([id, l]) => (
            <button key={id} onClick={() => setSub(id)} style={{
              padding: '12px 22px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontSize: 13, fontWeight: sub === id ? 600 : 500,
              color: sub === id ? 'var(--ink)' : 'var(--muted)',
              borderBottom: sub === id ? '3px solid var(--ink)' : '3px solid transparent',
              marginTop: -1,
            }}>{l}</button>
          ))}
        </div>

        {sub === 'trades' && <AuditTradesC />}
        {sub === 'pipeline' && <AuditPipelineC />}
        {sub === 'access' && <AuditAccessC />}
      </div>
    </div>
  );
}

function AuditTradesC() {
  const [filter, setFilter] = uC3('');
  const [ruleFilter, setRuleFilter] = uC3('all');
  const filtered = MOCK.rejected.filter(r =>
    (filter === '' || r.trade_id.includes(filter) || r.rule_description.toLowerCase().includes(filter.toLowerCase())) &&
    (ruleFilter === 'all' || r.rule_id === ruleFilter)
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <Eyebrow>Rejected trades</Eyebrow>
          <Headline size="md" style={{ marginTop: 6 }}>{filtered.length} of {MOCK.rejected.length} records</Headline>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn>Export JSON</Btn>
          <Btn>Export CSV</Btn>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search trade_id or rule…"
          style={inputC} />
        <select value={ruleFilter} onChange={e => setRuleFilter(e.target.value)} style={{ ...inputC, width: 140 }}>
          <option value="all">All rules</option>
          {MOCK.rules.map(r => <option key={r.id} value={r.id}>{r.id}</option>)}
        </select>
      </div>
      <Tbl cols={[
        { label: 'Timestamp UTC', mono: true, tone: 'muted', render: r => fmt.dt(r.ts) },
        { label: 'Trade ID', mono: true, render: r => r.trade_id },
        { label: 'Rule', render: r => <Tag color={CHART.red}>{r.rule_id}</Tag> },
        { label: 'Description', render: r => r.rule_description },
        { label: 'Field', mono: true, render: r => <span style={{ color: CHART.violet }}>{r.field}</span> },
        { label: 'Value', mono: true, render: r => <span style={{ color: CHART.red }}>{r.value}</span> },
      ]} rows={filtered.slice(0, 60)} />
    </div>
  );
}

function AuditPipelineC() {
  const runs = MOCK.runs.slice(0, 10);
  const [expanded, setExpanded] = uC3({});
  return (
    <div>
      <Eyebrow>Pipeline runs</Eyebrow>
      <Headline size="md" style={{ marginTop: 6, marginBottom: 20 }}>{runs.length} runs · 40 stage events</Headline>
      <div style={{ borderTop: '2px solid var(--ink)' }}>
        {runs.map(r => {
          const open = expanded[r.run_id];
          return (
            <div key={r.run_id} style={{ borderBottom: '1px solid var(--rule)' }}>
              <div onClick={() => setExpanded(s => ({ ...s, [r.run_id]: !s[r.run_id] }))} style={{
                display: 'grid', gridTemplateColumns: '20px 1fr 140px 100px 110px 80px 70px',
                gap: 10, padding: '10px 0', cursor: 'pointer', alignItems: 'center', fontSize: 13,
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{r.run_id}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{fmt.dt(r.started_at).slice(0, 19)}</span>
                <Tag color={r.mode === 'kafka' ? CHART.violet : 'var(--ink)'}>{r.mode}</Tag>
                <Tag color={CHART.green}>4/4 OK</Tag>
                <span style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt.dur(r.duration_ms)}</span>
                <span style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: r.quality_score >= 80 ? CHART.green : CHART.amber }}>{r.quality_score}</span>
              </div>
              {open && (
                <div style={{ padding: '8px 28px 14px', background: 'var(--chip)' }}>
                  {['Generate', 'Extract', 'Validate', 'Transform'].map((stg, i) => (
                    <div key={stg} style={{
                      display: 'grid', gridTemplateColumns: '20px 100px 1fr 80px 80px 80px',
                      gap: 10, padding: '4px 0', fontSize: 12, alignItems: 'center',
                    }}>
                      <span style={{ color: CHART.green }}>✓</span>
                      <Tag color={CHART.green}>{stg}</Tag>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>+{i * 230}ms</span>
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
      </div>
    </div>
  );
}

function AuditAccessC() {
  const [codeFilter, setCodeFilter] = uC3('all');
  const data = MOCK.apiAccess.filter(r =>
    codeFilter === 'all' ||
    (codeFilter === '2xx' && r.code < 300) ||
    (codeFilter === '4xx' && r.code >= 400 && r.code < 500) ||
    (codeFilter === '5xx' && r.code >= 500)
  );
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <Eyebrow>API access</Eyebrow>
          <Headline size="md" style={{ marginTop: 6 }}>{data.length} of {MOCK.apiAccess.length} requests</Headline>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all', 'All'], ['2xx', '2xx'], ['4xx', '4xx'], ['5xx', '5xx']].map(([id, l]) => (
            <button key={id} onClick={() => setCodeFilter(id)} style={{
              padding: '6px 14px', background: codeFilter === id ? 'var(--ink)' : 'transparent',
              border: '1px solid var(--rule-strong)', color: codeFilter === id ? 'var(--paper)' : 'var(--ink)',
              cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12,
            }}>{l}</button>
          ))}
          <Btn>Export</Btn>
        </div>
      </div>
      <Tbl cols={[
        { label: 'Timestamp UTC', mono: true, tone: 'muted', render: r => fmt.dt(r.ts) },
        { label: 'Method', render: r => <Tag color={r.method === 'GET' ? CHART.blue : CHART.violet}>{r.method}</Tag> },
        { label: 'Endpoint', mono: true, render: r => r.endpoint },
        { label: 'Code', align: 'right', render: r => (
          <Tag color={r.code < 300 ? CHART.green : r.code < 500 ? CHART.amber : CHART.red}>{r.code}</Tag>
        )},
        { label: 'Actor', mono: true, tone: 'muted', render: r => r.actor },
      ]} rows={data} />
    </div>
  );
}

const inputC = {
  padding: '6px 10px', border: 'none', borderBottom: '1px solid var(--ink)',
  background: 'transparent', fontSize: 13, color: 'var(--ink)', outline: 'none',
  fontFamily: 'var(--sans)', flex: 1,
};

// =============================================================
// HISTORY
// =============================================================
function ScreenHistoryC() {
  const [selected, setSelected] = uC3([]);
  const [compare, setCompare] = uC3(false);
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  return (
    <div data-screen-label="08 History">
      <PageHeader chapter="08 · History"
        title={`${MOCK.runs.length} pipeline runs to date.`}
        lede="Selecciona 2 o más runs y compáralos lado a lado." />
      <div style={{ padding: '0 32px 28px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', justifyContent: 'space-between' }}>
          <input placeholder="Filter run_id…" style={{ ...inputC, maxWidth: 260 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ ...inputC, width: 120, borderBottom: '1px solid var(--ink)' }}>
              <option>All modes</option><option>dataframe</option><option>kafka</option><option>csv</option><option>api</option>
            </select>
            <select style={{ ...inputC, width: 130 }}>
              <option>Score: any</option><option>≥ 80</option><option>60—80</option><option>&lt; 60</option>
            </select>
            <Btn kind={selected.length >= 2 ? 'primary' : 'ghost'} disabled={selected.length < 2} onClick={() => setCompare(true)}>
              Compare ({selected.length})
            </Btn>
            <Btn>Export</Btn>
          </div>
        </div>
        <Tbl cols={[
          { label: '', render: r => <input type="checkbox" checked={selected.includes(r.run_id)} onChange={() => toggle(r.run_id)} style={{ accentColor: CHART.blue }} /> },
          { label: 'Run ID', mono: true, render: r => fmt.short(r.run_id, 22) },
          { label: 'Started', tone: 'muted', mono: true, render: r => fmt.dt(r.started_at).slice(0, 19) },
          { label: 'Mode', render: r => <Tag color={r.mode === 'kafka' ? CHART.violet : 'var(--ink)'}>{r.mode}</Tag> },
          { label: 'Duration', align: 'right', mono: true, render: r => fmt.dur(r.duration_ms) },
          { label: 'In', align: 'right', mono: true, render: r => fmt.num(r.trades_in) },
          { label: 'Out', align: 'right', mono: true, render: r => fmt.num(r.trades_out) },
          { label: 'Rej', align: 'right', mono: true, render: r => <span style={{ color: CHART.red }}>{r.trades_in - r.trades_out}</span> },
          { label: 'Notional', align: 'right', mono: true, render: r => fmt.usd(r.notional) },
          { label: 'Quality', align: 'right', render: r => <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: r.quality_score >= 80 ? CHART.green : CHART.amber }}>{r.quality_score}</span> },
        ]} rows={MOCK.runs} />

        {compare && (
          <div onClick={() => setCompare(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.4)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              width: '90%', maxWidth: 1000, maxHeight: '80vh', overflow: 'auto',
              background: 'var(--paper)', border: '1px solid var(--ink)', boxShadow: '8px 8px 0 var(--ink)',
            }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--rule-strong)', display: 'flex', justifyContent: 'space-between' }}>
                <Headline size="md">Compare {selected.length} runs</Headline>
                <span onClick={() => setCompare(false)} style={{ cursor: 'pointer', color: 'var(--muted)' }}>✕</span>
              </div>
              <div style={{ padding: 24, display: 'grid', gridTemplateColumns: `200px repeat(${selected.length}, 1fr)`, gap: 12 }}>
                <div />
                {MOCK.runs.filter(r => selected.includes(r.run_id)).map(r => (
                  <div key={r.run_id} style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{fmt.short(r.run_id, 20)}</div>
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
                    <div style={{ color: 'var(--muted)', padding: '8px 0', fontSize: 12 }}>{k}</div>
                    {MOCK.runs.filter(r => selected.includes(r.run_id)).map(r => (
                      <div key={r.run_id} style={{ padding: '8px 0', fontSize: 13, fontFamily: 'var(--mono)' }}>{fn(r)}</div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================
// SETTINGS
// =============================================================
function ScreenSettingsC() {
  const [tab, setTab] = uC3('thresholds');
  const tabs = [
    ['general', 'General'], ['thresholds', 'Validator thresholds'], ['catalogs', 'Generator catalogs'],
    ['retention', 'Audit retention'], ['api', 'API'], ['kafka', 'Kafka clusters'],
  ];
  return (
    <div data-screen-label="09 Settings">
      <PageHeader chapter="09 · Settings"
        title="Configuration."
        lede="Editor visual sobre settings.yaml. Los cambios aplican al próximo run." />
      <div style={{ padding: '0 32px 28px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 40 }}>
        <nav>
          {tabs.map(([id, l]) => (
            <div key={id} onClick={() => setTab(id)} style={{
              padding: '8px 0', cursor: 'pointer', fontSize: 13,
              color: tab === id ? 'var(--ink)' : 'var(--muted)',
              fontWeight: tab === id ? 600 : 500,
              borderBottom: '1px solid var(--rule)',
            }}>
              {l}
            </div>
          ))}
        </nav>
        <div>
          {tab === 'thresholds' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              <div>
                <Eyebrow>Critical rules</Eyebrow>
                <Headline size="md" style={{ marginTop: 6, marginBottom: 20 }}>RV-01 — RV-06</Headline>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <Inp label="NOTIONAL_TOLERANCE" value="0.01" hint="RV-05" />
                  <Inp label="TIMESTAMP_WINDOW_S" value="86400" hint="RV-06" />
                </div>
              </div>
              <div>
                <Eyebrow>Business rules</Eyebrow>
                <Headline size="md" style={{ marginTop: 6, marginBottom: 20 }}>RV-07 — RV-12</Headline>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <Inp label="PRICE_BAND_PCT" value="0.05" hint="RV-08" />
                  <Inp label="MAX_TRADER_NOTIONAL" value="50000000" hint="RV-09" />
                  <Inp label="COUNTERPARTY_MAX_PCT" value="0.20" hint="RV-11" />
                  <Inp label="VENUE_WHITELIST" value="config/venues.yaml" hint="RV-12" />
                </div>
              </div>
              <div>
                <Eyebrow>Contextual rules</Eyebrow>
                <Headline size="md" style={{ marginTop: 6, marginBottom: 20 }}>RV-13 — RV-14</Headline>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <Inp label="WASH_WINDOW_MIN" value="15" hint="RV-13" />
                  <Inp label="IQR_FACTOR" value="3.0" hint="RV-14" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn kind="primary">Save changes</Btn>
                <Btn>Discard</Btn>
              </div>
            </div>
          )}
          {tab !== 'thresholds' && (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <Headline size="md" style={{ color: 'var(--muted)' }}>{tabs.find(([id]) => id === tab)[1]}</Headline>
              <FigCaption style={{ marginTop: 8 }}>Editor visual sobre settings.yaml para esta sección</FigCaption>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenRulesC, ScreenAuditC, ScreenHistoryC, ScreenSettingsC });
