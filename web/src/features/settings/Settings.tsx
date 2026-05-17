import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSettings, persistSettings, putSettings } from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Field, inputBoxStyle } from '@/components/ui/Field';

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
          background: 'rgba(96,165,250,0.06)',
          border: '1px solid rgba(96,165,250,0.3)',
          borderLeft: '3px solid #60a5fa',
          color: '#60a5fa',
        }}
      >
        Live editor backed by <code>GET/PUT /settings</code>. <code>SAVE</code>{' '}
        applies the patch in memory; <code>PERSIST</code> writes the current
        config back to <code>config/settings.yaml</code> on disk (a{' '}
        <code>.bak</code> backup is kept). Without PERSIST, a server restart
        drops the patch.
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
          body="Pipeline name, version, log level and timezone live in `pipeline:`. Editable via PUT /settings with a patch like {pipeline:{log_level:'DEBUG'}}."
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
          body="Bootstrap servers, topic, group_id, security_protocol and buffer policy live under `kafka:`. Use POST /kafka/connect for ad-hoc consumer overrides."
        />
      )}
    </div>
  );
}

// =====================================================================
// Validator thresholds — read from /settings, write via /settings PUT
// =====================================================================
type Critical = {
  notional_tolerance?: number;
  timestamp_window_days?: number;
};
type Business = {
  price_band_pct?: number;
  max_notional_per_trader_usd?: number;
  max_counterparty_concentration_pct?: number;
};
type Contextual = {
  iqr_factor?: number;
};
type Validator = { critical?: Critical; business?: Business; contextual?: Contextual };
type SettingsShape = { validator?: Validator };

function ThresholdsTab() {
  const qc = useQueryClient();
  const addToast = useStore((s) => s.addToast);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    retry: false,
  });

  const [notionalTol, setNotionalTol] = useState('');
  const [tsWindowDays, setTsWindowDays] = useState('');
  const [priceBandPct, setPriceBandPct] = useState('');
  const [maxTraderNotional, setMaxTraderNotional] = useState('');
  const [maxCounterpartyPct, setMaxCounterpartyPct] = useState('');
  const [iqrFactor, setIqrFactor] = useState('');

  // Hydrate locally when settings arrive (and reset on Discard)
  useEffect(() => {
    if (!data) return;
    const v = (data.settings as SettingsShape).validator ?? {};
    setNotionalTol(String(v.critical?.notional_tolerance ?? ''));
    setTsWindowDays(String(v.critical?.timestamp_window_days ?? ''));
    setPriceBandPct(String(v.business?.price_band_pct ?? ''));
    setMaxTraderNotional(String(v.business?.max_notional_per_trader_usd ?? ''));
    setMaxCounterpartyPct(
      String(v.business?.max_counterparty_concentration_pct ?? '')
    );
    setIqrFactor(String(v.contextual?.iqr_factor ?? ''));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () =>
      putSettings({
        validator: {
          critical: {
            notional_tolerance: Number(notionalTol),
            timestamp_window_days: Number(tsWindowDays),
          },
          business: {
            price_band_pct: Number(priceBandPct),
            max_notional_per_trader_usd: Number(maxTraderNotional),
            max_counterparty_concentration_pct: Number(maxCounterpartyPct),
          },
          contextual: { iqr_factor: Number(iqrFactor) },
        },
      }),
    onSuccess: (resp) => {
      qc.setQueryData(['settings'], resp);
      addToast('Settings saved · applies to next run', 'ok');
    },
    onError: (e) => addToast(`Save failed · ${(e as Error).message}`, 'crit'),
  });

  const persistMut = useMutation({
    mutationFn: persistSettings,
    onSuccess: (resp) =>
      addToast(
        `Persisted to ${resp.target}${resp.backup ? ` (backup at ${resp.backup})` : ''}`,
        'ok',
      ),
    onError: (e) => addToast(`Persist failed · ${(e as Error).message}`, 'crit'),
  });

  const yaml = `validator:
  critical:
    notional_tolerance: ${notionalTol || '—'}
    timestamp_window_days: ${tsWindowDays || '—'}
  business:
    price_band_pct: ${priceBandPct || '—'}
    max_notional_per_trader_usd: ${maxTraderNotional || '—'}
    max_counterparty_concentration_pct: ${maxCounterpartyPct || '—'}
  contextual:
    iqr_factor: ${iqrFactor || '—'}`;

  const onDiscard = () => qc.invalidateQueries({ queryKey: ['settings'] });

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <Panel title="Critical Rules">
        <Field label="NOTIONAL_TOLERANCE" hint="RV-05 · |notional − price·qty|">
          <input
            value={notionalTol}
            onChange={(e) => setNotionalTol(e.target.value)}
            style={inputBoxStyle}
            disabled={isLoading}
          />
        </Field>
        <Field label="TIMESTAMP_WINDOW_DAYS" hint="RV-06">
          <input
            value={tsWindowDays}
            onChange={(e) => setTsWindowDays(e.target.value)}
            style={inputBoxStyle}
            disabled={isLoading}
          />
        </Field>
      </Panel>
      <Panel title="Business Rules">
        <Field label="PRICE_BAND_PCT" hint="RV-08">
          <input
            value={priceBandPct}
            onChange={(e) => setPriceBandPct(e.target.value)}
            style={inputBoxStyle}
            disabled={isLoading}
          />
        </Field>
        <Field label="MAX_NOTIONAL_PER_TRADER_USD" hint="RV-09">
          <input
            value={maxTraderNotional}
            onChange={(e) => setMaxTraderNotional(e.target.value)}
            style={inputBoxStyle}
            disabled={isLoading}
          />
        </Field>
        <Field label="MAX_COUNTERPARTY_CONCENTRATION_PCT" hint="RV-11">
          <input
            value={maxCounterpartyPct}
            onChange={(e) => setMaxCounterpartyPct(e.target.value)}
            style={inputBoxStyle}
            disabled={isLoading}
          />
        </Field>
      </Panel>
      <Panel title="Contextual Rules">
        <Field label="IQR_FACTOR" hint="RV-14">
          <input
            value={iqrFactor}
            onChange={(e) => setIqrFactor(e.target.value)}
            style={inputBoxStyle}
            disabled={isLoading}
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
        <div className="mt-2.5 flex gap-1.5 items-center flex-wrap">
          <Btn
            kind="primary"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || isLoading}
          >
            {saveMut.isPending ? 'SAVING…' : 'SAVE'}
          </Btn>
          <Btn onClick={onDiscard} disabled={saveMut.isPending}>
            DISCARD
          </Btn>
          <Btn
            kind="solid"
            onClick={() => persistMut.mutate()}
            disabled={persistMut.isPending || isLoading}
            title="Write the in-memory config back to config/settings.yaml on disk"
          >
            {persistMut.isPending ? 'PERSISTING…' : 'PERSIST TO DISK'}
          </Btn>
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
