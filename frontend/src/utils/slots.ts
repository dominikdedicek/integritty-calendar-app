import { addMinutes, differenceInMinutes, isBefore, isAfter } from 'date-fns';
import { TimeSlot, CalendarEvent } from '../types';

/**
 * Standard slot durations in minutes
 */
export const STANDARD_SLOTS = [15, 30, 45, 60];

/**
 * Minimum slot duration in minutes
 * Slots shorter than this won't be offered
 */
export const MIN_SLOT_MINUTES = 5;

/**
 * Get reservation start time - starts immediately (rounded to nearest minute for cleaner display)
 *
 * @param date Current time
 * @returns Date rounded to nearest minute
 */
export function getReservationStartTime(date: Date): Date {
  const result = new Date(date);
  result.setSeconds(0, 0);
  return result;
}

/**
 * Round time up to the nearest 5 minutes (kept for backward compatibility)
 */
export function roundUpToNearestFiveMinutes(date: Date): Date {
  const minutes = date.getMinutes();
  const remainder = minutes % 5;

  if (remainder === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0) {
    return new Date(date);
  }

  const roundedMinutes = minutes + (5 - remainder);
  const result = new Date(date);
  result.setMinutes(roundedMinutes, 0, 0);

  return result;
}

/**
 * Calculate available time slots for quick reservation
 *
 * Rules:
 * 1. Slots start from current time (immediately)
 * 2. Standard slots: 15, 30, 45, 60 minutes
 * 3. If a standard slot would overlap with the next event, it's not offered
 * 4. If available time is less than the shortest standard slot (15 min) but >= 5 min,
 *    offer a custom slot for the available time
 * 5. If available time is < 5 minutes, no slots are offered
 *
 * @param now Current time
 * @param nextEvent Next scheduled event (or null if none)
 * @returns Array of available time slots
 */
export function calculateAvailableSlots(
  now: Date,
  nextEvent: CalendarEvent | null
): TimeSlot[] {
  const startTime = getReservationStartTime(now);

  // If no next event, all standard slots are available
  if (!nextEvent) {
    return STANDARD_SLOTS.map((minutes) => ({
      minutes,
      label: formatSlotLabel(minutes),
      available: true,
    }));
  }

  const nextEventStart = new Date(nextEvent.start);

  // If next event already started (shouldn't happen, but safety check)
  if (isBefore(nextEventStart, startTime)) {
    return [];
  }

  // Calculate available time until next event
  const availableMinutes = differenceInMinutes(nextEventStart, startTime);

  // If less than minimum slot duration, no slots available
  if (availableMinutes < MIN_SLOT_MINUTES) {
    return [];
  }

  const slots: TimeSlot[] = [];

  // Check each standard slot
  for (const minutes of STANDARD_SLOTS) {
    if (minutes <= availableMinutes) {
      slots.push({
        minutes,
        label: formatSlotLabel(minutes),
        available: true,
      });
    }
  }

  // If no standard slots fit, but we have some available time,
  // offer a custom slot (capped at 60 minutes)
  if (slots.length === 0 && availableMinutes >= MIN_SLOT_MINUTES) {
    const customMinutes = Math.min(availableMinutes, 60);
    slots.push({
      minutes: customMinutes,
      label: `${customMinutes} min (max dostupný)`,
      available: true,
    });
  } else if (slots.length > 0 && availableMinutes < 60 && !slots.some(s => s.minutes === availableMinutes)) {
    // If we have some standard slots but the max available time doesn't match a standard slot,
    // also offer the max available time as an option (e.g., 43 minutes)
    const maxSlot = slots[slots.length - 1];
    if (availableMinutes > maxSlot.minutes && availableMinutes < 60) {
      slots.push({
        minutes: availableMinutes,
        label: `${availableMinutes} min (max dostupný)`,
        available: true,
      });
    }
  }

  return slots;
}

/**
 * Format slot duration for display
 */
export function formatSlotLabel(minutes: number): string {
  if (minutes === 60) {
    return '1 hodina';
  }
  return `${minutes} min`;
}

/**
 * Calculate reservation end time
 */
export function calculateReservationEnd(start: Date, durationMinutes: number): Date {
  return addMinutes(start, durationMinutes);
}

/**
 * Check if a reservation can be made right now
 *
 * @param isOccupied Whether the room is currently occupied
 * @param nextEvent Next scheduled event
 * @returns Object with canReserve boolean and reason if not
 */
export function canMakeReservation(
  isOccupied: boolean,
  nextEvent: CalendarEvent | null
): { canReserve: boolean; reason?: string } {
  if (isOccupied) {
    return {
      canReserve: false,
      reason: 'Místnost je momentálně obsazena',
    };
  }

  if (nextEvent) {
    const now = new Date();
    const startTime = getReservationStartTime(now);
    const nextEventStart = new Date(nextEvent.start);
    const availableMinutes = differenceInMinutes(nextEventStart, startTime);

    if (availableMinutes < MIN_SLOT_MINUTES) {
      return {
        canReserve: false,
        reason: `Do další události zbývá méně než ${MIN_SLOT_MINUTES} minut`,
      };
    }
  }

  return { canReserve: true };
}
