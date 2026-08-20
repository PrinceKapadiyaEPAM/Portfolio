import { BadRequestException } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

describe('PortfolioService', () => {
  const prisma = {
    portfolio: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    holding: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    holdingSale: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    tradeTransaction: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const livePrice = {
    getQuotes: jest.fn(),
  };

  const service = new PortfolioService(prisma as any, livePrice as any);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.portfolio.findUnique.mockResolvedValue({ id: 'portfolio-1', userId: 'user-1', orgId: 'org-1' });
    prisma.tradeTransaction.findMany.mockResolvedValue([]);
    prisma.holdingSale.findMany.mockResolvedValue([]);
    prisma.holding.findMany.mockResolvedValue([]);
    prisma.tradeTransaction.count.mockResolvedValue(0);
  });

  it('rejects sell requests that exceed the available holding quantity', async () => {
    prisma.holding.findUnique.mockResolvedValue({
      id: 'holding-1',
      symbol: 'AAPL',
      qty: 10,
      avgBuyPrice: 100,
      portfolio: { userId: 'user-1', orgId: 'org-1' },
    });

    await expect(
      service.sellHolding('user-1', 'holding-1', { qty: 12, price: 110, charges: 0 }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.holdingSale.create).not.toHaveBeenCalled();
    expect(prisma.tradeTransaction.create).not.toHaveBeenCalled();
  });

  it('does not mutate the stored holding quantity when a partial sell is recorded', async () => {
    prisma.holding.findUnique.mockResolvedValue({
      id: 'holding-1',
      symbol: 'AAPL',
      qty: 10,
      avgBuyPrice: 100,
      portfolio: { userId: 'user-1', orgId: 'org-1' },
    });
    prisma.holdingSale.create.mockResolvedValue({ id: 'sale-1', qty: 3, price: 110, charges: 0, pnl: 30 });
    prisma.tradeTransaction.create.mockResolvedValue({});
    prisma.tradeTransaction.count.mockResolvedValue(0);

    await service.sellHolding('user-1', 'holding-1', { qty: 3, price: 110, charges: 0 });

    expect(prisma.holding.update).not.toHaveBeenCalled();
    expect(prisma.holding.delete).not.toHaveBeenCalled();
  });

  it('does not double-count manual sell transactions when calculating portfolio quantity', async () => {
    prisma.portfolio.findUnique.mockResolvedValue({ id: 'portfolio-1', userId: 'user-1', orgId: 'org-1' });
    prisma.tradeTransaction.findMany.mockResolvedValue([
      { symbol: 'AAPL', side: 'BUY', qty: 10, price: 100, executedAt: new Date('2026-08-01'), txnType: 'manual' },
      { symbol: 'AAPL', side: 'SELL', qty: 2, price: 110, executedAt: new Date('2026-08-02'), txnType: 'manual' },
    ]);
    prisma.holdingSale.findMany.mockResolvedValue([
      { qty: 2, price: 110, holding: { symbol: 'AAPL' } },
    ]);
    prisma.holding.findMany.mockResolvedValue([]);
    livePrice.getQuotes.mockResolvedValue(new Map([['AAPL', { ltp: 120, changePct: 1 }]]));

    const result = await service.getWithPnl('user-1', 'org-1');

    expect(result.holdings[0].qty).toBe(8);
    expect(result.holdings[0].pnl).toBeCloseTo(160, 5);
  });

  it('keeps the stored holding row unchanged when a sell is recorded', async () => {
    prisma.holding.findUnique.mockResolvedValue({
      id: 'holding-1',
      symbol: 'AAPL',
      qty: 10,
      avgBuyPrice: 100,
      portfolio: { userId: 'user-1', orgId: 'org-1' },
    });
    prisma.holdingSale.create.mockResolvedValue({ id: 'sale-1', qty: 3, price: 110, charges: 0, pnl: 30 });
    prisma.tradeTransaction.create.mockResolvedValue({});
    prisma.tradeTransaction.count.mockResolvedValue(0);

    await service.sellHolding('user-1', 'holding-1', { qty: 3, price: 110, charges: 0 });

    expect(prisma.holding.update).not.toHaveBeenCalled();
    expect(prisma.holding.delete).not.toHaveBeenCalled();
  });
});
