import { SearchOutlined } from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';
import { Empty, Input, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import type { Asset } from '../types/schedule.type';
import { formatDuration } from '../utils/timeline-time.util';

interface AssetLibraryProps {
  assets: Asset[];
}

export function AssetLibrary({ assets }: AssetLibraryProps) {
  const [search, setSearch] = useState('');
  const filteredAssets = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return assets;
    }

    return assets.filter((asset) => asset.name.toLowerCase().includes(keyword));
  }, [assets, search]);

  return (
    <aside className="schedule-asset-library">
      <div className="timeline-panel-title">Asset Library</div>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search assets"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="asset-list">
        {filteredAssets.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No assets" />
        ) : (
          filteredAssets.map((asset) => <DraggableAsset key={asset.id} asset={asset} />)
        )}
      </div>
    </aside>
  );
}

function DraggableAsset({ asset }: { asset: Asset }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `asset:${asset.id}`,
    data: {
      kind: 'asset',
      asset,
    },
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className="asset-card"
      style={style}
      data-dragging={isDragging}
      {...listeners}
      {...attributes}
    >
      <div className="asset-poster">
        {asset.posterUrl || asset.thumbnailUrl ? (
          <img src={asset.posterUrl ?? asset.thumbnailUrl ?? ''} alt="" />
        ) : (
          <span>{asset.type}</span>
        )}
      </div>
      <div className="asset-card-body">
        <Typography.Text strong ellipsis>
          {asset.name}
        </Typography.Text>
        <div className="asset-meta">
          <Tag color={asset.type === 'LIVE' ? 'red' : 'blue'}>{asset.type}</Tag>
          <Typography.Text type="secondary">{formatDuration(asset.duration)}</Typography.Text>
        </div>
      </div>
    </div>
  );
}
