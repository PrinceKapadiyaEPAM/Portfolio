import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LivePriceService } from '../market/live-price.service';
import { AddWatchlistItemDto } from './dto/add-watchlist-item.dto';

@Injectable()
export class WatchlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly livePrice: LivePriceService,
  ) {}

  async getOrCreate(userId: string, orgId: string) {
    // Return the user's first watchlist or create a default one
    let watchlist = await this.prisma.watchlist.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { items: { orderBy: { addedAt: 'asc' } } },
    });
    if (!watchlist) {
      watchlist = await this.prisma.watchlist.create({
        data: { userId, orgId, name: 'Default' },
        include: { items: { orderBy: { addedAt: 'asc' } } },
      });
    }
    return watchlist;
  }

  async getWithPrices(userId: string, orgId: string) {
    // Return all watchlists for the user with enriched price info
    const lists = await this.prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { items: { orderBy: { addedAt: 'asc' } } },
    });

    // Collect all symbols across lists
    const allSymbols = Array.from(new Set(lists.flatMap((l) => l.items.map((i) => i.symbol))));
    const quotes = await this.livePrice.getQuotes(allSymbols);

    return lists.map((watchlist) => {
      const enriched = watchlist.items.map((item) => {
        const quote = quotes.get(item.symbol) ?? null;
        return {
          id:        item.id,
          symbol:    item.symbol,
          notes:     item.notes,
          addedAt:   item.addedAt,
          ltp:       quote?.ltp       ?? null,
          change:    quote?.change    ?? null,
          changePct: quote?.changePct ?? null,
        };
      });
      return { id: watchlist.id, name: watchlist.name, items: enriched };
    });
  }

  async getWatchlistWithPricesById(userId: string, watchlistId: string) {
    const watchlist = await this.prisma.watchlist.findUnique({
      where: { id: watchlistId },
      include: { items: { orderBy: { addedAt: 'asc' } } },
    });
    if (!watchlist || watchlist.userId !== userId) throw new NotFoundException('watchlist not found');

    const quotes = await this.livePrice.getQuotes(watchlist.items.map((i) => i.symbol));
    const enriched = watchlist.items.map((item) => {
      const quote = quotes.get(item.symbol) ?? null;
      return {
        id:        item.id,
        symbol:    item.symbol,
        notes:     item.notes,
        addedAt:   item.addedAt,
        ltp:       quote?.ltp       ?? null,
        change:    quote?.change    ?? null,
        changePct: quote?.changePct ?? null,
      };
    });
    return { id: watchlist.id, name: watchlist.name, items: enriched };
  }

  async list(userId: string) {
    const lists = await this.prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { items: { orderBy: { addedAt: 'asc' } } },
    });
    return lists.map((l) => ({ id: l.id, name: l.name, items: l.items }));
  }

  async createWatchlist(userId: string, orgId: string, name: string) {
    try {
      return await this.prisma.watchlist.create({ data: { userId, orgId, name } });
    } catch (err) {
      if ((err as any)?.code === 'P2002') throw new ConflictException('watchlist name already exists');
      throw err;
    }
  }

  async renameWatchlist(userId: string, watchlistId: string, name: string) {
    const wl = await this.prisma.watchlist.findUnique({ where: { id: watchlistId } });
    if (!wl || wl.userId !== userId) throw new NotFoundException('watchlist not found');
    try {
      return await this.prisma.watchlist.update({ where: { id: watchlistId }, data: { name } });
    } catch (err) {
      if ((err as any)?.code === 'P2002') throw new ConflictException('watchlist name already exists');
      throw err;
    }
  }

  async deleteWatchlist(userId: string, watchlistId: string) {
    const wl = await this.prisma.watchlist.findUnique({ where: { id: watchlistId } });
    if (!wl || wl.userId !== userId) throw new NotFoundException('watchlist not found');
    await this.prisma.watchlist.delete({ where: { id: watchlistId } });
  }

  async addItem(userId: string, orgId: string, dto: AddWatchlistItemDto) {
    // Determine target watchlist
    let watchlist;
    if (dto.watchlistId) {
      watchlist = await this.prisma.watchlist.findUnique({ where: { id: dto.watchlistId } });
      if (!watchlist || watchlist.userId !== userId) throw new NotFoundException('watchlist not found');
    } else {
      watchlist = await this.getOrCreate(userId, orgId);
    }

    const existing = await this.prisma.watchlistItem.findUnique({
      where: { watchlistId_symbol: { watchlistId: watchlist.id, symbol: dto.symbol } },
    });
    if (existing) throw new ConflictException(`${dto.symbol} is already in your watchlist`);

    return this.prisma.watchlistItem.create({
      data: { watchlistId: watchlist.id, symbol: dto.symbol, notes: dto.notes },
    });
  }

  async removeItem(userId: string, orgId: string, symbol: string, watchlistId?: string) {
    let watchlist;
    if (watchlistId) {
      watchlist = await this.prisma.watchlist.findUnique({ where: { id: watchlistId } });
      if (!watchlist || watchlist.userId !== userId) throw new NotFoundException('watchlist not found');
    } else {
      watchlist = await this.getOrCreate(userId, orgId);
    }

    const item = await this.prisma.watchlistItem.findUnique({
      where: { watchlistId_symbol: { watchlistId: watchlist.id, symbol: symbol.toUpperCase() } },
    });
    if (!item) throw new NotFoundException(`${symbol} not found in watchlist`);

    await this.prisma.watchlistItem.delete({ where: { id: item.id } });
  }
}
