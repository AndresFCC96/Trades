import { createFileRoute } from '@tanstack/react-router';
import { AuditAccess } from '@/features/audit/AuditAccess';

export const Route = createFileRoute('/audit/access')({
  component: AuditAccess,
});
