import { Result } from 'antd';
import type { ReactNode } from 'react';
import { hasAllPermissions, hasAnyPermission } from '../../features/auth/permissions';
import { useAuthStore } from '../../stores/auth.store';

interface PermissionRouteProps {
  permissions: string[];
  requireAll?: boolean;
  children: ReactNode;
}

export function PermissionRoute({
  permissions,
  requireAll = false,
  children,
}: PermissionRouteProps) {
  const user = useAuthStore((state) => state.user);
  const allowed = requireAll
    ? hasAllPermissions(user, permissions)
    : hasAnyPermission(user, permissions);

  if (!allowed) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="You do not have permission to access this section."
      />
    );
  }

  return <>{children}</>;
}
