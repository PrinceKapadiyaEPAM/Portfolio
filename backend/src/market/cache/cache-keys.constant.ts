export const CacheKeys = {
  equityQuote:              (symbol: string) => `equity:quote:${symbol.toUpperCase()}`,
  equityQuoteAll:           ()               => `equity:quote:__all__`,
  indexQuote:               (index: string)  => `index:quote:${index.toUpperCase()}`,
  indexQuoteAll:            ()               => `index:quote:__all__`,
  indexQuoteAllLastClose:   ()               => `index:quote:__all__:lastclose`,
  optionsChain:             (symbol: string) => `options:chain:${symbol.toUpperCase()}`,
  topGainers:               ()               => `market:gainers`,
  topLosers:                ()               => `market:losers`,
  topGainersLastClose:      ()               => `market:gainers:lastclose`,
  topLosersLastClose:       ()               => `market:losers:lastclose`,
  marketStatus:             ()               => `market:status`,
  pollTimestamp:            (job: string)    => `poll:ts:${job}`,
  pollTimestampLastClose:   (job: string)    => `poll:ts:${job}:lastclose`,
} as const;

export const CacheTTL = {
  EQUITY_QUOTE:   30,
  INDEX_QUOTE:    20,
  OPTIONS_CHAIN:  120,
  MOVERS:         60,
  MARKET_STATUS:  120,
  POLL_TIMESTAMP: 300,
  LAST_CLOSE:     86_400, // 24 h — survives overnight between sessions
} as const;
