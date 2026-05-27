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
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { hasAllPermissions, hasAnyPermission, PERMISSIONS } from '../../features/auth/permissions';
import { useAuthStore } from '../../stores/auth.store';

interface SidebarMenuItem {
  key: string;
  icon: ReactNode;
  label: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
}

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const [logoFailed, setLogoFailed] = useState(false);
  const items = useMemo<MenuProps['items']>(
    () => {
      const allItems: SidebarMenuItem[] = [
        {
          key: '/dashboard',
          icon: <DashboardOutlined />,
          label: 'Dashboard',
          requiredPermissions: [
            PERMISSIONS.DASHBOARD_VIEW,
            PERMISSIONS.CHANNELS_VIEW,
            PERMISSIONS.ASSETS_VIEW,
            PERMISSIONS.SCHEDULES_VIEW,
            PERMISSIONS.OPERATIONS_VIEW,
          ],
          requireAll: true,
        },
        {
          key: '/channels',
          icon: <VideoCameraOutlined />,
          label: 'Channels',
          requiredPermissions: [PERMISSIONS.CHANNELS_VIEW],
        },
        {
          key: '/assets',
          icon: <PlaySquareOutlined />,
          label: 'Assets',
          requiredPermissions: [PERMISSIONS.ASSETS_VIEW],
        },
        {
          key: '/schedules',
          icon: <CalendarOutlined />,
          label: 'Schedules',
          requiredPermissions: [PERMISSIONS.SCHEDULES_VIEW],
        },
        {
          key: '/users',
          icon: <TeamOutlined />,
          label: 'Users',
          requiredPermissions: [PERMISSIONS.USERS_VIEW],
        },
        {
          key: '/audit-logs',
          icon: <AuditOutlined />,
          label: 'Audit Logs',
          requiredPermissions: [PERMISSIONS.AUDIT_VIEW],
        },
      ];

      const visibleItems = allItems
        .filter((item) =>
          item.requiredPermissions
            ? item.requireAll
              ? hasAllPermissions(user, item.requiredPermissions)
              : hasAnyPermission(user, item.requiredPermissions)
            : true,
        )
        .map((item) => ({
          key: item.key,
          icon: item.icon,
          label: item.label,
        }));

      return visibleItems;
    },
    [user],
  );

  return (
    <Layout.Sider width={220} className="admin-sidebar">
      <div className="admin-brand">
        {!logoFailed ? (
          <div className="admin-brand-logo-wrap">
            <img
              src="/branding/logo.png"
              alt="EPG CMS"
              className="admin-brand-logo"
              onError={() => setLogoFailed(true)}
            />
          </div>
        ) : null}
        <span className="admin-brand-title">FAST Channel CMS</span>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        className="admin-menu"
        selectedKeys={[location.pathname]}
        items={items}
        onClick={({ key }) => navigate(key)}
      />
    </Layout.Sider>
  );
}
