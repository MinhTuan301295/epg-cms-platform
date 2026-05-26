import { Table, Typography } from 'antd';

export function AuditLogsPage() {
  return (
    <section>
      <Typography.Title level={2}>Audit Logs</Typography.Title>
      <Table
        rowKey="id"
        columns={[
          { title: 'Action', dataIndex: 'action' },
          { title: 'Changed By', dataIndex: 'changedBy' },
          { title: 'Changed At', dataIndex: 'changedAt' },
        ]}
        dataSource={[]}
      />
    </section>
  );
}
