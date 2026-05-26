import { apiClient } from './api-client';
import type { StoredUser } from '../utils/token-storage';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: StoredUser;
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', payload);
    return response.data;
  },

  async me(): Promise<StoredUser> {
    const response = await apiClient.get<StoredUser>('/auth/me');
    return response.data;
  },
};
