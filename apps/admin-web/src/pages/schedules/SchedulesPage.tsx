import { Typography } from 'antd';
import { ScheduleTimeline } from '../../features/schedule/components/ScheduleTimeline';

export function SchedulesPage() {
  return (
    <section className="schedules-page">
      <Typography.Title level={2}>Schedules</Typography.Title>
      <ScheduleTimeline />
    </section>
  );
}
