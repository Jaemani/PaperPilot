/* global Word console */

export async function insertText(text: string) {
  // Write text to the document.
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

// --- v0.4.0: Document Indexer & Validator ---

export interface CaptionIssue {
  id: string; // Unique ID (Paragraph ID or similar)
  text: string;
  isValid: boolean;
  suggestion?: string;
  range?: Word.Range; // Note: Cannot be passed to React state directly
}

import journalFormats from "./data/journalFormats.json";

export async function scanCaptions(journalId: string): Promise<CaptionIssue[]> {
  const issues: CaptionIssue[] = [];
  const journal = journalFormats.find(j => j.id === journalId) || journalFormats[0];
  const rule = journal.captionStyle.figure;

  try {
    await Word.run(async (context) => {
      // 1. Search for potential captions (Naive search for "Fig" and "Figure")
      // In a real scenario, we might iterate all paragraphs, but search is faster for sparse captions.
      // We search for both "Fig" and "Figure" to catch mixed usage.
      const searchResults = context.document.body.search("Fig", { matchWildcards: false });
      searchResults.load("items");
      await context.sync();

      // 2. Iterate and Validate
      for (let i = 0; i < searchResults.items.length; i++) {
        const range = searchResults.items[i];
        const paragraph = range.paragraph;
        paragraph.load("text");
        await context.sync();

        const text = paragraph.text.trim();
        
        // Simple Regex Validation based on JSON Rule
        // Rule: Must start with prefix + space + number + separator
        // e.g. "Fig. 1."
        const expectedStart = `${rule.prefix} `;
        const regex = new RegExp(`^${rule.prefix.replace('.', '\\.')}\\s*\\d+${rule.separator.replace('|', '\\|')}`);
        
        const isValid = regex.test(text);
        let suggestion = undefined;

        if (!isValid) {
          // Naive fix generation: Assume the number is correct but format is wrong
          // Extract number using regex
          const numberMatch = text.match(/\d+/);
          const num = numberMatch ? numberMatch[0] : "X";
          
          // Extract content (everything after the separator or number)
          // This is tricky without LLM, so we'll do a simple split
          let content = text.replace(/^(Fig|Figure)\.?\s*\d+[:.|]?\s*/i, "");
          
          suggestion = `${rule.prefix} ${num}${rule.separator} ${content}`;
        }

        issues.push({
          id: `cap_${i}`,
          text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
          isValid: isValid,
          suggestion: suggestion,
          // We can't return the Range object to React state, so we handle navigation differently
        });
      }
    });
  } catch (error) {
    console.error("Scan failed", error);
  }
  return issues;
}

export async function selectIssueInDoc(textSnippet: string) {
  try {
    await Word.run(async (context) => {
      // Re-find the range by text (limitation of stateless MVP)
      // Ideally we should use paragraph IDs
      const results = context.document.body.search(textSnippet, { matchWildcards: false });
      results.load("items");
      await context.sync();
      
      if (results.items.length > 0) {
        results.items[0].select();
        await context.sync();
      }
    });
  } catch (error) {
    console.error(error);
  }
}
