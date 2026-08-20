import { Controller, Get, Post, Patch, Put, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { TradeSetupService } from './trade-setup.service';
import { CreateTradeSetupDto } from './dto/create-trade-setup.dto';
import { UpdateTradeSetupDto } from './dto/update-trade-setup.dto';
import { SaveLevelsDto } from './dto/save-levels.dto';
import { SaveTargetsDto } from './dto/save-targets.dto';
import { UpdateLevelDto } from './dto/update-level.dto';

@Controller('trades')
@UseGuards(JwtAuthGuard)
export class TradeSetupController {
  constructor(private readonly tradeSetupService: TradeSetupService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTradeSetupDto) {
    return this.tradeSetupService.create(user.sub, user.orgId, dto);
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('symbol') symbol?: string,
    @Query('tags') tags?: string | string[],
  ) {
    const tagsArr = tags ? (Array.isArray(tags) ? tags : [tags]) : undefined;
    return this.tradeSetupService.listAll(user.sub, { status, symbol, tags: tagsArr });
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tradeSetupService.getOne(user.sub, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateTradeSetupDto) {
    return this.tradeSetupService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tradeSetupService.delete(user.sub, id);
  }

  @Put(':id/levels')
  saveLevels(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: SaveLevelsDto) {
    return this.tradeSetupService.saveLevels(user.sub, id, dto);
  }

  @Put(':id/targets')
  saveTargets(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: SaveTargetsDto) {
    return this.tradeSetupService.saveTargets(user.sub, id, dto);
  }

  @Patch(':id/levels/:levelId')
  updateLevel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('levelId') levelId: string,
    @Body() dto: UpdateLevelDto,
  ) {
    return this.tradeSetupService.updateLevel(user.sub, id, levelId, dto);
  }
}
