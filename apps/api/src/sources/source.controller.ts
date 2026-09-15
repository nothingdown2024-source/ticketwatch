import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser, SessionGuard } from '../auth/session.js';
import { PreviewSourceDto } from './dto.js';
import { SourceService } from './source.service.js';

@ApiTags('sources')
@Controller('sources')
@UseGuards(SessionGuard)
export class SourceController {
  public constructor(private readonly sources: SourceService) {}

  @Post('preview')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  public async preview(@Body() input: PreviewSourceDto) {
    return { data: await this.sources.preview(input.url) };
  }

  @Post('demo/fixture')
  public async setFixture(
    @Body() input: { sourceId: string; fixtureState: 'state-1' | 'state-2' },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (process.env.NODE_ENV === 'production') return { data: { available: false } };
    await this.sources.setDemoFixture(input.sourceId, user.id, input.fixtureState);
    return { data: { available: true } };
  }
}
