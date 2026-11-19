import type { MockMode } from '@/lib/explanationTypes';

interface MockModeSelectorProps {
  value: MockMode;
  onChange: (mode: MockMode) => void;
}

const OPTIONS: { value: MockMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'error', label: 'Error' },
  { value: 'invalid-output', label: 'Invalid output' },
];

export default function MockModeSelector({ value, onChange }: MockModeSelectorProps) {
  return (
    <div className="mt-4">
      <label
        htmlFor="mock-mode"
        className="block text-xs font-medium text-slate-500 mb-1.5"
      >
        Mock mode (demo test control)
      </label>
      <select
        id="mock-mode"
        value={value}
        onChange={(e) => onChange(e.target.value as MockMode)}
        className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
