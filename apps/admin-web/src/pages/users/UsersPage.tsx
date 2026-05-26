import {
  EditOutlined,
  FilterOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App as AntdApp,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { hasPermission, PERMISSIONS } from '../../features/auth/permissions';
import { apiClient } from '../../services/api-client';
import { useAuthStore } from '../../stores/auth.store';

type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';
type UserStatusFilter = 'all' | 'active' | 'inactive';

interface UserItem {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  data: UserItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PermissionsMetadataResponse {
  allPermissions: string[];
  roleDefaults: Record<UserRole, string[]>;
}

interface UserUpsertFormValues {
  email?: string;
  password?: string;
  name?: string;
  role: UserRole;
  permissions?: string[];
  isActive: boolean;
}

const defaultPageSize = 10;
const roleOptions: Array<{ label: string; value: UserRole }> = [
  { label: 'ADMIN', value: 'ADMIN' },
  { label: 'EDITOR', value: 'EDITOR' },
  { label: 'VIEWER', value: 'VIEWER' },
];

function normalizeErrorMessage(error: unknown, fallback: string): string {
  const maybeMessage =
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message !==
      'undefined'
      ? (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
      : undefined;

  const message = Array.isArray(maybeMessage) ? maybeMessage.join(', ') : maybeMessage;
  return message || fallback;
}

export function UsersPage() {
  const { message } = AntdApp.useApp();
  const currentUser = useAuthStore((state) => state.user);
  const canCreateUser = hasPermission(currentUser, PERMISSIONS.USERS_CREATE);
  const canUpdateUser = hasPermission(currentUser, PERMISSIONS.USERS_UPDATE);
  const canDeleteUser = hasPermission(currentUser, PERMISSIONS.USERS_DELETE);
  const [userForm] = Form.useForm<UserUpsertFormValues>();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const [status, setStatus] = useState<UserStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultPageSize);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const isActive = useMemo(() => {
    if (status === 'active') return true;
    if (status === 'inactive') return false;
    return undefined;
  }, [status]);

  const permissionsMetadataQuery = useQuery({
    queryKey: ['users', 'permissions-metadata'],
    queryFn: async () => {
      const response = await apiClient.get<PermissionsMetadataResponse>('/users/permissions');
      return response.data;
    },
  });

  const usersQuery = useQuery({
    queryKey: ['users', { page, limit, search, role, status }],
    queryFn: async () => {
      const response = await apiClient.get<UsersResponse>('/users', {
        params: {
          page,
          limit,
          search: search || undefined,
          role: role === 'all' ? undefined : role,
          isActive,
        },
      });

      return response.data;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (payload: UserUpsertFormValues) => {
      const response = await apiClient.post<UserItem>('/users', payload);
      return response.data;
    },
    onSuccess: async () => {
      message.success('User created successfully');
      setModalOpen(false);
      setEditingUser(null);
      userForm.resetFields();
      await usersQuery.refetch();
    },
    onError: (error) => {
      message.error(normalizeErrorMessage(error, 'Failed to create user'));
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<UserUpsertFormValues> }) => {
      const response = await apiClient.put<UserItem>(`/users/${payload.id}`, payload.data);
      return response.data;
    },
    onSuccess: async () => {
      message.success('User updated successfully');
      setModalOpen(false);
      setEditingUser(null);
      userForm.resetFields();
      await usersQuery.refetch();
    },
    onError: (error) => {
      message.error(normalizeErrorMessage(error, 'Failed to update user'));
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<UserItem>(`/users/${id}`);
      return response.data;
    },
    onSuccess: async () => {
      message.success('User deactivated successfully');
      await usersQuery.refetch();
    },
    onError: (error) => {
      message.error(normalizeErrorMessage(error, 'Failed to deactivate user'));
    },
  });

  const allPermissions = permissionsMetadataQuery.data?.allPermissions ?? [];
  const roleDefaults = permissionsMetadataQuery.data?.roleDefaults;

  const openCreateModal = () => {
    setModalMode('create');
    setEditingUser(null);
    userForm.setFieldsValue({
      email: undefined,
      password: undefined,
      name: undefined,
      role: 'EDITOR',
      permissions: roleDefaults?.EDITOR ?? [
        PERMISSIONS.CHANNELS_VIEW,
        PERMISSIONS.ASSETS_VIEW,
        PERMISSIONS.SCHEDULES_VIEW,
      ],
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (user: UserItem) => {
    setModalMode('edit');
    setEditingUser(user);
    userForm.setFieldsValue({
      email: user.email,
      password: undefined,
      name: user.name ?? undefined,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
    });
    setModalOpen(true);
  };

  const handleSearch = (value = searchInput) => {
    setSearch(value.trim());
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setRole('all');
    setStatus('all');
    setPage(1);
  };

  const applyRoleDefaults = () => {
    const selectedRole = userForm.getFieldValue('role') as UserRole | undefined;

    if (!selectedRole) return;

    userForm.setFieldValue('permissions', roleDefaults?.[selectedRole] ?? []);
  };

  const handleSubmit = async () => {
    if (modalMode === 'create' && !canCreateUser) {
      message.error('You do not have permission to create users');
      return;
    }

    if (modalMode === 'edit' && !canUpdateUser) {
      message.error('You do not have permission to update users');
      return;
    }

    const values = await userForm.validateFields();

    const basePayload: UserUpsertFormValues = {
      email: values.email?.trim(),
      password: values.password?.trim(),
      name: values.name?.trim() || undefined,
      role: values.role,
      permissions: values.permissions ?? [],
      isActive: values.isActive ?? true,
    };

    if (modalMode === 'edit' && editingUser) {
      const { email, ...updatePayload } = basePayload;
      void email;
      const payload = {
        ...updatePayload,
        password: updatePayload.password || undefined,
      };
      await updateUserMutation.mutateAsync({
        id: editingUser.id,
        data: payload,
      });
      return;
    }

    if (!basePayload.email || !basePayload.password) {
      message.error('Email and password are required');
      return;
    }

    await createUserMutation.mutateAsync(basePayload);
  };

  if (usersQuery.isError) {
    return (
      <Alert
        type="error"
        message="Failed to load users"
        description={(usersQuery.error as Error)?.message}
      />
    );
  }

  return (
    <section className="ops-page user-ops-page">
      <div className="user-ops-surface">
        <div className="user-ops-toolbar-top">
          <Space size={8}>
            <Button icon={<ReloadOutlined />} onClick={() => void usersQuery.refetch()}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
              disabled={!canCreateUser}
            >
              Add User
            </Button>
          </Space>
        </div>

        <div className="user-ops-toolbar-bottom">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search users"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onPressEnter={() => handleSearch()}
            onClear={() => handleSearch('')}
            className="user-ops-search"
          />
          <Select<UserRole | 'all'>
            value={role}
            className="user-ops-role"
            options={[{ value: 'all', label: 'All roles' }, ...roleOptions]}
            onChange={(value) => {
              setRole(value);
              setPage(1);
            }}
          />
          <Select<UserStatusFilter>
            value={status}
            className="user-ops-status"
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button type="default" icon={<FilterOutlined />} onClick={handleResetFilters}>
            Reset
          </Button>
          <Button onClick={() => handleSearch()}>Search</Button>
        </div>

        <Table
          className="ops-table user-ops-table"
          rowKey="id"
          loading={usersQuery.isLoading || usersQuery.isFetching}
          dataSource={usersQuery.data?.data ?? []}
          pagination={{
            current: usersQuery.data?.meta.page ?? page,
            pageSize: usersQuery.data?.meta.limit ?? limit,
            total: usersQuery.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total, range) => `Showing ${range[0]} to ${range[1]} of ${total} users`,
          }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setLimit(pagination.pageSize ?? defaultPageSize);
          }}
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              width: 220,
              render: (value: string | null, record: UserItem) => value || record.email,
            },
            {
              title: 'Email',
              dataIndex: 'email',
            },
            {
              title: 'Role',
              dataIndex: 'role',
              width: 120,
              render: (value: UserRole) => <Tag>{value}</Tag>,
            },
            {
              title: 'Status',
              dataIndex: 'isActive',
              width: 110,
              render: (value: boolean) =>
                value ? (
                  <Tag className="channel-status-tag channel-status-tag-active">Active</Tag>
                ) : (
                  <Tag className="channel-status-tag channel-status-tag-inactive">Inactive</Tag>
                ),
            },
            {
              title: 'Permissions',
              dataIndex: 'permissions',
              width: 170,
              render: (value: string[]) => `${value.length} assigned`,
            },
            {
              title: 'Created At',
              dataIndex: 'createdAt',
              width: 170,
              render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 110,
              render: (_, record: UserItem) => {
                const isCurrentUser = currentUser?.id === record.id;
                return (
                  <Space size="small">
                    <Button
                      type="text"
                      className="channel-action-btn"
                      icon={<EditOutlined />}
                      onClick={() => openEditModal(record)}
                      disabled={!canUpdateUser}
                    />
                    <Popconfirm
                      title="Deactivate this user?"
                      description="User will no longer be able to login."
                      okText="Deactivate"
                      cancelText="Cancel"
                      disabled={isCurrentUser}
                      onConfirm={() => void deactivateUserMutation.mutateAsync(record.id)}
                    >
                      <Button
                        type="text"
                        className="channel-action-btn"
                        icon={<MoreOutlined />}
                        disabled={isCurrentUser || !canDeleteUser}
                      />
                    </Popconfirm>
                  </Space>
                );
              },
            },
          ]}
        />
      </div>

      <Modal
        title={modalMode === 'edit' ? 'Edit User' : 'Create User'}
        open={modalOpen}
        onCancel={() => {
          if (createUserMutation.isPending || updateUserMutation.isPending) return;
          setModalOpen(false);
          setEditingUser(null);
          userForm.resetFields();
        }}
        onOk={() => void handleSubmit()}
        okText={modalMode === 'edit' ? 'Update' : 'Create'}
        cancelText="Cancel"
        okButtonProps={{
          disabled:
            modalMode === 'create'
              ? !canCreateUser
              : !canUpdateUser,
        }}
        confirmLoading={createUserMutation.isPending || updateUserMutation.isPending}
        destroyOnHidden
        width={680}
      >
        <Form<UserUpsertFormValues>
          form={userForm}
          layout="vertical"
          initialValues={{
            role: 'EDITOR',
            permissions: [],
            isActive: true,
          }}
        >
          <div className="user-form-grid">
            <Form.Item
              label="Name"
              name="name"
              rules={[{ max: 120, message: 'Name is too long' }]}
            >
              <Input placeholder="Operations User" maxLength={120} />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: modalMode === 'create', message: 'Email is required' },
                { type: 'email', message: 'Invalid email format' },
              ]}
            >
              <Input placeholder="editor@epg.local" disabled={modalMode === 'edit'} />
            </Form.Item>
          </div>

          <div className="user-form-grid">
            <Form.Item
              label={modalMode === 'create' ? 'Password' : 'Password (optional)'}
              name="password"
              rules={[
                { required: modalMode === 'create', message: 'Password is required' },
                { min: 6, message: 'Password must be at least 6 characters' },
              ]}
            >
              <Input.Password placeholder="Minimum 6 characters" />
            </Form.Item>

            <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Role is required' }]}>
              <Select
                options={roleOptions}
                onChange={(nextRole: UserRole) => {
                  const existingPermissions = userForm.getFieldValue('permissions') as string[] | undefined;
                  if (!existingPermissions || existingPermissions.length === 0) {
                    userForm.setFieldValue('permissions', roleDefaults?.[nextRole] ?? []);
                  }
                }}
              />
            </Form.Item>
          </div>

          <Form.Item label="Permissions" name="permissions" rules={[{ required: true, message: 'Select at least one permission' }]}>
            <Select
              mode="multiple"
              allowClear
              placeholder="Select permissions"
              options={allPermissions.map((permission) => ({ value: permission, label: permission }))}
              optionFilterProp="label"
            />
          </Form.Item>

          <Space style={{ marginBottom: 12 }}>
            <Button onClick={applyRoleDefaults}>Apply Role Defaults</Button>
          </Space>

          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
