import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(320)
  public email!: string;

  @IsString()
  @Length(2, 120)
  public displayName!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  public password!: string;
}

export class LoginDto {
  @IsEmail()
  @MaxLength(320)
  public email!: string;

  @IsString()
  @MaxLength(128)
  public password!: string;
}
