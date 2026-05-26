import {
  AuditOutlined,
  CalendarOutlined,
  DashboardOutlined,
  PlaySquareOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const items = useMemo<MenuProps['items']>(
    () => [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
      { key: '/channels', icon: <VideoCameraOutlined />, label: 'Channels' },
      { key: '/assets', icon: <PlaySquareOutlined />, label: 'Assets' },
      { key: '/schedules', icon: <CalendarOutlined />, label: 'Schedules' },
      { key: '/users', icon: <TeamOutlined />, label: 'Users' },
      { key: '/audit-logs', icon: <AuditOutlined />, label: 'Audit Logs' },
    ],
    [],
  );

  return (
    <Layout.Sider width={232} className="admin-sidebar">
      <div className="admin-brand">EPG CMS</div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={items}
        onClick={({ key }) => navigate(key)}
      />
    </Layout.Sider>
  );
}
