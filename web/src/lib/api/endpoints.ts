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
  AuditEvent,
} from './types';

// ----- Health ---------------------------------------------------------
export const getHealth = () => request<Health>('/health');

// ----- Pipeline -------------------------------------------------------
export const runPipeline = (body: RunPipelineRequest) =>
  request<RunPipelineResponse>('/pipeline/run', { method: 'POST', body });

export const getPipelineStatus = () => request<PipelineStatus>('/pipeline/status');

export const getPipelineHistory = () => request<Run[]>('/pipeline/history');

// ----- Reports --------------------------------------------------------
export const getBusinessReport = () => request<BusinessReport>('/reports/business');

export const getQualityReport = () => request<QualityReport>('/reports/quality');

export const downloadBusinessReport = (format: 'json' | 'csv') =>
  download(`/reports/business/download?format=${format}`, `business_report.${format}`);

export const downloadQualityReport = (format: 'json' | 'csv') =>
  download(`/reports/quality/download?format=${format}`, `quality_report.${format}`);

// ----- Audit ----------------------------------------------------------
export const getAuditTrades = () => request<AuditEvent[]>('/audit/trades');
export const getAuditPipeline = () => request<AuditEvent[]>('/audit/pipeline');
export const getAuditAccess = () => request<AuditEvent[]>('/audit/access');

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
