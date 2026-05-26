import { EditOutlined, FilterOutlined, MoreOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Alert,
  App as AntdApp,
  Avatar,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { hasPermission, PERMISSIONS } from '../../features/auth/permissions';

import { apiClient } from '../../services/api-client';
import { useAuthStore } from '../../stores/auth.store';
interface Asset {
  id: string;
  name: string;
  type: 'LIVE' | 'VOD';
  dashUrl?: string;
  hlsUrl?: string;
  duration: number;
  posterUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface AssetsResponse {
  data: Asset[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type AssetTypeFilter = 'ALL' | 'LIVE' | 'VOD';
const defaultPageSize = 10;

interface CreateAssetPayload {
  name: string;
  type: 'LIVE' | 'VOD';
  duration: number;
  hlsUrl?: string;
  dashUrl?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
}

type UpdateAssetPayload = Partial<CreateAssetPayload>;

function getAssetInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function AssetsPage() {
  const { message } = AntdApp.useApp();
  const currentUser = useAuthStore((state) => state.user);
  const canCreateAsset = hasPermission(currentUser, PERMISSIONS.ASSETS_CREATE);
  const canUpdateAsset = hasPermission(currentUser, PERMISSIONS.ASSETS_UPDATE);
  const canDeleteAsset = hasPermission(currentUser, PERMISSIONS.ASSETS_DELETE);
  const [assetForm] = Form.useForm<CreateAssetPayload>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<AssetTypeFilter>('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultPageSize);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const {
    data: assetsResponse,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['assets', { search, type, page, limit }],
    queryFn: async () => {
      const response = await apiClient.get<AssetsResponse>('/assets', {
        params: {
          page,
          limit,
          search: search || undefined,
          type: type === 'ALL' ? undefined : type,
        },
      });
      return response.data;
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (payload: CreateAssetPayload) => {
      const response = await apiClient.post<Asset>('/assets', payload);
      return response.data;
    },
    onSuccess: async () => {
      message.success('Asset created successfully');
      setModalOpen(false);
      setEditingAsset(null);
      assetForm.resetFields();
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

      message.error(normalizedMessage || 'Failed to create asset');
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: async (payload: { id: string; data: UpdateAssetPayload }) => {
      const response = await apiClient.put<Asset>(`/assets/${payload.id}`, payload.data);
      return response.data;
    },
    onSuccess: async () => {
      message.success('Asset updated successfully');
      setModalOpen(false);
      setEditingAsset(null);
      assetForm.resetFields();
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

      message.error(normalizedMessage || 'Failed to update asset');
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/assets/${id}`);
    },
    onSuccess: async () => {
      message.success('Asset deleted successfully');
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

      message.error(normalizedMessage || 'Failed to delete asset');
    },
  });

  const handleSearch = (value = searchInput) => {
    setSearch(value.trim());
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setType('ALL');
    setPage(1);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingAsset(null);
    assetForm.setFieldsValue({
      name: undefined,
      type: 'VOD',
      duration: 1800,
      hlsUrl: undefined,
      dashUrl: undefined,
      posterUrl: undefined,
      thumbnailUrl: undefined,
    });
    setModalOpen(true);
  };

  const openEditModal = (asset: Asset) => {
    setModalMode('edit');
    setEditingAsset(asset);
    assetForm.setFieldsValue({
      name: asset.name,
      type: asset.type,
      duration: asset.duration,
      hlsUrl: asset.hlsUrl || undefined,
      dashUrl: asset.dashUrl || undefined,
      posterUrl: asset.posterUrl || undefined,
      thumbnailUrl: asset.thumbnailUrl || undefined,
    });
    setModalOpen(true);
  };

  const handleCreateOrUpdateAsset = async () => {
    if (modalMode === 'create' && !canCreateAsset) {
      message.error('You do not have permission to create assets');
      return;
    }

    if (modalMode === 'edit' && !canUpdateAsset) {
      message.error('You do not have permission to update assets');
      return;
    }

    const values = await assetForm.validateFields();

    const payload: CreateAssetPayload = {
      name: values.name.trim(),
      type: values.type,
      duration: Number(values.duration),
      hlsUrl: values.hlsUrl?.trim() || undefined,
      dashUrl: values.dashUrl?.trim() || undefined,
      posterUrl: values.posterUrl?.trim() || undefined,
      thumbnailUrl: values.thumbnailUrl?.trim() || undefined,
    };

    if (modalMode === 'edit' && editingAsset) {
      await updateAssetMutation.mutateAsync({
        id: editingAsset.id,
        data: payload,
      });
      return;
    }

    await createAssetMutation.mutateAsync(payload);
  };

  if (isError) {
    return (
      <Alert
        type="error"
        message="Failed to load assets"
        description={(error as Error)?.message}
      />
    );
  }

  return (
    <section className="ops-page asset-ops-page">
      <div className="asset-ops-surface">
        <div className="asset-ops-toolbar-top">
          <Space size={8}>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
              disabled={!canCreateAsset}
            >
              Add Asset
            </Button>
          </Space>
        </div>

        <div className="asset-ops-toolbar-bottom">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search assets"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onPressEnter={() => handleSearch()}
            onClear={() => handleSearch('')}
            className="asset-ops-search"
          />
          <Select<AssetTypeFilter>
            value={type}
            className="asset-ops-type"
            options={[
              { value: 'ALL', label: 'All types' },
              { value: 'LIVE', label: 'LIVE' },
              { value: 'VOD', label: 'VOD' },
            ]}
            onChange={(value) => {
              setType(value);
              setPage(1);
            }}
          />
          <Button type="default" icon={<FilterOutlined />} onClick={handleResetFilters}>
            Reset
          </Button>
          <Button onClick={() => handleSearch()}>Search</Button>
        </div>

        <Table
          className="ops-table asset-ops-table"
          rowKey="id"
          loading={isLoading || isFetching}
          dataSource={assetsResponse?.data ?? []}
          pagination={{
            current: assetsResponse?.meta.page ?? page,
            pageSize: assetsResponse?.meta.limit ?? limit,
            total: assetsResponse?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total, range) => `Showing ${range[0]} to ${range[1]} of ${total} assets`,
          }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setLimit(pagination.pageSize ?? defaultPageSize);
          }}
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              width: 280,
              sorter: (a: Asset, b: Asset) => a.name.localeCompare(b.name),
              render: (_: string, record: Asset) => (
                <div className="asset-name-cell">
                  <Avatar
                    shape="square"
                    size={36}
                    src={record.thumbnailUrl || record.posterUrl}
                    className="asset-thumb-avatar"
                  >
                    {getAssetInitials(record.name)}
                  </Avatar>
                  <span className="asset-name-text">{record.name}</span>
                </div>
              ),
            },
            {
              title: 'Type',
              dataIndex: 'type',
              width: 100,
              render: (value: 'LIVE' | 'VOD') => (
                <Tag className={value === 'LIVE' ? 'asset-type-tag asset-type-live' : 'asset-type-tag asset-type-vod'}>
                  {value}
                </Tag>
              ),
            },
            {
              title: 'Duration',
              dataIndex: 'duration',
              width: 100,
              render: (value: number) => formatDuration(value),
              sorter: (a: Asset, b: Asset) => a.duration - b.duration,
            },
            {
              title: 'Playable',
              key: 'playable',
              width: 120,
              render: (_, record: Asset) => {
                const hasPlayableUrl = Boolean(record.hlsUrl || record.dashUrl);

                return hasPlayableUrl ? (
                  <Tag className="channel-status-tag channel-status-tag-active">Ready</Tag>
                ) : (
                  <Tag className="channel-status-tag channel-status-tag-inactive">Missing</Tag>
                );
              },
            },
            {
              title: 'HLS URL',
              dataIndex: 'hlsUrl',
              render: (value?: string) => value || '-',
              ellipsis: true,
            },
            {
              title: 'DASH URL',
              dataIndex: 'dashUrl',
              render: (value?: string) => value || '-',
              ellipsis: true,
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
              render: (_, record: Asset) => (
                <Space size="small">
                  <Button
                    type="text"
                    className="channel-action-btn"
                    icon={<EditOutlined />}
                    onClick={() => openEditModal(record)}
                    disabled={!canUpdateAsset}
                  />
                  <Popconfirm
                    title="Delete this asset?"
                    description="Asset linked to schedules cannot be deleted."
                    okText="Delete"
                    cancelText="Cancel"
                    disabled={!canDeleteAsset}
                    onConfirm={() => void deleteAssetMutation.mutateAsync(record.id)}
                  >
                    <Button
                      type="text"
                      className="channel-action-btn"
                      icon={<MoreOutlined />}
                      disabled={!canDeleteAsset}
                    />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={modalMode === 'edit' ? 'Edit Asset' : 'Create Asset'}
        open={modalOpen}
        onCancel={() => {
          if (createAssetMutation.isPending || updateAssetMutation.isPending) {
            return;
          }

          setModalOpen(false);
          setEditingAsset(null);
          assetForm.resetFields();
        }}
        onOk={() => void handleCreateOrUpdateAsset()}
        okText={modalMode === 'edit' ? 'Update' : 'Create'}
        cancelText="Cancel"
        okButtonProps={{
          disabled:
            modalMode === 'create'
              ? !canCreateAsset
              : !canUpdateAsset,
        }}
        confirmLoading={createAssetMutation.isPending || updateAssetMutation.isPending}
        destroyOnHidden
      >
        <Form<CreateAssetPayload>
          layout="vertical"
          form={assetForm}
          initialValues={{ type: 'VOD', duration: 1800 }}
        >
          <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="Phim Hành Động" maxLength={180} />
          </Form.Item>

          <Form.Item label="Type" name="type" rules={[{ required: true, message: 'Type is required' }]}>
            <Select
              options={[
                { value: 'LIVE', label: 'LIVE' },
                { value: 'VOD', label: 'VOD' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Duration (seconds)" name="duration" rules={[{ required: true, message: 'Duration is required' }]}>
            <InputNumber min={1} step={60} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="HLS URL" name="hlsUrl" rules={[{ type: 'url', warningOnly: true, message: 'Invalid HLS URL' }]}>
            <Input placeholder="https://example.com/master.m3u8" />
          </Form.Item>

          <Form.Item label="DASH URL" name="dashUrl" rules={[{ type: 'url', warningOnly: true, message: 'Invalid DASH URL' }]}>
            <Input placeholder="https://example.com/manifest.mpd" />
          </Form.Item>

          <Form.Item label="Poster URL" name="posterUrl" rules={[{ type: 'url', warningOnly: true, message: 'Invalid poster URL' }]}>
            <Input placeholder="https://example.com/poster.jpg" />
          </Form.Item>

          <Form.Item label="Thumbnail URL" name="thumbnailUrl" rules={[{ type: 'url', warningOnly: true, message: 'Invalid thumbnail URL' }]}>
            <Input placeholder="https://example.com/thumb.jpg" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
