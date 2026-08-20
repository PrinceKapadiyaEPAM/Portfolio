import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  orgId:    string;
  userId:   string;
  action:   'CREATE' | 'UPDATE' | 'DELETE';
  entity:   string;
  entityId?: string;
  payload?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        orgId:    entry.orgId,
        userId:   entry.userId,
        action:   entry.action,
        entity:   entry.entity,
        entityId: entry.entityId ?? null,
        payload:  entry.payload != null ? (entry.payload as any) : undefined,
      },
    });
  }
}
