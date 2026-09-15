import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser, SessionGuard } from '../auth/session.js';

@ApiTags('users')
@Controller('users')
@UseGuards(SessionGuard)
export class UserController {
  @Get('me')
  public me(@CurrentUser() user: AuthenticatedUser): { data: AuthenticatedUser } {
    return { data: user };
  }
}
