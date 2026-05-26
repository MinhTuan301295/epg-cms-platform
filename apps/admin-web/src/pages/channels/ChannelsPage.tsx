import { PlusOutlined } from '@ant-design/icons';
import { Button, Space, Table, Typography } from 'antd';

export function ChannelsPage() {
  return (
    <section>
      <Space className="page-toolbar" align="center" wrap>
        <Typography.Title level={2}>Channels</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />}>
          New Channel
        </Button>
      </Space>
      <Table
        rowKey="id"
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'EPG ID', dataIndex: 'epgId' },
          { title: 'Status', dataIndex: 'status' },
        ]}
        dataSource={[]}
      />
    </section>
  );
}
