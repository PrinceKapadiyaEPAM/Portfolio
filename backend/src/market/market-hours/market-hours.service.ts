import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

export type MarketPhase = 'open' | 'pre-open' | 'closed' | 'weekend';

const TZ = 'Asia/Kolkata';
const OPEN_H = 9, OPEN_M = 15;
const CLOSE_H = 15, CLOSE_M = 30;
const PRE_OPEN_H = 9, PRE_OPEN_M = 0;

@Injectable()
export class MarketHoursService {
  nowIST(): DateTime {
    return DateTime.now().setZone(TZ);
  }

  isMarketOpen(): boolean {
    return this.marketPhase() === 'open';
  }

  marketPhase(): MarketPhase {
    const now = this.nowIST();
    const dow = now.weekday; // 1=Mon … 7=Sun
    if (dow >= 6) return 'weekend';

    const mins = now.hour * 60 + now.minute;
    const preOpenMins = PRE_OPEN_H * 60 + PRE_OPEN_M;
    const openMins    = OPEN_H    * 60 + OPEN_M;
    const closeMins   = CLOSE_H   * 60 + CLOSE_M;

    if (mins >= openMins && mins < closeMins) return 'open';
    if (mins >= preOpenMins && mins < openMins) return 'pre-open';
    return 'closed';
  }

  nextTransition(): { event: 'open' | 'close'; at: string; inMinutes: number } {
    const now = this.nowIST();
    const phase = this.marketPhase();

    if (phase === 'open') {
      const close = now.set({ hour: CLOSE_H, minute: CLOSE_M, second: 0, millisecond: 0 });
      return { event: 'close', at: close.toISO()!, inMinutes: Math.round(close.diff(now, 'minutes').minutes) };
    }

    // Find next open (skip weekends)
    let next = now.set({ hour: OPEN_H, minute: OPEN_M, second: 0, millisecond: 0 });
    if (next <= now) next = next.plus({ days: 1 });
    while (next.weekday >= 6) next = next.plus({ days: 1 });
    return { event: 'open', at: next.toISO()!, inMinutes: Math.round(next.diff(now, 'minutes').minutes) };
  }
}
