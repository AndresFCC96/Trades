import { useRouterState } from '@tanstack/react-router';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/fmt';
import { NAV } from './nav';

export function Breadcrumbs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const activeRun = useStore((s) => s.activeRun);

  // El item más específico cuya `to` matchea el path actual
  const item =
    NAV.slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find((n) => (n.to === '/' ? path === '/' : path.startsWith(n.to))) ?? null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg font-mono text-xs text-muted">
      <span>HOME</span>
      <span>/</span>
      {item?.parent && (
        <>
          <span>{item.parent.toUpperCase()}</span>
          <span>/</span>
        </>
      )}
      <span className="text-fg">{(item?.label ?? '—').toUpperCase()}</span>
      <span className="ml-auto text-muted">
        {activeRun ? (
          <>
            RUN <span className="text-fg">{fmt.short(activeRun.run_id, 22)}</span> ·{' '}
            {fmt.dt(activeRun.started_at)}
          </>
        ) : (
          '— SELECT A RUN —'
        )}
      </span>
    </div>
  );
}
