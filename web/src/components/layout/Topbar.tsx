import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { getHealth, getPipelineHistory } from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/fmt';
import { Btn } from '@/components/ui/Btn';

export function Topbar() {
  const navigate = useNavigate();
  const setCmdkOpen = useStore((s) => s.setCmdkOpen);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const theme = useStore((s) => s.theme);
  const activeRun = useStore((s) => s.activeRun);
  const setActiveRun = useStore((s) => s.setActiveRun);
  const [open, setOpen] = useState(false);

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 10_000,
    retry: false,
  });

  const { data: history } = useQuery({
    queryKey: ['pipeline-history'],
    queryFn: getPipelineHistory,
    refetchInterval: 15_000,
  });

  const apiOk = !!health;
  const recent = (history ?? []).slice().reverse().slice(0, 12);

  return (
    <div
      className="flex items-center justify-between px-4 bg-bg border-b border-border sticky top-0 z-50"
      style={{ height: 44 }}
    >
      <div className="flex items-center gap-4">
        <div className="font-mono font-semibold tracking-widest text-fg" style={{ fontSize: 13 }}>
          <span style={{ color: '#4ade80' }}>▮</span> TRADESYS
          <span className="text-muted font-normal ml-2">v0.4.2</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5 font-mono text-sm">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: apiOk ? '#4ade80' : '#f87171',
              boxShadow: apiOk ? '0 0 0 3px rgba(74,222,128,0.15)' : 'none',
              animation: apiOk ? 'pulse 2s infinite' : 'none',
            }}
          />
          <span className="text-muted">API</span>
          <span style={{ color: apiOk ? '#4ade80' : '#f87171' }}>
            {apiOk ? 'HEALTHY' : 'DOWN'}
          </span>
          <span className="text-muted">· v{health?.version ?? '—'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        <button
          onClick={() => setCmdkOpen(true)}
          className="bg-transparent border border-border rounded-[2px] px-2.5 py-1 flex items-center gap-2 font-mono text-sm text-muted cursor-pointer"
        >
          <span>Search...</span>
          <span className="px-1 border border-border rounded-[2px]" style={{ fontSize: 9 }}>⌘K</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="bg-panel border border-border rounded-[2px] px-2.5 py-1 font-mono text-sm text-fg cursor-pointer flex items-center gap-2"
          >
            <span className="text-muted">RUN</span>
            <span>{activeRun ? fmt.short(activeRun.run_id, 18) : '— none —'}</span>
            {activeRun && (
              <span style={{ color: '#4ade80' }}>{fmt.fixed(activeRun.quality_score, 0)}</span>
            )}
            <span className="text-muted">▾</span>
          </button>
          {open && (
            <div
              className="absolute right-0 bg-panel border border-border rounded-[2px] z-[60] overflow-auto"
              style={{ top: '110%', minWidth: 360, maxHeight: 400, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
            >
              {recent.length === 0 ? (
                <div className="p-3 font-mono text-sm text-muted">— no runs yet —</div>
              ) : (
                recent.map((r) => (
                  <div
                    key={r.run_id}
                    onClick={() => {
                      setActiveRun(r);
                      setOpen(false);
                    }}
                    className="p-2 border-b border-border-soft cursor-pointer font-mono text-sm grid items-center gap-2"
                    style={{ gridTemplateColumns: '1fr 100px 50px' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'var(--row-hover-strong)')
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{fmt.short(r.run_id, 22)}</span>
                    <span className="text-muted text-xs">{fmt.dt(r.started_at).slice(11, 19)}</span>
                    <span
                      className="text-right"
                      style={{
                        color: (r.quality_score ?? 0) >= 80 ? '#4ade80' : '#fbbf24',
                      }}
                    >
                      {fmt.fixed(r.quality_score, 0)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <Btn kind="primary" onClick={() => navigate({ to: '/run' })}>
          ▶ RUN PIPELINE
        </Btn>
        <div className="w-px h-5 bg-border ml-1" />
        <button
          onClick={toggleTheme}
          className="w-7 h-7 rounded-[2px] bg-panel-2 border border-border font-mono text-sm cursor-pointer"
          style={{ color: '#a78bfa' }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'}`}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </div>
  );
}
