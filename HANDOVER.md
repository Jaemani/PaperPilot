# PaperPilot Project Handover & Developer Guide

## 1. Project Overview
**PaperPilot**은 연구자가 논문 작성 중 실시간으로 용어, 인용, 포맷을 검증하고 수정할 수 있는 **Word Add-in**입니다.
단순한 LLM Wrapper가 아니라, **Word Document 구조를 이해하고 정밀하게 제어하는 엔지니어링 툴킷**을 지향합니다.

### 🏛️ Core Philosophy (핵심 철학)
1.  **LLM as a Parser, Code as a Judge**: 
    - LLM에게 "고쳐줘"라고 시키지 않습니다. "분석해줘"라고 시킨 뒤, 검증과 수정은 **결정론적 규칙(Deterministic Rule)**으로 코드가 수행합니다.
2.  **Gate First**: 
    - 무조건 분석하지 않습니다. 정규식(Regex)으로 "이것이 캡션 후보인가?"를 엄격하게 먼저 거릅니다. (비용 절감 & 오탐 방지)
3.  **Evidence-Based**: 
    - 모든 수정 제안은 "왜 틀렸는지(Trace)"와 "어떤 규정(Rule)에 근거했는지"를 사용자에게 설명해야 합니다.

---

## 2. Current Status (v1.0.1)

### 🛠️ Tech Stack
- **Add-in (client)**: React + TypeScript + Office.js — deployed on **Vercel** (`paper-pilot-demo.vercel.app`)
- **Server**: Node.js (Express) + TypeScript + OpenAI API (GPT-5) — deployed on **Railway** (`paperpilot-server.up.railway.app`)
- **Data**: `journalFormats.json` (20 profiles, all `"verified"`)

### 🌟 Implemented Features
| Feature | Logic | Status | Key Point |
| :--- | :--- | :--- | :--- |
| **Full Check (Submission Readiness)** | 5 scans parallel | ✅ Active | Score badge, Fix buttons inline, scan logs |
| **Format Check** | Client Indexer + Regex | ✅ Active | Caption text + style scan, One-click Fix |
| **Layout Check** | Word API + profile rules | ✅ Active | Font, size, line spacing, margins, page size — auto-fix |
| **Heading Check** | Word API paragraph.style | ✅ Active | H1/H2/H3 font size + bold vs. profile spec, per-issue Fix |
| **Reference Check** | Paragraph scan | ✅ Active | Detects section, counts entries, validates sequential numbering |
| **Cite Check** | Client Indexer + Regex | ✅ Active | `[1,2]` → `[1], [2]` fix via range.search() |
| **Term Check** | Server (LLM) + Context | ✅ Active | Formal synonym suggestions |
| **UI** | Fluent UI v9 | ✅ Active | 3-level dropdown (doc type → sub-type → profile), Dev Inspector |

### 📦 Deployment Workflow
```
# Changes to add-in code:
npm run build && vercel --prod
# Word: Remove old add-in, sideload dist/manifest.xml again (only if manifest URL changed)
# If only JS/HTML changed (no manifest URL change): Word hot-reloads automatically

# Changes to server:
cd ../server && git push railway main  (or Railway auto-deploys on git push)
```

---

## 3. Setup Guide (New Machine)

### Prerequisites
- Node.js (v18+)
- npm
- Office 365 Account (Word Online 접속용)

### Installation
1. **Clone Repository**:
   ```bash
   git clone https://github.com/Jaemani/PaperPilot.git
   cd PaperPilot
   ```

2. **Install Dependencies**:
   ```bash
   # Root (Client)
   npm install
   
   # Server
   cd server
   npm install
   ```

3. **Configure Environment**:
   - `server/.env` 파일을 생성하고 `OPENAI_API_KEY=sk-...` 입력.

4. **Launch**:
   - **Terminal 1 (Server)**:
     ```bash
     cd server && npm start
     ```
   - **Terminal 2 (Client)**:
     ```bash
     npm run dev-server
     ```
   - **Browser**: `https://localhost:3000/taskpane.html` 접속 -> "고급" -> "안전하지 않음으로 이동" (인증서 승인).
   - **Word Online**: `manifest.xml` 업로드.

---

## 4. Troubleshooting & Debugging

### Q1. "Scan All" 결과가 0개입니다.
- **원인**: 문서의 캡션 패턴이 현재 선택된 프로필의 `detect.regex`와 일치하지 않기 때문입니다.
- **해결**:
  1. UI 하단의 `Dev Tools: Inspector`를 엽니다.
  2. 문서의 캡션을 클릭하고 `Inspect`를 눌러 텍스트가 정확히 무엇인지 확인합니다. (예: "그림 1"인데 룰은 "Figure 1"을 찾고 있음)
  3. `journalFormats.json`에서 해당 프로필의 `detect.regex`를 수정합니다.

### Q2. "Scan Citation" 에러 (InvalidArgument)
- **원인**: `body.search`에 와일드카드 특수문자(`[`, `]`) 이스케이프가 잘못됨.
- **해결**: v0.5.6에서 Paragraph Scan 방식으로 변경하여 해결됨. 최신 코드인지 확인하세요.

### Q3. Fix를 해도 폰트가 안 바뀝니다.
- **원인**: Word API의 `insertText`는 기본적으로 현재 커서의 스타일을 상속받습니다.
- **해결**: `replaceParagraphText` 함수는 텍스트 교체 후 `paragraph.font` 프로퍼티를 명시적으로 설정합니다.

### Q4. Line spacing Fix를 눌러도 바뀌지 않습니다.
- **원인**: `@types/office-js` v1.0.569에 `lineSpacingRule` 타입이 없음. `(p as any).lineSpacingRule = "multiple"` 은 Office.js 프록시 setter를 우회하여 실제 적용되지 않음.
- **해결**: v0.9.0에서 `lineSpacingRule` 설정을 제거. Word API 문서 ("In the Word UI, this value is divided by 12")에 근거해 `p.lineSpacing = (pct/100) * 12` 만 사용. 스캔도 동일 공식 적용.

### Q5. Citation Fix를 눌렀더니 문단이 `[1], [2]`로만 바뀌었습니다.
- **원인**: `paragraph.insertText(suggestion, "replace")` 는 문단 전체를 교체함.
- **해결**: v0.9.0에서 `fixCitationIssue()` 도입. `paragraph.getRange().search(bracketText)` 로 해당 브라켓만 찾아 `range.insertText(suggestion, "replace")` 적용.

---

## 5. Future Roadmap

### v1.1.0: Cross-Reference Integrity (인용 무결성 교차검증)
- **목표**: 본문의 `[1]`이 References 섹션의 실제 항목과 1:1로 매칭되는지 검사.
- **기술**: `scanReferences()`로 빌드된 ID 목록과 `scanCitations()` 결과를 교차 비교.

### v1.2.0: Custom Rule Builder
- **목표**: 사용자가 직접 "우리 학교 포맷"을 등록할 수 있는 UI.
- **기술**: `journalFormats.json`을 로컬 스토리지 또는 사용자 DB로 분리.

---

## 6. Engineering Notes (For Maintainers)
- **Regex Hell**: JSON 내 정규식은 반드시 이중 백슬래시(`\\`)를 사용해야 합니다. `taskpane.ts`에서 `new RegExp`로 생성할 때 이스케이프가 풀리는 것을 고려하세요.
- **Line spacing unit**: Word JS API `paragraph.lineSpacing` is always in "line units" where 12 = single spacing (confirmed by API docs: "In the Word UI, this value is divided by 12"). Use `lineSpacing / 12 * 100` for percentage. Do NOT rely on `lineSpacingRule` — it is absent from `@types/office-js` v1.0.569 and the `any`-cast setter is unreliable.
- **Citation fix**: Always use `paragraph.getRange().search(text).insertText(replacement, "replace")` — never `paragraph.insertText(text, "replace")` which wipes the whole paragraph.
- **Batch fixes**: For any "Apply All" operation, always use a single `Word.run` context — queue all loads, all searches, and all writes before syncing. Serial `Word.run` calls with per-issue syncs accumulate stale indices and are 3× slower. See `applyAllCaptionFixes` / `applyAllCitationFixes` in `taskpane.ts` for the pattern.
- **API_SERVER_URL**: Embedded at build time via `webpack DefinePlugin` as `__API_SERVER_URL__`. In dev it is empty string (proxy handles routing). In prod it must be set as a Vercel environment variable before build.
- **Performance**: `body.paragraphs.load` slows on long documents (100+ pages). Scan is capped at 50 paragraphs for layout; full scan for citations/captions (no cap yet).
- **Manifest reload**: After `vercel --prod`, Word reloads JS/HTML automatically on next panel open. Only re-sideload `dist/manifest.xml` if the manifest XML itself changed (URLs, version, permissions).
- **Full technical spec**: See `TECHNICAL_REPORT.md` for architecture, scan/fix internals, Word API gotchas, and engineering decision rationale.
