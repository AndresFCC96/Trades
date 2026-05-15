import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getAuditAccess } from '@/lib/api/endpoints';
import { fmt } from '@/lib/fmt';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Table, type Col } from '@/components/tables/Table';
import type { AuditEvent } from '@/lib/api/types';
import { downloadCsv, downloadJson } from './exportRows';

type CodeFilter = 'all' | '2xx' | '4xx' | '5xx';

export function AuditAccess() {
  const [filter, setFilter] = useState<CodeFilter>('all');

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['audit-access', filter],
    queryFn: () =>
      getAuditAccess({
        limit: 500,
        code_class: filter === 'all' ? undefined : filter,
      }),
    refetchInterval: 10_000,
  });

  // Backend now applies the code_class filter; the original `events`
  // array is server-filtered.
  const events = pageData?.events ?? [];
  const total = pageData?.total ?? 0;
  const filtered = events;

  const cols: Col<AuditEvent>[] = [
    {
      label: 'TIMESTAMP_UTC',
      render: (r) => <span className="text-muted">{fmt.dt((r.timestamp_utc as string) ?? '')}</span>,
    },
    {
      label: 'METHOD',
      render: (r) => (
        <Badge tone={(r.method as string) === 'GET' ? 'info' : 'accent'}>
          {String(r.method ?? '—')}
        </Badge>
      ),
    },
    {
      label: 'ENDPOINT',
      render: (r) => <span className="text-fg">{(r.endpoint as string) ?? '—'}</span>,
    },
    {
      label: 'CODE',
      align: 'right',
      render: (r) => {
        const c = Number(r.response_code ?? 0);
        const tone = c < 300 ? 'ok' : c < 500 ? 'warn' : 'crit';
        return <Badge tone={tone}>{c}</Badge>;
      },
    },
    {
      label: 'ACTOR (IP)',
      render: (r) => <span className="text-muted">{(r.actor as string) ?? '—'}</span>,
    },
  ];

  return (
    <div className="p-4">
      <Panel
        title={`API Access · ${filtered.length} shown · ${total} matching${isLoading ? ' (loading…)' : ''}`}
      >
        <div className="flex items-center gap-2 mb-2.5">
          {(
            [
              ['all', 'ALL'],
              ['2xx', '2XX'],
              ['4xx', '4XX'],
              ['5xx', '5XX'],
            ] as Array<[CodeFilter, string]>
          ).map(([id, l]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className="font-mono text-sm rounded-[2px] cursor-pointer"
              style={{
                padding: '4px 10px',
                background: filter === id ? '#1a1f2a' : 'transparent',
                border: '1px solid var(--border)',
                color: filter === id ? '#4ade80' : 'var(--fg)',
              }}
            >
              {l}
            </button>
          ))}
          <span className="ml-auto" />
          <Btn
            kind="solid"
            onClick={() => downloadJson(filtered, 'api_access')}
            disabled={filtered.length === 0}
          >
            EXPORT JSON
          </Btn>
          <Btn
            kind="solid"
            onClick={() => downloadCsv(filtered as Array<Record<string, unknown>>, 'api_access')}
            disabled={filtered.length === 0}
          >
            EXPORT CSV
          </Btn>
        </div>
        <div style={{ maxHeight: 540, overflow: 'auto' }}>
          <Table dense sticky cols={cols} rows={filtered} emptyLabel="— NO REQUESTS RECORDED —" />
        </div>
      </Panel>
    </div>
  );
}
