import type { SuccessRule } from "@/lib/types/database";

export type CheckInRecord = { date: string; user_id: string };

export type StreakResult = {
  currentStreak: number;
  longestStreak: number;
  successDates: Set<string>;
};

function parseDateStr(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/**
 * 하루의 성공 여부: success_rule이 both면 둘 다 인증해야 하고,
 * either면 한 명만 인증해도 성공. 파트너가 아직 없으면(1인 상태)
 * both도 본인 인증만으로 성공 처리한다.
 */
export function calculateRoutineStreak(
  checkIns: CheckInRecord[],
  successRule: SuccessRule,
  userId: string,
  partnerId: string | null,
  today: string
): StreakResult {
  const usersByDate = new Map<string, Set<string>>();
  for (const c of checkIns) {
    if (!usersByDate.has(c.date)) usersByDate.set(c.date, new Set());
    usersByDate.get(c.date)!.add(c.user_id);
  }

  function isSuccessDay(date: string): boolean {
    const users = usersByDate.get(date);
    if (!users) return false;
    if (successRule === "either") {
      return users.has(userId) || (partnerId ? users.has(partnerId) : false);
    }
    if (!partnerId) return users.has(userId);
    return users.has(userId) && users.has(partnerId);
  }

  const successDates = new Set([...usersByDate.keys()].filter(isSuccessDay));

  // 현재 스트릭: 오늘이 아직 성공 전이면 어제부터 거슬러 올라가며 센다
  // (오늘 실패했다고 바로 스트릭이 끊긴 걸로 보지 않고, 아직 인증할 기회가 남은 걸로 취급)
  let cursor = successDates.has(today) ? parseDateStr(today) : addDays(parseDateStr(today), -1);
  let currentStreak = 0;
  while (successDates.has(toDateStr(cursor))) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  // 최장 스트릭: 성공한 날짜들을 정렬해 연속 구간 중 가장 긴 것을 찾는다
  const sorted = [...successDates].sort();
  let longestStreak = 0;
  let run = 0;
  let prevDate: Date | null = null;
  for (const ds of sorted) {
    const d = parseDateStr(ds);
    if (prevDate && Math.round((d.getTime() - prevDate.getTime()) / 86400000) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prevDate = d;
  }

  return { currentStreak, longestStreak, successDates };
}
