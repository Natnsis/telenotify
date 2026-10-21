import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { sha256 } from './crypto';

export const SESSION_COOKIE = 'tn_session';
const ALLOW_UNVERIFIED = 'allowUnverified';

// Lets a route be used before the user has verified their email (e.g. /auth/me).
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED, true);

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || !token) throw new UnauthorizedException();
    const session = await this.prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) throw new UnauthorizedException();
    const allowUnverified = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED, [context.getHandler(), context.getClass()]);
    if (!session.user.emailVerifiedAt && !allowUnverified) {
      throw new ForbiddenException({ message: 'Verify your email first', code: 'email_not_verified' });
    }
    request.user = session.user;
    return true;
  }
}
