import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const PHONE = /^\+?[0-9 ()-]{9,20}$/;

export class CreateLinkDto {
  @ApiProperty({ description: 'Your own ID for this customer', example: 'user_789' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  externalId!: string;

  @ApiPropertyOptional({ description: 'Lets a live customer link by sharing their phone with your bot', example: '0911223344' })
  @IsOptional()
  @Matches(PHONE)
  phone?: string;
}

export class UpsertCustomerDto {
  @ApiPropertyOptional({ example: '+251911223344' })
  @IsOptional()
  @Matches(PHONE)
  phone?: string;

  @ApiPropertyOptional({ description: 'Preferred language for templates', enum: ['en', 'am', 'om', 'ti'] })
  @IsOptional()
  @IsIn(['en', 'am', 'om', 'ti'])
  locale?: string;
}
