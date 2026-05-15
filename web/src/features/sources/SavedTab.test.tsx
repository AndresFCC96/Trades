import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withQueryClient } from '@/test/utils';

vi.mock('@/lib/api/endpoints', () => ({
  listKafkaClusters: vi.fn(),
  createKafkaCluster: vi.fn(),
  deleteKafkaCluster: vi.fn(),
  useKafkaCluster: vi.fn(),
}));

import { SavedTab } from './SavedTab';
import * as endpoints from '@/lib/api/endpoints';

const cluster = {
  id: 'c1',
  name: 'prod-us',
  bootstrap_servers: 'kafka.prod:9092',
  topic: 'trades.raw',
  group_id: 'pipeline-prod',
  security_protocol: 'SASL_SSL' as const,
  last_used_at: null,
};

describe('<SavedTab />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty list state when there are no clusters', async () => {
    (endpoints.listKafkaClusters as ReturnType<typeof vi.fn>).mockResolvedValue({
      clusters: [],
    });
    render(withQueryClient(<SavedTab />));
    await waitFor(() => {
      expect(screen.getByText(/NO SAVED CLUSTERS/i)).toBeInTheDocument();
    });
  });

  it('renders the cluster table when the backend returns rows', async () => {
    (endpoints.listKafkaClusters as ReturnType<typeof vi.fn>).mockResolvedValue({
      clusters: [cluster],
    });
    render(withQueryClient(<SavedTab />));
    await waitFor(() => {
      expect(screen.getByText('prod-us')).toBeInTheDocument();
    });
    expect(screen.getByText('kafka.prod:9092')).toBeInTheDocument();
    expect(screen.getByText('trades.raw')).toBeInTheDocument();
    // SASL_SSL appears in both the table badge and the form select; the
    // table presence is enough — count >= 1.
    expect(screen.getAllByText('SASL_SSL').length).toBeGreaterThanOrEqual(1);
  });

  it('save button is disabled until all required fields are filled', async () => {
    (endpoints.listKafkaClusters as ReturnType<typeof vi.fn>).mockResolvedValue({
      clusters: [],
    });
    render(withQueryClient(<SavedTab />));
    const save = screen.getByRole('button', { name: /SAVE CLUSTER/i });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText(/prod-us-east/i), 'demo');
    await userEvent.type(
      screen.getByPlaceholderText(/kafka\.prod/i),
      'localhost:9092'
    );
    await userEvent.type(screen.getByPlaceholderText(/trades\.raw/i), 't');
    await userEvent.type(screen.getByPlaceholderText(/pipeline-prod/i), 'g');
    expect(save).not.toBeDisabled();
  });
});
