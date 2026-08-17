# KLIOGRAM

주식 매매 내역 & 배당금 포트폴리오 관리 웹 애플리케이션

---

## 기술 스택

- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS v4
- Supabase SDK (PostgreSQL)
- Frankfurter API (무료 환율 연동)
- react-datepicker + date-fns (날짜 선택 피커)
- Lucide React
- PWA Support (웹 매니페스트)

---

## 주요 기능

- 매매 내역 입력: 종목/티커, 거래일자(캘린더), 매수/매도 구분, 수량, 단가, 수수료, 세금, 통화(KRW/USD) 입력 및 실시간 총액 계산
- 배당 내역 입력: 종목/티커, 지급일자(캘린더), 세전 배당금, 세금, 통화(KRW/USD) 입력 및 세후 실수령액 자동 미리보기
- 실시간 환율 연동: 선택 날짜에 맞춰 Frankfurter API 실시간 호출 및 Supabase DB 자동 캐싱 (D-2 이전 과거 데이터 재조회 방지)
- 통계 대시보드: 총 매매 기록 건수, 총 배당 수령 건수, 원화 환산 누적 세후 배당금 자동 산출 통계 카드
- Vercel Style UI: 2단 반응형 그리드, 다크 토큰 시스템, 모바일 및 PC 반응형 레이아웃
