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

export interface Environment {
  id: string;
  name: string;
  variables: Variable[];
}

export interface PingResult {
  id: string;
  timestamp: number;
  latency: number;
  status: 'up' | 'down';
  code: string;
}

export type ActiveTab = 'request' | 'response' | 'monitor' | 'debug';

export interface Variable {
  key: string;
  value: string;
}

export const generateId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};