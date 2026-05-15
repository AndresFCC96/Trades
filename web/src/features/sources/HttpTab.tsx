import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Field, inputBoxStyle } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';

type Auth = 'none' | 'bearer' | 'apikey';

/**
 * HTTP endpoint configurator. El backend actual no expone "test connection"
 * dedicado — un test real es disparar el pipeline con `mode=api`. Por ahora
 * dejamos el form para configurar, y el botón ▶ va a Run Pipeline con esa
 * config (TODO: wire mode=api con override de URL).
 */
export function HttpTab() {
  const [url, setUrl] = useState('https://api.example.com/v1/trades');
  const [auth, setAuth] = useState<Auth>('bearer');

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <Panel title="Endpoint Configuration">
        <Field label="URL">
          <input value={url} onChange={(e) => setUrl(e.target.value)} style={inputBoxStyle} />
        </Field>
        <div className="mt-3">
          <Field label="AUTH">
            <div className="flex gap-1">
              {(
                [
                  ['none', 'NONE'],
                  ['bearer', 'BEARER'],
                  ['apikey', 'API KEY'],
                ] as Array<[Auth, string]>
              ).map(([id, l]) => (
                <button
                  key={id}
                  onClick={() => setAuth(id)}
                  className="px-3 py-1.5 font-mono text-sm rounded-[2px] cursor-pointer"
                  style={{
                    background: auth === id ? '#1a1f2a' : 'transparent',
                    border: '1px solid var(--border)',
                    color: auth === id ? '#4ade80' : 'var(--fg)',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
        </div>
        {auth === 'bearer' && (
          <Field label="TOKEN" hint="Set TRADES_API_TOKEN env on the server">
            <input type="password" placeholder="••••••••••••••••" style={inputBoxStyle} />
          </Field>
        )}
        {auth === 'apikey' && (
          <Field label="API KEY" hint="Set TRADES_API_TOKEN env on the server (used as X-API-Key)">
            <input type="password" placeholder="••••••••••••••••" style={inputBoxStyle} />
          </Field>
        )}
        <Field label="HEADERS">
          <div className="grid gap-1" style={{ gridTemplateColumns: '1fr 1fr 24px' }}>
            <input placeholder="X-Trace-Id" style={inputBoxStyle} />
            <input placeholder="value" style={inputBoxStyle} />
            <Btn>+</Btn>
          </div>
        </Field>
        <Field label="SCHEDULE">
          <select style={{ ...inputBoxStyle, appearance: 'menulist' }}>
            <option>ON-DEMAND</option>
            <option>EVERY 5 MIN</option>
            <option>EVERY 1 HOUR</option>
            <option>CRON: 0 */6 * * *</option>
          </select>
        </Field>
        <div className="mt-3.5 flex gap-2">
          <Btn kind="solid" disabled>
            ▶ TEST CONNECTION
          </Btn>
          <Btn kind="primary" disabled>
            SAVE & USE
          </Btn>
        </div>
        <div className="mt-2 font-mono text-[10px] text-muted">
          NOTE · backend currently reads HTTP config from `extractor.api` in settings.yaml.
          Live editor and connection-test endpoint are in the backlog.
        </div>
      </Panel>

      <Panel title="Reference · settings.yaml">
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
{`extractor:
  mode: "api"           # csv | api | dataframe
  api:
    url: "${url}"
    auth_type: "${auth === 'apikey' ? 'api_key' : auth}"
    token_env: "TRADES_API_TOKEN"
    timeout_seconds: 30
    params:
      from_date: "auto"
      limit: 10000`}
        </pre>
        <div className="mt-3">
          <Badge tone="info">CURRENT MODE · settings.yaml</Badge>
        </div>
      </Panel>
    </div>
  );
}
