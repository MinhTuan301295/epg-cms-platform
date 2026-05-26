import { ClockCircleOutlined, LogoutOutlined, RocketOutlined } from '@ant-design/icons';
import { Button, Layout, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

const PAGE_TITLE_BY_PATH: Array<{ path: string; title: string }> = [
  { path: '/dashboard', title: 'Dashboard' },
  { path: '/channels', title: 'Channels' },
  { path: '/assets', title: 'Assets' },
  { path: '/schedules', title: 'Schedules Timeline' },
  { path: '/users', title: 'Users' },
  { path: '/audit-logs', title: 'Audit Logs' },
];

function resolvePageTitle(pathname: string): string {
  const matched = PAGE_TITLE_BY_PATH.find((item) => pathname.startsWith(item.path));
  return matched?.title ?? 'EPG CMS';
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [now, setNow] = useState(() => dayjs());
  const pageTitle = resolvePageTitle(location.pathname);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(dayjs()), 1_000);

    return () => window.clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Layout.Header className="admin-header">
      <div className="admin-header-left">
        <Typography.Text strong className="ops-title">
          {pageTitle}
        </Typography.Text>
      </div>
      <Space size={16}>
        <Space size={10} className="ops-indicators">
          <Tag color="processing" icon={<ClockCircleOutlined />}>
            {now.format('YYYY-MM-DD HH:mm:ss')}
          </Tag>
          <Tag className="on-air-pill">ON AIR</Tag>
        </Space>
        <Button
          type="primary"
          icon={<RocketOutlined />}
          onClick={() => navigate('/schedules')}
        >
          Publish Ops
        </Button>
        <Typography.Text type="secondary">{user?.name || user?.email}</Typography.Text>
        <Button icon={<LogoutOutlined />} onClick={handleLogout}>
          Logout
        </Button>
      </Space>
    </Layout.Header>
  );
}
