# PaperPilot — Technical Report
**Version:** v1.0.1 · **Date:** 2026-02-18
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
9. [Known Limitations and Edge Cases](#9-known-limitations)
10. [Engineering Decisions Log](#10-engineering-decisions-log)

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
        fontName: string;   // e.g. "Times New Roman"
        fontSize: number;   // pt
        lineSpacingPct: number; // 100=single, 150=1.5x, 200=double
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

#### Regex Notes

JSON stores regexes as strings with **double-escaped** backslashes (`\\s` in JSON = `\s` in JS string = `\s` in RegExp). When reading from JSON and passing to `new RegExp(str, flags)`, the JS string `"^(Figure|Fig\\.)\\s*\\d+"` becomes the RegExp `/^(Figure|Fig\.)\s*\d+/i`.

**Rule**: In `journalFormats.json`, every regex backslash must be written as `\\`. Forgetting this causes the pattern to match literally `s*` instead of `\s*`, leading to false positives or zero matches.

---

## 4. Scan Engine

All scan functions are in `taskpane.ts` and follow this pattern:

```
Input: profileId
  → Load profile rules
  → If no rules for this check: return early (no-op)
  → Word.run:
      → Load document data (paragraphs, sections, etc.)
      → Sync (round-trip to Word runtime)
      → Loop / analyse: apply regex gates, measure values, compare to rules
  → Return ScanResult<IssueType> { issues, stats, logs }
```

Each scan returns a `ScanResult<T>` — a standardised container with:
- `issues`: array of typed issue objects
- `stats`: `{ totalParagraphs, candidatesFound, issuesFound }`
- `logs`: human-readable string array (shown in collapsible "Scan logs" accordion in UI)

### 4.1 scanCaptions

**Gate**: paragraph text matches `captionStyle.figure.detect.regex` (e.g. `/^(Figure|Fig\.)\s*\d+/i`)
**Validate**:
1. **Text check**: does text start with `expectedPrefix` and match `^{prefix}\s*\d+{separator}`?
2. **Style check**: does `p.font.name`, `p.font.bold` match `captionStyle.figure.format`?

If either fails, generates a `CaptionIssue` with a `suggestion` = reconstructed correct text.

**Suggestion construction**:
```
match = text.match(/^(Figure|Fig\.|Table|그림|표)\.?\s*(\d+)[:.| ]?\s*(.*)/)
suggestion = `${expectedPrefix} ${number}${separator} ${rest}`
```

### 4.2 scanCitations

**No gate** — scans all paragraphs.
**Pattern**: `/\[(\d+(?:\s*,\s*\d+)+)\]/g` — matches combined brackets like `[1,2]`, `[1, 2, 3]`.
**Fix suggestion**: split inner numbers → `[1], [2]`.

Also counts `[\d+]` (single brackets) as a sanity check — logged but not flagged.

### 4.3 scanLayout

Two sub-scans in one Word.run:

**A. Page setup** (Word API 1.9+, via `sections.items[0].body.pageSetup`):
- `topMargin`, `bottomMargin`, `leftMargin`, `rightMargin` — unit: pt (÷ 28.35 → cm)
- `pageWidth`, `pageHeight` — detect A4 (595.3×841.9 pt ±8) or Letter (612×792 pt ±8)
- Column count: best-effort OOXML parse on `body.getRange().getOoxml()` — looks for `w:cols w:num` attribute

**B. Typography** (paragraph scan, first 50 body paragraphs):
- Skip short paragraphs (< 20 chars) — likely headings/captions
- Aggregate `font.name` → dominant by frequency (most-common wins)
- Aggregate `font.size` → dominant (rounded to nearest 0.5 pt)
- Aggregate `lineSpacing` → average → convert to `%` using `lineSpacing / 12 * 100`
  - (Word API stores lineSpacing where **12 = 1 line unit**, per API docs: "In the Word UI, this value is divided by 12")

Tolerances: margins ±0.3 cm, font size ±0.5 pt, line spacing ±20%.

### 4.4 scanHeadings

**Gate**: `paragraph.style === "Heading 1" | "Heading 2" | "Heading 3"` (exact Word style name).
**Validate**: `font.size` vs `typography.headings.h{level}.fontSize` (tolerance ±0.5 pt) and `font.bold` vs `isBold`.

Generates separate issues for `fontSize` mismatch and `bold` mismatch on the same paragraph.

**Requirement**: Section headings in the document must use Word's built-in "Heading 1/2/3" styles (not just visually formatted bold text). If paragraphs are manually bolded/enlarged without applying a heading style, `scanHeadings` will not detect them.

### 4.5 scanReferences

**Detection algorithm**:
1. Scan for a paragraph matching `/^(References|Bibliography|참고문헌|Reference List)\s*$/i`
2. Collect all non-empty paragraphs after that heading as reference entries
3. Count entries by numbering format: `[1]`, `(1)`, `1.`
4. Verify sequential ordering: check that numbers increment by 1

Issues generated:
- `ref_no_section` (warn) — no References heading found
- `ref_empty_section` (error) — heading found but no entries follow
- `ref_no_numbering` (warn) — > 50% of entries have no recognisable numbering
- `ref_seq_error` (error) — non-sequential gaps detected

---

## 5. Fix Engine

### Fix Functions

| Function | What it writes | Word API target |
|----------|----------------|-----------------|
| `applyAllCaptionFixes` | Paragraph text + font/bold/align | `paragraph.insertText(replace)` + `paragraph.font.*` |
| `applyAllCitationFixes` | Only the bracket substring | `range.search(text).insertText(replace)` |
| `fixLayoutIssue` — typography | Font name / size / line spacing across all body paragraphs | `paragraph.font.*` + `paragraph.lineSpacing` |
| `fixLayoutIssue` — margins | Page margins | `pageSetup.topMargin/bottomMargin/leftMargin/rightMargin` (pt) |
| `fixLayoutIssue` — page_size | Page dimensions | `pageSetup.pageWidth/pageHeight` (pt) |
| `fixHeadingIssue` | Font size and/or bold on one heading paragraph | `paragraph.font.size` / `paragraph.font.bold` |

### Why Apply All Was Wrong Before v1.0.1

**Bug**: `handleApplyAllFixes` called `replaceParagraphText` or `fixCitationIssue` sequentially, each in its own `Word.run`. The `paragraphIndex` and `issue.text` values came from the initial scan. After fix #1 modifies the document, fix #2 still uses the original index and original text — which may no longer be accurate if Word's internal paragraph ordering shifted.

**Fix (v1.0.1)**: `applyAllCaptionFixes` and `applyAllCitationFixes` batch everything into **one `Word.run` context**:

```
applyAllCaptionFixes:
  Word.run:
    1. Load all paragraphs (one sync)
    2. For each issue: insertText + apply font rules (queue all, no sync between)
    3. context.sync() → commit all at once

applyAllCitationFixes:
  Word.run:
    1. Load paragraphs (sync)
    2. Queue all range.search() calls (no sync between)
    3. results.load("items") for each search
    4. context.sync() → materialise all search results at once
    5. For each result: insertText replacement
    6. context.sync() → commit all at once
```

This guarantees all operations see the same document state and are committed atomically.

### Line Spacing Unit

`paragraph.lineSpacing` in Word JS API is stored in **"line units"** where:
- `12` = single spacing (1×)
- `18` = 1.5× spacing
- `19.2` = 160%
- `24` = double spacing (2×)

This corresponds to the Word UI value **divided by 12** (per `@types/office-js` JSDoc).

**Conversion formulas used**:
```typescript
// Read:  lineSpacing → percentage
const pct = Math.round((p.lineSpacing / 12) * 100);

// Write: percentage → lineSpacing
p.lineSpacing = (desiredPct / 100) * 12;
```

`lineSpacingRule` is **absent from `@types/office-js` v1.0.569** and was removed entirely. Setting `(p as any).lineSpacingRule = "multiple"` creates a plain JS property on the proxy object, which is never sent to Word's runtime (the Office.js proxy setter is not invoked). This silently does nothing.

---

## 6. Word JS API Patterns and Gotchas

### 6.1 Office.js Proxy Model

Every operation on `Word.*` objects is **queued** and executed only at `context.sync()`. This means:

```typescript
// CORRECT: queue load, sync, then read
p.load("text");
await context.sync();
console.log(p.text); // ✓ available after sync

// WRONG: reading before sync
console.log(p.text); // ✗ throws PropertyNotLoaded error
```

Setting properties is also queued:
```typescript
p.font.name = "Times New Roman"; // queued
// No sync needed to queue more operations
p.font.size = 11;                // queued
await context.sync();            // both applied together
```

### 6.2 Batch Pattern (Used in Apply All)

For maximum efficiency, queue all loads and all writes before syncing:

```typescript
await Word.run(async (context) => {
  const paragraphs = context.document.body.paragraphs;
  paragraphs.load("items");
  await context.sync();       // one sync to load

  // Queue all searches (no sync between)
  const searches = issues.map(issue =>
    paragraphs.items[issue.idx].getRange().search(issue.text, {...})
  );
  searches.forEach(s => s.load("items"));

  await context.sync();       // one sync to get all results

  // Apply all fixes (no sync between)
  searches.forEach((s, i) => {
    if (s.items.length > 0) s.items[0].insertText(fix[i], "replace");
  });

  await context.sync();       // one sync to commit all
});
```

This is 3 sync calls total vs. `N * 3` sync calls for N sequential fixes.

### 6.3 paragraph.insertText vs range.insertText

| Method | What it replaces | When to use |
|--------|-----------------|-------------|
| `paragraph.insertText(text, "replace")` | **Entire paragraph text** | Caption fix (replace whole caption) |
| `range.insertText(text, "replace")` | **Only the matched range** | Citation fix (replace `[1,2]` only, preserve surrounding text) |

**Never** use `paragraph.insertText` for citations — it wipes the full paragraph, leaving only the bracket text.

### 6.4 pageSetup Availability

`sections.items[0].body.pageSetup` requires **Word API 1.9+** (Word Online and recent desktop). On older clients, loading `pageSetup` silently returns `null`/`undefined`. Always wrap in try/catch and fall back to manual-check UI.

The scan detects which path is available and sets the checklist item accordingly (auto-pass/fail vs. manual).

### 6.5 Font Detection Limitation

`paragraph.font.name` returns **empty string** when the font is set at the **run level** (e.g., mixed fonts within a paragraph, or font set via character style). This is a Word API limitation — paragraph-level font is only defined when the entire paragraph has a uniform font.

The dominant-font heuristic in `scanLayout` collects all non-empty `font.name` values and picks the most frequent one. If all return empty, a warning is shown instead of a pass/fail result.

### 6.6 Column Count — OOXML Approach

Word JS API has no direct `columns` property. We parse the OOXML of `sections.items[0].body.getRange().getOoxml()` looking for:
- `w:cols w:num="2"` — explicit column count attribute
- Count of `<w:col ` elements — one per column

This is best-effort and does not always include `<w:sectPr>` (section properties) in the content range OOXML. When unavailable, it falls back to a manual check hint with the expected column count from the profile.

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

`express-rate-limit`: 30 requests/minute per IP. Applied to all `/analyze/*` routes.

### Model

Currently uses `gpt-5` via `openai.responses.create()` (Responses API, non-streaming). The Responses API returns `response.output_text` directly (not `response.choices[0].message.content`).

---

## 8. Deployment Architecture

### Add-in (Client)

```
Source: /src → webpack → /dist
Deploy: vercel --prod (reads dist/ via vercel.json outputDirectory)
Word integration: sideload dist/manifest.xml in Word Online
```

`webpack.config.js` injects `__API_SERVER_URL__` at build time via `DefinePlugin`:
- Dev: empty string (webpack-dev-server proxies `/analyze/*` → `http://localhost:3001`)
- Prod: `https://paperpilot-server.up.railway.app` (set as Vercel env var `API_SERVER_URL`)

### When to Re-sideload manifest.xml

Only if the manifest XML itself changed (URLs, permissions, version number, display name). JS/HTML changes are picked up automatically on next panel open — Word hot-reloads the bundle from Vercel.

### Server

```
cd server && git push railway main
```
Railway auto-deploys on push to `main`. Environment variable: `OPENAI_API_KEY`.

---

## 9. Known Limitations

| Issue | Root Cause | Workaround |
|-------|-----------|-----------|
| `paragraph.font.name` returns empty | Font set at run (character) level, not paragraph level | Warn shown; dominant-font heuristic uses non-empty results only |
| `lineSpacingRule` absent from types | `@types/office-js` v1.0.569 omits property | Use `lineSpacing / 12 * 100` formula exclusively |
| Column count detection unreliable | `sectPr` not always in content-range OOXML | Best-effort with manual-check fallback |
| Margin fix may not work on Word Online < 1.9 | `pageSetup` requires API 1.9+ | Caught with try/catch; falls back to manual |
| `scanHeadings` misses manually-styled headings | Only detects Word built-in "Heading N" styles | Authors must apply heading styles, not just visual formatting |
| `scanReferences` only checks numbering format | No cross-reference with in-text citations | Future work: cross-reference `[n]` list vs. scanCitations results |
| Apply All and Fix separately were inconsistent (pre-v1.0.1) | Serial `Word.run` calls used stale indices | Fixed: batch `Word.run` with single sync cycle |

---

## 10. Engineering Decisions Log

### Why Regex Instead of LLM for Caption Gating?

LLM calls cost ~$0.01-0.10 per call and take 1-3 seconds. A document can have 200+ paragraphs. Running LLM on every paragraph would be prohibitively expensive and slow (~$20, 200-600s per full scan). A regex gate costs 0 and takes microseconds. Only the ~5-10 caption candidates pass the gate.

### Why `range.search()` for Citation Fixes Instead of `paragraph.insertText()`?

`paragraph.insertText(text, "replace")` replaces **the entire paragraph** with `text`. A citation like `[1,2]` exists in a paragraph that may contain several sentences. Replacing the whole paragraph with `"[1], [2]"` destroys all surrounding text. `range.search("[1,2]")` finds only the specific bracket substring within the paragraph and replaces just that.

### Why Store lineSpacingPct as Percentage (Not Raw pt)?

The raw Word API unit (12 = single spacing) is not human-readable. Profile authors specify `"lineSpacingPct": 150` (1.5× spacing), not `"lineSpacing": 18`. All conversion to/from the raw unit is handled in the scan and fix functions, keeping the profile JSON readable.

### Why a 50-Paragraph Cap for Typography Scan?

`body.paragraphs.load("items")` loads the entire document paragraph list into memory. For a 100-page thesis (~2000 paragraphs), this takes 2-4 seconds and the full load is not needed. The dominant font/size/spacing is stable after the first 50 non-short paragraphs. The cap keeps layout scan fast.

### Why Is Score = passed/(passed+failed) Excluding warn and manual?

`warn` items are things we know exist but couldn't measure (e.g., run-level fonts). Including them as failed would penalise the author for a Word formatting quirk unrelated to their compliance. `manual` items are unautomatable and should not factor into an automated score. The score only counts items where we have a definitive measurement.
