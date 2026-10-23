import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

// Fail in seconds rather than nodemailer's default of minutes, so a blocked or
// unreachable SMTP server never leaves a request hanging.
const TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };

// Sends through SMTP_URL when set; otherwise logs the email (development).
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport?: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const smtpUrl = config.get<string>('SMTP_URL');
    this.transport = smtpUrl ? createTransport(smtpOptions(smtpUrl)) : undefined;
    this.from = config.get('MAIL_FROM', 'Telenotify <no-reply@telenotify.local>');
  }

  /** Never throws: a failed email is logged and reported as false. */
  async send(to: string, subject: string, text: string): Promise<boolean> {
    if (!this.transport) {
      this.logger.log(`Email to ${to} | ${subject}\n${text}`);
      return true;
    }
    try {
      await this.transport.sendMail({ from: this.from, to, subject, text });
      return true;
    } catch (error) {
      this.logger.error(`Email "${subject}" to ${to} failed: ${(error as Error).message}`);
      return false;
    }
  }
}

// smtp://user:pass@host:587 or smtps://user:pass@host:465 → nodemailer options.
export function smtpOptions(url: string) {
  const parsed = new URL(url);
  const secure = parsed.protocol === 'smtps:';
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || (secure ? 465 : 587),
    secure,
    auth: parsed.username ? { user: decodeURIComponent(parsed.username), pass: decodeURIComponent(parsed.password) } : undefined,
    ...TIMEOUTS,
  };
}
