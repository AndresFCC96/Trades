import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withQueryClient } from '@/test/utils';

vi.mock('@/lib/api/endpoints', () => ({
  getAuditAccess: vi.fn(),
}));

import { AuditAccess } from './AuditAccess';
import * as endpoints from '@/lib/api/endpoints';

const events = [
  {
    timestamp_utc: '2026-05-14T21:00:00Z',
    method: 'GET',
    endpoint: '/pipeline/history',
    response_code: 200,
    actor: '127.0.0.1',
  },
  {
    timestamp_utc: '2026-05-14T21:00:01Z',
    method: 'POST',
    endpoint: '/pipeline/run',
    response_code: 500,
    actor: '127.0.0.1',
  },
  {
    timestamp_utc: '2026-05-14T21:00:02Z',
    method: 'GET',
    endpoint: '/missing',
    response_code: 404,
    actor: '127.0.0.1',
  },
];

describe('<AuditAccess />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all events by default and applies the 5xx filter', async () => {
    // Backend now applies code_class server-side; mirror the behaviour
    // in the mock so the assertion path is unchanged.
    (endpoints.getAuditAccess as ReturnType<typeof vi.fn>).mockImplementation(
      (filters: { code_class?: '2xx' | '4xx' | '5xx' } = {}) => {
        const cls = filters.code_class;
        const filtered = !cls
          ? events
          : events.filter((e) => {
              const c = e.response_code;
              if (cls === '2xx') return c >= 200 && c < 300;
              if (cls === '4xx') return c >= 400 && c < 500;
              if (cls === '5xx') return c >= 500;
              return true;
            });
        return Promise.resolve({
          events: filtered,
          total: filtered.length,
          limit: 500,
          offset: 0,
        });
      }
    );
    render(withQueryClient(<AuditAccess />));

    await waitFor(() => {
      expect(screen.getByText('/pipeline/history')).toBeInTheDocument();
    });
    expect(screen.getByText('/pipeline/run')).toBeInTheDocument();
    expect(screen.getByText('/missing')).toBeInTheDocument();

    // Filter to 5xx only — server returns just the 500.
    await userEvent.click(screen.getByText('5XX'));
    await waitFor(() => {
      expect(screen.queryByText('/pipeline/history')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('/missing')).not.toBeInTheDocument();
    expect(screen.getByText('/pipeline/run')).toBeInTheDocument();
  });
});
