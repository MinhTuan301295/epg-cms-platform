import { Button, Space, Table, Typography } from 'antd';

export function UsersPage() {
  return (
    <section>
      <Space className="page-toolbar" align="center" wrap>
        <Typography.Title level={2}>Users</Typography.Title>
        <Button type="primary">New User</Button>
      </Space>
      <Table rowKey="id" columns={[{ title: 'Email', dataIndex: 'email' }]} dataSource={[]} />
    </section>
  );
}
