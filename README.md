# KLIOGRAM

고요히 흘러 마침내 숲이 될 하루 — 자산, 주식 매매 내역 & 배당금 포트폴리오 종합 관리 웹 애플리케이션

---

## 기술 스택

- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS v4
- Supabase SDK (PostgreSQL)
- Google OAuth 2.0 SSO (단일 인증)
- Frankfurter API (무료 환율 연동)
- react-datepicker + date-fns (날짜 선택 피커)
- Lucide React (아이콘)
- PWA Support (웹 매니페스트)

---

## 주요 기능

- **인덱스 페이지 (`/`)**: 숲 모티브 아이코닉 SVG 로고 및 슬로건 *"고요히 흘러 마침내 숲이 될 하루"*, Google SSO 로그인 및 30일 자동 로그인, 로그인 상태 감지 카드 및 대시보드 이동 링크
- **대시보드 페이지 (`/dashboard`)**: 주식 매매 내역 및 배당금 입력 폼, 실시간 환율 자동 연동, 세후 실수령액 자동 계산, 리스트 필터링/삭제, 상단 로그아웃 버튼
- **Vercel Style & Theme**: White / Dark / System 테마 선택 스위처 제공, 2단 반응형 그리드 및 모바일/PC 폰트/여백 최적화
