import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { withQueryClient } from '@/test/utils';

vi.mock('@/lib/api/endpoints', () => ({
  getBusinessReport: vi.fn(),
  downloadBusinessReport: vi.fn(),
}));

import { BusinessReportScreen } from './Business';
import * as endpoints from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';

const sample = {
  by_asset_class: [
    {
      asset_class: 'equity',
      total_notional: 412_000_000,
      avg_price: 187.42,
      trade_count: 3284,
      buy_count: 1700,
      sell_count: 1584,
      buy_pct: 0.52,
      sell_pct: 0.48,
    },
    {
      asset_class: 'forex',
      total_notional: 521_000_000,
      avg_price: 1.0843,
      trade_count: 2891,
      buy_count: 1400,
      sell_count: 1491,
      buy_pct: 0.48,
      sell_pct: 0.52,
    },
  ],
  risk_distribution: { high: 234, medium: 1284, low: 8329 },
  top_counterparties: [
    { counterparty_id: 'a3f2c19b8d4e5f7a', total_volume: 187_000_000, trade_count: 421 },
  ],
  venue_concentration: [
    { venue: 'NYSE', total_notional: 392_000_000, trade_count: 1200, share: 0.28 },
    { venue: 'NASDAQ', total_notional: 308_000_000, trade_count: 1000, share: 0.22 },
  ],
  by_day: [
    { day: '2026-05-13', trade_count: 9000, total_notional: 850_000_000 },
    { day: '2026-05-14', trade_count: 9384, total_notional: 1_310_000_000 },
  ],
  by_hour: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    trade_count: 100 + h * 10,
    total_notional: 1_000_000,
  })),
  summary: { total_trades: 9384, total_notional: 1_310_000_000 },
};

describe('<BusinessReportScreen />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ activeRun: null });
  });

  it('shows the empty state when the API errors (no run yet)', async () => {
    (endpoints.getBusinessReport as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('No pipeline run yet')
    );
    render(withQueryClient(<BusinessReportScreen />));
    await waitFor(() => {
      expect(screen.getByText(/NO REPORT YET/i)).toBeInTheDocument();
    });
  });

  it('renders the summary banner and asset-class breakdown when the API returns data', async () => {
    (endpoints.getBusinessReport as ReturnType<typeof vi.fn>).mockResolvedValue(sample);
    render(withQueryClient(<BusinessReportScreen />));

    await waitFor(() => {
      expect(screen.getByText('TOTAL TRADES')).toBeInTheDocument();
    });
    // Banner numbers
    expect(screen.getByText('9,384')).toBeInTheDocument();
    expect(screen.getAllByText('$1.31B').length).toBeGreaterThanOrEqual(1);
    // "equity"/"forex" appear both in the table and the donut legend.
    expect(screen.getAllByText('equity').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('forex').length).toBeGreaterThanOrEqual(1);
    // Risk cards
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM RISK')).toBeInTheDocument();
    expect(screen.getByText('LOW RISK')).toBeInTheDocument();
    // Counterparty pseudonymised hex
    expect(screen.getByText('a3f2c19b8d4e5f7a')).toBeInTheDocument();
  });
});
