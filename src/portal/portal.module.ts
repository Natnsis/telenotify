import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { MessagesModule } from '../messages/messages.module';
import { TelegramModule } from '../telegram/telegram.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [TelegramModule, CustomersModule, MessagesModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
