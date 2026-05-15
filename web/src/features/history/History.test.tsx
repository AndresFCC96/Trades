import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withQueryClient } from '@/test/utils';

vi.mock('@/lib/api/endpoints', () => ({
  getPipelineHistory: vi.fn(),
}));

import { History } from './History';
import * as endpoints from '@/lib/api/endpoints';

const mkRun = (i: number, score: number, mode = 'dataframe') => ({
  run_id: `run_${i.toString(16).padStart(6, '0')}`,
  started_at: `2026-05-${10 + i}T21:00:00Z`,
  finished_at: `2026-05-${10 + i}T21:00:02Z`,
  duration_ms: 1234,
  mode,
  trades_in: 10000,
  trades_out: 9700,
  quality_score: score,
});

describe('<History />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all runs and filters by score', async () => {
    (endpoints.getPipelineHistory as ReturnType<typeof vi.fn>).mockResolvedValue([
      mkRun(1, 92),
      mkRun(2, 67),
      mkRun(3, 45),
    ]);
    render(withQueryClient(<History />));

    // Wait for the data fetch to land — title's "0 runs (loading…)" appears
    // first, so anchor on a row's run_id instead.
    await waitFor(() => {
      expect(screen.getByText(/run_000001/)).toBeInTheDocument();
    });
    expect(screen.getByText(/run_000002/)).toBeInTheDocument();
    expect(screen.getByText(/run_000003/)).toBeInTheDocument();

    // Filter to score >= 80
    const scoreSelect = screen.getByDisplayValue('SCORE: ANY') as HTMLSelectElement;
    await userEvent.selectOptions(scoreSelect, '>=80');
    expect(screen.getByText(/run_000001/)).toBeInTheDocument();
    expect(screen.queryByText(/run_000002/)).not.toBeInTheDocument();
    expect(screen.queryByText(/run_000003/)).not.toBeInTheDocument();
  });

  it('disables COMPARE until 2 runs are checked', async () => {
    (endpoints.getPipelineHistory as ReturnType<typeof vi.fn>).mockResolvedValue([
      mkRun(1, 92),
      mkRun(2, 67),
    ]);
    render(withQueryClient(<History />));

    await waitFor(() => {
      expect(screen.getByText(/run_000001/)).toBeInTheDocument();
    });
    const compareBtn = screen.getByRole('button', { name: /COMPARE 0/i });
    expect(compareBtn).toBeDisabled();

    const boxes = screen.getAllByRole('checkbox');
    await userEvent.click(boxes[0]);
    expect(screen.getByRole('button', { name: /COMPARE 1/i })).toBeDisabled();
    await userEvent.click(boxes[1]);
    expect(screen.getByRole('button', { name: /COMPARE 2/i })).not.toBeDisabled();
  });
});
