import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { ScreenerService } from './screener.service';
import { ScreenerFiltersDto } from './dto/screener-filters.dto';
import { CreatePresetDto } from './dto/create-preset.dto';

@Controller('screener')
@UseGuards(JwtAuthGuard)
export class ScreenerController {
  constructor(private readonly screener: ScreenerService) {}

  @Get('results')
  async getResults(@Query() filters: ScreenerFiltersDto) {
    const [results, meta] = await Promise.all([
      this.screener.runScreener(filters),
      this.screener.getSnapshotAge(),
    ]);
    return { results, meta };
  }

  @Get('presets')
  listPresets(@CurrentUser() user: JwtPayload) {
    return this.screener.listPresets(user.sub);
  }

  @Post('presets')
  createPreset(@CurrentUser() user: JwtPayload, @Body() dto: CreatePresetDto) {
    return this.screener.createPreset(user.sub, user.orgId, dto);
  }

  @Delete('presets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePreset(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.screener.deletePreset(user.sub, id);
  }
}
