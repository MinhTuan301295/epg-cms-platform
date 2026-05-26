export interface StoredUser {
  id: string;
  email: string;
  name?: string | null;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  permissions?: string[];
  isActive?: boolean;
}

export const ACCESS_TOKEN_KEY = 'epg_access_token';
export const USER_STORAGE_KEY = 'epg_user';

export function getStoredAccessToken(): string | undefined {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? undefined;
}

export function getStoredUser(): StoredUser | undefined {
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) {
    return undefined;
  }

  try {
    return JSON.parse(rawUser) as StoredUser;
  } catch {
    clearStoredAuth();
    return undefined;
  }
}

export function setStoredAuth(accessToken: string, user: StoredUser): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}
