import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Environment, Organization } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { currentPeriod, PLANS } from './plans';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // Live usage this calendar month (UTC): messages that are sent or in flight, plus
  // completed verifications. Undeliverable messages and failed verifications are free.
  async usage(orgId: string) {
    const { start, end } = currentPeriod();
    const live = await this.prisma.environment.findUnique({ where: { orgId_type: { orgId, type: 'LIVE' } } });
    if (!live) return { used: 0, start, end };
    const [messages, verifications] = await Promise.all([
      this.prisma.message.count({
        where: { environmentId: live.id, direction: 'OUTBOUND', status: { in: ['QUEUED', 'SENT'] }, createdAt: { gte: start, lt: end } },
      }),
      this.prisma.verification.count({ where: { environmentId: live.id, status: 'VERIFIED', verifiedAt: { gte: start, lt: end } } }),
    ]);
    return { used: messages + verifications, messages, verifications, start, end };
  }

  async assertWithinQuota(environment: Environment & { org?: Organization }) {
    if (environment.type !== 'LIVE') return;
    const org = environment.org ?? (await this.prisma.organization.findUniqueOrThrow({ where: { id: environment.orgId } }));
    const plan = PLANS[org.plan];
    if (plan.monthlyQuota === null) return;
    const { used } = await this.usage(org.id);
    if (used >= plan.monthlyQuota) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          code: 'quota_exceeded',
          message: `Monthly quota of ${plan.monthlyQuota.toLocaleString('en-US')} on the ${plan.name} plan is used up. Upgrade your plan in the portal.`,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  async overview(org: Organization) {
    const usage = await this.usage(org.id);
    return {
      plan: org.plan,
      usage: { ...usage, quota: PLANS[org.plan].monthlyQuota },
      plans: Object.entries(PLANS).map(([id, plan]) => ({ id, ...plan })),
    };
  }
}
