'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import OrganizationForm from '@/components/admin/OrganizationForm';
import {
  fetchOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  fetchOrgMembers,
} from '@/lib/organization-api';
import type { OrgMember } from '@/lib/organization-api';
import { inviteUser } from '@/lib/users-api';
import { useAuthStore } from '@/stores/auth.store';

const ROLE_BADGE: Record<string, string> = {
  superadmin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin:      'bg-blue-100 text-blue-700 border-blue-200',
  manager:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  viewer:     'bg-gray-100 text-gray-600 border-gray-200',
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_BADGE[role] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {role}
    </span>
  );
}

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Org CRUD modal
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);

  // Users modal
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [usersTarget, setUsersTarget] = useState<any | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Inline invite form inside users modal
  const [showInvite, setShowInvite] = useState(false);
  const [iEmail, setIEmail] = useState('');
  const [iName, setIName] = useState('');
  const [iRole, setIRole] = useState('viewer');
  const [iSaving, setISaving] = useState(false);
  const [iError, setIError] = useState<string | null>(null);
  const [iSuccess, setISuccess] = useState(false);

  // Redirect non-superadmin
  useEffect(() => {
    if (_hasHydrated && user && user.role !== 'superadmin') {
      router.replace('/dashboard');
    }
  }, [_hasHydrated, user, router]);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchOrganizations();
      setOrgs(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openUsersModal(org: any) {
    setUsersTarget(org);
    setMembers([]);
    setMembersError(null);
    setShowInvite(false);
    setIEmail(''); setIName(''); setIRole('viewer');
    setIError(null); setISuccess(false);
    setUsersModalOpen(true);
    setMembersLoading(true);
    try {
      const data = await fetchOrgMembers(org.id);
      setMembers(data);
    } catch (err: any) {
      setMembersError(err?.response?.data?.error?.message ?? err?.message ?? 'Failed to load users');
    } finally {
      setMembersLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!usersTarget) return;
    setISaving(true);
    setIError(null);
    setISuccess(false);
    try {
      await inviteUser({ email: iEmail.trim(), name: iName.trim() || undefined, role: iRole, orgId: usersTarget.id });
      setISuccess(true);
      setIEmail(''); setIName(''); setIRole('viewer');
      setShowInvite(false);
      const data = await fetchOrgMembers(usersTarget.id);
      setMembers(data);
    } catch (err: any) {
      setIError(err?.response?.data?.error?.message ?? err?.message ?? 'Invite failed');
    } finally {
      setISaving(false);
    }
  }

  if (!_hasHydrated || !user) return null;
  if (user.role !== 'superadmin') return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all organizations and their members</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setOrgModalOpen(true); }}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Organization
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No organizations found.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{o.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{o.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${o.plan === 'pro' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {o.plan ?? 'free'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${o.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-xs text-gray-600">{o.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => openUsersModal(o)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View Users
                    </button>
                    <button
                      onClick={() => { setEditTarget(o); setOrgModalOpen(true); }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${o.name}"? This will remove the organization and all its users.`)) return;
                        await deleteOrganization(o.id);
                        setOrgs((p) => p.filter((x) => x.id !== o.id));
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Org Create / Edit Modal */}
      <Modal
        title={editTarget ? 'Edit Organization' : 'New Organization'}
        open={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
      >
        <OrganizationForm
          initial={editTarget ?? {}}
          onCancel={() => setOrgModalOpen(false)}
          onSubmit={async (payload) => {
            if (editTarget) {
              const updated = await updateOrganization(editTarget.id, payload);
              setOrgs((p) => p.map((x) => x.id === updated.id ? updated : x));
            } else {
              const created = await createOrganization(payload);
              setOrgs((p) => [...p, created]);
            }
            setOrgModalOpen(false);
          }}
          submitLabel={editTarget ? 'Save' : 'Create'}
        />
      </Modal>

      {/* Users Modal */}
      <Modal
        title={usersTarget ? `Users — ${usersTarget.name}` : 'Users'}
        open={usersModalOpen}
        onClose={() => { setUsersModalOpen(false); setShowInvite(false); }}
        size="lg"
      >
        <div className="space-y-4">
          {membersLoading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-200 rounded" />)}
            </div>
          ) : membersError ? (
            <p className="text-sm text-red-500 text-center py-4">{membersError}</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No users in this organization yet.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Role</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 text-gray-900">{m.name ?? <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-3 py-2 text-gray-600">{m.email}</td>
                      <td className="px-3 py-2"><RoleBadge role={m.role} /></td>
                      <td className="px-3 py-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${m.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {iSuccess && !showInvite && (
            <p className="text-xs text-green-600 font-medium">User invited successfully.</p>
          )}

          {!showInvite ? (
            <button
              onClick={() => { setShowInvite(true); setISuccess(false); }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Invite User
            </button>
          ) : (
            <form onSubmit={handleInvite} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">Invite to {usersTarget?.name}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={iEmail}
                    onChange={(e) => setIEmail(e.target.value)}
                    required
                    placeholder="user@example.com"
                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input
                    value={iName}
                    onChange={(e) => setIName(e.target.value)}
                    placeholder="Full name"
                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  value={iRole}
                  onChange={(e) => setIRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
                >
                  <option value="viewer">Viewer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {iError && <p className="text-xs text-red-600">{iError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowInvite(false); setIError(null); }}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={iSaving}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {iSaving ? 'Inviting…' : 'Invite'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
