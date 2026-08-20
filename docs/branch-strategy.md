# 브랜치 전략 & 작업 방식

기획서 10장(깃허브 운영 전략)의 실행 버전입니다.

## 브랜치

- `main` — 배포 브랜치. Vercel 프로덕션과 연결.
- `develop` — 통합 브랜치. 기능 브랜치들이 여기로 모임.
- `feature/*` — 기능 단위 작업 브랜치. 예: `feature/couple-connect`, `feature/checkin-flow`

작업 순서: `feature/*` → PR → `develop` 머지 → 어느 정도 쌓이면 `develop` → `main` PR로 배포.

## 커밋 컨벤션 (Conventional Commits)

```
feat: 커플 연결 화면 구현
fix: 체크인 중복 인증 버그 수정
chore: 의존성 업데이트
refactor: 스트릭 계산 로직 훅으로 분리
docs: README 아키텍처 다이어그램 추가
```

## 이슈 & 프로젝트 보드

- 기능 단위로 Issue를 먼저 생성하고, 커밋/PR 메시지에 `#이슈번호`를 연결
- GitHub Projects 칸반보드(Todo / In Progress / Done)로 로드맵(기획서 9장)의 Day별 작업을 카드로 관리
- 혼자 진행하더라도 PR을 통해 머지하는 습관을 유지 — 실제 협업 프로세스를 시뮬레이션하는 것 자체가 포트폴리오 신호가 됨

## PR

- `.github/PULL_REQUEST_TEMPLATE.md` 템플릿 사용
- 가능하면 UI 변경에는 스크린샷/GIF 첨부
- Vercel이 PR마다 프리뷰 배포 URL을 자동으로 코멘트로 남겨줌 → 리뷰 시 바로 확인
