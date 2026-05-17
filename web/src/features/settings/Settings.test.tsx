import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withQueryClient } from '@/test/utils';

vi.mock('@/lib/api/endpoints', () => ({
  getSettings: vi.fn(),
  putSettings: vi.fn(),
  persistSettings: vi.fn(),
}));

import { Settings } from './Settings';
import * as endpoints from '@/lib/api/endpoints';

const sampleSettings = {
  settings: {
    validator: {
      critical: { notional_tolerance: 0.01, timestamp_window_days: 30 },
      business: {
        price_band_pct: 0.2,
        max_notional_per_trader_usd: 5_000_000,
        max_counterparty_concentration_pct: 0.4,
      },
      contextual: { iqr_factor: 3.0 },
    },
  },
};

describe('<Settings />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (endpoints.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue(sampleSettings);
    (endpoints.putSettings as ReturnType<typeof vi.fn>).mockResolvedValue(sampleSettings);
  });

  it('renders the live-editor banner and 6 tabs', async () => {
    render(withQueryClient(<Settings />));
    expect(screen.getByText(/Live editor/i)).toBeInTheDocument();
    for (const t of [
      'GENERAL',
      'VALIDATOR THRESHOLDS',
      'GENERATOR CATALOGS',
      'AUDIT RETENTION',
      'API',
      'KAFKA CLUSTERS',
    ]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });

  it('hydrates the thresholds form from /settings and saves a patch', async () => {
    render(withQueryClient(<Settings />));
    // notional_tolerance from sample = 0.01
    await waitFor(() => {
      expect(screen.getByDisplayValue('0.01')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();

    // Hit SAVE
    await userEvent.click(screen.getByRole('button', { name: /^SAVE$/i }));
    await waitFor(() => {
      expect(endpoints.putSettings).toHaveBeenCalledTimes(1);
    });
    const arg = (endpoints.putSettings as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.validator.critical.notional_tolerance).toBe(0.01);
    expect(arg.validator.business.price_band_pct).toBe(0.2);
    expect(arg.validator.contextual.iqr_factor).toBe(3);
  });

  it('switches to API tab and shows the placeholder body', async () => {
    render(withQueryClient(<Settings />));
    await userEvent.click(screen.getByText('API'));
    expect(screen.getByText(/Host, port, CORS/i)).toBeInTheDocument();
  });

  it('PERSIST TO DISK invokes persistSettings()', async () => {
    (endpoints.persistSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
      persisted: true,
      target: '/tmp/settings.yaml',
      backup: null,
    });
    render(withQueryClient(<Settings />));
    await waitFor(() => {
      expect(screen.getByDisplayValue('0.01')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /PERSIST TO DISK/i }));
    await waitFor(() => {
      expect(endpoints.persistSettings).toHaveBeenCalledTimes(1);
    });
  });
});
