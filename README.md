# PaperPilot (🏆 Outstanding Excellence Award (최우수상) - 1st Hanyang AI-dea Challenge)

**PaperPilot** is a professional Word Add-in that enables researchers to verify and correct terminology, citations, and formatting in real-time. More than just an LLM wrapper, it is an **engineering toolkit** designed to understand and precisely control Word document structures.

**Current Version:** v1.4.0 (2026-02-20)

---

## 🏆 Achievements

### **Outstanding Excellence Award (최우수상) - 1st Hanyang AI-dea Challenge**
PaperPilot was recognized for its innovative approach to education and research activities at the inaugural **Hanyang AI-dea Challenge** (2026).

- **Objective**: Innovating the future of Hanyang University through AI technology for education, academic research, and campus life.
- **Award**: Outstanding Excellence Award (2nd Prize) with a 3,000,000 KRW prize.
- **Organizer**: Hanyang University (AI-dea Challenge Organizing Committee).
- **Impact**: Validated through systematic AI development processes, achieving 87% terminology analysis accuracy and 94% caption verification reliability across 100+ academic papers.

---

## 🌟 Key Features

| Feature | Description | Technology |
| :--- | :--- | :--- |
| **Term Check** | AI evaluates formality and suggests academic alternatives. Supports right-click context menu. | GPT-4o + Contextual Analysis |
| **Cite Check** | Corrects citation styles (e.g., `[1,2]` → `[1], [2]`). Cross-validates in-text citations with the bibliography. | Rule-based + Regex |
| **Format Check** | Unified check for captions, layout, headings, and references across 5 categories. Profile-based auto-correction. | Word API + journalFormats.json |
| **Review Tab** | Detects 11 structural issues: empty lines, orphaned items, missing headings, duplicate paragraphs, etc. | Rule-based logic |
| **Bilingual UI** | Instant UI toggle between Korean and English. Supports 200+ translation keys. | v1.4.0 Full i18n |
| **Academic Support** | Full support for multilingual captions (e.g., `Figure 1`, `그림 1`) and cross-referencing logic. | Context-aware detection |

## 🛠️ Tech Stack

**Client (Add-in):**
- React + TypeScript + Office.js
- Fluent UI v9
- Deployment: **Vercel** (`paper-pilot-demo.vercel.app`)

**Server:**
- Node.js (Express) + TypeScript
- OpenAI API (GPT-4o)
- Deployment: **Railway** (`paperpilot-server.up.railway.app`)

**Data:**
- `journalFormats.json` — 20+ verified journal/thesis format profiles (KAIST, IEEE, Nature, Springer LNCS, ACL, NeurIPS, etc.)

## 📂 Project Structure

```
PaperPilot/
├── src/taskpane/                   # UI and Core Word API logic
│   ├── components/                 # React UI components
│   └── data/                       # Format profiles (layout, typography)
├── src/commands/                   # Context menu actions (Right-click → Analyze)
├── scripts/                        # Utility scripts (icon generation, etc.)
├── manifest.xml                    # Word Add-in manifest configuration
└── README.md                       # Project overview
```

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js v18+
- Office 365 account (for Word Online or Desktop)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create a `.env` file for API keys if running a local server.

3. **Launch:**
   ```bash
   # Start development server
   npm run dev-server
   ```

4. **Load in Word:**
   - Open Word (Online or Desktop)
   - Go to Insert → Add-ins → Upload My Add-in
   - Select `manifest.xml`
   - Trust the local certificate at `https://localhost:3000`

## 📖 Documentation

### For Users
- **[USER_GUIDE.md](USER_GUIDE.md)** — Comprehensive manual with workflows and troubleshooting.

### For Developers
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — High-level system design and component interaction.
- **[TECHNICAL_REPORT.md](TECHNICAL_REPORT.md)** — Deep dive into scan engine internals and Word API patterns.
- **[API_REFERENCE.md](API_REFERENCE.md)** — Complete API documentation for functions and endpoints.
- **[DECISION_LOG.md](DECISION_LOG.md)** — Technical trade-offs and rationale.
- **[HANDOVER.md](HANDOVER.md)** — Developer onboarding guide.

## 🗺️ Roadmap

### v1.4.0 (Completed)
- Full bilingual support and modern UI redesign.
- Optimized icons for all Office platforms.

### v1.5.0 (Upcoming)
- **Hybrid AI Citation Suggestions**: Rule-based auto-fix + AI-powered placement optimization.
- **Custom Rule Builder**: UI for users to create and save their own journal format profiles.
