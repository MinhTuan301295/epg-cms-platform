import { apiClient } from '../../../services/api-client';
import type {
  Asset,
  Channel,
  CreateSchedulePayload,
  GetSchedulesParams,
  PaginatedResponse,
  Schedule,
  ScheduleMutationResponse,
  UpdateSchedulePayload,
} from '../types/schedule.type';

export const schedulesApi = {
  async getChannels(): Promise<Channel[]> {
    const response = await apiClient.get<PaginatedResponse<Channel>>('/channels', {
      params: {
        page: 1,
        limit: 200,
        isActive: true,
      },
    });

    return response.data.data;
  },

  async getAssets(search?: string): Promise<Asset[]> {
    const response = await apiClient.get<PaginatedResponse<Asset>>('/assets', {
      params: {
        page: 1,
        limit: 200,
        search: search || undefined,
      },
    });

    return response.data.data;
  },

  async getSchedules(params: GetSchedulesParams): Promise<Schedule[]> {
    const response = await apiClient.get<PaginatedResponse<Schedule>>('/schedules', {
      params: {
        page: 1,
        limit: 500,
        ...params,
      },
    });

    return response.data.data;
  },

  async createSchedule(payload: CreateSchedulePayload): Promise<ScheduleMutationResponse> {
    const response = await apiClient.post<ScheduleMutationResponse>('/schedules', payload);
    return response.data;
  },

  async updateSchedule(
    id: string,
    payload: UpdateSchedulePayload,
  ): Promise<ScheduleMutationResponse> {
    const response = await apiClient.put<ScheduleMutationResponse>(`/schedules/${id}`, payload);
    return response.data;
  },

  async deleteSchedule(id: string): Promise<Schedule> {
    const response = await apiClient.delete<Schedule>(`/schedules/${id}`);
    return response.data;
  },
};
