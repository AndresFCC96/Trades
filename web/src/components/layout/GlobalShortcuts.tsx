import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

/**
 * Atajos globales montados a nivel app:
 *   ⌘⇧R (Mac) / Ctrl+Shift+R (Win) → Run Pipeline
 *   ⌘K / Ctrl+K                    → command palette (manejado en CmdK)
 *   Esc                            → cierra command palette
 */
export function GlobalShortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        navigate({ to: '/run' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
  return null;
}
