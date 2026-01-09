
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

export type ActiveTab = 'request' | 'response' | 'tools';
