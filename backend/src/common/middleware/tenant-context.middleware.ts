import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const payload = this.jwtService.decode(auth.slice(7)) as any;
        if (payload?.orgId) {
          (req as any).orgId = payload.orgId;
        }
      } catch {
        // non-fatal — guard will reject unauthenticated requests
      }
    }
    next();
  }
}
