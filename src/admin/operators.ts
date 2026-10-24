import { ConfigService } from '@nestjs/config';

/** Operators run the hosted service: OPERATOR_EMAILS is a comma-separated list. */
export function operatorEmails(config: ConfigService): string[] {
  return (config.get<string>('OPERATOR_EMAILS') ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isOperator(config: ConfigService, email: string): boolean {
  return operatorEmails(config).includes(email.toLowerCase());
}
