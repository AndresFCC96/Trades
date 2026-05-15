import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { withQueryClient } from '@/test/utils';

// Mock router primitives so we don't need a real RouterProvider in tests.
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock API endpoints; tests override these per-case below.
vi.mock('@/lib/api/endpoints', () => ({
  getPipelineHistory: vi.fn(),
  getBusinessReport: vi.fn(),
  getAuditTrades: vi.fn(),
}));

import { Overview } from './Overview';
import * as endpoints from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';

describe('<Overview />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ activeRun: null });
  });

  it('renders the empty state when there is no history', async () => {
    (endpoints.getPipelineHistory as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (endpoints.getBusinessReport as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no run'));
    (endpoints.getAuditTrades as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(withQueryClient(<Overview />));

    // The full empty state renders ONLY when history has loaded as [].
    // Match the CTA description that only lives there (the Table's own
    // emptyLabel also says "NO RUNS YET" while the query is pending).
    await waitFor(() => {
      expect(
        screen.getByText(/Press .* RUN PIPELINE on the top bar/i)
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button');
    const cta = buttons.find((b) =>
      (b.textContent ?? '').toUpperCase().includes('START FIRST RUN')
    );
    expect(cta).toBeDefined();
  });

  it('renders the KPI grid when history has runs', async () => {
    const run = {
      run_id: 'run_abc123',
      started_at: '2026-05-14T21:13:00Z',
      finished_at: '2026-05-14T21:13:02Z',
      duration_ms: 1234,
      mode: 'dataframe',
      trades_in: 10_000,
      trades_out: 9_700,
      quality_score: 87.3,
    };
    (endpoints.getPipelineHistory as ReturnType<typeof vi.fn>).mockResolvedValue([run]);
    (endpoints.getBusinessReport as ReturnType<typeof vi.fn>).mockResolvedValue({
      summary: { total_trades: 9700, total_notional: 1_310_000_000 },
      by_asset_class: [{ asset_class: 'equity' }],
      venue_concentration: [{ venue: 'NYSE' }],
    });
    (endpoints.getAuditTrades as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // Pre-seed the active run so we don't race the auto-select useEffect.
    useStore.setState({ activeRun: run });

    render(withQueryClient(<Overview />));

    await waitFor(() => {
      expect(screen.getByText('Trades Processed')).toBeInTheDocument();
    });
    // 87.3 appears both as KPI value text and inside the Gauge SVG; the
    // grid renders correctly when both nodes are present.
    expect(screen.getAllByText('87.3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Rejected Trades')).toBeInTheDocument();
    expect(screen.getByText('Total Notional (USD)')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('$1.31B')).toBeInTheDocument();
    });
  });
});
