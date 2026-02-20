# Decision Log

## 011. Hybrid AI Citation Strategy (v1.4.0 roadmap)
- **Date**: 2026-02-20
- **Context**:
  - User feedback: Different conferences/journals have distinct citation styles and vocabulary preferences beyond format rules.
  - Current Term check doesn't consider journal context; Cite check is purely rule-based.
- **Decision**:
  - **Option C (Hybrid)** adopted: Rule-based auto-fix for certain violations (`[1,2]` → `[1], [2]`) + AI suggestions for ambiguous cases (placement, range optimization).
  - AI calls batched (100 candidates → 1 API call) for cost efficiency (5.7× cheaper, 2-3× faster vs. serial calls).
  - Term API receives `profileId` to inject journal-specific context into LLM prompt (e.g., IEEE technical precision vs. Nature broader audience).
  - `journalFormats.json` extended with `citationStyle` field: `{ format, allowRanges, allowCombined, separator, placementHint }`.
- **Rationale**:
  - Balances cost, speed, transparency. Users see what AI suggested vs. what was auto-fixed.
  - Avoids overuse of LLM for deterministic tasks while leveraging AI for semantic judgment.

## 010. Korean Word Boundary Fix (v1.3.1)
- **Date**: 2026-02-20
- **Context**:
  - User reported: Korean captions (`그림 1`) flagged as "never referenced" even when `그림 1` appears in body text.
  - Root cause: JavaScript regex `\b` (word boundary) is ASCII-only — never matches before/after Korean Hangul characters (Unicode U+AC00–U+D7AF) because they are classified as `\W`.
- **Decision**:
  - Replace `\b` with `(?<![A-Za-z])` (negative lookbehind for Latin letters) in `INTEXT_REF_RE`.
  - Add `BODY_SENTENCE_JOSA_RE` to detect Korean grammatical constructions: `그림 N. 는` (figure as subject + Korean postposition).
  - Store original caption prefix (`orig: "그림 1"`) instead of reconstructing from normalized key.
  - Add `visibilitychange` listener for context menu to work when panel already open.
- **Rationale**:
  - Preserves cross-language normalization (`그림 1` and `Figure 1` → same key) while fixing regex matching.
  - Josa detection prevents false caption classification of body sentences.
  - `visibilitychange` covers both panel states (closed/open) without code duplication.

## 009. Citation ↔ Reference List Cross-Check (v1.3.0)
- **Date**: 2026-02-19
- **Context**:
  - Users requested integrity check: ensure every `[N]` cited in body has a reference entry, and vice versa.
  - Previous v1.1.0 roadmap item.
- **Decision**:
  - Added Check 10 to `scanStructure()`: builds `definedNums` (from References section entries) and `citedNums` (from body `[N]` brackets).
  - Cross-checks both directions: `cited_not_defined` (orphaned citations) and `defined_not_cited` (uncited references).
  - Handles ranges (`[1-3]`) and comma-lists (`[1,2,3]`) in citation extraction.
- **Rationale**:
  - Zero LLM cost (rule-based).
  - Runs in same `Word.run` as other structure checks (no extra API overhead).
  - High value for submission readiness (common mistake: leftover/missing references).

## 008. Review Tab — Grouped Results + Pre-scan Guide (v1.2.2)
- **Date**: 2026-02-19
- **Context**:
  - User feedback: 16 issues displayed as 16 separate cards (8 identical "Blank lines" entries) felt "not natural".
- **Decision**:
  - Group issues by `rule` type — one card per category with count badge + stacked occurrences inside.
  - Add pre-scan guide showing all 11 checks before first scan (previously just a one-line description).
- **Rationale**:
  - Reduces visual clutter: "16 issues in 4 categories" summary line provides immediate breadth vs. depth sense.
  - Guide sets expectations before scanning (users know what will be checked).

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