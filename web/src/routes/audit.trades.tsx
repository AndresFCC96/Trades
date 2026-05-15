import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/ui/Placeholder';

export const Route = createFileRoute('/audit/trades')({
  component: () => <Placeholder title="Audit · Rejected Trades" />,
});
