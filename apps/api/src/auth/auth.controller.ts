import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './auth.types.js';
import { LoginDto, RegisterDto } from './dto.js';
import { CurrentUser, readToken, SESSION_COOKIE, SessionGuard } from './session.js';

function writeSession(response: Response, token: string, expiresAt: Date): void {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  public constructor(private readonly auth: AuthService) {}

  @Post('register')
  public async register(
    @Body() input: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.register(input);
    writeSession(response, session.token, session.expiresAt);
    return { data: { user: session.user } };
  }

  @Post('login')
  public async login(@Body() input: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(input);
    writeSession(response, session.token, session.expiresAt);
    return { data: { user: session.user } };
  }

  @Post('logout')
  public async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(readToken(request));
    response.clearCookie(SESSION_COOKIE, { path: '/' });
    return { data: { loggedOut: true } };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  public me(@CurrentUser() user: AuthenticatedUser) {
    return { data: { user } };
  }
}
