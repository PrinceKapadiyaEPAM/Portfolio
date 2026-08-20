import { SetMetadata } from '@nestjs/common';

export type Role = 'superadmin' | 'admin' | 'manager' | 'viewer';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
