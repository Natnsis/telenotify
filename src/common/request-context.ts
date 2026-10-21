import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Environment, Organization, User } from '@prisma/client';

export type EnvironmentWithOrg = Environment & { org: Organization };

// Set by ApiKeyGuard (public API) or OrgAccessGuard (portal).
export const CurrentEnvironment = createParamDecorator(
  (_data: unknown, context: ExecutionContext): EnvironmentWithOrg => context.switchToHttp().getRequest().environment,
);

// Set by SessionGuard.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => context.switchToHttp().getRequest().user,
);
