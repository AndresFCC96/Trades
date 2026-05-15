import { createFileRoute } from '@tanstack/react-router';
import { RunPipeline } from '@/features/run/RunPipeline';

export const Route = createFileRoute('/run')({
  component: RunPipeline,
});
