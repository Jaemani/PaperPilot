# Architecture Decision Record (ADR)

## 001. Hybrid Validation Architecture (v0.3.0+)

### Context
초기 MVP(v0.1.0)는 정적 규칙과 Mock Logic에 의존하여 동작했습니다.
실제 연구 환경에서 유효한 검증을 제공하기 위해 LLM을 도입해야 하지만, 
LLM의 환각(Hallucination)과 일관성 부족 문제는 "정확성"이 생명인 연구 도구에 치명적입니다.

### Decision
우리는 **"LLM as a Parser/Classifier, Code as a Judge"** 패턴을 채택합니다.
LLM에게 최종 수정안 생성을 전적으로 맡기지 않고, **구조화된 데이터 추출**과 **분류** 역할만 부여합니다.
최종 검증과 수정안 생성은 신뢰할 수 있는 **정적 규칙(JSON Rules)**과 **결정 로직(Code)**이 담당합니다.

### Detailed Design

#### 1. Term Check (Context-Aware Thesaurus)
- **Role of LLM**: `Classifier` + `Thesaurus`
- **Input**: 선택된 단어 + 문단 전체(Context Window)
- **Process**:
  1. LLM이 문맥을 분석하여 단어의 Formal/Informal 여부 판단 (Binary Classification).
  2. Informal일 경우, 문맥에 맞는 동의어 리스트 추출.
- **Role of Code**: LLM 결과를 UI에 매핑하고, 사용자가 선택한 단어로 텍스트 교체.

#### 2. Format Check (Hybrid Validator)
- **Role of LLM**: `Parser`
- **Input**: 사용자의 Raw Caption (e.g., "Figure 1: My Chart")
- **Process**: LLM이 비정형 텍스트를 구조화된 JSON으로 파싱 (`{ prefix: "Figure", separator: ":", content: "My Chart" }`).
- **Role of Code**: `Judge` + `Builder`
  1. 파싱된 데이터와 `journalFormats.json` 규칙 비교.
  2. 규칙 위반 시(예: Separator 불일치), 규칙에 맞는 정답 문자열 재조립.

#### 3. Cite Check (Claim Detection)
- **Role of LLM**: `Classifier`
- **Input**: 선택된 문장
- **Process**: 문장을 3가지 유형(General Fact, Author's Result, External Claim)으로 분류.
- **Role of Code**: `Validator`
  - `External Claim` 유형이면서 인용 패턴(Regex)이 없으면 경고 발생.

### Status
- [x] Architecture Design Completed
- [ ] Backend API Implementation (FastAPI)
- [ ] Client Integration
