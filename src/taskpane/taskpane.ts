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
                        if (formatRule.alignment) p.alignment = formatRule.alignment;
                    }
                }
                
                await context.sync();
            }
        });
    } catch (e) { console.error(e); }
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

export interface CaptionIssue {
  id: string;
  type: "caption";
  text: string;
  isValid: boolean;
  suggestion?: string;
  message: string;
  paragraphIndex: number;
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

export async function scanCaptions(profileId: string): Promise<ScanResult<CaptionIssue>> {
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
      logs.push(`Scanning ${stats.totalParagraphs} paragraphs...`);

      // Bulk Load Properties (Text + Style)
      for (let i = 0; i < paragraphs.items.length; i++) {
        paragraphs.items[i].load(["text", "font/name", "font/size", "font/bold", "alignment"]);
      }
      await context.sync();

      for (let i = 0; i < paragraphs.items.length; i++) {
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
            const numSepRegex = new RegExp(`^${escapedPrefix}\s*\d+${escapedSep}`);
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

export async function scanCitations(profileId: string): Promise<ScanResult<CitationIssue>> {
    const issues: CitationIssue[] = [];
    const logs: string[] = [];
    let stats = { totalParagraphs: 0, candidatesFound: 0, issuesFound: 0 };

    try {
        await Word.run(async (context) => {
            const searchResults = context.document.body.search("[\]*[\]", { matchWildcards: true }); 
            const searchResultsParens = context.document.body.search("(\])*(\])", { matchWildcards: true });
            
            searchResults.load("items");
            searchResultsParens.load("items");
            await context.sync();

            const allResults = [...searchResults.items, ...searchResultsParens.items];
            stats.candidatesFound = allResults.length;

            for (let i = 0; i < allResults.length; i++) {
                allResults[i].load("text");
            }
            await context.sync();

            for (let i = 0; i < allResults.length; i++) {
                const text = allResults[i].text.trim();
                if (!/\d/.test(text)) continue;

                if (/[\]\d+\s*,\s*\d+[\]]/.test(text)) {
                    stats.issuesFound++;
                    issues.push({
                        id: `cite_${i}`,
                        type: "citation",
                        text: text,
                        isValid: false,
                        suggestion: text.replace(/,/g, "], [").replace(/\s+/g, ""),
                        message: "Use separate brackets: [1], [2]",
                        paragraphIndex: -1 
                    });
                }
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
