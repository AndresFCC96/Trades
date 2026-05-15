import { createFileRoute } from '@tanstack/react-router';
import { Sources } from '@/features/sources/Sources';

export const Route = createFileRoute('/sources')({
  component: Sources,
});
