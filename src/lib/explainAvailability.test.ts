import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  validateExplanationInput,
  validateExplanationOutput,
  buildMockExplanation,
  explainAvailability,
  withTimeout,
  EXPLANATION_TIMEOUT_MS,
} from '@/lib/explainAvailability';
import type { ExplanationInput } from '@/lib/explanationTypes';

const validInput: ExplanationInput = {
  roomLabel: 'Lab B204',
  start: '11:00',
  end: '12:00',
  isAvailable: true,
  reasonCode: 'AVAILABLE',
};

const fallbackReason = 'Lab B204 is free from 11:00 to 12:00.';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('validateExplanationInput', () => {
  it('I1: accepts a valid input', () => {
    const result = validateExplanationInput(validInput);
    expect(result.ok).toBe(true);
  });

  it('I2: rejects non-object', () => {
    const result = validateExplanationInput('not an object');
    expect(result.ok).toBe(false);
  });

  it('I3: rejects null', () => {
    const result = validateExplanationInput(null);
    expect(result.ok).toBe(false);
  });

  it('I4: rejects empty roomLabel', () => {
    const result = validateExplanationInput({ ...validInput, roomLabel: '' });
    expect(result.ok).toBe(false);
  });

  it('I5: rejects missing isAvailable', () => {
    const result = validateExplanationInput({ ...validInput, isAvailable: undefined });
    expect(result.ok).toBe(false);
  });

  it('I6: rejects invalid reasonCode', () => {
    const result = validateExplanationInput({ ...validInput, reasonCode: 'WRONG' });
    expect(result.ok).toBe(false);
  });

  it('I7: rejects note over 140 chars', () => {
    const result = validateExplanationInput({
      ...validInput,
      note: 'x'.repeat(141),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/note must not exceed 140/);
    }
  });

  it('I8: accepts note of exactly 140 chars', () => {
    const result = validateExplanationInput({
      ...validInput,
      note: 'x'.repeat(140),
    });
    expect(result.ok).toBe(true);
  });

  it('I9: rejects non-string note', () => {
    const result = validateExplanationInput({ ...validInput, note: 123 });
    expect(result.ok).toBe(false);
  });
});

describe('buildMockExplanation', () => {
  it('B1: available room produces positive text', () => {
    const out = buildMockExplanation(validInput);
    expect(out.explanation).toContain('free');
    expect(out.explanation.length).toBeLessThanOrEqual(240);
  });

  it('B2: unavailable room produces negative text', () => {
    const out = buildMockExplanation({
      ...validInput,
      isAvailable: false,
      reasonCode: 'OVERLAP',
    });
    expect(out.explanation).toContain('overlaps');
    expect(out.explanation.length).toBeLessThanOrEqual(240);
  });

  it('B3: ignores the note field', () => {
    const out1 = buildMockExplanation({ ...validInput, note: 'Important note' });
    const out2 = buildMockExplanation(validInput);
    expect(out1.explanation).toBe(out2.explanation);
  });

  it('B4: output has at most 2 sentences', () => {
    const out = buildMockExplanation(validInput);
    const sentences = out.explanation.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    expect(sentences.length).toBeLessThanOrEqual(2);
  });
});

describe('validateExplanationOutput', () => {
  it('V1: accepts valid output', () => {
    const result = validateExplanationOutput(
      { explanation: 'Lab B204 is free from 11:00 to 12:00.' },
      true,
      fallbackReason,
    );
    expect(result.explanation).toBe('Lab B204 is free from 11:00 to 12:00.');
  });

  it('V2: falls back when not an object', () => {
    const result = validateExplanationOutput('bad', true, fallbackReason);
    expect(result.explanation).toBe(fallbackReason);
  });

  it('V3: falls back when explanation is empty', () => {
    const result = validateExplanationOutput({ explanation: '' }, true, fallbackReason);
    expect(result.explanation).toBe(fallbackReason);
  });

  it('V4: falls back when explanation exceeds 240 chars', () => {
    const result = validateExplanationOutput(
      { explanation: 'x'.repeat(241) },
      true,
      fallbackReason,
    );
    expect(result.explanation).toBe(fallbackReason);
  });

  it('V5: falls back when explanation has more than 2 sentences', () => {
    const result = validateExplanationOutput(
      { explanation: 'One. Two. Three.' },
      true,
      fallbackReason,
    );
    expect(result.explanation).toBe(fallbackReason);
  });

  it('V6: falls back when text disagrees with isAvailable (says available but isAvailable is false)', () => {
    const result = validateExplanationOutput(
      { explanation: 'This room is free and available.' },
      false,
      fallbackReason,
    );
    expect(result.explanation).toBe(fallbackReason);
  });
});

describe('explainAvailability — mock modes', () => {
  it('M1: normal mode returns valid explanation', async () => {
    const promise = explainAvailability(validInput, 'normal', fallbackReason);
    const out = await promise;
    expect(out.explanation).toContain('free');
  });

  it('M2: error mode throws', async () => {
    await expect(
      explainAvailability(validInput, 'error', fallbackReason),
    ).rejects.toThrow(/Mock adapter error/);
  });

  it('M3: timeout mode throws after the timeout', async () => {
    vi.useFakeTimers();
    const promise = explainAvailability(validInput, 'timeout', fallbackReason);
    const rejection = expect(promise).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(EXPLANATION_TIMEOUT_MS + 200);
    await rejection;
    vi.useRealTimers();
  });

  it('M4: invalid-output mode returns fallback', async () => {
    const out = await explainAvailability(validInput, 'invalid-output', fallbackReason);
    expect(out.explanation).toBe(fallbackReason);
  });

  it('M5: note is ignored in all modes', async () => {
    const withNote = await explainAvailability(
      { ...validInput, note: 'Special note' },
      'normal',
      fallbackReason,
    );
    const withoutNote = await explainAvailability(validInput, 'normal', fallbackReason);
    expect(withNote.explanation).toBe(withoutNote.explanation);
  });
});

describe('withTimeout', () => {
  it('T1: resolves before timeout', async () => {
    vi.useFakeTimers();
    const promise = withTimeout(
      new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 100)),
      1000,
    );
    vi.advanceTimersByTime(150);
    const result = await promise;
    expect(result).toBe('ok');
    vi.useRealTimers();
  });

  it('T2: rejects after timeout', async () => {
    vi.useFakeTimers();
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('late'), 5000));
    const promise = withTimeout(slow, EXPLANATION_TIMEOUT_MS);
    const rejection = expect(promise).rejects.toThrow(/timed out after/);
    await vi.advanceTimersByTimeAsync(EXPLANATION_TIMEOUT_MS + 100);
    await rejection;
    vi.useRealTimers();
  });
});
