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
 * Round time up to the nearest 5 minutes
 *
 * Reasoning for 5-minute rounding:
 * - More practical for real-world meetings (people think in 5-10 minute increments)
 * - Prevents very short "leftover" slots (e.g., 2 minutes)
 * - Calendar entries look cleaner (10:15 vs 10:17)
 * - Standard practice in most calendar/booking systems
 *
 * @param date Date to round
 * @returns Date rounded up to next 5 minutes
 */
export function roundUpToNearestFiveMinutes(date: Date): Date {
  const minutes = date.getMinutes();
  const remainder = minutes % 5;

  if (remainder === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0) {
    // Already exactly on a 5-minute boundary
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
 * 1. Slots start from current time rounded up to 5 minutes
 * 2. Standard slots: 15, 30, 45, 60 minutes
 * 3. If a standard slot would overlap with the next event, it's marked as unavailable
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
  const roundedStart = roundUpToNearestFiveMinutes(now);

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
  if (isBefore(nextEventStart, roundedStart)) {
    return [];
  }

  // Calculate available time until next event
  const availableMinutes = differenceInMinutes(nextEventStart, roundedStart);

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
    const roundedStart = roundUpToNearestFiveMinutes(now);
    const nextEventStart = new Date(nextEvent.start);
    const availableMinutes = differenceInMinutes(nextEventStart, roundedStart);

    if (availableMinutes < MIN_SLOT_MINUTES) {
      return {
        canReserve: false,
        reason: `Do další události zbývá méně než ${MIN_SLOT_MINUTES} minut`,
      };
    }
  }

  return { canReserve: true };
}
