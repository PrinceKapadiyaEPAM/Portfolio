import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req   = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const start     = Date.now();
    const requestId = randomUUID();

    (req as any).requestId = requestId;

    return next.handle().pipe(
      tap(() => {
        const res    = context.switchToHttp().getResponse<Response>();
        const user   = (req as any).user;
        const orgId  = (req as any).orgId as string | undefined;
        this.logger.log(
          JSON.stringify({
            requestId,
            method,
            path:       url,
            statusCode: res.statusCode,
            duration:   Date.now() - start,
            userId:     user?.sub  ?? null,
            orgId:      orgId      ?? null,
          }),
        );
      }),
    );
  }
}
