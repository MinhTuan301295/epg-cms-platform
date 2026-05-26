import { ReloadOutlined, RocketOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { Button, DatePicker, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import type { Channel } from '../types/schedule.type';

interface TimelineToolbarProps {
  channels: Channel[];
  selectedChannel?: string;
  selectedDate: string;
  zoomLevel: number;
  onChannelChange: (channelId?: string) => void;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
  onZoomChange: (zoomLevel: number) => void;
  onPublishChannel: () => void;
  publishableCount: number;
  publishChannelLoading: boolean;
  publishChannelDisabled: boolean;
}

export function TimelineToolbar({
  channels,
  selectedChannel,
  selectedDate,
  zoomLevel,
  onChannelChange,
  onDateChange,
  onRefresh,
  onZoomChange,
  onPublishChannel,
  publishableCount,
  publishChannelLoading,
  publishChannelDisabled,
}: TimelineToolbarProps) {
  const channelOptions = Array.isArray(channels)
    ? channels.map((channel) => ({
        value: channel.id,
        label: channel.name,
      }))
    : [];

  return (
    <div className="timeline-toolbar">
      <Space className="timeline-toolbar-main">
        <Select
          showSearch
          allowClear
          placeholder="Select channel"
          value={selectedChannel}
          optionFilterProp="label"
          className="timeline-channel-select"
          options={channelOptions}
          onChange={onChannelChange}
        />
        <DatePicker
          value={dayjs(selectedDate)}
          onChange={(value) => {
            if (value) {
              onDateChange(value.format('YYYY-MM-DD'));
            }
          }}
        />
        <Button className="toolbar-btn toolbar-btn-refresh" icon={<ReloadOutlined />} onClick={onRefresh}>
          Refresh
        </Button>
        <Button
          type="primary"
          className="toolbar-btn toolbar-btn-primary toolbar-btn-publish"
          icon={<RocketOutlined />}
          onClick={onPublishChannel}
          loading={publishChannelLoading}
          disabled={publishChannelDisabled}
        >
          Publish Channel ({publishableCount})
        </Button>
      </Space>
      <Space className="timeline-toolbar-actions">
        <Typography.Text type="secondary" className="timeline-range-label">
          00:00 to 24:00
        </Typography.Text>
        <Button className="toolbar-btn" icon={<ZoomOutOutlined />} onClick={() => onZoomChange(Math.max(0.75, zoomLevel - 0.25))} />
        <Typography.Text className="timeline-zoom-label">{Math.round(zoomLevel * 100)}%</Typography.Text>
        <Button className="toolbar-btn" icon={<ZoomInOutlined />} onClick={() => onZoomChange(Math.min(2, zoomLevel + 0.25))} />
      </Space>
    </div>
  );
}
