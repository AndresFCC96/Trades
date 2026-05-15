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
    (endpoints.getAuditAccess as ReturnType<typeof vi.fn>).mockResolvedValue(events);
    render(withQueryClient(<AuditAccess />));

    await waitFor(() => {
      expect(screen.getByText('/pipeline/history')).toBeInTheDocument();
    });
    expect(screen.getByText('/pipeline/run')).toBeInTheDocument();
    expect(screen.getByText('/missing')).toBeInTheDocument();

    // Filter to 5xx only
    await userEvent.click(screen.getByText('5XX'));
    expect(screen.queryByText('/pipeline/history')).not.toBeInTheDocument();
    expect(screen.queryByText('/missing')).not.toBeInTheDocument();
    expect(screen.getByText('/pipeline/run')).toBeInTheDocument();
  });
});
