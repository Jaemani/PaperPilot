# Target Architecture (v0.4.x+)

## Core Philosophy
1.  **Gate First**: 입력이 해당 기능의 처리 대상인지 룰/휴리스틱으로 먼저 판별한다. (LLM 비용/환각 방지)
2.  **LLM as Parser**: LLM은 "해석"만 하고 "판단"과 "수정"은 코드가 한다.
3.  **Explainability**: 사용자에게 "왜" 그런 판단을 했는지 근거(Trace)를 제공한다.

## Data Pipeline: The "5-Step Contract"
```mermaid
graph LR
    Extract[1. Extract] --> Gate{2. Gate}
    Gate -- No --> Skip[Exit / Ignore]
    Gate -- Yes --> Analyze[3. Analyze (LLM/Regex)]
    Analyze --> Validate[4. Validate (Rule)]
    Validate --> Explain[5. Explain (Trace)]
    Explain --> Apply[6. Apply (Fix/Warn)]
```

## Feature Specifications (v0.4.3 Updated)

### 1. Term Check (Context-Aware)
*   **Trigger**: Selection (User Action)
*   **Gate**: 
    *   Selection이 단어/구 단위인가? (문단 전체 선택 시 거부)
    *   **Lexical Check**: 금지어 리스트에 있으면 즉시 Warn (LLM Skip).
*   **Analyze**: 문맥(Paragraph) 포함하여 LLM에 "학술적 적합성" 질의.
*   **UI**: `Term` 탭. "Analyze Selection" 버튼.

### 2. Cite Check (Hygiene & Integrity)
*   **Trigger**: **Scan Document** (Whole Doc Indexing)
*   **Gate**: 
    *   인용 마커(`[n]`) 패턴 탐지.
    *   `References` 섹션 헤딩 탐지.
*   **Validate**:
    *   **Style**: `[1,2]` vs `[1],[2]` 등 형식 위반 검사.
    *   **Integrity**: 본문의 `[n]`이 References 목록에 존재하는지 확인.
*   **Apply**: `[1]` 자동 삽입 금지. **형식 교정(Fix)** 및 **누락 경고(Warn)**만 수행.
*   **UI**: `Cite` 탭. "Check Citation Integrity" 버튼.

### 3. Format Check (Caption)
*   **Trigger**: **Scan Document** (Whole Doc Indexing)
*   **Gate (Strict)**: 
    *   문단 시작이 `^(Fig|Figure|Table)\.?\s*\d+` 패턴인가?
    *   길이(250자) 및 줄바꿈(1회) 제한 준수.
*   **Validate**: `journalFormats.json`의 규칙(Prefix, Separator)과 비교.
*   **Apply**: 룰에 맞춰 결정적으로 재조립된 문자열로 `Replace`.
*   **UI**: `Format` 탭. "Scan All Captions" 버튼.

## Data Models (v0.5.3 Updated)

### Regex Handling Strategy
- **JSON Rules**: JSON 내 정규식은 `\\s`, `\\d` 등 이중 백슬래시를 사용하여 직렬화한다.
- **Dynamic Construction**: `new RegExp()` 생성 시 문자열 내 백슬래시 개수를 엄격히 관리하여 런타임에 올바른 이스케이프 문자가 생성되도록 보장한다.
- **Filtering First**: `candidatesFound` 통계는 반드시 Hard Gate(길이, 텍스트 존재 등)를 통과한 데이터만 집계한다.

### Issue Schema
```typescript
type Issue = {
  id: string;
  type: string;                // e.g., "CAPTION_STYLE_MISMATCH"
  severity: "info" | "warn" | "error";
  location: {
    paragraphIndex: number;    // Primary Anchor
    rawTextPreview: string;    // Verification
  };
  message: string;             // User-facing text
  trace: {                     // Debugging & Explanation
    gatePassed: boolean;
    ruleId?: string;
    expected?: string;
    found?: string;
  };
  actions: Array<
    | { kind: "GOTO" }
    | { kind: "APPLY_FIX"; patch: string } // Safe fixes only
  >;
};
```
