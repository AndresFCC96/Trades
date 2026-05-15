import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/ui/Placeholder';

export const Route = createFileRoute('/history')({
  component: () => <Placeholder title="History" />,
});
