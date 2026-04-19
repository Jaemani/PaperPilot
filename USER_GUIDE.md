# PaperPilot User Guide

Complete guide for researchers using PaperPilot to prepare academic papers for submission.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Interface Overview](#interface-overview)
3. [Term Check](#term-check)
4. [Citation Check](#citation-check)
5. [Format Check](#format-check)
6. [Review Check](#review-check)
7. [Submission Preparation](#submission-preparation)
8. [Troubleshooting](#troubleshooting)
9. [Supported Formats](#supported-formats)

---

## Getting Started

### Installation

1. **Open Word** (Word Online, Word Desktop 2016+, or Microsoft 365)

2. **Load PaperPilot:**
   - Click **Insert** → **Add-ins** → **My Add-ins**
   - Select **Upload My Add-in**
   - Choose `manifest.xml` file
   - Click **Upload**

3. **Launch:**
   - Click **Home** tab → **PaperPilot** button in ribbon
   - Task pane opens on the right side

### First Time Setup

1. **Select Language:**
   - Click **KOR** or **ENG** button in header to switch interface language
   - All labels, messages, and instructions will update

2. **Choose Format Profile:**
   - Select document type: **학위논문** (Thesis) or **저널** (Journal)
   - If journal: Choose **국내** (Domestic) or **국외** (Foreign)
   - Select specific institution/journal from final dropdown

3. **Set Scan Range (Optional):**
   - Default: scans entire document
   - To exclude cover page: place cursor after cover, click "Set start point"
   - Or manually enter page numbers: **Page 1 – 10**

---

## Interface Overview

### Header

```
[Logo] PaperPilot                    [KOR/ENG]
[Term] [Cite] [Format] [Review]
```

- **Logo:** Click to return to default view
- **Language Toggle:** Switch between Korean and English
- **Tabs:** Four main features (Term, Cite, Format, Review)

### Main Area

- **Dropdowns:** Format profile selection
- **Scan Range:** Page range controls
- **Primary Button:** Main action for current tab
- **Results:** Issues displayed as cards with Fix buttons
- **Developer Tools:** Expandable panel at bottom (for debugging)

---

## Term Check

### Purpose

Analyzes selected terms for academic formality and suggests alternatives.

### Usage

#### Method 1: Manual Selection

1. Select text in your document (word or phrase)
2. Switch to **Term** tab
3. Text appears in input box
4. Click **Analyze Term with AI**
5. Results show:
   - **Green badge "Formal ✓"** - Term is appropriate
   - **Yellow badge "Informal"** - Suggestions provided

#### Method 2: Right-Click Menu (Word Desktop only)

1. Select text in document
2. Right-click → **Analyze Term with AI**
3. PaperPilot opens automatically
4. Analysis runs immediately

### Understanding Results

**Formal Term:**
```
✓ Formal
The term "machine learning" is a standard technical term
appropriate for IEEE publications.
```

**Informal Term:**
```
⚠ Informal
"basically" is too casual for academic writing.

Suggested alternatives:
⚡ fundamentally
⚡ essentially
⚡ primarily
```

**Click a suggestion to replace** your selection instantly.

### Tips

- **Context matters:** The AI analyzes the surrounding paragraph to understand usage
- **Profile-aware:** Different venues have different standards (IEEE vs Nature)
- **Not a spellchecker:** This checks formality, not correctness

---

## Citation Check

### Purpose

Validates citation bracket styles and cross-references.

### What It Checks

1. **Bracket Format:**
   - ❌ `[1,2,3]` → ✅ `[1], [2], [3]` (IEEE, Springer, etc.)
   - ❌ `[1-3]` → ✅ `[1], [2], [3]` (if ranges not allowed)

2. **Caption Format:**
   - Figure/Table captions match profile requirements
   - Prefix: "Figure 1." vs "Fig. 1" vs "그림 1."
   - Separator: period (.) vs colon (:)
   - Font and bold styling

3. **Cross-References:**
   - Every caption is referenced in text
   - Every in-text reference has a matching caption

### Usage

1. Select format profile (if not already selected)
2. Click **Scan Citations & Captions**
3. Review results:

**Captions Section:**
```
✓ All captions valid — 12 detected, 0 issues
```

**Or if issues found:**
```
⚠ Caption
Figure 1: Introduction
⚠️ Caption should use period separator, not colon
➜ Figure 1. Introduction

[Fix Caption]
```

**Citations Section:**
```
3 auto-fixes, 0 AI candidates

⚠ Auto-Fix
3 certain violations

Para 15
References [5,6,7] show that...
Combined citation brackets should be separated
[Fix → [5], [6], [7]]
```

### Fixing Issues

- **Single Issue:** Click **Fix Caption** or **Fix** button on the card
- **All Issues:** Click **Apply All** button at top

### Tips

- Captions are detected by:
  - Paragraph style named "Caption"
  - Text starting with "Figure", "Table", "그림", "표"
- Korean captions fully supported (e.g., "그림 1. 는 시스템을 보여준다")
- Fix buttons update document immediately

---

## Format Check

### Purpose

Comprehensive layout, typography, and submission readiness check.

### What It Checks

#### Automatic Verification

1. **Typography:**
   - Body font (Times New Roman, Palatino, etc.)
   - Font size (10pt, 11pt, 12pt)
   - Line spacing (single, 1.5×, double)

2. **Layout:**
   - Page margins (top/bottom/left/right in cm)
   - Page size (A4 vs Letter) *(Word Desktop only)*

3. **Headings:**
   - H1, H2, H3 font sizes
   - Bold/non-bold styling

4. **Captions & Citations:**
   - Same as Cite tab checks

#### Manual Verification

1. **Column count** (1 vs 2-column)
2. **Reference list format**

### Usage

#### Quick Check

1. Click **Full Check — Submission Readiness**
2. Wait ~3-5 seconds (progress badges show live status)
3. Review score and checklist

#### Individual Scans

1. Expand **Manual Scans** accordion
2. Click **Layout** or **Headings**
3. See detailed results

### Understanding the Report

**Header:**
```
Submission Readiness    85%

12/14 auto-verified · 0 undetected · 2 manual
```

**Score Calculation:**
```
Score = passed / (passed + failed) × 100

Only auto-verifiable items counted
Manual checks shown separately
```

**Action Required Section** (if any):
```
⚠ Action required (2)

Page margins
Set to: T 2cm · B 2cm · L 2.5cm · R 2.5cm
Layout → Margins → Custom Margins
[Try Fix]  ← Only works on Word Desktop

Page size
Set to: A4
Layout → Size
```

**Results by Category:**

```
Typography
✅ Body font - Times New Roman
✅ Font size - 11pt
✅ Line spacing - 150%

Layout
❌ Top margin
   Current: 2.5 cm
   Expected: 2.0 cm
   [Fix]

Captions
✅ Captions - 12 scanned, 0 issues

Citations
❌ Citations - 3 issues
   [Fix All (3)]
```

### Fixing Issues

#### Automatic Fixes

- Click **Fix** button next to each issue, OR
- Click **Apply All** to fix everything at once

#### Manual Fixes (Word Online)

If you see "Try Fix works on Word Desktop 16.0+ only":

1. Note the expected values
2. Open Word's Layout menu
3. Set values manually:
   - **Margins:** Layout → Margins → Custom Margins
   - **Size:** Layout → Size → A4 or Letter

### Tips

- **100% score ≠ perfect paper** - Manual checks still required
- **Word Online limitations:** Page setup API not available
- **Scan range:** Exclude cover page with "Set start point" button
- **Profile matters:** Different journals have different requirements

---

## Review Check

### Purpose

Detects structural and content issues that format checkers miss.

### What It Checks (11 Rules)

1. **Blank lines** - 3+ consecutive empty paragraphs
2. **Orphaned item** - Numbered item without surrounding list
3. **Heading skip** - H1 → H3 with no H2 in between
4. **Empty section** - Heading with no content before next heading
5. **Placeholder** - TODO, TBD, [Name], Lorem ipsum, etc.
6. **Abstract length** - Abstract shorter than 100 words
7. **Figure ref** - Caption with no in-text citation
8. **Abbr. order** - Abbreviation used before definition
9. **Duplicate** - Same paragraph repeated (≥40 chars)
10. **Orphaned cite** - [N] cited but no entry in References
11. **Uncited ref** - Reference entry never cited in body

### Usage

#### Structure Check

1. Click **Scan Document Structure**
2. Results show grouped by category:

**No Issues:**
```
✓ No structural issues found
```

**With Issues:**
```
3 issues in 2 categories

⚠ Blank lines (2)
  Para 15-17: 3 consecutive blank paragraphs
  [Go]

  Para 42-44: 3 consecutive blank paragraphs
  [Go]

⚠ Placeholder (1)
  Para 25: Contains placeholder text "TODO: Add results"
  [Go]
```

#### Paper Review (AI-Powered)

1. *(Optional)* Click **▶ Optional: Add Comparison Samples**
2. Paste 1-3 accepted paper abstracts
3. Click **Review Paper for Submission**
4. Wait ~1-2 minutes
5. Review results:

**Overall Score:**
```
Overall Score: 7.3/10
WEAK_ACCEPT

65%
Accept prob.
```

**Reviewer Scores:**
```
Methods Expert    8/10

The methodology is sound and well-documented, but the
experimental setup could be more comprehensive.

✓ Strengths:
  • Clear explanation of novel approach
  • Rigorous statistical analysis

✗ Weaknesses:
  • Limited comparison with recent work
  • Small dataset size
```

**Critical Issues:**
```
HIGH | novelty
Limited comparison with state-of-the-art methods from 2025

MEDIUM | results
Ablation study needed to validate component contributions
```

**Comparison (if samples provided):**
```
Novelty Assessment
Your paper: 6.5/10  •  Accepted avg: 7.8/10

Key Gaps vs Accepted Papers:
• Lacks theoretical foundation for proposed approach
• Experimental validation limited to single domain
```

### Tips

- **Structure check is fast** (~1 second) - run it early and often
- **AI review costs ~$0.10** per run - use sparingly
- **Comparison samples improve accuracy** - paste similar accepted papers
- **"Go" button** jumps to issue location in document
- **Review is not a guarantee** - treat as one data point among many

---

## Submission Preparation

### Complete Workflow

Follow these steps before submitting your paper:

#### 1. Profile Selection (1 min)

```
Document Type: 저널
Region: 국외
Profile: IEEE Transactions
```

#### 2. Structure Review (2 min)

```
Review Tab → Scan Document Structure
Fix: Remove blank lines, placeholders, orphaned items
```

#### 3. Citation & Caption Check (5 min)

```
Cite Tab → Scan Citations & Captions
Fix: Apply All (or individual fixes)
Verify: All captions have in-text references
```

#### 4. Format Check (5 min)

```
Format Tab → Full Check
Score target: 100% (or as close as possible)
Fix: Apply All auto-fixes
Manual: Set margins/page size in Word (if needed)
```

#### 5. Content Review (10 min)

```
Term Tab: Check key technical terms
Review Tab: AI review (optional, $0.10)
Read through critical issues
```

#### 6. Final Verification (2 min)

```
Format Tab → Full Check (re-run)
Verify: 100% score
Check: All manual items completed
```

### Pre-Submission Checklist

- [ ] Profile matches target journal/conference
- [ ] Structure scan shows 0 issues
- [ ] All captions formatted correctly
- [ ] All citations use correct bracket style
- [ ] All figures/tables referenced in text
- [ ] Format check score: 100%
- [ ] Manual items (margins, size) verified
- [ ] Key terms reviewed for formality
- [ ] Reference list format matches profile

---

## Troubleshooting

### Issue: "This add-in will not run in your version of Office"

**Cause:** Using Internet Explorer or Edge Legacy webview

**Solution:**
- Upgrade to Office 2021 or Microsoft 365
- Use Word Online instead

---

### Issue: Fix buttons do nothing in Word Online

**Cause:** Word Online doesn't support page setup API

**Solution:**
- Use Word Desktop for margin/page size fixes
- Or manually set values via Layout menu

---

### Issue: Caption not detected

**Possible Causes:**
1. Paragraph style is not "Caption"
2. Text doesn't start with "Figure", "Table", etc.
3. Separator issue (colon vs period)

**Solution:**
- Apply "Caption" style to paragraph
- Start with correct prefix: "Figure 1." or "그림 1."
- Check profile requirements

---

### Issue: False positive caption detection

**Example:** "Figure 1. is shown in the diagram" flagged as caption

**Cause:** Body paragraph starts with figure reference

**Solution:** Korean josa detection is automatic (v1.3.1+)
For English: Rephrase to avoid starting with "Figure N."

---

### Issue: Language toggle doesn't switch all text

**Cause:** Likely a bug - please report

**Solution:** Refresh add-in (close and reopen)

---

### Issue: Scan shows no results but document has issues

**Check:**
1. Correct profile selected?
2. Scan range includes problematic paragraphs?
3. Document content actually violates rules?

**Debug:** Expand scan logs accordion to see what was checked

---

### Issue: "Request timeout" during AI review

**Cause:** Server busy or slow network

**Solution:**
- Try again in 1 minute
- Check internet connection
- Reduce comparison samples

---

## Supported Formats

### Thesis (학위논문)

#### Korean Universities

- **KAIST** (Korea Advanced Institute of Science and Technology)
- **SNU** (Seoul National University)
- **POSTECH** (Pohang University of Science and Technology)
- **Yonsei** (Yonsei University)
- **HYU** (Hanyang University)
- **KU** (Korea University)
- **SU** (Sogang University)
- **SKKU** (Sungkyunkwan University)

### Journals - Domestic (국내 저널)

- **KICS** (한국통신학회)
- **KIISE** (한국정보과학회)
- **KSDS** (한국디자인학회)

### Journals - International (국외 저널)

#### Computer Science

- **IEEE Transactions** (Institute of Electrical and Electronics Engineers)
- **ACM Reference Format** (Association for Computing Machinery)
- **Springer LNCS** (Lecture Notes in Computer Science)
- **ACL/EMNLP** (Association for Computational Linguistics)

#### Machine Learning & AI

- **NeurIPS** (Neural Information Processing Systems)
- **ICML** (International Conference on Machine Learning)
- **AAAI** (Association for the Advancement of Artificial Intelligence)

#### Science & Engineering

- **Nature** (Numbered superscript style)
- **Elsevier** (General article format)
- **MDPI** (Multidisciplinary Digital Publishing Institute)
- **Wiley NJD** (New Journal of Dentistry style)

### Format Profile Details

Each profile specifies:
- Caption format (Figure/Table prefix, numbering, separator)
- Typography (font family, size, line spacing)
- Layout (page size, margins, columns)
- Heading styles (H1/H2/H3 sizing and bold)

**Total Profiles:** 20 verified formats

**Profile Status:**
- ✅ **Verified** - Extracted from official templates
- ⏳ **Partial** - Missing some requirements
- 🔜 **Todo** - Planned for future release

---

## Keyboard Shortcuts

*(Currently not implemented - planned for future release)*

---

## Privacy & Data

### What Data Is Sent to Server?

**Term Analysis:**
- Selected text
- Surrounding paragraph (max 400 chars)
- Profile ID

**Citation Batch Review:**
- Citation text only (not full paragraphs)
- Profile ID

**Paper Review:**
- Abstract, Introduction, Method, Results sections
- Comparison sample abstracts (if provided)
- Profile ID

**Not Sent:**
- Full document content
- Author information
- File metadata

### Data Retention

- No data is stored on server
- API requests logged for 24 hours (debugging)
- No user accounts or tracking

### Costs

- Term analysis: Free (included in API quota)
- Citation review: Free
- Paper review: ~$0.10 per review (OpenAI API cost)

---

## Getting Help

### Resources

- **GitHub Issues:** https://github.com/anthropics/claude-code/issues
- **Documentation:** See README.md, TECHNICAL_REPORT.md in project folder
- **API Reference:** See API_REFERENCE.md for developers

### Before Reporting Issues

1. Check this guide's Troubleshooting section
2. Try refreshing the add-in (close and reopen)
3. Check Word version and platform (Online vs Desktop)
4. Note exact error message or behavior

### Feedback

We welcome:
- Bug reports with steps to reproduce
- Feature requests with use cases
- Profile additions (provide official template/guide)
- Translation improvements (Korean or English)

---

## Version History

- **v1.4.0** (2026-02-20): Full KOR/ENG translation, UI redesign
- **v1.3.1** (2026-02-20): Korean caption support, context menu fix
- **v1.3.0** (2026-02-19): Cross-reference integrity checks
- **v1.2.0** (2026-02-19): Review tab with structure scan
- **v1.1.0** (2026-02-19): Scan range, cover page exclusion
- **v1.0.0** (2026-02-18): Full layout verification, headings
- **v0.9.0** (2026-02-18): Deployment, profile completion
- **v0.8.0** (2026-02-18): Submission readiness report
- **v0.7.0** (2026-02-18): Layout scan, 9 new profiles

See CHANGELOG.md for complete history.

---

## Tips for Best Results

1. **Choose the right profile** - IEEE ≠ Nature ≠ KAIST
2. **Scan early, scan often** - Catch issues while writing
3. **Fix incrementally** - Don't wait until the end
4. **Verify manually** - 100% score doesn't mean perfect
5. **Use context menu** - Faster term checking
6. **Set scan range** - Exclude cover page, acknowledgments
7. **Read the logs** - Accordion panels show what was detected
8. **Try Desktop for full features** - Word Online has limitations
9. **Check cross-references** - Captions must be cited in text
10. **Review before final submission** - Full Check + manual verification

---

**Last Updated:** 2026-02-20 (v1.4.0)
