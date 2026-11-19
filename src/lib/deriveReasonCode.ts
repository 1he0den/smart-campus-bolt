import type { AvailabilityResult } from '@/types';
import type { ReasonCode } from '@/lib/explanationTypes';

/**
 * Maps the deterministic availability result to a structured reason code.
 * Anchored matching (startsWith or anchored regex) — never a loose substring —
 * so a changed message text fails the test instead of silently misclassifying.
 */
export function deriveReasonCode(result: AvailabilityResult): ReasonCode {
  if (result.available) return 'AVAILABLE';

  const reason = result.reason;

  if (reason.startsWith('Interval must satisfy')) return 'INVALID_INTERVAL';
  if (reason.startsWith('Start time must be after')) return 'PAST_START';
  if (reason.startsWith('Please select a room.')) return 'MISSING_INPUT';
  if (reason.startsWith('Please enter current, start, and end times.')) return 'MISSING_INPUT';
  if (reason.startsWith('Booking cannot exceed')) return 'TOO_LONG';
  if (/.+is currently blocked/.test(reason)) return 'BLOCKED';
  if (reason.startsWith('Overlaps an existing booking')) return 'OVERLAP';

  return 'MISSING_INPUT';
}
