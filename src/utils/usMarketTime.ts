/**
 * 米国東部（America/New_York）の簡易マーケット時間（平日のみ・祝日なし）
 */

const OPEN_MIN = 9 * 60 + 30;
const CLOSE_MIN = 16 * 60;
const POST_END_MIN = 20 * 60;
const PRE_START_MIN = 4 * 60;

const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface ETParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekdayShort: string;
}

export function getETParts(date: Date): ETParts {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: 'short',
  });
  const parts = f.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '0';
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
    weekdayShort: get('weekday'),
  };
}

function weekdayNum(weekdayShort: string): number {
  return WEEKDAY_SHORT[weekdayShort] ?? 0;
}

function minutesSinceMidnightET(p: ETParts): number {
  return p.hour * 60 + p.minute;
}

function sameETDay(a: ETParts, b: ETParts): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function msUntilTimeOnSameETDay(now: Date, targetHour: number, targetMinute: number): number | null {
  const start = getETParts(now);
  const max = now.getTime() + 26 * 3600 * 1000;
  for (let t = now.getTime() + 1000; t < max; t += 1000) {
    const p = getETParts(new Date(t));
    if (!sameETDay(p, start)) {
      break;
    }
    if (p.hour === targetHour && p.minute === targetMinute && p.second === 0) {
      return t - now.getTime();
    }
  }
  return null;
}

export function msUntilNextWeekdayMarketOpen930(now: Date): number {
  const max = now.getTime() + 10 * 24 * 3600 * 1000;
  for (let t = now.getTime() + 1000; t < max; t += 1000) {
    const p = getETParts(new Date(t));
    const wd = weekdayNum(p.weekdayShort);
    if (wd < 1 || wd > 5) continue;
    if (p.hour === 9 && p.minute === 30 && p.second === 0) {
      return t - now.getTime();
    }
  }
  return 0;
}

export type UsSessionKind = 'regular' | 'pre' | 'post' | 'closed_weekend' | 'closed_overnight';

export interface UsMarketUiState {
  kind: UsSessionKind;
  dot: '🟢' | '🔴' | '🟡';
  title: string;
  countdownLabel: string;
  countdownMs: number;
}

export function getUsMarketUiState(now: Date): UsMarketUiState {
  const p = getETParts(now);
  const wd = weekdayNum(p.weekdayShort);
  const mins = minutesSinceMidnightET(p);
  const isWeekday = wd >= 1 && wd <= 5;

  if (!isWeekday) {
    const ms = msUntilNextWeekdayMarketOpen930(now);
    return {
      kind: 'closed_weekend',
      dot: '🔴',
      title: 'マーケット休場（週末）',
      countdownLabel: '開場まで',
      countdownMs: ms,
    };
  }

  if (mins >= OPEN_MIN && mins < CLOSE_MIN) {
    const ms = msUntilTimeOnSameETDay(now, 16, 0) ?? 0;
    return {
      kind: 'regular',
      dot: '🟢',
      title: 'マーケット開場中（NYSE / NASDAQ）',
      countdownLabel: '閉場まで',
      countdownMs: ms,
    };
  }

  if (mins >= PRE_START_MIN && mins < OPEN_MIN) {
    const ms = msUntilTimeOnSameETDay(now, 9, 30) ?? 0;
    return {
      kind: 'pre',
      dot: '🟡',
      title: 'プレマーケット',
      countdownLabel: '通常セッション開始まで',
      countdownMs: ms,
    };
  }

  if (mins >= CLOSE_MIN && mins < POST_END_MIN) {
    const ms = msUntilTimeOnSameETDay(now, 20, 0) ?? 0;
    return {
      kind: 'post',
      dot: '🟡',
      title: 'アフターアワー',
      countdownLabel: '延長取引終了まで',
      countdownMs: ms,
    };
  }

  const ms = msUntilNextWeekdayMarketOpen930(now);
  return {
    kind: 'closed_overnight',
    dot: '🔴',
    title: 'マーケット閉場',
    countdownLabel: '開場まで',
    countdownMs: ms,
  };
}

export function formatCountdownJa(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `あと${m}分`;
  return `あと${h}時間${m}分`;
}
