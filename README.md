# KLIOGRAM — 프로젝트 개요

> 실시간 환율 연동 스마트 주식 매매 내역 & 배당금 포트폴리오 관리 웹 애플리케이션

---

## 📌 프로젝트 기본 정보 (Rich Table)

| 구분 | 항목 | 설정값 / 정보 | 비고 및 세부 내용 |
| :---: | :--- | :--- | :--- |
| 🏷️ | **프로젝트명** | `kliogram` | 서비스 브랜드 명칭 |
| 🔄 | **이전 명칭** | `clio` | 리패키징 및 리네이밍 이전 명칭 |
| 🐙 | **GitHub Repository** | [StudioZERONE/kliogram](https://github.com/StudioZERONE/kliogram) | 메인 원격 저장소 |
| 💻 | **로컬 작업 경로** | `/Users/zerone/Documents/_AI/kliogram` | 로컬 워크스페이스 디렉토리 |
| ☁️ | **배포 플랫폼** | Vercel | StudioZERONE 팀 프로젝트 연동 배포 |
| 🗄️ | **데이터베이스** | Supabase (PostgreSQL) | `trades`, `dividends`, `exchange_rates` 테이블 |

---

## 🛠️ 기술 스택 (Rich Table)

| 구분 | 기술 / 라이브러리 | 버전 | 활용 목적 및 역할 |
| :---: | :--- | :---: | :--- |
| ⚡ | **Next.js (App Router)** | `v16.3.1` | 코어 풀스택 프레임워크 (Turbopack 적용) |
| 📘 | **TypeScript** | `v5.x` | 정적 타입 체킹 및 코드 안정성 확보 |
| 🎨 | **Tailwind CSS** | `v4.x` | Vercel 스타일 차분한 다크 디자인 및 반응형 레이아웃 |
| 🗄️ | **Supabase SDK** | `v2.112.3` | PostgreSQL DB CRUD 조작 및 데이터 동기화 |
| 💱 | **Frankfurter API** | Free API | API Key 불필요 실시간/과거 USD/KRW 환율 연동 |
| 📅 | **react-datepicker** | `v9.1.0` | 대시보드 폼 반응형 이모지 캘린더 날짜 피커 |
| 🧩 | **Lucide React** | `v1.31.0` | 깔끔하고 일관된 모던 UI 아이콘 셋 |
| 📱 | **PWA Support** | Web Manifest | 모바일 '홈 화면에 추가' 및 Standalone 웹앱 지원 |

---

## ✨ 주요 기능 요약 (Rich Table)

| 기능명 | 주요 특징 및 처리 로직 |
| :--- | :--- |
| 📈 **매매 내역 입력** | 종목/티커, 거래일자(캘린더), 매수/매도 구분, 수량, 단가, 수수료, 세금, 통화(KRW/USD) 입력 및 실시간 총액 계산 |
| 💰 **배당 내역 입력** | 종목/티커, 지급일자(캘린더), 세전 배당금, 세금, 통화(KRW/USD) 입력 및 세후 실수령액 자동 미리보기 |
| 💱 **실시간 환율 연동** | 선택 날짜에 맞춰 Frankfurter API 실시간 호출 및 Supabase DB 자동 캐싱 (D-2 이전 과거 데이터 재조회 방지) |
| 📊 **통계 대시보드** | 총 매매 기록 건수, 총 배당 수령 건수, 원화 환산 누적 세후 배당금 자동 산출 통계 카드 |
| 📱 **Vercel Style UI** | 2단 반응형 그리드(`xl:grid-cols-2`), 다크 토큰 시스템(`Inter` 폰트, `#0a0a0a` 배경), 모바일/PC 대응 레이아웃 |
