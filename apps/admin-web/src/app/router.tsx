import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from './layout/AdminLayout';
import { ProtectedRoute } from './layout/ProtectedRoute';
import { AssetsPage } from '../pages/assets/AssetsPage';
import { AuditLogsPage } from '../pages/audit-logs/AuditLogsPage';
import { ChannelsPage } from '../pages/channels/ChannelsPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { LoginPage } from '../pages/login/LoginPage';
import { SchedulesPage } from '../pages/schedules/SchedulesPage';
import { UsersPage } from '../pages/users/UsersPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        element: <AdminLayout />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'channels', element: <ChannelsPage /> },
          { path: 'assets', element: <AssetsPage /> },
          { path: 'schedules', element: <SchedulesPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'audit-logs', element: <AuditLogsPage /> },
        ],
      },
    ],
  },
]);
