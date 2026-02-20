# PaperPilot

**PaperPilot**은 연구자가 논문 작성 중 실시간으로 용어, 인용, 포맷을 검증하고 수정할 수 있는 **Word Add-in**입니다.
단순한 LLM Wrapper가 아니라, **Word Document 구조를 이해하고 정밀하게 제어하는 엔지니어링 툴킷**을 지향합니다.

**Current Version:** v1.3.1 (2026-02-20)

## 🌟 Key Features

| Feature | Description | Technology |
| :--- | :--- | :--- |
| **Term Check** | 선택한 용어의 격식성(formality)을 AI가 평가하고 대체어 제안. 우클릭 컨텍스트 메뉴 지원. | GPT-4o + 문맥 분석 |
| **Cite Check** | `[1,2]` → `[1], [2]` 형태 교정. 본문 인용 번호 ↔ 참고문헌 목록 교차 검증. | Rule-based + regex |
| **Format Check** | 캡션·레이아웃·제목·참고문헌 5종 통합 검사. 프로필 기반 자동 교정. | Word API + journalFormats.json (20개 프로필) |
| **Review Tab** | 11가지 구조 문제 검출: 빈 줄, 고아 항목, 제목 누락, 중복 문단, 약어 순서, 그림 미인용 등 | Rule-based, AI 불필요 |
| **Korean Support** | 한글 캡션(`그림 1`) 및 본문 참조(`그림 1. 는...`) 완전 지원. | v1.3.1 josa detection |

## 🛠️ Tech Stack

**Client (Add-in):**
- React + TypeScript + Office.js
- Fluent UI v9
- Deployed on **Vercel** (`paper-pilot-demo.vercel.app`)

**Server:**
- Node.js (Express) + TypeScript
- OpenAI API (GPT-4o)
- Deployed on **Railway** (`paperpilot-server.up.railway.app`)

**Data:**
- `journalFormats.json` — 20 verified journal/thesis format profiles (KAIST, IEEE, Nature, Springer LNCS, ACL, NeurIPS, etc.)

## 📂 Project Structure

```
PaperPilot/
├── src/taskpane/
│   ├── taskpane.ts                   # All Word API logic (scan/fix functions)
│   ├── components/App.tsx            # React UI (4 tabs: Term/Cite/Format/Review)
│   └── data/journalFormats.json      # Format profiles (layout, typography, captions)
├── src/commands/commands.ts          # Context menu actions (right-click → Analyze Term)
├── server/src/index.ts               # Express server (LLM endpoints)
├── manifest.xml                      # Word Add-in manifest (sideloaded)
└── dist/                             # Built output (deployed to Vercel)
```

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js v18+
- Office 365 account (for Word Online)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install
   ```

2. **Configure server:**
   ```bash
   # server/.env
   OPENAI_API_KEY=sk-...
   ```

3. **Launch:**
   ```bash
   # Terminal 1: Server
   cd server && npm start

   # Terminal 2: Client
   npm run dev-server
   ```

4. **Load in Word:**
   - Open [Word Online](https://word.new)
   - Insert → Add-ins → Upload My Add-in → Select `manifest.xml`
   - Accept certificate warning at `https://localhost:3000/taskpane.html`

### Deployment

```bash
# Client (Vercel)
npm run build && vercel --prod

# Server (Railway)
cd server && git push railway main
```

## 📖 Documentation

- **CHANGELOG.md** — Full version history with implementation details
- **HANDOVER.md** — Developer onboarding guide (setup, troubleshooting, roadmap)
- **TECHNICAL_REPORT.md** — Architecture, scan engine internals, Word API patterns, engineering decisions
- **ARCHITECTURE.md** — High-level system design
- **DECISION_LOG.md** — Key technical trade-offs and rationale

## 🗺️ Roadmap

### v1.4.0 (Next)
- **Hybrid AI Citation Suggestions**: Rule-based auto-fix + AI-powered placement/style optimization (profile-aware, batch LLM calls)
- **Term Analysis with Profile Context**: Pass `profileId` to LLM for domain-specific term evaluation (e.g., IEEE vs Nature vocabulary preferences)

### v1.5.0
- **Custom Rule Builder**: UI for users to create and save their own journal format profiles

### Future
- **Real-time collaboration**: Multi-user document review with shared annotations
- **Export compliance report**: PDF summary of all checks for submission packages
