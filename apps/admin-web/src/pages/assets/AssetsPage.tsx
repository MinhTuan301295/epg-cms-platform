import { Button, Space, Table, Typography } from 'antd';

export function AssetsPage() {
  return (
    <section>
      <Space className="page-toolbar" align="center" wrap>
        <Typography.Title level={2}>Assets</Typography.Title>
        <Button type="primary">New Asset</Button>
      </Space>
      <Table rowKey="id" columns={[{ title: 'Title', dataIndex: 'title' }]} dataSource={[]} />
    </section>
  );
}
