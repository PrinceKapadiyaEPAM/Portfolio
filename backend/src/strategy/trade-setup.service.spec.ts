import { TradeSetupService } from './trade-setup.service';

describe('TradeSetupService status derivation', () => {
  const prisma = {
    tradeSetup: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    accumulationLevel: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    tradeTarget: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const livePrice = {
    getQuotes: jest.fn().mockResolvedValue(new Map()),
  };

  const service = new TradeSetupService(prisma as any, livePrice as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('derives accumulating status from buy transactions when the trade is still under its planned quantity', async () => {
    prisma.tradeSetup.findMany.mockResolvedValue([
      {
        id: 'trade-1',
        tradeId: 'TRD-202608-001',
        name: 'Test trade',
        description: null,
        tags: [],
        symbol: 'TCS',
        buyRangeHigh: 100,
        buyRangeLow: 90,
        status: 'draft',
        slType: null,
        slValue: null,
        slReference: null,
        slStatus: null,
        notes: null,
        createdAt: new Date('2026-08-01'),
        updatedAt: new Date('2026-08-01'),
        accLevels: [{ plannedQty: 10, status: 'pending' }],
        targets: [],
        transactions: [
          { side: 'BUY', qty: 6, price: 95, pnl: null },
        ],
      },
    ]);

    const result = await service.listAll('user-1', {});

    expect(result[0].status).toBe('accumulating');
  });

  it('derives closed status when all accumulated quantity has been sold out', async () => {
    prisma.tradeSetup.findMany.mockResolvedValue([
      {
        id: 'trade-2',
        tradeId: 'TRD-202608-002',
        name: 'Exit trade',
        description: null,
        tags: [],
        symbol: 'INFY',
        buyRangeHigh: 100,
        buyRangeLow: 90,
        status: 'active',
        slType: null,
        slValue: null,
        slReference: null,
        slStatus: null,
        notes: null,
        createdAt: new Date('2026-08-01'),
        updatedAt: new Date('2026-08-01'),
        accLevels: [{ plannedQty: 10, status: 'filled' }],
        targets: [],
        transactions: [
          { side: 'BUY', qty: 10, price: 95, pnl: null },
          { side: 'SELL', qty: 10, price: 98, pnl: 30 },
        ],
      },
    ]);

    const result = await service.listAll('user-1', {});

    expect(result[0].status).toBe('closed');
  });
});
