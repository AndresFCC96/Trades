export type NavItem = {
  id: string;
  label: string;
  icon: string;
  section: 1 | 2 | 3 | 4;
  to: string;
  parent?: string;
};

export const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: '◆', section: 1, to: '/' },
  { id: 'run', label: 'Run Pipeline', icon: '▶', section: 1, to: '/run' },
  { id: 'sources', label: 'Data Sources', icon: '⇣', section: 1, to: '/sources' },

  { id: 'business', label: 'Reports · Business', icon: '▤', section: 2, parent: 'reports', to: '/reports/business' },
  { id: 'quality', label: 'Reports · Quality', icon: '▥', section: 2, parent: 'reports', to: '/reports/quality' },
  { id: 'rules', label: 'Validation Rules', icon: '⊞', section: 2, to: '/rules' },

  { id: 'audit-trades', label: 'Audit · Rejected', icon: '⊟', section: 3, parent: 'audit', to: '/audit/trades' },
  { id: 'audit-pipeline', label: 'Audit · Pipeline', icon: '⊟', section: 3, parent: 'audit', to: '/audit/pipeline' },
  { id: 'audit-access', label: 'Audit · Access', icon: '⊟', section: 3, parent: 'audit', to: '/audit/access' },
  { id: 'history', label: 'History', icon: '◷', section: 3, to: '/history' },

  { id: 'settings', label: 'Settings', icon: '⚙', section: 4, to: '/settings' },
];

export const SECTION_LABELS: Record<number, string> = {
  1: 'MAIN',
  2: 'ANALYSIS',
  3: 'AUDIT',
  4: 'SYSTEM',
};
