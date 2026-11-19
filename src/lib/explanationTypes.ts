export type ReasonCode =
  | 'AVAILABLE'
  | 'OVERLAP'
  | 'BLOCKED'
  | 'INVALID_INTERVAL'
  | 'TOO_LONG'
  | 'PAST_START'
  | 'MISSING_INPUT';

export interface ExplanationInput {
  roomLabel: string;
  start: string;
  end: string;
  isAvailable: boolean;
  reasonCode: ReasonCode;
  note?: string;
}

export interface ExplanationOutput {
  explanation: string;
}

export type MockMode = 'normal' | 'timeout' | 'error' | 'invalid-output';
