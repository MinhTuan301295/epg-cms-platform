import {
  DeleteOutlined,
  RocketOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import type { Channel, Schedule, ScheduleStatus, UpdateSchedulePayload } from '../types/schedule.type';
import { formatDuration } from '../utils/timeline-time.util';
import {
  applyEdgeSnap,
  findPreviousSchedule,
  hasOverlap,
} from '../utils/schedule-position.util';

interface ScheduleDetailPanelProps {
  schedule?: Schedule;
  channels: Channel[];
  /** All schedules on the same channel — used for snap / overlap checks. */
  schedules: Schedule[];
  onSave: (scheduleId: string, payload: UpdateSchedulePayload) => Promise<void>;
  onDelete: (scheduleId: string) => Promise<void>;
  onPublish: (scheduleId: string) => Promise<void>;
  publishing?: boolean;
  deleting?: boolean;
}

interface ScheduleDetailForm {
  duration: number;
  startTime: dayjs.Dayjs;
  status: ScheduleStatus;
}

interface OverlapState {
  message: string;
  /** startTime to snap to after previous schedule — null if no previous exists */
  snapStartTime: string | null;
}

export function ScheduleDetailPanel({
  schedule,
  channels,
  schedules,
  onSave,
  onDelete,
  onPublish,
  publishing = false,
  deleting = false,
}: ScheduleDetailPanelProps) {
  const [form] = Form.useForm<ScheduleDetailForm>();
  const [saving, setSaving] = useState(false);
  const [overlapState, setOverlapState] = useState<OverlapState | null>(null);

  useEffect(() => {
    // Clear overlap warning whenever the selected schedule changes
    setOverlapState(null);

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
      <aside className="schedule-detail-panel schedule-detail-empty">
        <div className="timeline-panel-title">Schedule Detail</div>
        <div className="detail-empty-body">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: '#94a3b8' }}>Select a schedule</span>
            }
          />
          <p className="detail-empty-hint">Click any program block to view details</p>
        </div>
      </aside>
    );
  }

  const channel = channels.find((item) => item.id === schedule.channelId);
  const canPublish = schedule.status === 'DRAFT';

  // ── Core save logic ──────────────────────────────────────────────────────
  const attemptSave = async (rawStartTime: dayjs.Dayjs, duration: number, status: ScheduleStatus) => {
    setOverlapState(null);
    setSaving(true);

    try {
      const startDate = rawStartTime.toDate();

      // 1. Apply edge-snap before any overlap check
      const snapped = applyEdgeSnap({
        schedules,
        channelId: schedule.channelId,
        startTime: startDate,
        durationSeconds: duration,
        excludeId: schedule.id,
      });

      // 2. Overlap pre-check (uses the snapped position)
      if (hasOverlap(schedules, schedule.channelId, snapped.startTime, snapped.stopTime, schedule.id)) {
        // Find previous so we can offer "Snap after previous"
        const prev = findPreviousSchedule(schedules, schedule.channelId, snapped.startTime, schedule.id);
        const snapStart = prev ? prev.stopTime : null;

        const snapHint = snapStart
          ? `Suggested start: ${dayjs(snapStart).format('HH:mm')} (after "${prev?.name ?? 'previous'}")`
          : 'No valid slot found before this position.';

        setOverlapState({
          message: `This position overlaps an existing schedule. ${snapHint}`,
          snapStartTime: snapStart,
        });

        // Update form to show the snapped position so user sees what was tried
        form.setFieldsValue({ startTime: dayjs(snapped.startTime) });
        return;
      }

      // 3. All good — call the API with snapped values
      await onSave(schedule.id, {
        startTime: snapped.startTime.toISOString(),
        stopTime: snapped.stopTime.toISOString(),
        duration: snapped.durationSeconds,
        status,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async (values: ScheduleDetailForm) => {
    await attemptSave(values.startTime, values.duration, values.status);
  };

  // ── "Snap after previous" quick action ──────────────────────────────────
  const handleSnapAfterPrevious = async () => {
    if (!overlapState?.snapStartTime) return;

    const currentValues = form.getFieldsValue();
    const snapStart = dayjs(overlapState.snapStartTime);
    const newStop = dayjs(overlapState.snapStartTime).add(currentValues.duration, 'second');

    // Update form to reflect the snap visually
    form.setFieldsValue({ startTime: snapStart });
    setOverlapState(null);

    await onSave(schedule.id, {
      startTime: snapStart.toISOString(),
      stopTime: newStop.toISOString(),
      duration: currentValues.duration,
      status: currentValues.status,
    });
  };

  return (
    <aside className="schedule-detail-panel">
      <div className="timeline-panel-title">Schedule Detail</div>
      <Typography.Title level={5}>{schedule.name}</Typography.Title>
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="Channel">{channel?.name ?? schedule.channel?.name}</Descriptions.Item>
        <Descriptions.Item label="Asset">{schedule.asset?.name ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Stop Time">
          {dayjs(schedule.stopTime).format('YYYY-MM-DD HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="Duration">{formatDuration(schedule.duration)}</Descriptions.Item>
      </Descriptions>

      {overlapState ? (
        <Alert
          type="error"
          showIcon
          closable
          style={{ marginBottom: 12 }}
          message="Overlap detected"
          description={overlapState.message}
          action={
            overlapState.snapStartTime ? (
              <Button
                size="small"
                type="primary"
                danger
                icon={<ThunderboltOutlined />}
                onClick={handleSnapAfterPrevious}
              >
                Snap after previous
              </Button>
            ) : null
          }
          onClose={() => setOverlapState(null)}
        />
      ) : null}

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item label="Start time" name="startTime" rules={[{ required: true }]}>
          <DatePicker
            showTime={{ format: 'HH:mm', minuteStep: 5 }}
            format="YYYY-MM-DD HH:mm"
            className="detail-field"
            onChange={() => setOverlapState(null)}
          />
        </Form.Item>
        <Form.Item label="Duration (seconds)" name="duration" rules={[{ required: true }]}>
          <InputNumber min={300} step={300} className="detail-field" />
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
        <Space className="schedule-detail-actions" size={8}>
          <Tooltip title="Save">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              className="schedule-detail-action-btn"
              aria-label="Save"
            >
              <span className="schedule-detail-action-label">Save</span>
            </Button>
          </Tooltip>
          <Tooltip title={canPublish ? 'Publish' : 'Only DRAFT schedules can be published'}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                icon={<RocketOutlined />}
                loading={publishing}
                disabled={!canPublish}
                onClick={() => void onPublish(schedule.id)}
                className="schedule-detail-action-btn"
                aria-label="Publish"
              >
                <span className="schedule-detail-action-label">Publish</span>
              </Button>
            </span>
          </Tooltip>
          <Popconfirm
            title="Remove?"
            description="This will REMOVE and hide this item from timeline."
            okText="Remove now"
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={() => onDelete(schedule.id)}
          >
            <Tooltip title="Remove from timeline">
              <Button
                danger
                loading={deleting}
                icon={<DeleteOutlined />}
                className="schedule-detail-action-btn"
                aria-label="Remove"
              >
                <span className="schedule-detail-action-label">Remove</span>
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      </Form>
    </aside>
  );
}
