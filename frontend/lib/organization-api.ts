import api from './api';

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  plan?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchOrganizations(): Promise<Organization[]> {
  const { data } = await api.get<Organization[]>('/organize');
  return data;
}

export async function createOrganization(payload: Partial<Organization>): Promise<Organization> {
  const { data } = await api.post<Organization>('/organize', payload);
  return data;
}

export async function updateOrganization(id: string, payload: Partial<Organization>): Promise<Organization> {
  const { data } = await api.patch<Organization>(`/organize/${id}`, payload);
  return data;
}

export async function deleteOrganization(id: string): Promise<void> {
  await api.delete(`/organize/${id}`);
}

export interface OrgMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export async function fetchOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { data } = await api.get<OrgMember[]>(`/organize/${orgId}/users`);
  return data;
}
