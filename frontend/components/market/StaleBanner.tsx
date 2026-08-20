interface Props {
  lastUpdated: Date | null;
}

export function StaleBanner({ lastUpdated }: Props) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-2 flex items-center gap-2 text-sm text-amber-800">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <span>
        Showing cached data — market may be outside trading hours.
        {lastUpdated && (
          <span className="ml-1 opacity-70">Last updated {lastUpdated.toLocaleTimeString('en-IN')}.</span>
        )}
      </span>
    </div>
  );
}
