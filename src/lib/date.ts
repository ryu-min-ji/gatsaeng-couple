/**
 * 이 앱의 "오늘"은 한국 시간(KST, UTC+9) 기준으로 고정한다.
 * `new Date().toISOString()`은 항상 UTC라서, 자정~오전 9시(KST) 사이엔
 * 실제로는 이미 다음 날인데도 하루 전 날짜로 계산되는 버그가 있었다.
 * 서버 타임존(로컬 개발 PC와 Vercel 배포 서버가 다를 수 있음)에 기대지 않고,
 * UTC 시각에 9시간을 더해 KST 달력 날짜를 직접 계산한다.
 */
export function todayKST(): string {
  const kstMs = Date.now() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
}
