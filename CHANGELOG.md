# Changelog

---

## [v1.3.1] - 2026-02-20 — Korean Caption Support + Context Menu Fix

### Fixed
- **Korean in-text reference detection** — `INTEXT_REF_RE` changed from `\b(Figure|...)` to `(?<![A-Za-z])(Figure|...)`. The ASCII word boundary `\b` never fires before non-ASCII characters (Korean `그림`, `표` are `\W`), causing all Korean-captioned figures to be flagged as "never referenced". The negative lookbehind `(?<![A-Za-z])` correctly allows Korean context (`...에서 그림 1...` now matches) while blocking Latin letter adjacency.
- **Korean body sentence false positives** — Added `BODY_SENTENCE_JOSA_RE` pattern to detect Korean sentences starting with `그림 N. 는` or `그림 N. 은` (figure/table as grammatical subject followed by Korean postposition). These paragraphs are now correctly classified as body text (not captions) even though they start with `그림 N.`. Pattern matches 15 common Korean josa: `는 / 은 / 이 / 가 / 을 / 를 / 에서 / 에 / 의 / 과 / 와 / 도 / 로 / 으로 / 부터 / 까지 / 에게`.
- **Caption message shows original prefix** — `captionSet` now stores `{ paraIdx, orig }` where `orig` is the raw matched prefix (e.g. `그림 1`). Issue messages now read `"그림 1" has a caption but is never referenced…` instead of the misleading `Figure 1 has a caption…` (which was reconstructed from the normalized key).
- **Context menu works when panel already open** — Extracted pending-term check into `checkPendingTerm()` reusable function. Added `document.visibilitychange` listener that fires when the task pane gains visibility. Previously, right-clicking "Analyze Term with AI" only worked when the panel was closed (fresh `Office.onReady` call). Now works in both cases: (1) panel closed → `Office.onReady` fires, (2) panel already open → `Office.addin.showAsTaskpane()` refocuses it → `visibilitychange` fires. Cleanup function removes listener on unmount.

### Changed
- **"Set start to current page" button renamed to "Set start point"** — shorter, clearer. Tooltip still explains full behavior: "Set scan start to the page containing the current cursor".

### Engineering notes
- Korean josa check runs AFTER `CAPTION_PREFIX_RE` test — `isCaption = /caption/i.test(style) || (CAPTION_PREFIX_RE.test(text) && !BODY_SENTENCE_JOSA_RE.test(text))`. Order matters: the negative check must override the positive prefix match.
- `visibilitychange` fires on every tab switch / window focus change. The check is fast (just reads a document setting) so no performance concern.

---

## [v1.3.0] - 2026-02-19 — Cross-Reference Integrity: Citation ↔ Reference list

### Added
- **`cited_not_defined` check** (Review tab, Check 10a): Scans all `[N]` citation brackets in the body (before the References heading). Any number `N` that is cited but has no corresponding `[N]` / `(N)` / `N.` entry in the References section is flagged as an orphaned citation.
- **`defined_not_cited` check** (Review tab, Check 10b): Conversely, any reference entry that exists in the References section but whose number never appears in a `[N]` citation in the body is flagged as an uncited reference.
- Both checks run inside the existing `scanStructure()` `Word.run` call — no additional API round-trip.
- Pre-scan guide updated with "Orphaned cite" and "Uncited ref" rows.

### Implementation details
- Reference heading detection reuses the same `/^(References|Bibliography|참고문헌|Reference List)\s*$/i` regex as `scanReferences()`.
- Citation extraction handles comma-lists (`[1,2,3]`) and numeric ranges (`[1-3]`, `[1–3]`). Ranges are expanded with a cap of +50 to prevent runaway sets.
- `definedNums` and `citedNums` are `Set<number>` iterated via `.forEach()` (required — `for...of` on Set not supported at tsconfig target).
- Cross-check only runs when `definedNums.size > 0` — documents without a numbered reference list are silently skipped.
- `cited_not_defined` issues have `paragraphIndex: -1` (no single location to jump to — suppresses Go button). `defined_not_cited` issues point to the References heading paragraph.

---

## [v1.2.2] - 2026-02-19 — Review Tab UX: Pre-scan Guide + Grouped Results

### Changed
- **Pre-scan guide** — Review tab now shows a labelled checklist of all 9 rule checks before the first scan (previously just a one-line description). Each entry shows the rule category badge alongside a plain-English description of what it catches, so users know what to expect before clicking Scan.
- **Grouped results** — Issues are now grouped by rule category. Instead of N identical "Blank lines" cards, a single card per category is shown with a count badge and individual occurrences stacked inside, separated by thin dividers. The summary line reads "X issues in Y categories" to give an immediate sense of breadth vs. depth.
- Go button placement moved inline with the message text (`flex-start` alignment) so it does not push content below.

### Engineering notes
- Grouping implemented via `Partial<Record<StructureIssue["rule"], StructureIssue[]>>` accumulator inside an IIFE in JSX — avoids introducing a new state variable or helper function for a render-only concern.
- `ruleOrder` array controls display order independently of the order issues were found.

---

## [v1.2.1] - 2026-02-19 — Review Tab Tier-2 Checks

### Added
- **Caption ↔ in-text cross-reference** (`unreferenced_caption`): builds a caption number set from caption-styled paragraphs and body paragraphs starting with Figure/Table/그림/표, then cross-checks against in-text references (`\b(Figure|Fig|Table)\s+\d+\b`). Reports (a) captions with no in-text reference, and (b) in-text references with no matching caption. Normalises "Fig.", "Fig", "Figure", "그림" → `fig` and "Tab.", "Table", "표" → `tbl` before comparing. `paragraphIndex: -1` for (b) cases suppresses the Go button.
- **Abbreviation lifecycle** (`abbreviation_order`): two-pass scan. Pass 1 finds all `(ABBR)` definitions (2–8 uppercase letters in parentheses) and records their first paragraph. Pass 2 finds, for each defined abbreviation, the first standalone use (`\bABBR\b`) that appears before the definition paragraph. Headings excluded from the use-search. Only abbreviations defined somewhere in the document are checked — never-defined acronyms (AI, LLM, IEEE) are not flagged.
- **Duplicate paragraph** (`duplicate_paragraph`): exact-text hash of all non-heading paragraphs ≥ 40 characters. Flags the second occurrence with the paragraph index of the first.

### Fixed
- **`isTrulyBlank()` predicate** now used in the empty-section check as well (previously used raw `text.trim() === ""`). Image paragraphs no longer cause sections to appear "empty".
- **Go button** now uses `issue.paragraphIndex >= 0` as its condition — cleaner than enumerating rule names to exclude.

---

## [v1.2.0] - 2026-02-19 — Review Tab + Context Menu Term Analysis

### Added
- **Review tab** — new 4th tab alongside Term / Cite / Format. Runs a rule-based structural integrity scan that detects artifact-class issues invisible to format checkers and spellcheckers:
  - Excessive consecutive blank paragraphs (≥ 3) — copy-paste artifact
  - Orphaned list items (`4.` alone with no following content)
  - Heading level skip (H1 → H3 with no H2 between them)
  - Empty section (heading with no body text before next heading)
  - Placeholder / template text (`[이름]`, `TODO`, `XXX`, `Figure X`, `Lorem ipsum`, etc.)
  - Abstract word count (if profile specifies `rules.abstract.maxWords`)
- **"Analyze Term with AI" context menu** — right-clicking selected text in Word now shows "Analyze Term with AI". Clicking: (1) stores the selection in document settings, (2) shows/focuses the task pane, (3) task pane auto-switches to Term tab and triggers full analysis without any additional user action. Implemented via `ExecuteFunction` action in manifest + `analyzeTermCommand` in `commands.ts`. Note: context menu add-in extensions are supported on Word Desktop only (not Word Online per Microsoft spec).
- **`scanStructure()` + `StructureIssue` interface** — exported from `taskpane.ts`. Six rule categories, no LLM calls, page-range aware. Each issue includes `paragraphIndex` for "Go" button navigation.

### Changed
- **Scan range UI** — split into two separate rows: `Page [from] – [to]` number inputs on top, "Set start to current page" button on a separate row. Inputs now use 1-based page numbers (converted to paragraph indices via `getPageBoundaries()` before each scan).
- **Margin display in Action Required** — replaced editable T/B/L/R number inputs with read-only "Set to: T Xcm · B Xcm · L Xcm · R Xcm" text. Values still come from the profile via `marginDraft`.
- **"On Word Online:" prefix removed** — inline notes now read "Layout → Margins → Custom Margins" and "Layout → Size" directly.
- **Progress badges** — check list during Full Check is now vertical (column layout) and stays visible for 1 second after all checks complete before disappearing.
- **Apply All / Try Fix loading state separated** — added `isFixAllLoading` state. Full Check button now only animates during actual scan (`isReportLoading`); Apply All button shows its own "Applying…" spinner (`isFixAllLoading`). Previously both shared `isReportLoading` causing Full Check button to animate during fix operations.

### Engineering decisions
- **Context menu → task pane bridge**: `commands.ts` stores selection in `Office.context.document.settings` ("pp_analyzeTerm") then calls `Office.addin.showAsTaskpane()`. App.tsx reads the setting in `Office.onReady` callback, clears it, and fires a `pendingTermAnalysis` state that triggers a `useEffect`-driven API call. Avoids polling; settings persist across the command/task-pane process boundary.
- **`scanStructure` design**: pure `Word.run` with single `load + sync` pass. No LLM, no server cost. Heading level tracking, blank-run counting, and placeholder regex all run in one sequential pass over the sliced paragraph array.
- **Page-based scan range**: `getPageBoundaries()` scans for `\f` (manual page break character) in paragraph text to build a boundaries array. Automatic overflow page breaks are not detectable via Word JS API and are documented as a known limitation.

---

## [v1.1.7] - 2026-02-19 — Cite Tab UX + Feature Report + Action Required footnote

### Fixed
- **Cite tab: log accordion removed from results** — raw scan logs ("Scanning paras…") were showing as the primary feedback. Logs are debugging artifacts and are no longer visible in scan results.
- **Cite tab: proper 0-issue state** — instead of plain "No caption issues found." text, a green badge + count now reads "All captions valid — N detected, 0 issues" (captions) or "No citation style issues found — N paragraphs scanned" (citations). This distinguishes "found none" from "scan did nothing".
- **Cite tab: loading spinner** — `isLoading` now drives a visible "Scanning paragraphs…" spinner + status text between the scan buttons and results, matching the Term tab's feedback pattern.

### Added
- **Action Required footnote** — small italic note inline with the callout header: "ⓘ Try Fix works on Word Desktop 16.0+ only · Page setup API not supported in Word Online". Addresses user confusion about why margin/size fixes have no effect on Word Online.
- **`TECHNICAL_REPORT.md §12` — Feature Verification Report (v1.1.7)** — 8 subsections covering every scan module, product pitch angles, engineering decision rationale, Word API resource map, and format profile source list. Suitable for both technical contributor reference and product demos.

---

## [v1.1.6] - 2026-02-19 — Apply All Redesign + Stale Results + No Duplicate Buttons

### Fixed
- **Apply All for Full Check report moved to controls area** — was an inline "Fix All Flagged (N issues)" button inside the report; now appears at the same position and with the same appearance as the Cite tab's Apply All button (above the Divider, in the controls section).
- **All scan handlers clear stale results before starting** — `handleScanLayout`, `handleScanCaptions`, `handleScanCitations`, and the inline Headings button each set their result state to `null` before the scan starts. `handleFullCheck` clears all four individual scan states. Old Full Check report is cleared when Layout or Headings are re-scanned individually (since report would be stale).
- **Duplicate "Submission Readiness" button removed from Manual Scans accordion** — was added in v1.1.5 and was identical to the primary Full Check button above. Accordion now contains Layout + Headings only.
- **`fixLayoutIssue` margin fix now uses `issue.expectedValue`** — previously the function always read margin values from the profile, ignoring the user-edited `marginDraft` inputs. Now parses `parseFloat(issue.expectedValue)` first, falls back to profile values.
- **`fixLayoutIssue` uses `sections.getFirst()`** instead of `sections.load("items")[0]` — cleaner proxy access, avoids unnecessary collection load before a write operation.

---

## [v1.1.5] - 2026-02-19 — Informal Badge, Term Spinner, Fix All Report, Margin Inputs

### Fixed
- **"Informal" badge was hardcoded** — always showed yellow "Informal" badge regardless of the LLM's answer. Now shows green "Formal ✓" when `suggestions.length === 0` (term is acceptable); "Informal" only when suggestions are returned.
- **Analyze Term button showed no feedback during API call** — button is now disabled and shows `<Spinner /> Analyzing…` while the fetch is in progress. Result card is hidden during loading.
- **Apply All for Full Check report** — added `handleReportFixAll` which applies all `fail` items in one serial pass then rescans once (no intermediate rescans). Refactored `handleReportFix` into `applyReportItemFix` (fix logic) + `rescanAfterReportFix` (shared rescan helper).

### Added
- **Editable margin inputs in Action Required callout** — `layout_margins` item shows four number inputs (T/B/L/R in cm) pre-filled from the selected profile. Users can edit values before clicking "Try Fix". `marginDraft` state is synced from profile on profile change.
- **Manual Scans accordion includes Submission Readiness** — Full Check button added as first item inside accordion so all scan triggers are visible together. *(Note: removed again in v1.1.6 as redundant.)*
- **Word Online caveat on margin/page-size Try Fix buttons** — italic note shown inline.

---

## [v1.1.4] - 2026-02-19 — body_font/size Fix + Paragraph Context + Tab Reorganization

### Fixed
- **`fixLayoutIssue` body_font/size left most paragraphs unchanged** — root cause: `if (p.font.name === issue.currentValue)` restriction — `p.font.name` returns empty string for run-level formatted paragraphs. Fixed by loading `paragraph.style`, skipping heading paragraphs (`/^Heading\s*[1-9]$/i`), and applying font to all eligible body paragraphs regardless of current `font.name` value.
- **`fixLayoutIssue` body_size also affected** — `cur > 0` guard skipped paragraphs where `paragraph.font.size` reads 0 at paragraph level (font set at run level). Guard removed; size applied unconditionally to all non-heading non-empty paragraphs.

### Added
- **`getParagraphContext()`** — exports the previous paragraph + current paragraph text (max 400 chars, tail-truncated) for use as LLM context.
- **Term check sends full paragraph context** — `analyze/term` API now receives `{ term: selection, context: paragraphCtx || selection }` where `paragraphCtx` is the surrounding two paragraphs. Prevents false "informal" flags when selected word is a standard technical term in context.
- **Captions scan + results moved to Cite tab** — Format Manual Scans now contains Layout + Headings only. Cite tab has "Scan Citations" (primary) + "Scan Captions" (secondary outline). Full Check still scans all 5.
- **Apply All in Cite tab covers both captions and citations** — fixes captions first, then citations, serially.
- **Word Online note on margins Fix button**.

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
