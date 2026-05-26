import { create } from 'zustand';
import {
  clearStoredAuth,
  getStoredAccessToken,
  getStoredUser,
  setStoredAuth,
} from '../utils/token-storage';
import type { StoredUser } from '../utils/token-storage';

interface AuthState {
  accessToken?: string;
  user?: StoredUser;
  isAuthenticated: boolean;
  login: (accessToken: string, user: StoredUser) => void;
  logout: () => void;
  restoreAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: undefined,
  user: undefined,
  isAuthenticated: false,
  login: (accessToken, user) => {
    setStoredAuth(accessToken, user);
    set({ accessToken, user, isAuthenticated: true });
  },
  logout: () => {
    clearStoredAuth();
    set({ accessToken: undefined, user: undefined, isAuthenticated: false });
  },
  restoreAuth: () => {
    const accessToken = getStoredAccessToken();
    const user = getStoredUser();

    set({
      accessToken,
      user,
      isAuthenticated: Boolean(accessToken && user),
    });
  },
}));
