const COLORS: Record<string, string> = {
  draft:                'bg-gray-100 text-gray-600',
  active:               'bg-blue-100 text-blue-700',
  paused:               'bg-yellow-100 text-yellow-700',
  accumulating:         'bg-indigo-100 text-indigo-700',
  partially_accumulated:'bg-indigo-100 text-indigo-600',
  fully_accumulated:    'bg-indigo-200 text-indigo-800',
  targeting:            'bg-purple-100 text-purple-700',
  partially_exited:     'bg-orange-100 text-orange-700',
  closed:               'bg-green-100 text-green-700',
  stopped_out:          'bg-red-100 text-red-700',
  cancelled:            'bg-gray-100 text-gray-500',
  pending:              'bg-gray-100 text-gray-500',
  triggered:            'bg-blue-100 text-blue-600',
  partially_filled:     'bg-yellow-100 text-yellow-700',
  filled:               'bg-green-100 text-green-700',
  skipped:              'bg-gray-100 text-gray-400',
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = COLORS[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
