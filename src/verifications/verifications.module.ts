import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { TelegramModule } from '../telegram/telegram.module';
import { VerificationsController } from './verifications.controller';
import { VerificationsService } from './verifications.service';

@Module({
  imports: [TelegramModule, CustomersModule],
  controllers: [VerificationsController],
  providers: [VerificationsService],
  exports: [VerificationsService],
})
export class VerificationsModule {}
