/**
 * Wrappers tipados de cada endpoint del backend.
 * Convención: nombre corto que describe la acción.
 */
import { request, download } from './client';
import type {
  Health,
  RunPipelineRequest,
  RunPipelineResponse,
  PipelineStatus,
  Run,
  BusinessReport,
  QualityReport,
  SourceMetadata,
  SourcePreview,
  KafkaConnectRequest,
  KafkaStatus,
  KafkaCluster,
  KafkaClusterUpsertRequest,
  HttpTestRequest,
  HttpTestResponse,
  JenkinsHealth,
  JenkinsJob,
  JenkinsJobDetail,
  JenkinsConsole,
  AuditPage,
  AuditTradesFilters,
  AuditPipelineFilters,
  AuditAccessFilters,
  RulesResponse,
  SettingsResponse,
} from './types';

// ----- Health ---------------------------------------------------------
export const getHealth = () => request<Health>('/health');

// ----- Pipeline -------------------------------------------------------
export const runPipeline = (body: RunPipelineRequest) =>
  request<RunPipelineResponse>('/pipeline/run', { method: 'POST', body });

export const getPipelineStatus = () => request<PipelineStatus>('/pipeline/status');

export const getPipelineHistory = () => request<Run[]>('/pipeline/history');

// ----- Reports --------------------------------------------------------
function runIdQuery(runId?: string): string {
  return runId ? `?run_id=${encodeURIComponent(runId)}` : '';
}

export const getBusinessReport = (runId?: string) =>
  request<BusinessReport>(`/reports/business${runIdQuery(runId)}`);

export const getQualityReport = (runId?: string) =>
  request<QualityReport>(`/reports/quality${runIdQuery(runId)}`);

export const downloadBusinessReport = (format: 'json' | 'csv', runId?: string) =>
  download(
    `/reports/business/download?format=${format}${runId ? `&run_id=${encodeURIComponent(runId)}` : ''}`,
    `business_report.${format}`,
  );

export const downloadQualityReport = (format: 'json' | 'csv', runId?: string) =>
  download(
    `/reports/quality/download?format=${format}${runId ? `&run_id=${encodeURIComponent(runId)}` : ''}`,
    `quality_report.${format}`,
  );

// ----- Audit ----------------------------------------------------------
function qs(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export const getAuditTrades = (filters: AuditTradesFilters = {}) =>
  request<AuditPage>(`/audit/trades${qs(filters)}`);

export const getAuditPipeline = (filters: AuditPipelineFilters = {}) =>
  request<AuditPage>(`/audit/pipeline${qs(filters)}`);

export const getAuditAccess = (filters: AuditAccessFilters = {}) =>
  request<AuditPage>(`/audit/access${qs(filters)}`);

// ----- Sources --------------------------------------------------------
export async function uploadSource(file: File): Promise<SourceMetadata> {
  const fd = new FormData();
  fd.append('file', file);
  return request<SourceMetadata>('/sources/upload', { method: 'POST', body: fd });
}

export const listSources = () => request<SourceMetadata[]>('/sources');
export const getSource = (id: string) => request<SourceMetadata>(`/sources/${id}`);
export const getSourcePreview = (id: string) =>
  request<SourcePreview>(`/sources/${id}/preview`);
export const setSourceMapping = (id: string, mapping: Record<string, string>) =>
  request<SourceMetadata>(`/sources/${id}/mapping`, { method: 'POST', body: { mapping } });
export const deleteSource = (id: string) =>
  request<void>(`/sources/${id}`, { method: 'DELETE' });
export const runSourcePipeline = (id: string) =>
  request<RunPipelineResponse>(`/sources/${id}/run`, { method: 'POST' });

// ----- Kafka ----------------------------------------------------------
export const kafkaConnect = (body: KafkaConnectRequest) =>
  request<KafkaStatus>('/kafka/connect', { method: 'POST', body });
export const kafkaStart = () =>
  request<KafkaStatus>('/kafka/start', { method: 'POST' });
export const kafkaPause = () =>
  request<KafkaStatus>('/kafka/pause', { method: 'POST' });
export const kafkaResume = () =>
  request<KafkaStatus>('/kafka/resume', { method: 'POST' });
export const kafkaStop = () =>
  request<KafkaStatus>('/kafka/stop', { method: 'POST' });
export const getKafkaStatus = () => request<KafkaStatus>('/kafka/status');

// ----- Rules + Settings (editor) -------------------------------------
export const getRules = () => request<RulesResponse>('/rules');
export const patchRule = (ruleId: string, enabled: boolean) =>
  request<RulesResponse>(`/rules/${ruleId}`, { method: 'PATCH', body: { enabled } });

export const getSettings = () => request<SettingsResponse>('/settings');
export const putSettings = (patch: Record<string, unknown>) =>
  request<SettingsResponse>('/settings', { method: 'PUT', body: { patch } });
export const persistSettings = () =>
  request<{ persisted: boolean; target: string; backup: string | null }>(
    '/settings/persist',
    { method: 'POST' },
  );

// ----- HTTP source test connection -----------------------------------
export const testHttpEndpoint = (body: HttpTestRequest) =>
  request<HttpTestResponse>('/sources/http/test', { method: 'POST', body });

// ----- Saved Kafka clusters ------------------------------------------
export const listKafkaClusters = () =>
  request<{ clusters: KafkaCluster[] }>('/kafka/clusters');
export const createKafkaCluster = (body: KafkaClusterUpsertRequest) =>
  request<KafkaCluster>('/kafka/clusters', { method: 'POST', body });
export const deleteKafkaCluster = (id: string) =>
  request<void>(`/kafka/clusters/${id}`, { method: 'DELETE' });
export const useKafkaCluster = (id: string) =>
  request<KafkaStatus>(`/kafka/clusters/${id}/use`, { method: 'POST' });

// ----- Jenkins integration -------------------------------------------
export const getJenkinsHealth = () => request<JenkinsHealth>('/jenkins/health');
export const listJenkinsJobs = () =>
  request<{ jobs: JenkinsJob[] }>('/jenkins/jobs');
export const getJenkinsJob = (name: string) =>
  request<JenkinsJobDetail>(`/jenkins/jobs/${encodeURIComponent(name)}`);
export const buildJenkinsJob = (name: string) =>
  request<{ queued: boolean; queue_url: string | null }>(
    `/jenkins/jobs/${encodeURIComponent(name)}/build`,
    { method: 'POST' },
  );
export const stopJenkinsBuild = (name: string, number: number) =>
  request<{ stopped: boolean; job: string; build: number }>(
    `/jenkins/jobs/${encodeURIComponent(name)}/builds/${number}/stop`,
    { method: 'POST' },
  );
export const getJenkinsConsole = (name: string, number: number, start = 0) =>
  request<JenkinsConsole>(
    `/jenkins/jobs/${encodeURIComponent(name)}/builds/${number}/log?start=${start}`,
  );
