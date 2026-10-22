import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleService } from './google.service';

@Module({
  imports: [TelegramModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleService],
  exports: [AuthService],
})
export class AuthModule {}
