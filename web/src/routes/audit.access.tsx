import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/ui/Placeholder';

export const Route = createFileRoute('/audit/access')({
  component: () => <Placeholder title="Audit · API Access" />,
});
