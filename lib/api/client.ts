import Constants from 'expo-constants';

interface InventoryApiExtra {
  inventoryServiceBaseUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as InventoryApiExtra;
const API_BASE_URL =
  extra.inventoryServiceBaseUrl ||
  process.env.EXPO_PUBLIC_INVENTORY_BASE_URL ||
  'https://cd7ba7c78881.ngrok-free.app';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export class ApiClientError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch {
      // If response is not JSON, use default message
    }
    throw new ApiClientError(errorMessage, response.status);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ApiClientError('Failed to parse API response', response.status);
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Required for ngrok free tier
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    return handleResponse<T>(response);
  } catch (error) {
    // Re-throw abort errors as-is
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    if (error instanceof ApiClientError) {
      throw error;
    }
    if (error instanceof TypeError && error.message === 'Network request failed') {
      throw new ApiClientError('Network error: Please check your internet connection');
    }
    throw new ApiClientError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}
