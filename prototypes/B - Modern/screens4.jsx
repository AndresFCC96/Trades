// Screens: Rules, Audit, History, Settings — MODERN
const { useState: ub4 } = React;

// =============================================================
// RULES
// =============================================================
function ScreenRulesB() {
  const [openSections, setOpenSections] = ub4({ critical: true, business: true, context: true });
  const [rules, setRules] = ub4(MOCK.rules);
  const groups = {
    critical: { label: 'Critical', range: 'RV-01 — RV-06', tone: 'crit' },
    business: { label: 'Business', range: 'RV-07 — RV-12', tone: 'warn' },
    context: { label: 'Contextual', range: 'RV-13 — RV-14', tone: 'accent' },
  };
  return (
    <div data-screen-label="06 Validation Rules" style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>14 rules · 12 enabled · 2 disabled</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Cambios aplican al próximo run · valores leídos de <span style={{ fontFamily: 'var(--mono)' }}>settings.yaml</span></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button kind="ghost">Configure thresholds</Button>
            <Button kind="primary">Save changes</Button>
          </div>
        </div>
      </Card>

      {Object.entries(groups).map(([gid, g]) => {
        const items = rules.filter(r => r.group === gid);
        const open = openSections[gid];
        const totalRej = items.reduce((a, b) => a + b.rejected, 0);
        return (
          <div key={gid}>
            <Card padded={false} style={{ overflow: 'hidden' }}>
              <div onClick={() => setOpenSections(s => ({ ...s, [gid]: !s[gid] }))} style={{
                padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
                  <Pill tone={g.tone} dot>{g.label}</Pill>
                  <span style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 600 }}>{items.length} reglas</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{g.range}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--muted)' }}>
                  <span>Total rejected: <span style={{ color: g.tone === 'crit' ? 'var(--crit)' : g.tone === 'warn' ? 'var(--warn)' : 'var(--accent)', fontWeight: 600, fontFamily: 'var(--mono)' }}>{totalRej}</span></span>
                </div>
              </div>
              {open && (
                <div style={{ borderTop: '1px solid var(--border-soft)', padding: 14, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, background: 'var(--bg-soft)' }}>
                  {items.map(r => <RuleCardB key={r.id} rule={r}
                    onToggle={() => setRules(rs => rs.map(x => x.id === r.id ? { ...x, enabled: !x.enabled } : x))} />)}
                </div>
              )}
            </Card>
          </div>
        );
      })}
    </div>
  );
}

const RuleCardB = ({ rule, onToggle }) => {
  const trend = Array.from({ length: 12 }, () => Math.round(Math.random() * rule.rejected));
  const tone = rule.group === 'critical' ? 'crit' : rule.group === 'business' ? 'warn' : 'accent';
  const color = { crit: 'var(--crit)', warn: 'var(--warn)', accent: 'var(--accent)' }[tone];
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14,
      opacity: rule.enabled ? 1 : 0.55,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pill tone={tone}>{rule.id}</Pill>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{rule.name}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{rule.desc}</div>
        </div>
        <Toggle checked={rule.enabled} onChange={onToggle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 12, alignItems: 'center', marginTop: 8 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: 'var(--muted)' }}>Rejected this run</span>
            <span style={{ color, fontFamily: 'var(--mono)', fontWeight: 600 }}>{rule.rejected}</span>
          </div>
          <div style={{ height: 5, background: 'var(--chip)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min((rule.rejected / 40) * 100, 100)}%`, height: '100%', background: color }} />
          </div>
        </div>
        <Spark data={trend} color={color} w={90} h={24} />
      </div>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
        <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
          {rule.group === 'business' && 'threshold: 0.05'}
          {rule.group === 'critical' && 'tolerance: ±0.01'}
          {rule.group === 'context' && 'iqr_factor: 3.0'}
        </span>
        <Button kind="ghost" size="sm">View rejected →</Button>
      </div>
    </div>
  );
};

// =============================================================
// AUDIT
// =============================================================
function ScreenAuditTradesB() {
  const [filter, setFilter] = ub4('');
  const [ruleFilter, setRuleFilter] = ub4('all');
  const filtered = MOCK.rejected.filter(r =>
    (filter === '' || r.trade_id.includes(filter) || r.rule_description.toLowerCase().includes(filter.toLowerCase())) &&
    (ruleFilter === 'all' || r.rule_id === ruleFilter)
  );
  return (
    <div data-screen-label="07a Audit · Rejected" style={{ padding: '20px 28px 28px' }}>
      <Card title="Rejected trades" subtitle={`${filtered.length} of ${MOCK.rejected.length} records`} padded={false}>
        <div style={{ padding: '12px 18px', display: 'flex', gap: 10, borderBottom: '1px solid var(--border-soft)' }}>
          <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search trade_id or rule…" style={{ flex: 1 }} />
          <select value={ruleFilter} onChange={e => setRuleFilter(e.target.value)} style={selectStyle}>
            <option value="all">All rules</option>
            {MOCK.rules.map(r => <option key={r.id} value={r.id}>{r.id}</option>)}
          </select>
          <Button kind="ghost">Export</Button>
        </div>
        <div style={{ maxHeight: 520, overflow: 'auto' }}>
          <TableM sticky cols={[
            { label: 'Timestamp UTC', mono: true, tone: 'muted', render: r => fmt.dt(r.ts) },
            { label: 'Trade ID', mono: true, render: r => r.trade_id },
            { label: 'Rule', render: r => <Pill tone="crit">{r.rule_id}</Pill> },
            { label: 'Description', render: r => r.rule_description },
            { label: 'Field', render: r => <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{r.field}</span> },
            { label: 'Value', render: r => <span style={{ fontFamily: 'var(--mono)', color: 'var(--crit)' }}>{r.value}</span> },
          ]} rows={filtered.slice(0, 60)} />
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--muted)' }}>
          <span>Showing 1—{Math.min(60, filtered.length)} of {filtered.length}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button kind="ghost" size="sm" disabled>← Prev</Button>
            <Button kind="ghost" size="sm">Next →</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ScreenAuditPipelineB() {
  const runs = MOCK.runs.slice(0, 8);
  const [expanded, setExpanded] = ub4({});
  return (
    <div data-screen-label="07b Audit · Pipeline" style={{ padding: '20px 28px 28px' }}>
      <Card title="Pipeline runs" subtitle={`${runs.length} runs · 32 stage events`}
        right={<Button kind="ghost" size="sm">Export</Button>} padded={false}>
        {runs.map(r => {
          const isOpen = expanded[r.run_id];
          return (
            <div key={r.run_id}>
              <div onClick={() => setExpanded(s => ({ ...s, [r.run_id]: !s[r.run_id] }))} style={{
                display: 'grid', gridTemplateColumns: '20px 1fr 130px 90px 100px 80px 60px',
                padding: '12px 18px', alignItems: 'center', gap: 10,
                cursor: 'pointer', borderBottom: '1px solid var(--border-soft)',
                fontSize: 13,
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ color: 'var(--muted)' }}>{isOpen ? '▾' : '▸'}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{r.run_id}</span>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>{fmt.dt(r.started_at).slice(0, 19)}</span>
                <Pill tone={r.mode === 'kafka' ? 'accent' : 'neutral'}>{r.mode}</Pill>
                <Pill tone="ok" dot>4/4 OK</Pill>
                <span style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt.dur(r.duration_ms)}</span>
                <span style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: r.quality_score >= 80 ? 'var(--ok)' : 'var(--warn)', fontWeight: 600 }}>{r.quality_score}</span>
              </div>
              {isOpen && (
                <div style={{ background: 'var(--bg-soft)', padding: '8px 24px 14px' }}>
                  {['Generate', 'Extract', 'Validate', 'Transform'].map((stg, i) => (
                    <div key={stg} style={{
                      display: 'grid', gridTemplateColumns: '20px 110px 1fr 80px 80px 80px',
                      padding: '6px 0', alignItems: 'center', gap: 8, fontSize: 12,
                    }}>
                      <span style={{ color: 'var(--ok)' }}>✓</span>
                      <Pill tone="ok" dot>{stg}</Pill>
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

function ScreenAuditAccessB() {
  const [codeFilter, setCodeFilter] = ub4('all');
  const data = MOCK.apiAccess.filter(r =>
    codeFilter === 'all' ||
    (codeFilter === '2xx' && r.code < 300) ||
    (codeFilter === '4xx' && r.code >= 400 && r.code < 500) ||
    (codeFilter === '5xx' && r.code >= 500)
  );
  return (
    <div data-screen-label="07c Audit · Access" style={{ padding: '20px 28px 28px' }}>
      <Card title="API access log" subtitle={`${data.length} of ${MOCK.apiAccess.length} requests`} padded={false}>
        <div style={{ padding: '12px 18px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--chip)', borderRadius: 8 }}>
            {[['all', 'All'], ['2xx', '2xx'], ['4xx', '4xx'], ['5xx', '5xx']].map(([id, l]) => (
              <button key={id} onClick={() => setCodeFilter(id)} style={{
                padding: '5px 12px', fontSize: 12, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: codeFilter === id ? 'var(--surface)' : 'transparent',
                color: codeFilter === id ? 'var(--fg)' : 'var(--muted)',
                fontWeight: codeFilter === id ? 600 : 500, fontFamily: 'inherit',
                boxShadow: codeFilter === id ? 'var(--shadow-sm)' : 'none',
              }}>{l}</button>
            ))}
          </div>
          <span style={{ marginLeft: 'auto' }} />
          <Button kind="ghost">Export</Button>
        </div>
        <div style={{ maxHeight: 540, overflow: 'auto' }}>
          <TableM sticky cols={[
            { label: 'Timestamp UTC', mono: true, tone: 'muted', render: r => fmt.dt(r.ts) },
            { label: 'Method', render: r => <Pill tone={r.method === 'GET' ? 'info' : 'accent'}>{r.method}</Pill> },
            { label: 'Endpoint', mono: true, render: r => r.endpoint },
            { label: 'Code', align: 'right', render: r => (
              <Pill tone={r.code < 300 ? 'ok' : r.code < 500 ? 'warn' : 'crit'} dot>{r.code}</Pill>
            )},
            { label: 'Actor (IP)', mono: true, tone: 'muted', render: r => r.actor },
          ]} rows={data} />
        </div>
      </Card>
    </div>
  );
}

const selectStyle = {
  padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 13, color: 'var(--fg)', outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
};

// =============================================================
// HISTORY
// =============================================================
function ScreenHistoryB() {
  const [selected, setSelected] = ub4([]);
  const [compare, setCompare] = ub4(false);
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  return (
    <div data-screen-label="08 History" style={{ padding: '20px 28px 28px' }}>
      <Card title="Pipeline run history" subtitle={`${MOCK.runs.length} total runs`}
        right={<div style={{ display: 'flex', gap: 8 }}>
          <Button kind={selected.length >= 2 ? 'primary' : 'ghost'}
            size="sm" disabled={selected.length < 2}
            onClick={() => setCompare(true)}>
            Compare ({selected.length})
          </Button>
          <Button kind="ghost" size="sm">Export</Button>
        </div>}
        padded={false}>
        <div style={{ padding: '12px 18px', display: 'flex', gap: 10, borderBottom: '1px solid var(--border-soft)' }}>
          <Input placeholder="Filter run_id…" style={{ flex: 1 }} />
          <select style={selectStyle}>
            <option>All modes</option><option>dataframe</option><option>kafka</option><option>csv</option><option>api</option>
          </select>
          <select style={selectStyle}>
            <option>Score: any</option><option>≥ 80</option><option>60—80</option><option>&lt; 60</option>
          </select>
          <input type="date" style={selectStyle} />
        </div>
        <div style={{ maxHeight: 540, overflow: 'auto' }}>
          <TableM sticky cols={[
            { label: '', render: r => <input type="checkbox" checked={selected.includes(r.run_id)} onChange={() => toggle(r.run_id)} style={{ accentColor: 'var(--accent)' }} /> },
            { label: 'Run ID', mono: true, render: r => fmt.short(r.run_id, 22) },
            { label: 'Started', tone: 'muted', render: r => fmt.dt(r.started_at).slice(0, 19) },
            { label: 'Mode', render: r => <Pill tone={r.mode === 'kafka' ? 'accent' : 'neutral'}>{r.mode}</Pill> },
            { label: 'Duration', align: 'right', mono: true, render: r => fmt.dur(r.duration_ms) },
            { label: 'In', align: 'right', mono: true, render: r => fmt.num(r.trades_in) },
            { label: 'Out', align: 'right', mono: true, render: r => fmt.num(r.trades_out) },
            { label: 'Rej', align: 'right', mono: true, render: r => <span style={{ color: 'var(--crit)' }}>{r.trades_in - r.trades_out}</span> },
            { label: 'Notional', align: 'right', mono: true, render: r => fmt.usd(r.notional) },
            { label: 'Quality', align: 'right', render: r => <Pill tone={r.quality_score >= 80 ? 'ok' : 'warn'}>{r.quality_score}</Pill> },
            { label: 'Tags', render: () => <Pill>prod</Pill> },
          ]} rows={MOCK.runs} />
        </div>
      </Card>
      {compare && <CompareModalB runs={MOCK.runs.filter(r => selected.includes(r.run_id))} onClose={() => setCompare(false)} />}
    </div>
  );
}

const CompareModalB = ({ runs, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(15,15,25,0.4)', zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, backdropFilter: 'blur(8px)',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '90%', maxWidth: 1100, maxHeight: '85vh', overflow: 'auto',
      background: 'var(--surface)', borderRadius: 14, boxShadow: 'var(--shadow-lg)',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Compare runs</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Side-by-side diff of {runs.length} runs</div>
        </div>
        <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 18, color: 'var(--muted)' }}>✕</span>
      </div>
      <div style={{ padding: 20, display: 'grid', gridTemplateColumns: `200px repeat(${runs.length}, 1fr)`, gap: 12, fontSize: 13 }}>
        <div />
        {runs.map(r => (
          <div key={r.run_id} style={{
            padding: '8px 12px', background: 'var(--bg-soft)', borderRadius: 8,
            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
          }}>{fmt.short(r.run_id, 22)}</div>
        ))}
        {[
          ['Started', r => fmt.dt(r.started_at).slice(0, 19)],
          ['Mode', r => <Pill tone={r.mode === 'kafka' ? 'accent' : 'neutral'}>{r.mode}</Pill>],
          ['Duration', r => fmt.dur(r.duration_ms)],
          ['Trades in', r => fmt.num(r.trades_in)],
          ['Trades out', r => fmt.num(r.trades_out)],
          ['Rejected', r => fmt.num(r.trades_in - r.trades_out)],
          ['Notional', r => fmt.usd(r.notional)],
          ['Quality', r => <Pill tone={r.quality_score >= 80 ? 'ok' : 'warn'}>{r.quality_score}</Pill>],
        ].map(([k, fn]) => (
          <React.Fragment key={k}>
            <div style={{ color: 'var(--muted)', padding: '8px 0' }}>{k}</div>
            {runs.map(r => <div key={r.run_id} style={{ padding: '8px 0', fontFamily: typeof fn(r) === 'string' ? 'var(--mono)' : 'inherit' }}>{fn(r)}</div>)}
          </React.Fragment>
        ))}
      </div>
    </div>
  </div>
);

// =============================================================
// SETTINGS
// =============================================================
function ScreenSettingsB() {
  const [tab, setTab] = ub4('thresholds');
  const tabs = [
    ['general', 'General'], ['thresholds', 'Validator thresholds'], ['catalogs', 'Generator catalogs'],
    ['retention', 'Audit retention'], ['api', 'API'], ['kafka', 'Kafka clusters'],
  ];
  return (
    <div data-screen-label="09 Settings" style={{ padding: '20px 28px 28px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
      <nav>
        {tabs.map(([id, l]) => (
          <div key={id} onClick={() => setTab(id)} style={{
            padding: '8px 12px', cursor: 'pointer', borderRadius: 6, fontSize: 13, marginBottom: 2,
            background: tab === id ? 'var(--accent-soft)' : 'transparent',
            color: tab === id ? 'var(--accent)' : 'var(--fg)',
            fontWeight: tab === id ? 600 : 500,
          }}
            onMouseEnter={e => { if (tab !== id) e.currentTarget.style.background = 'var(--chip)'; }}
            onMouseLeave={e => { if (tab !== id) e.currentTarget.style.background = 'transparent'; }}>
            {l}
          </div>
        ))}
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tab === 'thresholds' && (
          <>
            <Card title="Critical rules" subtitle="RV-01 — RV-06">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Input label="NOTIONAL_TOLERANCE" value="0.01" hint="RV-05 · |notional − price·qty|" />
                <Input label="TIMESTAMP_WINDOW_SECONDS" value="86400" hint="RV-06" />
                <Input label="REQUIRED_FIELDS" value="trade_id, timestamp, side, price, qty, ccy" hint="RV-01" />
                <Input label="TRADE_ID_UNIQUE_SCOPE" value="batch" hint="RV-04" />
              </div>
            </Card>
            <Card title="Business rules" subtitle="RV-07 — RV-12">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Input label="PRICE_BAND_PCT" value="0.05" hint="RV-08" />
                <Input label="MAX_TRADER_NOTIONAL" value="50000000" hint="RV-09" />
                <Input label="COUNTERPARTY_MAX_PCT" value="0.20" hint="RV-11" />
                <Input label="VENUE_WHITELIST_PATH" value="config/venues.yaml" hint="RV-12" />
              </div>
            </Card>
            <Card title="Contextual rules" subtitle="RV-13 — RV-14">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Input label="WASH_DETECTION_WINDOW_MIN" value="15" hint="RV-13" />
                <Input label="IQR_FACTOR" value="3.0" hint="RV-14" />
              </div>
            </Card>
            <Card title="Diff preview" subtitle="settings.yaml">
              <pre style={{
                fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg)', margin: 0, lineHeight: 1.7,
                background: 'var(--bg-soft)', padding: 14, borderRadius: 8,
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
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <Button kind="primary">Save changes</Button>
                <Button kind="ghost">Discard</Button>
              </div>
            </Card>
          </>
        )}
        {tab !== 'thresholds' && (
          <Card title={tabs.find(([id]) => id === tab)[1]}>
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚙</div>
              <div>Editor visual sobre settings.yaml — sección <strong>{tab}</strong></div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenRulesB, ScreenAuditTradesB, ScreenAuditPipelineB, ScreenAuditAccessB, ScreenHistoryB, ScreenSettingsB });
