import { fmt } from '@/lib/fmt';

export type StageStatus = 'idle' | 'running' | 'ok' | 'fail';

export type Stage = {
  id: string;
  name: string;
  status: StageStatus;
  dur: number | null;
  tin: number | null;
  tout: number | null;
};

export const INITIAL_STAGES: Stage[] = [
  { id: 'generate', name: 'GENERATE', status: 'idle', dur: null, tin: null, tout: null },
  { id: 'extract', name: 'EXTRACT', status: 'idle', dur: null, tin: null, tout: null },
  { id: 'validate', name: 'VALIDATE', status: 'idle', dur: null, tin: null, tout: null },
  { id: 'transform', name: 'TRANSFORM', status: 'idle', dur: null, tin: null, tout: null },
];

const COLOR: Record<StageStatus, string> = {
  ok: '#4ade80',
  running: '#fbbf24',
  fail: '#f87171',
  idle: 'var(--muted)',
};
const ICON: Record<StageStatus, string> = { ok: '✓', running: '◐', fail: '✕', idle: '○' };
const LABEL: Record<StageStatus, string> = {
  idle: '— IDLE',
  running: 'PROCESANDO…',
  ok: 'OK',
  fail: 'FAILED',
};

export function StageStepper({ stages }: { stages: Stage[] }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {stages.map((s) => (
        <StageCard key={s.id} stage={s} />
      ))}
    </div>
  );
}

function StageCard({ stage }: { stage: Stage }) {
  const c = COLOR[stage.status];
  return (
    <div
      className="p-3.5 bg-panel rounded-[2px]"
      style={{ border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-[22px] h-[22px] inline-flex items-center justify-center rounded-[2px] font-mono"
          style={{
            border: `1px solid ${c}`,
            color: c,
            fontSize: 12,
            animation: stage.status === 'running' ? 'spin 1s linear infinite' : 'none',
          }}
        >
          {ICON[stage.status]}
        </span>
        <span className="font-mono text-sm text-fg tracking-wider">{stage.name}</span>
      </div>
      <div className="font-mono text-xs text-muted">{LABEL[stage.status]}</div>
      {stage.dur != null && (
        <div className="mt-1 font-mono text-xs text-fg">
          {fmt.dur(stage.dur)}
          {stage.tin != null && stage.tout != null && (
            <>
              {' · '}
              {fmt.num(stage.tin)}→{fmt.num(stage.tout)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
