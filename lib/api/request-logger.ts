interface RequestLogContext {
  method: string;
  url: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
}

interface ResponseLogContext {
  method: string;
  url: string;
  status: number;
  durationMs: number;
}

interface ErrorLogContext {
  method: string;
  url: string;
  durationMs: number;
  error: unknown;
}

function maskHeaderValue(key: string, value: string): string {
  if (key.toLowerCase() !== 'authorization') return value;
  const trimmed = value.trim();
  if (!trimmed) return '[redacted]';
  const [scheme] = trimmed.split(' ');
  return scheme ? `${scheme} [redacted]` : '[redacted]';
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};

  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = maskHeaderValue(key, value);
    });
    return result;
  }

  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = maskHeaderValue(key, value);
      return acc;
    }, {});
  }

  return Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    const normalizedValue = String(value);
    acc[key] = maskHeaderValue(key, normalizedValue);
    return acc;
  }, {});
}

function normalizeBody(body?: BodyInit | null): string | null {
  if (body == null) return null;
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof FormData) return '[form-data]';
  return '[non-text-body]';
}

function safeParseJson(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
}

function formatBody(body?: BodyInit | null): unknown {
  const normalizedBody = normalizeBody(body);
  if (normalizedBody === null) return null;
  if (!normalizedBody) return '';
  return safeParseJson(normalizedBody);
}

export function logApiRequest(context: RequestLogContext): number {
  const startedAt = Date.now();
  console.log('[API Request]', {
    method: context.method,
    url: context.url,
    headers: normalizeHeaders(context.headers),
    body: formatBody(context.body),
    startedAt,
  });
  return startedAt;
}

export function logApiResponse(context: ResponseLogContext): void {
  console.log('[API Response]', {
    method: context.method,
    url: context.url,
    status: context.status,
    durationMs: context.durationMs,
  });
}

export function logApiError(context: ErrorLogContext): void {
  const errorMessage = context.error instanceof Error ? context.error.message : String(context.error);
  console.log('[API Error]', {
    method: context.method,
    url: context.url,
    durationMs: context.durationMs,
    message: errorMessage,
  });
}
