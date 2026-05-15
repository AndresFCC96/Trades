import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withQueryClient } from '@/test/utils';

vi.mock('@/lib/api/endpoints', () => ({
  testHttpEndpoint: vi.fn(),
}));

import { HttpTab } from './HttpTab';
import * as endpoints from '@/lib/api/endpoints';

describe('<HttpTab />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with the empty preview placeholder', () => {
    render(withQueryClient(<HttpTab />));
    expect(screen.getByText(/Endpoint Configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/PRESS "TEST CONNECTION"/i)).toBeInTheDocument();
  });

  it('renders the response preview on success', async () => {
    (endpoints.testHttpEndpoint as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status_code: 200,
      latency_ms: 142.5,
      sample: { type: 'array', count: 487, first: [] },
      error: null,
    });
    render(withQueryClient(<HttpTab />));

    await userEvent.click(
      screen.getByRole('button', { name: /TEST CONNECTION/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/HTTP 200/)).toBeInTheDocument();
    });
    expect(screen.getByText(/143ms/)).toBeInTheDocument(); // toFixed(0) rounds 142.5
    expect(endpoints.testHttpEndpoint).toHaveBeenCalled();
  });

  it('renders the error badge on failure', async () => {
    (endpoints.testHttpEndpoint as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status_code: null,
      latency_ms: 12.3,
      sample: null,
      error: 'connection refused',
    });
    render(withQueryClient(<HttpTab />));
    await userEvent.click(
      screen.getByRole('button', { name: /TEST CONNECTION/i })
    );
    await waitFor(() => {
      expect(screen.getByText(/ERR/)).toBeInTheDocument();
    });
    // "connection refused" appears both in the badge and the pretty-printed
    // JSON pre — either is fine.
    expect(screen.getAllByText(/connection refused/i).length).toBeGreaterThan(0);
  });
});
