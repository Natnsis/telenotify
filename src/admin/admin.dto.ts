import { Plan } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class SuspendOrgDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class SetPlanDto {
  @IsEnum(Plan)
  plan!: Plan;
}

export class LiveReviewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  useCase!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'Website must be a full address, e.g. https://example.com' })
  @MaxLength(300)
  website?: string;
}
