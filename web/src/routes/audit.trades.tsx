import { createFileRoute } from '@tanstack/react-router';
import { AuditTrades } from '@/features/audit/AuditTrades';

/**
 * Search schema for /audit/trades.
 *   ?rule_id=RV-XX → pre-fills the rule dropdown filter.
 * Unknown keys are dropped so we don't propagate garbage state.
 */
type AuditTradesSearch = {
  rule_id?: string;
};

export const Route = createFileRoute('/audit/trades')({
  validateSearch: (raw: Record<string, unknown>): AuditTradesSearch => {
    const rid = raw.rule_id;
    return typeof rid === 'string' && rid ? { rule_id: rid } : {};
  },
  component: AuditTrades,
});
