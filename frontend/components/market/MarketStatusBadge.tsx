import type { MarketPhase } from '@/types/market';

const CONFIG: Record<MarketPhase, { label: string; className: string; dot: string }> = {
  open:     { label: 'Market Open',     className: 'bg-green-100 text-green-800 border-green-200',  dot: 'bg-green-500 animate-pulse' },
  'pre-open': { label: 'Pre-Open',      className: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500 animate-pulse' },
  closed:   { label: 'Market Closed',   className: 'bg-gray-100 text-gray-600 border-gray-200',     dot: 'bg-gray-400' },
  weekend:  { label: 'Weekend / Holiday', className: 'bg-gray-100 text-gray-500 border-gray-200',   dot: 'bg-gray-300' },
};

interface Props {
  phase: MarketPhase;
  nextEventInMinutes?: number;
}

export function MarketStatusBadge({ phase, nextEventInMinutes }: Props) {
  const { label, className, dot } = CONFIG[phase];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${className}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span>{label}</span>
      {nextEventInMinutes != null && phase !== 'open' && (
        <span className="opacity-70">· {nextEventInMinutes}m</span>
      )}
    </div>
  );
}
