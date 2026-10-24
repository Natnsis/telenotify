import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sha256 } from './crypto';

// Resolves the environment (sandbox or live) from the x-api-key header.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    if (typeof apiKey !== 'string' || !apiKey) {
      throw new UnauthorizedException('Missing x-api-key header');
    }
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash: sha256(apiKey) },
      include: { environment: { include: { org: true } } },
    });
    if (!key || key.revokedAt) {
      throw new UnauthorizedException('Invalid API key');
    }
    if (key.environment.org.status === 'SUSPENDED') {
      throw new ForbiddenException({ statusCode: 403, code: 'org_suspended', message: suspendedMessage(key.environment.org.suspendedReason) });
    }
    request.environment = key.environment;
    request.apiKeyId = key.id;
    // Best effort; not worth failing the request over.
    this.prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    return true;
  }
}

export function suspendedMessage(reason: string | null) {
  return `This organization is suspended${reason ? `: ${reason}` : '.'} Contact Telenotify support if you think this is a mistake.`;
}
