import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export enum AlertMatchModeDto {
  EXACT = 'EXACT',
  CONTAINS = 'CONTAINS',
  ALIASES = 'ALIASES',
  FUZZY = 'FUZZY',
}

export enum AlertChannelDto {
  CONSOLE = 'CONSOLE',
  WHATSAPP = 'WHATSAPP',
}

export class CreateAlertDto {
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  public sourceUrl!: string;

  @IsString()
  @Length(2, 255)
  public query!: string;

  @IsEnum(AlertMatchModeDto)
  public matchMode!: AlertMatchModeDto;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  public aliases: string[] = [];

  @IsEnum(AlertChannelDto)
  public notificationChannel: AlertChannelDto = AlertChannelDto.CONSOLE;

  @IsOptional()
  @Type(() => Number)
  @Min(0.75)
  public fuzzyThreshold?: number;
}

export class UpdateAliasesDto {
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  public aliases!: string[];
}
