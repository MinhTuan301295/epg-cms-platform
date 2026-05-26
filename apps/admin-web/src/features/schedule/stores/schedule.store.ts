import dayjs from 'dayjs';
import { create } from 'zustand';
import type { Channel, Schedule, TimelineWarning } from '../types/schedule.type';

interface ScheduleState {
  selectedChannel?: string;
  selectedDate: string;
  schedules: Schedule[];
  selectedSchedule?: Schedule;
  warnings: TimelineWarning[];
  loading: boolean;
  zoomLevel: number;
  refreshVersion: number;
  setSchedules: (schedules: Schedule[]) => void;
  setSelectedSchedule: (schedule?: Schedule) => void;
  setWarnings: (warnings: TimelineWarning[]) => void;
  setLoading: (loading: boolean) => void;
  setZoomLevel: (zoomLevel: number) => void;
  refreshTimeline: () => void;
  setChannel: (channelId?: string) => void;
  setDate: (date: string) => void;
  ensureChannel: (channels: Channel[]) => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  selectedChannel: undefined,
  selectedDate: dayjs().format('YYYY-MM-DD'),
  schedules: [],
  selectedSchedule: undefined,
  warnings: [],
  loading: false,
  zoomLevel: 1,
  refreshVersion: 0,
  setSchedules: (schedules) => set({ schedules }),
  setSelectedSchedule: (selectedSchedule) => set({ selectedSchedule }),
  setWarnings: (warnings) => set({ warnings }),
  setLoading: (loading) => set({ loading }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  refreshTimeline: () => set((state) => ({ refreshVersion: state.refreshVersion + 1 })),
  setChannel: (selectedChannel) => set({ selectedChannel, selectedSchedule: undefined }),
  setDate: (selectedDate) => set({ selectedDate, selectedSchedule: undefined }),
  ensureChannel: (channels) => {
    const selectedChannel = get().selectedChannel;

    if (!selectedChannel && channels[0]) {
      set({ selectedChannel: channels[0].id });
    }
  },
}));
