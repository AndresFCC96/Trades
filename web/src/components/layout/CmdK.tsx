import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useStore } from '@/lib/store';
import { NAV } from './nav';

export function CmdK() {
  const open = useStore((s) => s.cmdkOpen);
  const setOpen = useStore((s) => s.setCmdkOpen);
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  if (!open) return null;
  const filtered = NAV.filter((n) => n.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[200] flex items-start justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', paddingTop: '15vh' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-panel border border-border rounded-[2px]"
        style={{ width: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a command or search…"
          className="w-full px-4 py-3.5 bg-transparent border-none border-b border-border font-mono text-fg outline-none"
          style={{ fontSize: 13, boxSizing: 'border-box', borderBottom: '1px solid var(--border)' }}
        />
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                navigate({ to: n.to });
                setOpen(false);
              }}
              className="px-4 py-2 flex items-center gap-3 font-mono cursor-pointer"
              style={{ fontSize: 12 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover-strong)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="text-muted">{n.icon}</span>
              <span className="text-fg">{n.label}</span>
              <span className="text-muted ml-auto" style={{ fontSize: 10 }}>
                GO
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-4 font-mono text-sm text-muted">— no matches —</div>
          )}
        </div>
      </div>
    </div>
  );
}
