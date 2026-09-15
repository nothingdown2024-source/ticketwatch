import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from './auth.types.js';
import { AuthService } from './auth.service.js';

export const SESSION_COOKIE = 'ticketwatch_session';

function readToken(request: Request): string | undefined {
  const cookie = (request.cookies as Record<string, unknown> | undefined)?.[SESSION_COOKIE];
  if (typeof cookie === 'string') return cookie;
  const authorization = request.header('authorization');
  return authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
}

@Injectable()
export class SessionGuard implements CanActivate {
  public constructor(private readonly auth: AuthService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = await this.auth.authenticate(readToken(request));
    if (user === null) throw new UnauthorizedException('Authentication is required.');
    request.user = user;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.user === undefined) throw new UnauthorizedException();
    return request.user;
  },
);

export { readToken };
