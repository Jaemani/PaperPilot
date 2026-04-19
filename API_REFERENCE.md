# API Reference

Complete reference for PaperPilot's Word API integration and server endpoints.

## Table of Contents

1. [Word API Functions](#word-api-functions)
2. [Server API Endpoints](#server-api-endpoints)
3. [Data Structures](#data-structures)
4. [Type Definitions](#type-definitions)

---

## Word API Functions

All functions exported from `src/taskpane/taskpane.ts`.

### Document Operations

#### `getSelectedText(): Promise<string>`

Gets currently selected text in Word document.

**Returns:** Selected text or empty string

**Example:**
```typescript
const text = await getSelectedText();
console.log(text); // "machine learning"
```

---

#### `replaceSelection(newText: string): Promise<void>`

Replaces currently selected text with new text.

**Parameters:**
- `newText: string` - Text to insert

**Example:**
```typescript
await replaceSelection("artificial intelligence");
```

---

#### `replaceParagraphText(paragraphIndex: number, newText: string, profileId?: string): Promise<void>`

Replaces entire paragraph text while preserving formatting.

**Parameters:**
- `paragraphIndex: number` - 0-based paragraph index
- `newText: string` - Replacement text
- `profileId?: string` - Optional profile for font application

**Example:**
```typescript
await replaceParagraphText(5, "Figure 1. New caption text", "ieee_trans");
```

---

#### `getParagraphContext(): Promise<string | null>`

Gets surrounding paragraph context (previous + current, max 400 chars).

**Returns:** Context string or null

**Use case:** Provides context for LLM term analysis

**Example:**
```typescript
const context = await getParagraphContext();
// "...previous paragraph text... Current paragraph with the selected term."
```

---

#### `getSelectionParagraphIndex(): Promise<number>`

Gets paragraph index of current cursor position.

**Returns:** 0-based paragraph index

**Example:**
```typescript
const idx = await getSelectionParagraphIndex();
console.log(idx); // 12
```

---

#### `getPageBoundaries(): Promise<number[]>`

Detects manual page breaks and returns paragraph indices where pages start.

**Returns:** Array of paragraph indices (one per page)

**Limitation:** Only detects manual page breaks (`\f` character), not automatic pagination

**Example:**
```typescript
const boundaries = await getPageBoundaries();
// [0, 45, 92, 137] → 4 pages, starting at paras 0, 45, 92, 137
```

---

### Scan Functions

#### `scanCaptions(profileId: string, offset?: number, endOffset?: number): Promise<ScanResult<CaptionIssue>>`

Scans document for caption format violations.

**Parameters:**
- `profileId: string` - Format profile ID
- `offset?: number` - Start paragraph index (default: 0)
- `endOffset?: number` - End paragraph index (default: document end)

**Returns:** `ScanResult<CaptionIssue>` with issues, stats, and logs

**Checks:**
- Caption prefix format (e.g., "Figure 1." vs "Fig 1")
- Caption separator (period vs colon)
- Font and bold styling
- In-text reference existence

**Example:**
```typescript
const result = await scanCaptions("ieee_trans", 10, 50);
console.log(result.issues.length); // 3
console.log(result.stats.candidatesFound); // 12
```

---

#### `scanCitations(profileId: string, offset?: number, endOffset?: number): Promise<HybridCitationResult>`

Scans for citation bracket style violations.

**Parameters:**
- `profileId: string` - Format profile ID
- `offset?: number` - Start paragraph index
- `endOffset?: number` - End paragraph index

**Returns:** `HybridCitationResult` with auto-fixes and AI candidates

**Detects:**
- Combined brackets: `[1,2,3]` → should be `[1], [2], [3]`
- Cross-reference integrity (cited ↔ defined)

**Example:**
```typescript
const result = await scanCitations("nature_numbered");
console.log(result.autoFixes.length); // 5 certain violations
console.log(result.aiCandidates.length); // 2 ambiguous cases
```

---

#### `scanLayout(profileId: string, offset?: number, endOffset?: number): Promise<ScanResult<LayoutIssue>>`

Scans document layout and typography.

**Parameters:**
- `profileId: string` - Format profile ID
- `offset?: number` - Start paragraph index
- `endOffset?: number` - End paragraph index

**Returns:** `ScanResult<LayoutIssue>`

**Checks:**
- Page size (A4 vs Letter)
- Page margins (top/bottom/left/right in cm)
- Body font name
- Body font size (pt)
- Line spacing (percentage)

**Example:**
```typescript
const result = await scanLayout("kaist_grad_thesis");
// Issues: margin_top, body_size
```

---

#### `scanHeadings(profileId: string, offset?: number, endOffset?: number): Promise<ScanResult<HeadingIssue>>`

Scans heading styles (H1, H2, H3).

**Parameters:**
- `profileId: string` - Format profile ID
- `offset?: number` - Start paragraph index
- `endOffset?: number` - End paragraph index

**Returns:** `ScanResult<HeadingIssue>`

**Checks:**
- Heading font size
- Bold/non-bold styling
- Level progression (no H1 → H3 skips)

**Example:**
```typescript
const result = await scanHeadings("springer_lncs");
// Checks all paragraphs styled as "Heading 1", "Heading 2", "Heading 3"
```

---

#### `scanStructure(profileId: string, offset?: number, endOffset?: number): Promise<ScanResult<StructureIssue>>`

Scans document structure for integrity issues.

**Parameters:**
- `profileId: string` - Format profile ID
- `offset?: number` - Start paragraph index
- `endOffset?: number` - End paragraph index

**Returns:** `ScanResult<StructureIssue>`

**Detects (11 rules):**
1. `blank_paragraphs` - 3+ consecutive blank paragraphs
2. `orphaned_list_item` - Numbered item without surrounding list
3. `heading_level_skip` - H1 → H3 with no H2
4. `empty_section` - Heading followed immediately by next heading
5. `placeholder_text` - TODO, TBD, Lorem ipsum, etc.
6. `abstract_word_count` - Abstract < 100 words
7. `unreferenced_caption` - Caption with no in-text reference
8. `abbreviation_order` - Abbreviation used before definition
9. `duplicate_paragraph` - Identical paragraph repeated
10. `cited_not_defined` - Citation in body, no entry in References
11. `defined_not_cited` - Reference entry never cited in body

**Example:**
```typescript
const result = await scanStructure("aaai_conference");
// Returns all structural issues with paragraphIndex for navigation
```

---

#### `generateSubmissionReport(profileId: string, offset?: number, endOffset?: number, onScanComplete?: (key: ScanKey) => void): Promise<SubmissionReport>`

Runs comprehensive submission readiness check.

**Parameters:**
- `profileId: string` - Format profile ID
- `offset?: number` - Start paragraph index
- `endOffset?: number` - End paragraph index
- `onScanComplete?: (key) => void` - Progress callback

**Returns:** `SubmissionReport` with score, items, and raw scan data

**Runs 5 scans in parallel:**
- Layout/Typography
- Captions
- Citations
- Headings
- References

**Score calculation:**
```
score = passed / (passed + failed) × 100
```

**Example:**
```typescript
const report = await generateSubmissionReport(
  "ieee_trans",
  0,
  undefined,
  (key) => console.log(`${key} done`)
);

console.log(report.score.pct); // 85
console.log(report.items.filter(i => i.status === "fail")); // Failed checks
```

---

### Fix Functions

#### `fixCitationIssue(issue: CitationIssue): Promise<void>`

Fixes a single citation bracket issue.

**Parameters:**
- `issue: CitationIssue` - Issue object from scan

**Example:**
```typescript
await fixCitationIssue(issue);
// Transforms "[1,2,3]" to "[1], [2], [3]" in place
```

---

#### `fixLayoutIssue(issue: LayoutIssue, profileId: string): Promise<void>`

Fixes layout/typography issue.

**Parameters:**
- `issue: LayoutIssue` - Issue object
- `profileId: string` - Format profile ID

**Fixable issues:**
- `body_font` - Changes all body paragraph fonts
- `body_size` - Changes all body paragraph font sizes
- `line_spacing` - Applies correct line spacing
- `margin_*` - Sets page margins (Word Desktop only)
- `page_size` - Sets A4/Letter (Word Desktop only)

**Example:**
```typescript
await fixLayoutIssue(issue, "kaist_grad_thesis");
```

---

#### `fixHeadingIssue(issue: HeadingIssue, profileId: string): Promise<void>`

Fixes heading style issue.

**Parameters:**
- `issue: HeadingIssue` - Issue object
- `profileId: string` - Format profile ID

**Example:**
```typescript
await fixHeadingIssue(issue, "springer_lncs");
// Applies correct font size and bold to heading
```

---

### Utility Functions

#### `selectIssueInDoc(paragraphIndex: number, text: string): Promise<void>`

Navigates to and selects issue location in document.

**Parameters:**
- `paragraphIndex: number` - Paragraph index
- `text: string` - Text to search within paragraph

**Example:**
```typescript
await selectIssueInDoc(42, "Figure 1");
// Scrolls to para 42 and highlights "Figure 1"
```

---

#### `inspectCurrentSelection(): Promise<InspectResult>`

Developer tool: inspects properties of current selection.

**Returns:** Font name, size, style, alignment, bold, italic

**Example:**
```typescript
const props = await inspectCurrentSelection();
console.log(props.fontName); // "Times New Roman"
console.log(props.fontSize); // 11
console.log(props.isBold); // false
```

---

#### `extractSections(): Promise<ExtractedSections>`

Extracts paper sections for AI review.

**Returns:** Object with abstract, introduction, method, results, discussion, conclusion

**Example:**
```typescript
const sections = await extractSections();
console.log(sections.abstract); // Full abstract text
```

---

#### `reviewPaper(sections, venue, profileId, apiBaseUrl, acceptedSamples?, rejectedSamples?): Promise<PaperReview>`

Sends paper for AI review simulation.

**Parameters:**
- `sections: ExtractedSections` - Paper sections
- `venue: string` - Venue name
- `profileId: string` - Format profile ID
- `apiBaseUrl: string` - Server URL
- `acceptedSamples?: string[]` - Accepted paper abstracts
- `rejectedSamples?: string[]` - Rejected paper abstracts

**Returns:** `PaperReview` with scores, recommendations, critical issues

---

## Server API Endpoints

Base URL (development): `http://localhost:3001`
Base URL (production): `https://paperpilot-server.up.railway.app`

### POST `/analyze/term`

Analyzes term formality with AI.

**Request Body:**
```json
{
  "term": "machine learning",
  "context": "Previous paragraph. This paragraph discusses machine learning applications.",
  "profileId": "ieee_trans"
}
```

**Response:**
```json
{
  "isInformal": false,
  "suggestions": [],
  "reason": "The term 'machine learning' is a standard technical term appropriate for IEEE publications."
}
```

**Rate Limit:** 30 requests/minute per IP

---

### POST `/analyze/citations-batch`

Batch AI review of citation candidates.

**Request Body:**
```json
{
  "candidates": [
    {
      "id": "cite_1",
      "paragraphIndex": 12,
      "text": "Recent work [5] shows...",
      "message": "Possible style issue"
    }
  ],
  "profileId": "acl_emnlp"
}
```

**Response:**
```json
[
  {
    "candidateId": "cite_1",
    "isIssue": false,
    "suggestion": null,
    "reasoning": "Citation format is correct for ACL style."
  }
]
```

**Rate Limit:** 30 requests/minute per IP

---

### POST `/analyze/review`

Full paper review with 3-reviewer simulation.

**Request Body:**
```json
{
  "sections": {
    "abstract": "...",
    "introduction": "...",
    "method": "...",
    "results": "..."
  },
  "venue": "NeurIPS",
  "profileId": "neurips_conference",
  "acceptedSamples": ["..."],
  "rejectedSamples": ["..."]
}
```

**Response:**
```json
{
  "overallScore": 7.3,
  "acceptProbability": 65,
  "recommendation": "weak_accept",
  "reviewerScores": [
    {
      "persona": "Methods Expert",
      "score": 8,
      "detailedComment": "...",
      "strengths": ["..."],
      "weaknesses": ["..."]
    }
  ],
  "criticalIssues": [
    {
      "id": "issue_1",
      "severity": "high",
      "category": "novelty",
      "issue": "Limited comparison with recent work"
    }
  ],
  "comparativeBenchmark": {
    "yourNoveltyScore": 6.5,
    "acceptedAvgNovelty": 7.8,
    "keyGaps": ["..."],
    "strengths": ["..."]
  }
}
```

**Rate Limit:** 30 requests/minute per IP
**Cost:** ~$0.10 per review (GPT-4o)

---

## Data Structures

### ScanResult<T>

Generic scan result container.

```typescript
interface ScanResult<T> {
  issues: T[];          // Array of detected issues
  stats: {              // Scan statistics
    candidatesFound?: number;
    totalParagraphs?: number;
    [key: string]: any;
  };
  logs: string[];       // Human-readable log messages
}
```

---

### CaptionIssue

Caption format violation.

```typescript
interface CaptionIssue {
  id: string;                    // "caption_12_format"
  type: "caption";
  paragraphIndex: number;        // Location in document
  text: string;                  // "Figure 1: caption text"
  message: string;               // Human-readable error
  suggestion: string;            // Corrected version
  field?: "format" | "style";    // Issue category
}
```

---

### CitationIssue

Citation bracket style issue.

```typescript
interface CitationIssue {
  id: string;                    // "cite_5_combined"
  type: "citation";
  paragraphIndex: number;
  text: string;                  // "[1,2,3]"
  message: string;
  suggestion: string;            // "[1], [2], [3]"
}
```

---

### LayoutIssue

Layout/typography issue.

```typescript
interface LayoutIssue {
  id: string;
  type: "layout";
  field: "margin_top" | "margin_bottom" | "margin_left" | "margin_right"
       | "body_font" | "body_size" | "line_spacing" | "page_size";
  currentValue: string;          // "2.5 cm", "Times New Roman"
  expectedValue: string;         // "2.0 cm", "Palatino Linotype"
  message: string;
}
```

---

### HeadingIssue

Heading style issue.

```typescript
interface HeadingIssue {
  id: string;
  type: "heading";
  level: 1 | 2 | 3;              // H1, H2, or H3
  paragraphIndex: number;
  text: string;                  // Heading text
  field: "fontSize" | "isBold";
  currentValue: string;
  expectedValue: string;
  message: string;
}
```

---

### StructureIssue

Document structure issue.

```typescript
interface StructureIssue {
  id: string;
  type: "structure";
  rule: "blank_paragraphs" | "orphaned_list_item" | "heading_level_skip"
      | "empty_section" | "placeholder_text" | "abstract_word_count"
      | "unreferenced_caption" | "abbreviation_order" | "duplicate_paragraph"
      | "cited_not_defined" | "defined_not_cited";
  paragraphIndex: number;        // -1 if no single location
  text: string;
  message: string;
}
```

---

### SubmissionReport

Comprehensive check result.

```typescript
interface SubmissionReport {
  score: {
    passed: number;              // Count of passed checks
    failed: number;              // Count of failed checks
    warned: number;              // Count of warnings
    manual: number;              // Count of manual checks
    pct: number;                 // Percentage score
  };
  items: CheckItem[];            // All check items
  rawScans: {                    // Raw scan data
    layout: ScanResult<LayoutIssue>;
    captions: ScanResult<CaptionIssue>;
    citations: HybridCitationResult;
    headings: ScanResult<HeadingIssue>;
  };
  scanLogs: string[];            // Combined logs
  generatedAt: string;           // ISO timestamp
}
```

---

### CheckItem

Individual check in submission report.

```typescript
interface CheckItem {
  id: string;                    // "typo_font", "content_captions"
  category: "typography" | "layout" | "headings" | "captions" | "citations" | "references";
  label: string;                 // "Body font"
  status: "pass" | "fail" | "warn" | "manual";
  currentValue?: string;
  expectedValue?: string;
  detail: string;                // Pass/fail detail message
  autoFixable: boolean;          // Can be auto-fixed
}
```

---

## Type Definitions

### Format Profile

Structure of `journalFormats.json` profiles.

```typescript
interface FormatProfile {
  id: string;                    // "ieee_trans"
  name: string;                  // "IEEE Transactions"
  status: "verified" | "todo" | "partial";
  rules: {
    captionStyle?: {
      figure?: CaptionRule;
      table?: CaptionRule;
    };
    layout?: {
      pageSize: "A4" | "Letter";
      columns: 1 | 2;
      margins: {
        top: number;             // cm
        bottom: number;
        left: number;
        right: number;
      };
    };
    typography?: {
      body: {
        fontName: string;        // "Times New Roman"
        fontSize: number;        // pt
        lineSpacingPct: number;  // 150 = 1.5x
      };
      headings: {
        h1: { fontSize: number; isBold: boolean };
        h2: { fontSize: number; isBold: boolean };
        h3?: { fontSize: number; isBold: boolean };
      };
    };
    abstract?: {
      maxWords?: number;
    };
  };
}
```

---

### CaptionRule

Caption format specification.

```typescript
interface CaptionRule {
  prefix: string;                // "Figure", "그림", "Table"
  format: string;                // "1", "1.1", "I", "A"
  separator: "period" | "colon"; // ". " or ": "
  fontName?: string;
  fontSize?: number;
  isBold?: boolean;
}
```

---

## Translation Keys

All translation keys available in `translations.KOR` and `translations.ENG`:

### Navigation
- `term`, `cite`, `format`, `review`

### Actions
- `fix`, `fixAll`, `fixAllN(n)`, `tryFix`, `goTo`, `go`, `apply`, `applyAll`

### Scans
- `scanCitations`, `scanCaptions`, `scanCitationsAndCaptions`, `scanLayout`, `scanHeadings`, `scanStructure`, `fullCheck`, `reviewPaper`

### Status
- `checking`, `scanning`, `analyzing`, `applying`, `reviewing`
- `allOk`, `informal`, `formal`, `pass`, `fail`, `warn`

### Sections
- `manualScans`, `layout`, `layoutCheck`, `headingCheck`, `typography`, `headings`, `captions`, `citations`, `references`, `detectedValues`, `detectedHeadings`, `scanLogs`

### Messages
- `pageLayoutMatches(name)`, `nIssues(n)`, `nHeadingsChecked(n, name)`, `noHeadingStyled`
- `allCaptionsValid(n)`, `noCitationIssues(n)`, `autoFixesAndCandidates(auto, ai)`
- `certainViolations(n)`, `fixCaption`, `fixCitation`, `para`

...and 150+ more keys for complete UI coverage.

---

## Error Handling

All async functions may throw:

- `Error` - General operation failure
- Word API errors are caught and logged
- Server errors return JSON with `{ error: string }` field

**Best Practice:**
```typescript
try {
  const result = await scanCaptions("ieee_trans");
  // Handle result
} catch (error) {
  console.error("Scan failed:", error.message);
  // Show user-friendly message
}
```

---

## Rate Limiting

Server endpoints are rate-limited to **30 requests/minute per IP**.

Exceeding the limit returns:
```json
{
  "error": "Too many requests, please try again later."
}
```

**Status Code:** 429 Too Many Requests

---

## Version Compatibility

- **Office.js API:** Requires Word API 1.3+ (Word 2016 or later)
- **Advanced features:** API 1.9+ for `pageSetup` (Word Desktop 16.0+)
- **Context menu:** Word Desktop only (not supported in Word Online)

**Check API availability:**
```typescript
if (Office.context.requirements.isSetSupported("WordApi", "1.9")) {
  // Use advanced features
}
```
