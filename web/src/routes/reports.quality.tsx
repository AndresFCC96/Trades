import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/ui/Placeholder';

export const Route = createFileRoute('/reports/quality')({
  component: () => <Placeholder title="Reports · Quality" />,
});
