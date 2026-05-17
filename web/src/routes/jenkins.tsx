import { createFileRoute } from '@tanstack/react-router';
import { Jenkins } from '@/features/jenkins/Jenkins';

export const Route = createFileRoute('/jenkins')({
  component: Jenkins,
});
