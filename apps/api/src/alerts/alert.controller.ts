import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser, SessionGuard } from '../auth/session.js';
import { AlertService } from './alert.service.js';
import { CreateAlertDto, UpdateAliasesDto } from './dto.js';

@ApiTags('alerts')
@Controller('alerts')
@UseGuards(SessionGuard)
export class AlertController {
  public constructor(private readonly alerts: AlertService) {}

  @Get()
  public async list(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.alerts.list(user) };
  }

  @Post()
  public async create(@Body() input: CreateAlertDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.alerts.create(input, user) };
  }

  @Get(':id')
  public async detail(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.alerts.detail(id, user) };
  }

  @Get(':id/history')
  public async history(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const alert = await this.alerts.detail(id, user);
    return { data: { scans: alert.source.scans, events: alert.availabilityEvents } };
  }

  @Post(':id/pause')
  public async pause(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.alerts.setPaused(id, user, true) };
  }

  @Post(':id/resume')
  public async resume(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.alerts.setPaused(id, user, false) };
  }

  @Patch(':id/aliases')
  public async aliases(
    @Param('id') id: string,
    @Body() input: UpdateAliasesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.alerts.updateAliases(id, user, input.aliases) };
  }

  @Delete(':id')
  public async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.alerts.softDelete(id, user);
    return { data: { deleted: true } };
  }
}
