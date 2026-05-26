import { PlusOutlined } from '@ant-design/icons';
import { Button, Space, Table, Typography } from 'antd';

export function AssetsPage() {
  return (
    <section>
      <Space className="page-toolbar" align="center" wrap>
        <Typography.Title level={2}>Assets</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />}>
          New Asset
        </Button>
      </Space>
      <Table
        rowKey="id"
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Type', dataIndex: 'type' },
          { title: 'Duration', dataIndex: 'duration' },
        ]}
        dataSource={[]}
      />
    </section>
  );
}
