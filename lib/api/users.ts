import Constants from 'expo-constants';
import { ApiClientError } from './client';
import { logApiError, logApiRequest, logApiResponse } from './request-logger';
import { withStoredAccessTokenHeader } from './auth-header';

interface UserApiExtra {
  userServiceBaseUrl?: string;
  auth0Audience?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as UserApiExtra;
const USER_API_BASE_URL =
  extra.userServiceBaseUrl ||
  process.env.EXPO_PUBLIC_USER_SERVICE_BASE_URL ||
  'https://8816-2600-4041-41f3-f300-d954-a29a-e130-5fb0.ngrok-free.app';
const EXPECTED_AUTH0_AUDIENCE =
  extra.auth0Audience || process.env.EXPO_PUBLIC_AUTH0_AUDIENCE || '';

export function getUserServiceBaseUrl() {
  return USER_API_BASE_URL;
}

export interface UserProfileResponse {
  id: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface UpdateUserProfileRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

function readAuthorizationHeader(headers: HeadersInit | undefined): string | null {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get('Authorization');
  if (Array.isArray(headers)) {
    const pair = headers.find(([key]) => key.toLowerCase() === 'authorization');
    return pair ? pair[1] : null;
  }
  const record = headers as Record<string, string>;
  return record.Authorization || record.authorization || null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  if (typeof globalThis.atob !== 'function') return null;

  try {
    return JSON.parse(globalThis.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasExpectedAudience(token: string): boolean {
  if (!EXPECTED_AUTH0_AUDIENCE) return true;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const aud = payload.aud;
  if (typeof aud === 'string') return aud === EXPECTED_AUTH0_AUDIENCE;
  if (Array.isArray(aud)) return aud.includes(EXPECTED_AUTH0_AUDIENCE);
  return false;
}

function maskToken(token: string): string {
  if (token.length <= 18) return `${token.slice(0, 6)}...`;
  return `${token.slice(0, 12)}...${token.slice(-6)}`;
}

async function userApiRequest<T>(endpoint: string, options: RequestInit = {}) {
  const url = `${USER_API_BASE_URL}${endpoint}`;
  const method = options.method ?? 'GET';
  const authHeaders = await withStoredAccessTokenHeader(options.headers);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...authHeaders,
  };

  const authorizationHeader = readAuthorizationHeader(headers);
  if (authorizationHeader?.startsWith('Bearer ')) {
    const bearerToken = authorizationHeader.replace('Bearer ', '').trim();
    if (__DEV__ && bearerToken) {
      console.log('[auth] bearer token (masked):', maskToken(bearerToken));
    }
    if (bearerToken && !hasExpectedAudience(bearerToken)) {
      throw new ApiClientError(
        `Bearer token audience mismatch for user service (${url}). Expected audience: ${EXPECTED_AUTH0_AUDIENCE}`,
        401
      );
    }
  }

  const requestStartedAt = logApiRequest({
    method,
    url,
    headers,
    body: options.body,
  });

  try {
    const response = await fetch(url, { ...options, headers });
    logApiResponse({
      method,
      url,
      status: response.status,
      durationMs: Date.now() - requestStartedAt,
    });

    if (!response.ok) {
      const defaultMessage = `API request failed with status ${response.status} (${url})`;
      let message = defaultMessage;
      try {
        const errorData = await response.json();
        const serverMessage = errorData.error?.message || errorData.message;
        if (serverMessage) {
          message = `${serverMessage} (${url})`;
        }
      } catch {
        // ignore parse errors
      }
      throw new ApiClientError(message, response.status);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiClientError('Failed to parse API response', response.status);
    }
  } catch (error) {
    logApiError({
      method,
      url,
      durationMs: Date.now() - requestStartedAt,
      error,
    });
    throw error;
  }
}

export async function getUserByAuth0(accessToken: string) {
  return userApiRequest('/api/users/by-auth0', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }) as Promise<UserProfileResponse>;
}

export async function createUser(
  accessToken: string,
  payload: {
    firstName: string;
    lastName: string;
    phone: string;
    birthDate: string;
    email: string;
  }
) {
  return userApiRequest('/api/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function updateUserProfile(
  userId: number | string,
  accessToken: string,
  payload: UpdateUserProfileRequest
) {
  return userApiRequest(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  }) as Promise<UserProfileResponse>;
}

export async function setActiveStore(
  userId: number | string,
  accessToken: string,
  storeId: number
) {
  return userApiRequest(`/api/users/${userId}/active-store`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ storeId }),
  });
}

export async function getActiveStore(userId: number | string, accessToken: string) {
  return userApiRequest(`/api/users/${userId}/active-store`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
