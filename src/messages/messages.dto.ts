import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { InlineButton } from '../telegram/telegram-api.client';

export class SendMessageDto {
  @ApiProperty({ description: 'Customer externalId', example: 'user_789' })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ example: 'Your order #55 is out for delivery 🚚' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  text!: string;

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
}
