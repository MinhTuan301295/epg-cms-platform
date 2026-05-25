import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

export function AdminLayout() {
  return (
    <Layout className="admin-shell">
      <AppSidebar />
      <Layout>
        <AppHeader />
        <Layout.Content className="admin-content">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
