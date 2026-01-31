# Changelog

## [v0.2.0] - 2026-01-31 (UI/UX Overhaul)

### 🎨 UI Improvements
- **Professional Layout**: 헤더, 콘텐츠, 에디터 영역을 명확히 분리하고 불필요한 공백 제거.
- **Enhanced Editor**: 텍스트 에디터의 기본 높이를 확장(`150px`)하여 긴 문단 가독성 확보.
- **Result Cards**: 분석 결과를 `Card` 컴포넌트와 그림자 효과로 시각화하여 정보 계층 구조 개선.

### 🚀 New Features
- **Auto-Detect Selection**: 사용자가 Word에서 텍스트를 선택하면 별도의 클릭 없이 Task Pane에 즉시 로드(`DocumentSelectionChanged` 이벤트 연동).
- **Safe Text Processing**: 정규표현식 처리를 강화하여 개행 문자(`\r`, `\n`)로 인한 캡션 깨짐 현상 완벽 해결.

## [v0.1.1] - 2026-01-31 (UX Enhancement)

### 🚀 New Features
- **Context Menu Integration**: Word 문서에서 텍스트 선택 후 우클릭 시 `PaperPilot: Analyze` 메뉴 제공.
  - 클릭 시 Task Pane이 즉시 열리며 분석 준비 상태가 됨.
  - 리본 메뉴까지 마우스를 이동할 필요 없이("Zero tab switching") 흐름 유지 가능.

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
