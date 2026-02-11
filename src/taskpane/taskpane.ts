/* global Word console Office */

import dataRaw from "./data/journalFormats.json";
const data = dataRaw as any;

const getProfile = (id: string) => data.profiles.find((p: any) => p.id === id);

export async function insertText(text: string) {
  try {
    await Word.run(async (context) => {
      let body = context.document.body;
      body.insertParagraph(text, Word.InsertLocation.end);
      await context.sync();
    });
  } catch (error) { console.log("Error: " + error); }
}

export async function getSelectedText(): Promise<string> {
  try {
    return await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load("text");
      await context.sync();
      return selection.text;
    });
  } catch (error) { console.log("Error: " + error); return ""; }
}

export async function replaceSelection(text: string) {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertText(text, Word.InsertLocation.replace);
      await context.sync();
    });
  } catch (error) { console.log("Error: " + error); }
}

export async function replaceParagraphText(index: number, newText: string) {
    try {
        await Word.run(async (context) => {
            const paragraphs = context.document.body.paragraphs;
            paragraphs.load("items");
            await context.sync();
            if (paragraphs.items[index]) {
                paragraphs.items[index].insertText(newText, Word.InsertLocation.replace);
                await context.sync();
            }
        });
    } catch (e) { console.error(e); }
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
  logs.push(`[System] Scan Profile: ${profile?.name || profileId}`);

  if (!profile || !profile.rules.captionStyle) {
      logs.push(`[Error] No rules defined.`);
      return { issues, stats, logs };
  }
  
  const figRule = profile.rules.captionStyle.figure;
  
  try {
    await Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load("items");
      await context.sync();

      stats.totalParagraphs = paragraphs.items.length;
      logs.push(`[Indexer] ${stats.totalParagraphs} paragraphs found.`);

      for (let i = 0; i < paragraphs.items.length; i++) {
        paragraphs.items[i].load("text");
      }
      await context.sync();

      for (let i = 0; i < paragraphs.items.length; i++) {
        const text = paragraphs.items[i].text.trim();
        if (!text || text.length > 350) continue;

        // Use Regex from JSON correctly
        const detectRegex = new RegExp(figRule.detect.regex, figRule.detect.flags);
        if (detectRegex.test(text)) {
            stats.candidatesFound++;
            logs.push(`[Match] Para ${i}: "${text.substring(0, 30)}..." matches detect regex.`);

            const expectedPrefix = figRule.validate.expectedPrefix; 
            const separator = figRule.validate.separator;

            // Simple but strict validation
            const startsWithPrefix = text.startsWith(expectedPrefix);
            
            // Re-validate pattern including separator
            const escapedPrefix = expectedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedSep = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const validateRegex = new RegExp(`^${escapedPrefix}\\s*\\d+${escapedSep}`);
            const isValidPattern = validateRegex.test(text);
            
            const isValid = startsWithPrefix && isValidPattern;

            if (!isValid) {
                stats.issuesFound++;
                logs.push(`  -> [ISSUE] Validation failed.`);
                
                // Parser for Fix
                const match = text.match(/^((?:Fig\.|Figure|Table|그림|표)\.?)\s*(\d+)[:.|]?\s*(.*)$/i);
                let suggestion = undefined;
                if (match) {
                    suggestion = `${expectedPrefix} ${match[2]}${separator} ${match[3]}`;
                }

                issues.push({
                    id: `cap_${i}`,
                    type: "caption",
                    text: text.substring(0, 60) + "...",
                    isValid: false,
                    suggestion: suggestion,
                    message: `Expected format: "${expectedPrefix} N${separator}"`,
                    paragraphIndex: i
                });
            } else {
                logs.push(`  -> [Valid] Para ${i} follows rules.`);
            }
        }
      }
    });
  } catch (error) { logs.push(`[Error] ${error}`); }
  
  if (stats.candidatesFound === 0) logs.push(`[Note] No candidates matched regex: ${figRule.detect.regex}`);
  return { issues, stats, logs };
}

export async function scanCitations(profileId: string): Promise<ScanResult<CitationIssue>> {
    const issues: CitationIssue[] = [];
    const logs: string[] = [];
    let stats = { totalParagraphs: 0, candidatesFound: 0, issuesFound: 0 };

    const profile = getProfile(profileId);
    logs.push(`[System] Scanning Citations: ${profile?.name}`);

    try {
        await Word.run(async (context) => {
            const searchResults = context.document.body.search("[*]", { matchWildcards: true }); 
            const searchResultsParens = context.document.body.search("(*)", { matchWildcards: true }); 
            searchResults.load("items");
            searchResultsParens.load("items");
            await context.sync();

            const allResults = [...searchResults.items, ...searchResultsParens.items];
            for (let i = 0; i < allResults.length; i++) allResults[i].load("text");
            await context.sync();

            for (let i = 0; i < allResults.length; i++) {
                const text = allResults[i].text.trim();
                
                // Gate: Must contain digit to be a candidate
                if (!/\d/.test(text)) continue;
                
                stats.candidatesFound++;

                if (/\[\d+\s*,\s*\d+\]/.test(text)) {
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
    } catch (e) { logs.push(`[Error] ${e}`); }
    
    logs.push(`[Indexer] ${stats.candidatesFound} valid citation candidates indexed.`);
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
