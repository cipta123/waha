import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WahaMessageDto {
  @IsString()
  id!: string;

  @IsString()
  chatId!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  pushName?: string;

  @IsOptional()
  @IsObject()
  raw?: Record<string, unknown>;
}

export class WebhookEventDto {
  @IsString()
  id!: string;

  @IsString()
  event!: string;

  @IsString()
  session!: string;

  timestamp!: number;

  @IsObject()
  payload!: any;

  @IsOptional()
  @IsObject()
  me?: {
    id: string;
    pushName?: string;
    lid?: string;
    jid?: string;
  };

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsObject()
  environment?: any;
}
