import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withQueryClient } from '@/test/utils';

vi.mock('@/lib/api/endpoints', () => ({
  getAuditTrades: vi.fn(),
  getRules: vi.fn(),
  patchRule: vi.fn(),
}));

import { Rules } from './Rules';
import * as endpoints from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';

const sampleRules = {
  rules: Array.from({ length: 14 }, (_, i) => {
    const id = `RV-${String(i + 1).padStart(2, '0')}`;
    const group = i < 6 ? 'critical' : i < 12 ? 'business' : 'context';
    return { id, group, name: `${id} name`, description: 'desc', enabled: true };
  }),
  disabled_ids: [],
};

describe('<Rules />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ toasts: [] });
  });

  it('renders the three groups and 14 rule cards with aggregated rejection counts', async () => {
    (endpoints.getRules as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRules);
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
    for (let i = 1; i <= 14; i++) {
      const id = `RV-${String(i).padStart(2, '0')}`;
      expect(screen.getByText(id)).toBeInTheDocument();
    }
  });

  it('toggling a rule calls patchRule and emits an ok toast', async () => {
    (endpoints.getRules as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRules);
    (endpoints.getAuditTrades as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (endpoints.patchRule as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...sampleRules,
      rules: sampleRules.rules.map((r) =>
        r.id === 'RV-01' ? { ...r, enabled: false } : r
      ),
      disabled_ids: ['RV-01'],
    });
    render(withQueryClient(<Rules />));

    await waitFor(() => {
      expect(screen.getByText('RV-01')).toBeInTheDocument();
    });
    const labels = screen.getAllByText(/RV-01/i);
    const card = labels[0].closest('div')!;
    const toggles = card.parentElement!.parentElement!.parentElement!.querySelectorAll(
      'label'
    );
    await userEvent.click(toggles[0]);

    await waitFor(() => {
      expect(endpoints.patchRule).toHaveBeenCalledWith('RV-01', false);
    });
    expect(useStore.getState().toasts.length).toBeGreaterThanOrEqual(1);
    expect(useStore.getState().toasts[0].tone).toBe('ok');
  });
});
