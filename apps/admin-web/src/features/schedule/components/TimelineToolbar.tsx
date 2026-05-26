import { ReloadOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
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
}: TimelineToolbarProps) {
  return (
    <div className="timeline-toolbar">
      <Space wrap>
        <Select
          showSearch
          allowClear
          placeholder="Select channel"
          value={selectedChannel}
          optionFilterProp="label"
          className="timeline-channel-select"
          options={channels.map((channel) => ({
            value: channel.id,
            label: channel.name,
          }))}
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
        <Button icon={<ReloadOutlined />} onClick={onRefresh}>
          Refresh
        </Button>
      </Space>
      <Space wrap>
        <Typography.Text type="secondary">00:00 to 24:00</Typography.Text>
        <Button icon={<ZoomOutOutlined />} onClick={() => onZoomChange(Math.max(0.75, zoomLevel - 0.25))} />
        <Typography.Text>{Math.round(zoomLevel * 100)}%</Typography.Text>
        <Button icon={<ZoomInOutlined />} onClick={() => onZoomChange(Math.min(2, zoomLevel + 0.25))} />
      </Space>
    </div>
  );
}
