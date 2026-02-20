import * as React from "react";
import { 
  makeStyles, 
  TabList, 
  Tab, 
  TabValue,
  SelectTabData,
  Button,
  Textarea,
  Text,
  Badge,
  Divider,
  tokens,
  shorthands,
  Dropdown,
  Option,
  Card,
  Spinner,
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel
} from "@fluentui/react-components";
import { 
  TextQuote24Regular, 
  CheckmarkCircle24Regular, 
  DocumentEdit24Regular,
  Play24Regular,
  ArrowSync24Regular,
  Search24Regular,
  ErrorCircle24Regular,
  Wand24Regular,
  ChevronRight24Regular,
  Info24Regular,
  Code24Regular,
  Sparkle24Filled
} from "@fluentui/react-icons";
import {
  getSelectedText,
  replaceSelection,
  replaceParagraphText,
  fixCitationIssue,
  applyAllCaptionFixes,
  applyAllCitationFixes,
  scanCaptions,
  getParagraphContext,
  scanCitations,
  scanLayout,
  fixLayoutIssue,
  scanHeadings,
  fixHeadingIssue,
  generateSubmissionReport,
  selectIssueInDoc,
  inspectCurrentSelection,
  getSelectionParagraphIndex,
  getPageBoundaries,
  scanStructure,
  extractSections,
  reviewPaper,
  StructureIssue,
  InspectResult,
  ScanResult,
  CaptionIssue,
  CitationIssue,
  CitationCandidate,
  HybridCitationResult,
  LayoutIssue,
  HeadingIssue,
  CheckItem,
  SubmissionReport,
  PaperReview
} from "../taskpane";
import dataRaw from "../data/journalFormats.json"; 

const data = dataRaw as any;
// Injected by webpack DefinePlugin from NEXT_PUBLIC_API_URL env var.
// - Dev:  set to http://localhost:3001 (webpack proxy forwards /analyze/* there)
// - Prod: set to your deployed server URL in Vercel env vars (API_SERVER_URL)
declare const __API_SERVER_URL__: string;
const API_BASE_URL: string = (typeof __API_SERVER_URL__ !== "undefined" ? __API_SERVER_URL__ : "");

// Fetch with timeout helper
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 35000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
};

interface AppProps { title: string; }

// Custom brand color
const BRAND_COLOR = "#2596be";
const BRAND_COLOR_HOVER = "#1e7a9a";
const BRAND_COLOR_LIGHT = "#e3f2f7";

// Use 'any' cast to bypass strict style type checking for border properties
const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground1,
    boxSizing: "border-box",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
  },
  headerContainer: {
    padding: "20px 20px 12px 20px",
    backgroundColor: "#ffffff",
    borderBottom: `2px solid ${BRAND_COLOR_LIGHT}`,
    flexShrink: 0,
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  logoImage: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
  },
  logoText: {
    fontSize: "20px",
    fontWeight: 700,
    color: BRAND_COLOR,
    letterSpacing: "-0.5px",
  },
  langToggle: {
    padding: "4px 12px",
    fontSize: "12px",
    fontWeight: 600,
    borderRadius: "16px",
    border: `1.5px solid ${BRAND_COLOR}`,
    backgroundColor: "transparent",
    color: BRAND_COLOR,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: BRAND_COLOR,
      color: "#ffffff",
    },
  },
  contentContainer: {
    display: "flex",
    flexDirection: "column",
    padding: "20px",
    gap: "16px",
    flexGrow: 1,
    overflowY: "auto",
  },
  issueItem: {
    padding: "16px",
    backgroundColor: "#ffffff",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: tokens.colorNeutralStroke1,
    marginBottom: "12px",
    ...shorthands.borderRadius("12px"),
    transition: "all 0.2s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    ":hover": {
      borderColor: BRAND_COLOR,
      boxShadow: "0 4px 12px rgba(37,150,190,0.15)",
      transform: "translateY(-1px)",
    },
  },
  resultCard: {
    backgroundColor: "#ffffff",
    ...shorthands.padding("16px"),
    ...shorthands.borderRadius("12px"),
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  fixBtn: {
    marginTop: "12px",
    width: "100%",
    justifyContent: "center",
    borderRadius: "8px",
    fontWeight: 600,
  },
  suggestionBtn: {
    width: "100%",
    justifyContent: "flex-start",
    textAlign: "left",
    marginTop: "6px",
    borderRadius: "8px",
  },
  logBox: {
    backgroundColor: tokens.colorNeutralBackground3,
    padding: "12px",
    fontSize: "11px",
    fontFamily: "'Consolas', 'Monaco', monospace",
    borderRadius: "8px",
    maxHeight: "150px",
    overflowY: "auto",
    marginTop: "12px",
    whiteSpace: "pre-wrap",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  textArea: {
    minHeight: "120px",
    ...shorthands.border("1.5px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius("10px"),
    fontFamily: "inherit",
  },
  devTool: {
    marginTop: "24px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingTop: "16px"
  }
} as any);

const App: React.FC<AppProps> = () => {
  const styles = useStyles();
  const [language, setLanguage] = React.useState<"KOR" | "ENG">("KOR");
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("term");
  const [scanStructureData, setScanStructureData] = React.useState<ScanResult<StructureIssue> | null>(null);
  const [isStructureLoading, setIsStructureLoading] = React.useState(false);
  const [reviewData, setReviewData] = React.useState<PaperReview | null>(null);
  const [reviewError, setReviewError] = React.useState<string | null>(null);
  const [isReviewLoading, setIsReviewLoading] = React.useState(false);
  const [acceptedSamples, setAcceptedSamples] = React.useState<string>("");
  const [rejectedSamples, setRejectedSamples] = React.useState<string>("");
  const [showSampleInput, setShowSampleInput] = React.useState(false);
  const [selection, setSelection] = React.useState<string>("");
  const [analysisResult, setAnalysisResult] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const [docTypeId, setDocTypeId] = React.useState<string>(data.ui.root[0].id);
  const [subTypeId, setSubTypeId] = React.useState<string>("");
  const [profileId, setProfileId] = React.useState<string>(data.ui.root[0].profileIds?.[0] || "");

  const [scanCaptionData, setScanCaptionData] = React.useState<ScanResult<CaptionIssue> | null>(null);
  const [scanCiteData, setScanCiteData] = React.useState<HybridCitationResult | null>(null);
  const [aiSuggestions, setAiSuggestions] = React.useState<any[] | null>(null);
  const [scanLayoutData, setScanLayoutData] = React.useState<ScanResult<LayoutIssue> | null>(null);
  const [scanHeadingData, setScanHeadingData] = React.useState<ScanResult<HeadingIssue> | null>(null);
  const [isLayoutLoading, setIsLayoutLoading] = React.useState(false);
  const [reportData, setReportData] = React.useState<SubmissionReport | null>(null);
  const [isReportLoading, setIsReportLoading] = React.useState(false);

  // Scan range: 1-based page numbers. pageFrom=1 = start of doc; pageTo=undefined = end of doc.
  const [pageFrom, setPageFrom] = React.useState<number>(1);
  const [pageTo, setPageTo] = React.useState<number | undefined>(undefined);

  // Convert page numbers → paragraph indices just before each scan.
  const resolveParaRange = React.useCallback(async (): Promise<{ offset: number; endOffset: number | undefined }> => {
    const boundaries = await getPageBoundaries();
    const fromIdx = pageFrom >= 1 && pageFrom <= boundaries.length ? boundaries[pageFrom - 1] : 0;
    let endOffset: number | undefined = undefined;
    if (pageTo !== undefined) {
      // end of page pageTo = start of page pageTo+1, or undefined if it's the last detected page
      endOffset = pageTo < boundaries.length ? boundaries[pageTo] : undefined;
    }
    return { offset: fromIdx, endOffset };
  }, [pageFrom, pageTo]);
  // Per-scan progress for Full Check
  type ScanKey = "captions" | "citations" | "layout" | "headings" | "references";
  const [scanProgress, setScanProgress] = React.useState<Record<ScanKey, "idle" | "done"> | null>(null);

  // Separate loading state for Fix / Fix All operations (avoids animating Full Check button)
  const [isFixAllLoading, setIsFixAllLoading] = React.useState(false);
  // Set by context menu "Analyze Term with AI" → auto-triggers analysis when task pane opens
  const [pendingTermAnalysis, setPendingTermAnalysis] = React.useState<string | null>(null);

  const [inspectData, setInspectData] = React.useState<InspectResult | null>(null);
  // Editable margin values for the Action Required callout (fallback to profile values)
  const [marginDraft, setMarginDraft] = React.useState<{top: number, bottom: number, left: number, right: number}>({ top: 2, bottom: 2, left: 2, right: 2 });

  const currentDocType = data.ui.root.find((t: any) => t.id === docTypeId);
  const isJournal = docTypeId === "journal";
  const subTypes: any[] = isJournal ? (currentDocType as any)?.children || [] : [];
  const currentProfile = data.profiles.find((p: any) => p.id === profileId);

  React.useEffect(() => {
    // Reads the "pp_analyzeTerm" document setting written by commands.ts when the user
    // right-clicks and selects "Analyze Term with AI". Clears it immediately after reading.
    const checkPendingTerm = () => {
      Office.context.document.settings.refreshAsync(() => {
        const pending = Office.context.document.settings.get("pp_analyzeTerm") as string | null;
        if (pending && pending.trim()) {
          Office.context.document.settings.remove("pp_analyzeTerm");
          Office.context.document.settings.saveAsync();
          setSelection(pending.trim());
          setSelectedTab("term");
          setPendingTermAnalysis(pending.trim());
        }
      });
    };

    // Called when the task pane gains visibility (used for the already-open panel case).
    const onVisibilityChange = () => { if (!document.hidden) checkPendingTerm(); };

    Office.onReady(() => {
      Office.context.document.addHandlerAsync(Office.EventType.DocumentSelectionChanged, () => handleGetSelection());
      // Case 1: panel was closed and is freshly initialised by showAsTaskpane().
      checkPendingTerm();
      // Case 2: panel was already open — showAsTaskpane() just refocuses it, so onReady
      // does not re-fire. Catch this by listening for the visibilitychange event.
      document.addEventListener("visibilitychange", onVisibilityChange);
    });

    return () => { document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, []);

  // Sync marginDraft with profile when profile changes
  React.useEffect(() => {
    const layoutRule = (currentProfile?.rules as any)?.layout;
    if (layoutRule?.margins) setMarginDraft(layoutRule.margins);
  }, [profileId]);

  // Auto-trigger term analysis when opened via context menu
  React.useEffect(() => {
    if (!pendingTermAnalysis) return;
    const run = async () => {
      setIsLoading(true);
      setAnalysisResult(null);
      try {
        const ctx = await getParagraphContext();
        const res = await fetchWithTimeout(`${API_BASE_URL}/analyze/term`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term: pendingTermAnalysis, context: ctx || pendingTermAnalysis, profileId }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }

        setAnalysisResult(await res.json());
      } catch (e: any) {
        console.error("auto-term analysis:", e);
        setAnalysisResult({
          isInformal: false,
          suggestions: [],
          reason: e.message || "Failed to analyze term. Please try again."
        });
      }
      setIsLoading(false);
      setPendingTermAnalysis(null);
    };
    run();
  }, [pendingTermAnalysis]);

  const handleGetSelection = async () => {
    const text = await getSelectedText();
    if (text && text !== selection) {
      setSelection(text);
      setAnalysisResult(null);
    }
  };

  const handleInspect = async () => {
      const result = await inspectCurrentSelection();
      setInspectData(result);
  };

  const handleScanCaptions = async () => {
    setIsLoading(true);
    setScanCaptionData(null);   // clear stale result before scan
    setScanCiteData(null);      // clear unrelated cite data
    const { offset, endOffset } = await resolveParaRange();
    const result = await scanCaptions(profileId, offset, endOffset);
    setScanCaptionData(result);
    setIsLoading(false);
  };

  const handleScanCitations = async () => {
    setIsLoading(true);
    setScanCiteData(null);      // clear stale result before scan
    setScanCaptionData(null);   // clear unrelated caption data
    const { offset, endOffset } = await resolveParaRange();
    const result = await scanCitations(profileId, offset, endOffset);
    setScanCiteData(result);
    setIsLoading(false);
  };

  const handleScanCitationsAndCaptions = async () => {
    setIsLoading(true);
    setScanCiteData(null);
    setScanCaptionData(null);
    const { offset, endOffset } = await resolveParaRange();

    // Run both scans in parallel
    const [citeResult, captionResult] = await Promise.all([
      scanCitations(profileId, offset, endOffset),
      scanCaptions(profileId, offset, endOffset)
    ]);

    setScanCiteData(citeResult);
    setScanCaptionData(captionResult);
    setIsLoading(false);
  };

  const handleBatchReview = async () => {
    console.log("🔵 [DEBUG] handleBatchReview called");

    if (!scanCiteData || !scanCiteData.aiCandidates || scanCiteData.aiCandidates.length === 0) {
      console.log("❌ [DEBUG] No candidates found");
      return;
    }

    console.log(`✅ [DEBUG] Found ${scanCiteData.aiCandidates.length} candidates to review`);
    console.log("📤 [DEBUG] Sending to:", `${API_BASE_URL}/analyze/citations-batch`);
    console.log("📦 [DEBUG] Payload:", {
      candidatesCount: scanCiteData.aiCandidates.length,
      profileId,
      firstCandidate: scanCiteData.aiCandidates[0]
    });

    setIsLoading(true);
    const startTime = Date.now();

    try {
      console.log("⏳ [DEBUG] Calling fetchWithTimeout with 60s timeout...");
      const res = await fetchWithTimeout(`${API_BASE_URL}/analyze/citations-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: scanCiteData.aiCandidates,
          profileId
        })
      }, 60000); // 60s timeout for batch processing

      const elapsed = Date.now() - startTime;
      console.log(`⏱️ [DEBUG] Response received in ${elapsed}ms, status: ${res.status}`);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ [DEBUG] Server error response:", errorData);
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const suggestions = await res.json();
      console.log("✅ [DEBUG] Batch review suggestions received:", suggestions);
      console.log(`📊 [DEBUG] Got ${suggestions.length} suggestions`);

      setAiSuggestions(suggestions);
    } catch (e: any) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ [DEBUG] Batch review error after ${elapsed}ms:`, e);
      console.error("❌ [DEBUG] Error name:", e.name);
      console.error("❌ [DEBUG] Error message:", e.message);
      console.error("❌ [DEBUG] Error stack:", e.stack);
      setAiSuggestions(null);
    }
    setIsLoading(false);
    console.log("🏁 [DEBUG] handleBatchReview finished");
  };

  const handleScanLayout = async () => {
    setIsLayoutLoading(true);
    setScanLayoutData(null);    // clear stale result before scan
    setReportData(null);        // old Full Check report is now stale
    const { offset, endOffset } = await resolveParaRange();
    const result = await scanLayout(profileId, offset, endOffset);
    setScanLayoutData(result);
    setIsLayoutLoading(false);
  };

  const handleScanStructure = async () => {
    setIsStructureLoading(true);
    setScanStructureData(null);
    const { offset, endOffset } = await resolveParaRange();
    const result = await scanStructure(profileId, offset, endOffset);
    setScanStructureData(result);
    setIsStructureLoading(false);
  };

  const handleReviewPaper = async () => {
    setIsReviewLoading(true);
    setReviewData(null);
    setReviewError(null);
    try {
      const sections = await extractSections();

      // Validate that we have required sections
      if (!sections.abstract || !sections.introduction || !sections.method || !sections.results) {
        setReviewError("Could not extract required sections (Abstract, Introduction, Method, Results). Please ensure your document has clear section headings.");
        setIsReviewLoading(false);
        return;
      }

      const venue = currentProfile?.name || "General";

      // Parse samples (split by double newline or triple newline)
      const acceptedList = acceptedSamples.trim() ? acceptedSamples.split(/\n\n+/).filter(s => s.trim().length > 50) : undefined;
      const rejectedList = rejectedSamples.trim() ? rejectedSamples.split(/\n\n+/).filter(s => s.trim().length > 50) : undefined;

      const result = await reviewPaper(sections, venue, profileId, API_BASE_URL, acceptedList, rejectedList);
      setReviewData(result);
      setReviewError(null);
    } catch (e: any) {
      console.error("Review paper error:", e);
      setReviewError(e.message || "Failed to review paper. Please try again.");
    }
    setIsReviewLoading(false);
  };

  const handleFixLayout = async (issue: LayoutIssue) => {
    setIsLayoutLoading(true);
    await fixLayoutIssue(issue, profileId);
    const result = await scanLayout(profileId);
    setScanLayoutData(result);
    setIsLayoutLoading(false);
  };

  const handleFullCheck = async () => {
    setIsReportLoading(true);
    // Clear all stale results so nothing old shows during loading
    setReportData(null);
    setScanLayoutData(null);
    setScanHeadingData(null);
    setScanCaptionData(null);
    setScanCiteData(null);
    setScanProgress({ captions: "idle", citations: "idle", layout: "idle", headings: "idle", references: "idle" });
    const { offset, endOffset } = await resolveParaRange();
    const result = await generateSubmissionReport(
      profileId,
      offset,
      endOffset,
      (key) => setScanProgress(prev => prev ? { ...prev, [key]: "done" } : null)
    );
    setReportData(result);
    setScanLayoutData(result.rawScans.layout);
    setScanCaptionData(result.rawScans.captions);
    setScanCiteData(result.rawScans.citations);
    setScanHeadingData(result.rawScans.headings);
    setTimeout(() => setScanProgress(null), 1000);
    setIsReportLoading(false);
  };

  // Apply a single report item's fix without triggering a rescan
  const applyReportItemFix = async (item: CheckItem, report: SubmissionReport) => {
    const typoFieldMap: Record<string, LayoutIssue["field"]> = {
      "typo_font": "body_font", "typo_size": "body_size", "typo_spacing": "line_spacing",
    };
    if (typoFieldMap[item.id]) {
      const rawIssue = report.rawScans.layout.issues.find(i => i.field === typoFieldMap[item.id]);
      if (rawIssue) await fixLayoutIssue(rawIssue, profileId);
    } else if (item.id.startsWith("layout_margin_")) {
      const rawIssue = report.rawScans.layout.issues.find(i => i.id === item.id);
      if (rawIssue) await fixLayoutIssue(rawIssue, profileId);
      else await fixLayoutIssue({ id: item.id, type: "layout", field: item.id.replace("layout_", "") as LayoutIssue["field"], currentValue: "unknown", expectedValue: item.expectedValue ?? "", message: "" }, profileId);
    } else if (item.id === "layout_margins") {
      // Use marginDraft (user-editable) values
      const m = marginDraft;
      for (const [field, val] of [["margin_top", m.top], ["margin_bottom", m.bottom], ["margin_left", m.left], ["margin_right", m.right]] as const) {
        await fixLayoutIssue({ id: `layout_${field}`, type: "layout", field: field as LayoutIssue["field"], currentValue: "unknown", expectedValue: `${val} cm`, message: "" }, profileId);
      }
    } else if (item.id === "layout_page_size") {
      const rawIssue = report.rawScans.layout.issues.find(i => i.field === "page_size");
      if (rawIssue) await fixLayoutIssue(rawIssue, profileId);
      else {
        const layoutRule = (currentProfile?.rules as any)?.layout;
        if (layoutRule?.pageSize) await fixLayoutIssue({ id: "layout_page_size", type: "layout", field: "page_size", currentValue: "unknown", expectedValue: layoutRule.pageSize, message: "" }, profileId);
      }
    } else if (item.id === "typography_headings") {
      for (const issue of report.rawScans.headings.issues) await fixHeadingIssue(issue, profileId);
    } else if (item.id === "content_captions") {
      for (const issue of report.rawScans.captions.issues) {
        if (issue.suggestion && issue.paragraphIndex >= 0) await replaceParagraphText(issue.paragraphIndex, issue.suggestion, profileId);
      }
    } else if (item.id === "content_citations") {
      for (const issue of report.rawScans.citations.autoFixes) {
        if (issue.suggestion && issue.paragraphIndex >= 0) await fixCitationIssue(issue);
      }
    }
  };

  // Rescan after fix operations and refresh all state
  const rescanAfterReportFix = async () => {
    const { offset, endOffset } = await resolveParaRange();
    const result = await generateSubmissionReport(profileId, offset, endOffset);
    setReportData(result);
    setScanLayoutData(result.rawScans.layout);
    setScanCaptionData(result.rawScans.captions);
    setScanCiteData(result.rawScans.citations);
    setScanHeadingData(result.rawScans.headings);
    return result;
  };

  const handleReportFix = async (item: CheckItem) => {
    if (!reportData) return;
    setIsFixAllLoading(true);
    await applyReportItemFix(item, reportData);
    await rescanAfterReportFix();
    setIsFixAllLoading(false);
  };

  // Fix all currently-failed auto-fixable items in one pass, single rescan at end
  const handleReportFixAll = async () => {
    if (!reportData) return;
    setIsFixAllLoading(true);
    const failItems = reportData.items.filter(i => i.status === "fail");
    for (const item of failItems) {
      await applyReportItemFix(item, reportData);
    }
    await rescanAfterReportFix();
    setIsFixAllLoading(false);
  };

  const handleApplySingleFix = async (issue: CaptionIssue | CitationIssue) => {
    if (!issue.suggestion) return;
    setIsLoading(true);
    if (issue.type === "citation") {
      await fixCitationIssue(issue as CitationIssue);
      setScanCiteData(await scanCitations(profileId));
    } else if (issue.paragraphIndex >= 0) {
      await replaceParagraphText(issue.paragraphIndex, issue.suggestion, profileId);
      setScanCaptionData(await scanCaptions(profileId));
    } else {
      await replaceSelection(issue.suggestion);
    }
    setIsLoading(false);
  };

  const handleApplyAllFixes = async () => {
    setIsLoading(true);
    if (selectedTab === "cite") {
      // Fix captions first (if any)
      if (scanCaptionData?.issues.length) {
        const issuesToFix = [...scanCaptionData.issues];
        setScanCaptionData(null);
        for (const issue of issuesToFix) {
          if (issue.suggestion && issue.paragraphIndex >= 0) {
            await replaceParagraphText(issue.paragraphIndex, issue.suggestion, profileId);
          }
        }
        setScanCaptionData(await scanCaptions(profileId));
      }
      // Fix citations (if any)
      if (scanCiteData?.autoFixes.length) {
        const issuesToFix = [...scanCiteData.autoFixes];
        setScanCiteData(null);
        for (const issue of issuesToFix) {
          if (issue.suggestion && issue.paragraphIndex >= 0) {
            await fixCitationIssue(issue);
          }
        }
        setScanCiteData(await scanCitations(profileId));
      }
    }
    setIsLoading(false);
  };

  return (
    <div className={styles.root}>
      <div className={styles.headerContainer}>
        <div className={styles.logoContainer}>
          <img src="/assets/paperpilot.png" alt="PaperPilot Logo" className={styles.logoImage} />
          <div className={styles.logoText}>PaperPilot</div>
          <div style={{ marginLeft: "auto" }}>
            <button
              className={styles.langToggle}
              onClick={() => setLanguage(language === "KOR" ? "ENG" : "KOR")}
            >
              {language}
            </button>
          </div>
        </div>
        <TabList selectedValue={selectedTab} onTabSelect={(_, d) => setSelectedTab(d.value)} appearance="subtle">
          <Tab value="term">{language === "KOR" ? "용어" : "Term"}</Tab>
          <Tab value="cite">{language === "KOR" ? "인용" : "Cite"}</Tab>
          <Tab value="format">{language === "KOR" ? "서식" : "Format"}</Tab>
          <Tab value="review">{language === "KOR" ? "검토" : "Review"}</Tab>
        </TabList>
      </div>

      <div className={styles.contentContainer}>
        {(selectedTab === "format" || selectedTab === "cite") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Dropdown value={currentDocType?.labelKo} onOptionSelect={(_, d) => {
                const val = d.optionValue as string;
                setDocTypeId(val);
                const firstProfile = data.ui.root.find((t: any) => t.id === val)?.profileIds?.[0];
                if (firstProfile) setProfileId(firstProfile);
                setSubTypeId("");
            }} style={{ width: "100%" }}>
                {data.ui.root.map((t: any) => <Option key={t.id} value={t.id}>{t.labelKo}</Option>)}
            </Dropdown>
            {isJournal && (
                <Dropdown value={subTypes?.find((s: any) => s.id === subTypeId)?.labelKo || "국내/외"} onOptionSelect={(_, d) => {
                    const val = d.optionValue as string;
                    setSubTypeId(val);
                    const firstProfile = subTypes?.find((s: any) => s.id === val)?.profileIds?.[0];
                    if (firstProfile) setProfileId(firstProfile);
                }} style={{ width: "100%" }}>
                    {subTypes?.map((s: any) => <Option key={s.id} value={s.id}>{s.labelKo}</Option>)}
                </Dropdown>
            )}
            <Dropdown value={currentProfile?.name} onOptionSelect={(_, d) => {
                setProfileId(d.optionValue as string);
                setScanCaptionData(null);
                setScanCiteData(null);
                setScanLayoutData(null);
                setScanHeadingData(null);
                setReportData(null);
                setPageFrom(1);
                setPageTo(undefined);
            }} style={{ width: "100%" }}>
                {(isJournal ? subTypes?.find((s: any) => s.id === subTypeId)?.profileIds : currentDocType?.profileIds)?.map((pid: string) => {
                    const p = data.profiles.find((prof: any) => prof.id === pid);
                    return <Option key={pid} value={pid}>{p?.name}</Option>;
                })}
            </Dropdown>

            {/* ── Scan Range ───────────────────────────────── */}
            <div style={{
              background: tokens.colorNeutralBackground3,
              borderRadius: "6px",
              padding: "6px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}>
              {/* Row 1: page range inputs */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground3, flexShrink: 0 }}>
                  Page
                </Text>
                <input
                  type="number"
                  min={1}
                  value={pageFrom}
                  onChange={e => {
                    const v = Math.max(1, parseInt(e.target.value) || 1);
                    setPageFrom(v);
                    setScanCaptionData(null); setScanCiteData(null);
                    setScanLayoutData(null); setScanHeadingData(null); setReportData(null);
                  }}
                  style={{
                    width: "52px", padding: "2px 4px", fontSize: "12px",
                    border: `1px solid ${tokens.colorNeutralStroke1}`,
                    borderRadius: "4px", background: tokens.colorNeutralBackground1,
                    color: tokens.colorNeutralForeground1, textAlign: "center"
                  }}
                />
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>–</Text>
                <input
                  type="number"
                  min={1}
                  placeholder="end"
                  value={pageTo ?? ""}
                  onChange={e => {
                    const raw = e.target.value;
                    const v = raw === "" ? undefined : Math.max(1, parseInt(raw) || 1);
                    setPageTo(v);
                    setScanCaptionData(null); setScanCiteData(null);
                    setScanLayoutData(null); setScanHeadingData(null); setReportData(null);
                  }}
                  style={{
                    width: "52px", padding: "2px 4px", fontSize: "12px",
                    border: `1px solid ${tokens.colorNeutralStroke1}`,
                    borderRadius: "4px", background: tokens.colorNeutralBackground1,
                    color: tokens.colorNeutralForeground1, textAlign: "center"
                  }}
                />
                <Text size={200} style={{ color: tokens.colorNeutralForeground4, fontSize: "11px" }}>page</Text>
              </div>
              {/* Row 2: set start page from cursor position */}
              <Button size="small" appearance="subtle" icon={<DocumentEdit24Regular />}
                title="Set scan start to the page containing the current cursor"
                style={{ alignSelf: "flex-start" }}
                onClick={async () => {
                  const boundaries = await getPageBoundaries();
                  const paraIdx = await getSelectionParagraphIndex();
                  let page = 1;
                  for (let i = 0; i < boundaries.length; i++) {
                    if (paraIdx >= boundaries[i]) page = i + 1;
                    else break;
                  }
                  setPageFrom(page);
                  setScanCaptionData(null); setScanCiteData(null);
                  setScanLayoutData(null); setScanHeadingData(null); setReportData(null);
                }}>
                Set start point
              </Button>
            </div>

            {/* ── Primary action ───────────────────────────── */}
            {selectedTab === "format" ? (
              <Button appearance="primary" icon={<CheckmarkCircle24Regular />} style={{ width: "100%" }}
                onClick={handleFullCheck}
                disabled={isReportLoading || currentProfile?.status === "todo"}>
                {isReportLoading ? <><Spinner size="tiny" />&nbsp; Checking…</> : "Full Check — Submission Readiness"}
              </Button>
            ) : (
              <Button appearance="primary" icon={<Search24Regular />} style={{ width: "100%" }}
                onClick={handleScanCitationsAndCaptions}
                disabled={isLoading || currentProfile?.status === "todo"}>
                {isLoading ? <><Spinner size="tiny" />&nbsp; Scanning…</> : "Scan Citations & Captions"}
              </Button>
            )}

            {/* ── Per-scan progress (format Full Check only) ── */}
            {selectedTab === "format" && scanProgress !== null && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {(["layout", "captions", "citations", "headings", "references"] as const).map(key => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Badge color={scanProgress[key] === "done" ? "success" : "subtle"} size="small">
                      {scanProgress[key] === "done" ? "✓" : "…"}
                    </Badge>
                    <Text size={200} style={{ color: scanProgress[key] === "done" ? tokens.colorPaletteGreenForeground1 : tokens.colorNeutralForeground3 }}>
                      {key}
                    </Text>
                  </div>
                ))}
              </div>
            )}

            {/* ── Individual Scans (format only, collapsible) ── */}
            {selectedTab === "format" && (
              <Accordion collapsible>
                <AccordionItem value="individual-scans">
                  <AccordionHeader>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>Manual Scans</Text>
                  </AccordionHeader>
                  <AccordionPanel>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "4px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <Button appearance="outline" size="small" icon={<CheckmarkCircle24Regular />} style={{ flex: 1 }}
                          onClick={handleScanLayout}
                          disabled={isLayoutLoading || currentProfile?.status === "todo"}>
                          {isLayoutLoading ? <Spinner size="tiny" /> : "Layout"}
                        </Button>
                        <Button appearance="outline" size="small" icon={<Search24Regular />} style={{ flex: 1 }}
                          onClick={async () => {
                            setIsLayoutLoading(true);
                            setScanHeadingData(null);   // clear stale result
                            setReportData(null);        // old Full Check report is now stale
                            const { offset, endOffset } = await resolveParaRange();
                            const result = await scanHeadings(profileId, offset, endOffset);
                            setScanHeadingData(result);
                            setIsLayoutLoading(false);
                          }}
                          disabled={isLayoutLoading || currentProfile?.status === "todo"}>
                          {isLayoutLoading ? <Spinner size="tiny" /> : "Headings"}
                        </Button>
                      </div>
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            )}

            {/* ── Apply All ────────────────────────────────── */}
            {selectedTab === "cite" && ((scanCiteData?.autoFixes.length ?? 0) > 0 || (scanCaptionData?.issues.length ?? 0) > 0) && (
              <Button appearance="outline" icon={<Wand24Regular />}
                onClick={handleApplyAllFixes} disabled={isLoading}>
                Apply All Auto-Fixes
              </Button>
            )}
            {selectedTab === "format" && reportData?.items.some(i => i.status === "fail") && (
              <Button appearance="outline" icon={<Wand24Regular />}
                onClick={handleReportFixAll} disabled={isFixAllLoading || isReportLoading}>
                {isFixAllLoading ? <><Spinner size="tiny" />&nbsp; Applying…</> : "Apply All"}
              </Button>
            )}
            <Divider />
          </div>
        )}

        {/* Submission Report */}
        {selectedTab === "format" && reportData !== null && (() => {
          const { score, items } = reportData;
          const scoreBadgeColor = score.pct === 100 ? "success" : score.pct >= 70 ? "warning" : "danger";
          const statusIcon = (s: CheckItem["status"]) =>
            s === "pass" ? "✅" : s === "fail" ? "❌" : s === "warn" ? "⚠️" : "🔍";
          const autoItems   = items.filter(i => i.status === "pass" || i.status === "fail");
          const warnItems   = items.filter(i => i.status === "warn");
          const manualItems = items.filter(i => i.status === "manual");
          const cats: Array<{ key: CheckItem["category"]; label: string }> = [
            { key: "typography", label: "Typography" },
            { key: "layout",     label: "Layout" },
            { key: "headings",   label: "Headings" },
            { key: "captions",   label: "Captions" },
            { key: "citations",  label: "Citations" },
            { key: "references", label: "References" },
          ];
          // Fix button label — shows issue count for multi-issue items
          const fixLabel = (it: CheckItem) => {
            if (it.id === "content_captions") {
              const n = reportData.rawScans.captions.issues.length;
              return n > 1 ? `Fix All (${n})` : "Fix";
            }
            if (it.id === "content_citations") {
              const n = reportData.rawScans.citations.autoFixes.length;
              return n > 1 ? `Fix All (${n})` : "Fix";
            }
            if (it.id === "typography_headings") {
              const n = reportData.rawScans.headings.issues.length;
              return n > 1 ? `Fix All (${n})` : "Fix";
            }
            return "Fix";
          };

          return (
            <div style={{ marginBottom: "12px" }}>

              {/* ── Manual Action Required — TOP ──────────────── */}
              {manualItems.length > 0 && (
                <div style={{
                  background: tokens.colorNeutralBackground3,
                  borderLeft: `3px solid ${tokens.colorPaletteYellowForeground1}`,
                  borderRadius: "4px",
                  padding: "10px 12px",
                  marginBottom: "12px",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                    <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground1 }}>
                      Action required ({manualItems.length})
                    </Text>
                    <Text size={100} style={{ color: tokens.colorNeutralForeground4, fontStyle: "italic" }}>
                      ⓘ Try Fix works on Word Desktop 16.0+ only · Page setup API not supported in Word Online
                    </Text>
                  </div>
                  {manualItems.map((item, idx) => (
                    <div key={item.id} style={{
                      marginTop: "8px",
                      paddingTop: idx > 0 ? "8px" : "6px",
                      borderTop: idx > 0 ? `1px solid ${tokens.colorNeutralStroke2}` : undefined,
                      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px"
                    }}>
                      <div style={{ flex: 1 }}>
                        <Text size={200} weight="semibold" block style={{ color: tokens.colorNeutralForeground1 }}>
                          {item.label}
                        </Text>
                        {/* Margin target values — read-only, follows profile */}
                        {item.id === "layout_margins" ? (
                          <div style={{ marginTop: "4px" }}>
                            <Text size={200} block style={{ color: tokens.colorBrandForeground1, marginTop: "2px" }}>
                              Set to: T {marginDraft.top}cm · B {marginDraft.bottom}cm · L {marginDraft.left}cm · R {marginDraft.right}cm
                            </Text>
                            <Text size={200} block style={{ color: tokens.colorNeutralForeground4, fontStyle: "italic", marginTop: "2px" }}>
                              Layout → Margins → Custom Margins
                            </Text>
                          </div>
                        ) : (
                          <>
                            {item.expectedValue && (
                              <Text size={200} block style={{ color: tokens.colorBrandForeground1, marginTop: "2px" }}>
                                Set to: {item.expectedValue}
                              </Text>
                            )}
                            {item.autoFixable && item.id === "layout_page_size" && (
                              <Text size={200} block style={{ color: tokens.colorNeutralForeground4, marginTop: "2px", fontStyle: "italic" }}>
                                Layout → Size
                              </Text>
                            )}
                          </>
                        )}
                        {!item.autoFixable && (
                          <Text size={200} block style={{ color: tokens.colorNeutralForeground3, marginTop: "2px" }}>
                            {item.detail}
                          </Text>
                        )}
                      </div>
                      {item.autoFixable && (
                        <Button size="small" appearance="primary" icon={<Wand24Regular />}
                          onClick={() => handleReportFix(item)}
                          disabled={isFixAllLoading || isReportLoading}>
                          Try Fix
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Score header ────────────────────────────── */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Text weight="semibold">Submission Readiness</Text>
                <Badge color={scoreBadgeColor} size="large">{score.pct}%</Badge>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  {score.passed}/{autoItems.length} auto-verified
                  {score.warned > 0 ? ` · ${score.warned} undetected` : ""}
                  {score.manual > 0 ? ` · ${score.manual} manual` : ""}
                </Text>
              </div>

              {/* ── Auto/Warn items by category ──────────────── */}
              {cats.map(({ key, label }) => {
                const catItems = items.filter(i => i.category === key && i.status !== "manual");
                if (catItems.length === 0) return null;
                return (
                  <div key={key} style={{ marginBottom: "6px" }}>
                    <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground2 }}>{label}</Text>
                    {catItems.map(item => (
                      <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "6px", padding: "3px 0" }}>
                        <span style={{ flexShrink: 0, fontSize: "14px" }}>{statusIcon(item.status)}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
                            <Text size={200} weight="semibold">{item.label}</Text>
                            {item.status === "fail" && item.autoFixable && (
                              <Button size="small" appearance="primary" icon={<Wand24Regular />}
                                onClick={() => handleReportFix(item)}
                                disabled={isFixAllLoading || isReportLoading}>
                                {fixLabel(item)}
                              </Button>
                            )}
                          </div>
                          {item.currentValue && item.status !== "pass" && (
                            <Text size={200} block style={{ color: tokens.colorPaletteRedForeground1 }}>
                              Current: {item.currentValue}
                            </Text>
                          )}
                          {item.expectedValue && item.status !== "pass" && (
                            <Text size={200} block style={{ color: tokens.colorPaletteGreenForeground1 }}>
                              Expected: {item.expectedValue}
                            </Text>
                          )}
                          {item.status === "pass" && (
                            <Text size={200} block style={{ color: tokens.colorNeutralForeground3 }}>{item.detail}</Text>
                          )}
                          {item.status === "warn" && (
                            <Text size={200} block style={{ color: tokens.colorPaletteYellowForeground1 }}>{item.detail}</Text>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              <Text size={100} style={{ color: tokens.colorNeutralForeground3, display: "block", marginTop: "6px" }}>
                Generated: {reportData.generatedAt}
              </Text>

              <Accordion collapsible style={{ marginTop: "4px" }}>
                <AccordionItem value="report-log">
                  <AccordionHeader>Scan logs</AccordionHeader>
                  <AccordionPanel>
                    <div className={styles.logBox}>
                      {reportData.scanLogs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
              <Divider style={{ margin: "8px 0" }} />
            </div>
          );
        })()}

        {/* Results */}
        {selectedTab === "format" && scanLayoutData !== null && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Text weight="semibold">Layout Check</Text>
              {scanLayoutData.issues.length === 0
                ? <Badge color="success">All OK</Badge>
                : <Badge color="danger">{scanLayoutData.issues.length} issue{scanLayoutData.issues.length > 1 ? "s" : ""}</Badge>}
            </div>
            {scanLayoutData.issues.length === 0 ? (
              <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1 }}>
                Page layout matches {currentProfile?.name} requirements.
              </Text>
            ) : (
              scanLayoutData.issues.map((issue) => (
                <div key={issue.id} className={styles.issueItem}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Badge color="warning">
                      {issue.field.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </Badge>
                    {(issue.field === "body_font" || issue.field === "body_size" || issue.field === "line_spacing"
                      || issue.field.startsWith("margin_") || issue.field === "page_size") && (
                      <Button size="small" appearance="primary" icon={<Wand24Regular />}
                        onClick={() => handleFixLayout(issue)}
                        disabled={isLayoutLoading}>
                        Fix
                      </Button>
                    )}
                  </div>
                  <Text size={200} block style={{ marginTop: "4px" }}>{issue.message}</Text>
                  <Text size={200} block style={{ color: tokens.colorPaletteGreenForeground1, marginTop: "2px" }}>
                    Expected: {issue.expectedValue}
                  </Text>
                </div>
              ))
            )}
            <Accordion collapsible>
              <AccordionItem value="layout-log">
                <AccordionHeader>Detected values</AccordionHeader>
                <AccordionPanel>
                  <div className={styles.logBox}>
                    {scanLayoutData.logs.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
            <Divider style={{ margin: "8px 0" }} />
          </div>
        )}

        {selectedTab === "format" && scanHeadingData !== null && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Text weight="semibold">Heading Check</Text>
              {scanHeadingData.issues.length === 0
                ? <Badge color="success">All OK</Badge>
                : <Badge color="danger">{scanHeadingData.issues.length} issue{scanHeadingData.issues.length > 1 ? "s" : ""}</Badge>}
            </div>
            {scanHeadingData.stats.candidatesFound === 0 ? (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                No heading-styled paragraphs found. Apply "Heading 1/2/3" styles to section titles.
              </Text>
            ) : scanHeadingData.issues.length === 0 ? (
              <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1 }}>
                {scanHeadingData.stats.candidatesFound} heading(s) checked — all match {currentProfile?.name} spec.
              </Text>
            ) : (
              scanHeadingData.issues.map((issue) => (
                <div key={issue.id} className={styles.issueItem}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Badge color="warning">H{issue.level} {issue.field}</Badge>
                    <Button size="small" appearance="primary" icon={<Wand24Regular />}
                      onClick={async () => {
                        setIsLayoutLoading(true);
                        await fixHeadingIssue(issue, profileId);
                        const result = await scanHeadings(profileId);
                        setScanHeadingData(result);
                        setIsLayoutLoading(false);
                      }}
                      disabled={isLayoutLoading}>
                      Fix
                    </Button>
                  </div>
                  <Text size={200} block style={{ marginTop: "4px" }}>"{issue.text}"</Text>
                  <Text size={200} block style={{ color: tokens.colorPaletteRedForeground1 }}>{issue.message}</Text>
                  <Text size={200} block style={{ color: tokens.colorPaletteGreenForeground1 }}>Expected: {issue.expectedValue}</Text>
                </div>
              ))
            )}
            <Accordion collapsible>
              <AccordionItem value="heading-log">
                <AccordionHeader>Detected headings</AccordionHeader>
                <AccordionPanel>
                  <div className={styles.logBox}>
                    {scanHeadingData.logs.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
            <Divider style={{ margin: "8px 0" }} />
          </div>
        )}

        {/* Cite tab: loading status indicator */}
        {selectedTab === "cite" && isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 0", color: tokens.colorNeutralForeground3 }}>
            <Spinner size="small" />
            <Text size={200}>Scanning paragraphs…</Text>
          </div>
        )}

        {selectedTab === "cite" && !isLoading && scanCaptionData && (
            <div style={{ display: "flex", flexDirection: "column" }}>
                {scanCaptionData.issues.length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 0" }}>
                    <Badge color="success">✓</Badge>
                    <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1 }}>
                      All captions valid — {scanCaptionData.stats?.candidatesFound ?? "?"} detected, 0 issues
                    </Text>
                  </div>
                ) : (
                  scanCaptionData.issues.map((issue) => (
                    <div key={issue.id} className={styles.issueItem}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <Badge color="danger">Caption</Badge>
                            <Button size="small" icon={<ChevronRight24Regular />} appearance="subtle" onClick={() => selectIssueInDoc(issue.paragraphIndex, issue.text)}>Go to</Button>
                        </div>
                        <Text block style={{marginTop: "8px"}}>{issue.text}</Text>
                        <Text size={200} block style={{color: tokens.colorPaletteRedForeground1, marginTop: "4px"}}>⚠️ {issue.message}</Text>
                        <Text size={200} block style={{color: tokens.colorPaletteGreenForeground1, marginTop: "2px"}}>➜ {issue.suggestion}</Text>
                        <Button className={styles.fixBtn} appearance="primary" size="small" icon={<Wand24Regular />} onClick={() => handleApplySingleFix(issue)}>Fix Caption</Button>
                    </div>
                  ))
                )}
            </div>
        )}

        {selectedTab === "cite" && !isLoading && scanCiteData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Summary */}
                {scanCiteData.autoFixes.length === 0 && scanCiteData.aiCandidates.length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 0" }}>
                    <Badge color="success">✓</Badge>
                    <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1 }}>
                      No citation issues found — {scanCiteData.stats?.totalParagraphs ?? "?"} paragraphs scanned
                    </Text>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
                    <Text size={300} weight="semibold">
                      {scanCiteData.autoFixes.length} auto-fix{scanCiteData.autoFixes.length !== 1 ? "es" : ""}, {scanCiteData.aiCandidates.length} AI candidate{scanCiteData.aiCandidates.length !== 1 ? "s" : ""}
                    </Text>
                  </div>
                )}

                {/* Auto-Fixes Section */}
                {scanCiteData.autoFixes.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Badge color="warning">Auto-Fix</Badge>
                      <Text size={200} weight="semibold">{scanCiteData.autoFixes.length} certain violation{scanCiteData.autoFixes.length !== 1 ? "s" : ""}</Text>
                    </div>
                    {scanCiteData.autoFixes.map((issue) => (
                      <div key={issue.id} className={styles.issueItem}>
                        <Text block style={{ fontSize: "12px", color: tokens.colorNeutralForeground3 }}>Para {issue.paragraphIndex}</Text>
                        <Text block style={{ marginTop: "4px", fontFamily: "monospace" }}>{issue.text}</Text>
                        <Text block style={{ marginTop: "4px", fontSize: "12px" }}>{issue.message}</Text>
                        <Button className={styles.fixBtn} appearance="primary" size="small" icon={<Wand24Regular />} onClick={() => handleApplySingleFix(issue)}>
                          Fix → {issue.suggestion}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

            </div>
        )}

        {selectedTab === "term" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Textarea className={styles.textArea} value={selection} onChange={(_, d) => setSelection(d.value)} />
                <Button appearance="primary" size="large" icon={<Sparkle24Filled />} onClick={async () => {
                    setIsLoading(true);
                    try {
                      // Send full paragraph as context so LLM understands usage, not just the selected word
                      const paragraphCtx = await getParagraphContext();
                      const res = await fetchWithTimeout(`${API_BASE_URL}/analyze/term`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ term: selection, context: paragraphCtx || selection, profileId })
                      });

                      if (!res.ok) {
                        const errorData = await res.json();
                        throw new Error(errorData.error || `Server error: ${res.status}`);
                      }

                      setAnalysisResult(await res.json());
                    } catch (e: any) {
                      console.error("Manual term analysis error:", e);
                      setAnalysisResult({
                        isInformal: false,
                        suggestions: [],
                        reason: e.message || "Failed to analyze term. Please check your network connection and try again."
                      });
                    }
                    setIsLoading(false);
                }} disabled={!selection || isLoading}>
                  {isLoading ? <><Spinner size="tiny" />&nbsp;Analyzing…</> : "Analyze Term with AI"}
                </Button>
                {analysisResult && !isLoading && (
                    <Card className={styles.resultCard}>
                        {(analysisResult.suggestions?.length ?? 0) > 0
                          ? <Badge color="warning">Informal</Badge>
                          : <Badge color="success">Formal ✓</Badge>
                        }
                        <Text size={300} block style={{marginTop: "8px"}}>{analysisResult.reason}</Text>
                        {analysisResult.suggestions?.map((s: string, i: number) => (
                            <Button key={i} className={styles.suggestionBtn} appearance="outline" onClick={() => replaceSelection(s)}>⚡ {s}</Button>
                        ))}
                    </Card>
                )}
            </div>
        )}

        {/* ── Review tab ──────────────────────────────────────── */}
        {selectedTab === "review" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Button appearance="primary" icon={<Search24Regular />} style={{ width: "100%" }}
              onClick={handleScanStructure}
              disabled={isStructureLoading}>
              {isStructureLoading ? <><Spinner size="tiny" />&nbsp; Scanning…</> : "Scan Document Structure"}
            </Button>

            <Divider style={{ margin: "8px 0" }} />

            {/* Comparative Samples (Optional) */}
            <Button
              appearance="subtle"
              size="small"
              onClick={() => setShowSampleInput(!showSampleInput)}
              style={{ width: "100%", marginBottom: "8px" }}>
              {showSampleInput ? "▼" : "▶"} Optional: Add Comparison Samples
            </Button>

            {showSampleInput && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
                <div>
                  <Text size={200} weight="semibold" block style={{ marginBottom: "4px" }}>
                    Accepted Papers (paste abstracts, separate with blank lines)
                  </Text>
                  <Textarea
                    placeholder="Paste 1-3 accepted paper abstracts here...&#10;&#10;[Leave blank line between samples]"
                    value={acceptedSamples}
                    onChange={(_, d) => setAcceptedSamples(d.value)}
                    rows={3}
                    style={{ width: "100%", fontSize: "11px" }}
                  />
                </div>
                <div>
                  <Text size={200} weight="semibold" block style={{ marginBottom: "4px" }}>
                    Rejected Papers (optional)
                  </Text>
                  <Textarea
                    placeholder="Paste rejected paper abstracts here..."
                    value={rejectedSamples}
                    onChange={(_, d) => setRejectedSamples(d.value)}
                    rows={2}
                    style={{ width: "100%", fontSize: "11px" }}
                  />
                </div>
              </div>
            )}

            <Button appearance="primary" icon={<Sparkle24Filled />} style={{ width: "100%", background: tokens.colorPalettePurpleBackground2 }}
              onClick={handleReviewPaper}
              disabled={isReviewLoading || currentProfile?.status === "todo"}>
              {isReviewLoading ? <><Spinner size="tiny" />&nbsp; Reviewing… (1-2 min)</> : "Review Paper for Submission"}
            </Button>
            <Text size={100} style={{ color: tokens.colorNeutralForeground3, marginTop: "-4px" }}>
              AI-powered 3-reviewer simulation (~$0.10)
            </Text>

            {isStructureLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0" }}>
                <Spinner size="small" />
                <Text size={200}>Checking paragraphs…</Text>
              </div>
            )}

            {!isStructureLoading && scanStructureData && (
              scanStructureData.issues.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 0" }}>
                  <Badge color="success">✓</Badge>
                  <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1 }}>
                    No structural issues found
                  </Text>
                </div>
              ) : (() => {
                const ruleLabel: Record<StructureIssue["rule"], string> = {
                  blank_paragraphs: "Blank lines",
                  orphaned_list_item: "Orphaned item",
                  heading_level_skip: "Heading skip",
                  empty_section: "Empty section",
                  placeholder_text: "Placeholder",
                  abstract_word_count: "Abstract length",
                  unreferenced_caption: "Figure ref",
                  abbreviation_order: "Abbr. order",
                  duplicate_paragraph: "Duplicate",
                  cited_not_defined: "Orphaned cite",
                  defined_not_cited: "Uncited ref",
                };
                const ruleOrder: StructureIssue["rule"][] = [
                  "blank_paragraphs", "orphaned_list_item", "heading_level_skip", "empty_section",
                  "placeholder_text", "abstract_word_count", "unreferenced_caption", "abbreviation_order", "duplicate_paragraph",
                  "cited_not_defined", "defined_not_cited",
                ];
                const grouped: Partial<Record<StructureIssue["rule"], StructureIssue[]>> = {};
                scanStructureData.issues.forEach((issue) => {
                  if (!grouped[issue.rule]) grouped[issue.rule] = [];
                  grouped[issue.rule]!.push(issue);
                });
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Text size={200} weight="semibold">
                      {scanStructureData.issues.length} issue{scanStructureData.issues.length > 1 ? "s" : ""} in {ruleOrder.filter(r => grouped[r]).length} categor{ruleOrder.filter(r => grouped[r]).length > 1 ? "ies" : "y"}
                    </Text>
                    {ruleOrder.filter(r => grouped[r]).map(rule => {
                      const issues = grouped[rule]!;
                      return (
                        <div key={rule} style={{
                          background: tokens.colorNeutralBackground3,
                          borderRadius: "6px",
                          padding: "8px 10px",
                          borderLeft: `3px solid ${tokens.colorPaletteYellowBorder1}`,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                            <Badge color="warning" size="small">{ruleLabel[rule]}</Badge>
                            {issues.length > 1 && (
                              <Badge color="subtle" size="small">{issues.length}</Badge>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {issues.map((issue, idx) => (
                              <div key={issue.id} style={{
                                paddingTop: idx > 0 ? "6px" : "0",
                                borderTop: idx > 0 ? `1px solid ${tokens.colorNeutralBackground4}` : "none",
                              }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
                                  <Text size={200} block style={{ color: tokens.colorNeutralForeground1, flex: 1 }}>
                                    {issue.message}
                                  </Text>
                                  {issue.paragraphIndex >= 0 && (
                                    <Button size="small" appearance="subtle" icon={<Search24Regular />}
                                      style={{ flexShrink: 0 }}
                                      onClick={() => selectIssueInDoc(issue.paragraphIndex, issue.text)}>
                                      Go
                                    </Button>
                                  )}
                                </div>
                                {issue.text && issue.rule !== "blank_paragraphs" && (
                                  <Text size={100} block style={{ color: tokens.colorNeutralForeground3, marginTop: "2px", fontStyle: "italic" }}>
                                    "{issue.text.slice(0, 60)}{issue.text.length > 60 ? "…" : ""}"
                                  </Text>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}

            {!isStructureLoading && !scanStructureData && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "4px 0" }}>
                <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground2 }}>
                  What this scan checks:
                </Text>
                {([
                  { rule: "blank_paragraphs",    label: "Blank lines",      desc: "3+ consecutive blank paragraphs" },
                  { rule: "orphaned_list_item",   label: "Orphaned item",    desc: "Numbered item without surrounding list" },
                  { rule: "heading_level_skip",   label: "Heading skip",     desc: "H1 → H3 with no H2 in between" },
                  { rule: "empty_section",        label: "Empty section",    desc: "Heading immediately followed by next heading" },
                  { rule: "placeholder_text",     label: "Placeholder",      desc: "TODO / TBD / Lorem ipsum left in text" },
                  { rule: "abstract_word_count",  label: "Abstract length",  desc: "Abstract shorter than 100 words" },
                  { rule: "unreferenced_caption", label: "Figure ref",       desc: "Caption with no matching in-text citation" },
                  { rule: "abbreviation_order",   label: "Abbr. order",      desc: "Abbreviation used before it is defined" },
                  { rule: "duplicate_paragraph",  label: "Duplicate",        desc: "Same paragraph repeated verbatim (≥40 chars)" },
                  { rule: "cited_not_defined",    label: "Orphaned cite",    desc: "[N] cited in body but no entry in References" },
                  { rule: "defined_not_cited",    label: "Uncited ref",      desc: "Reference entry listed but never cited in body" },
                ] as const).map(({ rule, label, desc }) => (
                  <div key={rule} style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                    <Badge size="small" color="subtle" style={{ flexShrink: 0 }}>{label}</Badge>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>{desc}</Text>
                  </div>
                ))}
              </div>
            )}

            {/* Review Error */}
            {!isReviewLoading && reviewError && (
              <div style={{ padding: "12px", backgroundColor: tokens.colorPaletteRedBackground2, borderRadius: "4px", marginTop: "8px" }}>
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  ❌ {reviewError}
                </Text>
              </div>
            )}

            {/* Review Paper Results */}
            {!isReviewLoading && reviewData && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                <Divider />

                {/* Overall Score */}
                <div style={{
                  background: tokens.colorNeutralBackground3,
                  borderRadius: "8px",
                  padding: "12px",
                  borderLeft: `4px solid ${
                    reviewData.overallScore >= 8 ? tokens.colorPaletteGreenBorder1 :
                    reviewData.overallScore >= 6 ? tokens.colorPaletteYellowBorder1 :
                    tokens.colorPaletteRedBorder1
                  }`
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <Text size={400} weight="bold" block>
                        Overall Score: {reviewData.overallScore.toFixed(1)}/10
                      </Text>
                      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                        {reviewData.recommendation.replace(/_/g, " ").toUpperCase()}
                      </Text>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Text size={500} weight="bold" style={{
                        color: reviewData.acceptProbability >= 70 ? tokens.colorPaletteGreenForeground1 :
                               reviewData.acceptProbability >= 50 ? tokens.colorPaletteYellowForeground1 :
                               tokens.colorPaletteRedForeground1
                      }}>
                        {reviewData.acceptProbability}%
                      </Text>
                      <Text size={100} block style={{ color: tokens.colorNeutralForeground3 }}>
                        Accept prob.
                      </Text>
                    </div>
                  </div>
                </div>

                {/* Reviewer Scores */}
                <Text size={300} weight="semibold">Reviewer Scores</Text>
                {reviewData.reviewerScores.map((reviewer, idx) => (
                  <div key={idx} style={{
                    background: tokens.colorNeutralBackground1Hover,
                    borderRadius: "6px",
                    padding: "10px",
                    borderLeft: `3px solid ${
                      reviewer.score >= 8 ? tokens.colorPaletteGreenBorder1 :
                      reviewer.score >= 6 ? tokens.colorPaletteYellowBorder1 :
                      tokens.colorPaletteRedBorder1
                    }`
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                      <Badge color="brand" size="small">{reviewer.persona}</Badge>
                      <Badge color="subtle" size="small">{reviewer.score}/10</Badge>
                    </div>
                    <Text size={200} block style={{ marginBottom: "6px", color: tokens.colorNeutralForeground2 }}>
                      {reviewer.detailedComment}
                    </Text>
                    {reviewer.strengths.length > 0 && (
                      <div style={{ marginBottom: "4px" }}>
                        <Text size={100} weight="semibold" style={{ color: tokens.colorPaletteGreenForeground1 }}>
                          ✓ Strengths:
                        </Text>
                        {reviewer.strengths.map((s, i) => (
                          <Text key={i} size={100} block style={{ color: tokens.colorNeutralForeground3, marginLeft: "8px" }}>
                            • {s}
                          </Text>
                        ))}
                      </div>
                    )}
                    {reviewer.weaknesses.length > 0 && (
                      <div>
                        <Text size={100} weight="semibold" style={{ color: tokens.colorPaletteRedForeground1 }}>
                          ✗ Weaknesses:
                        </Text>
                        {reviewer.weaknesses.map((w, i) => (
                          <Text key={i} size={100} block style={{ color: tokens.colorNeutralForeground3, marginLeft: "8px" }}>
                            • {w}
                          </Text>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Critical Issues */}
                {reviewData.criticalIssues.length > 0 && (
                  <>
                    <Text size={300} weight="semibold" style={{ marginTop: "8px" }}>
                      Critical Issues to Address
                    </Text>
                    {reviewData.criticalIssues.slice(0, 5).map((issue) => (
                      <div key={issue.id} style={{
                        background: tokens.colorNeutralBackground1Hover,
                        borderRadius: "6px",
                        padding: "8px 10px",
                        borderLeft: `3px solid ${
                          issue.severity === "high" ? tokens.colorPaletteRedBorder1 :
                          issue.severity === "medium" ? tokens.colorPaletteYellowBorder1 :
                          tokens.colorNeutralStroke1
                        }`
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          <Badge color={issue.severity === "high" ? "danger" : "warning"} size="small">
                            {issue.severity.toUpperCase()}
                          </Badge>
                          <Badge color="subtle" size="small">{issue.category}</Badge>
                        </div>
                        <Text size={200} block style={{ color: tokens.colorNeutralForeground1 }}>
                          {issue.issue}
                        </Text>
                      </div>
                    ))}
                  </>
                )}

                {/* Comparative Benchmark */}
                {reviewData.comparativeBenchmark && (
                  <>
                    <Divider style={{ margin: "12px 0" }} />
                    <Text size={300} weight="semibold">
                      Comparison with Sample Papers
                    </Text>
                    <div style={{
                      background: tokens.colorNeutralBackground3,
                      borderRadius: "8px",
                      padding: "12px",
                      borderLeft: `4px solid ${tokens.colorNeutralStroke1}`
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div>
                          <Text size={200} weight="semibold" block>Novelty Assessment</Text>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              Your paper: {reviewData.comparativeBenchmark.yourNoveltyScore.toFixed(1)}/10
                            </Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>•</Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              Accepted avg: {reviewData.comparativeBenchmark.acceptedAvgNovelty.toFixed(1)}/10
                            </Text>
                          </div>
                        </div>
                        <div>
                          <Text size={200} weight="semibold" block>Rigor Assessment</Text>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              Your paper: {reviewData.comparativeBenchmark.yourRigorScore.toFixed(1)}/10
                            </Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>•</Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              Accepted avg: {reviewData.comparativeBenchmark.acceptedAvgRigor.toFixed(1)}/10
                            </Text>
                          </div>
                        </div>
                        {reviewData.comparativeBenchmark.keyGaps && reviewData.comparativeBenchmark.keyGaps.length > 0 && (
                          <div style={{ marginTop: "4px" }}>
                            <Text size={200} weight="semibold" block style={{ color: tokens.colorPaletteRedForeground1 }}>
                              Key Gaps vs Accepted Papers:
                            </Text>
                            {reviewData.comparativeBenchmark.keyGaps.map((gap, i) => (
                              <Text key={i} size={100} block style={{ color: tokens.colorNeutralForeground3, marginLeft: "8px", marginTop: "2px" }}>
                                • {gap}
                              </Text>
                            ))}
                          </div>
                        )}
                        {reviewData.comparativeBenchmark.strengths && reviewData.comparativeBenchmark.strengths.length > 0 && (
                          <div style={{ marginTop: "4px" }}>
                            <Text size={200} weight="semibold" block style={{ color: tokens.colorPaletteGreenForeground1 }}>
                              Strengths vs Rejected Papers:
                            </Text>
                            {reviewData.comparativeBenchmark.strengths.map((str, i) => (
                              <Text key={i} size={100} block style={{ color: tokens.colorNeutralForeground3, marginLeft: "8px", marginTop: "2px" }}>
                                • {str}
                              </Text>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- v0.5.5: Developer Inspector --- */}
        <div className={styles.devTool}>
            <Accordion collapsible>
                <AccordionItem value="inspector">
                    <AccordionHeader icon={<Code24Regular />}>Dev Tools: Property Inspector</AccordionHeader>
                    <AccordionPanel>
                        <Button appearance="subtle" onClick={handleInspect} style={{marginBottom: "8px"}}>Inspect Current Selection</Button>
                        {inspectData && (
                            <div className={styles.logBox}>
                                <div><b>Text:</b> {inspectData.textPreview}</div>
                                <div><b>Style:</b> {inspectData.style}</div>
                                <div><b>Font:</b> {inspectData.fontName} ({inspectData.fontSize}pt)</div>
                                <div><b>Align:</b> {inspectData.alignment}</div>
                                <div><b>Bold:</b> {inspectData.isBold ? "Yes" : "No"}</div>
                                <div><b>Italic:</b> {inspectData.isItalic ? "Yes" : "No"}</div>
                            </div>
                        )}
                    </AccordionPanel>
                </AccordionItem>
            </Accordion>
        </div>
      </div>
    </div>
  );
};

export default App;
