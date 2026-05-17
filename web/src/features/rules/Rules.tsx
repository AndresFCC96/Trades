import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { getAuditTrades, getRules, patchRule } from '@/lib/api/endpoints';
import { fmt } from '@/lib/fmt';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { Sparkline } from '@/components/charts/Sparkline';
import { useStore } from '@/lib/store';
import type { AuditEvent, RulesResponse } from '@/lib/api/types';
import { RULES as FALLBACK_RULES, GROUP_META, type RuleDef, type RuleGroup } from './catalog';

export function Rules() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const addToast = useStore((s) => s.addToast);
  const [openGroups, setOpenGroups] = useState<Record<RuleGroup, boolean>>({
    critical: true,
    business: true,
    context: true,
  });

  const { data: rulesData } = useQuery({
    queryKey: ['rules'],
    queryFn: getRules,
    retry: false,
    refetchInterval: 30_000,
  });

  const { data: rejectionsPage } = useQuery({
    queryKey: ['audit-trades', 'all'],
    queryFn: () => getAuditTrades({ limit: 10_000 }),
    retry: false,
    refetchInterval: 15_000,
  });
  const rejections = rejectionsPage?.events ?? [];

  const patchMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      patchRule(id, enabled),
    onSuccess: (data) => {
      qc.setQueryData(['rules'], data);
    },
    onError: (e) =>
      addToast(`Toggle failed · ${(e as Error).message}`, 'crit'),
  });

  // Fallback to the static catalog when the backend hasn't responded yet
  // (or is down). The shape matches RulesResponse.rules.
  const rules: RulesResponse['rules'] = useMemo(() => {
    if (rulesData) return rulesData.rules;
    return FALLBACK_RULES.map((r) => ({
      id: r.id,
      group: r.group,
      name: r.name,
      description: r.desc,
      enabled: true,
    }));
  }, [rulesData]);

  // Aggregate rejection counts per rule_id from the audit log.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const ev of rejections as AuditEvent[]) {
      const id = ev.rule_id as string | undefined;
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [rejections]);

  const disabledCount = rules.filter((r) => !r.enabled).length;
  const enabledCount = rules.length - disabledCount;

  const onToggle = (id: string, currentlyEnabled: boolean) => {
    patchMut.mutate({ id, enabled: !currentlyEnabled });
    addToast(`${id} ${currentlyEnabled ? 'disabled' : 'enabled'}`, 'ok');
  };

  return (
    <div className="p-4 flex flex-col gap-3">
      <Panel
        title={`14 Rules · ${enabledCount} ENABLED · ${disabledCount} DISABLED`}
      >
        <div className="font-mono text-sm text-muted">
          Toggles persisten en memoria del servidor vía{' '}
          <span className="text-fg">PATCH /rules/:id</span>. Los thresholds se
          editan desde la pantalla{' '}
          <span className="text-fg">Settings</span>. NOTA: el validator
          siempre corre las 14 reglas; el skip real por toggle es un refactor en backlog.
        </div>
      </Panel>

      {(Object.entries(GROUP_META) as Array<[RuleGroup, (typeof GROUP_META)[RuleGroup]]>).map(
        ([gid, g]) => {
          const items = rules.filter((r) => r.group === gid);
          const catalogById = new Map(FALLBACK_RULES.map((r) => [r.id, r]));
          const open = openGroups[gid];
          const groupRejected = items.reduce(
            (acc, r) => acc + (counts.get(r.id) ?? 0),
            0
          );
          return (
            <div key={gid}>
              <div
                onClick={() => setOpenGroups((s) => ({ ...s, [gid]: !s[gid] }))}
                className="flex items-center justify-between cursor-pointer bg-panel px-3.5 py-2.5"
                style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${g.color}` }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="font-mono text-sm tracking-wider"
                    style={{ color: g.color }}
                  >
                    {open ? '▾' : '▸'} {g.label}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {g.range} · {items.length} reglas
                  </span>
                </div>
                <div className="font-mono text-xs text-muted">
                  REJECTED <span style={{ color: g.color }}>{fmt.num(groupRejected)}</span>
                </div>
              </div>
              {open && (
                <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  {items.map((r) => (
                    <RuleCard
                      key={r.id}
                      rule={{
                        id: r.id,
                        group: r.group,
                        name: r.name,
                        desc: r.description,
                        threshold:
                          catalogById.get(r.id)?.threshold ?? '—',
                      }}
                      rejected={counts.get(r.id) ?? 0}
                      enabled={r.enabled}
                      onToggle={() => onToggle(r.id, r.enabled)}
                      onViewRejected={() =>
                        navigate({
                          to: '/audit/trades',
                          search: { rule_id: r.id },
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          );
        }
      )}
    </div>
  );
}

const TONE_BY_GROUP: Record<RuleGroup, Tone> = {
  critical: 'crit',
  business: 'warn',
  context: 'accent',
};
const COLOR_BY_GROUP: Record<RuleGroup, string> = {
  critical: '#f87171',
  business: '#fbbf24',
  context: '#a78bfa',
};

function RuleCard({
  rule,
  rejected,
  enabled,
  onToggle,
  onViewRejected,
}: {
  rule: RuleDef;
  rejected: number;
  enabled: boolean;
  onToggle: () => void;
  onViewRejected: () => void;
}) {
  const color = COLOR_BY_GROUP[rule.group];
  // Synthetic 12-point trend so the sparkline isn't empty; real trend
  // arrives when /audit/trades exposes a per-rule time series.
  const trend = useMemo(
    () => Array.from({ length: 12 }, (_, i) => Math.round((rejected / 12) * (0.5 + (i % 5) / 5))),
    [rejected]
  );

  return (
    <div
      className="bg-panel p-3"
      style={{ border: '1px solid var(--border)', opacity: enabled ? 1 : 0.5 }}
    >
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={TONE_BY_GROUP[rule.group]}>{rule.id}</Badge>
            <span className="font-mono text-sm text-fg">{rule.name}</span>
          </div>
          <div className="font-mono text-xs text-muted mt-1">{rule.desc}</div>
        </div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
      <div
        className="mt-3 grid items-center"
        style={{ gridTemplateColumns: '1fr 80px', gap: 12 }}
      >
        <div>
          <div className="flex justify-between font-mono text-xs text-muted mb-1">
            <span>REJECTED</span>
            <span style={{ color }}>{fmt.num(rejected)}</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)' }}>
            <div
              style={{
                width: `${Math.min((rejected / 40) * 100, 100)}%`,
                height: '100%',
                background: color,
              }}
            />
          </div>
        </div>
        <Sparkline data={trend} color={color} w={80} h={20} />
      </div>
      <div className="mt-2.5 flex justify-between items-center">
        <span className="font-mono text-[9px] text-muted">{rule.threshold}</span>
        <Btn onClick={onViewRejected}>VIEW REJECTED →</Btn>
      </div>
    </div>
  );
}
