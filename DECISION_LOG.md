# Decision Log

## 007. Korean Particle-Aware Gating (v0.5.4)
- **Date**: 2026-02-01
- **Context**: 
  - 본문 중 "그림 4는...", "그림 4의..."와 같이 조사가 붙은 문장들이 캡션으로 오탐되는 현상 관측.
  - 이로 인해 본문 텍스트가 캡션 형식으로 강제 변환되는 심각한 데이터 오염 위험 발생.
- **Decision**: 
  - **Negative Lookahead 적용**: 탐지 정규식 뒤에 한국어 조사가 오면 후보에서 즉시 제외하는 패턴 도입.
  - **Separator Enforcement**: 캡션은 반드시 번호 뒤에 구분자나 공백이 와야 한다는 규칙을 탐지 단계(Gate)로 격상.

## 006. Regex Over-escaping & Logging Precision (v0.5.3)
- **Date**: 2026-02-01
- **Context**: 
  - v0.5.2에서 "결과 0개" 현상 발생. 로그 확인 결과 정규식 내 `\s`가 `\\s`로 잘못 생성되어 공백이 아닌 리터럴 문자열을 검색하고 있었음.
  - `Scan All` 통계가 필터링 전의 노이즈(1570개)를 포함하여 사용자에게 혼란을 줌.
- **Decision**: 
  - **Regex Normalization**: JSON에는 표준 이중 백슬래시(`\\s`)를 사용하고, TS 템플릿 리터럴 내에서도 이스케이프를 재점검하여 최종적으로 `/\s/`가 생성되도록 교정.
  - **Stat Refinement**: 필터링(Gate)을 통과한 항목만 `Candidates Found` 통계에 집계하도록 수정.
  - **Gate Bypass**: `text.trim()` 이후에는 `^\\s*` 패턴이 무의미하므로 탐지 정규식을 단순화하여 정확도 향상.

## 005. Product Scope Refinement & Rule-Based Pivot (v0.4.3)
- **Date**: 2026-01-31
- **Context**: 
  - LLM의 환각(Hallucination)으로 인한 오탐(Format)과 무근거 수정(Cite) 문제를 해결해야 함.
  - Word Add-in 환경에서 "전체 스캔"의 성능과 정확도를 보장해야 함.
- **Decision**: 
  - **Feature Scope Redefinition**:
    - **Term**: Selection + Context LLM (유지).
    - **Format (Caption)**: Doc Scan + Deterministic Rule Fix (LLM 배제, 룰 기반).
    - **Cite (Integrity)**: "인용 필요성 감지"에서 **"형식/정합성(Hygiene) 점검"**으로 피벗. `[1]` 자동 삽입 금지.
  - **Gating Strategy**: 
    - 모든 기능에 **Strict Gate** 도입 (길이 제한, 시작 패턴 등)하여 오탐 원천 차단.
  - **UI Structure**: 탭별로 최적화된 Action Button과 Result Card 제공. (Format: Scan All / Cite: Scan Integrity)

## 004. Engineering Reality Check & Architecture Pivot (v0.4.x)
- **Date**: 2026-01-31
- **Context**: LLM을 Generator로 사용하여 부작용 발생.
- **Decision**: `Gate → Analyze → Validate → Explain → Apply` 파이프라인 확립.

## 003. Server-Side Technology Stack
- **Decision**: Node.js (Express) + TypeScript 단일 스택 채택.

## 002. UI/UX Overhaul (v0.2.0)
- **Decision**: 상단 고정 헤더 + Flexbox 레이아웃.

## 001. Initial MVP Architecture (v0.1.0)
- **Decision**: Mock Logic, React + Office.js.