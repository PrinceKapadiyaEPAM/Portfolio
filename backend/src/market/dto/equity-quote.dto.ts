export interface EquityQuoteDto {
  symbol:           string;
  companyName:      string;
  ltp:              number;
  open:             number;
  high:             number;
  low:              number;
  prevClose:        number;
  change:           number;
  changePct:        number;
  volume:           number;
  totalTradedValue: number;
}
