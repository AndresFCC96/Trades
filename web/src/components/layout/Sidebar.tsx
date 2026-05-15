import { Link, useRouterState } from '@tanstack/react-router';
import { NAV, SECTION_LABELS } from './nav';

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Activo si el pathname empieza con el `to` (exacto para '/', prefix para el resto)
  const isActive = (to: string) => (to === '/' ? path === '/' : path.startsWith(to));

  const grouped = NAV.reduce<Record<number, typeof NAV>>((acc, n) => {
    (acc[n.section] = acc[n.section] || []).push(n);
    return acc;
  }, {});

  return (
    <aside
      className="bg-bg border-r border-border flex flex-col flex-shrink-0 py-3"
      style={{ width: 220 }}
    >
      {Object.entries(grouped).map(([sec, items]) => (
        <div key={sec} className="mb-4">
          <div className="px-4 mb-1 font-mono text-[9px] text-muted tracking-widest">
            {SECTION_LABELS[Number(sec)]}
          </div>
          {items.map((n) => {
            const active = isActive(n.to);
            return (
              <Link
                key={n.id}
                to={n.to}
                className="px-4 py-1.5 flex items-center gap-2.5 font-mono text-sm cursor-pointer relative"
                style={{
                  background: active ? 'rgba(74,222,128,0.06)' : 'transparent',
                  color: active ? '#4ade80' : 'var(--fg)',
                  borderLeft: active ? '2px solid #4ade80' : '2px solid transparent',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--row-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ color: active ? '#4ade80' : 'var(--muted)', width: 10 }}>{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-auto px-4 py-3 border-t border-border">
        <div className="font-mono text-[9px] text-muted tracking-wider">
          BUILD <span className="text-fg">a3f8c19</span>
        </div>
        <div className="font-mono text-[9px] text-muted mt-0.5">
          <span style={{ color: '#4ade80' }}>●</span> main · live
        </div>
      </div>
    </aside>
  );
}
