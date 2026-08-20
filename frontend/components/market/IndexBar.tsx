import type { IndexQuote } from '@/types/market';

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function IndexCard({ q }: { q: IndexQuote }) {
  const positive = q.changePct >= 0;
  return (
    <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs font-medium text-gray-500 truncate">{q.symbol}</p>
      <p className="text-lg font-semibold text-gray-900 mt-0.5">{fmt(q.ltp)}</p>
      <p className={`text-xs font-medium mt-0.5 ${positive ? 'text-green-600' : 'text-red-600'}`}>
        {positive ? '+' : ''}{fmt(q.change)} ({positive ? '+' : ''}{q.changePct.toFixed(2)}%)
      </p>
    </div>
  );
}

interface Props {
  indices: IndexQuote[];
}

export function IndexBar({ indices }: Props) {
  return (
    <div className="flex gap-3 flex-wrap">
      {indices.map((q) => (
        <IndexCard key={q.symbol} q={q} />
      ))}
    </div>
  );
}
