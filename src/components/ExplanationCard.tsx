import { Lightbulb, Loader2, AlertTriangle } from 'lucide-react';
import type { ExplanationOutput } from '@/lib/explanationTypes';

interface ExplanationCardProps {
  explanation: ExplanationOutput | null;
  loading: boolean;
  usedFallback: boolean;
}

export default function ExplanationCard({ explanation, loading, usedFallback }: ExplanationCardProps) {
  if (loading) {
    return (
      <section
        data-testid="explanation-card"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <Loader2 className="shrink-0 text-amber-600 animate-spin" size={24} />
          <p className="text-sm text-amber-700">Generating explanation…</p>
        </div>
      </section>
    );
  }

  if (!explanation) return null;

  return (
    <section
      data-testid="explanation-card"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <Lightbulb className="shrink-0 text-amber-600" size={24} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-800">
            AI-style explanation (mock) - not a booking confirmation
          </p>
          <p className="mt-1 text-sm text-amber-700 leading-relaxed">
            {explanation.explanation}
          </p>
          {usedFallback && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle size={14} />
              The mock adapter could not produce a valid explanation. Showing the deterministic reason as fallback.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
