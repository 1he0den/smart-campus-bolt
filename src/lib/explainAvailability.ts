import type {
  ExplanationInput,
  ExplanationOutput,
  MockMode,
} from '@/lib/explanationTypes';

const MAX_EXPLANATION_LEN = 240;
const MAX_EXPLANATION_SENTENCES = 2;
const MAX_NOTE_LEN = 140;
const ADAPTER_TIMEOUT_MS = 3000;

export const EXPLANATION_TIMEOUT_MS = ADAPTER_TIMEOUT_MS;

export type InputValidation =
  | { ok: true; value: ExplanationInput }
  | { ok: false; error: string };

export function validateExplanationInput(input: unknown): InputValidation {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Explanation input must be an object.' };
  }
  const obj = input as Record<string, unknown>;

  if (typeof obj.roomLabel !== 'string' || obj.roomLabel.trim() === '') {
    return { ok: false, error: 'roomLabel is required and must be a non-empty string.' };
  }
  if (typeof obj.start !== 'string' || obj.start.trim() === '') {
    return { ok: false, error: 'start is required and must be a non-empty string.' };
  }
  if (typeof obj.end !== 'string' || obj.end.trim() === '') {
    return { ok: false, error: 'end is required and must be a non-empty string.' };
  }
  if (typeof obj.isAvailable !== 'boolean') {
    return { ok: false, error: 'isAvailable must be a boolean.' };
  }
  if (typeof obj.reasonCode !== 'string') {
    return { ok: false, error: 'reasonCode is required and must be a string.' };
  }

  const validReasonCodes = [
    'AVAILABLE',
    'OVERLAP',
    'BLOCKED',
    'INVALID_INTERVAL',
    'TOO_LONG',
    'PAST_START',
    'MISSING_INPUT',
  ];
  if (!validReasonCodes.includes(obj.reasonCode)) {
    return { ok: false, error: `reasonCode must be one of: ${validReasonCodes.join(', ')}.` };
  }

  if (obj.note !== undefined) {
    if (typeof obj.note !== 'string') {
      return { ok: false, error: 'note, if provided, must be a string.' };
    }
    if (obj.note.length > MAX_NOTE_LEN) {
      return { ok: false, error: `note must not exceed ${MAX_NOTE_LEN} characters (received ${obj.note.length}).` };
    }
  }

  return {
    ok: true,
    value: {
      roomLabel: obj.roomLabel,
      start: obj.start,
      end: obj.end,
      isAvailable: obj.isAvailable,
      reasonCode: obj.reasonCode as ExplanationInput['reasonCode'],
      note: obj.note,
    },
  };
}

const REASON_PHRASES: Record<ExplanationInput['reasonCode'], string> = {
  AVAILABLE: 'is available',
  OVERLAP: 'overlaps an existing booking',
  BLOCKED: 'is currently blocked',
  INVALID_INTERVAL: 'has an invalid time interval',
  TOO_LONG: 'exceeds the 120-minute booking limit',
  PAST_START: 'starts before the current time',
  MISSING_INPUT: 'is missing required input',
};

export function buildMockExplanation(input: ExplanationInput): ExplanationOutput {
  const { roomLabel, start, end, isAvailable, reasonCode } = input;
  const phrase = REASON_PHRASES[reasonCode];

  let explanation: string;
  if (isAvailable) {
    explanation = `${roomLabel} is free from ${start} to ${end}. You can proceed with a booking request.`;
  } else {
    explanation = `${roomLabel} ${phrase} for ${start} to ${end}. Choose a different time or room.`;
  }

  if (explanation.length > MAX_EXPLANATION_LEN) {
    explanation = explanation.slice(0, MAX_EXPLANATION_LEN - 1).trimEnd() + '.';
  }

  return { explanation };
}

export function validateExplanationOutput(
  raw: unknown,
  isAvailable: boolean,
  fallbackReason: string,
): ExplanationOutput {
  if (typeof raw !== 'object' || raw === null) {
    return { explanation: fallbackReason };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.explanation !== 'string' || obj.explanation.trim() === '') {
    return { explanation: fallbackReason };
  }
  const text = obj.explanation;

  if (text.length > MAX_EXPLANATION_LEN) {
    return { explanation: fallbackReason };
  }

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > MAX_EXPLANATION_SENTENCES) {
    return { explanation: fallbackReason };
  }

  const positive = /\b(free|available|proceed)\b/i.test(text);
  const negative = /\b(blocked|overlap|invalid|exceed|before|missing|unavailable)\b/i.test(text);
  if (isAvailable && negative && !positive) {
    return { explanation: fallbackReason };
  }
  if (!isAvailable && positive && !negative) {
    return { explanation: fallbackReason };
  }

  return { explanation: text };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function explainAvailability(
  input: ExplanationInput,
  mode: MockMode,
  fallbackReason: string,
): Promise<ExplanationOutput> {
  if (mode === 'error') {
    throw new Error('Mock adapter error (demo mode).');
  }

  if (mode === 'timeout') {
    await delay(ADAPTER_TIMEOUT_MS + 100);
    throw new Error('Mock adapter timed out.');
  }

  if (mode === 'invalid-output') {
    return validateExplanationOutput(
      {
        explanation:
          'This sentence is deliberately far too long to pass the output length constraint so the validator must reject it and return the deterministic fallback reason text instead of this message. It also contains a second sentence which exceeds the two sentence limit.',
      },
      input.isAvailable,
      fallbackReason,
    );
  }

  const output = buildMockExplanation(input);
  return validateExplanationOutput(output, input.isAvailable, fallbackReason);
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  return Promise.race([
    promise,
    delay(ms).then(() => {
      throw new Error(`Adapter timed out after ${ms}ms.`);
    }),
  ]);
}
