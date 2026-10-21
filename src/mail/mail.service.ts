import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

// Sends through SMTP_URL when set; otherwise logs the email (development).
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport?: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const smtpUrl = config.get<string>('SMTP_URL');
    this.transport = smtpUrl ? createTransport(smtpUrl) : undefined;
    this.from = config.get('MAIL_FROM', 'Telenotify <no-reply@telenotify.local>');
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transport) {
      this.logger.log(`Email to ${to} | ${subject}\n${text}`);
      return;
    }
    await this.transport.sendMail({ from: this.from, to, subject, text });
  }
}
