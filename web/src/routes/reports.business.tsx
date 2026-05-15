import { createFileRoute } from '@tanstack/react-router';
import { BusinessReportScreen } from '@/features/reports/Business';

export const Route = createFileRoute('/reports/business')({
  component: BusinessReportScreen,
});
