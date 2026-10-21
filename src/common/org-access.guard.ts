import { BadRequestException, CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Use after SessionGuard on routes with :orgId and optionally :env (sandbox|live).
// Hides organizations the user is not a member of (404, not 403).
@Injectable()
export class OrgAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { orgId, env } = request.params as { orgId?: string; env?: string };
    if (!orgId) return true;
    const membership = await this.prisma.membership.findUnique({
      where: { userId_orgId: { userId: request.user.id, orgId } },
      include: { org: true },
    });
    if (!membership) throw new NotFoundException('Organization not found');
    request.membership = membership;
    if (env !== undefined) {
      const type = parseEnvironmentType(env);
      request.environment = await this.prisma.environment.findUniqueOrThrow({
        where: { orgId_type: { orgId, type } },
        include: { org: true },
      });
    }
    return true;
  }
}

export function parseEnvironmentType(value: string): EnvironmentType {
  if (value === 'sandbox') return 'SANDBOX';
  if (value === 'live') return 'LIVE';
  throw new BadRequestException('env must be "sandbox" or "live"');
}
