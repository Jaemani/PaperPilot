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
    citations: ScanResult<CitationIssue>;
    layout: ScanResult<LayoutIssue>;
    headings: ScanResult<HeadingIssue>;
    references: ScanResult<ReferenceIssue>;
  };
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

export async function scanCaptions(profileId: string, startFrom = 0): Promise<ScanResult<CaptionIssue>> {
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
      logs.push(`Scanning ${paragraphs.items.length - effectiveStart} paragraphs (offset: ${effectiveStart})...`);

      // Bulk Load Properties (Text + Style)
      for (let i = effectiveStart; i < paragraphs.items.length; i++) {
        paragraphs.items[i].load(["text", "font/name", "font/size", "font/bold", "alignment"]);
      }
      await context.sync();

      for (let i = effectiveStart; i < paragraphs.items.length; i++) {
        const p = paragraphs.items[i];
        const text = p.text.trim();
        if (!text || text.length > 300) continue;

        const figDetectRegex = new RegExp(figRule.detect.regex, figRule.detect.flags);
        
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

export async function scanCitations(_profileId: string, startFrom = 0): Promise<ScanResult<CitationIssue>> {
    const issues: CitationIssue[] = [];
    const logs: string[] = [];
    let stats = { totalParagraphs: 0, candidatesFound: 0, issuesFound: 0 };

    try {
        await Word.run(async (context) => {
            const paragraphs = context.document.body.paragraphs;
            paragraphs.load("items");
            await context.sync();

            stats.totalParagraphs = paragraphs.items.length;
            const effectiveStart = Math.min(startFrom, paragraphs.items.length);
            for (let i = effectiveStart; i < paragraphs.items.length; i++) {
                paragraphs.items[i].load("text");
            }
            await context.sync();

            // Match combined citations like [1,2] or [1, 2, 3]
            const multiCiteRegex = /\[(\d+(?:\s*,\s*\d+)+)\]/g;
            // Count valid single-bracket citations for confidence
            const singleCiteRegex = /\[\d+\]/g;
            let validSingleCount = 0;

            for (let i = effectiveStart; i < paragraphs.items.length; i++) {
                const text = paragraphs.items[i].text;
                if (!text) continue;

                validSingleCount += (text.match(singleCiteRegex) || []).length;

                let match: RegExpExecArray | null;
                multiCiteRegex.lastIndex = 0;
                while ((match = multiCiteRegex.exec(text)) !== null) {
                    stats.candidatesFound++;
                    const fullMatch = match[0];
                    const inner = match[1];
                    stats.issuesFound++;
                    const fixed = inner.split(",").map(n => `[${n.trim()}]`).join(", ");
                    issues.push({
                        id: `cite_${i}_${match.index}`,
                        type: "citation",
                        text: fullMatch,
                        isValid: false,
                        suggestion: fixed,
                        message: "Use separate brackets: [1], [2]",
                        paragraphIndex: i
                    });
                }
            }
            logs.push(`Scanned ${stats.totalParagraphs - effectiveStart} paragraphs (offset: ${effectiveStart}).`);
            logs.push(`Single-bracket [n] citations found: ${validSingleCount} (already correct format).`);
            logs.push(`Combined [n,m] citations found: ${stats.issuesFound} (need fixing).`);
        });
    } catch (e) { logs.push(`Error: ${e}`); }
    return { issues, stats, logs };
}


export async function scanLayout(profileId: string, startFrom = 0): Promise<ScanResult<LayoutIssue>> {
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
      const maxScan = Math.min(paras.items.length, typoStart + 50);

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
  onScanComplete?: (scan: "captions" | "citations" | "layout" | "headings" | "references") => void
): Promise<SubmissionReport> {
  const profile = getProfile(profileId);
  const layoutRule = (profile?.rules as any)?.layout;
  const typoRule = (profile?.rules as any)?.typography;

  // Run all scans in parallel (each Word.run creates its own context)
  const [captionResult, citeResult, layoutResult, headingResult, referenceResult] = await Promise.all([
    scanCaptions(profileId, startFrom).then(r => { onScanComplete?.("captions"); return r; }),
    scanCitations(profileId, startFrom).then(r => { onScanComplete?.("citations"); return r; }),
    scanLayout(profileId, startFrom).then(r => { onScanComplete?.("layout"); return r; }),
    scanHeadings(profileId, startFrom).then(r => { onScanComplete?.("headings"); return r; }),
    scanReferences(profileId, startFrom).then(r => { onScanComplete?.("references"); return r; }),
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
        detail: "File → Page Layout → Margins",
        autoFixable: false,
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
        detail: "File → Page Layout → Size",
        autoFixable: false,
      });
    }
  }

  // --- Columns (manual hint with detected value if available) ---
  if (layoutRule?.columns && layoutRule.columns > 1) {
    const colLog = layoutResult.logs.find(l => l.startsWith("Columns:"));
    const colDetail = colLog
      ? `${colLog} — verify via Layout → Columns`
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
  const citeIssues = citeResult.issues.length;
  const singleLog  = citeResult.logs.find(l => l.startsWith("Single-bracket"));
  const singleCount = parseInt(singleLog?.match(/(\d+)/)?.[1] ?? "0");
  items.push({
    id: "content_citations", category: "citations", label: "Citation bracket format",
    status: citeIssues === 0 ? "pass" : "fail",
    currentValue:  citeIssues > 0 ? `${citeIssues} combined bracket(s)` : undefined,
    expectedValue: "Each citation in separate brackets: [1], [2]",
    detail: citeIssues === 0
      ? `${singleCount} citation(s) checked — all use separate brackets`
      : `${citeIssues} combined brackets found (e.g. [1,2]) — split into separate`,
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
  if (issue.field.startsWith("margin_") || issue.field === "page_size") {
    try {
      await Word.run(async (context) => {
        const sections = context.document.sections;
        sections.load("items");
        await context.sync();
        const ps: any = (sections.items[0].body as any).pageSetup;
        if (issue.field === "page_size" && layoutRule?.pageSize) {
          const A4_W = 595.3, A4_H = 841.9, LTR_W = 612, LTR_H = 792;
          if (layoutRule.pageSize === "A4") { ps.pageWidth = A4_W; ps.pageHeight = A4_H; }
          else if (layoutRule.pageSize === "Letter") { ps.pageWidth = LTR_W; ps.pageHeight = LTR_H; }
        } else if (layoutRule?.margins) {
          const m = layoutRule.margins;
          const cmToPt = (cm: number) => cm * 28.35;
          if (issue.field === "margin_top")    ps.topMargin    = cmToPt(m.top);
          if (issue.field === "margin_bottom") ps.bottomMargin = cmToPt(m.bottom);
          if (issue.field === "margin_left")   ps.leftMargin   = cmToPt(m.left);
          if (issue.field === "margin_right")  ps.rightMargin  = cmToPt(m.right);
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
        p.load("text");
        p.font.load("name,size");
      }
      await context.sync();

      for (const p of paragraphs.items) {
        if (!p.text || p.text.trim().length === 0) continue;

        if (issue.field === "body_font" && bodySpec.fontName) {
          if (p.font.name === issue.currentValue) {
            p.font.name = bodySpec.fontName;
          }
        } else if (issue.field === "body_size" && bodySpec.fontSize) {
          const cur = Math.round((p.font.size || 0) * 2) / 2;
          if (cur > 0 && Math.abs(cur - bodySpec.fontSize) > 0.5) {
            p.font.size = bodySpec.fontSize;
          }
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

export async function scanHeadings(profileId: string, startFrom = 0): Promise<ScanResult<HeadingIssue>> {
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
      for (let i = effectiveStart; i < paragraphs.items.length; i++) {
        paragraphs.items[i].load("text,style");
        paragraphs.items[i].font.load("size,bold");
      }
      await context.sync();

      const levelMap: Record<string, 1 | 2 | 3> = {
        "Heading 1": 1, "Heading 2": 2, "Heading 3": 3,
      };

      for (let i = effectiveStart; i < paragraphs.items.length; i++) {
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
      logs.push(`Scanned ${stats.totalParagraphs - effectiveStart} paragraphs (offset: ${effectiveStart}), found ${stats.candidatesFound} headings.`);
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

export async function scanReferences(_profileId: string, startFrom = 0): Promise<ScanResult<ReferenceIssue>> {
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
      for (let i = effectiveStart; i < paragraphs.items.length; i++) {
        paragraphs.items[i].load("text");
      }
      await context.sync();

      // Find the References/Bibliography heading
      const refHeadingRe = /^(References|Bibliography|참고문헌|Reference List)\s*$/i;
      let refStartIdx = -1;
      for (let i = effectiveStart; i < paragraphs.items.length; i++) {
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
      for (let i = refStartIdx + 1; i < paragraphs.items.length; i++) {
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
