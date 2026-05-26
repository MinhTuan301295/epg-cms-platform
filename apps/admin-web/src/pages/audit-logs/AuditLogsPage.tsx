import { Table } from 'antd';

export function AuditLogsPage() {
  return (
    <section>
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
