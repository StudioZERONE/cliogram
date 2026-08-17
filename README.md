# KLIOGRAM

실시간 환율 연동 주식 매매 내역 및 배당금 관리 대시보드 (Next.js 14, Supabase, Tailwind CSS, PWA).

## 주요 기능
- **매매 내역 관리**: 거래일자, 종목명, 매수/매도 구분, 수량, 단가, 수수료, 세금, 통화(KRW/USD) 기록
- **배당 내역 관리**: 지급일자, 종목명, 배당금액, 세금, 통화(KRW/USD) 기록 및 세후 실수령액 자동 계산
- **실시간 환율 연동**: Frankfurter API를 연동하여 일자별 USD/KRW 환율 자동 조회 및 Supabase DB 캐싱
- **일별 종가 Cron API**: 자정마다 최신 종가 환율을 자동 수집하는 엔드포인트 (`/api/cron/fetch-rate`)
- **PWA 지원**: 모바일 브라우저에서 '홈 화면에 추가'하여 앱처럼 사용 가능

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## 환경 변수 설정 (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
CRON_SECRET=your_optional_cron_secret
```
