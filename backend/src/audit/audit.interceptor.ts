import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { Request } from 'express';

const METHOD_ACTION_MAP: Record<string, 'CREATE' | 'UPDATE' | 'DELETE'> = {
  POST:   'CREATE',
  PATCH:  'UPDATE',
  PUT:    'UPDATE',
  DELETE: 'DELETE',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req   = ctx.switchToHttp().getRequest<Request>();
    const action = METHOD_ACTION_MAP[req.method];
    if (!action) return next.handle();

    const user   = (req as any).user;
    const orgId  = (req as any).orgId as string | undefined;
    if (!user || !orgId) return next.handle();

    const rawParams = Object.fromEntries(
      Object.entries(req.params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
    );
    const [entity, entityId] = this.parseRoute(req.route?.path ?? req.path, rawParams);

    return next.handle().pipe(
      tap(() => {
        this.audit.log({
          orgId,
          userId:   user.sub,
          action,
          entity,
          entityId,
          payload:  action !== 'DELETE' ? req.body : undefined,
        }).catch(() => { /* fire-and-forget — never break the request */ });
      }),
    );
  }

  private parseRoute(routePath: string, params: Record<string, string>): [string, string | undefined] {
    const segments = routePath.replace(/^\/api\//, '').split('/');
    const entity   = segments[0] ?? 'unknown';
    const idParam  = Object.values(params ?? {})[0];
    return [entity, idParam];
  }
}
