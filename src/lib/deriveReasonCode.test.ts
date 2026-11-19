import { describe, expect, it } from 'vitest';
import { checkAvailability } from '@/lib/checkAvailability';
import { deriveReasonCode } from '@/lib/deriveReasonCode';
import { rooms, bookings } from '@/data';

const availableRoom = rooms.find((r) => r.id === 'D105')!;
const blockedRoom = rooms.find((r) => r.blocked)!;
const overlapRoom = rooms.find((r) => r.id === 'A101')!;

describe('deriveReasonCode — real scenarios through checkAvailability', () => {
  it('R01: available room → AVAILABLE', () => {
    const result = checkAvailability(availableRoom, { start: 700, end: 760 }, 600, bookings);
    expect(deriveReasonCode(result)).toBe('AVAILABLE');
  });

  it('R02: invalid interval (start >= end) → INVALID_INTERVAL', () => {
    const result = checkAvailability(availableRoom, { start: 600, end: 600 }, 500, bookings);
    expect(deriveReasonCode(result)).toBe('INVALID_INTERVAL');
  });

  it('R03: invalid interval (end > 1440) → INVALID_INTERVAL', () => {
    const result = checkAvailability(availableRoom, { start: 1400, end: 1500 }, 1300, bookings);
    expect(deriveReasonCode(result)).toBe('INVALID_INTERVAL');
  });

  it('R04: start not after current time → PAST_START', () => {
    const result = checkAvailability(availableRoom, { start: 600, end: 660 }, 600, bookings);
    expect(deriveReasonCode(result)).toBe('PAST_START');
  });

  it('R05: booking exceeds 120 minutes → TOO_LONG', () => {
    const result = checkAvailability(availableRoom, { start: 700, end: 821 }, 600, bookings);
    expect(deriveReasonCode(result)).toBe('TOO_LONG');
  });

  it('R06: blocked room → BLOCKED', () => {
    const result = checkAvailability(blockedRoom, { start: 700, end: 760 }, 600, bookings);
    expect(deriveReasonCode(result)).toBe('BLOCKED');
  });

  it('R07: overlapping existing booking → OVERLAP', () => {
    const result = checkAvailability(overlapRoom, { start: 560, end: 620 }, 500, bookings);
    expect(deriveReasonCode(result)).toBe('OVERLAP');
  });

  it('R08: null room → MISSING_INPUT', () => {
    const result = checkAvailability(null, { start: 700, end: 760 }, 600, bookings);
    expect(deriveReasonCode(result)).toBe('MISSING_INPUT');
  });

  it('R09: App-level missing time input → MISSING_INPUT', () => {
    const result = { available: false as const, reason: 'Please enter current, start, and end times.' };
    expect(deriveReasonCode(result)).toBe('MISSING_INPUT');
  });

  it('R10: available result has no reason property', () => {
    const result = checkAvailability(availableRoom, { start: 700, end: 760 }, 600, bookings);
    expect(result.available).toBe(true);
    expect(deriveReasonCode(result)).toBe('AVAILABLE');
  });
});
