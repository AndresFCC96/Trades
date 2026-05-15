/**
 * Estado UI global con Zustand.
 *   - theme: dark | light (persistido en localStorage)
 *   - activeRun: run seleccionado en el topbar (puede ser null al iniciar)
 *   - toasts: notificaciones efímeras
 *   - cmdkOpen: command palette abierto
 */
import { create } from 'zustand';
import type { Run } from './api/types';

type Theme = 'dark' | 'light';
type ToastTone = 'ok' | 'warn' | 'crit';
type Toast = { id: number; msg: string; tone: ToastTone };

type State = {
  theme: Theme;
  activeRun: Run | null;
  toasts: Toast[];
  cmdkOpen: boolean;

  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setActiveRun: (r: Run | null) => void;
  addToast: (msg: string, tone?: ToastTone) => void;
  removeToast: (id: number) => void;
  setCmdkOpen: (open: boolean) => void;
};

const THEME_KEY = 'tradesys.theme';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_KEY, theme);
  }
}

const initialTheme = readInitialTheme();
applyTheme(initialTheme);

export const useStore = create<State>((set, get) => ({
  theme: initialTheme,
  activeRun: null,
  toasts: [],
  cmdkOpen: false,

  setTheme: (t) => {
    applyTheme(t);
    set({ theme: t });
  },
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
  setActiveRun: (r) => set({ activeRun: r }),
  addToast: (msg, tone = 'ok') =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now() + Math.random(), msg, tone }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setCmdkOpen: (open) => set({ cmdkOpen: open }),
}));
