import { SaveOutlined } from '@ant-design/icons';
import { Button, DatePicker, Descriptions, Empty, Form, InputNumber, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import type { Channel, Schedule, ScheduleStatus, UpdateSchedulePayload } from '../types/schedule.type';
import { formatDuration } from '../utils/timeline-time.util';

interface ScheduleDetailPanelProps {
  schedule?: Schedule;
  channels: Channel[];
  onSave: (scheduleId: string, payload: UpdateSchedulePayload) => Promise<void>;
}

interface ScheduleDetailForm {
  duration: number;
  startTime: dayjs.Dayjs;
  status: ScheduleStatus;
}

export function ScheduleDetailPanel({ schedule, channels, onSave }: ScheduleDetailPanelProps) {
  const [form] = Form.useForm<ScheduleDetailForm>();

  useEffect(() => {
    if (!schedule) {
      form.resetFields();
      return;
    }

    form.setFieldsValue({
      duration: schedule.duration,
      startTime: dayjs(schedule.startTime),
      status: schedule.status,
    });
  }, [form, schedule]);

  if (!schedule) {
    return (
      <aside className="schedule-detail-panel">
        <div className="timeline-panel-title">Schedule Detail</div>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Select a schedule" />
      </aside>
    );
  }

  const channel = channels.find((item) => item.id === schedule.channelId);

  const handleFinish = async (values: ScheduleDetailForm) => {
    await onSave(schedule.id, {
      duration: values.duration,
      startTime: values.startTime.toISOString(),
      status: values.status,
    });
  };

  return (
    <aside className="schedule-detail-panel">
      <div className="timeline-panel-title">Schedule Detail</div>
      <Typography.Title level={5}>{schedule.name}</Typography.Title>
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="Channel">{channel?.name ?? schedule.channel?.name}</Descriptions.Item>
        <Descriptions.Item label="Asset">{schedule.asset?.name ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Stop Time">{dayjs(schedule.stopTime).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        <Descriptions.Item label="Duration">{formatDuration(schedule.duration)}</Descriptions.Item>
      </Descriptions>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item label="Start time" name="startTime" rules={[{ required: true }]}>
          <DatePicker showTime className="detail-field" />
        </Form.Item>
        <Form.Item label="Duration seconds" name="duration" rules={[{ required: true }]}>
          <InputNumber min={60} step={60} className="detail-field" />
        </Form.Item>
        <Form.Item label="Status" name="status" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
            Save
          </Button>
        </Space>
      </Form>
    </aside>
  );
}
