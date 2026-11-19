import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import App from '@/App';

const B204 = 'Lab B204';
const C310 = 'Seminar Room C310';

function selectRoom(roomName: string) {
  const card = screen.getByRole('button', { name: new RegExp(roomName) });
  fireEvent.click(card);
}

function setField(labelText: string, value: string) {
  const input = screen.getByLabelText(labelText) as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
}

function clickCheck() {
  fireEvent.click(screen.getByRole('button', { name: /Check availability/i }));
}

function clickExplain() {
  fireEvent.click(screen.getByRole('button', { name: /Explain availability/i }));
}

describe('Explain availability UI', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('E1: explain button is not shown before a check', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: /Explain availability/i })).not.toBeInTheDocument();
  });

  it('E2: explain button appears after a check and clicking it shows the explanation card', async () => {
    render(<App />);
    selectRoom(B204);
    setField('Start time', '11:00');
    setField('End time', '12:00');
    clickCheck();
    expect(screen.getByRole('button', { name: /Explain availability/i })).toBeInTheDocument();

    await act(async () => {
      clickExplain();
    });
    await waitFor(() => {
      expect(screen.getByTestId('explanation-card')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/AI-style explanation \(mock\) - not a booking confirmation/i),
    ).toBeInTheDocument();
  });

  it('E3: the existing Available/Unavailable card stays unchanged after explain', async () => {
    render(<App />);
    selectRoom(B204);
    setField('Start time', '11:00');
    setField('End time', '12:00');
    clickCheck();
    expect(screen.getByText('Available')).toBeInTheDocument();

    await act(async () => {
      clickExplain();
    });
    await waitFor(() => {
      expect(screen.getByTestId('explanation-card')).toBeInTheDocument();
    });
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('E4: error mode falls back to deterministic reason', async () => {
    render(<App />);
    selectRoom(C310);
    setField('Start time', '11:00');
    setField('End time', '12:00');
    clickCheck();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Mock mode/i), { target: { value: 'error' } });

    await act(async () => {
      clickExplain();
    });
    await waitFor(() => {
      expect(screen.getByTestId('explanation-card')).toBeInTheDocument();
    });
    expect(screen.getByText(/deterministic reason as fallback/i)).toBeInTheDocument();
  });

  it('E5: invalid-output mode falls back to deterministic reason', async () => {
    render(<App />);
    selectRoom(B204);
    setField('Start time', '11:00');
    setField('End time', '12:00');
    clickCheck();

    fireEvent.change(screen.getByLabelText(/Mock mode/i), { target: { value: 'invalid-output' } });

    await act(async () => {
      clickExplain();
    });
    await waitFor(() => {
      expect(screen.getByTestId('explanation-card')).toBeInTheDocument();
    });
    expect(screen.getByText(/deterministic reason as fallback/i)).toBeInTheDocument();
  });

  it('E6: changing a filter clears the explanation along with the result', async () => {
    render(<App />);
    selectRoom(B204);
    setField('Start time', '11:00');
    setField('End time', '12:00');
    clickCheck();

    await act(async () => {
      clickExplain();
    });
    await waitFor(() => {
      expect(screen.getByTestId('explanation-card')).toBeInTheDocument();
    });

    setField('Start time', '13:00');

    expect(screen.queryByTestId('explanation-card')).not.toBeInTheDocument();
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
  });

  it('E7: selecting a different room clears the explanation', async () => {
    render(<App />);
    selectRoom(B204);
    setField('Start time', '11:00');
    setField('End time', '12:00');
    clickCheck();

    await act(async () => {
      clickExplain();
    });
    await waitFor(() => {
      expect(screen.getByTestId('explanation-card')).toBeInTheDocument();
    });

    selectRoom(C310);

    expect(screen.queryByTestId('explanation-card')).not.toBeInTheDocument();
  });

  it('E8: note input does not change availability status', () => {
    render(<App />);
    selectRoom(B204);
    setField('Start time', '11:00');
    setField('End time', '12:00');
    clickCheck();
    expect(screen.getByText('Available')).toBeInTheDocument();

    setField('Note (optional)', 'Some untrusted note');
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('E9: note over 140 chars shows a warning and explain rejects with a clear message', async () => {
    render(<App />);
    selectRoom(B204);
    setField('Start time', '11:00');
    setField('End time', '12:00');
    clickCheck();

    setField('Note (optional)', 'x'.repeat(141));
    expect(screen.getByTestId('note-counter')).toHaveTextContent(/over the limit/);

    await act(async () => {
      clickExplain();
    });
    await waitFor(() => {
      expect(screen.getByTestId('explanation-card')).toBeInTheDocument();
    });
    expect(screen.getByText(/note must not exceed 140/i)).toBeInTheDocument();
  });

  it('E10: a new check clears a stale explanation before a new one loads', async () => {
    render(<App />);
    selectRoom(B204);
    setField('Start time', '11:00');
    setField('End time', '12:00');
    clickCheck();

    await act(async () => {
      clickExplain();
    });
    await waitFor(() => {
      expect(screen.getByTestId('explanation-card')).toBeInTheDocument();
    });

    clickCheck();

    expect(screen.queryByTestId('explanation-card')).not.toBeInTheDocument();
  });

  it('E11: stale async result from a previous explain is ignored after a new check', async () => {
    render(<App />);
    selectRoom(B204);
    setField('Start time', '11:00');
    setField('End time', '12:00');
    clickCheck();

    fireEvent.change(screen.getByLabelText(/Mock mode/i), { target: { value: 'timeout' } });

    await act(async () => {
      clickExplain();
    });

    // While the timeout explain is in flight, start a new check
    await act(async () => {
      clickCheck();
    });

    // Advance past the original timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    // The stale explanation should NOT appear — only the new result card for Available
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.queryByTestId('explanation-card')).not.toBeInTheDocument();
  });
});
