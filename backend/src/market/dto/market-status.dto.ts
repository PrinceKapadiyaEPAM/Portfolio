export interface MarketStatusDto {
  phase:              'open' | 'pre-open' | 'closed' | 'weekend';
  isOpen:             boolean;
  nextEvent:          string;
  nextEventAt:        string;
  nextEventInMinutes: number;
  indices: Array<{
    index:       string;
    marketState: string;
  }>;
}
