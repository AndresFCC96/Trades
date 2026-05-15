import { createFileRoute } from '@tanstack/react-router';
import { AuditTrades } from '@/features/audit/AuditTrades';

export const Route = createFileRoute('/audit/trades')({
  component: AuditTrades,
});
