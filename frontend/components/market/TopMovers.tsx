import type { Mover } from '@/types/market';

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MoverTable({ title, movers, positive }: { title: string; movers: Mover[]; positive: boolean }) {
  const textColor = positive ? 'text-green-600' : 'text-red-600';
  const headerBg  = positive ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className={`px-4 py-2.5 border-b border-gray-200 ${headerBg}`}>
        <h3 className={`text-sm font-semibold ${textColor}`}>{title}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Symbol</th>
            <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">LTP</th>
            <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Chg%</th>
          </tr>
        </thead>
        <tbody>
          {movers.slice(0, 5).map((m) => (
            <tr key={m.symbol} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-gray-800">{m.symbol}</td>
              <td className="px-4 py-2 text-right text-gray-700">{fmt(m.ltp)}</td>
              <td className={`px-4 py-2 text-right font-medium ${textColor}`}>
                {m.changePct >= 0 ? '+' : ''}{m.changePct.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface Props {
  gainers: Mover[];
  losers: Mover[];
}

export function TopMovers({ gainers, losers }: Props) {
  return (
    <div className="flex gap-4 flex-wrap">
      <MoverTable title="Top Gainers" movers={gainers} positive />
      <MoverTable title="Top Losers"  movers={losers}  positive={false} />
    </div>
  );
}
