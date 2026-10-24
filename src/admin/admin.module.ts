import { Global, Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OperatorNotifier } from './operator-notifier.service';

@Global()
@Module({
  imports: [TelegramModule],
  controllers: [AdminController],
  providers: [AdminService, OperatorNotifier],
  exports: [AdminService],
})
export class AdminModule {}
