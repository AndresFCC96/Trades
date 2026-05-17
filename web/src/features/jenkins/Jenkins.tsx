import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  buildJenkinsJob,
  getJenkinsHealth,
  getJenkinsJob,
  listJenkinsJobs,
  stopJenkinsBuild,
} from '@/lib/api/endpoints';
import { fmt } from '@/lib/fmt';
import { useStore } from '@/lib/store';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Badge, type Tone } from '@/components/ui/Badge';
import { MetricChip } from '@/components/ui/MetricChip';
import { Table, type Col } from '@/components/tables/Table';
import type { JenkinsJob, JenkinsBuildSummary } from '@/lib/api/types';
import { useJenkinsConsole } from './useJenkinsConsole';

/**
 * Translate the Jenkins "color" string into a UI tone + label.
 * Jenkins encodes status in `color`:
 *   blue / blue_anime         → success / building
 *   red / red_anime           → failure / building after failure
 *   yellow / yellow_anime     → unstable / building unstable
 *   aborted, disabled, notbuilt, …
 */
function statusFromColor(color: string): { tone: Tone; label: string; building: boolean } {
  const building = color.endsWith('_anime');
  const base = building ? color.slice(0, -'_anime'.length) : color;
  const map: Record<string, { tone: Tone; label: string }> = {
    blue: { tone: 'ok', label: building ? 'BUILDING' : 'OK' },
    red: { tone: 'crit', label: building ? 'BUILDING (fail)' : 'FAIL' },
    yellow: { tone: 'warn', label: building ? 'BUILDING (unst.)' : 'UNSTABLE' },
    aborted: { tone: 'warn', label: 'ABORTED' },
    disabled: { tone: 'neutral', label: 'DISABLED' },
    notbuilt: { tone: 'neutral', label: 'NOT BUILT' },
  };
  const m = map[base] ?? { tone: 'neutral' as Tone, label: base.toUpperCase() };
  return { ...m, building };
}

function relativeAge(timestampMs: number | undefined): string {
  if (!timestampMs) return '—';
  const diff = Date.now() - timestampMs;
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

export function Jenkins() {
  const qc = useQueryClient();
  const addToast = useStore((s) => s.addToast);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedBuild, setSelectedBuild] = useState<number | null>(null);

  const { data: health } = useQuery({
    queryKey: ['jenkins-health'],
    queryFn: getJenkinsHealth,
    refetchInterval: 10_000,
    retry: false,
  });

  const enabled = health?.enabled ?? false;

  const { data: jobsResp, isLoading } = useQuery({
    queryKey: ['jenkins-jobs'],
    queryFn: listJenkinsJobs,
    enabled,
    refetchInterval: 5_000,
    retry: false,
  });
  const jobs = jobsResp?.jobs ?? [];

  const { data: jobDetail } = useQuery({
    queryKey: ['jenkins-job', selectedJob],
    queryFn: () => getJenkinsJob(selectedJob as string),
    enabled: enabled && !!selectedJob,
    refetchInterval: 5_000,
    retry: false,
  });

  const buildMut = useMutation({
    mutationFn: (name: string) => buildJenkinsJob(name),
    onSuccess: (_resp, name) => {
      addToast(`Build queued for ${name}`, 'ok');
      qc.invalidateQueries({ queryKey: ['jenkins-jobs'] });
      qc.invalidateQueries({ queryKey: ['jenkins-job', name] });
    },
    onError: (e) => addToast(`Build failed · ${(e as Error).message}`, 'crit'),
  });

  const stopMut = useMutation({
    mutationFn: ({ name, number }: { name: string; number: number }) =>
      stopJenkinsBuild(name, number),
    onSuccess: (_, vars) => {
      addToast(`Stopped ${vars.name} #${vars.number}`, 'warn');
      qc.invalidateQueries({ queryKey: ['jenkins-jobs'] });
      qc.invalidateQueries({ queryKey: ['jenkins-job', vars.name] });
    },
    onError: (e) => addToast(`Stop failed · ${(e as Error).message}`, 'crit'),
  });

  // Derived metrics — computed before the early return so the hook
  // count is stable across renders (regardless of `enabled`).
  const buildingCount = useMemo(
    () => jobs.filter((j) => j.color.endsWith('_anime')).length,
    [jobs],
  );
  const successRate = useMemo(() => {
    if (jobs.length === 0) return null;
    const successes = jobs.filter((j) =>
      ['blue', 'blue_anime'].includes(j.color),
    ).length;
    return Math.round((successes / jobs.length) * 100);
  }, [jobs]);

  // ---- Empty state when Jenkins is disabled -------------------------
  if (health && !health.enabled) {
    return (
      <div className="p-4">
        <Panel title="Jenkins">
          <div className="py-10 text-center font-mono">
            <div className="text-fg text-base mb-2">— JENKINS INTEGRATION DISABLED —</div>
            <div className="text-muted text-sm">
              Set <code>jenkins.enabled: true</code> in <code>config/settings.yaml</code>{' '}
              and configure URL + <code>JENKINS_USER</code> / <code>JENKINS_TOKEN</code>{' '}
              env vars on the server, then reload this page.
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  // ---- Jobs table columns -------------------------------------------
  const cols: Col<JenkinsJob>[] = [
    { label: 'NAME', render: (j) => <span className="text-fg">{j.name}</span> },
    {
      label: 'LAST',
      render: (j) => (
        <span className="text-muted">
          {j.lastBuild ? `#${j.lastBuild.number}` : '—'}
        </span>
      ),
    },
    {
      label: 'AGE',
      render: (j) => (
        <span className="text-muted">{relativeAge(j.lastBuild?.timestamp)}</span>
      ),
    },
    {
      label: 'DURATION',
      align: 'right',
      render: (j) =>
        j.lastBuild?.duration ? fmt.dur(j.lastBuild.duration) : '—',
    },
    {
      label: 'STATUS',
      render: (j) => {
        const s = statusFromColor(j.color);
        return <Badge tone={s.tone}>{s.label}</Badge>;
      },
    },
    {
      label: 'PROGRESS',
      render: (j) => <ProgressBar job={j} />,
    },
    {
      label: '',
      align: 'right',
      render: (j) => {
        const s = statusFromColor(j.color);
        return (
          <div className="inline-flex gap-1.5">
            <Btn
              kind="primary"
              onClick={() => buildMut.mutate(j.name)}
              disabled={!j.buildable || buildMut.isPending}
            >
              ▶ BUILD
            </Btn>
            {s.building && j.lastBuild && (
              <Btn
                kind="danger"
                onClick={() =>
                  stopMut.mutate({ name: j.name, number: j.lastBuild!.number })
                }
                disabled={stopMut.isPending}
              >
                STOP
              </Btn>
            )}
            <Btn
              kind="solid"
              onClick={() => {
                setSelectedJob(j.name);
                setSelectedBuild(j.lastBuild?.number ?? null);
              }}
              disabled={!j.lastBuild}
            >
              LOGS
            </Btn>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Controller summary */}
      <Panel
        title={`Jenkins · ${health?.url ?? '—'}${health?.version ? ` · v${health.version}` : ''}`}
        right={
          health?.error ? (
            <Badge tone="crit">● {health.error.slice(0, 60)}</Badge>
          ) : (
            <Badge tone="ok">● CONTROLLER HEALTHY</Badge>
          )
        }
      >
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <MetricChip
            label="JOBS"
            value={fmt.num(health?.jobs_total ?? jobs.length)}
            color="#60a5fa"
          />
          <MetricChip
            label="BUILDING"
            value={fmt.num(health?.building_total ?? buildingCount)}
            color={buildingCount > 0 ? '#fbbf24' : '#4ade80'}
          />
          <MetricChip
            label="SUCCESS RATE"
            value={successRate != null ? `${successRate}%` : '—'}
            color={
              successRate != null && successRate < 80 ? '#fbbf24' : '#4ade80'
            }
          />
          <MetricChip
            label="NODES"
            value={fmt.num(health?.node_count ?? 0)}
            color="#a78bfa"
          />
        </div>
      </Panel>

      {/* Jobs table */}
      <Panel
        title={`Jobs · ${jobs.length}${isLoading ? ' (loading…)' : ''}`}
      >
        <Table
          dense
          cols={cols}
          rows={jobs}
          emptyLabel="— NO JOBS REACHABLE —"
        />
      </Panel>

      {/* Job detail + console */}
      {selectedJob && selectedBuild != null && (
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
          <Panel title={`Build History · ${selectedJob}`}>
            <Table
              dense
              cols={[
                {
                  label: '#',
                  render: (b: JenkinsBuildSummary) => `#${b.number}`,
                },
                {
                  label: 'AGE',
                  render: (b) => (
                    <span className="text-muted">{relativeAge(b.timestamp)}</span>
                  ),
                },
                {
                  label: 'DURATION',
                  align: 'right',
                  render: (b) => (b.duration ? fmt.dur(b.duration) : '—'),
                },
                {
                  label: 'RESULT',
                  render: (b) => {
                    if (b.building) return <Badge tone="info">RUNNING</Badge>;
                    const tone: Tone =
                      b.result === 'SUCCESS'
                        ? 'ok'
                        : b.result === 'FAILURE'
                          ? 'crit'
                          : b.result === 'UNSTABLE'
                            ? 'warn'
                            : 'neutral';
                    return <Badge tone={tone}>{b.result ?? '—'}</Badge>;
                  },
                },
                {
                  label: '',
                  align: 'right',
                  render: (b) => (
                    <Btn onClick={() => setSelectedBuild(b.number)}>VIEW LOG</Btn>
                  ),
                },
              ]}
              rows={(jobDetail?.job?.builds ?? []) as JenkinsBuildSummary[]}
              emptyLabel="— NO BUILDS —"
            />
          </Panel>

          <Panel title={`Console · ${selectedJob} #${selectedBuild}`}>
            <ConsoleStream name={selectedJob} buildNumber={selectedBuild} />
          </Panel>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Progress bar (uses `estimatedDuration` heuristic; falls back to a
// pulsing indicator when we don't have enough info).
// =====================================================================
function ProgressBar({ job }: { job: JenkinsJob }) {
  const lb = job.lastBuild;
  if (!lb) return <span className="text-muted">—</span>;
  if (job.color.endsWith('_anime')) {
    return (
      <div className="font-mono text-xs flex items-center gap-2">
        <div style={{ width: 100, height: 4, background: 'var(--border)' }}>
          <div
            style={{
              width: '40%',
              height: '100%',
              background: '#fbbf24',
              animation: 'pulseBig 1.5s infinite',
            }}
          />
        </div>
        <span className="text-muted">running</span>
      </div>
    );
  }
  return (
    <div style={{ width: 100, height: 4, background: 'var(--border)' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          background: ['blue'].includes(job.color)
            ? '#4ade80'
            : job.color === 'red'
              ? '#f87171'
              : '#fbbf24',
        }}
      />
    </div>
  );
}

// =====================================================================
// Console live stream (uses the WS hook; falls back to a polling
// behaviour automatically via the WS reconnect logic).
// =====================================================================
function ConsoleStream({ name, buildNumber }: { name: string; buildNumber: number }) {
  const { text, done, error } = useJenkinsConsole(name, buildNumber);
  return (
    <div>
      <div className="flex justify-between mb-1.5 font-mono text-xs">
        <span className="text-muted">
          {done ? '● BUILD FINISHED' : '◐ STREAMING…'}
        </span>
        {error && <span style={{ color: '#f87171' }}>{error}</span>}
      </div>
      <pre
        className="font-mono text-xs m-0"
        style={{
          background: 'var(--bg)',
          padding: 10,
          border: '1px solid var(--border)',
          minHeight: 220,
          maxHeight: 420,
          overflow: 'auto',
          color: 'var(--fg)',
        }}
      >
        {text || '— waiting for output —'}
      </pre>
    </div>
  );
}
