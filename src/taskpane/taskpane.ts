/* global Word console Office */

import data from "./data/journalFormats.json";

const getProfile = (id: string) => data.profiles.find(p => p.id === id);

export async function insertText(text: string) {
  try {
    await Word.run(async (context) => {
      let body = context.document.body;
      body.insertParagraph(text, Word.InsertLocation.end);
      await context.sync();
    });
  } catch (error) {
    console.log("Error: " + error);
  }
}

export async function getSelectedText(): Promise<string> {
  try {
    return await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load("text");
      await context.sync();
      return selection.text;
    });
  } catch (error) {
    console.log("Error: " + error);
    return "";
  }
}

export async function replaceSelection(text: string) {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertText(text, Word.InsertLocation.replace);
      await context.sync();
    });
  } catch (error) {
    console.log("Error: " + error);
  }
}

// v0.6.0: Enhanced Fix Logic (Text + Style)
export async function replaceParagraphText(index: number, newText: string, profileId?: string) {
    try {
        await Word.run(async (context) => {
            const paragraphs = context.document.body.paragraphs;
            paragraphs.load("items");
            await context.sync();
            
            if (paragraphs.items[index]) {
                const p = paragraphs.items[index];
                
                // 1. Replace Text
                if (newText) {
                    p.insertText(newText, Word.InsertLocation.replace);
                }

                // 2. Apply Style (If profile has format rules)
                if (profileId) {
                    const profile = getProfile(profileId);
                    const formatRule = profile?.rules?.captionStyle?.figure?.format;
                    if (formatRule) {
                        if (formatRule.fontName) p.font.name = formatRule.fontName;
                        if (formatRule.fontSize) p.font.size = formatRule.fontSize;
                        if (formatRule.isBold !== undefined) p.font.bold = formatRule.isBold;
                        if (formatRule.alignment) p.alignment = formatRule.alignment as Word.Alignment;
                    }
                }
                
                await context.sync();
            }
        });
    } catch (e) { console.error(e); }
}

// Batch-apply all caption fixes in a single Word.run (no index drift, one round-trip).
// Replaces each paragraph text + applies style rules in one context.
export async function applyAllCaptionFixes(issues: CaptionIssue[], profileId: string): Promise<void> {
  const profile = getProfile(profileId);
  const formatRule = profile?.rules?.captionStyle?.figure?.format;

  try {
    await Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();

      for (const issue of issues) {
        if (!issue.suggestion || issue.paragraphIndex < 0) continue;
        const p = paragraphs.items[issue.paragraphIndex];
        if (!p) continue;

        p.insertText(issue.suggestion, Word.InsertLocation.replace);

        if (formatRule) {
          if (formatRule.fontName) p.font.name = formatRule.fontName;
          if (formatRule.fontSize) p.font.size = formatRule.fontSize;
          if (formatRule.isBold !== undefined) p.font.bold = formatRule.isBold;
          if (formatRule.alignment) p.alignment = formatRule.alignment as Word.Alignment;
        }
      }
      await context.sync();
    });
  } catch (e) { console.error("applyAllCaptionFixes error:", e); }
}

// Batch-apply all citation fixes in a single Word.run.
// Queues all searches first, syncs once to materialise results, then applies all replacements.
export async function applyAllCitationFixes(issues: CitationIssue[]): Promise<void> {
  try {
    await Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();

      // Phase 1: queue all searches (no sync yet)
      const pending: Array<{ results: Word.RangeCollection; suggestion: string }> = [];
      for (const issue of issues) {
        if (!issue.suggestion || issue.paragraphIndex < 0) continue;
        const p = paragraphs.items[issue.paragraphIndex];
        if (!p) continue;
        const results = p.getRange().search(issue.text, { matchCase: true, matchWildcards: false });
        results.load("items");
        pending.push({ results, suggestion: issue.suggestion });
      }

      // Phase 2: single sync to materialise all search results
      await context.sync();

      // Phase 3: apply replacements for first match of each search
      for (const { results, suggestion } of pending) {
        if (results.items.length > 0) {
          results.items[0].insertText(suggestion, Word.InsertLocation.replace);
        }
      }
      await context.sync();
    });
  } catch (e) { console.error("applyAllCitationFixes error:", e); }
}

export async function fixCitationIssue(issue: CitationIssue): Promise<void> {
    try {
        await Word.run(async (context) => {
            const paragraphs = context.document.body.paragraphs;
            paragraphs.load("items");
            await context.sync();
            if (!paragraphs.items[issue.paragraphIndex]) return;
            const para = paragraphs.items[issue.paragraphIndex];
            const range = para.getRange();
            const results = range.search(issue.text, { matchCase: true, matchWildcards: false });
            results.load("items");
            await context.sync();
            if (results.items.length > 0) {
                results.items[0].insertText(issue.suggestion ?? "", Word.InsertLocation.replace);
                await context.sync();
            }
        });
    } catch (e) { console.error("fixCitationIssue error:", e); }
}

export interface InspectResult {
    textPreview: string;
    style: string;
    fontName: string;
    fontSize: number;
    alignment: string;
    isBold: boolean;
    isItalic: boolean;
    paragraphIndex: number;
}

export async function inspectCurrentSelection(): Promise<InspectResult | null> {
    try {
        return await Word.run(async (context) => {
            const selection = context.document.getSelection();
            const paragraph = selection.paragraphs.getFirst();
            const font = selection.font;

            paragraph.load(["text", "style", "alignment"]);
            font.load(["name", "size", "bold", "italic"]);
            await context.sync();

            return {
                textPreview: paragraph.text.substring(0, 50) + "...",
                style: paragraph.style,
                fontName: font.name,
                fontSize: font.size,
                alignment: paragraph.alignment,
                isBold: font.bold,
                isItalic: font.italic,
                paragraphIndex: -1
            };
        });
    } catch (e) {
        console.error("Inspect failed", e);
        return null;
    }
}

// --- Types ---

export interface CheckItem {
  id: string;
  category: "typography" | "layout" | "captions" | "citations" | "headings" | "references" | "manual";
  label: string;
  status: "pass" | "fail" | "warn" | "manual";
  currentValue?: string;
  expectedValue?: string;
  detail: string;
  autoFixable: boolean;
}

export interface SubmissionReport {
  profileId: string;
  items: CheckItem[];
  score: {
    passed: number;
    failed: number;
    warned: number;
    manual: number;
    pct: number; // passed / (passed+failed) * 100
  };
  scanLogs: string[];
  generatedAt: string;
  rawScans: {
    captions: ScanResult<CaptionIssue>;
    citations: HybridCitationResult;
    layout: ScanResult<LayoutIssue>;
    headings: ScanResult<HeadingIssue>;
    references: ScanResult<ReferenceIssue>;
  };
}

export interface ReviewerScore {
  persona: string;
  focus: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  detailedComment: string;
}

export interface CriticalIssue {
  id: string;
  severity: "high" | "medium" | "low";
  category: string;
  issue: string;
}

export interface PaperReview {
  overallScore: number;
  acceptProbability: number;
  recommendation: string;
  reviewerScores: ReviewerScore[];
  criticalIssues: CriticalIssue[];
}

export interface CaptionIssue {
  id: string;
  type: "caption";
  text: string;
  isValid: boolean;
  suggestion?: string;
  message: string;
  paragraphIndex: number;
}

export interface LayoutIssue {
  id: string;
  type: "layout";
  field: "margin_top" | "margin_bottom" | "margin_left" | "margin_right" | "body_font" | "body_size" | "line_spacing" | "page_size";
  currentValue: string;
  expectedValue: string;
  message: string;
}

export interface CitationIssue {
  id: string;
  type: "citation";
  text: string;
  isValid: boolean;
  suggestion?: string;
  message: string;
  paragraphIndex: number;
}

export interface CitationCandidate {
  id: string;
  text: string;
  paragraphIndex: number;
  reason: "placement" | "range-opportunity" | "style-ambiguous";
  context: string; // surrounding text for AI analysis
}

export interface HybridCitationResult {
  autoFixes: CitationIssue[];
  aiCandidates: CitationCandidate[];
  stats: {
    totalParagraphs: number;
    candidatesFound: number;
    issuesFound: number;
    aiCandidatesFound: number;
  };
  logs: string[];
}

export interface HeadingIssue {
  id: string;
  type: "heading";
  level: 1 | 2 | 3;
  text: string;
  paragraphIndex: number;
  field: "fontSize" | "bold";
  currentValue: string;
  expectedValue: string;
  message: string;
}

export interface ReferenceIssue {
  id: string;
  type: "reference";
  severity: "error" | "warn";
  message: string;
  detail: string;
}

export interface StructureIssue {
  id: string;
  type: "structure";
  rule: "blank_paragraphs" | "orphaned_list_item" | "heading_level_skip" | "empty_section" | "placeholder_text" | "abstract_word_count"
      | "unreferenced_caption" | "abbreviation_order" | "duplicate_paragraph"
      | "cited_not_defined" | "defined_not_cited";
  paragraphIndex: number;
  text: string;
  message: string;
}

export interface ScanResult<T> {
  issues: T[];
  stats: {
    totalParagraphs: number;
    candidatesFound: number;
    issuesFound: number;
  };
  logs: string[];
}

// --- Logic ---

// Returns array of paragraph indices where each page starts (index 0 = page 1 = para 0).
// Only detects MANUAL page breaks (\f); automatic flow-breaks are not visible via Word JS API.
export async function getPageBoundaries(): Promise<number[]> {
  try {
    return await Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();
      for (const p of paragraphs.items) p.load("text");
      await context.sync();
      const boundaries: number[] = [0]; // page 1 always starts at paragraph 0
      for (let i = 0; i < paragraphs.items.length; i++) {
        if (paragraphs.items[i].text.includes("\f")) {
          boundaries.push(i + 1);
        }
      }
      return boundaries;
    });
  } catch {
    return [0];
  }
}

export async function getSelectionParagraphIndex(): Promise<number> {
  try {
    return await Word.run(async (context) => {
      const selection = context.document.getSelection();
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      const selPara = selection.paragraphs.getFirst();
      selPara.load("text");
      await context.sync();
      const selText = selPara.text;
      for (let i = 0; i < paragraphs.items.length; i++) {
        paragraphs.items[i].load("text");
      }
      await context.sync();
      // Return the first paragraph whose text fully matches
      for (let i = 0; i < paragraphs.items.length; i++) {
        if (paragraphs.items[i].text === selText) return i;
      }
      return 0;
    });
  } catch (e) { return 0; }
}

export async function scanCaptions(profileId: string, startFrom = 0, endAt?: number): Promise<ScanResult<CaptionIssue>> {
  const issues: CaptionIssue[] = [];
  const logs: string[] = [];
  let stats = { totalParagraphs: 0, candidatesFound: 0, issuesFound: 0 };

  const profile = getProfile(profileId);
  if (!profile || !profile.rules.captionStyle) {
      return { issues, stats, logs: [`No caption rules for ${profileId}`] };
  }

  const figRule = profile.rules.captionStyle.figure;
  const styleRule = figRule.format; // v0.6.0 Style Rules

  try {
    await Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();

      stats.totalParagraphs = paragraphs.items.length;
      const effectiveStart = Math.min(startFrom, paragraphs.items.length);
      const effectiveEnd = endAt !== undefined ? Math.min(endAt + 1, paragraphs.items.length) : paragraphs.items.length;
      logs.push(`Scanning paras ${effectiveStart}–${effectiveEnd - 1}...`);

      // Bulk Load Properties (Text + Style)
      for (let i = effectiveStart; i < effectiveEnd; i++) {
        paragraphs.items[i].load(["text", "font/name", "font/size", "font/bold", "alignment"]);
      }
      await context.sync();

      // Korean body sentences often start with "그림 N. 는..." or "그림 N. 은..." where
      // the figure/table is the grammatical subject followed by a Korean postposition (josa).
      // These must be treated as body text, not captions.
      const BODY_SENTENCE_JOSA_RE = /^(Figure|Fig\.?|Tab\.?|Table|그림|표)\s+\d+\.?\s*(는|은|이|가|을|를|에서|에|의|과|와|도|로|으로|부터|까지|에게)/i;

      for (let i = effectiveStart; i < effectiveEnd; i++) {
        const p = paragraphs.items[i];
        const text = p.text.trim();
        if (!text || text.length > 300) continue;

        const figDetectRegex = new RegExp(figRule.detect.regex, figRule.detect.flags);

        // Gate: Skip if this looks like a body sentence with Korean josa
        if (BODY_SENTENCE_JOSA_RE.test(text)) {
          logs.push(`[Skip] Para ${i}: Body sentence with josa detected`);
          continue;
        }

        if (figDetectRegex.test(text)) {
            stats.candidatesFound++;
            logs.push(`[Match] Para ${i}`);

            const expectedPrefix = figRule.validate.expectedPrefix; 
            const separator = figRule.validate.separator;

            // 1. Text Check
            const startsWithPrefix = text.startsWith(expectedPrefix);
            const escapedPrefix = expectedPrefix.replace(/[.*+?^${}()|[\\]/g, '\\$&');
            const escapedSep = separator.replace(/[.*+?^${}()|[\\]/g, '\\$&');
            const numSepRegex = new RegExp(`^${escapedPrefix}\\s*\\d+${escapedSep}`);
            const isTextValid = startsWithPrefix && numSepRegex.test(text);

            // 2. Style Check (v0.6.0)
            let isStyleValid = true;
            let styleErrors = [];

            if (styleRule) {
                if (styleRule.fontName && p.font.name !== styleRule.fontName) {
                    isStyleValid = false;
                    styleErrors.push(`Font: ${p.font.name} -> ${styleRule.fontName}`);
                }
                if (styleRule.isBold !== undefined && p.font.bold !== styleRule.isBold) {
                    isStyleValid = false;
                    styleErrors.push(`Bold: ${p.font.bold} -> ${styleRule.isBold}`);
                }
                // Alignment check often returns undefined on mixed content, so we skip strict check for now or handle gently
            }

            const isValid = isTextValid && isStyleValid;

            if (!isValid) {
                stats.issuesFound++;
                
                let reason = "";
                if (!isTextValid) reason = `Text format mismatch.`;
                if (!isStyleValid) reason += (reason ? " " : "") + `Style mismatch: ${styleErrors.join(", ")}`;

                const match = text.match(/^((?:Fig\.|Figure|Table|그림|표)\.?)\s*(\d+)[:.|]?\s*(.*)$/i);
                let suggestion = undefined;
                if (match) {
                    suggestion = `${expectedPrefix} ${match[2]}${separator} ${match[3]}`;
                } else {
                    suggestion = text; // If text is fine but style wrong, keep text
                }

                issues.push({
                    id: `cap_${i}`,
                    type: "caption",
                    text: text.substring(0, 60) + "...",
                    isValid: false,
                    suggestion: suggestion,
                    message: reason,
                    paragraphIndex: i
                });
            }
        }
      }
    });
  } catch (error) { logs.push(`Error: ${error}`); } 
  return { issues, stats, logs };
}

export async function scanCitations(profileId: string, startFrom = 0, endAt?: number): Promise<HybridCitationResult> {
    const autoFixes: CitationIssue[] = [];
    const aiCandidates: CitationCandidate[] = [];
    const logs: string[] = [];
    let stats = { totalParagraphs: 0, candidatesFound: 0, issuesFound: 0, aiCandidatesFound: 0 };

    const profile = getProfile(profileId);
    const citationStyle = (profile?.rules as any)?.citationStyle;

    if (!citationStyle) {
        logs.push(`No citation style rules for ${profileId}`);
        return { autoFixes, aiCandidates, stats, logs };
    }

    const allowRanges = citationStyle.allowRanges ?? false;
    const allowCombined = citationStyle.allowCombined ?? false;
    const placementHint = citationStyle.placementHint || "flexible";

    try {
        await Word.run(async (context) => {
            const paragraphs = context.document.body.paragraphs;
            paragraphs.load("items");
            await context.sync();

            stats.totalParagraphs = paragraphs.items.length;
            const effectiveStart = Math.min(startFrom, paragraphs.items.length);
            const effectiveEnd = endAt !== undefined ? Math.min(endAt + 1, paragraphs.items.length) : paragraphs.items.length;
            for (let i = effectiveStart; i < effectiveEnd; i++) {
                paragraphs.items[i].load("text");
            }
            await context.sync();

            // Regex patterns
            const multiCiteRegex = /\[(\d+(?:\s*,\s*\d+)+)\]/g; // [1,2] or [1, 2, 3]
            const singleCiteRegex = /\[\d+\]/g; // [1]
            const consecutiveCitesRegex = /(?:\[\d+\]\s*,?\s*){3,}/g; // [1], [2], [3] or more

            let validSingleCount = 0;

            for (let i = effectiveStart; i < effectiveEnd; i++) {
                const text = paragraphs.items[i].text;
                if (!text) continue;

                const singleMatches = text.match(singleCiteRegex) || [];
                validSingleCount += singleMatches.length;

                // --- AUTO-FIX: Combined citations [1,2] when NOT allowed ---
                if (!allowCombined) {
                    let match: RegExpExecArray | null;
                    multiCiteRegex.lastIndex = 0;
                    while ((match = multiCiteRegex.exec(text)) !== null) {
                        stats.candidatesFound++;
                        stats.issuesFound++;
                        const fullMatch = match[0];
                        const inner = match[1];
                        const fixed = inner.split(",").map(n => `[${n.trim()}]`).join(", ");
                        autoFixes.push({
                            id: `cite_autofix_${i}_${match.index}`,
                            type: "citation",
                            text: fullMatch,
                            isValid: false,
                            suggestion: fixed,
                            message: `${profile.name} requires separate brackets`,
                            paragraphIndex: i
                        });
                    }
                }

                // --- AI CANDIDATE: Range opportunities [1], [2], [3] → [1-3] ---
                if (allowRanges) {
                    let rangeMatch: RegExpExecArray | null;
                    consecutiveCitesRegex.lastIndex = 0;
                    while ((rangeMatch = consecutiveCitesRegex.exec(text)) !== null) {
                        const snippet = rangeMatch[0];
                        const nums = snippet.match(/\d+/g)?.map(Number) || [];

                        // Check if consecutive (e.g., 1,2,3 or 5,6,7,8)
                        let isConsecutive = true;
                        for (let j = 1; j < nums.length; j++) {
                            if (nums[j] !== nums[j - 1] + 1) {
                                isConsecutive = false;
                                break;
                            }
                        }

                        if (isConsecutive && nums.length >= 3) {
                            stats.aiCandidatesFound++;
                            const contextStart = Math.max(0, rangeMatch.index - 50);
                            const contextEnd = Math.min(text.length, rangeMatch.index + snippet.length + 50);
                            aiCandidates.push({
                                id: `cite_ai_range_${i}_${rangeMatch.index}`,
                                text: snippet,
                                paragraphIndex: i,
                                reason: "range-opportunity",
                                context: text.substring(contextStart, contextEnd)
                            });
                        }
                    }
                }

                // --- AI CANDIDATE: Placement at sentence start ---
                if (placementHint === "author-first" || placementHint === "end-of-clause") {
                    const sentenceStartCite = /^(\[\d+\])/;
                    const match = text.match(sentenceStartCite);
                    if (match) {
                        stats.aiCandidatesFound++;
                        const contextEnd = Math.min(text.length, 100);
                        aiCandidates.push({
                            id: `cite_ai_placement_${i}_0`,
                            text: match[0],
                            paragraphIndex: i,
                            reason: "placement",
                            context: text.substring(0, contextEnd)
                        });
                    }
                }
            }

            logs.push(`Scanned ${effectiveEnd - effectiveStart} paragraphs (${effectiveStart}–${effectiveEnd - 1}).`);
            logs.push(`Profile: ${profile.name} (ranges=${allowRanges}, combined=${allowCombined}, placement=${placementHint})`);
            logs.push(`Single-bracket [n] citations: ${validSingleCount}`);
            logs.push(`Auto-fixes generated: ${autoFixes.length}`);
            logs.push(`AI candidates for review: ${aiCandidates.length}`);
        });
    } catch (e) {
        logs.push(`Error: ${e}`);
    }

    return { autoFixes, aiCandidates, stats, logs };
}


export async function scanLayout(profileId: string, startFrom = 0, endAt?: number): Promise<ScanResult<LayoutIssue>> {
  const issues: LayoutIssue[] = [];
  const logs: string[] = [];
  let stats = { totalParagraphs: 0, candidatesFound: 0, issuesFound: 0 };

  const profile = getProfile(profileId);
  const layoutRule = (profile?.rules as any)?.layout;
  const typoRule = (profile?.rules as any)?.typography;

  if (!layoutRule && !typoRule) {
    return { issues, stats, logs: [`No layout/typography rules for ${profileId}`] };
  }

  try {
    await Word.run(async (context) => {
      // --- Step 1: Margins via Section.body.pageSetup (Word API 1.9+) ---
      // section body pageSetup exposes page margins in points (pt); 1 cm = 28.35 pt
      const ptToCm = (pt: number) => Math.round((pt / 28.35) * 10) / 10;
      let marginActual: { top: number; bottom: number; left: number; right: number } | null = null;
      try {
        const sections = context.document.sections;
        sections.load("items");
        await context.sync();
        const ps: any = (sections.items[0].body as any).pageSetup;
        if (ps === undefined || ps === null) throw new Error("pageSetup not available on section body");
        ps.load(["topMargin", "bottomMargin", "leftMargin", "rightMargin", "pageWidth", "pageHeight"]);
        await context.sync();
        marginActual = {
          top:    ptToCm(ps.topMargin),
          bottom: ptToCm(ps.bottomMargin),
          left:   ptToCm(ps.leftMargin),
          right:  ptToCm(ps.rightMargin),
        };
        logs.push(`Margins: top=${marginActual.top}cm, bottom=${marginActual.bottom}cm, left=${marginActual.left}cm, right=${marginActual.right}cm`);

        // Detect page size — A4: 595.3×841.9pt, Letter: 612×792pt
        const w = ps.pageWidth as number;
        const h = ps.pageHeight as number;
        if (w > 0 && h > 0) {
          const longEdge = Math.max(w, h);
          const shortEdge = Math.min(w, h);
          let detectedSize: string | null = null;
          if (Math.abs(shortEdge - 595.3) < 8 && Math.abs(longEdge - 841.9) < 8) detectedSize = "A4";
          else if (Math.abs(shortEdge - 612) < 8 && Math.abs(longEdge - 792) < 8) detectedSize = "Letter";
          else detectedSize = `custom (${Math.round(shortEdge)}×${Math.round(longEdge)}pt)`;
          logs.push(`Page size: ${detectedSize} (${Math.round(w)}×${Math.round(h)}pt)`);
          if (layoutRule?.pageSize && detectedSize !== layoutRule.pageSize) {
            stats.issuesFound++;
            issues.push({
              id: "layout_page_size",
              type: "layout",
              field: "page_size",
              currentValue: detectedSize,
              expectedValue: layoutRule.pageSize,
              message: `Page size: ${detectedSize} (expected ${layoutRule.pageSize})`,
            });
          }
        }

        // Detect column count via section body OOXML (best-effort)
        try {
          const bodyRange = sections.items[0].body.getRange();
          const ooxml = bodyRange.getOoxml();
          await context.sync();
          const colNumMatch = ooxml.value.match(/w:cols[^>]*w:num="(\d+)"/);
          const colElemCount = (ooxml.value.match(/<w:col\s/g) || []).length;
          const detectedCols = colNumMatch ? parseInt(colNumMatch[1]) : (colElemCount > 1 ? colElemCount : 1);
          logs.push(`Columns: detected ${detectedCols}`);
          if (layoutRule?.columns && layoutRule.columns > 1 && detectedCols !== layoutRule.columns) {
            logs.push(`Column mismatch: detected ${detectedCols}, expected ${layoutRule.columns} — verify manually`);
          }
        } catch (_e) {
          logs.push(`Columns: OOXML not accessible — verify manually (Layout → Columns)`);
        }
      } catch (e) {
        logs.push(`Page setup: requires Word API 1.9+ — check manually (File > Page Layout)`);
      }

      // --- Step 2: Dominant font/size via paragraph scan (up to 50 paras after offset) ---
      const paras = context.document.body.paragraphs;
      paras.load("items");
      await context.sync();

      stats.totalParagraphs = paras.items.length;
      const typoStart = Math.min(startFrom, paras.items.length);
      const typoEnd = endAt !== undefined ? Math.min(endAt + 1, paras.items.length) : paras.items.length;
      const maxScan = Math.min(typoEnd, typoStart + 50);

      // Load text + font + spacing for all target paragraphs
      for (let i = typoStart; i < maxScan; i++) {
        paras.items[i].load("text,lineSpacing");
        paras.items[i].font.load("name,size");
      }
      await context.sync();
      if (typoStart > 0) logs.push(`Typography scan from para ${typoStart} (${maxScan - typoStart} paras).`);

      // Aggregate dominant font/size/spacing across body-length paragraphs
      const fontCounts: Record<string, number> = {};
      const sizeCounts: Record<string, number> = {};
      const lineSpacingPcts: number[] = [];

      for (let i = typoStart; i < maxScan; i++) {
        const p = paras.items[i];
        if (!p.text || p.text.trim().length < 20) continue;
        stats.candidatesFound++;

        const fname = p.font.name;
        const fsize = p.font.size;
        if (fname && fname.trim()) {
          fontCounts[fname] = (fontCounts[fname] || 0) + 1;
        }
        if (fsize > 0) {
          const key = String(Math.round(fsize * 2) / 2);
          sizeCounts[key] = (sizeCounts[key] || 0) + 1;
        }
        // Word API stores lineSpacing in "line units" where 12 = 1 line (per API docs:
        // "In the Word UI, this value is divided by 12"). Single=12, 1.5x=18, 2x=24, 160%=19.2
        const spacing: number = p.lineSpacing;
        if (spacing > 0) {
          lineSpacingPcts.push(Math.round((spacing / 12) * 100));
        }
      }

      const dominantFont = Object.entries(fontCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const dominantSizeStr = Object.entries(sizeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const dominantSize = dominantSizeStr ? parseFloat(dominantSizeStr) : null;
      const avgSpacingPct = lineSpacingPcts.length > 0
        ? Math.round(lineSpacingPcts.reduce((a, b) => a + b, 0) / lineSpacingPcts.length)
        : null;

      logs.push(`Font scan (${stats.candidatesFound} body paras): font="${dominantFont ?? "n/a"}", size=${dominantSize ?? "n/a"}pt`);
      if (avgSpacingPct !== null) {
        logs.push(`Line spacing avg: ~${avgSpacingPct}%`);
      }
      if (!dominantFont) {
        logs.push(`Note: paragraph.font.name returned empty for all scanned paragraphs (run-level font; detection limited)`);
      }

      // --- Margin Checks ---
      if (layoutRule && marginActual) {
        const m = layoutRule.margins;
        const TOLERANCE = 0.3;

        const marginChecks: Array<{ field: LayoutIssue["field"]; expected: number; actual: number; label: string }> = [
          { field: "margin_top",    expected: m.top,    actual: marginActual.top,    label: "Top margin" },
          { field: "margin_bottom", expected: m.bottom, actual: marginActual.bottom, label: "Bottom margin" },
          { field: "margin_left",   expected: m.left,   actual: marginActual.left,   label: "Left margin" },
          { field: "margin_right",  expected: m.right,  actual: marginActual.right,  label: "Right margin" },
        ];

        for (const check of marginChecks) {
          if (Math.abs(check.actual - check.expected) > TOLERANCE) {
            stats.issuesFound++;
            issues.push({
              id: `layout_${check.field}`,
              type: "layout",
              field: check.field,
              currentValue: `${check.actual} cm`,
              expectedValue: `${check.expected} cm`,
              message: `${check.label}: ${check.actual} cm (expected ${check.expected} cm)`,
            });
          }
        }
      }

      // --- Typography Checks ---
      if (typoRule) {
        const bodySpec = typoRule.body;

        // Font name check
        if (bodySpec.fontName) {
          if (dominantFont) {
            if (dominantFont.toLowerCase() !== bodySpec.fontName.toLowerCase()) {
              stats.issuesFound++;
              issues.push({
                id: "layout_body_font",
                type: "layout",
                field: "body_font",
                currentValue: dominantFont,
                expectedValue: bodySpec.fontName,
                message: `Body font: "${dominantFont}" (expected "${bodySpec.fontName}")`,
              });
            }
          } else {
            logs.push(`Font check skipped: could not detect dominant font.`);
          }
        }

        // Font size check
        if (bodySpec.fontSize && dominantSize !== null) {
          if (Math.abs(dominantSize - bodySpec.fontSize) > 0.5) {
            stats.issuesFound++;
            issues.push({
              id: "layout_body_size",
              type: "layout",
              field: "body_size",
              currentValue: `${dominantSize} pt`,
              expectedValue: `${bodySpec.fontSize} pt`,
              message: `Body font size: ${dominantSize} pt (expected ${bodySpec.fontSize} pt)`,
            });
          }
        }

        // Line spacing check
        if (bodySpec.lineSpacingPct && avgSpacingPct !== null) {
          const actualPct = avgSpacingPct;
          const expectedPct: number = bodySpec.lineSpacingPct;
          if (Math.abs(actualPct - expectedPct) > 20) {
            stats.issuesFound++;
            issues.push({
              id: "layout_line_spacing",
              type: "layout",
              field: "line_spacing",
              currentValue: `~${actualPct}%`,
              expectedValue: `${expectedPct}%`,
              message: `Line spacing: ~${actualPct}% (expected ${expectedPct}%)`,
            });
          }
        }
      }
    });
  } catch (e) {
    logs.push(`Error: ${e}`);
    console.error("scanLayout error:", e);
  }

  return { issues, stats, logs };
}

export async function generateSubmissionReport(
  profileId: string,
  startFrom = 0,
  endAt?: number,
  onScanComplete?: (scan: "captions" | "citations" | "layout" | "headings" | "references") => void
): Promise<SubmissionReport> {
  const profile = getProfile(profileId);
  const layoutRule = (profile?.rules as any)?.layout;
  const typoRule = (profile?.rules as any)?.typography;

  // Run all scans in parallel (each Word.run creates its own context)
  const [captionResult, citeResult, layoutResult, headingResult, referenceResult] = await Promise.all([
    scanCaptions(profileId, startFrom, endAt).then(r => { onScanComplete?.("captions"); return r; }),
    scanCitations(profileId, startFrom, endAt).then(r => { onScanComplete?.("citations"); return r; }),
    scanLayout(profileId, startFrom, endAt).then(r => { onScanComplete?.("layout"); return r; }),
    scanHeadings(profileId, startFrom, endAt).then(r => { onScanComplete?.("headings"); return r; }),
    scanReferences(profileId, startFrom, endAt).then(r => { onScanComplete?.("references"); return r; }),
  ]);

  const items: CheckItem[] = [];
  const scanLogs: string[] = [
    ...layoutResult.logs.map(l => `[Layout] ${l}`),
    ...captionResult.logs.map(l => `[Caption] ${l}`),
    ...citeResult.logs.map(l => `[Citation] ${l}`),
    ...headingResult.logs.map(l => `[Headings] ${l}`),
    ...referenceResult.logs.map(l => `[References] ${l}`),
  ];

  // Extract detected values from layout scan logs
  const fontScanLog = layoutResult.logs.find(l => l.startsWith("Font scan"));
  const detectedFont   = fontScanLog?.match(/font="([^"]+)"/)?.[1] ?? null;
  const detectedSizePt = fontScanLog?.match(/size=([\d.]+)pt/)?.[1]   ?? null;
  const spacingLog = layoutResult.logs.find(l => l.startsWith("Line spacing avg"));
  const detectedSpacingPct = spacingLog?.match(/~?(\d+)%/)?.[1] ?? null;

  // --- Typography ---
  if (typoRule?.body) {
    const bs = typoRule.body;
    const fontIssue    = layoutResult.issues.find(i => i.field === "body_font");
    const sizeIssue    = layoutResult.issues.find(i => i.field === "body_size");
    const spacingIssue = layoutResult.issues.find(i => i.field === "line_spacing");

    if (bs.fontName) {
      items.push({
        id: "typo_font", category: "typography", label: "Body font",
        status: detectedFont ? (fontIssue ? "fail" : "pass") : "warn",
        currentValue:  fontIssue?.currentValue  ?? (detectedFont  ?? undefined),
        expectedValue: bs.fontName,
        detail: fontIssue  ? fontIssue.message
              : detectedFont ? `Matches: "${bs.fontName}"`
              : "Font not detected at paragraph level (run-level formatting — verify manually)",
        autoFixable: !!fontIssue,
      });
    }
    if (bs.fontSize) {
      items.push({
        id: "typo_size", category: "typography", label: "Body font size",
        status: detectedSizePt ? (sizeIssue ? "fail" : "pass") : "warn",
        currentValue:  sizeIssue?.currentValue  ?? (detectedSizePt  ? `${detectedSizePt} pt` : undefined),
        expectedValue: `${bs.fontSize} pt`,
        detail: sizeIssue    ? sizeIssue.message
              : detectedSizePt ? `Matches: ${bs.fontSize} pt`
              : "Size not detected — verify manually",
        autoFixable: !!sizeIssue,
      });
    }
    if (bs.lineSpacingPct) {
      items.push({
        id: "typo_spacing", category: "typography", label: "Line spacing",
        status: detectedSpacingPct ? (spacingIssue ? "fail" : "pass") : "warn",
        currentValue:  spacingIssue?.currentValue ?? (detectedSpacingPct ? `~${detectedSpacingPct}%` : undefined),
        expectedValue: `${bs.lineSpacingPct}%`,
        detail: spacingIssue      ? spacingIssue.message
              : detectedSpacingPct ? `Matches: ${bs.lineSpacingPct}%`
              : "Spacing not detected — verify manually",
        autoFixable: !!spacingIssue,
      });
    }
  }

  // --- Margins ---
  if (layoutRule?.margins) {
    const m = layoutRule.margins;
    const marginIssues  = layoutResult.issues.filter(i => i.field.startsWith("margin_"));
    const marginLog     = layoutResult.logs.find(l => l.startsWith("Margins:"));
    const marginsAvail  = !!marginLog && !marginLog.includes("requires") && !marginLog.includes("check manually");

    if (marginsAvail) {
      if (marginIssues.length === 0) {
        items.push({
          id: "layout_margins", category: "layout", label: "Page margins",
          status: "pass",
          expectedValue: `T:${m.top} B:${m.bottom} L:${m.left} R:${m.right} cm`,
          detail: "All margins within tolerance (±0.3 cm)",
          autoFixable: false,
        });
      } else {
        for (const mi of marginIssues) {
          items.push({
            id: mi.id, category: "layout",
            label: mi.field.replace("margin_", "").replace(/\b\w/g, c => c.toUpperCase()) + " margin",
            status: "fail", currentValue: mi.currentValue, expectedValue: mi.expectedValue,
            detail: mi.message, autoFixable: true,
          });
        }
      }
    } else {
      items.push({
        id: "layout_margins", category: "manual", label: "Page margins",
        status: "manual",
        expectedValue: `Top ${m.top}cm · Bottom ${m.bottom}cm · Left ${m.left}cm · Right ${m.right}cm`,
        detail: "Layout → Margins",
        autoFixable: true,
      });
    }
  }

  // --- Page size (auto if scan detected it, else manual) ---
  if (layoutRule?.pageSize) {
    const pageSizeIssue = layoutResult.issues.find(i => i.field === "page_size");
    const pageSizeLog   = layoutResult.logs.find(l => l.startsWith("Page size:"));
    if (pageSizeLog) {
      items.push({
        id: "layout_page_size", category: "layout", label: "Page size",
        status: pageSizeIssue ? "fail" : "pass",
        currentValue: pageSizeIssue?.currentValue,
        expectedValue: layoutRule.pageSize,
        detail: pageSizeIssue ? pageSizeIssue.message : `Matches: ${layoutRule.pageSize}`,
        autoFixable: !!pageSizeIssue,
      });
    } else {
      items.push({
        id: "layout_page_size", category: "manual", label: "Page size",
        status: "manual", expectedValue: layoutRule.pageSize,
        detail: "Layout → Size",
        autoFixable: true,
      });
    }
  }

  // --- Columns (manual hint with detected value if available) ---
  if (layoutRule?.columns && layoutRule.columns > 1) {
    const colLog = layoutResult.logs.find(l => l.startsWith("Columns:"));
    const colDetail = colLog
      ? `${colLog} — set via Layout → Columns`
      : "Layout → Columns";
    items.push({
      id: "layout_columns", category: "manual", label: "Column layout",
      status: "manual", expectedValue: `${layoutRule.columns} columns`,
      detail: colDetail,
      autoFixable: false,
    });
  }

  // --- Captions ---
  const capCandidates = captionResult.stats.candidatesFound;
  const capIssues     = captionResult.issues.length;
  if (capCandidates > 0 || capIssues > 0) {
    items.push({
      id: "content_captions", category: "captions", label: "Figure/table captions",
      status: capIssues === 0 ? "pass" : "fail",
      currentValue:  capIssues > 0 ? `${capIssues} issue(s)` : undefined,
      expectedValue: "All captions match journal format",
      detail: capIssues === 0
        ? `${capCandidates} caption(s) scanned — all pass`
        : `${capIssues} of ${capCandidates} caption(s) have format errors`,
      autoFixable: capIssues > 0,
    });
  }

  // --- Citations ---
  const citeIssues = citeResult.autoFixes.length;
  const aiCandidatesCount = citeResult.aiCandidates.length;
  const singleLog  = citeResult.logs.find(l => l.includes("Single-bracket"));
  const singleCount = parseInt(singleLog?.match(/(\d+)/)?.[1] ?? "0");
  items.push({
    id: "content_citations", category: "citations", label: "Citation bracket format",
    status: citeIssues === 0 ? "pass" : "fail",
    currentValue:  citeIssues > 0 ? `${citeIssues} auto-fix, ${aiCandidatesCount} AI candidates` : undefined,
    expectedValue: "Each citation in separate brackets: [1], [2]",
    detail: citeIssues === 0
      ? `${singleCount} citation(s) checked — all use separate brackets`
      : `${citeIssues} auto-fixes + ${aiCandidatesCount} AI candidates for review`,
    autoFixable: citeIssues > 0,
  });

  // --- Headings ---
  if (typoRule?.headings) {
    const headIssues = headingResult.issues;
    if (headingResult.stats.candidatesFound > 0 || headIssues.length > 0) {
      items.push({
        id: "typography_headings", category: "headings", label: "Heading styles",
        status: headIssues.length === 0 ? "pass" : "fail",
        currentValue: headIssues.length > 0 ? `${headIssues.length} issue(s)` : undefined,
        expectedValue: "All headings match profile font/size spec",
        detail: headIssues.length === 0
          ? `${headingResult.stats.candidatesFound} heading(s) checked — all pass`
          : `${headIssues.length} heading style issue(s) found`,
        autoFixable: headIssues.length > 0,
      });
    }
  }

  // --- References ---
  const refIssues  = referenceResult.issues;
  const refErrors  = refIssues.filter(i => i.severity === "error").length;
  const refWarns   = refIssues.filter(i => i.severity === "warn").length;
  const refCount   = referenceResult.stats.candidatesFound;
  if (refCount > 0 || refIssues.length > 0) {
    items.push({
      id: "content_references", category: "references", label: "Reference list",
      status: refErrors > 0 ? "fail" : refWarns > 0 ? "warn" : "pass",
      currentValue: refIssues.length > 0 ? refIssues.map(i => i.message).join("; ") : undefined,
      expectedValue: "Sequential numbered entries found",
      detail: refIssues.length === 0
        ? `${refCount} reference(s) — numbering OK`
        : refIssues.map(i => i.detail).join(" | "),
      autoFixable: false,
    });
  } else {
    // No references found at all — list as manual
    items.push({
      id: "content_references", category: "manual", label: "Reference list",
      status: "manual",
      detail: "No References section detected — verify manually. Also check author format and journal abbreviations.",
      autoFixable: false,
    });
  }

  // --- Score ---
  const autoItems = items.filter(i => i.status === "pass" || i.status === "fail");
  const passed = autoItems.filter(i => i.status === "pass").length;
  const failed = autoItems.filter(i => i.status === "fail").length;
  const warned = items.filter(i => i.status === "warn").length;
  const manual = items.filter(i => i.status === "manual").length;
  const pct    = autoItems.length > 0 ? Math.round(passed / autoItems.length * 100) : 0;

  return {
    profileId,
    items,
    score: { passed, failed, warned, manual, pct },
    scanLogs,
    generatedAt: new Date().toLocaleString(),
    rawScans: {
      captions: captionResult,
      citations: citeResult,
      layout: layoutResult,
      headings: headingResult,
      references: referenceResult,
    },
  };
}

export async function fixLayoutIssue(issue: LayoutIssue, profileId: string): Promise<void> {
  const profile = getProfile(profileId);
  const layoutRule = (profile?.rules as any)?.layout;
  const bodySpec = (profile?.rules as any)?.typography?.body;

  // --- Margin / Page size fixes via pageSetup ---
  // NOTE: Body.pageSetup writes are "Supported only in Word on Windows and Mac" per
  // Microsoft API docs — writes are silently ignored on Word Online.
  if (issue.field.startsWith("margin_") || issue.field === "page_size") {
    try {
      await Word.run(async (context) => {
        // Use getFirst() to avoid loading items array before write
        const pageSetup: any = (context.document.sections.getFirst().body as any).pageSetup;
        const cmToPt = (cm: number) => cm * 28.35;
        if (issue.field === "page_size") {
          const A4_W = 595.3, A4_H = 841.9, LTR_W = 612, LTR_H = 792;
          const size = issue.expectedValue || layoutRule?.pageSize;
          if (size === "A4") { pageSetup.pageWidth = A4_W; pageSetup.pageHeight = A4_H; }
          else if (size === "Letter") { pageSetup.pageWidth = LTR_W; pageSetup.pageHeight = LTR_H; }
        } else {
          // Parse cm from issue.expectedValue ("2 cm") if available, else fall back to profile
          const fromExpected = parseFloat(issue.expectedValue ?? "");
          const fieldKey = issue.field.replace("margin_", "") as "top" | "bottom" | "left" | "right";
          const cm = !isNaN(fromExpected) ? fromExpected : (layoutRule?.margins?.[fieldKey] ?? 2);
          if (issue.field === "margin_top")    pageSetup.topMargin    = cmToPt(cm);
          if (issue.field === "margin_bottom") pageSetup.bottomMargin = cmToPt(cm);
          if (issue.field === "margin_left")   pageSetup.leftMargin   = cmToPt(cm);
          if (issue.field === "margin_right")  pageSetup.rightMargin  = cmToPt(cm);
        }
        await context.sync();
      });
    } catch (e) { console.error("fixLayoutIssue (pageSetup) error:", e); }
    return;
  }

  // --- Typography fixes via paragraph iteration ---
  if (!bodySpec) return;
  try {
    await Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();

      for (const p of paragraphs.items) {
        p.load("text,style");
        p.font.load("name,size");
      }
      await context.sync();

      for (const p of paragraphs.items) {
        if (!p.text || p.text.trim().length < 5) continue;
        // Skip heading paragraphs
        if (/^Heading\s*[1-9]$/i.test(p.style) || /^(Title|Subtitle|Abstract|Caption)$/i.test(p.style)) continue;

        if (issue.field === "body_font" && bodySpec.fontName) {
          // Apply to all eligible body paragraphs regardless of current font name
          // (p.font.name may be empty when font is set at run level)
          p.font.name = bodySpec.fontName;
        } else if (issue.field === "body_size" && bodySpec.fontSize) {
          // Apply to all eligible body paragraphs — run-level size may read 0 at paragraph level
          p.font.size = bodySpec.fontSize;
        } else if (issue.field === "line_spacing" && bodySpec.lineSpacingPct) {
          // lineSpacing unit: 12 = 1 line. 1.5x → 18, 160% → 19.2, 2x → 24
          p.lineSpacing = (bodySpec.lineSpacingPct / 100) * 12;
        }
      }
      await context.sync();
    });
  } catch (e) {
    console.error("fixLayoutIssue error:", e);
  }
}

// Returns the previous paragraph + current paragraph as context (max 400 chars total)
export async function getParagraphContext(): Promise<string> {
  const MAX_CHARS = 400;
  try {
    return await Word.run(async (context) => {
      const sel = context.document.getSelection();
      const curPara = sel.paragraphs.getFirst();
      curPara.load("text");
      await context.sync();

      const curText = (curPara.text || "").trim();
      // Try to get the paragraph immediately before current
      let prevText = "";
      try {
        const prevPara = curPara.getPreviousOrNullObject();
        prevPara.load("text");
        await context.sync();
        if (!prevPara.isNullObject) {
          prevText = (prevPara.text || "").trim();
        }
      } catch (_) { /* no previous paragraph */ }

      const combined = prevText ? `${prevText}\n${curText}` : curText;
      // Truncate from the front to keep the most recent text (current para end)
      return combined.length > MAX_CHARS ? combined.slice(combined.length - MAX_CHARS) : combined;
    });
  } catch (e) {
    return "";
  }
}

export async function scanHeadings(profileId: string, startFrom = 0, endAt?: number): Promise<ScanResult<HeadingIssue>> {
  const issues: HeadingIssue[] = [];
  const logs: string[] = [];
  let stats = { totalParagraphs: 0, candidatesFound: 0, issuesFound: 0 };

  const profile = getProfile(profileId);
  const headingSpec = (profile?.rules as any)?.typography?.headings;

  if (!headingSpec) {
    return { issues, stats, logs: [`No heading rules for ${profileId}`] };
  }

  try {
    await Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();

      stats.totalParagraphs = paragraphs.items.length;
      const effectiveStart = Math.min(startFrom, paragraphs.items.length);
      const effectiveEnd = endAt !== undefined ? Math.min(endAt + 1, paragraphs.items.length) : paragraphs.items.length;
      for (let i = effectiveStart; i < effectiveEnd; i++) {
        paragraphs.items[i].load("text,style");
        paragraphs.items[i].font.load("size,bold");
      }
      await context.sync();

      const levelMap: Record<string, 1 | 2 | 3> = {
        "Heading 1": 1, "Heading 2": 2, "Heading 3": 3,
      };

      for (let i = effectiveStart; i < effectiveEnd; i++) {
        const p = paragraphs.items[i];
        const level = levelMap[p.style];
        if (!level) continue;

        stats.candidatesFound++;
        const spec = headingSpec[`h${level}`];
        if (!spec) continue;

        const textPreview = p.text.substring(0, 40);
        logs.push(`H${level} at para ${i}: "${textPreview}"`);

        if (spec.fontSize && p.font.size > 0 && Math.abs(p.font.size - spec.fontSize) > 0.5) {
          stats.issuesFound++;
          issues.push({
            id: `heading_${i}_fontSize`,
            type: "heading",
            level,
            text: textPreview,
            paragraphIndex: i,
            field: "fontSize",
            currentValue: `${p.font.size} pt`,
            expectedValue: `${spec.fontSize} pt`,
            message: `H${level} font size: ${p.font.size} pt (expected ${spec.fontSize} pt)`,
          });
        }
        if (spec.isBold !== undefined && p.font.bold !== spec.isBold) {
          stats.issuesFound++;
          issues.push({
            id: `heading_${i}_bold`,
            type: "heading",
            level,
            text: textPreview,
            paragraphIndex: i,
            field: "bold",
            currentValue: p.font.bold ? "bold" : "not bold",
            expectedValue: spec.isBold ? "bold" : "not bold",
            message: `H${level} bold: ${p.font.bold} (expected ${spec.isBold})`,
          });
        }
      }
      logs.push(`Scanned ${effectiveEnd - effectiveStart} paragraphs (${effectiveStart}–${effectiveEnd - 1}), found ${stats.candidatesFound} headings.`);
    });
  } catch (e) { logs.push(`Error: ${e}`); }
  return { issues, stats, logs };
}

export async function fixHeadingIssue(issue: HeadingIssue, profileId: string): Promise<void> {
  const profile = getProfile(profileId);
  const spec = (profile?.rules as any)?.typography?.headings?.[`h${issue.level}`];
  if (!spec) return;

  try {
    await Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();
      const p = paragraphs.items[issue.paragraphIndex];
      if (!p) return;
      if (issue.field === "fontSize" && spec.fontSize) p.font.size = spec.fontSize;
      if (issue.field === "bold" && spec.isBold !== undefined) p.font.bold = spec.isBold;
      await context.sync();
    });
  } catch (e) { console.error("fixHeadingIssue error:", e); }
}

export async function scanReferences(_profileId: string, startFrom = 0, endAt?: number): Promise<ScanResult<ReferenceIssue>> {
  const issues: ReferenceIssue[] = [];
  const logs: string[] = [];
  let stats = { totalParagraphs: 0, candidatesFound: 0, issuesFound: 0 };

  try {
    await Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();

      stats.totalParagraphs = paragraphs.items.length;
      const effectiveStart = Math.min(startFrom, paragraphs.items.length);
      const effectiveEnd = endAt !== undefined ? Math.min(endAt + 1, paragraphs.items.length) : paragraphs.items.length;
      for (let i = effectiveStart; i < effectiveEnd; i++) {
        paragraphs.items[i].load("text");
      }
      await context.sync();

      // Find the References/Bibliography heading
      const refHeadingRe = /^(References|Bibliography|참고문헌|Reference List)\s*$/i;
      let refStartIdx = -1;
      for (let i = effectiveStart; i < effectiveEnd; i++) {
        const text = paragraphs.items[i].text.trim();
        if (refHeadingRe.test(text)) {
          refStartIdx = i;
          logs.push(`References heading found at para ${i}: "${text}"`);
          break;
        }
      }

      if (refStartIdx < 0) {
        logs.push("No References/Bibliography heading found.");
        issues.push({
          id: "ref_no_section",
          type: "reference",
          severity: "warn",
          message: "No References section found",
          detail: "Expected a heading 'References' or 'Bibliography' near the end of the document",
        });
        return;
      }

      const entries: string[] = [];
      for (let i = refStartIdx + 1; i < effectiveEnd; i++) {
        const text = paragraphs.items[i].text.trim();
        if (!text) continue;
        entries.push(text);
      }
      stats.candidatesFound = entries.length;
      logs.push(`${entries.length} reference entries found after heading.`);

      if (entries.length === 0) {
        issues.push({
          id: "ref_empty_section",
          type: "reference",
          severity: "error",
          message: "References section is empty",
          detail: "No entries found after the References heading",
        });
        return;
      }

      // Detect numbering format
      const formatCounts = { bracket: 0, paren: 0, dotted: 0, none: 0 };
      for (const entry of entries) {
        if (/^\[\d+\]/.test(entry))       formatCounts.bracket++;
        else if (/^\(\d+\)/.test(entry))  formatCounts.paren++;
        else if (/^\d+\./.test(entry))    formatCounts.dotted++;
        else                               formatCounts.none++;
      }
      const dominant = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0];
      logs.push(`Numbering: ${JSON.stringify(formatCounts)} — dominant: "${dominant[0]}"`);

      if (formatCounts.none > entries.length * 0.5) {
        issues.push({
          id: "ref_no_numbering",
          type: "reference",
          severity: "warn",
          message: "Reference entries may not be numbered",
          detail: `${formatCounts.none}/${entries.length} entries have no recognizable numbering ([1], (1), or 1.)`,
        });
      }

      // Check sequential numbering
      let expectedNum = 1;
      let seqErrors = 0;
      for (const entry of entries) {
        const m = entry.match(/^\[(\d+)\]/) || entry.match(/^\((\d+)\)/) || entry.match(/^(\d+)\./);
        if (m) {
          if (parseInt(m[1]) !== expectedNum) seqErrors++;
          expectedNum = parseInt(m[1]) + 1;
        }
      }
      if (seqErrors > 0) {
        stats.issuesFound += seqErrors;
        issues.push({
          id: "ref_seq_error",
          type: "reference",
          severity: "error",
          message: `${seqErrors} numbering gap(s) in references`,
          detail: "Reference numbers are not sequential — check for missing or duplicate entries",
        });
      } else if (dominant[1] > 0) {
        logs.push(`Sequential numbering OK: 1…${entries.length}`);
      }
    });
  } catch (e) { logs.push(`Error: ${e}`); }
  return { issues, stats, logs };
}

export async function selectIssueInDoc(paragraphIndex: number, textSnippet?: string) {
  try {
    await Word.run(async (context) => {
      if (paragraphIndex >= 0) {
          const paragraphs = context.document.body.paragraphs;
          paragraphs.load("items");
          await context.sync();
          if (paragraphs.items[paragraphIndex]) {
              paragraphs.items[paragraphIndex].select();
              await context.sync();
              return;
          }
      }
      if (textSnippet) {
        const results = context.document.body.search(textSnippet, { matchWildcards: false });
        results.load("items");
        await context.sync();
        if (results.items.length > 0) results.items[0].select();
      }
    });
  } catch (error) { console.error(error); }
}

// ── Review tab: structural integrity scan ──────────────────────────────────
// Tier-1 checks: rules only, no LLM. Catches artifact-class issues that
// formatters and spellcheckers cannot detect.
export async function scanStructure(
  profileId: string,
  startFrom = 0,
  endAt?: number
): Promise<ScanResult<StructureIssue>> {
  const issues: StructureIssue[] = [];
  try {
    await Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();
      for (const p of paragraphs.items) {
        p.load("text,style");
        p.inlinePictures.load("items"); // detect image-holding paragraphs
      }
      await context.sync();

      const all = paragraphs.items;
      const slice = endAt !== undefined ? all.slice(startFrom, endAt) : all.slice(startFrom);

      // A paragraph is "truly blank" only if it has no text, no inline pictures,
      // and no embedded object character (\u0001). Image paragraphs return "" for
      // .text but have inlinePictures.items.length > 0; OLE/shape anchors use \u0001.
      const isTrulyBlank = (p: Word.Paragraph) =>
        p.text.trim() === "" &&
        !p.text.includes("\u0001") &&
        p.inlinePictures.items.length === 0;

      // 1. Consecutive truly-blank paragraphs (≥ 3)
      let blankRun = 0;
      let blankStart = -1;
      for (let i = 0; i < slice.length; i++) {
        if (isTrulyBlank(slice[i])) {
          if (blankRun === 0) blankStart = i;
          blankRun++;
          if (blankRun === 3) {
            issues.push({
              id: `blank_${startFrom + blankStart}`,
              type: "structure",
              rule: "blank_paragraphs",
              paragraphIndex: startFrom + blankStart,
              text: "(blank lines)",
              message: `3+ consecutive blank paragraphs at paragraph ${startFrom + blankStart} — likely a copy-paste artifact`,
            });
          }
        } else {
          blankRun = 0;
          blankStart = -1;
        }
      }

      // 2. Orphaned list item  ("4." or "4)" alone on a line)
      for (let i = 0; i < slice.length; i++) {
        const text = slice[i].text.trim();
        if (/^\d+[\.\)]\s*$/.test(text)) {
          issues.push({
            id: `orphan_${startFrom + i}`,
            type: "structure",
            rule: "orphaned_list_item",
            paragraphIndex: startFrom + i,
            text,
            message: `Orphaned list marker "${text}" with no content — text after this number may be missing`,
          });
        }
      }

      // 3. Heading level skip (H1 → H3 with no H2)
      let lastLevel = 0;
      for (let i = 0; i < slice.length; i++) {
        const m = slice[i].style.match(/^Heading\s*(\d)$/i);
        if (m) {
          const level = parseInt(m[1]);
          if (lastLevel > 0 && level > lastLevel + 1) {
            issues.push({
              id: `hdskip_${startFrom + i}`,
              type: "structure",
              rule: "heading_level_skip",
              paragraphIndex: startFrom + i,
              text: slice[i].text.slice(0, 60),
              message: `Heading level skipped: H${lastLevel} → H${level} (no H${lastLevel + 1} between them)`,
            });
          }
          lastLevel = level;
        }
      }

      // 4. Section header with no body text (skip image-holding paragraphs when scanning forward)
      for (let i = 0; i < slice.length; i++) {
        if (/^Heading\s*\d$/i.test(slice[i].style)) {
          let next = i + 1;
          while (next < slice.length && isTrulyBlank(slice[next])) next++;
          const nextIsHeadingOrEnd = next >= slice.length || /^Heading\s*\d$/i.test(slice[next].style);
          if (nextIsHeadingOrEnd) {
            issues.push({
              id: `emptysec_${startFrom + i}`,
              type: "structure",
              rule: "empty_section",
              paragraphIndex: startFrom + i,
              text: slice[i].text.slice(0, 60),
              message: `Section "${slice[i].text.trim().slice(0, 40)}" has no body text`,
            });
          }
        }
      }

      // 5. Placeholder / template text
      const PLACEHOLDER_RE = [
        /\[이름\]/i, /\[name\]/i, /\[year\]/i, /\[date\]/i, /\[author\]/i,
        /\[저자명\]/i, /\[기관명\]/i,
        /\bTODO\b/, /\bXXX\b/,
        /Figure\s+X\b/i, /Table\s+X\b/i,
        /\[CITATION NEEDED\]/i, /Lorem\s+ipsum/i,
        /\(INSERT\b/i, /\[PLACEHOLDER\]/i,
      ];
      for (let i = 0; i < slice.length; i++) {
        const text = slice[i].text;
        for (const re of PLACEHOLDER_RE) {
          if (re.test(text)) {
            issues.push({
              id: `placeholder_${startFrom + i}`,
              type: "structure",
              rule: "placeholder_text",
              paragraphIndex: startFrom + i,
              text: text.slice(0, 80),
              message: `Placeholder text found: "${text.trim().slice(0, 60)}"`,
            });
            break;
          }
        }
      }

      // 6. Abstract word count (if profile specifies a limit)
      const profile = getProfile(profileId);
      const abstractMaxWords: number | undefined = (profile?.rules as any)?.abstract?.maxWords;
      if (abstractMaxWords) {
        let inAbstract = false;
        let wordCount = 0;
        let abstractParaIdx = -1;
        for (let i = 0; i < slice.length; i++) {
          const text = slice[i].text.trim();
          const style = slice[i].style;
          if (/abstract/i.test(text) && /^Heading\s*\d$/i.test(style)) {
            inAbstract = true;
            abstractParaIdx = startFrom + i;
            continue;
          }
          if (inAbstract) {
            if (/^Heading\s*\d$/i.test(style)) break;
            wordCount += text.split(/\s+/).filter(Boolean).length;
          }
        }
        if (inAbstract && wordCount > abstractMaxWords) {
          issues.push({
            id: `abstract_len_${abstractParaIdx}`,
            type: "structure",
            rule: "abstract_word_count",
            paragraphIndex: abstractParaIdx,
            text: `${wordCount} words`,
            message: `Abstract is ${wordCount} words — exceeds limit of ${abstractMaxWords}`,
          });
        }
      }

      // 7. Caption ↔ in-text cross-reference
      // Normalize figure/table type to a canonical key so "Fig." and "Figure" resolve the same.
      const normalizeRef = (type: string, num: string): string => {
        const t = type.toLowerCase().replace(/\./g, "").trim();
        const canon = (t === "fig" || t === "figure" || t === "그림") ? "fig" : "tbl";
        return `${canon}_${num}`;
      };
      const CAPTION_PREFIX_RE = /^(Figure|Fig\.?|Tab\.?|Table|그림|표)\s+(\d+)/i;
      // Korean body sentences often start with "그림 N. 는..." or "그림 N. 은..." where
      // the figure/table is the grammatical subject followed by a Korean postposition (josa).
      // These must be treated as body text, not captions, even though they start with "그림 N".
      const BODY_SENTENCE_JOSA_RE = /^(Figure|Fig\.?|Tab\.?|Table|그림|표)\s+\d+\.?\s*(는|은|이|가|을|를|에서|에|의|과|와|도|로|으로|부터|까지|에게)/i;
      // \b does not work before non-ASCII characters (Korean 그림/표 are \W).
      // Use negative lookbehind for Latin letters instead.
      const INTEXT_REF_RE = /(?<![A-Za-z])(Figure|Fig\.?|Tab\.?|Table|그림|표)\s+(\d+)/gi;
      // captionSet: normalised key → { paraIdx, orig } where orig is the raw prefix text
      const captionSet = new Map<string, { paraIdx: number; orig: string }>();
      const bodyRefSet = new Set<string>();

      for (let i = 0; i < slice.length; i++) {
        const text = slice[i].text;
        const isCaption = /caption/i.test(slice[i].style) ||
          (CAPTION_PREFIX_RE.test(text) && !BODY_SENTENCE_JOSA_RE.test(text));
        if (isCaption) {
          const m = text.match(CAPTION_PREFIX_RE);
          if (m) {
            const key = normalizeRef(m[1], m[2]);
            if (!captionSet.has(key)) captionSet.set(key, { paraIdx: startFrom + i, orig: `${m[1]} ${m[2]}` });
          }
        } else {
          INTEXT_REF_RE.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = INTEXT_REF_RE.exec(text)) !== null) {
            bodyRefSet.add(normalizeRef(m[1], m[2]));
          }
        }
      }
      // Caption that is never cited in the body
      captionSet.forEach(({ paraIdx, orig }, key) => {
        if (!bodyRefSet.has(key)) {
          issues.push({
            id: `nocite_${key}`,
            type: "structure",
            rule: "unreferenced_caption",
            paragraphIndex: paraIdx,
            text: orig,
            message: `"${orig}" has a caption but is never referenced in the body text`,
          });
        }
      });
      // In-text reference that has no caption
      bodyRefSet.forEach((ref) => {
        if (!captionSet.has(ref)) {
          const parts = ref.split("_");
          const type = parts[0]; const num = parts[1];
          issues.push({
            id: `nocaption_${ref}`,
            type: "structure",
            rule: "unreferenced_caption",
            paragraphIndex: -1,
            text: `${type === "fig" ? "Figure" : "Table"} ${num}`,
            message: `${type === "fig" ? "Figure" : "Table"} ${num} is referenced in text but has no caption in the scanned range`,
          });
        }
      });

      // 8. Abbreviation lifecycle: used before its definition
      // Definition pattern: (ABBR) — two-to-eight uppercase letters in parentheses.
      // Only flag abbreviations that ARE defined somewhere; "never defined" is not checked
      // (too many false positives from domain acronyms like AI, LLM, IEEE).
      const ABBR_DEF_RE = /\(([A-Z]{2,8})\)/g;
      const abbrevDefIdx = new Map<string, number>(); // abbr → first paragraph index where (ABBR) appears
      for (let i = 0; i < slice.length; i++) {
        ABBR_DEF_RE.lastIndex = 0;
        let m;
        while ((m = ABBR_DEF_RE.exec(slice[i].text)) !== null) {
          if (!abbrevDefIdx.has(m[1])) abbrevDefIdx.set(m[1], startFrom + i);
        }
      }
      abbrevDefIdx.forEach((defParaIdx, abbr) => {
        const USE_RE = new RegExp(`\\b${abbr}\\b`, "g");
        for (let i = 0; i < slice.length; i++) {
          const paraIdx = startFrom + i;
          if (paraIdx >= defParaIdx) break; // past definition — stop searching
          if (/^Heading\s*\d$/i.test(slice[i].style)) continue; // skip headings
          USE_RE.lastIndex = 0;
          if (USE_RE.test(slice[i].text)) {
            issues.push({
              id: `abbr_${abbr}_${paraIdx}`,
              type: "structure",
              rule: "abbreviation_order",
              paragraphIndex: paraIdx,
              text: abbr,
              message: `"${abbr}" used before its definition — first defined at paragraph ${defParaIdx}`,
            });
            break; // flag only the first premature use
          }
        }
      });

      // 9. Exact duplicate paragraphs (≥ 40 characters, non-heading)
      const seenTexts = new Map<string, number>(); // text → first paragraphIndex
      for (let i = 0; i < slice.length; i++) {
        const text = slice[i].text.trim();
        if (text.length < 40) continue;
        if (/^Heading\s*\d$/i.test(slice[i].style)) continue;
        if (seenTexts.has(text)) {
          issues.push({
            id: `dup_${startFrom + i}`,
            type: "structure",
            rule: "duplicate_paragraph",
            paragraphIndex: startFrom + i,
            text: text.slice(0, 80),
            message: `Duplicate paragraph — same text already appears at paragraph ${seenTexts.get(text)}`,
          });
        } else {
          seenTexts.set(text, startFrom + i);
        }
      }

      // 10. Citation ↔ Reference list cross-check
      // Find References/Bibliography heading in the scanned slice.
      // Extract defined [N] numbers from entries after the heading.
      // Extract cited [N] numbers from body paragraphs before the heading.
      // Report: cited but no ref entry ("cited_not_defined"),
      //         ref entry but never cited ("defined_not_cited").
      const REF_HEADING_RE = /^(References|Bibliography|참고문헌|Reference List)\s*$/i;
      let refHeadingSliceIdx = -1;
      for (let i = 0; i < slice.length; i++) {
        if (REF_HEADING_RE.test(slice[i].text.trim())) {
          refHeadingSliceIdx = i;
          break;
        }
      }
      if (refHeadingSliceIdx >= 0) {
        const definedNums = new Set<number>();
        const citedNums = new Set<number>();

        // Build defined set from reference entries
        for (let i = refHeadingSliceIdx + 1; i < slice.length; i++) {
          const t = slice[i].text.trim();
          if (!t) continue;
          const m = t.match(/^\[(\d+)\]/) || t.match(/^\((\d+)\)/) || t.match(/^(\d+)\./);
          if (m) definedNums.add(parseInt(m[1]));
        }

        // Build cited set from body (before references heading)
        const CITE_RE = /\[(\d+(?:[,;\s–\-]\s*\d+)*)\]/g;
        for (let i = 0; i < refHeadingSliceIdx; i++) {
          const t = slice[i].text;
          CITE_RE.lastIndex = 0;
          let m;
          while ((m = CITE_RE.exec(t)) !== null) {
            const content = m[1];
            // Handle range: "1-3" or "1–3"
            const rangeM = content.match(/^(\d+)\s*[–\-]\s*(\d+)$/);
            if (rangeM) {
              const lo = parseInt(rangeM[1]);
              const hi = parseInt(rangeM[2]);
              for (let n = lo; n <= Math.min(hi, lo + 50); n++) citedNums.add(n);
            } else {
              content.split(/[,;\s]+/).forEach((part) => {
                const n = parseInt(part);
                if (!isNaN(n)) citedNums.add(n);
              });
            }
          }
        }

        // Cross-check — only run if we have a non-trivial reference list
        if (definedNums.size > 0) {
          citedNums.forEach((n) => {
            if (!definedNums.has(n)) {
              issues.push({
                id: `crossref_cited_${n}`,
                type: "structure",
                rule: "cited_not_defined",
                paragraphIndex: -1,
                text: `[${n}]`,
                message: `[${n}] is cited in the body but has no matching entry in the References section`,
              });
            }
          });
          definedNums.forEach((n) => {
            if (!citedNums.has(n)) {
              issues.push({
                id: `crossref_def_${n}`,
                type: "structure",
                rule: "defined_not_cited",
                paragraphIndex: refHeadingSliceIdx + startFrom,
                text: `[${n}]`,
                message: `Reference [${n}] is listed in References but never cited in the body`,
              });
            }
          });
        }
      }
    });
  } catch (e) {
    console.error("scanStructure error:", e);
  }
  return {
    issues,
    stats: { totalParagraphs: 0, candidatesFound: issues.length, issuesFound: issues.length },
    logs: [],
  };
}

// --- Paper Review Functions ---

export async function extractSections(): Promise<{
  abstract: string;
  introduction: string;
  method: string;
  results: string;
  discussion: string;
  conclusion: string;
}> {
  let sections = {
    abstract: "",
    introduction: "",
    method: "",
    results: "",
    discussion: "",
    conclusion: ""
  };

  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      body.load("paragraphs");
      await context.sync();

      const paragraphs = body.paragraphs;
      paragraphs.load("items");
      await context.sync();

      for (let i = 0; i < paragraphs.items.length; i++) {
        paragraphs.items[i].load(["text", "styleBuiltIn"]);
      }
      await context.sync();

      let currentSection = "";
      const sectionTexts: Record<string, string[]> = {
        abstract: [],
        introduction: [],
        method: [],
        results: [],
        discussion: [],
        conclusion: []
      };

      for (let i = 0; i < paragraphs.items.length; i++) {
        const p = paragraphs.items[i];
        const text = p.text.trim();
        const isHeading = p.styleBuiltIn?.toString().includes("Heading") || false;

        // Detect section headings
        if (isHeading || /^(abstract|introduction|method|methodology|approach|experiment|results|discussion|conclusion)/i.test(text)) {
          const lower = text.toLowerCase();
          if (/abstract/i.test(lower)) currentSection = "abstract";
          else if (/introduction/i.test(lower)) currentSection = "introduction";
          else if (/method|methodology|approach/i.test(lower)) currentSection = "method";
          else if (/experiment|results/i.test(lower)) currentSection = "results";
          else if (/discussion/i.test(lower)) currentSection = "discussion";
          else if (/conclusion/i.test(lower)) currentSection = "conclusion";
          continue;
        }

        // Accumulate text for current section
        if (currentSection && text.length > 10) {
          sectionTexts[currentSection].push(text);
        }
      }

      // Join accumulated texts
      sections.abstract = sectionTexts.abstract.join("\n\n");
      sections.introduction = sectionTexts.introduction.join("\n\n");
      sections.method = sectionTexts.method.join("\n\n");
      sections.results = sectionTexts.results.join("\n\n");
      sections.discussion = sectionTexts.discussion.join("\n\n");
      sections.conclusion = sectionTexts.conclusion.join("\n\n");
    });
  } catch (error) {
    console.error("extractSections error:", error);
  }

  return sections;
}

export async function reviewPaper(
  sections: {
    abstract: string;
    introduction: string;
    method: string;
    results: string;
    discussion: string;
  },
  venue: string,
  profileId: string,
  apiBaseUrl: string
): Promise<PaperReview> {
  const response = await fetch(`${apiBaseUrl}/analyze/review-paper`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sections, venue, profileId })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  return await response.json();
}
