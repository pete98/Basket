import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth0_access_token';

function hasAuthorizationHeader(headers: HeadersInit | undefined): boolean {
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has('Authorization');
  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === 'authorization');
  }
  const record = headers as Record<string, string | undefined>;
  return Boolean(record.Authorization || record.authorization);
}

export async function withStoredAccessTokenHeader(
  headers: HeadersInit | undefined
): Promise<HeadersInit> {
  if (hasAuthorizationHeader(headers)) {
    return headers ?? {};
  }

  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (!accessToken) {
    return headers ?? {};
  }

  return {
    ...(headers ?? {}),
    Authorization: `Bearer ${accessToken}`,
  };
}
