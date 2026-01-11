
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  type?: 'string' | 'number' | 'boolean' | 'null';
}

export interface ApiRequest {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers: KeyValuePair[];
  body: string;
  createdAt: number;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
  time: number;
  size: number;
}

export interface HistoryItem {
  id: string;
  request: ApiRequest;
  response?: ApiResponse;
  timestamp: number;
}

export interface EnvironmentProfile {
  id: string;
  name: string;
  variables: Variable[];
}

export type ActiveTab = 'request' | 'response' | 'debug';

export interface Variable {
  key: string;
  value: string;
}

/**
 * Safe ID generator fallback for non-secure contexts (non-HTTPS)
 */
export const generateId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};
