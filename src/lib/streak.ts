import type { CheckInStatus, Frequency, SuccessRule } from "@/lib/types/database";

export type CheckInRecord = { date: string; user_id: string; status: CheckInStatus };

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

const MAX_WALK_DAYS = 3660; // 안전장치: 약 10년치 이상은 순회하지 않는다

/**
 * 이 날짜가 루틴의 반복 주기상 "해야 하는 날"인지. daily는 매일,
 * weekdays/weekends는 요일로 고정, custom은 frequencyDays(0=일~6=토)에
 * 지정된 요일만. custom인데 frequencyDays가 비어있으면 목표일이
 * 아예 없는 것으로 취급한다.
 */
export function isTargetDay(
  date: string,
  frequency: Frequency,
  frequencyDays: number[] | null
): boolean {
  const dayOfWeek = parseDateStr(date).getUTCDay();
  switch (frequency) {
    case "daily":
      return true;
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "weekends":
      return dayOfWeek === 0 || dayOfWeek === 6;
    case "custom":
      return frequencyDays?.includes(dayOfWeek) ?? false;
  }
}

/**
 * 하루의 성공 여부: success_rule이 both면 둘 다 인증해야 하고,
 * either면 한 명만 인증해도 성공. 파트너가 아직 없으면(1인 상태)
 * both도 본인 인증만으로 성공 처리한다.
 *
 * 목표일이 아닌 날(반복 주기에 안 걸리는 날)은 스트릭 계산에서
 * 완전히 건너뛴다 — 성공으로도 실패로도 치지 않는다.
 */
export function calculateRoutineStreak(
  checkIns: CheckInRecord[],
  successRule: SuccessRule,
  userId: string,
  partnerId: string | null,
  today: string,
  frequency: Frequency = "daily",
  frequencyDays: number[] | null = null
): StreakResult {
  // status가 'failed'인 행(하루 끝나기 전에 직접 실패로 표시한 것)은
  // 성공 집계에서 제외한다.
  const usersByDate = new Map<string, Set<string>>();
  for (const c of checkIns) {
    if (c.status === "failed") continue;
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
  const target = (date: string) => isTargetDay(date, frequency, frequencyDays);

  // 현재 스트릭: 오늘이 목표일인데 아직 성공 전이면 어제부터 거슬러 올라가며 센다
  // (아직 인증할 기회가 남은 걸로 취급). 목표일이 아닌 날은 건너뛴다.
  const todayIsTarget = target(today);
  let cursor =
    todayIsTarget && !successDates.has(today) ? addDays(parseDateStr(today), -1) : parseDateStr(today);

  let currentStreak = 0;
  for (let i = 0; i < MAX_WALK_DAYS; i++) {
    const dateStr = toDateStr(cursor);
    if (target(dateStr)) {
      if (successDates.has(dateStr)) {
        currentStreak++;
      } else {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }

  // 최장 스트릭: 가장 이른 성공일부터 오늘까지, 목표일만 순서대로 훑어서
  // 연속 성공 구간 중 가장 긴 것을 찾는다.
  let longestStreak = 0;
  const sortedSuccess = [...successDates].sort();
  if (sortedSuccess.length > 0) {
    let run = 0;
    let d = parseDateStr(sortedSuccess[0]!);
    const end = parseDateStr(today);
    for (let i = 0; i < MAX_WALK_DAYS && d.getTime() <= end.getTime(); i++) {
      const dateStr = toDateStr(d);
      if (target(dateStr)) {
        if (successDates.has(dateStr)) {
          run++;
          longestStreak = Math.max(longestStreak, run);
        } else {
          run = 0;
        }
      }
      d = addDays(d, 1);
    }
  }

  return { currentStreak, longestStreak, successDates };
}
