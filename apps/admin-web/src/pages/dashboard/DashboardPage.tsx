import { Card, Col, Row, Statistic, Typography } from 'antd';

const dashboardStats = [
  { title: 'Total Channels', value: 0 },
  { title: 'Total Assets', value: 0 },
  { title: 'Today Schedules', value: 0 },
  { title: 'Published Schedules', value: 0 },
];

export function DashboardPage() {
  return (
    <section>
      <Typography.Title level={2}>Dashboard</Typography.Title>
      <Row gutter={[16, 16]}>
        {dashboardStats.map((item) => (
          <Col key={item.title} xs={24} sm={12} xl={6}>
            <Card>
              <Statistic title={item.title} value={item.value} />
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
}
