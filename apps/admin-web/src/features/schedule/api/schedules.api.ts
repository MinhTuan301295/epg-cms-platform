import { apiClient } from '../../../services/api-client';
import type {
  Asset,
  Channel,
  CreateSchedulePayload,
  GetSchedulesParams,
  PaginatedResponse,
  PublishScheduleResponse,
  Schedule,
  ScheduleMutationResponse,
  UpdateSchedulePayload,
} from '../types/schedule.type';

/**
 * Safely extracts the items array from a paginated response body.
 * Guards against the backend returning the envelope at an unexpected nesting
 * level (e.g. { data: { data: [], meta: {} } } vs { data: [], meta: {} }).
 */
function extractItems<T>(responseData: unknown): T[] {
  if (Array.isArray(responseData)) {
    // Raw array — no envelope
    return responseData as T[];
  }

  if (responseData && typeof responseData === 'object') {
    const envelope = responseData as Record<string, unknown>;

    // Standard shape: { data: T[], meta: {} }
    if (Array.isArray(envelope['data'])) {
      return envelope['data'] as T[];
    }

    // Double-wrapped: { data: { data: T[], meta: {} } }
    const inner = envelope['data'];
    if (inner && typeof inner === 'object' && Array.isArray((inner as Record<string, unknown>)['data'])) {
      return (inner as Record<string, unknown>)['data'] as T[];
    }
  }

  return [];
}

export const schedulesApi = {
  async getChannels(): Promise<Channel[]> {
    const response = await apiClient.get<PaginatedResponse<Channel>>('/channels', {
      params: {
        page: 1,
        limit: 100,
        isActive: true,
      },
    });

    return extractItems<Channel>(response.data);
  },

  async getAssets(search?: string): Promise<Asset[]> {
    const response = await apiClient.get<PaginatedResponse<Asset>>('/assets', {
      params: {
        page: 1,
        limit: 100,
        search: search || undefined,
      },
    });

    return extractItems<Asset>(response.data);
  },

  async getSchedules(params: GetSchedulesParams): Promise<Schedule[]> {
    const response = await apiClient.get<PaginatedResponse<Schedule>>('/schedules', {
      params: {
        page: 1,
        limit: 100,
        ...params,
      },
    });

    return extractItems<Schedule>(response.data);
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

  async publishSchedule(id: string): Promise<PublishScheduleResponse> {
    const response = await apiClient.post<PublishScheduleResponse>(`/schedules/${id}/publish`);
    return response.data;
  },
};
