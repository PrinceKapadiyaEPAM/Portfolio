'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchMarketStatus, fetchIndices, fetchMovers } from '@/lib/market-api';
import type { MarketStatus, IndexQuote, Movers } from '@/types/market';

const POLL_INTERVAL_MS = 15_000;
const STATUS_CHECK_MS = 60_000;

export interface MarketData {
  status: MarketStatus | null;
  indices: IndexQuote[] | null;
  movers: Movers | null;
  stale: boolean;
  isLastClose: boolean;
  lastCloseAsOf: Date | null;
  loading: boolean;
  lastUpdated: Date | null;
  refetch: () => Promise<string | null | undefined>;
}

export function useMarketData(): MarketData {
  const [status, setStatus]           = useState<MarketStatus | null>(null);
  const [indices, setIndices]         = useState<IndexQuote[] | null>(null);
  const [movers, setMovers]           = useState<Movers | null>(null);
  const [stale, setStale]                   = useState(false);
  const [isLastClose, setIsLastClose]       = useState(false);
  const [lastCloseAsOf, setLastCloseAsOf]   = useState<Date | null>(null);
  const [loading, setLoading]               = useState(true);
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);

  const isMounted = useRef(true);

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, indicesRes, moversRes] = await Promise.allSettled([
        fetchMarketStatus(),
        fetchIndices(),
        fetchMovers(),
      ]);

      if (!isMounted.current) return;

      if (statusRes.status === 'fulfilled' && statusRes.value.data) {
        setStatus(statusRes.value.data);
      }
      if (indicesRes.status === 'fulfilled' && indicesRes.value.data) {
        setIndices(indicesRes.value.data);
      }
      if (moversRes.status === 'fulfilled' && moversRes.value.data) {
        setMovers(moversRes.value.data);
      }

      const isStale =
        (indicesRes.status === 'fulfilled' && indicesRes.value.data !== null && indicesRes.value.meta.stale) ||
        (moversRes.status  === 'fulfilled' && moversRes.value.data !== null && moversRes.value.meta.stale);

      const lastClose =
        (indicesRes.status === 'fulfilled' && !!indicesRes.value.meta.isLastClose) ||
        (moversRes.status  === 'fulfilled' && !!moversRes.value.meta.isLastClose);

      const asOfStr =
        (indicesRes.status === 'fulfilled' && indicesRes.value.meta.isLastClose && indicesRes.value.meta.asOf) ||
        (moversRes.status  === 'fulfilled' && moversRes.value.meta.isLastClose  && moversRes.value.meta.asOf) ||
        null;

      setStale(isStale);
      setIsLastClose(lastClose);
      setLastCloseAsOf(asOfStr ? new Date(asOfStr) : null);
      setLastUpdated(new Date());
      // return the resolved market phase if available so callers can react
      const phase = statusRes.status === 'fulfilled' && statusRes.value?.data ? statusRes.value.data.phase : null;
      return phase;
    } catch {
      // silently keep previous data on fetch error
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    let fullPollId: ReturnType<typeof setInterval> | null = null;
    let statusPollId: ReturnType<typeof setInterval> | null = null;

    let cancelled = false;

    async function startUp() {
      const phase = await fetchAll();
      if (cancelled) return;

      const isOpen = phase === 'open' || phase === 'pre-open';
      if (isOpen) {
        fullPollId = setInterval(fetchAll, POLL_INTERVAL_MS);
      } else {
        // market closed — poll only status to detect re-open
        statusPollId = setInterval(async () => {
          try {
            const s = await fetchMarketStatus();
            const p = s?.data?.phase;
            if (p === 'open' || p === 'pre-open') {
              // immediate refresh and start full polling
              await fetchAll();
              if (statusPollId) { clearInterval(statusPollId); statusPollId = null; }
              fullPollId = setInterval(fetchAll, POLL_INTERVAL_MS);
            }
          } catch { /* ignore status check errors */ }
        }, STATUS_CHECK_MS);
      }
    }

    startUp();

    return () => {
      cancelled = true;
      isMounted.current = false;
      if (fullPollId) clearInterval(fullPollId);
      if (statusPollId) clearInterval(statusPollId);
    };
  }, [fetchAll]);

  return { status, indices, movers, stale, isLastClose, lastCloseAsOf, loading, lastUpdated, refetch: fetchAll };
}
