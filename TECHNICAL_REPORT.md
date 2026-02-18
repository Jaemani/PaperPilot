# PaperPilot — Technical Report
**Version:** v1.1.7 · **Date:** 2026-02-19
**Audience:** Contributing developers and team members

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Core Philosophy — Why This Design?](#2-core-philosophy--why-this-design)
3. [Format Rule Profiles (journalFormats.json)](#3-format-rule-profiles)
4. [Scan Engine — How Each Check Works](#4-scan-engine)
5. [Fix Engine — How Fixes Are Applied](#5-fix-engine)
6. [Word JS API Patterns and Gotchas](#6-word-js-api-patterns-and-gotchas)
7. [Server — LLM Integration](#7-server--llm-integration)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Known Limitations](#9-known-limitations)
10. [Engineering Decisions Log](#10-engineering-decisions-log)
11. [Scan Reference Guide — What We Check & How](#11-scan-reference-guide)
12. [Feature Verification Report (v1.1.7)](#12-feature-verification-report)

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────┐
│  Word Online (Office 365)                            │
│  ┌────────────────────────────────────────────────┐  │
│  │  Task Pane (Word Add-in)                       │  │
│  │                                                │  │
│  │  App.tsx (React UI + state)                    │  │
│  │    ↕ calls                                     │  │
│  │  taskpane.ts (Word API logic)                  │  │
│  │    ↕ Word.run()                                │  │
│  │  Office.js proxy layer                         │  │
│  └─────────────────┬──────────────────────────────┘  │
│                    ↕ Word JS API (OOXML proxy)        │
│  Word Document (DOM / OOXML)                         │
└──────────────────────────────────────────────────────┘
            ↕ HTTPS /analyze/*
┌──────────────────────────────────────────────────────┐
│  Express Server (Railway)                            │
│  /analyze/term   → OpenAI (term formality check)     │
│  /analyze/format → OpenAI (caption structure parse)  │
│  /analyze/cite   → OpenAI (claim classification)     │
└──────────────────────────────────────────────────────┘
```

**Deployments:**
- Add-in static bundle: `paper-pilot-demo.vercel.app` (Vercel)
- API server: `paperpilot-server.up.railway.app` (Railway)
- Manifest: `dist/manifest.xml` (sideloaded into Word Online)

### File Map

```
PaperPilot/
├── src/taskpane/
│   ├── taskpane.ts          ← All Word API logic, scan & fix functions
│   ├── components/App.tsx   ← React UI, state management, event handlers
│   └── data/
│       └── journalFormats.json  ← 20 format profiles
├── server/src/index.ts      ← Express + OpenAI endpoints
├── manifest.xml             ← Word Add-in manifest (sideloaded)
├── webpack.config.js        ← Build config, DefinePlugin for API_SERVER_URL
└── dist/                    ← Built output (deployed to Vercel)
```

---

## 2. Core Philosophy — Why This Design?

### LLM as a Parser, Code as a Judge

The add-in is **not** a "paste your paper, let AI fix it" tool. That approach is expensive, slow, non-deterministic, and produces unjustifiable changes.

Instead:
- **LLM tasks**: Classify vague things (is this term informal? does this sentence need a citation?).
- **Code tasks**: Pattern matching, rule validation, and deterministic fixes.

| Task | Who does it | Why |
|------|-------------|-----|
| "Is `[1,2]` the wrong bracket format?" | Regex | Zero cost, 100% reliable, deterministic |
| "What is the dominant body font in this document?" | Word API + JS | Deterministic measurement |
| "Is `utilize` too informal?" | LLM (GPT-5) | Semantic judgment — no regex can do this |
| "Apply font = Times New Roman to body paragraphs" | Word API | Direct write — no LLM needed |

### Gate First, Analyze Later

Every scan runs a **regex gate** before any expensive logic. A paragraph must pass the gate to be considered a caption candidate. This prevents false positives on regular body text and avoids wasted computation.

Example: for a caption gate, the paragraph must start with `Figure|Fig.|Table` followed by a digit. Only then is the paragraph analyzed for format compliance.

### Evidence-Based Feedback

Every issue in the UI shows:
1. **What is wrong** (e.g., "Body font: 'Arial' (expected 'Times New Roman')")
2. **What the rule is** (profile name + field)
3. **Current vs. expected value** (shown side by side)

The user never sees "there's a problem" without knowing exactly what it is and how to fix it.

---

## 3. Format Rule Profiles

### File: `src/taskpane/data/journalFormats.json`

Schema version: **0.7.0** — 20 profiles, all `"verified"`.

#### Profile Schema (TypeScript equivalent)

```typescript
interface JournalProfile {
  id: string;          // e.g. "kaist_grad_thesis"
  name: string;        // display name
  category: string;    // "thesis" | "journal"
  region: string;      // "KR" | "US" | "EU"
  status: "verified" | "todo" | "partial";
  rules: {
    layout: {
      pageSize: "A4" | "Letter";
      columns: 1 | 2;
      margins: { top: number; bottom: number; left: number; right: number }; // cm
    };
    typography: {
      body: {
        fontName: string;       // e.g. "Times New Roman"
        fontSize: number;       // pt
        lineSpacingPct: number; // 100=single, 150=1.5×, 200=double
      };
      headings: {
        h1: { fontSize: number; isBold: boolean };
        h2: { fontSize: number; isBold: boolean };
        h3?: { fontSize: number; isBold: boolean };
      };
    };
    captionStyle: {
      figure: {
        detect: { regex: string; flags: string }; // for RegExp gating
        validate: {
          expectedPrefix: string;  // "Figure" | "Fig." | "그림" etc.
          separator: string;       // "." | ":" | " "
          numberStyle: "arabic";
        };
        format?: {
          fontName?: string;
          fontSize?: number;
          isBold?: boolean;
          alignment?: "Center" | "Left" | "Right";
        };
      };
      table: { /* same shape as figure */ };
    };
  };
}
```

#### Profile List (20 profiles)

| ID | Name | Page | Cols | Body Font | Body pt | Line% |
|----|------|------|------|-----------|---------|-------|
| `kaist_grad_thesis` | KAIST | A4 | 1 | Times New Roman | 11 | 150 |
| `hyu_grad_thesis` | 한양대학교 | A4 | 1 | Batang | 10 | 160 |
| `postech_grad_thesis` | POSTECH | A4 | 1 | Times New Roman | 11 | 150 |
| `snu_grad_thesis` | 서울대학교 | A4 | 1 | Times New Roman | 10 | 150 |
| `yonsei_grad_thesis_kor` | 연세대학교 | A4 | 1 | 신명조 | 10 | 200 |
| `skku_grad_thesis` | 성균관대학교 | A4 | 1 | 바탕 | 10 | 160 |
| `ieee_journals_general` | IEEE Transactions | A4 | 2 | Times New Roman | 10 | 110 |
| `acm_reference_format` | ACM | Letter | 2 | Linux Libertine | 9 | 110 |
| `aaai_conference` | AAAI | Letter | 2 | Times New Roman | 10 | 110 |
| `springer_lncs` | Springer LNCS | A4 | 1 | Computer Modern | 10 | 110 |
| `elsevier_article` | Elsevier | A4 | 1 | Times New Roman | 10 | 120 |
| `neurips_conference` | NeurIPS | Letter | 1 | Times New Roman | 10 | 110 |
| `icml_conference` | ICML | Letter | 2 | Times New Roman | 10 | 110 |
| `acl_emnlp` | ACL / EMNLP | Letter | 2 | Times New Roman | 11 | 110 |
| `mdpi_article` | MDPI | A4 | 1 | Palatino Linotype | 10 | 135 |
| `wiley_njd` | Wiley NJD | A4 | 1 | Times New Roman | 10 | 110 |
| `nature_numbered_superscript` | Nature Portfolio | A4 | 1 | Times New Roman | 10 | 110 |
| `ksds_design_works` | 한국디자인학회 | A4 | 1 | 맑은 고딕 | 9 | 130 |
| `kiise_jok` | 한국정보과학회 | A4 | 2 | 신명조 | 9 | 130 |
| `kics_journal` | 한국통신학회 | A4 | 2 | 신명조 | 10 | 130 |

#### UI Selection Tree

```
학위논문 (thesis)
  ├── KAIST, 한양대, POSTECH, 서울대, 연세대, 성균관대

저널/학회 (journal)
  ├── 국내
  │   └── 한국디자인학회, 한국정보과학회, 한국통신학회
  └── 국외
      └── IEEE, ACM, AAAI, Springer LNCS, Elsevier, NeurIPS,
          ICML, ACL/EMNLP, MDPI, Wiley, Nature
```

#### Regex Notes

JSON stores regexes as strings with **double-escaped** backslashes. `"^(Figure|Fig\\.)\\s*\\d+"` in JSON → `"^(Figure|Fig\.)\s*\d+"` as a JS string → `/^(Figure|Fig\.)\s*\d+/i` as a RegExp.

**Rule**: every regex backslash in `journalFormats.json` must be `\\`. A single `\s` becomes the literal characters `s*`, causing zero matches or false positives.

---

## 4. Scan Engine

All scan functions live in `taskpane.ts` and return a typed `ScanResult<T>`:

```typescript
interface ScanResult<T> {
  issues: T[];
  stats: { totalParagraphs: number; candidatesFound: number; issuesFound: number };
  logs: string[];  // shown in collapsible accordion in UI
}
```

General pattern:
```
scanX(profileId):
  1. Load profile rules → if no rules, return empty result
  2. Word.run:
       load document data → sync
       loop / measure → compare to rules → build issues[]
  3. return { issues, stats, logs }
```

`generateSubmissionReport(profileId)` runs all 5 scans **in parallel** via `Promise.all`:
```typescript
const [captionResult, citeResult, layoutResult, headingResult, referenceResult] =
  await Promise.all([
    scanCaptions(profileId),
    scanCitations(profileId),
    scanLayout(profileId),
    scanHeadings(profileId),
    scanReferences(profileId),
  ]);
```
Each scan creates its own `Word.run` context, so they run concurrently without interference.

---

### 4.1 scanCaptions

**Gate**: paragraph text matches `captionStyle.figure.detect.regex` (e.g. `/^(Figure|Fig\.)\s*\d+/i`)

**Validate**:
1. **Text check**: starts with `expectedPrefix` AND matches `/^{prefix}\s*\d+{separator}/`
2. **Style check** (if profile has `captionStyle.figure.format`): `p.font.name` and `p.font.bold` match

**Suggestion construction** (used by Fix):
```
match = text.match(/^(Figure|Fig\.|Table|그림|표)\.?\s*(\d+)[:.| ]?\s*(.*)/)
suggestion = `${expectedPrefix} ${match[2]}${separator} ${match[3]}`
```
Style issues use `suggestion = text` (text unchanged; fix reapplies the font/bold).

---

### 4.2 scanCitations

**No gate** — scans all paragraphs.

**Detection**: `/\[(\d+(?:\s*,\s*\d+)+)\]/g` — combined brackets like `[1,2]`, `[1, 2, 3]`.

**Fix suggestion**: split inner numbers → `[1], [2]`.

Also counts single `[\d+]` brackets as a confidence check — logged but not flagged as issues.

---

### 4.3 scanLayout

Two sub-scans in one `Word.run`:

**A. Page setup** (requires Word API 1.9+ — `sections.items[0].body.pageSetup`):

| Property | Unit | Conversion |
|----------|------|-----------|
| `topMargin`, `bottomMargin`, `leftMargin`, `rightMargin` | pt | ÷ 28.35 → cm |
| `pageWidth`, `pageHeight` | pt | A4 = 595.3×841.9, Letter = 612×792 (±8 pt tolerance) |

Column count: best-effort OOXML parse — `body.getRange().getOoxml()` → look for `w:cols w:num="N"` or count `<w:col ` elements. Falls back to manual-check hint.

**B. Typography** (first 50 body paragraphs, skips paragraphs < 20 chars):

- `font.name` → dominant by frequency
- `font.size` → dominant (rounded to 0.5 pt)
- `lineSpacing` → average → `Math.round((spacing / 12) * 100)` → percentage

Tolerances: margins ±0.3 cm · font size ±0.5 pt · line spacing ±20%.

---

### 4.4 scanHeadings

**Gate**: `paragraph.style === "Heading 1"` / `"Heading 2"` / `"Heading 3"` (exact Word style name).

**Validate** against `typography.headings.h{level}`:
- `font.size` — tolerance ±0.5 pt
- `font.bold` — exact boolean match

One `HeadingIssue` per failing property per paragraph (a heading with wrong size AND wrong bold creates two issues).

**Requirement**: Headings must use Word's built-in "Heading N" paragraph styles. Manually bolded/enlarged text is invisible to this scan.

---

### 4.5 scanReferences

**Algorithm**:
1. Find a paragraph matching `/^(References|Bibliography|참고문헌|Reference List)\s*$/i`
2. Collect all non-empty paragraphs after that heading
3. Detect numbering format per entry: `[1]`, `(1)`, or `1.`
4. Verify sequential order (gaps → `ref_seq_error`)

**Issues generated**:

| ID | Severity | Condition |
|----|----------|-----------|
| `ref_no_section` | warn | No References heading found |
| `ref_empty_section` | error | Heading found, no entries follow |
| `ref_no_numbering` | warn | > 50% of entries have no recognizable numbering |
| `ref_seq_error` | error | Non-sequential number gap detected |

---

## 5. Fix Engine

### Fix Function Map

| Function | Scope | Word API writes |
|----------|-------|-----------------|
| `replaceParagraphText(idx, text, profileId)` | One paragraph | `paragraph.insertText(replace)` + `paragraph.font.*` |
| `fixCitationIssue(issue)` | One bracket in one paragraph | `range.search(text).insertText(replace)` |
| `applyAllCaptionFixes(issues, profileId)` | All caption issues, one `Word.run` | Batch `paragraph.insertText` + `paragraph.font.*` |
| `applyAllCitationFixes(issues)` | All citation issues, one `Word.run` | Batch `range.search` → batch `range.insertText` |
| `fixLayoutIssue(issue, profileId)` — typography | All body paragraphs | `paragraph.font.*` + `paragraph.lineSpacing` |
| `fixLayoutIssue(issue, profileId)` — margins | `pageSetup` | `pageSetup.topMargin/bottomMargin/leftMargin/rightMargin` (pt) |
| `fixLayoutIssue(issue, profileId)` — page_size | `pageSetup` | `pageSetup.pageWidth/pageHeight` (pt) |
| `fixHeadingIssue(issue, profileId)` | One heading paragraph | `paragraph.font.size` / `paragraph.font.bold` |

### The Apply All Problem — Three Versions

Apply All had two separate bugs in succession, each fixed in a new version.

#### v1.0.0 — Original (broken)

```typescript
// handleApplyAllFixes
for (const issue of scanCaptionData.issues) {
  await replaceParagraphText(issue.paragraphIndex, issue.suggestion, profileId);
}
handleScanCaptions(); // ← NOT awaited
```

**Bug**: `handleScanCaptions()` was not awaited. The rescan ran concurrently with `setIsLoading(false)`. React could batch-render the old state and the new loading state in an order where the old issue list survived. Additionally, each `replaceParagraphText` creates its own `Word.run`, so fix #2 uses the original `paragraphIndex` from the scan — if fix #1 caused Word to shift paragraph numbering (e.g., `insertText` with a newline creates a new paragraph), fix #2 would target the wrong paragraph.

#### v1.0.1 — Batch approach (still broken)

```typescript
// handleApplyAllFixes
await applyAllCaptionFixes(scanCaptionData.issues, profileId); // single Word.run
await handleScanCaptions(); // ← now awaited
```

`applyAllCaptionFixes` batches all fixes into one `Word.run` — no index drift. But three new bugs emerged:

**Bug 1 — `isLoading` state conflict**: `handleScanCaptions` internally calls `setIsLoading(true)` and `setIsLoading(false)`. Now two functions fight over the same state flag. React's render scheduler could resolve state updates from the inner and outer function in an order where the old `scanCaptionData` survived a render pass, leaving old issues visible even after the fix and rescan completed.

**Bug 2 — Silent batch failure**: `applyAllCaptionFixes` and `applyAllCitationFixes` have `try/catch` that swallows errors silently. If the `Word.run` fails (API error, context issue), the function returns as if it succeeded. The caller then rescans, finds unchanged issues, and sets the same data — Apply All button stays visible, fixes never applied.

**Bug 3 — Non-awaited rescan in `handleApplySingleFix`**: The individual fix path had the same non-await problem: `handleScanCaptions()` was still called without `await`, causing the same race as v1.0.0.

#### v1.0.2 — Current (correct)

```typescript
// handleApplyAllFixes
const issuesToFix = [...scanCaptionData.issues]; // 1. snapshot
setScanCaptionData(null);                         // 2. clear UI immediately

for (const issue of issuesToFix) {               // 3. serial fixes — same path as
  await replaceParagraphText(...);               //    individual Fix (confirmed working)
}

setScanCaptionData(await scanCaptions(profileId)); // 4. direct rescan, no delegation
```

Key design decisions:
- **Snapshot first**: issues list is copied before touching any state, so clearing state doesn't affect what gets fixed.
- **Clear immediately**: `setScanCaptionData(null)` removes the Apply All button and individual Fix buttons **the moment the user clicks**. The document is not yet changed. This is correct UX — the user knows their action was received.
- **Serial fixes**: uses `replaceParagraphText` / `fixCitationIssue` — the exact same functions that individual Fix uses. If individual Fix works, Apply All works, by construction.
- **Direct rescan**: calls `await scanCaptions(profileId)` inline instead of delegating to `handleScanCaptions()`. No `isLoading` conflict. If any issues remain after fixing (e.g., a style issue that couldn't be auto-corrected), they reappear in the UI immediately.

```typescript
// handleApplySingleFix (also fixed in v1.0.2)
const handleApplySingleFix = async (issue) => {
  setIsLoading(true);
  if (issue.type === "citation") {
    await fixCitationIssue(issue);
    setScanCiteData(await scanCitations(profileId)); // direct rescan
  } else if (issue.paragraphIndex >= 0) {
    await replaceParagraphText(issue.paragraphIndex, issue.suggestion, profileId);
    setScanCaptionData(await scanCaptions(profileId)); // direct rescan
  }
  setIsLoading(false);
};
```

### Line Spacing Unit

`paragraph.lineSpacing` is in **"line units"** where 12 = 1 line (per `@types/office-js`: "In the Word UI, this value is divided by 12"):

| Value | Spacing |
|-------|---------|
| 12 | Single (100%) |
| 18 | 1.5× (150%) |
| 19.2 | 160% |
| 24 | Double (200%) |

```typescript
// Read
const pct = Math.round((p.lineSpacing / 12) * 100);

// Write
p.lineSpacing = (desiredPct / 100) * 12;
```

`lineSpacingRule` is absent from `@types/office-js` v1.0.569. Setting `(p as any).lineSpacingRule = "multiple"` creates a plain JS property on the proxy object — it is never transmitted to Word's runtime. This silently does nothing. Do not use it.

---

## 6. Word JS API Patterns and Gotchas

### 6.1 The Proxy Model — Queue → Sync → Read

Every operation on `Word.*` objects is **queued** and only executed at `context.sync()`. Reading before syncing throws `PropertyNotLoaded`.

```typescript
// CORRECT
p.load("text");
await context.sync();
console.log(p.text); // ✓

// WRONG
console.log(p.text); // ✗ PropertyNotLoaded
```

**Writing does not require a prior load** — set commands are queued without sync:
```typescript
p.font.name = "Times New Roman"; // queued
p.font.size = 11;                // queued
await context.sync();            // both written together
```

### 6.2 Batch Pattern

Minimise sync calls by queuing all loads, then syncing, then applying all writes, then syncing again:

```typescript
await Word.run(async (context) => {
  paragraphs.load("items");
  await context.sync();                        // 1 sync — load

  // queue all searches without syncing between
  const searches = issues.map(issue =>
    paragraphs.items[issue.idx].getRange().search(issue.text, { matchCase: true })
  );
  searches.forEach(s => s.load("items"));
  await context.sync();                        // 1 sync — materialise results

  searches.forEach((s, i) => {
    if (s.items.length > 0)
      s.items[0].insertText(fix[i], Word.InsertLocation.replace);
  });
  await context.sync();                        // 1 sync — commit writes
});
// Total: 3 syncs regardless of N issues
```

This pattern is implemented in `applyAllCaptionFixes` and `applyAllCitationFixes` in `taskpane.ts` for cases where direct batching is needed. However, **`handleApplyAllFixes` in App.tsx does NOT use these** — it uses the serial approach for reliability (see §5 Apply All). The batch functions remain available for future use or internal tooling.

### 6.3 `paragraph.insertText` vs `range.insertText`

| Method | What it replaces | Use for |
|--------|-----------------|---------|
| `paragraph.insertText(text, "replace")` | Entire paragraph content | Caption fix — replace whole caption |
| `range.insertText(text, "replace")` | Only the matched substring | Citation fix — replace `[1,2]` while preserving surrounding text |

**Never** use `paragraph.insertText` for citations. It replaces the whole paragraph with just the bracket, destroying all surrounding text.

### 6.4 `pageSetup` Availability

`sections.items[0].body.pageSetup` requires **Word API 1.9+**. On older clients it returns `undefined`. Always wrap in try/catch — the scan falls back to manual-check UI with expected values shown.

Properties (all in pt, readable and writable):
- `topMargin`, `bottomMargin`, `leftMargin`, `rightMargin` — convert to cm: pt ÷ 28.35
- `pageWidth`, `pageHeight` — A4: 595.3×841.9 pt; Letter: 612×792 pt (±8 pt detection tolerance)

### 6.5 Font Detection Limitation

`paragraph.font.name` returns **empty string** when the font is set at the **run (character) level** rather than the paragraph level. This is a Word API constraint — paragraph-level font is only defined when all runs share the same font.

**Implications**:
- `scanLayout` dominant-font heuristic ignores empty results; if all 50 paragraphs return empty, a `warn` is shown instead of pass/fail.
- `scanCaptions` style check: `"" !== "Times New Roman"` → always fails → issues may persist after fixing if the original runs had explicit character-level fonts.
- **Workaround for fix**: Use `p.getRange().font.name = "..."` to set font on the range (overrides all runs within). This is more reliable than `p.font.name = "..."` for enforcing style.

### 6.6 Column Count — OOXML Approach

Word JS API has no `columns` property. Parse the OOXML of `sections.items[0].body.getRange().getOoxml()`:
- `w:cols w:num="2"` attribute → explicit column count
- Count of `<w:col ` elements → one per column defined

**Caveat**: the content-range OOXML does not always include `<w:sectPr>` (section properties). When unavailable, the scan logs the failure and the Full Check report shows a manual-check item with the expected column count.

### 6.7 React State Management with Async Word.run

**Rule**: never delegate state updates to a sub-handler when the caller also manages state. Conflicting `setIsLoading(true/false)` calls between an outer handler and an inner helper can cause React to batch-render an intermediate state where stale data survives.

```typescript
// WRONG — outer handler and inner handleScanX both call setIsLoading
const handleApplyAllFixes = async () => {
  setIsLoading(true);
  await applyFixes();
  await handleScanCaptions(); // internally calls setIsLoading(true/false) — conflict
  setIsLoading(false);
};

// CORRECT — outer handler owns isLoading; scan result is set directly
const handleApplyAllFixes = async () => {
  setIsLoading(true);
  const snapshot = [...currentIssues];
  setData(null); // clear immediately
  await applyFixes(snapshot);
  setData(await scan(profileId)); // direct state update, no delegation
  setIsLoading(false);
};
```

---

## 7. Server — LLM Integration

### Endpoints

All on `paperpilot-server.up.railway.app`:

| Endpoint | Input | Output | Used for |
|----------|-------|--------|----------|
| `POST /analyze/term` | `{ term, context }` | `{ isInformal, suggestions[], reason }` | Term Check tab |
| `POST /analyze/format` | `{ rawCaption }` | `{ prefix, number, separator, content }` | (future use) |
| `POST /analyze/cite` | `{ sentence }` | `{ type: "GENERAL"\|"OWN"\|"EXTERNAL", reason }` | (future use) |

### Rate Limiting

`express-rate-limit`: 30 requests/minute per IP on all `/analyze/*` routes.

### Model

`gpt-5` via `openai.responses.create()` (Responses API). Returns `response.output_text` directly — not `response.choices[0].message.content` (Chat Completions API). The `@ts-ignore` comments in `server/src/index.ts` exist because `openai` SDK typings may not have the Responses API fully typed.

---

## 8. Deployment Architecture

### Add-in (Client)

```
Source: /src → webpack build → /dist
Deploy: vercel --prod
Word:   sideload dist/manifest.xml (only needed if manifest XML changed)
```

`webpack.config.js` injects `__API_SERVER_URL__` via `DefinePlugin`:
- **Dev**: empty string → `webpack-dev-server` proxy forwards `/analyze/*` to `http://localhost:3001`
- **Prod**: `https://paperpilot-server.up.railway.app` (set as Vercel env var `API_SERVER_URL` before build)

**When to re-sideload manifest.xml**: only when the manifest XML itself changes (URLs, version number, display name, permissions). JS/HTML changes are hot-reloaded by Word on next panel open.

### Server

```
cd server && git push railway main
```

Railway auto-deploys on push. Set `OPENAI_API_KEY` in Railway environment variables.

### Local Development

```bash
# Terminal 1 — server
cd server && npm start          # http://localhost:3001

# Terminal 2 — client
npm run dev-server              # https://localhost:3000

# Browser: accept self-signed cert at https://localhost:3000/taskpane.html
# Word Online: upload manifest.xml
```

---

## 9. Known Limitations

| Issue | Root Cause | Current Status |
|-------|-----------|----------------|
| `paragraph.font.name` returns empty | Font set at run (character) level | `warn` shown; dominant-font heuristic skips empty; caption style issues may persist after fix — use `range.font.name` for reliable style application |
| `lineSpacingRule` absent from `@types` | `@types/office-js` v1.0.569 omits property | Removed; use `lineSpacing / 12 * 100` exclusively |
| Column count detection unreliable | `<w:sectPr>` not always in content-range OOXML | Best-effort with manual-check fallback |
| Margin / page fix fails on Word < API 1.9 | `pageSetup` requires API 1.9+ | try/catch; falls back to manual-check item |
| `scanHeadings` misses manually-styled headings | Detects only Word built-in "Heading N" styles | Authors must apply paragraph styles, not just visual formatting |
| `scanReferences` only checks numbering | No cross-reference with in-text citations | Future: cross-reference `[n]` list vs. `scanCitations` results |
| Apply All button stays visible after click (pre-v1.0.2) | `isLoading` state conflict + non-awaited rescan | Fixed: snapshot → clear immediately → serial fix → direct rescan |

---

## 10. Engineering Decisions Log

### Why Regex Instead of LLM for Caption Gating?

LLM calls cost ~$0.01–0.10 each and take 1–3 seconds. A 100-page thesis has ~2000 paragraphs. Running LLM on all of them = ~$200 and 30–100 minutes. A regex gate costs nothing and runs in microseconds. Typically 5–15 caption candidates pass the gate out of 2000 paragraphs.

### Why `range.search()` for Citation Fixes Instead of `paragraph.insertText()`?

`paragraph.insertText(text, "replace")` replaces the **entire paragraph** with `text`. A citation `[1,2]` lives in a sentence surrounded by other text. Replacing the whole paragraph with `"[1], [2]"` destroys all surrounding content. `range.search("[1,2]")` targets only that substring and leaves surrounding text intact.

### Why Store `lineSpacingPct` as Percentage (Not Raw pt)?

The raw Word API unit (12 = single spacing) is meaningless to profile authors. `"lineSpacingPct": 150` is immediately readable as "1.5× spacing". All conversion to/from Word's raw unit is isolated inside `scanLayout` and `fixLayoutIssue`.

### Why a 50-Paragraph Cap for Typography Scan?

`body.paragraphs.load("items")` loads the entire document paragraph collection. For a 100-page thesis (~2000 paragraphs) this takes 2–4 seconds. The dominant font/size/spacing stabilises after 30–50 non-trivial body paragraphs. The cap keeps the scan under 1 second for typical documents.

### Why Serial Fixes in Apply All Instead of Batch `Word.run`?

The batch approach (`applyAllCaptionFixes`) was implemented in v1.0.1 to eliminate index drift. It is correct in isolation. But the caller (`handleApplyAllFixes` in React) had cascading state management issues that caused the UI to not update correctly regardless of whether the batch succeeded. Rather than solve both the Office.js batching semantics AND the React async state problem simultaneously, the serial approach was chosen because:

1. **Individual Fix is confirmed working** — serial Apply All is provably equivalent by construction.
2. **Failures are visible** — if one fix fails, the rescan shows that specific issue remaining. With the batch approach, any failure was invisible (error swallowed, full rescan, same data shown).
3. **Simplicity** — one less layer of indirection between "user clicks Fix" and "document changes."
4. **Performance is acceptable** — for typical documents with < 20 caption issues, serial async fixes complete in < 2 seconds total.

The batch functions (`applyAllCaptionFixes`, `applyAllCitationFixes`) remain in `taskpane.ts` and can be used in contexts where React state management is not involved (e.g., a future CLI or test harness).

### Why Is Score = `passed / (passed + failed)` Excluding `warn` and `manual`?

- `warn`: we know a check exists but couldn't measure it (e.g., run-level fonts). Penalising the score for a Word API limitation would be misleading.
- `manual`: these checks require human judgment (page size, column layout). They are listed with expected values so the author can verify, but they should not factor into an automated compliance score.

The score only counts items where the system has a definitive measurement and a definitive result.

---

## 11. Scan Reference Guide

> **Presentation-ready summary** of every automated check in PaperPilot.
> Each check follows the same pipeline: **Gate → Read → Validate → Report**.

---

### 11.1 Caption Format Scan

**Purpose:** Verify that every figure and table caption in the document matches the journal's required prefix, numbering format, separator, and typography style.

| Property | Detail |
|----------|--------|
| **Trigger** | "Scan Captions" button or included in Full Check |
| **Scope** | All body paragraphs (after scan offset) |
| **Gate condition** | Paragraph text matches `detect.regex` from profile (e.g. `/^(Fig\.|Figure|Table)\s*\d+/i`) |
| **Word API used** | `document.body.paragraphs` → `paragraph.text`, `paragraph.font.{name,size,bold}` |
| **What is validated** | (1) Text: starts with `expectedPrefix` (e.g. "Figure"), followed by number + `separator` (e.g. "."); (2) Style: font name, font size, bold matches `captionStyle.figure.format` |
| **Issue generated** | `CaptionIssue` with `suggestion` = reconstructed canonical form (e.g. "Figure 3. …") |
| **Auto-fix** | Yes — `replaceParagraphText(paragraphIndex, suggestion)` + style properties |
| **False-positive risk** | Low — gate regex is strict; short lines (< 5 chars) or long lines (> 300 chars) are skipped |

**Example:**
```
Input:  "fig. 3: System overview"
Gate:   matches /^(fig\.|figure)/i  → candidate
Check:  prefix wrong ("fig." ≠ "Figure"), separator wrong (":" ≠ ".")
Output: ❌ Caption issue — suggestion: "Figure 3. System overview"
```

---

### 11.2 Citation Format Scan

**Purpose:** Detect combined numeric citations (`[1,2]`) that should be written as separate brackets (`[1], [2]`).

| Property | Detail |
|----------|--------|
| **Trigger** | "Scan Citations" button or included in Full Check |
| **Scope** | All body paragraphs (after scan offset) |
| **Gate condition** | Paragraph text contains `[n,m]` pattern |
| **Regex used** | `/\[(\d+(?:\s*,\s*\d+)+)\]/g` — matches one or more commas inside brackets |
| **Word API used** | `paragraph.text` (read-only scan) |
| **What is validated** | Each `[n,m,…]` group must be individual `[n], [m], …` |
| **Issue generated** | `CitationIssue` with `suggestion` = split form |
| **Auto-fix** | Yes — `paragraph.getRange().search(text).insertText(suggestion, "replace")` (range-level, not paragraph-level) |
| **Counter-metric** | Also counts valid `[\d]` singles for confidence reporting |
| **Result if 0** | Document either uses author-year citations or already uses correct separate-bracket format — no action needed |

**Example:**
```
Input:  "as described in [1,3,5]"
Gate:   matches /\[(\d+(?:\s*,\s*\d+)+)\]/
Output: ❌ Citation issue — suggestion: "[1], [3], [5]"
```

---

### 11.3 Layout & Typography Scan

**Purpose:** Verify page-level settings (margins, page size) and body text typography (font, size, line spacing) against the selected profile specification.

This scan runs **two independent sub-checks** in a single `Word.run`:

#### Sub-check A — Page Setup (document-level)

| Property | Detail |
|----------|--------|
| **Word API used** | `document.sections.items[0].body.pageSetup` (Word API 1.9+) |
| **Fields read** | `topMargin`, `bottomMargin`, `leftMargin`, `rightMargin` (pt), `pageWidth`, `pageHeight` (pt) |
| **Unit conversion** | `cm = pt / 28.35` |
| **Page size detection** | A4 = 595.3 × 841.9 pt (±8 pt tolerance); Letter = 612 × 792 pt (±8 pt) |
| **Margin tolerance** | ±0.3 cm |
| **Column detection** | OOXML parse of `body.getRange().getOoxml()` for `w:cols w:num="N"` — best-effort |
| **Auto-fix** | Margins and page size: write back to `pageSetup.{topMargin, …, pageWidth, pageHeight}` |

#### Sub-check B — Body Typography (paragraph sampling)

| Property | Detail |
|----------|--------|
| **Word API used** | `paragraph.font.{name, size}`, `paragraph.lineSpacing` |
| **Sample size** | Up to 50 body paragraphs after scan offset (skips paragraphs shorter than 20 chars) |
| **Font detection** | Frequency-count of `font.name` across sampled paragraphs; take the mode |
| **Size detection** | Frequency-count of `font.size` rounded to nearest 0.5 pt; take the mode |
| **Line spacing** | `paragraph.lineSpacing` in Word "line units" where **12 = single spacing**. Formula: `pct = round((lineSpacing / 12) * 100)` |
| **Tolerance** | Font name: case-insensitive exact match; Size: ±0.5 pt; Spacing: ±20% |
| **Auto-fix** | Iterate all paragraphs and write `font.name`, `font.size`, or `lineSpacing` to matching paragraphs |
| **Limitation** | `font.name` returns empty for run-level (character-formatted) text; reported as `warn` not `fail` |

---

### 11.4 Heading Style Scan

**Purpose:** Check that section headings styled with Word's built-in "Heading 1/2/3" styles match the profile's required font size and bold setting.

| Property | Detail |
|----------|--------|
| **Trigger** | "Scan Headings" (manual) or included in Full Check |
| **Scope** | All paragraphs after scan offset with `paragraph.style ∈ {"Heading 1", "Heading 2", "Heading 3"}` |
| **Word API used** | `paragraph.style`, `paragraph.font.{size, bold}` |
| **What is validated** | `font.size` vs `typography.headings.h{1,2,3}.fontSize` (±0.5 pt); `font.bold` vs `isBold` (exact) |
| **Issue generated** | `HeadingIssue` — one issue per failed property per heading paragraph |
| **Auto-fix** | Yes — `paragraph.font.size` / `paragraph.font.bold` at `paragraphIndex` |
| **Prerequisite** | Headings must use Word built-in "Heading N" styles. Manually bolded/enlarged text will not be detected |

**Example:**
```
Profile spec:  H1 = 14 pt, bold
Document H1:  "1. Introduction" — 12 pt, bold
Output: ❌ H1 fontSize: 12 pt (expected 14 pt)
Fix:   sets paragraph.font.size = 14
```

---

### 11.5 Reference List Scan

**Purpose:** Verify the document contains a References section, count entries, detect numbering format, and validate sequential ordering.

| Property | Detail |
|----------|--------|
| **Trigger** | Included in Full Check only |
| **Scope** | All paragraphs from scan offset; searches for heading then collects entries after it |
| **Detection** | Finds first paragraph matching `/^(References|Bibliography|참고문헌|Reference List)\s*$/i` |
| **Entry collection** | All non-empty paragraphs after the heading until end of document |
| **Numbering formats** | `[1]` bracket, `(1)` paren, `1.` dotted — frequency-counted, dominant format reported |
| **Sequential check** | Parses leading number from each entry; checks `current = previous + 1`; counts gaps |
| **Issue severity** | Missing section → `warn`; empty section → `error`; >50% unnumbered → `warn`; sequence gap → `error` |
| **Auto-fix** | None (reference content requires author judgment) |
| **Cross-reference** | Not yet implemented: matching `[n]` in-text citations against reference list entries (planned v1.1.0) |

---

### 11.6 Full Check — Aggregated Report

**Purpose:** Run all five scans simultaneously and produce a single readiness score.

| Property | Detail |
|----------|--------|
| **Execution** | `Promise.all([scanCaptions, scanCitations, scanLayout, scanHeadings, scanReferences])` — all parallel, each in its own `Word.run` context |
| **Progress** | `onScanComplete` callback fires per scan as it finishes; UI badges update live |
| **Score formula** | `pct = passed / (passed + failed) × 100` — only counts auto-verified items (excludes `warn` and `manual`) |
| **Status levels** | `pass` (verified OK), `fail` (verified issue, fix available), `warn` (check attempted but inconclusive), `manual` (requires human verification with expected value shown) |
| **Scan offset** | `startFrom` parameter propagates to all five sub-scans — paragraphs before the offset are excluded from all checks |

**Score interpretation:**

| Score | Meaning |
|-------|---------|
| 100% | All auto-verified items pass. Manual checks still require human review |
| 70–99% | Minor issues detected; review individual items |
| < 70% | Significant formatting gaps; fix required before submission |

---

### 11.7 Scan Offset (Cover Page Exclusion)

**Purpose:** Allow authors to exclude a preamble (cover page, abstract, acknowledgements) from all scans so that different formatting on those pages does not generate false positives.

| Property | Detail |
|----------|--------|
| **Mechanism** | `startFrom: number` parameter on every scan function |
| **UI** | "Set start here" button reads cursor paragraph index via `getSelectionParagraphIndex()` (text-match against `body.paragraphs`) |
| **Effect** | Caption, citation, heading, reference scans skip `i < startFrom`; layout typography sampling starts at `startFrom` (page setup margins/size remain document-level) |
| **Indicator** | "From para N ✕" badge — click to reset to full-document scan |
| **Persistence** | Session-only (reset on page reload or profile change) |

---

## 12. Feature Verification Report (v1.1.7)

> **Scope:** Functional verification of all five scan modules and the submission readiness engine as of v1.1.7.  
> This section is written to be usable both as a **technical specification** (for contributors) and as a **product capability statement** (for demos and pitches).

---

### 12.1 Layout & Typography Check

**What we verify**

| Field | Detected via | Tolerance | Fix path |
|-------|-------------|-----------|----------|
| Page margins (T/B/L/R) | `Body.pageSetup.topMargin` / `bottomMargin` / `leftMargin` / `rightMargin` (points → cm) | ±0.2 cm | `Body.pageSetup` write (Word Desktop only) |
| Page size | `Body.pageSetup.pageWidth` / `pageHeight` | ±1 pt | `Body.pageSetup` write (Word Desktop only) |
| Body font name | Dominant `paragraph.font.name` across first 50 body paragraphs | Exact (case-insensitive) | `paragraph.font.name = target` on all non-heading paras |
| Body font size | Dominant `paragraph.font.size` | ±0.5 pt | `paragraph.font.size = target` on all non-heading paras |
| Line spacing | `paragraph.lineSpacing` (12 = 1×; `/ 12 * 100` = %) | ±5% | `paragraph.lineSpacing = (pct/100) * 12` |

**How detection works**

1. `scanLayout()` runs two sub-passes inside a single `Word.run`:
   - **Page setup pass**: `sections.getFirst().body.pageSetup` — reads margins and page size.
   - **Typography pass**: loads first `min(endAt, startFrom+50)` paragraphs, skips headings and short lines (<5 chars), computes the *dominant* font name and size by frequency count, compares against profile `typography.body`.
2. Margin/size issues are flagged as `LayoutIssue` with `field: "margin_top"` etc.; typography issues use `field: "body_font"`, `"body_size"`, `"line_spacing"`.
3. In `generateSubmissionReport`, margin detection failure is treated as `"manual"` (expected value shown; write attempted when user clicks Fix).

**Word API platform note**

`Body.pageSetup` reads work universally. Writes are documented by Microsoft as **"Supported only in Word on Windows and Mac"** — writes are silently discarded on Word Online. The UI discloses this with an inline note on every Fix button for margin/page-size items.

**Product pitch angle**

> "PaperPilot detects margin and font mismatches in under a second — no copy-pasting into a template checker. For typography (font, size, line spacing), one-click Apply All rewrites every body paragraph to the target spec."

---

### 12.2 Caption Format Check

**What we verify**

| Field | Rule | Example |
|-------|------|---------|
| Prefix | Must match profile `captionStyle.figure.validate.expectedPrefix` | `Figure` not `Fig` (IEEE), `그림` (KR profiles) |
| Separator | Character between label and description | `.` or `:` per profile |
| Number style | Arabic numerals only | `Figure 1` not `Figure I` |
| Font / size / alignment | Optional per-profile `format` block | Center-aligned, 9 pt (ACM) |

**How detection works**

1. **Regex gate** (`captionStyle.figure.detect.regex`): paragraph must match before any validation.  
   Example gate: `/^(Figure|Fig\.)\s*\d+/` — rejects body text false positives at zero cost.
2. **Validation pass**: checks prefix normalisation, separator, and optional format fields.
3. Issues surface with `suggestion` (corrected text) and `paragraphIndex` for one-click fix.

**Fix**: `replaceParagraphText(paragraphIndex, suggestion, profileId)` — rewrites the paragraph text and explicitly re-applies font properties to prevent style inheritance from the previous cursor position.

**Product pitch angle**

> "Caption errors are the most common rejection reason in journal submissions. PaperPilot catches every prefix mismatch, wrong separator, and inconsistent numbering before you submit — and fixes them with one click."

---

### 12.3 Citation Style Check

**What we verify**

Combined numeric citations that violate IEEE/numbered-bracket style:

| Pattern found | Expected | Example |
|---------------|----------|---------|
| `[1,2]` | `[1], [2]` | Comma-separated → individual brackets |
| `[1,2,3]` | `[1], [2], [3]` | Three or more |
| `[1-3]` | (detected only, not auto-fixed) | Range notation |

**Is this rule universal?**

**No.** The citation style check targets only **numeric bracket** citation formats (IEEE, ACM, AAAI, NeurIPS, ICML, EMNLP, etc.). Journals using **author-year** format (APA, Chicago, Harvard, Nature in-text) are out of scope for this scan — their citations look like `(Smith et al., 2023)` and do not trigger any rule. Profiles for author-year journals should set `captionStyle` but leave citation behavior to future work.

**How detection works**

1. Paragraph-scan approach: `body.paragraphs.load("items")` — iterates all paragraphs.
2. Regex: `/\[(\d+(?:,\s*\d+)+)\]/g` — matches bracket groups with ≥2 comma-separated numbers.
3. For each match: generates `suggestion` by splitting on `,` and formatting as `[n1], [n2]`.
4. Fix: `paragraph.getRange().search(bracketText).insertText(suggestion, "replace")` — replaces only the bracket, never the whole paragraph.

**Product pitch angle**

> "A single missed comma inside citation brackets is an instant desk rejection at IEEE. PaperPilot scans every paragraph in your document and flags every combined bracket that should be split — zero manual proofreading needed."

---

### 12.4 Heading Style Check

**What we verify**

| Field | Source | Tolerance | Fix |
|-------|--------|-----------|-----|
| Heading font size | `paragraph.font.size` for `style = "Heading 1/2/3"` | ±0.5 pt | `paragraph.font.size = target` |
| Bold | `paragraph.font.bold` | Exact | `paragraph.font.bold = target` |

**How detection works**

1. `scanHeadings()` iterates all paragraphs, filters for `paragraph.style` matching `/^Heading\s*[1-3]$/i`.
2. Loads `text`, `style`, `font.name`, `font.size`, `font.bold` in a single `sync`.
3. Compares against profile `typography.headings.h1/h2/h3`.
4. Issues include `level` (1/2/3), `field` ("font_size" or "bold"), `currentValue`, `expectedValue`.

**Fix**: `fixHeadingIssue(issue, profileId)` — sets font size and bold on the specific paragraph.

**Caveat**: Detection requires paragraphs to use Word's built-in Heading styles. Custom styles named differently (e.g., "My H1") are invisible to this scan. The UI shows a note when no heading-styled paragraphs are found.

**Product pitch angle**

> "Many authors manually bold their section titles instead of using Word's Heading styles. PaperPilot not only finds heading font mismatches — it also alerts you when heading styles aren't applied at all, which breaks screen readers and word count tools."

---

### 12.5 Reference List Check

**What we verify**

| Check | Rule |
|-------|------|
| Section detection | Finds `References` / `Bibliography` / `참고문헌` header paragraph |
| Entry count | Counts paragraphs that match `[n]` or `n.` at line start after the header |
| Sequential numbering | Verifies each entry number is exactly previous + 1 |

**Fix**: Not auto-fixable — renumbering requires understanding which entries belong together. Issues are reported with expected vs. actual sequence numbers.

**Product pitch angle**

> "Missing or misnumbered references are invisible until a reviewer finds them. PaperPilot verifies the entire reference list is sequentially numbered in under a second."

---

### 12.6 AI-Powered Term Formality Check

**What we verify**

Uses GPT to judge whether a selected word or phrase is appropriate for academic writing, given its surrounding paragraph context.

| Aspect | Implementation |
|--------|---------------|
| **Input** | Selected text (term) + previous paragraph + current paragraph (up to 400 chars, tail-truncated) |
| **Model** | GPT-5 via OpenAI API on Railway server |
| **Output** | `{ reason: string, suggestions: string[] }` |
| **UI** | `Informal` badge (yellow) + reason text + suggestion buttons; `Formal ✓` badge (green) when `suggestions.length === 0` |
| **Fix** | `replaceSelection(suggestion)` — replaces the selected text in the document |

**Why context matters**

Without paragraph context, "효율" (efficiency) might be flagged as informal because the model has no domain signal. With the surrounding paragraph, the model sees it's used as `주입 효율` (injection efficiency) in a semiconductor paper and correctly classifies it as a standard technical term.

**Product pitch angle**

> "PaperPilot's term checker doesn't just look up words in a list — it understands the sentence context. Select any phrase and get AI feedback on whether it reads like a top-tier journal, not a blog post."

---

### 12.7 Submission Readiness Score

**Score formula**

```
pct = (passed) / (passed + failed) × 100
```

Only auto-verified items count. `warn` and `manual` items do not affect the score — they appear separately at the top of the report.

**Status taxonomy**

| Status | Meaning | UI |
|--------|---------|-----|
| `pass` | Detected and matches profile | ✅ green |
| `fail` | Detected and violates profile, fix available | ❌ red + Fix button |
| `warn` | Check attempted but result inconclusive | ⚠️ yellow |
| `manual` | Cannot be auto-detected (e.g., column count) | 🔍 Action Required callout |

**Five parallel scans**

All five scans run concurrently via `Promise.all`. Per-scan completion fires the `onScanComplete` callback, which updates live progress badges in the UI.

**Apply All (Full Check)**

`handleReportFixAll` applies every `fail` item's fix in serial order (typography → headings → captions → citations) then runs a single rescan — no intermediate rescans that would show stale results.

**Product pitch angle**

> "One button. Five checks. A submission readiness score in under 5 seconds. PaperPilot tells you exactly what to fix before the deadline — not after the desk rejection."

---

### 12.8 Engineering Decisions & Resources Used

#### Why Deterministic Rules, Not Pure LLM?

| Concern | Deterministic approach | Pure LLM approach |
|---------|----------------------|-------------------|
| Cost | Near-zero (regex + Word API) | $0.002–0.05 per document |
| Latency | <1 s (layout, headings, refs) | 3–10 s per scan |
| Reproducibility | Identical run → identical result | Non-deterministic |
| Explainability | "Font is 9pt, expected 10pt" | "It seems incorrect…" |
| Fix safety | Precise token-level replacement | LLM may rewrite unrelated content |

LLM is used **only** where deterministic rules cannot work: semantic formality judgment.

#### Word JS API Resources Used

| API | Used for |
|-----|---------|
| `Body.paragraphs.load(["text","style","font"])` | All scan passes |
| `Body.pageSetup.*` | Margin/size detection (read) and fix (write, Desktop only) |
| `Paragraph.font.name/size/bold` | Typography and heading checks |
| `Paragraph.lineSpacing` | Line spacing check and fix (12 = 1×) |
| `Paragraph.style` | Heading detection, heading skip in body font fix |
| `Paragraph.getRange().search(text)` | Citation bracket fix (never whole-paragraph replace) |
| `Document.getSelection().paragraphs.getFirst()` | Paragraph context for Term check |
| `Document.sections.getFirst().body.pageSetup` | Margin/page size (cleaner than `sections.load("items")[0]`) |

#### Format Profile Sources

| Profile group | Source |
|--------------|--------|
| Korean university theses | Official thesis guideline PDFs (KAIST, HYU, POSTECH, SNU, Yonsei, SKKU) |
| IEEE, ACM | LaTeX `.cls` files + official author guides |
| Springer LNCS | `llncs.cls` LaTeX class |
| Elsevier | `elsarticle.cls` LaTeX class |
| NeurIPS, ICML, ACL/EMNLP | Official style guide PDFs + LaTeX templates |
| MDPI | Official Word template + MDPI author instructions |
| Wiley NJD | `WileyNJD-AMA.cls` |
| Nature Portfolio | Nature formatting guide |
| Korean society journals (KSDS, KIISE, KICS) | Society author instruction pages |
