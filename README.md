# 갓생커플

취준생·대학생 커플이 각자의 자기계발 루틴을 함께 인증하며 갓생을 사는 습관 트래커.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%7C%20DB%20%7C%20Storage-3ECF8E)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38BDF8)

> 1인 개발 포트폴리오 프로젝트 — 기획부터 디자인, 프론트엔드, 배포까지 단독 수행
> 기획서: (기획서 아티팩트 링크로 교체) · 와이어프레임: (와이어프레임 아티팩트 링크로 교체)

## 스크린샷

<!-- TODO: 실제 화면 GIF/스크린샷으로 교체 -->
| 홈 대시보드 | 루틴 상세 | 마이페이지 |
|---|---|---|
| _준비 중_ | _준비 중_ | _준비 중_ |

## 문제의식

기존 커플앱은 대화·일정 공유 중심이고, 습관 트래커는 개인 또는 불특정 다수 대상이라 커플 관계에 특화된 게이미피케이션이 비어 있습니다. 갓생커플은 "습관 형성 + 커플 관계"를 정면으로 결합해, 대학생·취준생 커플이 각자 다른 목표(토익 vs 운동)를 가지고 있어도 "함께 노력하는 시간"으로 묶어줍니다.

## 핵심 기능

- 초대코드 기반 파트너 연결
- 루틴 생성 및 매일 인증(체크인)
- Supabase Realtime 기반 파트너 인증 현황 실시간 반영
- 스트릭 · 캘린더 뷰
- 실패 시 벌칙 규칙 노출

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 15 (App Router) + TypeScript |
| 백엔드 | Supabase (Auth · Postgres · Storage · Realtime) |
| 스타일 | Tailwind CSS |
| 서버 상태 | TanStack Query |
| 클라이언트 상태 | Zustand |
| 폼 | react-hook-form + zod |
| 배포 | Vercel |

## 폴더 구조

```
src/
  app/
    login/           로그인
    connect/         파트너 연결(초대코드)
    home/            오늘의 루틴 체크인 대시보드
    routines/[id]/   루틴 상세 (캘린더·스트릭·히스토리)
    mypage/          마이페이지
  lib/
    supabase/        브라우저/서버 Supabase 클라이언트
    types/           DB 타입 정의
  middleware.ts      Supabase 세션 갱신
supabase/
  schema.sql         테이블 · RLS 정책 · 파트너 연결 RPC
docs/
  branch-strategy.md 브랜치 전략 & 커밋 컨벤션
```

## 로컬 개발 시작하기

```bash
npm install
cp .env.example .env.local   # Supabase 프로젝트 URL/키 채우기
npm run dev
```

Supabase 프로젝트를 새로 만들었다면 SQL Editor에서 `supabase/schema.sql`을 실행해 테이블과 RLS 정책을 적용하세요.

## 아키텍처

<!-- TODO: 화면-데이터 흐름 다이어그램 추가 (예: Next.js Route Handler ↔ Supabase 흐름) -->

## 트러블슈팅

<!-- TODO: 개발 중 겪은 문제와 해결 과정을 기록. 채용 담당자가 가장 관심 있게 보는 부분. -->

## 로드맵

기획서(10~14일 로드맵) 기준 진행 상황을 GitHub Projects 칸반보드에서 관리합니다.
