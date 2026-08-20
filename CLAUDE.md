# 갓생커플 — 프로젝트 컨텍스트

Claude Code가 이 저장소에서 작업을 이어갈 때 참고할 요약 문서입니다. 자세한 내용은 `docs/기획서.md`를 참고하세요.

## 한 줄 소개

취준생·대학생 커플이 각자의 자기계발 루틴을 함께 인증하는 습관 챌린지 웹앱. 1인 개발 포트폴리오 프로젝트.

## 차별점 (docs/기획서.md 3장 참고)

국내 유사 서비스로 "투투(TwoToo)"가 있음 (범용 커플 챌린지 앱, iOS 전용, 소규모). 우리는 "취준생·대학생 자기계발"이라는 구체적 타깃 + 통계 대시보드 + 설치 없는 웹 기반으로 차별화.

## 기술 스택

- Next.js 15 (App Router) + TypeScript, strict mode
- Supabase (Auth, Postgres, Storage, Realtime) — `supabase/schema.sql`에 테이블·RLS·RPC 정의됨
- Tailwind CSS — 디자인 토큰은 `tailwind.config.ts`에 있음 (coral #FF6B57 / plum #3B2440 / amber #F5A623 / bg #FBF4EF)
- TanStack Query, Zustand, react-hook-form + zod
- 배포 목표: Vercel

## 디자인 원칙

- 모바일 퍼스트, 좁은 폭 중앙정렬 레이아웃 (실사용 맥락이 "이동 중 짧게 인증")
- 파스텔 핑크 일색 지양 — 로맨틱함(코랄)과 자기계발 에너지(앰버)를 같이 담을 것
- 헤딩은 Fraunces, 본문은 Noto Sans KR (globals.css / layout.tsx에 이미 설정됨)
- 참고용 와이어프레임 4종(커플연결/홈/루틴상세/마이페이지)이 별도로 존재함 — 필요하면 사용자에게 공유 링크 요청

## 현재 상태 (여기서부터 이어가면 됨)

완료:
- 프로젝트 골격 (App Router 라우팅, Tailwind 설정, Supabase client/server/middleware)
- `supabase/schema.sql` — profiles/routines/check_ins 테이블 + RLS + `connect_partner` RPC
- 페이지 틀: `/login`(Google OAuth 버튼), `/connect`(초대코드 생성·입력), `/home`(오늘의 루틴), `/mypage`(통계), `/routines/[id]`(상세)

TODO (코드 안에도 `// TODO` 주석으로 표시돼 있음):
1. **체크인(인증) 플로우** — `/home`에서 체크인 버튼 클릭 시 사진/텍스트 업로드 → `check_ins` insert. Supabase Storage `proofs` 버킷 생성 필요 (`schema.sql` 6장 주석 참고)
2. **스트릭 계산** — `check_ins`를 날짜순으로 집계해 연속 성공일수 계산하는 로직/훅 (`/home`, `/routines/[id]`, `/mypage` 세 곳에서 공용으로 씀직함)
3. **루틴 생성 폼** — `/routines/new` 페이지 아직 없음. react-hook-form + zod로 구현
4. **캘린더 뷰** — `/routines/[id]`에 월별 성공 여부 그리드 (와이어프레임의 하트/체크 아이콘 캘린더 참고)
5. **Supabase Realtime** — 파트너의 오늘 체크인 상태를 실시간으로 반영 (`postgres_changes` 구독)
6. **벌칙 규칙 UI** — 루틴 생성 시 벌칙 문구 입력, 둘 다 실패한 날 노출

## 로드맵 (docs/기획서.md 9장, 10~14일 기준)

지금은 Day 1~2(기획/스캐폴딩) 완료 상태. Day 3부터: 인증 플로우 → 루틴/체크인 → 스트릭·캘린더 → 실시간 → 폴리싱 → 배포 → 문서화 순으로 진행.

## 브랜치 전략

`docs/branch-strategy.md` 참고. `main`(배포)/`develop`(통합)/`feature/*`. 커밋은 Conventional Commits (`feat:`, `fix:`, `chore:` 등). 현재 `develop` 브랜치에서 작업 시작하면 됨.
