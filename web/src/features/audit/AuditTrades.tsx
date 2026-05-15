import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getAuditTrades } from '@/lib/api/endpoints';
import { fmt } from '@/lib/fmt';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { inputBoxStyle } from '@/components/ui/Field';
import { Table, type Col } from '@/components/tables/Table';
import type { AuditEvent } from '@/lib/api/types';
import { downloadCsv, downloadJson } from './exportRows';

const PAGE_SIZE = 50;

export function AuditTrades() {
  const [filter, setFilter] = useState('');
  const [ruleFilter, setRuleFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  // Server-side filter + pagination.
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['audit-trades', { page, filter, ruleFilter }],
    queryFn: () =>
      getAuditTrades({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        trade_id: filter || undefined,
        rule_id: ruleFilter !== 'all' ? ruleFilter : undefined,
      }),
    refetchInterval: 10_000,
  });

  // Lightweight separate query to populate the rule_id dropdown without
  // paging through the whole log.
  const { data: dropdownPage } = useQuery({
    queryKey: ['audit-trades', 'rule-ids'],
    queryFn: () => getAuditTrades({ limit: 10_000 }),
  });
  const ruleIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of dropdownPage?.events ?? []) {
      const id = e.rule_id as string | undefined;
      if (id) s.add(id);
    }
    return Array.from(s).sort();
  }, [dropdownPage]);

  const events = pageData?.events ?? [];
  const total = pageData?.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  const cols: Col<AuditEvent>[] = [
    {
      label: 'TIMESTAMP_UTC',
      render: (r) => <span className="text-muted">{fmt.dt((r.timestamp_utc as string) ?? '')}</span>,
    },
    { label: 'TRADE_ID', render: (r) => (r.trade_id as string) ?? '—' },
    {
      label: 'RULE',
      render: (r) => <Badge tone="crit">{(r.rule_id as string) ?? '—'}</Badge>,
    },
    {
      label: 'DESCRIPTION',
      wrap: true,
      render: (r) => <span className="text-fg">{(r.rule_description as string) ?? '—'}</span>,
    },
    {
      label: 'FIELD',
      render: (r) => <span style={{ color: '#a78bfa' }}>{(r.field as string) ?? '—'}</span>,
    },
    {
      label: 'VALUE',
      render: (r) => (
        <span style={{ color: '#f87171' }}>
          {String(r.value_received ?? r.value ?? '—')}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4 flex flex-col gap-3">
      <Panel
        title={`Rejected Trades · ${total} matching${isLoading ? ' (loading…)' : ''}`}
      >
        <div className="flex gap-2 mb-2.5">
          <input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            placeholder="Search trade_id substring (server-side)…"
            style={{ ...inputBoxStyle, flex: 1, marginTop: 0 }}
          />
          <select
            value={ruleFilter}
            onChange={(e) => {
              setRuleFilter(e.target.value);
              setPage(0);
            }}
            style={{ ...inputBoxStyle, marginTop: 0, width: 140, appearance: 'menulist' }}
          >
            <option value="all">ALL RULES</option>
            {ruleIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <Btn
            kind="solid"
            onClick={() => downloadJson(events, 'rejected_trades_page')}
            disabled={events.length === 0}
          >
            EXPORT PAGE JSON
          </Btn>
          <Btn
            kind="solid"
            onClick={() => downloadCsv(events as Array<Record<string, unknown>>, 'rejected_trades_page')}
            disabled={events.length === 0}
          >
            EXPORT PAGE CSV
          </Btn>
        </div>
        <div style={{ maxHeight: 540, overflow: 'auto' }}>
          <Table dense sticky cols={cols} rows={events} emptyLabel="— NO REJECTIONS —" />
        </div>
        <div className="pt-2.5 flex justify-between font-mono text-xs text-muted">
          <span>
            SHOWING {total === 0 ? 0 : page * PAGE_SIZE + 1}—
            {Math.min((page + 1) * PAGE_SIZE, total)} OF {total}
          </span>
          <div className="flex gap-1.5">
            <Btn onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              ← PREV
            </Btn>
            <Btn onClick={() => setPage((p) => p + 1)} disabled={!hasNext}>
              NEXT →
            </Btn>
          </div>
        </div>
      </Panel>
    </div>
  );
}
