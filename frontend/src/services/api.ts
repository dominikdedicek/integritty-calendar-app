import {
  EventsResponse,
  RoomConfig,
  ReserveRequest,
  ReserveResponse,
} from '../types';

// API base URL - uses environment variable for production, relative path for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = `${API_BASE_URL}/api/events`;

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      data.error || `HTTP error ${response.status}`,
      response.status,
      data
    );
  }
  return response.json();
}

export async function fetchEvents(): Promise<EventsResponse> {
  const response = await fetch(API_BASE);
  return handleResponse<EventsResponse>(response);
}

export async function fetchConfig(): Promise<RoomConfig> {
  const response = await fetch(`${API_BASE}/config`);
  return handleResponse<RoomConfig>(response);
}

export async function createReservation(
  request: ReserveRequest
): Promise<ReserveResponse> {
  const response = await fetch(`${API_BASE}/reserve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  // Handle conflict (409) specially
  if (response.status === 409) {
    const data = await response.json();
    return {
      success: false,
      error: data.error || 'Slot byl mezitím zabrán',
      conflictingEvent: data.conflictingEvent,
    };
  }

  return handleResponse<ReserveResponse>(response);
}

export interface EndMeetingResponse {
  success: boolean;
  error?: string;
}

export async function endMeetingEarly(eventId: string): Promise<EndMeetingResponse> {
  const response = await fetch(`${API_BASE}/${eventId}/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return handleResponse<EndMeetingResponse>(response);
}

export { ApiError };
