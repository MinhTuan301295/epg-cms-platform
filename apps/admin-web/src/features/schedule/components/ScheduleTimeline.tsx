import { DndContext } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { AssetLibrary } from './AssetLibrary';
import { ScheduleDetailPanel } from './ScheduleDetailPanel';
import { TimelineGrid } from './TimelineGrid';
import { TimelineToolbar } from './TimelineToolbar';
import { WarningPanel } from './WarningPanel';
import { useScheduleDrag } from '../hooks/useScheduleDrag';
import { useScheduleResize } from '../hooks/useScheduleResize';
import { useTimeline } from '../hooks/useTimeline';
import { useScheduleStore } from '../stores/schedule.store';
import type { Asset, Schedule, UpdateSchedulePayload } from '../types/schedule.type';
import { createTimelineRange } from '../utils/timeline.util';

const basePixelsPerHour = 160;

export function ScheduleTimeline() {
  const timeline = useTimeline();
  const schedules = useScheduleStore((state) => state.schedules);
  const selectedSchedule = useScheduleStore((state) => state.selectedSchedule);
  const warnings = useScheduleStore((state) => state.warnings);
  const loading = useScheduleStore((state) => state.loading);
  const zoomLevel = useScheduleStore((state) => state.zoomLevel);
  const setSelectedSchedule = useScheduleStore((state) => state.setSelectedSchedule);
  const setChannel = useScheduleStore((state) => state.setChannel);
  const setDate = useScheduleStore((state) => state.setDate);
  const setZoomLevel = useScheduleStore((state) => state.setZoomLevel);
  const refreshTimeline = useScheduleStore((state) => state.refreshTimeline);
  const pixelsPerHour = basePixelsPerHour * zoomLevel;
  const selectedChannels = useMemo(
    () =>
      timeline.selectedChannel
        ? timeline.channels.filter((channel) => channel.id === timeline.selectedChannel)
        : timeline.channels,
    [timeline.channels, timeline.selectedChannel],
  );
  const range = useMemo(() => createTimelineRange(timeline.selectedDate), [timeline.selectedDate]);

  const createScheduleFromAsset = async (
    asset: Asset,
    channelId: string,
    startTime: Date,
    autoSnap: boolean,
  ) => {
    const response = await timeline.createSchedule({
      channelId,
      assetId: asset.id,
      startTime: startTime.toISOString(),
      duration: asset.duration,
      name: asset.name,
      autoSnap,
      status: 'DRAFT',
    });

    setSelectedSchedule(response.data);
  };

  const moveSchedule = async (schedule: Schedule, channelId: string, startTime: Date) => {
    const response = await timeline.updateSchedule({
      id: schedule.id,
      payload: {
        channelId,
        startTime: startTime.toISOString(),
        duration: schedule.duration,
      },
    });

    setSelectedSchedule(response.data);
  };

  const updateSchedule = async (scheduleId: string, payload: UpdateSchedulePayload) => {
    const response = await timeline.updateSchedule({ id: scheduleId, payload });
    setSelectedSchedule(response.data);
  };

  const resizeSchedule = async (schedule: Schedule, duration: number) => {
    const response = await timeline.updateSchedule({
      id: schedule.id,
      payload: {
        duration,
      },
    });

    setSelectedSchedule(response.data);
  };

  const { handleDragEnd } = useScheduleDrag({
    dayStart: range.start,
    pixelsPerHour,
    schedules,
    onAssetDrop: createScheduleFromAsset,
    onScheduleMove: moveSchedule,
  });
  const { startResize } = useScheduleResize({
    pixelsPerHour,
    onResizeEnd: resizeSchedule,
  });

  return (
    <DndContext modifiers={[restrictToWindowEdges]} onDragEnd={handleDragEnd}>
      <div className="schedule-workspace">
        <AssetLibrary assets={timeline.assets} />
        <main className="schedule-main-panel">
          <TimelineToolbar
            channels={timeline.channels}
            selectedChannel={timeline.selectedChannel}
            selectedDate={timeline.selectedDate}
            zoomLevel={zoomLevel}
            onChannelChange={setChannel}
            onDateChange={setDate}
            onRefresh={refreshTimeline}
            onZoomChange={setZoomLevel}
          />
          <TimelineGrid
            channels={selectedChannels}
            schedules={schedules}
            selectedDate={timeline.selectedDate}
            selectedScheduleId={selectedSchedule?.id}
            warnings={warnings}
            loading={loading}
            dayStart={range.start}
            pixelsPerHour={pixelsPerHour}
            onSelectSchedule={setSelectedSchedule}
            onResizeStart={startResize}
          />
          <div className="timeline-range-footnote">
            {dayjs(range.start).format('YYYY-MM-DD HH:mm')} - {dayjs(range.end).format('YYYY-MM-DD HH:mm')}
          </div>
        </main>
        <div className="schedule-side-panel">
          <ScheduleDetailPanel schedule={selectedSchedule} channels={timeline.channels} onSave={updateSchedule} />
          <WarningPanel warnings={warnings} />
        </div>
      </div>
    </DndContext>
  );
}
