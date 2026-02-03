import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

/**
 * Format milliseconds as HH:MM:SS countdown
 */
export function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) {
    return '00:00:00';
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((val) => val.toString().padStart(2, '0'))
    .join(':');
}

/**
 * Format time range for event display
 */
export function formatTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startTime = format(startDate, 'HH:mm', { locale: cs });
  const endTime = format(endDate, 'HH:mm', { locale: cs });

  return `${startTime} - ${endTime}`;
}

/**
 * Format current date for display
 */
export function formatCurrentDate(date: Date): string {
  return format(date, "EEEE d. MMMM yyyy", { locale: cs });
}

/**
 * Format current time for display
 */
export function formatCurrentTime(date: Date): string {
  return format(date, 'HH:mm:ss', { locale: cs });
}

/**
 * Check if an event is currently happening
 */
export function isEventCurrent(start: string, end: string, now: Date): boolean {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return now >= startDate && now < endDate;
}

/**
 * Check if an event is in the past
 */
export function isEventPast(end: string, now: Date): boolean {
  const endDate = new Date(end);
  return now >= endDate;
}
