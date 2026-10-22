import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { InlineButton } from '../telegram/telegram-api.client';

export class SendMessageDto {
  @ApiProperty({ description: 'Customer externalId', example: 'user_789' })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiPropertyOptional({ description: 'The message. Send either text or a template.', example: 'Your order #55 is out for delivery 🚚' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  text?: string;

  @ApiPropertyOptional({ description: 'Template key (create templates in the portal). Send either text or a template.', example: 'payment_received' })
  @IsOptional()
  @Matches(/^[a-z0-9][a-z0-9_]{1,59}$/)
  template?: string;

  @ApiPropertyOptional({ description: 'Values for the template placeholders', example: { amount: '1,250', payer: 'Abebe' } })
  @IsOptional()
  @IsObject()
  params?: Record<string, string | number>;

  @ApiPropertyOptional({ description: "Template language. Defaults to the customer's language, then the template's default.", enum: ['en', 'am', 'om', 'ti'] })
  @IsOptional()
  @IsIn(['en', 'am', 'om', 'ti'])
  locale?: string;

  @ApiPropertyOptional({
    description: 'Rows of URL buttons shown under the message',
    example: [[{ text: 'Track order', url: 'https://shop.example.com/orders/55' }]],
  })
  @IsOptional()
  @IsArray()
  buttons?: InlineButton[][];

  @ApiPropertyOptional({ description: 'Repeat requests with the same key return the original message', example: 'order-55-shipped' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @ApiPropertyOptional({
    description: 'Use "high" for OTPs and payment/transaction alerts: they are sent ahead of normal messages.',
    enum: ['normal', 'high'],
    default: 'normal',
  })
  @IsOptional()
  @IsIn(['normal', 'high'])
  priority?: 'normal' | 'high';

  @ApiPropertyOptional({
    description: 'Set false to skip SMS fallback for this message, e.g. when you send your own. Only applies when SMS fallback is on.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  fallback?: boolean;
}
