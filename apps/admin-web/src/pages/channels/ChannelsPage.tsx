import { EditOutlined, FilterOutlined, MoreOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Alert, App as AntdApp, Avatar, Button, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { hasPermission, PERMISSIONS } from '../../features/auth/permissions';

import { apiClient } from '../../services/api-client';
import { useAuthStore } from '../../stores/auth.store';

interface Channel {
  id: string;
  name: string;
  epgId: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChannelsResponse {
  data: Channel[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ScheduleLite {
  id: string;
  channelId: string;
  stopTime: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
}

interface SchedulesResponse {
  data: ScheduleLite[];
}

interface CreateChannelPayload {
  name: string;
  epgId?: string;
  logoUrl?: string;
  isActive?: boolean;
}

type UpdateChannelPayload = Partial<CreateChannelPayload>;
type StatusFilter = 'all' | 'active' | 'inactive';

const defaultPageSize = 10;

function getChannelInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function ChannelsPage() {
  const { message } = AntdApp.useApp();
  const currentUser = useAuthStore((state) => state.user);
  const canCreateChannel = hasPermission(currentUser, PERMISSIONS.CHANNELS_CREATE);
  const canUpdateChannel = hasPermission(currentUser, PERMISSIONS.CHANNELS_UPDATE);
  const canDeleteChannel = hasPermission(currentUser, PERMISSIONS.CHANNELS_DELETE);
  const [createForm] = Form.useForm<CreateChannelPayload>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultPageSize);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const isActive = useMemo(() => {
    if (status === 'active') {
      return true;
    }

    if (status === 'inactive') {
      return false;
    }

    return undefined;
  }, [status]);

  const {
    data: channelsResponse,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['channels', { search, status, page, limit }],
    queryFn: async () => {
      const response = await apiClient.get<ChannelsResponse>('/channels', {
        params: {
          page,
          limit,
          search: search || undefined,
          isActive,
        },
      });
      return response.data;
    },
  });

  const onAirQuery = useQuery({
    queryKey: ['channels', 'on-air'],
    queryFn: async () => {
      const now = new Date();
      // Query today's schedules from midnight to now.
      // limit=100 is safe (500 caused 400 Bad Request from backend validation).
      // Filter PUBLISHED + still running client-side.
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const to = now.toISOString();
      const response = await apiClient.get<SchedulesResponse>('/schedules', {
        params: { from, to, page: 1, limit: 100 },
      });
      const schedules = response.data.data ?? [];
      return new Set(
        schedules
          .filter((s) => s.status === 'PUBLISHED' && new Date(s.stopTime).getTime() > now.getTime())
          .map((s) => s.channelId),
      );
    },
    refetchInterval: 30_000,
  });

  const createChannelMutation = useMutation({
    mutationFn: async (payload: CreateChannelPayload) => {
      const response = await apiClient.post<Channel>('/channels', payload);
      return response.data;
    },
    onSuccess: async () => {
      message.success('Channel created successfully');
      setCreateModalOpen(false);
      createForm.resetFields();
      await refetch();
    },
    onError: (mutationError: unknown) => {
      const responseMessage =
        typeof mutationError === 'object' &&
          mutationError !== null &&
          'response' in mutationError &&
          typeof (mutationError as { response?: { data?: { message?: string | string[] } } }).response?.data
            ?.message !== 'undefined'
          ? (mutationError as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;

      const normalizedMessage = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage;

      message.error(normalizedMessage || 'Failed to create channel');
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: async (payload: { id: string; data: UpdateChannelPayload }) => {
      const response = await apiClient.put<Channel>(`/channels/${payload.id}`, payload.data);
      return response.data;
    },
    onSuccess: async () => {
      message.success('Channel updated successfully');
      setCreateModalOpen(false);
      setEditingChannel(null);
      createForm.resetFields();
      setLogoPreviewUrl(null);
      await refetch();
    },
    onError: (mutationError: unknown) => {
      const responseMessage =
        typeof mutationError === 'object' &&
          mutationError !== null &&
          'response' in mutationError &&
          typeof (mutationError as { response?: { data?: { message?: string | string[] } } }).response?.data
            ?.message !== 'undefined'
          ? (mutationError as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;

      const normalizedMessage = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage;

      message.error(normalizedMessage || 'Failed to update channel');
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/channels/${id}`);
    },
    onSuccess: async () => {
      message.success('Channel deleted successfully');
      await refetch();
    },
    onError: (mutationError: unknown) => {
      const responseMessage =
        typeof mutationError === 'object' &&
          mutationError !== null &&
          'response' in mutationError &&
          typeof (mutationError as { response?: { data?: { message?: string | string[] } } }).response?.data
            ?.message !== 'undefined'
          ? (mutationError as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;

      const normalizedMessage = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage;

      message.error(normalizedMessage || 'Failed to delete channel');
    },
  });

  const handleSearch = (value = searchInput) => {
    setSearch(value.trim());
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('all');
    setPage(1);
  };

  const handleCreateOrUpdateChannel = async () => {
    if (modalMode === 'create' && !canCreateChannel) {
      message.error('You do not have permission to create channels');
      return;
    }

    if (modalMode === 'edit' && !canUpdateChannel) {
      message.error('You do not have permission to update channels');
      return;
    }

    if (logoUploading) {
      message.warning('Please wait until logo upload is complete');
      return;
    }

    const values = await createForm.validateFields();
    const payload: CreateChannelPayload = {
      name: values.name.trim(),
      epgId: values.epgId?.trim() || undefined,
      logoUrl: values.logoUrl?.trim() || undefined,
      isActive: values.isActive ?? true,
    };

    if (modalMode === 'edit' && editingChannel) {
      await updateChannelMutation.mutateAsync({
        id: editingChannel.id,
        data: payload,
      });
      return;
    }

    await createChannelMutation.mutateAsync(payload);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingChannel(null);
    createForm.setFieldsValue({ name: undefined, epgId: undefined, logoUrl: undefined, isActive: true });
    setLogoPreviewUrl(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (channel: Channel) => {
    setModalMode('edit');
    setEditingChannel(channel);
    createForm.setFieldsValue({
      name: channel.name,
      epgId: channel.epgId || undefined,
      logoUrl: channel.logoUrl || undefined,
      isActive: channel.isActive,
    });
    setLogoPreviewUrl(channel.logoUrl || null);
    setCreateModalOpen(true);
  };

  const handleUploadLogo: NonNullable<UploadProps['customRequest']> = async (options) => {
    const file = options.file;

    if (!(file instanceof File)) {
      options.onError?.(new Error('Invalid file upload request'));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLogoUploading(true);

    try {
      const response = await apiClient.post<{ logoUrl: string }>('/channels/upload-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const uploadedLogoUrl = response.data.logoUrl;

      createForm.setFieldValue('logoUrl', uploadedLogoUrl);
      setLogoPreviewUrl(uploadedLogoUrl);
      options.onSuccess?.(response.data);
      message.success('Logo uploaded successfully');
    } catch (uploadError: unknown) {
      const responseMessage =
        typeof uploadError === 'object' &&
          uploadError !== null &&
          'response' in uploadError &&
          typeof (uploadError as { response?: { data?: { message?: string | string[] } } }).response?.data
            ?.message !== 'undefined'
          ? (uploadError as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;

      const normalizedMessage = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage;

      const errorMessage = normalizedMessage || 'Logo upload failed';
      options.onError?.(new Error(errorMessage));
      message.error(errorMessage);
    } finally {
      setLogoUploading(false);
    }
  };

  if (isError) {
    return (
      <Alert
        type="error"
        message="Failed to load channels"
        description={(error as Error)?.message}
      />
    );
  }

  return (
    <section className="ops-page channel-ops-page">
      <div className="channel-ops-surface">
        <div className="channel-ops-toolbar-top">
          <Space size={8}>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
              disabled={!canCreateChannel}
            >
              Add Channel
            </Button>
          </Space>
        </div>

        <div className="channel-ops-toolbar-bottom">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search channels"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onPressEnter={() => handleSearch()}
            onClear={() => handleSearch('')}
            className="channel-ops-search"
          />
          <Select<StatusFilter>
            value={status}
            className="channel-ops-status"
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
          <Button onClick={() => handleSearch()}>
            Search
          </Button>
        </div>

        <Table
          className="ops-table channel-ops-table"
          rowKey="id"
          dataSource={channelsResponse?.data ?? []}
          loading={isLoading || isFetching}
          pagination={{
            current: channelsResponse?.meta.page ?? page,
            pageSize: channelsResponse?.meta.limit ?? limit,
            total: channelsResponse?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total, range) => `Showing ${range[0]} to ${range[1]} of ${total} channels`,
          }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setLimit(pagination.pageSize ?? defaultPageSize);
          }}
          columns={[
            {
              title: 'Channel',
              dataIndex: 'name',
              width: 240,
              render: (_: string, record: Channel) => (
              <div className="channel-cell">
                  <div className="channel-logo-box">
                    {record.logoUrl ? (
                      <img
                        src={record.logoUrl}
                        alt={record.name}
                        className="channel-logo-img"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : null}
                    {!record.logoUrl && (
                      <span className="channel-logo-initial">{getChannelInitials(record.name)}</span>
                    )}
                  </div>
                  <span className="channel-cell-name">{record.name}</span>
                </div>
              ),
            },
            {
              title: 'EPG ID',
              dataIndex: 'epgId',
              render: (value: string | null) => value || '-',
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
              title: 'On-Air',
              width: 100,
              render: (_: unknown, record: Channel) =>
                onAirQuery.data?.has(record.id) ? (
                  <Tag className="channel-status-tag channel-status-tag-active">Yes</Tag>
                ) : (
                  <Tag className="channel-status-tag channel-status-tag-inactive">No</Tag>
                ),
            },
            {
              title: 'Timezone',
              width: 170,
              render: () => 'Asia/Ho_Chi_Minh',
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
              width: 120,
              render: (_, record: Channel) => (
                <Space size="small">
                    <Button
                      type="text"
                      className="channel-action-btn"
                      icon={<EditOutlined />}
                      onClick={() => openEditModal(record)}
                      disabled={!canUpdateChannel}
                    />
                  <Popconfirm
                    title="Delete this channel?"
                    description="Channel will be set to inactive."
                    okText="Delete"
                    cancelText="Cancel"
                    disabled={!canDeleteChannel}
                    onConfirm={() => void deleteChannelMutation.mutateAsync(record.id)}
                  >
                    <Button
                      type="text"
                      className="channel-action-btn"
                      icon={<MoreOutlined />}
                      disabled={!canDeleteChannel}
                    />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={modalMode === 'edit' ? 'Edit Channel' : 'Create Channel'}
        open={createModalOpen}
        onCancel={() => {
          if (createChannelMutation.isPending || updateChannelMutation.isPending) {
            return;
          }

          setCreateModalOpen(false);
          setEditingChannel(null);
          createForm.resetFields();
          setLogoPreviewUrl(null);
        }}
        onOk={() => void handleCreateOrUpdateChannel()}
        okText={modalMode === 'edit' ? 'Update' : 'Create'}
        cancelText="Cancel"
        okButtonProps={{
          disabled:
            modalMode === 'create'
              ? !canCreateChannel
              : !canUpdateChannel,
        }}
        confirmLoading={createChannelMutation.isPending || updateChannelMutation.isPending}
        destroyOnHidden
      >
        <Form<CreateChannelPayload>
          layout="vertical"
          form={createForm}
          initialValues={{ isActive: true }}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="VTV3" maxLength={120} />
          </Form.Item>

          <Form.Item
            label="EPG ID"
            name="epgId"
            rules={[{ max: 120, message: 'EPG ID is too long' }]}
          >
            <Input placeholder="vtv3_hd" maxLength={120} />
          </Form.Item>

          <Form.Item
            label="Logo URL"
            name="logoUrl"
            rules={[{ type: 'url', warningOnly: true, message: 'Logo URL should be a valid URL' }]}
          >
            <Input placeholder="https://example.com/logo.png" />
          </Form.Item>

          <Form.Item label="Upload Logo">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space align="center">
                <div className="channel-logo-box channel-logo-box-lg">
                    {(logoPreviewUrl || createForm.getFieldValue('logoUrl')) ? (
                      <img
                        src={logoPreviewUrl || createForm.getFieldValue('logoUrl')}
                        alt="Logo preview"
                        className="channel-logo-img"
                      />
                    ) : (
                      <span className="channel-logo-initial">LOGO</span>
                    )}
                  </div>
                <Upload
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  maxCount={1}
                  showUploadList={false}
                  customRequest={handleUploadLogo}
                  disabled={!canUpdateChannel && modalMode === 'edit'}
                >
                  <Button loading={logoUploading} disabled={!canUpdateChannel && modalMode === 'edit'}>
                    Upload Image
                  </Button>
                </Upload>
                <Button
                  danger
                  disabled={
                    (!canUpdateChannel && modalMode === 'edit')
                    || (!createForm.getFieldValue('logoUrl') && !logoPreviewUrl)
                  }
                  onClick={() => {
                    createForm.setFieldValue('logoUrl', undefined);
                    setLogoPreviewUrl(null);
                  }}
                >
                  Remove
                </Button>
              </Space>
            </Space>
          </Form.Item>

          <Form.Item
            label="Active"
            name="isActive"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
