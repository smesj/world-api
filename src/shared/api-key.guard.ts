import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

// Minimal shared-secret protection for mutating endpoints that don't have a
// real user/auth model behind them (world-api has no authentication
// middleware at all yet — see "Authentication" in .claude-context.md).
// Deliberately fails closed: if ADMIN_API_KEY isn't set on the server, every
// guarded request is rejected rather than silently left open. Apply with
// @UseGuards(ApiKeyGuard) on individual routes or a whole controller; reads
// (GET) generally shouldn't be guarded since public dashboards depend on
// them staying open.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.header('x-api-key');
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey) {
      throw new UnauthorizedException(
        'This endpoint requires ADMIN_API_KEY to be configured on the server',
      );
    }
    if (!providedKey || providedKey !== expectedKey) {
      throw new UnauthorizedException('Missing or invalid X-Api-Key header');
    }
    return true;
  }
}
