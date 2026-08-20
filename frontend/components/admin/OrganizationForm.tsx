import React, { useState } from 'react';

export default function OrganizationForm({
  initial = {},
  onCancel,
  onSubmit,
  submitLabel = 'Save',
}: {
  initial?: { name?: string; slug?: string; plan?: string; isActive?: boolean };
  onCancel: () => void;
  onSubmit: (payload: any) => Promise<void> | void;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initial.name ?? '');
  const [slug, setSlug] = useState(initial.slug ?? '');
  const [plan, setPlan] = useState(initial.plan ?? 'free');
  const [isActive, setIsActive] = useState(initial.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return setError('Name is required');
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), slug: slug.trim() || undefined, plan: plan || undefined, isActive });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? err?.message ?? 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Slug (optional)</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Plan</label>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input id="active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <label htmlFor="active" className="text-sm text-gray-700">Active</label>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1 text-sm rounded-md border">Cancel</button>
        <button type="submit" disabled={saving} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{saving ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
