import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateVerificationDto {
  @ApiPropertyOptional({ description: 'Your id for this person. Once verified, they are also linked for Telegram notifications.', example: 'customer_123' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalId?: string;

  @ApiPropertyOptional({ description: 'If set, verification fails unless the shared Telegram number matches.', example: '0911223344' })
  @IsOptional()
  @Matches(/^\+?[0-9 ()-]{9,20}$/)
  phone?: string;

  @ApiPropertyOptional({ description: 'Minutes until the link expires (1-60).', example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  expiresInMinutes?: number;
}
