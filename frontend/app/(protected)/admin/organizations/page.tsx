'use client';
import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import OrganizationForm from '@/components/admin/OrganizationForm';
import { fetchOrganizations, createOrganization, updateOrganization, deleteOrganization } from '@/lib/organization-api';
import { useAuthStore } from '@/stores/auth.store';
import { inviteUser } from '@/lib/users-api';

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<any | null>(null);
  const [iEmail, setIEmail] = useState('');
  const [iName, setIName] = useState('');
  const [iRole, setIRole] = useState('viewer');
  const [iSaving, setISaving] = useState(false);

  const { user } = useAuthStore();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage organizations (superadmin only)</p>
        </div>
        <div>
          <button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="px-3 py-2 bg-blue-600 text-white rounded">New Organization</button>
        </div>
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
                  <td className="px-4 py-3 text-gray-700">{o.slug}</td>
                  <td className="px-4 py-3 text-gray-700">{o.plan}</td>
                  <td className="px-4 py-3">{o.isActive ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditTarget(o); setModalOpen(true); }} className="text-xs mr-3 text-blue-600">Edit</button>
                    {user?.role === 'superadmin' && (
                      <button onClick={() => { setInviteTarget(o); setIEmail(''); setIName(''); setIRole('viewer'); setInviteOpen(true); }} className="text-xs mr-3 text-green-600">Invite</button>
                    )}
                    <button onClick={async () => { if (!confirm('Delete organization? This will remove all users.')) return; await deleteOrganization(o.id); setOrgs((p) => p.filter(x => x.id !== o.id)); }} className="text-xs text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title={editTarget ? 'Edit Organization' : 'New Organization'} open={modalOpen} onClose={() => setModalOpen(false)}>
        <OrganizationForm
          initial={editTarget ?? {}}
          onCancel={() => setModalOpen(false)}
          onSubmit={async (payload) => {
            if (editTarget) {
              const updated = await updateOrganization(editTarget.id, payload);
              setOrgs((p) => p.map((x) => x.id === updated.id ? updated : x));
            } else {
              const created = await createOrganization(payload);
              setOrgs((p) => [...p, created]);
            }
            setModalOpen(false);
          }}
          submitLabel={editTarget ? 'Save' : 'Create'}
        />
      </Modal>

      <Modal title={inviteTarget ? `Invite to ${inviteTarget.name}` : 'Invite User'} open={inviteOpen} onClose={() => setInviteOpen(false)}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!inviteTarget) return;
          setISaving(true);
          try {
            await inviteUser({ email: iEmail.trim(), name: iName.trim() || undefined, role: iRole, orgId: inviteTarget.id });
            setInviteOpen(false);
          } catch (err) {
            // ignore for now, could show error
            console.error(err);
          } finally { setISaving(false); }
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" value={iEmail} onChange={(e) => setIEmail(e.target.value)} required placeholder="user@example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={iName} onChange={(e) => setIName(e.target.value)} placeholder="Full name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={iRole} onChange={(e) => setIRole(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="viewer">Viewer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setInviteOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Cancel</button>
            <button type="submit" disabled={iSaving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">{iSaving ? 'Inviting…' : 'Invite'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
