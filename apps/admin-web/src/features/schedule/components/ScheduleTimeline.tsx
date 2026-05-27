import { DndContext, DragOverlay, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import type { DragStartEvent } from '@dnd-kit/core';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'antd';
import { App as AntdApp } from 'antd';
import { AssetCardContent, AssetLibrary } from './AssetLibrary';
import { ScheduleDetailPanel } from './ScheduleDetailPanel';
import { TimelineGrid } from './TimelineGrid';
import { TimelineToolbar } from './TimelineToolbar';
import { WarningPanel } from './WarningPanel';
import { useScheduleDrag } from '../hooks/useScheduleDrag';
import type { TimelineDragPreview } from '../hooks/useScheduleDrag';
import { useScheduleResize } from '../hooks/useScheduleResize';
import { useTimelineMutations } from '../hooks/useTimelineMutations';
import { useScheduleStore } from '../stores/schedule.store';
import type { Asset, Channel, Schedule, UpdateSchedulePayload } from '../types/schedule.type';
import { addSeconds, formatDuration, formatTimelineTime } from '../utils/timeline-time.util';
import { findPreviousSchedule } from '../utils/schedule-position.util';
import { createTimelineRange } from '../utils/timeline.util';

const basePixelsPerHour = 160;

interface ScheduleTimelineProps {
  channels: Channel[];
  assets: Asset[];
  schedules: Schedule[];
  schedulesLoading?: boolean;
  /** Non-null when the schedules fetch failed. Shown only in the timeline area. */
  schedulesError?: unknown;
}

export function ScheduleTimeline({
  channels,
  assets,
  schedules,
  schedulesLoading = false,
  schedulesError,
}: ScheduleTimelineProps) {
  const { message } = AntdApp.useApp();

  const selectedSchedule = useScheduleStore((state) => state.selectedSchedule);
  const warnings = useScheduleStore((state) => state.warnings);
  const loading = useScheduleStore((state) => state.loading);
  const zoomLevel = useScheduleStore((state) => state.zoomLevel);
  const selectedChannel = useScheduleStore((state) => state.selectedChannel);
  const selectedDate = useScheduleStore((state) => state.selectedDate);
  const setSelectedSchedule = useScheduleStore((state) => state.setSelectedSchedule);
  const setChannel = useScheduleStore((state) => state.setChannel);
  const setDate = useScheduleStore((state) => state.setDate);
  const setZoomLevel = useScheduleStore((state) => state.setZoomLevel);
  const refreshTimeline = useScheduleStore((state) => state.refreshTimeline);
  const ensureChannel = useScheduleStore((state) => state.ensureChannel);

  // Auto-select the first channel once channels are available.
  useEffect(() => {
    if (channels.length > 0) {
      ensureChannel(channels);
    }
  }, [channels, ensureChannel]);

  const pixelsPerHour = basePixelsPerHour * zoomLevel;

  // When a specific channel is selected in the toolbar, show only that row.
  const selectedChannels = useMemo(
    () =>
      selectedChannel
        ? channels.filter((channel) => channel.id === selectedChannel)
        : channels,
    [channels, selectedChannel],
  );

  const range = useMemo(() => createTimelineRange(selectedDate), [selectedDate]);

  const {
    createSchedule,
    updateSchedule,
    deleteSchedule,
    deleting,
    publishSchedule,
    publishing,
    publishSchedulesByChannel,
    publishingChannel,
  } = useTimelineMutations();

  // ── DragOverlay tracking ─────────────────────────────────────────────────
  const [draggingAsset, setDraggingAsset] = useState<Asset | null>(null);
  const [draggingSchedule, setDraggingSchedule] = useState<Schedule | null>(null);
  const [dragPreview, setDragPreview] = useState<TimelineDragPreview | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as
      | {
          kind: string;
          asset?: Asset;
          schedule?: Schedule;
        }
      | undefined;

    if (data?.kind === 'asset' && data.asset) {
      setDraggingAsset(data.asset);
      setDraggingSchedule(null);
      return;
    }

    if (data?.kind === 'schedule' && data.schedule) {
      setDraggingSchedule(data.schedule);
      setDraggingAsset(null);
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    setDraggingAsset(null);
    setDraggingSchedule(null);
    setDragPreview(null);
  }, []);

  // ── Overlap guard ────────────────────────────────────────────────────────
  const handleOverlapDetected = useCallback((nextSuggestedStart?: Date) => {
    message.warning({
      content: nextSuggestedStart
        ? `Overlap detected. Try around ${dayjs(nextSuggestedStart).format('HH:mm')}.`
        : 'This position overlaps an existing schedule. Please choose another time.',
      key: 'overlap-warning',
    });
  }, [message]);

  // ── Schedule mutations ───────────────────────────────────────────────────
  const createScheduleFromAsset = useCallback(
    async (
      asset: Asset,
      channelId: string,
      startTime: Date,
      stopTime: Date,
      autoSnap: boolean,
    ) => {
      const response = await createSchedule({
        channelId,
        assetId: asset.id,
        startTime: startTime.toISOString(),
        stopTime: stopTime.toISOString(),
        duration: asset.duration,
        name: asset.name,
        autoSnap,
        status: 'DRAFT',
      });

      setSelectedSchedule(response.data);
      message.success(`"${asset.name}" scheduled`);
    },
    [createSchedule, setSelectedSchedule, message],
  );

  // moveSchedule now receives the exact snapped stopTime from the drag hook
  const moveSchedule = useCallback(
    async (schedule: Schedule, channelId: string, startTime: Date, stopTime: Date) => {
      const response = await updateSchedule({
        id: schedule.id,
        payload: {
          channelId,
          startTime: startTime.toISOString(),
          stopTime: stopTime.toISOString(),
          duration: schedule.duration,
        },
      });

      setSelectedSchedule(response.data);
    },
    [updateSchedule, setSelectedSchedule],
  );

  const handleUpdateSchedule = useCallback(
    async (scheduleId: string, payload: UpdateSchedulePayload) => {
      const response = await updateSchedule({ id: scheduleId, payload });
      setSelectedSchedule(response.data);
    },
    [updateSchedule, setSelectedSchedule],
  );

  const handlePublishSchedule = useCallback(
    async (scheduleId: string) => {
      const response = await publishSchedule(scheduleId);
      setSelectedSchedule(response.data);
      message.success(response.message || 'Schedule published successfully');
    },
    [publishSchedule, setSelectedSchedule, message],
  );

  const handleDeleteSchedule = useCallback(
    async (scheduleId: string) => {
      await deleteSchedule(scheduleId);
      setSelectedSchedule(undefined);
      message.success('Schedule cancelled');
    },
    [deleteSchedule, setSelectedSchedule, message],
  );

  const publishableSchedules = useMemo(
    () =>
      schedules.filter(
        (schedule) => schedule.channelId === selectedChannel && schedule.status === 'DRAFT',
      ),
    [schedules, selectedChannel],
  );

  const handlePublishChannel = useCallback(async () => {
    if (!selectedChannel) {
      message.warning('Please select a channel first');
      return;
    }

    if (publishableSchedules.length === 0) {
      message.info('No draft schedules to publish for this channel');
      return;
    }

    const result = await publishSchedulesByChannel(publishableSchedules.map((schedule) => schedule.id));

    if (result.failed === 0) {
      message.success(`Published ${result.published} schedules for selected channel`);
      return;
    }

    message.warning(`Published ${result.published}, failed ${result.failed} schedules`);
  }, [selectedChannel, publishableSchedules, publishSchedulesByChannel, message]);

  // ── "Snap after previous" quick action from WarningPanel ────────────────
  const handleSnapAfterPrevious = useCallback(
    async (scheduleId: string) => {
      const target = schedules.find((s) => s.id === scheduleId);
      if (!target) return;

      const prev = findPreviousSchedule(schedules, target.channelId, new Date(target.startTime), scheduleId);
      if (!prev) {
        message.info('No previous schedule found to snap after.');
        return;
      }

      const newStart = dayjs(prev.stopTime).toDate();
      const newStop = addSeconds(newStart, target.duration);

      const response = await updateSchedule({
        id: scheduleId,
        payload: {
          startTime: newStart.toISOString(),
          stopTime: newStop.toISOString(),
          duration: target.duration,
        },
      });
      setSelectedSchedule(response.data);
      message.success('Schedule snapped after previous item.');
    },
    [schedules, updateSchedule, setSelectedSchedule, message],
  );

  // resizeSchedule now receives the exact snapped stopTime from the resize hook
  const resizeSchedule = useCallback(
    async (schedule: Schedule, durationSeconds: number, stopTime: Date) => {
      const response = await updateSchedule({
        id: schedule.id,
        payload: {
          duration: durationSeconds,
          stopTime: stopTime.toISOString(),
        },
      });

      setSelectedSchedule(response.data);
    },
    [updateSchedule, setSelectedSchedule],
  );

  const {
    handleDragMove,
    handleDragEnd: _handleDragEnd,
    handleDragCancel: handleDragCancelInHook,
  } = useScheduleDrag({
    dayStart: range.start,
    pixelsPerHour,
    schedules,
    onAssetDrop: createScheduleFromAsset,
    onScheduleMove: moveSchedule,
    onOverlapDetected: handleOverlapDetected,
    onPreviewChange: setDragPreview,
  });

  // Wrap drag-end: clear overlay, guard no-channel, then delegate
  const handleDragEnd = useCallback(
    async (event: Parameters<typeof _handleDragEnd>[0]) => {
      setDraggingAsset(null);
      setDraggingSchedule(null);
      setDragPreview(null);

      const data = event.active.data.current as { kind: string } | undefined;

      if (data?.kind === 'asset' && event.over && !selectedChannel) {
        message.warning('Please select a channel first');
        return;
      }

      await _handleDragEnd(event);
    },
    [_handleDragEnd, selectedChannel, message],
  );

  const handleDragCancelFull = useCallback(() => {
    handleDragCancelInHook();
    handleDragCancel();
  }, [handleDragCancel, handleDragCancelInHook]);

  const { startResize } = useScheduleResize({
    pixelsPerHour,
    schedules,
    onResizeEnd: resizeSchedule,
    onOverlapDetected: handleOverlapDetected,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
  );

  const isGridLoading = loading || schedulesLoading;

  const schedulesErrorMessage =
    schedulesError instanceof Error
      ? schedulesError.message
      : schedulesError
        ? 'Failed to load schedules for this channel. Other data is still available.'
        : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancelFull}
    >
      <div className="schedule-workspace">
        {/* Toolbar spans all 3 columns — so all content panels align below it */}
        <TimelineToolbar
          channels={channels}
          selectedChannel={selectedChannel}
          selectedDate={selectedDate}
          zoomLevel={zoomLevel}
          onChannelChange={setChannel}
          onDateChange={setDate}
          onRefresh={refreshTimeline}
          onZoomChange={setZoomLevel}
          onPublishChannel={handlePublishChannel}
          publishableCount={publishableSchedules.length}
          publishChannelLoading={publishingChannel}
          publishChannelDisabled={!selectedChannel || publishableSchedules.length === 0}
        />

        <AssetLibrary assets={assets} />
        <main className="schedule-main-panel">
          {schedulesErrorMessage ? (
            <Alert
              type="error"
              showIcon
              closable
              message="Schedules could not be loaded"
              description={schedulesErrorMessage}
              style={{ margin: '0 0 8px' }}
            />
          ) : null}

          <TimelineGrid
            channels={selectedChannels}
            schedules={schedules}
            selectedDate={selectedDate}
            selectedScheduleId={selectedSchedule?.id}
            warnings={warnings}
            loading={isGridLoading}
            dayStart={range.start}
            pixelsPerHour={pixelsPerHour}
            noChannelSelected={channels.length > 0 && !selectedChannel}
            onSelectSchedule={setSelectedSchedule}
            onResizeStart={startResize}
            dragPreview={dragPreview}
          />
          <div className="timeline-range-footnote">
            {dayjs(range.start).format('YYYY-MM-DD HH:mm')} –{' '}
            {dayjs(range.end).format('YYYY-MM-DD HH:mm')}
          </div>
        </main>
        <div className="schedule-side-panel">
          <ScheduleDetailPanel
            schedule={selectedSchedule}
            channels={channels}
            schedules={schedules}
            onSave={handleUpdateSchedule}
            onDelete={handleDeleteSchedule}
            onPublish={handlePublishSchedule}
            publishing={publishing}
            deleting={deleting}
          />
          <WarningPanel warnings={warnings} onSnapAfterPrevious={handleSnapAfterPrevious} />
        </div>
      </div>

      {/* DragOverlay renders in a portal — escapes overflow:auto on AssetLibrary */}
      <DragOverlay dropAnimation={null}>
        {draggingAsset ? (
          <div className="asset-card asset-drag-overlay">
            <AssetCardContent asset={draggingAsset} />
          </div>
        ) : draggingSchedule ? (
          <div className="timeline-schedule-drag-overlay">
            <div className="timeline-schedule-drag-title">{draggingSchedule.name}</div>
            <div className="timeline-schedule-drag-meta">
              {formatTimelineTime(draggingSchedule.startTime)} - {formatTimelineTime(draggingSchedule.stopTime)}
            </div>
            <div className="timeline-schedule-drag-meta">
              {formatDuration(draggingSchedule.duration)}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
