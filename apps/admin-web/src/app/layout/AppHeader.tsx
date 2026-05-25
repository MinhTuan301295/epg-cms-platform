import { Layout, Typography } from 'antd';

export function AppHeader() {
  return (
    <Layout.Header className="admin-header">
      <Typography.Text strong>EPG CMS</Typography.Text>
    </Layout.Header>
  );
}
