import { google, calendar_v3 } from 'googleapis';
import { readFileSync } from 'fs';
import {
  startOfDay,
  endOfDay,
  parseISO,
  isWithinInterval,
  isBefore,
  isAfter,
} from 'date-fns';
import { config } from '../config';
import { CalendarEvent, RoomStatus, EventsResponse } from '../types';

let calendarClient: calendar_v3.Calendar | null = null;

function getServiceAccountCredentials(): object {
  if (config.googleServiceAccountJson) {
    return JSON.parse(config.googleServiceAccountJson);
  }

  if (config.googleServiceAccountPath) {
    const content = readFileSync(config.googleServiceAccountPath, 'utf-8');
    return JSON.parse(content);
  }

  throw new Error('No Google service account credentials found');
}

function getCalendarClient(): calendar_v3.Calendar {
  if (calendarClient) {
    return calendarClient;
  }

  const credentials = getServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  calendarClient = google.calendar({ version: 'v3', auth });
  return calendarClient;
}

function mapGoogleEventToCalendarEvent(
  event: calendar_v3.Schema$Event
): CalendarEvent | null {
  if (!event.id || event.status === 'cancelled') {
    return null;
  }

  const isAllDay = !event.start?.dateTime && !!event.start?.date;

  let start: string;
  let end: string;

  if (isAllDay) {
    // All-day events: start/end are in YYYY-MM-DD format
    // Convert to ISO string at start of day
    const startDate = parseISO(event.start!.date!);
    const endDate = parseISO(event.end!.date!);
    start = startOfDay(startDate).toISOString();
    end = startOfDay(endDate).toISOString();
  } else {
    start = event.start!.dateTime!;
    end = event.end!.dateTime!;
  }

  return {
    id: event.id,
    title: event.summary || 'Bez názvu',
    start,
    end,
    organizer: event.organizer?.displayName || event.organizer?.email || undefined,
    isAllDay,
    status: (event.status as 'confirmed' | 'tentative' | 'cancelled') || 'confirmed',
  };
}

function calculateRoomStatus(
  events: CalendarEvent[],
  now: Date
): RoomStatus {
  // Filter out cancelled events and sort by start time
  const activeEvents = events
    .filter((e) => e.status !== 'cancelled')
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // Find current event (event that is happening right now)
  const currentEvent = activeEvents.find((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return isWithinInterval(now, { start: eventStart, end: eventEnd });
  });

  // Find next event (first event that starts after now)
  const nextEvent = activeEvents.find((event) => {
    const eventStart = new Date(event.start);
    // If we have a current event, next event must start after current event ends
    if (currentEvent) {
      return isAfter(eventStart, new Date(currentEvent.end));
    }
    return isAfter(eventStart, now);
  });

  const isOccupied = !!currentEvent;

  let timeUntilNextEvent: number | null = null;
  let timeUntilCurrentEventEnd: number | null = null;

  if (currentEvent) {
    timeUntilCurrentEventEnd = new Date(currentEvent.end).getTime() - now.getTime();
  }

  if (nextEvent) {
    timeUntilNextEvent = new Date(nextEvent.start).getTime() - now.getTime();
  }

  return {
    isOccupied,
    currentEvent: currentEvent || null,
    nextEvent: nextEvent || null,
    timeUntilNextEvent,
    timeUntilCurrentEventEnd,
  };
}

export async function getTodayEvents(): Promise<EventsResponse> {
  const calendar = getCalendarClient();
  const now = new Date();

  // Get start and end of day - Google Calendar API handles timezone via timeZone param
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const response = await calendar.events.list({
    calendarId: config.calendarId,
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: config.timezone,
  });

  const events: CalendarEvent[] = (response.data.items || [])
    .map(mapGoogleEventToCalendarEvent)
    .filter((e): e is CalendarEvent => e !== null);

  const status = calculateRoomStatus(events, now);

  return {
    events,
    status,
    timestamp: now.toISOString(),
  };
}

export async function checkCollision(
  start: Date,
  end: Date
): Promise<CalendarEvent | null> {
  const calendar = getCalendarClient();

  // Fetch events that might overlap with the proposed time
  const response = await calendar.events.list({
    calendarId: config.calendarId,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: config.timezone,
  });

  const events = (response.data.items || [])
    .map(mapGoogleEventToCalendarEvent)
    .filter((e): e is CalendarEvent => e !== null && e.status !== 'cancelled');

  // Check for any overlapping event
  for (const event of events) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // Check if there's an overlap
    // Overlap exists if: start < eventEnd AND end > eventStart
    if (isBefore(start, eventEnd) && isAfter(end, eventStart)) {
      return event;
    }
  }

  return null;
}

export async function createReservation(
  start: Date,
  end: Date,
  title: string = 'Rychlá rezervace'
): Promise<CalendarEvent> {
  const calendar = getCalendarClient();

  const event: calendar_v3.Schema$Event = {
    summary: title,
    description: 'Created by Room Display',
    start: {
      dateTime: start.toISOString(),
      timeZone: config.timezone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: config.timezone,
    },
    transparency: 'opaque', // Blocks time (shows as busy)
    status: 'confirmed',
  };

  const response = await calendar.events.insert({
    calendarId: config.calendarId,
    requestBody: event,
  });

  const createdEvent = mapGoogleEventToCalendarEvent(response.data);
  if (!createdEvent) {
    throw new Error('Failed to create event');
  }

  return createdEvent;
}
