import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getAuditTrades } from '@/lib/api/endpoints';
import { fmt } from '@/lib/fmt';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { Sparkline } from '@/components/charts/Sparkline';
import { useStore } from '@/lib/store';
import type { AuditEvent } from '@/lib/api/types';
import { RULES, GROUP_META, type RuleDef, type RuleGroup } from './catalog';

export function Rules() {
  const addToast = useStore((s) => s.addToast);
  const [openGroups, setOpenGroups] = useState<Record<RuleGroup, boolean>>({
    critical: true,
    business: true,
    context: true,
  });
  const [disabled, setDisabled] = useState<Record<string, boolean>>({});

  const { data: rejections = [] } = useQuery({
    queryKey: ['audit-trades'],
    queryFn: getAuditTrades,
    retry: false,
    refetchInterval: 15_000,
  });

  // Aggregate rejection counts per rule_id from the audit log.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const ev of rejections as AuditEvent[]) {
      const id = ev.rule_id as string | undefined;
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [rejections]);

  const enabledCount = RULES.length - Object.values(disabled).filter(Boolean).length;

  const onToggle = (id: string) => {
    setDisabled((d) => ({ ...d, [id]: !d[id] }));
    addToast(`${id} ${disabled[id] ? 'enabled' : 'disabled'} (local-only)`, 'warn');
  };

  return (
    <div className="p-4 flex flex-col gap-3">
      <Panel
        title={`14 Rules · ${enabledCount} ENABLED · ${RULES.length - enabledCount} DISABLED`}
        right={
          <div className="flex gap-1.5">
            <Btn kind="solid" disabled>
              CONFIGURE THRESHOLDS
            </Btn>
            <Btn kind="primary" disabled>
              SAVE CHANGES
            </Btn>
          </div>
        }
      >
        <div className="font-mono text-sm text-muted">
          Configura las reglas de validación. Toggles y thresholds son visuales
          hasta que el backend exponga <span className="text-fg">/rules</span> y{' '}
          <span className="text-fg">/settings</span>. Los valores actuales viven en{' '}
          <span className="text-fg">config/settings.yaml</span>.
        </div>
      </Panel>

      {(Object.entries(GROUP_META) as Array<[RuleGroup, (typeof GROUP_META)[RuleGroup]]>).map(
        ([gid, g]) => {
          const items = RULES.filter((r) => r.group === gid);
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
                      rule={r}
                      rejected={counts.get(r.id) ?? 0}
                      enabled={!disabled[r.id]}
                      onToggle={() => onToggle(r.id)}
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
}: {
  rule: RuleDef;
  rejected: number;
  enabled: boolean;
  onToggle: () => void;
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
        <Btn>VIEW REJECTED →</Btn>
      </div>
    </div>
  );
}
