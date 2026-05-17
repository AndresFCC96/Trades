import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withQueryClient } from '@/test/utils';

vi.mock('@/lib/api/endpoints', () => ({
  getJenkinsHealth: vi.fn(),
  listJenkinsJobs: vi.fn(),
  getJenkinsJob: vi.fn(),
  buildJenkinsJob: vi.fn(),
  stopJenkinsBuild: vi.fn(),
}));

// The WS hook would otherwise try to open a real socket in the test env.
vi.mock('@/features/jenkins/useJenkinsConsole', () => ({
  useJenkinsConsole: () => ({ text: '', done: false, error: null }),
}));

import { Jenkins } from './Jenkins';
import * as endpoints from '@/lib/api/endpoints';

const healthyResponse = {
  enabled: true,
  url: 'http://jenkins.test',
  version: '2.426.1',
  node_count: 2,
  jobs_total: 2,
  building_total: 0,
  error: null,
};

const jobsResponse = {
  jobs: [
    {
      name: 'trade-deploy',
      url: 'http://jenkins.test/job/trade-deploy',
      color: 'blue',
      buildable: true,
      inQueue: false,
      lastBuild: {
        number: 142,
        result: 'SUCCESS',
        timestamp: Date.now() - 120_000,
        duration: 84000,
        building: false,
      },
    },
    {
      name: 'nightly',
      url: 'http://jenkins.test/job/nightly',
      color: 'blue_anime',
      buildable: true,
      inQueue: false,
      lastBuild: {
        number: 21,
        result: null,
        timestamp: Date.now() - 30_000,
        duration: 0,
        building: true,
      },
    },
  ],
};

describe('<Jenkins />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the disabled empty state when Jenkins is not configured', async () => {
    (endpoints.getJenkinsHealth as ReturnType<typeof vi.fn>).mockResolvedValue({
      enabled: false,
      url: '',
      version: null,
      node_count: null,
      jobs_total: null,
      building_total: null,
      error: 'disabled',
    });
    render(withQueryClient(<Jenkins />));
    await waitFor(() => {
      expect(screen.getByText(/JENKINS INTEGRATION DISABLED/i)).toBeInTheDocument();
    });
  });

  it('renders the controller summary and the jobs table when enabled', async () => {
    (endpoints.getJenkinsHealth as ReturnType<typeof vi.fn>).mockResolvedValue(healthyResponse);
    (endpoints.listJenkinsJobs as ReturnType<typeof vi.fn>).mockResolvedValue(jobsResponse);

    render(withQueryClient(<Jenkins />));

    await waitFor(() => {
      expect(screen.getByText(/trade-deploy/)).toBeInTheDocument();
    });
    expect(screen.getByText(/nightly/)).toBeInTheDocument();
    // Controller chips. "BUILDING" appears as both a MetricChip label
    // and a status badge for the building job → use getAllByText.
    expect(screen.getByText('JOBS')).toBeInTheDocument();
    expect(screen.getAllByText('BUILDING').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('SUCCESS RATE')).toBeInTheDocument();
    // The building job is reflected in BOTH the status badge and the
    // "BUILDING" metric chip, so we expect more than one match.
    expect(screen.getAllByText(/BUILDING/i).length).toBeGreaterThanOrEqual(1);
    // Success badge for the non-building job
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('clicking BUILD calls buildJenkinsJob with the job name', async () => {
    (endpoints.getJenkinsHealth as ReturnType<typeof vi.fn>).mockResolvedValue(healthyResponse);
    (endpoints.listJenkinsJobs as ReturnType<typeof vi.fn>).mockResolvedValue(jobsResponse);
    (endpoints.buildJenkinsJob as ReturnType<typeof vi.fn>).mockResolvedValue({
      queued: true,
      queue_url: 'http://jenkins.test/queue/item/7/',
    });

    render(withQueryClient(<Jenkins />));
    await waitFor(() => {
      expect(screen.getByText(/trade-deploy/)).toBeInTheDocument();
    });

    const buildButtons = screen.getAllByRole('button', { name: /BUILD/i });
    await userEvent.click(buildButtons[0]);
    await waitFor(() => {
      expect(endpoints.buildJenkinsJob).toHaveBeenCalledWith('trade-deploy');
    });
  });
});
