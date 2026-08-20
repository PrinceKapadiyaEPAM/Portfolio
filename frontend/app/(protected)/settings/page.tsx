'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { updateMe, fetchOrgUsers, inviteUser } from '@/lib/users-api';
import type { OrgUser } from '@/lib/users-api';
import Modal from '@/components/ui/Modal';

const ROLE_BADGE: Record<string, string> = {
  admin:   'bg-blue-100 text-blue-700 border-blue-200',
  manager: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  viewer:  'bg-gray-100 text-gray-600 border-gray-200',
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_BADGE[role] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {role}
    </span>
  );
}

function Avatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 select-none">
      {initials}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, accessToken, setAuth } = useAuthStore();
  const [name, setName]     = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !user || !accessToken) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await updateMe({ name: name.trim() });
      setAuth({ ...user, name: updated.name }, accessToken);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-lg space-y-6">
      {/* Identity card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={user.name} email={user.email} />
          <div>
            <p className="font-semibold text-gray-900">{user.name ?? '—'}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                value={user.email}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <div className="flex items-center h-9">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
            <input
              value={user.orgName}
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          {error   && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">Profile updated successfully.</p>}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving || name.trim() === (user.name ?? '')}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Read-only info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-xs text-amber-700">
          Email and role cannot be changed here. Contact your organisation admin to update them.
        </p>
      </div>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab() {
  const { user } = useAuthStore();
  const [members, setMembers]     = useState<OrgUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Invite form state
  const [iEmail, setIEmail]   = useState('');
  const [iName, setIName]     = useState('');
  const [iRole, setIRole]     = useState('viewer');
  const [iSaving, setISaving] = useState(false);
  const [iError, setIError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchOrgUsers();
      setMembers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openInvite() {
    setIEmail(''); setIName(''); setIRole('viewer'); setIError(null);
    setInviteOpen(true);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!iEmail.trim()) return;
    setISaving(true);
    setIError(null);
    try {
      const created = await inviteUser({
        email: iEmail.trim(),
        name:  iName.trim() || undefined,
        role:  iRole,
      });
      setMembers((prev) => [...prev, created]);
      setInviteOpen(false);
    } catch (err: any) {
      setIError(err?.response?.data?.message ?? err?.message ?? 'Failed to invite');
    } finally {
      setISaving(false);
    }
  }

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="max-w-lg">
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-10 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Admin access required</p>
          <p className="text-xs text-gray-500 mt-1">Only admins can view and manage team members.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {!loading && `${members.length} member${members.length !== 1 ? 's' : ''} in your organisation`}
        </p>
        <button
          onClick={openInvite}
          className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Invite User
        </button>
      </div>

      {/* Invite modal */}
      <Modal title="Invite User" open={inviteOpen} onClose={() => setInviteOpen(false)}>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={iEmail}
              onChange={(e) => setIEmail(e.target.value)}
              required
              placeholder="colleague@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-gray-400">(optional)</span></label>
            <input
              value={iName}
              onChange={(e) => setIName(e.target.value)}
              placeholder="Full name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={iRole}
              onChange={(e) => setIRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="viewer">Viewer — read-only access</option>
              <option value="manager">Manager — can create &amp; edit</option>
              <option value="admin">Admin — full access</option>
            </select>
          </div>
          {iError && <p className="text-xs text-red-600">{iError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setInviteOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={iSaving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {iSaving ? 'Inviting…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Members table */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded-lg" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-12 text-center text-sm text-gray-400">
          No team members yet. Invite someone to get started.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} email={m.email} />
                      <div>
                        <p className="font-medium text-gray-900">{m.name ?? <span className="text-gray-400 italic">No name</span>}</p>
                        <p className="text-xs text-gray-500">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                  <td className="px-4 py-3">
                    {m.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                        Invited
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'team';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'team',    label: 'Team' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your profile and organisation team</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-[3px] transition-colors -mb-px ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'profile' && <ProfileTab />}
      {tab === 'team'    && <TeamTab />}
    </div>
  );
}
