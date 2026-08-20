import { IndicesPoller } from './indices.poller';

describe('IndicesPoller', () => {
  it('includes INDIA VIX when the NSE API returns the uppercase label', async () => {
    const nse = {
      fetchAllIndices: jest.fn().mockResolvedValue({
        data: [
          { index: 'NIFTY 50', last: 24800, open: 24750, high: 24820, low: 24740, previousClose: 24780, variation: 20, percentChange: 0.08 },
          { index: 'INDIA VIX', last: 16.4, open: 16.1, high: 16.8, low: 15.9, previousClose: 16.2, variation: 0.2, percentChange: 1.23 },
        ],
      }),
    };

    const cache = {
      set: jest.fn().mockResolvedValue(undefined),
    };

    const poller = new IndicesPoller(nse as any, cache as any);

    await poller.poll();

    const allIndexCall = cache.set.mock.calls.find(([key]) => typeof key === 'string' && key.includes('all'));
    expect(allIndexCall).toBeDefined();

    const dtoList = allIndexCall?.[1];
    expect(dtoList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ symbol: 'INDIA VIX' }),
      ]),
    );
  });
});
