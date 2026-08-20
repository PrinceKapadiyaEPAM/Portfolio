import React, { useState } from 'react';

export default function WatchlistForm({
  initialName = '',
  onCancel,
  onSubmit,
  submitLabel = 'Save',
}: {
  initialName?: string;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void> | void;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return setError('Name is required');
    setSaving(true);
    setError(null);
    try {
      await onSubmit(name.trim());
    } catch (err: any) {
      setError(err?.message ?? 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="e.g. Tech Stocks"
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1 text-sm rounded-md border">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
