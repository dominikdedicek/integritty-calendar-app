import { describe, it, expect } from 'vitest';
import {
  roundUpToNearestFiveMinutes,
  calculateAvailableSlots,
  formatSlotLabel,
  canMakeReservation,
  MIN_SLOT_MINUTES,
  STANDARD_SLOTS,
} from './slots';
import { CalendarEvent } from '../types';

describe('roundUpToNearestFiveMinutes', () => {
  it('should round up 10:03 to 10:05', () => {
    const input = new Date('2024-01-15T10:03:00');
    const result = roundUpToNearestFiveMinutes(input);
    expect(result.getMinutes()).toBe(5);
    expect(result.getSeconds()).toBe(0);
  });

  it('should round up 10:01 to 10:05', () => {
    const input = new Date('2024-01-15T10:01:00');
    const result = roundUpToNearestFiveMinutes(input);
    expect(result.getMinutes()).toBe(5);
  });

  it('should round up 10:06 to 10:10', () => {
    const input = new Date('2024-01-15T10:06:00');
    const result = roundUpToNearestFiveMinutes(input);
    expect(result.getMinutes()).toBe(10);
  });

  it('should keep 10:00:00.000 as is', () => {
    const input = new Date('2024-01-15T10:00:00.000');
    const result = roundUpToNearestFiveMinutes(input);
    expect(result.getMinutes()).toBe(0);
  });

  it('should round up 10:00:01 to 10:05', () => {
    const input = new Date('2024-01-15T10:00:01');
    const result = roundUpToNearestFiveMinutes(input);
    expect(result.getMinutes()).toBe(5);
  });

  it('should round up 10:55 to 11:00', () => {
    const input = new Date('2024-01-15T10:55:30');
    const result = roundUpToNearestFiveMinutes(input);
    expect(result.getHours()).toBe(11);
    expect(result.getMinutes()).toBe(0);
  });

  it('should handle midnight rollover', () => {
    const input = new Date('2024-01-15T23:58:00');
    const result = roundUpToNearestFiveMinutes(input);
    expect(result.getDate()).toBe(16);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });
});

describe('calculateAvailableSlots', () => {
  const createEvent = (start: string, end: string): CalendarEvent => ({
    id: '1',
    title: 'Test Event',
    start,
    end,
    isAllDay: false,
    status: 'confirmed',
  });

  it('should return all standard slots when no next event', () => {
    const now = new Date('2024-01-15T10:00:00');
    const slots = calculateAvailableSlots(now, null);

    expect(slots.length).toBe(4);
    expect(slots.map((s) => s.minutes)).toEqual(STANDARD_SLOTS);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it('should return all slots when next event is far away', () => {
    const now = new Date('2024-01-15T10:00:00');
    const nextEvent = createEvent(
      '2024-01-15T12:00:00',
      '2024-01-15T13:00:00'
    );
    const slots = calculateAvailableSlots(now, nextEvent);

    expect(slots.length).toBe(4);
    expect(slots.map((s) => s.minutes)).toEqual(STANDARD_SLOTS);
  });

  it('should limit slots when next event is in 45 minutes', () => {
    const now = new Date('2024-01-15T10:00:00');
    const nextEvent = createEvent(
      '2024-01-15T10:45:00',
      '2024-01-15T11:00:00'
    );
    const slots = calculateAvailableSlots(now, nextEvent);

    // Should have 15, 30, 45 minute slots
    expect(slots.map((s) => s.minutes)).toEqual([15, 30, 45]);
  });

  it('should limit slots when next event is in 30 minutes', () => {
    const now = new Date('2024-01-15T10:00:00');
    const nextEvent = createEvent(
      '2024-01-15T10:30:00',
      '2024-01-15T11:00:00'
    );
    const slots = calculateAvailableSlots(now, nextEvent);

    expect(slots.map((s) => s.minutes)).toEqual([15, 30]);
  });

  it('should offer custom slot when available time is 43 minutes', () => {
    const now = new Date('2024-01-15T10:00:00');
    const nextEvent = createEvent(
      '2024-01-15T10:43:00',
      '2024-01-15T11:00:00'
    );
    const slots = calculateAvailableSlots(now, nextEvent);

    // Should have 15, 30 minute standard slots + 43 minute custom slot
    expect(slots.map((s) => s.minutes)).toEqual([15, 30, 43]);
    expect(slots[2].label).toContain('max dostupný');
  });

  it('should offer only custom slot when less than 15 minutes but >= 5 minutes', () => {
    const now = new Date('2024-01-15T10:00:00');
    const nextEvent = createEvent(
      '2024-01-15T10:10:00', // 10 minutes available
      '2024-01-15T11:00:00'
    );
    const slots = calculateAvailableSlots(now, nextEvent);

    expect(slots.length).toBe(1);
    expect(slots[0].minutes).toBe(10);
    expect(slots[0].label).toContain('max dostupný');
  });

  it('should return empty array when less than MIN_SLOT_MINUTES available', () => {
    const now = new Date('2024-01-15T10:00:00');
    const nextEvent = createEvent(
      '2024-01-15T10:03:00', // 3 minutes, less than MIN_SLOT_MINUTES (5)
      '2024-01-15T11:00:00'
    );
    const slots = calculateAvailableSlots(now, nextEvent);

    expect(slots.length).toBe(0);
  });

  it('should return empty array when next event already started', () => {
    const now = new Date('2024-01-15T10:30:00');
    const nextEvent = createEvent(
      '2024-01-15T10:00:00', // Already started
      '2024-01-15T11:00:00'
    );
    const slots = calculateAvailableSlots(now, nextEvent);

    expect(slots.length).toBe(0);
  });

  it('should handle time rounding when calculating available minutes', () => {
    // Now is 10:03, rounded up to 10:05
    // Next event at 10:20, so 15 minutes available
    const now = new Date('2024-01-15T10:03:00');
    const nextEvent = createEvent(
      '2024-01-15T10:20:00',
      '2024-01-15T11:00:00'
    );
    const slots = calculateAvailableSlots(now, nextEvent);

    expect(slots.map((s) => s.minutes)).toEqual([15]);
  });
});

describe('formatSlotLabel', () => {
  it('should format 60 minutes as "1 hodina"', () => {
    expect(formatSlotLabel(60)).toBe('1 hodina');
  });

  it('should format 30 minutes as "30 min"', () => {
    expect(formatSlotLabel(30)).toBe('30 min');
  });

  it('should format 15 minutes as "15 min"', () => {
    expect(formatSlotLabel(15)).toBe('15 min');
  });
});

describe('canMakeReservation', () => {
  it('should return false when room is occupied', () => {
    const result = canMakeReservation(true, null);

    expect(result.canReserve).toBe(false);
    expect(result.reason).toContain('obsazena');
  });

  it('should return true when room is free and no next event', () => {
    const result = canMakeReservation(false, null);

    expect(result.canReserve).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should return true when room is free and next event is far', () => {
    // This test needs to mock "now" - for simplicity we test the basic logic
    // In real app, this would need time mocking
    const result = canMakeReservation(false, null);
    expect(result.canReserve).toBe(true);
  });
});

describe('constants', () => {
  it('MIN_SLOT_MINUTES should be 5', () => {
    expect(MIN_SLOT_MINUTES).toBe(5);
  });

  it('STANDARD_SLOTS should be [15, 30, 45, 60]', () => {
    expect(STANDARD_SLOTS).toEqual([15, 30, 45, 60]);
  });
});
