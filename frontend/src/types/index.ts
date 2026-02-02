export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  organizer?: string;
  isAllDay: boolean;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

export interface RoomStatus {
  isOccupied: boolean;
  currentEvent: CalendarEvent | null;
  nextEvent: CalendarEvent | null;
  timeUntilNextEvent: number | null; // milliseconds
  timeUntilCurrentEventEnd: number | null; // milliseconds
}

export interface EventsResponse {
  events: CalendarEvent[];
  status: RoomStatus;
  timestamp: string;
}

export interface RoomConfig {
  roomName: string;
  timezone: string;
  refreshIntervalSeconds: number;
}

export interface ReserveRequest {
  start: string;
  end: string;
  title?: string;
}

export interface ReserveResponse {
  success: boolean;
  event?: CalendarEvent;
  error?: string;
  conflictingEvent?: CalendarEvent;
}

export interface TimeSlot {
  minutes: number;
  label: string;
  available: boolean;
}
