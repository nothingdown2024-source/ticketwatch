import { IsString, IsUrl, MaxLength } from 'class-validator';

export class PreviewSourceDto {
  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  public url!: string;
}
