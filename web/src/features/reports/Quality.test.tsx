import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { withQueryClient } from '@/test/utils';

vi.mock('@/lib/api/endpoints', () => ({
  getQualityReport: vi.fn(),
  downloadQualityReport: vi.fn(),
}));

import { QualityReportScreen } from './Quality';
import * as endpoints from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';

const sample = {
  completeness: {
    trade_id: { nulls: 0, pct_null: 0 },
    counterparty_id: { nulls: 612, pct_null: 6.12 },
    venue: { nulls: 28, pct_null: 0.28 },
  },
  uniqueness: 0.9871,
  duplicates: 127,
  consistency: 0.884,
  validity: 0.9272,
  outliers_detected: 384,
  score: 87.3,
  weights: { completeness: 0.25, uniqueness: 0.15, consistency: 0.2, validity: 0.25, outliers: 0.15 },
};

describe('<QualityReportScreen />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      activeRun: {
        run_id: 'run_q1',
        started_at: '2026-05-14T21:13:00Z',
        finished_at: '2026-05-14T21:13:02Z',
        duration_ms: 1234,
        mode: 'dataframe',
        trades_in: 10_000,
        trades_out: 9_700,
        quality_score: 87.3,
      },
    });
  });

  it('shows the empty state when the API errors', async () => {
    (endpoints.getQualityReport as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('No pipeline run yet')
    );
    render(withQueryClient(<QualityReportScreen />));
    await waitFor(() => {
      expect(screen.getByText(/NO REPORT YET/i)).toBeInTheDocument();
    });
  });

  it('renders the gauge, weighted components, completeness table and uniqueness stats', async () => {
    (endpoints.getQualityReport as ReturnType<typeof vi.fn>).mockResolvedValue(sample);
    render(withQueryClient(<QualityReportScreen />));

    await waitFor(() => {
      expect(screen.getByText('WEIGHTED COMPONENTS')).toBeInTheDocument();
    });
    // The 5 component labels live in the weighted-components panel.
    // OUTLIERS also appears as the BigStat sub-label, so use getAllByText.
    ['COMPLETENESS', 'UNIQUENESS', 'CONSISTENCY', 'VALIDITY', 'OUTLIERS'].forEach((l) => {
      expect(screen.getAllByText(l).length).toBeGreaterThanOrEqual(1);
    });
    // Completeness table rows
    expect(screen.getByText('trade_id')).toBeInTheDocument();
    expect(screen.getByText('counterparty_id')).toBeInTheDocument();
    // Uniqueness duplicates BigStat
    expect(screen.getByText('127')).toBeInTheDocument();
    expect(screen.getByText(/duplicate trade_ids/i)).toBeInTheDocument();
    // Outliers BigStat
    expect(screen.getByText('384')).toBeInTheDocument();
  });
});
