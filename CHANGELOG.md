# Changelog

---

## [v1.1.3] - 2026-02-19 — Scan Range Inputs + Manual Fix Buttons + Instruction Text

### Fixed
- **Instruction text**: "File → Page Layout → Margins/Size" → "Layout → Margins/Size" (Word Online ribbon is just "Layout")
- **Manual margins and page size now show Fix buttons** — even when `pageSetup` detection failed, the fix is attempted directly via `pageSetup` writes using profile expected values. If Word API supports the write, the fix is applied; if not, it fails silently (same behavior as before but now user can try).
- **handleReportFix for `layout_margins` (manual)**: constructs 4 synthetic `LayoutIssue` objects for top/bottom/left/right and calls `fixLayoutIssue` for each.
- **handleReportFix for `layout_page_size` (manual)**: constructs synthetic issue from profile `pageSize` and calls `fixLayoutIssue`.

### Changed
- **Scan range UI redesigned**: "Set scan start here" button + "Full doc" label replaced with two typeable number inputs:
  - `From [  0  ] – [      ] para` where both fields are number inputs
  - Left input = `startFrom` (default 0)
  - Right input = `endAt` (blank = scan to document end)
  - "Set" button reads current cursor paragraph index and sets the From field
  - Inputs reset on profile change
- **All scan functions accept `endAt?: number`**: `scanCaptions`, `scanCitations`, `scanLayout`, `scanHeadings`, `scanReferences`, `generateSubmissionReport` — scans stop at `endAt` (inclusive) when specified
- **"Action required" callout title**: renamed from "Manual verification required" to "Action required"
- **Manual items without auto-fix**: only show instruction text (e.g., "Layout → Columns"), no Fix button

---

## [v1.1.2] - 2026-02-19 — Full Check Fix All + Manual Items at Top

### Fixed
- **Full Check "Fix" only resolved one caption/citation issue per click**
  - Root cause: `handleReportFix` for `content_captions` called `applyAllCaptionFixes` (batch `Word.run`) which silently swallows errors — if any single `insertText` in the batch failed, none of the fixes were committed but the rescan ran anyway, showing the same issues.
  - Fix: switched to serial approach — same `replaceParagraphText` / `fixCitationIssue` path used by the individual Fix button in the scan view (confirmed working). One fix per `await`, errors are visible per-item.
  - Same fix applied to `content_citations` in `handleReportFix`.

### Changed
- **Full Check report — Manual items moved to top**
  - Manual verification items (page margins, page size when `pageSetup` API unavailable, column layout) are now shown at the **top** of the report in a clearly styled callout box with a yellow left border.
  - Each manual item shows: field name (bold), "Set to: [expected value]" in brand color, "How: [instruction]" below.
  - Removed the previous bottom green section for manual items.
  - Auto-verified categories (pass/fail/warn) are shown below the manual callout.
- **Fix All (N) button label for multi-issue items**
  - When a `fail` item covers multiple sub-issues (captions, citations, headings), the Fix button now shows "Fix All (N)" where N = the count of individual issues to resolve. Single-issue items still show plain "Fix".

---

## [v1.1.1] - 2026-02-19 — Format Tab UI Overhaul + Scan Reference Guide

### Changed
- **Format tab restructured**
  - "Full Check" is now the primary top action (moved from bottom to top)
  - Individual scan buttons (Captions, Layout, Headings) collapsed into a "Manual Scans" accordion
  - "Scan range" section (Set start here + offset badge) grouped as a compact card at the top of controls
  - Progress badges (idle grey → done green) shown live during Full Check execution
  - "Scan Citation" is the primary button in the Cite tab
  - Apply All button moved to bottom, shown only when issues exist

### Added
- **`TECHNICAL_REPORT.md §11` — Scan Reference Guide**
  - 7 subsections: Caption, Citation, Layout/Typography, Heading, References, Full Check aggregation, Scan Offset
  - Presentation-ready table format: what is validated, Word API used, detection criteria, tolerances, fix method, example input/output

---

## [v1.1.0] - 2026-02-19 — Scan Offset (Cover Page Exclusion) + Full Check Progress

### Added
- **Scan offset / cover page exclusion**
  - All scan functions (`scanCaptions`, `scanCitations`, `scanLayout`, `scanHeadings`, `scanReferences`) accept `startFrom: number` parameter
  - Paragraphs before `startFrom` are excluded from all checks; page-level settings (margins, page size) remain document-level regardless
  - `getSelectionParagraphIndex()`: reads current Word cursor paragraph and finds its index by text-match against `body.paragraphs`
  - "Set start here" button in Format/Cite tabs — sets offset to cursor paragraph
  - Offset badge shows "From para N ✕" — click to reset to full-document scan
- **Full Check per-scan progress display**
  - `generateSubmissionReport` accepts `onScanComplete` callback; each of the 5 parallel scans fires it on completion
  - Five badges (layout, captions, citations, headings, references) animate from grey → green in real-time during Full Check

---

## [v1.0.2] - 2026-02-18 — Apply All UX Fix (button clears immediately, no state conflict)

### Fixed
- **Apply All button remains visible after clicking / issues persist after Apply All**
  - Root cause 1: `handleApplyAllFixes` called `handleScanCaptions()` / `handleScanCitations()` which internally manage `isLoading` state — conflicting with the outer handler's `setIsLoading(true/false)`, causing non-deterministic re-renders where old scan data could survive the state update cycle.
  - Root cause 2: `handleApplySingleFix` called `handleScanCaptions()` without `await` — the rescan ran concurrently with (and could finish before) downstream state cleanup, leaving stale data in some React render passes.
  - Root cause 3: Batch `Word.run` in `applyAllCaptionFixes` / `applyAllCitationFixes` can fail silently (error caught and swallowed); caller had no indication of failure and still called the rescan, which found unchanged issues.
  - **Fix**: `handleApplyAllFixes` now:
    1. Snapshots the current issue list before anything else
    2. Immediately calls `setScanCaptionData(null)` / `setScanCiteData(null)` — Apply All button and Fix buttons **disappear on click**, not after the async work finishes
    3. Applies fixes serially using `replaceParagraphText` / `fixCitationIssue` (identical to the individual Fix path that is confirmed to work)
    4. Rescans directly (`await scanCaptions(profileId)`) and updates state in one call — no delegation to `handleScanCaptions` to avoid `isLoading` conflicts
  - **Fix**: `handleApplySingleFix` now `await`s the rescan and manages its own `isLoading` state explicitly.

---

## [v1.0.1] - 2026-02-18 — Apply All Bug Fix + Technical Report

### Fixed
- **Critical: "Apply All" produced different results than clicking "Fix" individually**
  - Root cause: `handleApplyAllFixes` iterated serially — each `replaceParagraphText` / `fixCitationIssue` call used a separate `Word.run`, operating on stale `paragraphIndex` and `issue.text` values from the initial scan snapshot. After fix #1 modifies the document, fix #2 through #N could reference wrong paragraphs or text that no longer exists.
  - Root cause (citations specifically): after fixing `[1,2]`, the paragraph changed; subsequent searches in the same paragraph still found the text (text search is position-independent), but sequential `Word.run` calls created multiple round-trips where index drift could accumulate.
  - **Fix — `applyAllCaptionFixes(issues, profileId)`**: single `Word.run` context; loads all paragraphs once, queues all `insertText` + font property writes, commits with one `context.sync()`.
  - **Fix — `applyAllCitationFixes(issues)`**: single `Word.run` context; queues all `range.search()` calls without sync, syncs once to materialise all results, applies all replacements, syncs once to commit. **3 total syncs regardless of N issues** (vs. N×3 before).
  - `handleApplyAllFixes` in App.tsx now uses these batched functions and properly `await`s the rescan.
  - `handleReportFix` for captions and citations also updated to use batch functions.

### Added
- **`TECHNICAL_REPORT.md`**: comprehensive technical specification for contributors — architecture, core philosophy, format profile schema, scan/fix engine internals, Word API patterns and gotchas, LLM integration, deployment, known limitations, engineering decisions log.

---

## [v1.0.0] - 2026-02-18 — Full Layout Verification + Heading/Reference Checks

### Added
- **`scanHeadings(profileId)`** — scans all paragraphs styled as "Heading 1/2/3", checks font size and bold against profile `typography.headings.h1/h2/h3` rules
- **`fixHeadingIssue(issue, profileId)`** — auto-fixes heading font size and bold on the specific paragraph
- **`scanReferences(profileId)`** — locates "References"/"Bibliography" heading, counts entries, detects numbering format (`[1]`, `(1)`, `1.`), validates sequential ordering
- **`generateSubmissionReport`** now runs all 5 scans in parallel (layout, captions, citations, headings, references)
- **Page size** (`pageSetup.pageWidth/Height`): auto-detected (A4/Letter) and auto-fixable in both Layout Check and Full Check
- **Margins** now `autoFixable: true` in Full Check report — Fix button writes to `pageSetup.topMargin` etc.
- **Column count**: best-effort OOXML detection with human-readable log; shown in manual section with detected value
- **"Scan Headings" button** in Format tab — per-issue Fix buttons, collapsible detected-headings log
- **Full Check** now includes "Headings" and "References" checklist categories
- **rawScans** extended with `headings` and `references` fields
- **`SubmissionReport.rawScans`** and **`CheckItem.category`** extended to include `"headings"` and `"references"`
- **Layout Check** Fix buttons now shown for `margin_*` and `page_size` issues (previously typography-only)

### Changed
- Full Check "Page size" item moved from always-manual to **auto** when Word API 1.9+ is available (uses `pageSetup.pageWidth/Height`)
- Full Check "Page margins" fail items now show Fix button (`autoFixable: true`)
- Full Check now shows scan logs from all 5 scans (headings + references added)
- "Reference list format" removed from always-manual section; replaced by actual `scanReferences()` result

---

## [v0.9.0] - 2026-02-18 — Deployment, Profile Completion, Bug Fixes

### Added
- **Deployment pipeline**
  - Add-in (static): Vercel — `paper-pilot-demo.vercel.app`
  - API server: Railway — `paperpilot-server.up.railway.app`
  - `vercel.json`: `outputDirectory: "dist"`, `buildCommand: "npm run build"`
  - `webpack.config.js`: `DefinePlugin` injects `__API_SERVER_URL__` at build time (empty string in dev → proxy; Railway URL in prod)
  - Dev proxy: `/analyze/*` → `http://localhost:3001`
- **`fixCitationIssue(issue: CitationIssue)`** in `taskpane.ts`
  - Uses `paragraph.getRange().search(issue.text)` to locate only the specific bracket (e.g. `[1,2]`) within a paragraph
  - Replaces only that range — surrounding paragraph content is preserved
  - All three citation handlers (`handleReportFix`, `handleApplySingleFix`, `handleApplyAllFixes`) now call this instead of `replaceParagraphText`
- **`scripts/resize-icons.mjs`**: jimp-based icon resizer (16/32/64/80/128 px) from `assets/paperpilot.png`
- **Manifest branding**: ProviderName `PaperPilot`, DisplayName `PaperPilot`, ribbon button `PaperPilot`
- **Server rate limiting**: `express-rate-limit` — 30 req/min per IP on `/analyze/*`
- **9 partial profiles completed** — all profiles now `"status": "verified"`:
  - `postech_grad_thesis`, `acm_reference_format` — data was already complete, status corrected
  - `snu_grad_thesis`, `yonsei_grad_thesis_kor`, `skku_grad_thesis` — added `format` block to figure captions; added full `table` caption definition
  - `nature_numbered_superscript` — added table caption definition
  - `ksds_design_works`, `kiise_jok`, `kics_journal` — added `format` blocks + table caption definitions
- **`rawScans` in `SubmissionReport`**: Full Fix-button wiring in Full Check report — Fix buttons work from the report view (not only from individual scan tabs)

### Fixed
- **Critical: citation Fix destroyed paragraph content** — `replaceParagraphText(i, "[1], [2]")` replaced the *entire paragraph* with just the bracket text. Fixed with `fixCitationIssue` using range search/replace.
- **Line spacing Fix button did nothing** (root cause: `lineSpacingRule` not in `@types/office-js` v1.0.569)
  - `@types/office-js` declares `lineSpacing` as: *"In the Word UI, this value is divided by 12"* — meaning 12 = 1 line unit, 18 = 1.5×, 19.2 = 160%, independent of any rule enum
  - Scan now computes `pct = Math.round((lineSpacing / 12) * 100)` directly — no `lineSpacingRule` dependency
  - Fix now sets only `p.lineSpacing = (pct / 100) * 12` — no unreliable `any`-cast rule setter
- **`fixLayoutIssue` line spacing rule**: removed `(p as any).lineSpacingRule = "atLeast"` which silently failed; fix now works correctly via `lineSpacing` alone

---

## [v0.8.0] - 2026-02-18 — Submission Readiness Report

### Added
- **`CheckItem` / `SubmissionReport` interfaces** in `taskpane.ts`
  - Each item: `status` (pass/fail/warn/manual), `category`, `currentValue`, `expectedValue`, `detail`, `autoFixable`
  - Score: `passed / (passed + failed) × 100` — only auto-verified items counted
- **`generateSubmissionReport(profileId)`** — runs all three scans in parallel and returns a structured `SubmissionReport`
  - Typography: body font, font size, line spacing
  - Layout: margins (auto if API 1.9+ available, else manual with expected values)
  - Layout manual: page size, column count
  - Captions: N captions scanned, M issues
  - Citations: N single-bracket (OK), M combined (issues)
  - Always-manual: reference list format
- **"Full Check — Submission Readiness" button** in Format tab
  - Score badge (green ≥ 100%, amber ≥ 70%, red < 70%)
  - Checklist grouped by category with ✅/❌/⚠️/🔍 icons
  - Manual-check section with exact expected values and menu paths
  - Collapsible scan logs

### Fixed
- **Critical: `scanCaptions` regex false positive** — `new RegExp()` template literal used `\s*\d+` (single backslash → literal `s`, `d` in JS strings). Changed to `\\s*\\d+`. Every caption was incorrectly flagged as "Text format mismatch"; after fix only genuine errors are reported.
- **`scanCitations` diagnostics** — logs now report single-bracket [n] count (already correct) and combined [n,m] count separately, so users can verify the scan ran when 0 issues found.
- **Margin detection** — switched from `(context.document.body as any).pageSetup` (always `undefined`) to `(sections.items[0].body as any).pageSetup` (section body, Word API 1.9+). Log message on failure is now human-readable with manual steps.

---

## [v0.7.0] - 2026-02-18 — Layout Scan + Profile Expansion

### Added
- **`journalFormats.json` schema v0.7.0** — new rule categories per profile:
  - `layout`: `{ pageSize, columns, margins: { top, bottom, left, right } }` (cm)
  - `typography`: `{ body: { fontName, fontSize, lineSpacingPct }, headings: { h1, h2, h3 } }`
- **9 new profiles** (12 → 20 total):
  `hyu_grad_thesis`, `aaai_conference`, `springer_lncs`, `elsevier_article`,
  `neurips_conference`, `icml_conference`, `acl_emnlp`, `mdpi_article`, `wiley_njd`
- **`scanLayout(profileId)`** — dominant-font heuristic (50 paragraphs), margin detection, line spacing; returns `ScanResult<LayoutIssue>` with transparent logs
- **`fixLayoutIssue(issue, profileId)`** — applies body font / font size / line spacing fixes; targeted (only changes paragraphs with detected wrong font)
- **`LayoutIssue` interface** with fields: `margin_top | margin_bottom | margin_left | margin_right | body_font | body_size | line_spacing`
- **"Scan Layout" button** with per-issue Fix buttons and "Detected values" accordion
- **`fixLayoutIssue` Fix buttons** — only for `body_font`, `body_size`, `line_spacing` (margins cannot be set programmatically)

### Fixed
- **`scanCitations`** — replaced broken `body.search(wildcardPattern)` calls (threw `InvalidArgument` on every run) with paragraph-iteration + JS regex `/\[(\d+(?:\s*,\s*\d+)+)\]/g`. `paragraphIndex` now correctly identifies the source paragraph.
- **UI dropdowns** — sub-type (국내/국외) is now stacked below doc-type, not side-by-side
- **`webpack.config.js`** — `client.overlay.runtimeErrors` filter suppresses benign `ResizeObserver loop completed` overlay from FluentUI

---

## [v0.5.4] - 2026-02-01 (False Positive Mitigation)

### 🚀 New Features
- **Particle-Aware Gating**: 한국어 조사(`은/는/이/가/의` 등)가 번호 뒤에 바로 붙는 경우를 "본문 참조"로 인식하여 캡션 후보에서 자동 제외.
  - 이를 통해 본문 설명 문단이 캡션으로 오탐되어 강제 수정되는 심각한 UX 오류 해결.
- **Strict Separator Enforcement**: 캡션 탐지 시 번호 뒤에 반드시 `.`(점), `:`(콜론), `|`(바), 또는 공백이 와야 한다는 규칙을 적용하여 탐지 정확도 향상.

## [v0.5.3] - 2026-02-01 (Regex & Stat Fix)
- **Regex Normalization**: JSON과 TypeScript 간의 이중/사중 이스케이프 문제를 해결하여 정규식 탐지 정확도 복구.
- **Stat Refinement**: 인용 마커 인덱싱 시 숫자가 포함된 유효한 마커만 집계하도록 수정.

## [v0.5.2] - 2026-02-01 (Cascading Selection & KSDS)
- **Hierarchical Selection UI**: 학위논문/저널 -> 대학/지역 -> 최종 포맷으로 이어지는 3단 선택 UI 구현.
- **KSDS Support**: 한국디자인학회 Design Works 포맷 프로필 추가.

## [v0.5.1] - 2026-02-01 (Fix & Fix All)
- **One-Click Fix**: 개별 이슈 카드 및 상단 'Apply All Fixes' 버튼 추가.
- **Doc Anchor**: `paragraphIndex` 기반의 안정적인 문서 위치 추적 및 수정 로직 구현.

## [v0.4.0] - 2026-01-31 (Full Scan & Indexer)
- **Format Indexer**: `Scan All Captions` 버튼 추가. 문서 전체 스캔 기능 도입.

## [v0.1.0] - 2026-01-31 (Initial MVP)
- Initial release with Term, Cite, and Format mock logic.

---

## Quantitative Evaluation — What "Submission Ready" Means

### Score formula
```
score (%) = passed_auto / (passed_auto + failed_auto) × 100
```

- **Auto-verified** (counted): body font, font size, line spacing, margins (if Word API 1.9+), captions, citation brackets
- **Warn** (shown, not counted): fields where `paragraph.font.name` returns empty (run-level fonts)
- **Manual** (listed with expected values, not counted): page size, column count, page margins (API unavailable), reference format

A score of **100% with 0 warnings** means all auto-verifiable requirements pass. Manual items must still be checked by the author.

### Format verification coverage

| Requirement | Status | Notes |
|---|---|---|
| Body font | ✅ Auto | Dominant font across 50 paragraphs |
| Font size | ✅ Auto | Same heuristic |
| Line spacing | ✅ Auto | Average across body paragraphs |
| Page margins | ✅/🔍 Auto or Manual | Auto if Word API 1.9+ available |
| Caption format (text) | ✅ Auto | Per-profile regex + separator |
| Caption style (font/bold) | ✅ Auto | If profile defines `captionStyle.figure.format` |
| Citation bracket style | ✅ Auto | Detects `[1,2]` → should be `[1], [2]` |
| Page size (A4/Letter) | 🔍 Manual | |
| Column count | 🔍 Manual | |
| Reference list format | 🔍 Not implemented | |
| Heading styles (H1/H2/H3) | 🔍 Not implemented | |
| Page / word count limit | 🔍 Not implemented | |
| Abstract structure | 🔍 Not implemented | |

### Known technical limitations

| Issue | Root cause | Status |
|---|---|---|
| `paragraph.font.name` returns empty | Font set at run level, not paragraph level | Warn shown; dominant-font heuristic uses non-empty results |
| Margin auto-detection fails | `Section.body.pageSetup` requires Word API 1.9+ | Manual check shown with exact expected values |
| `body.getRange().ooxml` lacks `<w:sectPr>` | Section props excluded from content range | Fixed: use `Section.body.pageSetup` |
| Caption false positives (pre-v0.8.0) | `new RegExp()` template literal `\s*` = literal `s*` | Fixed: use `\\s*\\d+` |
| Citation Fix destroyed paragraph (pre-v0.9.0) | `insertText(suggestion, replace)` on whole paragraph | Fixed: `range.search(bracketText).insertText(suggestion, replace)` |
| Line spacing Fix did nothing (pre-v0.9.0) | `lineSpacingRule` not in `@types/office-js` v1.0.569; `any` cast bypassed proxy setter | Fixed: use `lineSpacing / 12 * 100` formula only |
| `lineSpacingRule` not in @types | `@types/office-js` v1.0.569 omits property | Workaround: use `lineSpacing` value alone (per API doc: "divided by 12 in UI") |
