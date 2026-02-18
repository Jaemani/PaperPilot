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

## 2. Current Status (v0.6.0)

### 🛠️ Tech Stack
- **Client**: React + TypeScript + Office.js (Yeoman Generator)
- **Server**: Node.js (Express) + TypeScript + OpenAI API (GPT-4o/5)
- **Data**: `journalFormats.json` (대학/저널별 포맷 규칙 DB)

### 🌟 Implemented Features
| Feature | Logic | Status | Key Point |
| :--- | :--- | :--- | :--- |
| **Format Check** | Client Indexer + Regex | ✅ Active | 문서 전체 `Fig.` 스캔, 폰트/스타일 검증, One-click Fix |
| **Cite Check** | Client Indexer + Regex | ✅ Active | `[1,2]` 오류 탐지, Reference 정합성 검사(기초) |
| **Term Check** | Server(LLM) + Context | ✅ Active | 문단 문맥을 고려한 학술적 용어 추천 |
| **UI** | Fluent UI | ✅ Active | 3단 계층형 선택(대학/저널), Inspector(디버그) |

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
- **해결**: v0.6.0의 `replaceParagraphText` 함수는 텍스트 교체 후 `paragraph.font.set(rule)`을 명시적으로 호출하여 스타일을 강제 적용합니다.

---

## 5. Future Roadmap (To-Do)

### v0.7.0: Reference Integrity (인용 무결성)
- **목표**: 본문의 `[1]`이 실제 맨 뒤 `References` 섹션에 존재하는지 검사.
- **기술**: References 섹션 헤딩(`References`)을 찾아 그 이후의 문단을 파싱하여 ID 목록 구축.

### v0.8.0: Advanced Layout Check
- **목표**: 여백(Margin), 다단(Column) 설정 검사.
- **한계**: Word JS API의 `pageSetup`은 데스크톱 버전에서만 완벽하게 동작할 수 있음. (환경 체크 로직 필요)

### v1.0.0: Custom Rule Builder
- **목표**: 사용자가 직접 "우리 학교 포맷"을 등록할 수 있는 UI 제공.
- **기술**: `journalFormats.json`을 로컬 스토리지나 사용자 DB로 분리.

---

## 6. Engineering Notes (For Maintainers)
- **Regex Hell**: JSON 내 정규식은 반드시 이중 백슬래시(`\\`)를 사용해야 합니다. `taskpane.ts`에서 `new RegExp`로 생성할 때 이스케이프가 풀리는 것을 고려하세요.
- **Performance**: `body.paragraphs.load`는 문서가 길어지면(100페이지+) 느려집니다. 추후 `load`를 청크 단위(50개씩)로 끊어서 가져오는 로직(Pagination)이 필요합니다.
