import { IsArray, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { InlineButton } from '../telegram/telegram-api.client';

export class CreateOrgDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}

export class UpdateEnvironmentDto {
  // null clears it.
  @ValidateIf((o) => o.eventWebhookUrl !== null)
  @IsString()
  @MaxLength(2048)
  eventWebhookUrl!: string | null;
}

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;
}

export class ConnectBotDto {
  @IsString()
  @IsNotEmpty()
  botToken!: string;
}

export class PlaygroundLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalId?: string;
}

export class PlaygroundSendDto {
  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  text!: string;

  @IsOptional()
  @IsArray()
  buttons?: InlineButton[][];
}

export class PlaygroundVerifyDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalId?: string;

  @IsOptional()
  @Matches(/^(\+?[0-9 ()-]{9,20})?$/)
  phone?: string;
}

export class CustomerMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  text!: string;
}
