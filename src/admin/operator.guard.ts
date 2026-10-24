import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { isOperator } from './operators';

// Runs after SessionGuard: only users listed in OPERATOR_EMAILS get through.
@Injectable()
export class OperatorGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as User | undefined;
    if (!user || !isOperator(this.config, user.email)) throw new ForbiddenException('Operators only');
    return true;
  }
}
