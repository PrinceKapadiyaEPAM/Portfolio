import api from './api';
import type { AuthUser } from '@/stores/auth.store';

export interface OrgUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<{ data: AuthUser }>('/users/me');
  return data.data;
}

export async function updateMe(payload: { name: string }): Promise<AuthUser> {
  const { data } = await api.patch<{ data: AuthUser }>('/users/me', payload);
  return data.data;
}

export async function fetchOrgUsers(): Promise<OrgUser[]> {
  const { data } = await api.get<{ data: OrgUser[] }>('/users');
  return data.data;
}

export async function inviteUser(payload: {
  email: string;
  name?: string;
  role: string;
  orgId?: string;
}): Promise<OrgUser> {
  const { data } = await api.post<{ data: OrgUser }>('/users/invite', payload);
  return data.data;
}
