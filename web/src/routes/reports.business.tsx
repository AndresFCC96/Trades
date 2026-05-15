import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/ui/Placeholder';

export const Route = createFileRoute('/reports/business')({
  component: () => <Placeholder title="Reports · Business" />,
});
