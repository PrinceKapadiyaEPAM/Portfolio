import { Controller, Get, Post, Delete, Patch, Param, Body, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { WatchlistService } from './watchlist.service';
import { AddWatchlistItemDto } from './dto/add-watchlist-item.dto';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { UpdateWatchlistDto } from './dto/update-watchlist.dto';

@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload, @Query('noPrices') noPrices?: string) {
    const noop = (noPrices ?? '').toLowerCase();
    if (noop === '1' || noop === 'true') return this.watchlist.list(user.sub);
    return this.watchlist.getWithPrices(user.sub, user.orgId);
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.watchlist.getWatchlistWithPricesById(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateWatchlistDto) {
    return this.watchlist.createWatchlist(user.sub, user.orgId, dto.name);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateWatchlistDto) {
    return this.watchlist.renameWatchlist(user.sub, id, dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.watchlist.deleteWatchlist(user.sub, id);
  }

  @Post(':id/items')
  addItem(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: AddWatchlistItemDto) {
    // ensure target watchlist id is used
    dto.watchlistId = id;
    return this.watchlist.addItem(user.sub, user.orgId, dto);
  }

  @Delete(':id/items/:symbol')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('symbol') symbol: string) {
    return this.watchlist.removeItem(user.sub, user.orgId, symbol, id);
  }
}
