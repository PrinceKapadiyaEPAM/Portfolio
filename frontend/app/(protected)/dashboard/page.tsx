'use client';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useMarketData } from '@/hooks/useMarketData';
import { MarketStatusBadge } from '@/components/market/MarketStatusBadge';
import { IndexBar } from '@/components/market/IndexBar';
import { TopMovers } from '@/components/market/TopMovers';
import { StaleBanner } from '@/components/market/StaleBanner';
import { clearMarketCache } from '@/lib/market-api';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ''}`} />;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { status, indices, movers, stale, isLastClose, lastCloseAsOf, loading, lastUpdated, refetch } = useMarketData();
  const [clearing, setClearing] = useState(false);

  const handleClearMarketCache = async () => {
    try {
      setClearing(true);
      await clearMarketCache();
      await refetch();
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.name ?? user?.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && !status ? (
            <Skeleton className="h-6 w-28" />
          ) : status ? (
            <MarketStatusBadge
              phase={status.phase}
              nextEventInMinutes={status.nextEventInMinutes}
            />
          ) : (
            <span className="text-xs text-gray-400 italic">Market data unavailable</span>
          )}
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString('en-IN')}
            </span>
          )}
          <button
            type="button"
            onClick={handleClearMarketCache}
            disabled={clearing}
            className="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {clearing ? 'Clearing…' : 'Clear market cache'}
          </button>
        </div>
      </div>

      {/* Last-close snapshot banner */}
      {!loading && isLastClose && (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-800">
          Showing data from last market close
          {lastCloseAsOf && (
            <span className="ml-1 opacity-70">
              ({lastCloseAsOf.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{' '}
              at {lastCloseAsOf.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
            </span>
          )}.
          Live prices will resume when the market opens.
        </div>
      )}

      {/* Stale live-data banner — only when there IS data but it is old */}
      {!loading && !isLastClose && stale && indices && <StaleBanner lastUpdated={lastUpdated} />}

      {/* No data at all — contextualised by market phase */}
      {!loading && !isLastClose && !indices && (
        status?.phase === 'closed' || status?.phase === 'weekend' ? (
          <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-800">
            Market is currently closed. Last-close data will appear here after the first trading session completes.
          </div>
        ) : status?.phase === 'pre-open' ? (
          <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-800">
            Market is in pre-open session. Live data will be available at 9:15 AM IST.
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-800">
            NSE market data is currently unavailable — the NSE API may be unreachable.
            Data will appear automatically once the next poll succeeds.
          </div>
        )
      )}

      {/* Indices */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Indices</h2>
        {loading && !indices ? (
          <div className="flex gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="flex-1 h-20" />)}
          </div>
        ) : indices && indices.length > 0 ? (
          <IndexBar indices={indices} />
        ) : (
          <p className="text-sm text-gray-400">No index data available.</p>
        )}
      </section>

      {/* Top Movers */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Top Movers</h2>
        {loading && !movers ? (
          <div className="flex gap-4">
            <Skeleton className="flex-1 h-48" />
            <Skeleton className="flex-1 h-48" />
          </div>
        ) : movers && (movers.gainers.length > 0 || movers.losers.length > 0) ? (
          <TopMovers gainers={movers.gainers} losers={movers.losers} />
        ) : (
          <p className="text-sm text-gray-400">No movers data available.</p>
        )}
      </section>
    </div>
  );
}
