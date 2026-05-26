import { Navigate, createBrowserRouter } from 'react-router-dom';
import { PERMISSIONS } from '../features/auth/permissions';
import { PermissionRoute } from './layout/PermissionRoute';
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
          {
            path: 'dashboard',
            element: (
              <PermissionRoute
                permissions={[
                  PERMISSIONS.DASHBOARD_VIEW,
                  PERMISSIONS.CHANNELS_VIEW,
                  PERMISSIONS.ASSETS_VIEW,
                  PERMISSIONS.SCHEDULES_VIEW,
                  PERMISSIONS.OPERATIONS_VIEW,
                ]}
                requireAll
              >
                <DashboardPage />
              </PermissionRoute>
            ),
          },
          {
            path: 'channels',
            element: (
              <PermissionRoute permissions={[PERMISSIONS.CHANNELS_VIEW]}>
                <ChannelsPage />
              </PermissionRoute>
            ),
          },
          {
            path: 'assets',
            element: (
              <PermissionRoute permissions={[PERMISSIONS.ASSETS_VIEW]}>
                <AssetsPage />
              </PermissionRoute>
            ),
          },
          {
            path: 'schedules',
            element: (
              <PermissionRoute permissions={[PERMISSIONS.SCHEDULES_VIEW]}>
                <SchedulesPage />
              </PermissionRoute>
            ),
          },
          {
            path: 'users',
            element: (
              <PermissionRoute permissions={[PERMISSIONS.USERS_VIEW]}>
                <UsersPage />
              </PermissionRoute>
            ),
          },
          {
            path: 'audit-logs',
            element: (
              <PermissionRoute permissions={[PERMISSIONS.AUDIT_VIEW]}>
                <AuditLogsPage />
              </PermissionRoute>
            ),
          },
        ],
      },
    ],
  },
]);
