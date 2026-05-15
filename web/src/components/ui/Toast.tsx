import { useEffect } from 'react';
import { useStore } from '@/lib/store';

const COLOR = { ok: '#4ade80', warn: '#fbbf24', crit: '#f87171' };
const ICON = { ok: '✓', warn: '⚠', crit: '✕' };

export function ToastStack() {
  const toasts = useStore((s) => s.toasts);
  const remove = useStore((s) => s.removeToast);
  return (
    <div className="fixed right-4 top-14 z-[300] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} msg={t.msg} tone={t.tone} onClose={() => remove(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  msg,
  tone,
  onClose,
}: {
  id: number;
  msg: string;
  tone: 'ok' | 'warn' | 'crit';
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);
  const c = COLOR[tone];
  return (
    <div
      className="bg-panel rounded-[2px] py-2.5 px-3.5 min-w-[280px] font-mono text-sm text-fg flex items-center gap-2.5"
      style={{ border: `1px solid ${c}`, borderLeft: `3px solid ${c}` }}
    >
      <span style={{ color: c }}>{ICON[tone]}</span>
      <span>{msg}</span>
      <span
        onClick={onClose}
        className="ml-auto cursor-pointer text-muted"
        role="button"
        aria-label="dismiss"
      >
        ✕
      </span>
    </div>
  );
}
