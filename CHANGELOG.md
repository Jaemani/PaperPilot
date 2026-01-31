# Changelog

## [v0.1.0] - 2026-01-31 (MVP Feature Complete)

### 🚀 New Features
- **Tab-based UI**: `Term`, `Cite`, `Format` 3가지 핵심 기능 탭 구현.
- **Journal Format Engine**: JSON 기반(`journalFormats.json`)으로 저널별 캡션/인용 스타일을 동적으로 적용.
- **Interactive Action**:
  - `Replace`: 기존 텍스트를 새로운 제안으로 덮어쓰기 (Format, Term)
  - `Append`: 기존 문장 뒤에 텍스트 추가 (Cite)

### 🛠 Implementation Details (Logic & Rules)
현재 버전은 AI(LLM) 연동 전 단계로, **규칙 기반(Rule-based) 및 Mock Logic**으로 동작합니다.

#### 1. Term Check (용어 검증)
- **Logic**: 무조건 `warning` 결과를 반환하며, 입력된 텍스트가 "informal"하다고 가정함.
- **Suggestions**: 고정된 대체어 목록 `["significant", "substantial"]`을 제공.
- **Purpose**: UI 및 교체(Replace) 로직 테스트용.
- **Next Step**: LLM API를 호출하여 실제 문맥 분석 후 비표준 용어 식별 및 동의어 추천으로 교체 필요.

#### 2. Cite Check (인용 점검)
- **Logic**: 무조건 `error`("Citation Needed")를 반환.
- **Suggestions**: 현재 선택된 저널의 `citationStyle` 설정에 따라 결정됨.
  - IEEE/ACM (Bracket `square`) -> ` [1]`
  - Nature (Bracket `superscript`) -> `¹`
- **Next Step**: 문장이 "주장(Claim)"인지, "일반 지식"인지 NLP 분류 모델로 판단 로직 추가 필요.

#### 3. Format Check (캡션 규정)
- **Logic**: **100% Data-driven**. `src/taskpane/data/journalFormats.json`의 규칙을 따름.
- **Process**:
  1. 사용자 선택 텍스트에서 개행(`\r`, `\n`) 제거 및 공백 치환 (Sanitization).
  2. 선택된 저널의 `captionStyle` 로드 (Prefix, Separator 등).
  3. `Template Literal`을 사용하여 `Prefix + " 1" + Separator + " " + Text` 형태로 재조립.
- **Next Step**: "Figure 1" 같은 숫자를 정규식으로 파싱하여, 기존 번호를 유지하거나 자동 증가시키는 로직 추가 필요.

### 📂 Data Structure
- `src/taskpane/data/journalFormats.json`: 저널별 스타일 규칙 정의 (IEEE, Nature, ACM, Springer, Elsevier 포함).
