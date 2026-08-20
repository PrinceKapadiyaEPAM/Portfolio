export interface MoverDto {
  symbol:    string;
  ltp:       number;
  change:    number;
  changePct: number;
  volume:    number;
}

export interface MoversDto {
  gainers: MoverDto[];
  losers:  MoverDto[];
}
