import { createFileRoute } from '@tanstack/react-router';
import { QualityReportScreen } from '@/features/reports/Quality';

export const Route = createFileRoute('/reports/quality')({
  component: QualityReportScreen,
});
