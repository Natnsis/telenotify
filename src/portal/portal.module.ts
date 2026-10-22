import { SmsFallbackModule } from '../sms-fallback/sms-fallback.module';
import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { MessagesModule } from '../messages/messages.module';
import { TelegramModule } from '../telegram/telegram.module';
import { VerificationsModule } from '../verifications/verifications.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [TelegramModule, CustomersModule, MessagesModule, VerificationsModule, SmsFallbackModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
