import { useState } from 'react';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Field, inputBoxStyle } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';

type Tab = 'general' | 'thresholds' | 'catalogs' | 'retention' | 'api' | 'kafka';

const TABS: Array<[Tab, string]> = [
  ['general', 'GENERAL'],
  ['thresholds', 'VALIDATOR THRESHOLDS'],
  ['catalogs', 'GENERATOR CATALOGS'],
  ['retention', 'AUDIT RETENTION'],
  ['api', 'API'],
  ['kafka', 'KAFKA CLUSTERS'],
];

export function Settings() {
  const [tab, setTab] = useState<Tab>('thresholds');

  return (
    <div className="p-4 flex flex-col gap-3">
      <div
        className="px-3 py-2 font-mono text-xs"
        style={{
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderLeft: '3px solid #fbbf24',
          color: '#fbbf24',
        }}
      >
        Read-only preview. Edits in this UI do not persist yet —{' '}
        <span className="text-fg">config/settings.yaml</span> is the source of truth.
        Live editing arrives when the backend exposes <code>GET/PUT /settings</code>.
      </div>

      <div className="flex border-b border-border">
        {TABS.map(([id, label]) => (
          <div
            key={id}
            onClick={() => setTab(id)}
            className="px-3.5 py-2 font-mono text-sm tracking-wider cursor-pointer"
            style={{
              color: tab === id ? '#4ade80' : 'var(--muted)',
              borderBottom: tab === id ? '2px solid #4ade80' : '2px solid transparent',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {tab === 'thresholds' && <ThresholdsTab />}
      {tab === 'general' && (
        <Placeholder
          title="General"
          body="Pipeline name, version, log level and timezone live in config/settings.yaml under `pipeline:`."
        />
      )}
      {tab === 'catalogs' && (
        <Placeholder
          title="Generator Catalogs"
          body="Synthetic data catalogs (instruments per asset_class, reference prices, forex pair currencies) live under `generator:`."
        />
      )}
      {tab === 'retention' && (
        <Placeholder
          title="Audit Retention"
          body="JSONL output paths and flush policy live under `audit:`. Retention/rotation is server-side."
        />
      )}
      {tab === 'api' && (
        <Placeholder
          title="API"
          body="Host, port, CORS origins and pseudonymization salt live under `api:`."
        />
      )}
      {tab === 'kafka' && (
        <Placeholder
          title="Kafka Clusters"
          body="Bootstrap servers, topic, group_id, security_protocol and buffer policy live under `kafka:`. Wire a live edit endpoint or use `/kafka/connect` for ad-hoc overrides."
        />
      )}
    </div>
  );
}

// =====================================================================
// Validator thresholds — visual editor, no persistence yet
// =====================================================================
function ThresholdsTab() {
  const [notionalTol, setNotionalTol] = useState('0.01');
  const [tsWindowDays, setTsWindowDays] = useState('30');
  const [priceBandPct, setPriceBandPct] = useState('0.20');
  const [maxTraderNotional, setMaxTraderNotional] = useState('5000000.0');
  const [maxCounterpartyPct, setMaxCounterpartyPct] = useState('0.40');
  const [iqrFactor, setIqrFactor] = useState('3.0');

  const yaml = `validator:
  critical:
    notional_tolerance: ${notionalTol}
    timestamp_window_days: ${tsWindowDays}
  business:
    price_band_pct: ${priceBandPct}
    max_notional_per_trader_usd: ${maxTraderNotional}
    max_counterparty_concentration_pct: ${maxCounterpartyPct}
  contextual:
    iqr_factor: ${iqrFactor}`;

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <Panel title="Critical Rules">
        <Field label="NOTIONAL_TOLERANCE" hint="RV-05 · |notional − price·qty|">
          <input
            value={notionalTol}
            onChange={(e) => setNotionalTol(e.target.value)}
            style={inputBoxStyle}
          />
        </Field>
        <Field label="TIMESTAMP_WINDOW_DAYS" hint="RV-06">
          <input
            value={tsWindowDays}
            onChange={(e) => setTsWindowDays(e.target.value)}
            style={inputBoxStyle}
          />
        </Field>
      </Panel>
      <Panel title="Business Rules">
        <Field label="PRICE_BAND_PCT" hint="RV-08">
          <input
            value={priceBandPct}
            onChange={(e) => setPriceBandPct(e.target.value)}
            style={inputBoxStyle}
          />
        </Field>
        <Field label="MAX_NOTIONAL_PER_TRADER_USD" hint="RV-09">
          <input
            value={maxTraderNotional}
            onChange={(e) => setMaxTraderNotional(e.target.value)}
            style={inputBoxStyle}
          />
        </Field>
        <Field label="MAX_COUNTERPARTY_CONCENTRATION_PCT" hint="RV-11">
          <input
            value={maxCounterpartyPct}
            onChange={(e) => setMaxCounterpartyPct(e.target.value)}
            style={inputBoxStyle}
          />
        </Field>
      </Panel>
      <Panel title="Contextual Rules">
        <Field label="IQR_FACTOR" hint="RV-14">
          <input
            value={iqrFactor}
            onChange={(e) => setIqrFactor(e.target.value)}
            style={inputBoxStyle}
          />
        </Field>
      </Panel>
      <Panel title="Preview · settings.yaml fragment">
        <pre
          className="font-mono text-xs text-fg m-0 leading-relaxed"
          style={{
            background: 'var(--bg)',
            padding: 10,
            border: '1px solid var(--border)',
            borderRadius: 2,
            overflow: 'auto',
          }}
        >
          {yaml}
        </pre>
        <div className="mt-2.5 flex gap-1.5 items-center">
          <Btn kind="primary" disabled>
            SAVE
          </Btn>
          <Btn disabled>DISCARD</Btn>
          <Badge tone="warn">read-only · backend endpoint pending</Badge>
        </div>
      </Panel>
    </div>
  );
}

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <Panel title={`${title.toUpperCase()} · CONFIG`}>
      <div className="py-8 text-center font-mono text-sm">
        <div className="text-fg mb-2">─── {title.toUpperCase()} ───</div>
        <div className="text-muted px-12">{body}</div>
      </div>
    </Panel>
  );
}
