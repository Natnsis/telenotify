import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { TelegramModule } from '../telegram/telegram.module';
import { PublicVerificationsController } from './public-verifications.controller';
import { VerificationsController } from './verifications.controller';
import { VerificationsService } from './verifications.service';

@Module({
  imports: [TelegramModule, CustomersModule],
  controllers: [VerificationsController, PublicVerificationsController],
  providers: [VerificationsService],
  exports: [VerificationsService],
})
export class VerificationsModule {}
