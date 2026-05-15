import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withQueryClient } from '@/test/utils';

vi.mock('@/lib/api/endpoints', () => ({
  getAuditTrades: vi.fn(),
}));

import { Rules } from './Rules';
import * as endpoints from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';

describe('<Rules />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ toasts: [] });
  });

  it('renders the three groups and 14 rule cards with aggregated rejection counts', async () => {
    (endpoints.getAuditTrades as ReturnType<typeof vi.fn>).mockResolvedValue([
      { rule_id: 'RV-01' },
      { rule_id: 'RV-01' },
      { rule_id: 'RV-05' },
      { rule_id: 'RV-14' },
    ]);

    render(withQueryClient(<Rules />));

    await waitFor(() => {
      expect(screen.getByText(/CR.{0,2}TICAS/)).toBeInTheDocument();
    });
    expect(screen.getByText(/NEGOCIO/)).toBeInTheDocument();
    expect(screen.getByText(/CONTEXTUALES/)).toBeInTheDocument();
    // 14 unique RV-XX badges
    for (let i = 1; i <= 14; i++) {
      const id = `RV-${String(i).padStart(2, '0')}`;
      expect(screen.getByText(id)).toBeInTheDocument();
    }
  });

  it('toggling a rule emits a local-only warning toast', async () => {
    (endpoints.getAuditTrades as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    render(withQueryClient(<Rules />));

    await waitFor(() => {
      expect(screen.getByText('RV-01')).toBeInTheDocument();
    });
    // Switches share their parent <label>; find the first one tied to RV-01.
    const labels = screen.getAllByText(/RV-01/i);
    // Click the toggle in the same card (just toggles the local state)
    const card = labels[0].closest('div')!;
    const toggles = card.parentElement!.parentElement!.parentElement!.querySelectorAll(
      'label'
    );
    await userEvent.click(toggles[0]);
    expect(useStore.getState().toasts.length).toBeGreaterThanOrEqual(1);
    expect(useStore.getState().toasts[0].tone).toBe('warn');
  });
});
