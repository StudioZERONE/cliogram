# KLIOGRAM

> *"고요히 흘러 마침내 숲이 될 하루"*
개인 자산 및 생활 데이터 통합 관리 서비스

---

## 1. 기술 스택

- **Framework**: Next.js 16.3.1 (App Router & Proxy)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (Vanilla CSS)
- **Architecture**: Spec-Driven Development (SDD) & Antigravity Automated Harness (`.antigravity/hooks.json`)
- **Testing**: Vitest & React Testing Library (Test-First Build Pipeline)
- **Database / Auth**: Supabase (PostgreSQL, Row Level Security, Google OAuth)
- **External API**: Frankfurter API (USD/KRW 실시간/과거 환율 연동)

---

## 2. 주요 기능 및 모듈

- **보안 및 인증**: Google OAuth 기반 세션 관리 및 30일 자동 로그인 세션 만료 제어
- **실시간 환율 엔진**: Frankfurter API 기반 실시간/과거 환율 자동 조회 및 Supabase DB 캐싱
- **시스템 공통코드**: 동적 마스터 코드 관리, 드래그 앤 드롭 정렬, 모바일 반응형 뷰포트
- **스마트 테마 엔진**: 사용자 오버라이드 12시간 TTL 자동 만료 및 시스템 테마 복귀
- **명세 주도 개발 (SDD)**: 선행 명세서(`41.Plan/*`) 수립 기반 에이전트 개발 및 검증 파이프라인
- **자동화 테스트 하네스**: `.antigravity/hooks.json` 저장/커밋 훅 기반 자가 수정(Self-correction) 및 100% 테스트 통과 빌드 통제


---

## 3. 개발 및 테스트 명령어

```bash
# 로컬 개발 서버 실행
npm run dev

# 자동화 단위/통합 테스트 스위트 실행
npm test

# 테스트 선행 검증 및 프로덕션 번들 빌드
npm run build
```

