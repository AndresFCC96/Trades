import { createFileRoute } from '@tanstack/react-router';
import { AuditPipeline } from '@/features/audit/AuditPipeline';

export const Route = createFileRoute('/audit/pipeline')({
  component: AuditPipeline,
});
