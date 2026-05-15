import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/ui/Placeholder';

export const Route = createFileRoute('/audit/pipeline')({
  component: () => <Placeholder title="Audit · Pipeline Runs" />,
});
