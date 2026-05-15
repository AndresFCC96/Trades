import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { testHttpEndpoint } from '@/lib/api/endpoints';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Field, inputBoxStyle } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import type { HttpTestResponse } from '@/lib/api/types';

type Auth = 'none' | 'bearer' | 'api_key';

export function HttpTab() {
  const [url, setUrl] = useState('https://api.example.com/v1/trades');
  const [auth, setAuth] = useState<Auth>('bearer');
  const [token, setToken] = useState('');
  const [hKey, setHKey] = useState('');
  const [hValue, setHValue] = useState('');
  const [extraHeaders, setExtraHeaders] = useState<Record<string, string>>({});

  const testMut = useMutation({
    mutationFn: () =>
      testHttpEndpoint({
        url,
        auth_type: auth,
        token: token || undefined,
        headers: extraHeaders,
      }),
  });

  const addHeader = () => {
    if (!hKey.trim()) return;
    setExtraHeaders((h) => ({ ...h, [hKey.trim()]: hValue }));
    setHKey('');
    setHValue('');
  };
  const removeHeader = (k: string) =>
    setExtraHeaders((h) => {
      const next = { ...h };
      delete next[k];
      return next;
    });

  const result: HttpTestResponse | undefined = testMut.data;

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
                  ['api_key', 'API KEY'],
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
        {auth !== 'none' && (
          <Field
            label={auth === 'bearer' ? 'TOKEN' : 'API KEY'}
            hint="Sent only for this test request; not persisted server-side"
          >
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="••••••••••••••••"
              style={inputBoxStyle}
            />
          </Field>
        )}
        <Field label="HEADERS">
          <div className="grid gap-1" style={{ gridTemplateColumns: '1fr 1fr 24px' }}>
            <input
              value={hKey}
              onChange={(e) => setHKey(e.target.value)}
              placeholder="X-Trace-Id"
              style={inputBoxStyle}
            />
            <input
              value={hValue}
              onChange={(e) => setHValue(e.target.value)}
              placeholder="value"
              style={inputBoxStyle}
            />
            <Btn onClick={addHeader}>+</Btn>
          </div>
          {Object.keys(extraHeaders).length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {Object.entries(extraHeaders).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between font-mono text-xs px-2 py-1"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border-soft)' }}
                >
                  <span>
                    <span className="text-muted">{k}:</span>{' '}
                    <span className="text-fg">{v || '—'}</span>
                  </span>
                  <span
                    onClick={() => removeHeader(k)}
                    className="cursor-pointer text-muted hover:text-crit"
                  >
                    ✕
                  </span>
                </div>
              ))}
            </div>
          )}
        </Field>
        <div className="mt-3.5 flex gap-2">
          <Btn
            kind="solid"
            onClick={() => testMut.mutate()}
            disabled={testMut.isPending}
          >
            {testMut.isPending ? '◐ TESTING…' : '▶ TEST CONNECTION'}
          </Btn>
          <Btn kind="primary" disabled>
            SAVE & USE (backlog)
          </Btn>
        </div>
        <div className="mt-2 font-mono text-[10px] text-muted">
          Save-and-use persists to settings.yaml on disk; coming with the
          settings write-back endpoint.
        </div>
      </Panel>

      <Panel title="Response Preview">
        {result ? (
          <>
            <div className="flex gap-3 mb-3">
              <Badge tone={result.ok ? 'ok' : 'crit'}>
                {result.ok ? 'HTTP' : 'ERR'} {result.status_code ?? '—'}
              </Badge>
              {result.latency_ms != null && (
                <Badge>{result.latency_ms.toFixed(0)}ms</Badge>
              )}
              {!result.ok && result.error && (
                <Badge tone="crit" style={{ maxWidth: 320 }}>
                  {result.error.slice(0, 80)}
                </Badge>
              )}
            </div>
            <pre
              className="font-mono text-xs text-fg m-0"
              style={{
                background: 'var(--bg)',
                padding: 12,
                border: '1px solid var(--border)',
                maxHeight: 360,
                overflow: 'auto',
              }}
            >
              {JSON.stringify(result.sample ?? result.error ?? null, null, 2)}
            </pre>
          </>
        ) : (
          <div
            className="py-10 text-center font-mono text-sm text-muted tracking-wider"
          >
            PRESS "TEST CONNECTION" TO PREVIEW THE RESPONSE
          </div>
        )}
      </Panel>
    </div>
  );
}
