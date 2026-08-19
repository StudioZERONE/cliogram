# KLIOGRAM 프로젝트 AI 에이전트 개발 & 아키텍처 헌법 (Project Constitution)

> 본 문서는 KLIOGRAM 프로젝트의 최상위 공식 개발 헌법입니다. AI 에이전트와 개발자는 본 헌법의 핵심 대원칙을 100% 준수해야 하며, 세부 디자인 시스템, 컴포넌트 명세 및 개발 가이드라인은 옵시디언 지식 문서(Obsidian Vault)를 유기적으로 참조하여 구현합니다.

---

## 1. 커뮤니케이션 & 상호작용 철학 (Human-centric Communication)

- **사용자 공식 호칭**: 사용자를 부를 때는 항상 **"영일님"**으로 정중하고 친근하게 호칭함.
- **따뜻하고 친근한 경청**: 기계적인 "요청하신 대로" 대신 항상 **"말씀하신 대로"**를 사용함.
- **객관적이고 담백한 진단**: 과장이나 옹호 없이 지적사항과 단점을 담백하고 객관적으로 전달함.
- **시각적 소음 차단 (No Emojis)**: 불필요한 이모지 사용을 전면 금지하며, 정갈한 마크다운 텍스트 표현만 사용함.

---

## 2. 헌법-지식 문서 이원화 연동 체계 (Constitution & Vault Knowledge Bridge)

- **헌법(`GEMINI.md`)의 역할**: 개발 방향성, 서비스 정체성, 에이전트 핵심 행동 수칙 등 **강력한 의지를 담은 핵심 대원칙**만을 정의하여 컨텍스트 경량화 및 실행 명확성을 유지함.
- **옵시디언 지식 문서 최상위 루트 경로 (Obsidian Vault Root)**:
  - **경로**: [`/Users/zerone/Documents/_Docs/_Obsidian/StudioZERONE/kliogram/`](file:///Users/zerone/Documents/_Docs/_Obsidian/StudioZERONE/kliogram/)
  - **`21.Rules/`**: 코드 구현 규정, 코딩 컨벤션 및 DB 쿼리 정렬 가이드
  - **`22.Design Rules/`**: 세부 UI/UX 컴포넌트 명세, 컬러 토큰, 사이드바 & 반응형 뷰포트 규정
  - **`51.Journal/`**: 주차별 개발일지 및 작업 기록 문서
- **AI 에이전트의 자율 지식 참조 원칙 (Active Knowledge Referencing)**:
  - AI 에이전트는 새로운 대화 세션이나 작업 수행 시 위 옵시디언 루트 경로의 지식 문서를 **상시 활발히 참조**하여 기존 디자인 시스템과 코딩 컨벤션을 100% 동기화함.

---

## 3. 브랜드 정체성 & 디자인 시스템 대원칙 (Brand & Design Principles)

- **서비스 정체성**: **KLIOGRAM** | *"고요히 흘러 마침내 숲이 될 하루"*
- **브랜드 컬러**: **`#057a5d`** (Light Mode) / **`#10b981`** (Dark Mode)
- **타이포그래피 원칙 (No Monospace)**: 소스 코드 블록 표출 목적 이외에는 고정폭 폰트(`font-mono`) 사용을 금지하며, 모든 데이터/일자/숫자는 정갈한 표준 폰트(`font-semibold` / `font-bold`)로 통일함.
- **UI 조작감 & 입체감 구분 원칙**:
  - **입력 필드 (Recessed Inset)**: 오목하게 들어간 느낌(`shadow-inner`, 짙은 필드 배경)으로 평면과 구분함.
  - **기능 버튼 및 컨트롤 (Elevated Raised Action)**: 양각으로 떠 있는 컨트롤 느낌(`bg-emerald-500/10 border-emerald-500/30 shadow-xs`)을 부여하여 조작 직관성을 높임.
  - **원장 데이터 추가 버튼 규정**: 신규 데이터 추가 버튼은 `+` 아이콘이 포함된 콤팩트 동그란 녹색 버튼(`rounded-full`)으로 단일화함.
- **세부 레이아웃 및 뷰포트 규정**: 상세 반응형 디자인, 모바일 팝업 및 고밀도 컴팩트 스펙은 지식 문서 [`22.Design Rules/`](file:///Users/zerone/Documents/_Docs/_Obsidian/StudioZERONE/kliogram/22.Design Rules/)를 참조함.

---

## 4. 데이터 진실성 & DB 쿼리 엄격성 (Data Truth & Query Determinism)

- **Strict DB Truth (우회/가짜 임시 데이터 금지)**: 데이터가 없거나 조회 실패 시 덤미 데이터를 반환하거나 우회 변환(Alias)하는 행위를 금지하며, DB의 실제 상태만을 엄격히 반환함.
- **Strict Query Determinism (명시적 정렬 필수)**: 모든 DB `select` 쿼리에는 반드시 `ORDER BY`(`.order()`) 절을 명시함. 주 정렬(Primary) 및 동점 처리 2차 정렬(Secondary Tie-Breaker)을 함께 작성하여 물리적 튜플 순서 의존성 및 환경 간 불일치를 100% 차단함.
- **동적 마스터 초기 선택 & 시드 동기화**: 마스터 초기 선택 키를 하드코딩하지 않고 동적 첫 항목(`data[0]`)으로 지정하며, 마스터 데이터 시드 SQL(`sql/b_data_system.sql`)과 즉시 동기화함.

---

## 5. AI 에이전트 개발 자율성 & 업무 생명주기 (Agent Autonomy & Lifecycle)

- **소스 및 주석 수호**: 기존 소스, 주석, JSDoc을 100% 보존하며 섣부른 코드 삭제를 금함.
- **실증 검증 필수**: 수정 후 반드시 `npm run build` 성공을 검증한 후 보고함.
- **Universal AI Protection 🔒**: 계정/비밀번호/API 키 등 보안 정보 100% 보존.
- **자율 커밋 & 푸시 원칙 (Auto Push)**: 사용자가 보류를 명시하지 않는 한, 구현 및 `npm run build` 검증 통과 즉시 `git commit` & `git push origin main`까지 자율 완료함.
- **출퇴근 생명주기 기반 개발 서버 관리**:
  - **출근 감지 시**: `http://localhost:3000` 개발 서버 프로세스 백그라운드 자동 가동 및 유지.
  - **퇴근 감지 시**: 개발 서버 프로세스 자동 종료(`kill`) 후 세션 종료.

---
