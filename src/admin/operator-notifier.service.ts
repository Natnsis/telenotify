import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { TelegramService } from '../telegram/telegram.service';
import { operatorEmails } from './operators';

// Tells the people running the service that something needs a look: by email to
// OPERATOR_EMAILS and, when OPERATOR_TELEGRAM_CHAT_ID is set, through the sandbox bot
// (the operator must have pressed Start on it once). Never throws.
@Injectable()
export class OperatorNotifier {
  private readonly logger = new Logger(OperatorNotifier.name);

  constructor(
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly telegram: TelegramService,
  ) {}

  async notify(subject: string, text: string): Promise<void> {
    const link = `${this.config.get<string>('PORTAL_URL', '').replace(/\/$/, '')}/admin`;
    const body = `${text}\n\nReview: ${link}`;
    for (const email of operatorEmails(this.config)) {
      await this.mail.send(email, `[Telenotify admin] ${subject}`, body);
    }
    const chatId = this.config.get<string>('OPERATOR_TELEGRAM_CHAT_ID');
    if (!chatId) return;
    try {
      await this.telegram.sandboxClient().sendMessage(chatId, `🛡️ ${subject}\n\n${body}`);
    } catch (error) {
      this.logger.warn(`Operator Telegram alert failed: ${(error as Error).message}`);
    }
  }
}
