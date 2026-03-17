/**
 * HTTP API client for the Scope PM REST API.
 * Uses native fetch with JSON request/response, API key auth, and error handling.
 */

export interface ApiClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
  total?: number;
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private readonly timeout: number;

  constructor(options: ApiClientOptions) {
    // Remove trailing slash from base URL
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.timeout = options.timeout ?? 30_000;
  }

  /**
   * Reconfigure base URL and/or API key after construction.
   * Used by the CLI to apply parsed --api-url / --api-key flags
   * which are only available after Commander.js has parsed argv.
   */
  reconfigure(options: { baseUrl?: string; apiKey?: string }): void {
    if (options.baseUrl !== undefined) {
      this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    }
    if (options.apiKey !== undefined) {
      this.apiKey = options.apiKey;
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Perform a GET request.
   */
  async get<T = unknown>(path: string, params?: Record<string, string | undefined>): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, params);
    return this.request<T>('GET', url);
  }

  /**
   * Perform a POST request with JSON body.
   */
  async post<T = unknown>(path: string, body?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    return this.request<T>('POST', url, body);
  }

  /**
   * Perform a PUT request with JSON body.
   */
  async put<T = unknown>(path: string, body?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    return this.request<T>('PUT', url, body);
  }

  /**
   * Perform a DELETE request.
   */
  async delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    return this.request<T>('DELETE', url);
  }

  /**
   * Perform a raw GET request that returns the response body as text.
   * Used for CSV and other non-JSON responses.
   */
  async getRaw(path: string): Promise<string> {
    const url = this.buildUrl(path);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ApiClientError(
          this.getErrorMessage(response.status),
          response.status,
        );
      }

      return await response.text();
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw this.wrapError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(path: string, params?: Record<string, string | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, value);
        }
      }
    }
    return url.toString();
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private async request<T>(method: string, url: string, body?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.buildHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        let responseBody: unknown;
        try {
          responseBody = await response.json();
        } catch {
          responseBody = undefined;
        }
        throw new ApiClientError(
          this.getErrorMessage(response.status, responseBody),
          response.status,
          responseBody,
        );
      }

      const json = await response.json() as ApiResponse<T>;
      return json;
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw this.wrapError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getErrorMessage(status: number, body?: unknown): string {
    // Extract server-side error messages when available
    if (body && typeof body === 'object' && 'errors' in body) {
      const errors = (body as { errors?: string[] }).errors;
      if (Array.isArray(errors) && errors.length > 0) {
        return errors.join('; ');
      }
    }

    if (status === 403 && body && typeof body === 'object') {
      const record = body as {
        error?: unknown;
        required_permission?: unknown;
        user_role?: unknown;
      };
      const fallbackMessage =
        typeof record.error === 'string' && record.error.trim().length > 0 ? record.error.trim() : 'Insufficient permissions';
      const requiredPermission =
        typeof record.required_permission === 'string' && record.required_permission.trim().length > 0
          ? record.required_permission.trim()
          : null;
      const userRole =
        typeof record.user_role === 'string' && record.user_role.trim().length > 0 ? record.user_role.trim() : null;
      if (requiredPermission || userRole) {
        return `403: ${fallbackMessage}. Required: ${requiredPermission ?? 'unknown'}, your role: ${userRole ?? 'unknown'}`;
      }
    }

    switch (status) {
      case 400: return 'Bad request — check your input parameters';
      case 401: return 'Authentication failed — check your API key (scope config set api-key <key>)';
      case 403: return 'Forbidden — you do not have permission for this action';
      case 404: return 'Not found — the requested resource does not exist';
      case 409: return 'Conflict — the operation conflicts with current state';
      case 429: return 'Rate limited — too many requests, please wait and try again';
      case 500: return 'Server error — the API encountered an internal error';
      case 502: return 'Bad gateway — the API server may be down';
      case 503: return 'Service unavailable — the API server is temporarily unavailable';
      default: return `HTTP ${status} error`;
    }
  }

  private wrapError(error: unknown): ApiClientError {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new ApiClientError('Request timed out', 0);
      }
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        return new ApiClientError(
          'Network error — cannot connect to the API server. Check your API URL (scope config set api-url <url>)',
          0,
        );
      }
      return new ApiClientError(error.message, 0);
    }
    return new ApiClientError('Unknown error', 0);
  }
}
