import { FileImageOutlined, SearchOutlined } from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';
import { Empty, Input, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import type { Asset } from '../types/schedule.type';
import { formatDuration } from '../utils/timeline-time.util';
import { resolveMediaUrl } from '../../../utils/media-url';

interface AssetLibraryProps {
  assets: Asset[];
}

export function AssetLibrary({ assets }: AssetLibraryProps) {
  const [search, setSearch] = useState('');

  // Defensive normalisation: if the backend envelope leaks through, extract
  // the array. Never call .map / .filter on a non-array.
  const safeAssets: Asset[] = Array.isArray(assets)
    ? assets
    : Array.isArray((assets as unknown as { data?: Asset[] })?.data)
      ? (assets as unknown as { data: Asset[] }).data
      : [];

  const filteredAssets = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return safeAssets;
    return safeAssets.filter((asset) => asset.name.toLowerCase().includes(keyword));
  }, [safeAssets, search]);

  return (
    <aside className="schedule-asset-library">
      <div className="timeline-panel-title">Asset Library</div>
      <Input
        className="asset-library-search"
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

interface DraggableAssetProps {
  asset: Asset;
}

export function DraggableAsset({ asset }: DraggableAssetProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `asset:${asset.id}`,
    data: { kind: 'asset', asset },
  });

  return (
    <div
      ref={setNodeRef}
      className="asset-card"
      style={{ opacity: isDragging ? 0.35 : 1 }}
      {...listeners}
      {...attributes}
    >
      <AssetCardContent asset={asset} />
    </div>
  );
}

/** Stateless card body — reused inside DragOverlay as a floating preview. */
export function AssetCardContent({ asset }: { asset: Asset }) {
  return (
    <>
      <AssetPoster asset={asset} />
      <div className="asset-card-body">
        <Typography.Text strong ellipsis style={{ color: '#f1f5f9', fontSize: 13 }}>
          {asset.name}
        </Typography.Text>
        <div className="asset-meta">
          <Tag className={asset.type === 'LIVE' ? 'asset-type-tag asset-type-live' : 'asset-type-tag asset-type-vod'}>
            {asset.type}
          </Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDuration(asset.duration)}
          </Typography.Text>
        </div>
      </div>
    </>
  );
}

/** Poster with graceful fallback — no broken-image icons ever appear. */
function AssetPoster({ asset }: { asset: Asset }) {
  const [imgError, setImgError] = useState(false);
  const hasSrc = Boolean(asset.posterUrl || asset.thumbnailUrl) && !imgError;
  // Derive a short initial from the asset name for the placeholder
  const initial = asset.name.trim().charAt(0).toUpperCase();

  if (hasSrc) {
    return (
      <div className="asset-poster">
        <img
          src={resolveMediaUrl(asset.posterUrl ?? asset.thumbnailUrl) ?? ''}
          alt=""
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className="asset-poster asset-poster-fallback">
      <FileImageOutlined style={{ fontSize: 16, color: '#60a5fa', marginBottom: 2 }} />
      <span className="asset-poster-initial">{initial}</span>
    </div>
  );
}
