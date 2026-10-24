import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min } from 'class-validator';

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

  @ApiPropertyOptional({
    description: 'For the hosted verify page (hostedUrl): where to send the person when done. Gets ?telenotify_verification=<id>&telenotify_token=<signed result>.',
    example: 'https://yourapp.example/verified',
  })
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2000)
  returnUrl?: string;
}

export class PublicVerificationDto {
  @IsString()
  @Matches(/^tn_pk_(test|live)_[A-Za-z0-9]+$/, { message: 'Not a publishable key (tn_pk_test_… or tn_pk_live_…)' })
  publishableKey!: string;

  // The page that opened the verify popup (window.location.origin).
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(300)
  origin?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2000)
  returnUrl?: string;

  @IsOptional()
  @Matches(/^\+?[0-9 ()-]{9,20}$/)
  phone?: string;
}
