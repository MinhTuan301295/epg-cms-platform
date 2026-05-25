import { Button, Space, Typography } from 'antd';

export function SchedulesPage() {
  return (
    <section>
      <Space className="page-toolbar" align="center" wrap>
        <Typography.Title level={2}>Schedules</Typography.Title>
        <Button type="primary">New Schedule</Button>
      </Space>
      <div className="timeline-placeholder">Timeline workspace</div>
    </section>
  );
}
