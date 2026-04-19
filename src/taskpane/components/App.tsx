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
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 95000): Promise<Response> => {
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

// Translation dictionary
const translations = {
  KOR: {
    // Tab names
    term: "용어",
    cite: "인용",
    format: "서식",
    review: "검토",

    // Common buttons
    fix: "수정",
    fixAll: "모두 수정",
    fixAllN: (n: number) => `모두 수정 (${n})`,
    tryFix: "수정 시도",
    goTo: "이동",
    go: "이동",
    apply: "적용",
    applyAll: "모두 적용",

    // Scan buttons
    scanCitations: "인용 스캔",
    scanCaptions: "캡션 스캔",
    scanCitationsAndCaptions: "인용 및 캡션 스캔",
    scanLayout: "레이아웃 스캔",
    scanHeadings: "제목 스캔",
    scanStructure: "문서 구조 스캔",
    fullCheck: "전체 검사",
    reviewPaper: "논문 검토 (제출용)",

    // Loading states
    checking: "검사 중…",
    scanning: "스캔 중…",
    analyzing: "분석 중…",
    applying: "적용 중…",
    reviewing: "검토 중… (1-2분)",

    // Status badges
    allOk: "정상",
    informal: "비격식",
    formal: "격식 ✓",
    pass: "통과",
    fail: "실패",
    warn: "경고",

    // Page range
    page: "페이지",
    setStartPoint: "시작점 설정",

    // Sections
    manualScans: "수동 스캔",
    layout: "레이아웃",
    layoutCheck: "레이아웃 검사",
    headingCheck: "제목 검사",
    typography: "타이포그래피",
    headings: "제목",
    captions: "캡션",
    citations: "인용",
    references: "참고문헌",
    detectedValues: "감지된 값",
    detectedHeadings: "감지된 제목",
    scanLogs: "스캔 로그",

    // Format tab
    layoutTypography: "레이아웃 및 타이포그래피",
    autoVerified: "자동 검증됨",
    undetected: "미감지",
    manual: "수동",
    actionRequired: (n: number) => `조치 필요 (${n})`,
    actionRequiredNote: "ⓘ 수정 시도는 Word Desktop 16.0+ 에서만 작동 · Word Online에서는 페이지 설정 API 미지원",
    setTo: "설정 값:",
    marginSettings: (t: number, b: number, l: number, r: number) =>
      `설정: 위 ${t}cm · 아래 ${b}cm · 왼쪽 ${l}cm · 오른쪽 ${r}cm`,
    marginPath: "레이아웃 → 여백 → 사용자 지정 여백",
    pageSizePath: "레이아웃 → 크기",
    generated: "생성 시각:",
    current: "현재:",
    expected: "예상:",

    // Caption/Citation results
    allCaptionsValid: (n: number) => `모든 캡션 유효 — ${n}개 감지, 0개 이슈`,
    noCitationIssues: (n: number) => `인용 이슈 없음 — ${n}개 단락 스캔`,
    citationsDetected: (n: number) => `${n}개 인용 감지`,
    citationIssues: (n: number) => `${n}개 형식 이슈`,
    citationSuggestions: (n: number) => `${n}개 스타일 제안`,
    autoFix: "자동 수정",
    certainViolations: (n: number) => `${n}개 확실한 위반사항`,
    fixCaption: "캡션 수정",
    fixCitation: "인용 수정",
    para: "단락",

    // Layout messages
    pageLayoutMatches: (name: string) => `페이지 레이아웃이 ${name} 요구사항과 일치합니다.`,
    nIssues: (n: number) => `${n}개 이슈`,
    nHeadingsChecked: (n: number, name: string) =>
      `${n}개 제목 검사 완료 — 모두 ${name} 규격과 일치`,
    noHeadingStyled: "제목 스타일 단락을 찾을 수 없습니다. 섹션 제목에 '제목 1/2/3' 스타일을 적용하세요.",

    // Term analysis
    analyzeTerm: "AI로 용어 분석",

    // Review tab
    optionalSamples: "선택사항: 비교 샘플 추가",
    acceptedPapers: "승인된 논문 (초록 붙여넣기, 빈 줄로 구분)",
    rejectedPapers: "거부된 논문 (선택사항)",
    acceptedPlaceholder: "승인된 논문 초록 1-3개 붙여넣기...\n\n[샘플 사이에 빈 줄 남기기]",
    rejectedPlaceholder: "거부된 논문 초록 붙여넣기...",
    aiReviewNote: "AI 기반 3명 심사위원 시뮬레이션 (~$0.10)",
    noStructureIssues: "구조적 이슈 없음",
    whatThisScanChecks: "이 스캔이 확인하는 항목:",
    nIssuesInNCategories: (issues: number, cats: number) =>
      `${issues}개 이슈 (${cats}개 카테고리)`,

    // Review results
    overallScore: "전체 점수:",
    acceptProb: "승인 확률",
    reviewerScores: "심사위원 점수",
    criticalIssues: "해결해야 할 중요 이슈",
    comparisonSamples: "샘플 논문과의 비교",
    noveltyAssessment: "참신성 평가",
    rigorAssessment: "엄밀성 평가",
    yourPaper: "귀하의 논문:",
    acceptedAvg: "승인 평균:",
    keyGaps: "승인된 논문 대비 주요 격차:",
    strengthsVsRejected: "거부된 논문 대비 강점:",
    strengths: "강점:",
    weaknesses: "약점:",

    // Developer tools
    devTools: "개발 도구: 속성 검사기",
    inspectSelection: "현재 선택 항목 검사",
    text: "텍스트:",
    style: "스타일:",
    font: "폰트:",
    align: "정렬:",
    bold: "굵게:",
    italic: "기울임:",
    yes: "예",
    no: "아니오",

    // Structure scan rules
    blankParagraphs: "빈 줄",
    blankParagraphsDesc: "연속 3개 이상의 빈 단락",
    orphanedListItem: "고아 항목",
    orphanedListItemDesc: "주변 목록 없는 번호 항목",
    headingLevelSkip: "제목 건너뛰기",
    headingLevelSkipDesc: "H1 → H3 (중간에 H2 없음)",
    emptySection: "빈 섹션",
    emptySectionDesc: "제목 바로 다음에 다른 제목",
    placeholderText: "임시 텍스트",
    placeholderTextDesc: "TODO / TBD / Lorem ipsum 텍스트 남아있음",
    abstractWordCount: "초록 길이",
    abstractWordCountDesc: "초록 100단어 미만",
    unreferencedCaption: "그림 참조",
    unreferencedCaptionDesc: "본문 인용 없는 캡션",
    abbreviationOrder: "약어 순서",
    abbreviationOrderDesc: "정의 전에 사용된 약어",
    duplicateParagraph: "중복",
    duplicateParagraphDesc: "동일 단락 반복 (≥40자)",
    citedNotDefined: "고아 인용",
    citedNotDefinedDesc: "본문에 인용됐으나 참고문헌에 없음",
    definedNotCited: "미인용 참고문헌",
    definedNotCitedDesc: "참고문헌에 있으나 본문에 인용 안됨",

    // Dropdown
    domesticForeign: "국내/외",

    // Errors
    extractionError: "필수 섹션 (초록, 서론, 방법, 결과)을 추출할 수 없습니다. 문서에 명확한 섹션 제목이 있는지 확인하세요.",
  },
  ENG: {
    // Tab names
    term: "Term",
    cite: "Cite",
    format: "Format",
    review: "Review",

    // Common buttons
    fix: "Fix",
    fixAll: "Fix All",
    fixAllN: (n: number) => `Fix All (${n})`,
    tryFix: "Try Fix",
    goTo: "Go to",
    go: "Go",
    apply: "Apply",
    applyAll: "Apply All",

    // Scan buttons
    scanCitations: "Scan Citations",
    scanCaptions: "Scan Captions",
    scanCitationsAndCaptions: "Scan Citations & Captions",
    scanLayout: "Scan Layout",
    scanHeadings: "Scan Headings",
    scanStructure: "Scan Document Structure",
    fullCheck: "Full Check",
    reviewPaper: "Review Paper for Submission",

    // Loading states
    checking: "Checking…",
    scanning: "Scanning…",
    analyzing: "Analyzing…",
    applying: "Applying…",
    reviewing: "Reviewing… (1-2 min)",

    // Status badges
    allOk: "All OK",
    informal: "Informal",
    formal: "Formal ✓",
    pass: "Pass",
    fail: "Fail",
    warn: "Warn",

    // Page range
    page: "page",
    setStartPoint: "Set start point",

    // Sections
    manualScans: "Manual Scans",
    layout: "Layout",
    layoutCheck: "Layout Check",
    headingCheck: "Heading Check",
    typography: "Typography",
    headings: "Headings",
    captions: "Captions",
    citations: "Citations",
    references: "References",
    detectedValues: "Detected values",
    detectedHeadings: "Detected headings",
    scanLogs: "Scan logs",

    // Format tab
    layoutTypography: "Layout & Typography",
    autoVerified: "auto-verified",
    undetected: "undetected",
    manual: "manual",
    actionRequired: (n: number) => `Action required (${n})`,
    actionRequiredNote: "ⓘ Try Fix works on Word Desktop 16.0+ only · Page setup API not supported in Word Online",
    setTo: "Set to:",
    marginSettings: (t: number, b: number, l: number, r: number) =>
      `Set to: T ${t}cm · B ${b}cm · L ${l}cm · R ${r}cm`,
    marginPath: "Layout → Margins → Custom Margins",
    pageSizePath: "Layout → Size",
    generated: "Generated:",
    current: "Current:",
    expected: "Expected:",

    // Caption/Citation results
    allCaptionsValid: (n: number) => `All captions valid — ${n} detected, 0 issues`,
    noCitationIssues: (n: number) => `No citation issues found — ${n} paragraphs scanned`,
    citationsDetected: (n: number) => `${n} citation${n !== 1 ? "s" : ""} detected`,
    citationIssues: (n: number) => `${n} format issue${n !== 1 ? "s" : ""}`,
    citationSuggestions: (n: number) => `${n} style suggestion${n !== 1 ? "s" : ""}`,
    autoFix: "Auto-Fix",
    certainViolations: (n: number) => `${n} certain violation${n !== 1 ? "s" : ""}`,
    fixCaption: "Fix Caption",
    fixCitation: "Fix Citation",
    para: "Para",

    // Layout messages
    pageLayoutMatches: (name: string) => `Page layout matches ${name} requirements.`,
    nIssues: (n: number) => `${n} issue${n > 1 ? "s" : ""}`,
    nHeadingsChecked: (n: number, name: string) =>
      `${n} heading(s) checked — all match ${name} spec.`,
    noHeadingStyled: "No heading-styled paragraphs found. Apply 'Heading 1/2/3' styles to section titles.",

    // Term analysis
    analyzeTerm: "Analyze Term with AI",

    // Review tab
    optionalSamples: "Optional: Add Comparison Samples",
    acceptedPapers: "Accepted Papers (paste abstracts, separate with blank lines)",
    rejectedPapers: "Rejected Papers (optional)",
    acceptedPlaceholder: "Paste 1-3 accepted paper abstracts here...\n\n[Leave blank line between samples]",
    rejectedPlaceholder: "Paste rejected paper abstracts here...",
    aiReviewNote: "AI-powered 3-reviewer simulation (~$0.10)",
    noStructureIssues: "No structural issues found",
    whatThisScanChecks: "What this scan checks:",
    nIssuesInNCategories: (issues: number, cats: number) =>
      `${issues} issue${issues > 1 ? "s" : ""} in ${cats} categor${cats > 1 ? "ies" : "y"}`,

    // Review results
    overallScore: "Overall Score:",
    acceptProb: "Accept prob.",
    reviewerScores: "Reviewer Scores",
    criticalIssues: "Critical Issues to Address",
    comparisonSamples: "Comparison with Sample Papers",
    noveltyAssessment: "Novelty Assessment",
    rigorAssessment: "Rigor Assessment",
    yourPaper: "Your paper:",
    acceptedAvg: "Accepted avg:",
    keyGaps: "Key Gaps vs Accepted Papers:",
    strengthsVsRejected: "Strengths vs Rejected Papers:",
    strengths: "✓ Strengths:",
    weaknesses: "✗ Weaknesses:",

    // Developer tools
    devTools: "Dev Tools: Property Inspector",
    inspectSelection: "Inspect Current Selection",
    text: "Text:",
    style: "Style:",
    font: "Font:",
    align: "Align:",
    bold: "Bold:",
    italic: "Italic:",
    yes: "Yes",
    no: "No",

    // Structure scan rules
    blankParagraphs: "Blank lines",
    blankParagraphsDesc: "3+ consecutive blank paragraphs",
    orphanedListItem: "Orphaned item",
    orphanedListItemDesc: "Numbered item without surrounding list",
    headingLevelSkip: "Heading skip",
    headingLevelSkipDesc: "H1 → H3 with no H2 in between",
    emptySection: "Empty section",
    emptySectionDesc: "Heading immediately followed by next heading",
    placeholderText: "Placeholder",
    placeholderTextDesc: "TODO / TBD / Lorem ipsum left in text",
    abstractWordCount: "Abstract length",
    abstractWordCountDesc: "Abstract shorter than 100 words",
    unreferencedCaption: "Figure ref",
    unreferencedCaptionDesc: "Caption with no matching in-text citation",
    abbreviationOrder: "Abbr. order",
    abbreviationOrderDesc: "Abbreviation used before it is defined",
    duplicateParagraph: "Duplicate",
    duplicateParagraphDesc: "Same paragraph repeated verbatim (≥40 chars)",
    citedNotDefined: "Orphaned cite",
    citedNotDefinedDesc: "[N] cited in body but no entry in References",
    definedNotCited: "Uncited ref",
    definedNotCitedDesc: "Reference entry listed but never cited in body",

    // Dropdown
    domesticForeign: "Domestic/Foreign",

    // Errors
    extractionError: "Could not extract required sections (Abstract, Introduction, Method, Results). Please ensure your document has clear section headings.",
  }
};

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
  const t = translations[language]; // Translation helper
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
        setReviewError(t.extractionError);
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
    try {
      await fixLayoutIssue(issue, profileId);
      const result = await scanLayout(profileId);
      setScanLayoutData(result);
    } catch (e: any) {
      console.error("Fix layout error:", e);
      alert(e.message || "Failed to fix layout. This feature requires Word Desktop.");
    }
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
    try {
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
    } catch (e: any) {
      console.error("Apply report item fix error:", e);
      // Show user-friendly error for layout fixes that fail on Word Online
      if (item.id.includes("layout_") || item.id.includes("margin") || item.id.includes("page_size") || item.id.includes("typo_")) {
        alert(e.message || "Layout fixes require Word Desktop. Please open this document in Word Desktop (2016+) to apply margins and page size changes.");
      } else {
        alert(e.message || "Failed to apply fix. Please try again.");
      }
      throw e; // Re-throw so caller knows the fix failed
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
          <Tab value="term">{t.term}</Tab>
          <Tab value="cite">{t.cite}</Tab>
          <Tab value="format">{t.format}</Tab>
          <Tab value="review">{t.review}</Tab>
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
                <Dropdown value={subTypes?.find((s: any) => s.id === subTypeId)?.labelKo || t.domesticForeign} onOptionSelect={(_, d) => {
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
                  {t.page}
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
                <Text size={200} style={{ color: tokens.colorNeutralForeground4, fontSize: "11px" }}>{t.page}</Text>
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
                {t.setStartPoint}
              </Button>
            </div>

            {/* ── Primary action ───────────────────────────── */}
            {selectedTab === "format" ? (
              <Button appearance="primary" icon={<CheckmarkCircle24Regular />} style={{ width: "100%" }}
                onClick={handleScanLayout}
                disabled={isLayoutLoading || currentProfile?.status === "todo"}>
                {isLayoutLoading ? <><Spinner size="tiny" />&nbsp; {t.scanning}</> : t.scanLayout}
              </Button>
            ) : (
              <Button appearance="primary" icon={<Search24Regular />} style={{ width: "100%" }}
                onClick={handleScanCitationsAndCaptions}
                disabled={isLoading || currentProfile?.status === "todo"}>
                {isLoading ? <><Spinner size="tiny" />&nbsp; {t.scanning}</> : t.scanCitationsAndCaptions}
              </Button>
            )}


            {/* ── Individual Scans (format only, collapsible) ── */}
            {selectedTab === "format" && (
              <Accordion collapsible>
                <AccordionItem value="individual-scans">
                  <AccordionHeader>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>{t.manualScans}</Text>
                  </AccordionHeader>
                  <AccordionPanel>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "4px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <Button appearance="outline" size="small" icon={<CheckmarkCircle24Regular />} style={{ flex: 1 }}
                          onClick={handleScanLayout}
                          disabled={isLayoutLoading || currentProfile?.status === "todo"}>
                          {isLayoutLoading ? <Spinner size="tiny" /> : t.layout}
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
                          {isLayoutLoading ? <Spinner size="tiny" /> : t.headings}
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
                {t.applyAll}
              </Button>
            )}
            {selectedTab === "format" && reportData?.items.some(i => i.status === "fail") && (
              <Button appearance="outline" icon={<Wand24Regular />}
                onClick={handleReportFixAll} disabled={isFixAllLoading || isReportLoading}>
                {isFixAllLoading ? <><Spinner size="tiny" />&nbsp; {t.applying}</> : t.applyAll}
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
            { key: "typography", label: t.typography },
            { key: "layout",     label: t.layout },
            { key: "headings",   label: t.headings },
            { key: "captions",   label: t.captions },
            { key: "citations",  label: t.citations },
            { key: "references", label: t.references },
          ];
          // Fix button label — shows issue count for multi-issue items
          const fixLabel = (it: CheckItem) => {
            if (it.id === "content_captions") {
              const n = reportData.rawScans.captions.issues.length;
              return n > 1 ? t.fixAllN(n) : t.fix;
            }
            if (it.id === "content_citations") {
              const n = reportData.rawScans.citations.autoFixes.length;
              return n > 1 ? t.fixAllN(n) : t.fix;
            }
            if (it.id === "typography_headings") {
              const n = reportData.rawScans.headings.issues.length;
              return n > 1 ? t.fixAllN(n) : t.fix;
            }
            return t.fix;
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
                      {t.actionRequired(manualItems.length)}
                    </Text>
                    <Text size={100} style={{ color: tokens.colorNeutralForeground4, fontStyle: "italic" }}>
                      {t.actionRequiredNote}
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
                              {t.marginSettings(marginDraft.top, marginDraft.bottom, marginDraft.left, marginDraft.right)}
                            </Text>
                            <Text size={200} block style={{ color: tokens.colorNeutralForeground4, fontStyle: "italic", marginTop: "2px" }}>
                              {t.marginPath}
                            </Text>
                          </div>
                        ) : (
                          <>
                            {item.expectedValue && (
                              <Text size={200} block style={{ color: tokens.colorBrandForeground1, marginTop: "2px" }}>
                                {t.setTo} {item.expectedValue}
                              </Text>
                            )}
                            {item.autoFixable && item.id === "layout_page_size" && (
                              <Text size={200} block style={{ color: tokens.colorNeutralForeground4, marginTop: "2px", fontStyle: "italic" }}>
                                {t.pageSizePath}
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
                          {t.tryFix}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Score header ────────────────────────────── */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Text weight="semibold">{language === "KOR" ? "검사 결과" : "Check Results"}</Text>
                <Badge color={scoreBadgeColor} size="large">{score.pct}%</Badge>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  {score.passed}/{autoItems.length} {t.autoVerified}
                  {score.warned > 0 ? ` · ${score.warned} ${t.undetected}` : ""}
                  {score.manual > 0 ? ` · ${score.manual} ${t.manual}` : ""}
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
                              {t.current} {item.currentValue}
                            </Text>
                          )}
                          {item.expectedValue && item.status !== "pass" && (
                            <Text size={200} block style={{ color: tokens.colorPaletteGreenForeground1 }}>
                              {t.expected} {item.expectedValue}
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
                {t.generated} {reportData.generatedAt}
              </Text>

              <Accordion collapsible style={{ marginTop: "4px" }}>
                <AccordionItem value="report-log">
                  <AccordionHeader>{t.scanLogs}</AccordionHeader>
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
              <Text weight="semibold">{t.layoutCheck}</Text>
              {scanLayoutData.issues.length === 0
                ? <Badge color="success">{t.allOk}</Badge>
                : <Badge color="danger">{t.nIssues(scanLayoutData.issues.length)}</Badge>}
            </div>
            {scanLayoutData.issues.length === 0 ? (
              <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1 }}>
                {t.pageLayoutMatches(currentProfile?.name || "")}
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
                        {t.fix}
                      </Button>
                    )}
                  </div>
                  <Text size={200} block style={{ marginTop: "4px" }}>{issue.message}</Text>
                  <Text size={200} block style={{ color: tokens.colorPaletteGreenForeground1, marginTop: "2px" }}>
                    {t.expected} {issue.expectedValue}
                  </Text>
                </div>
              ))
            )}
            <Accordion collapsible>
              <AccordionItem value="layout-log">
                <AccordionHeader>{t.detectedValues}</AccordionHeader>
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
              <Text weight="semibold">{t.headingCheck}</Text>
              {scanHeadingData.issues.length === 0
                ? <Badge color="success">{t.allOk}</Badge>
                : <Badge color="danger">{t.nIssues(scanHeadingData.issues.length)}</Badge>}
            </div>
            {scanHeadingData.stats.candidatesFound === 0 ? (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {t.noHeadingStyled}
              </Text>
            ) : scanHeadingData.issues.length === 0 ? (
              <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1 }}>
                {t.nHeadingsChecked(scanHeadingData.stats.candidatesFound, currentProfile?.name || "")}
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
                      {t.fix}
                    </Button>
                  </div>
                  <Text size={200} block style={{ marginTop: "4px" }}>"{issue.text}"</Text>
                  <Text size={200} block style={{ color: tokens.colorPaletteRedForeground1 }}>{issue.message}</Text>
                  <Text size={200} block style={{ color: tokens.colorPaletteGreenForeground1 }}>{t.expected} {issue.expectedValue}</Text>
                </div>
              ))
            )}
            <Accordion collapsible>
              <AccordionItem value="heading-log">
                <AccordionHeader>{t.detectedHeadings}</AccordionHeader>
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
            <Text size={200}>{t.scanning}</Text>
          </div>
        )}

        {selectedTab === "cite" && !isLoading && scanCaptionData && (
            <div style={{ display: "flex", flexDirection: "column" }}>
                {scanCaptionData.issues.length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 0" }}>
                    <Badge color="success">✓</Badge>
                    <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1 }}>
                      {t.allCaptionsValid(scanCaptionData.stats?.candidatesFound ?? 0)}
                    </Text>
                  </div>
                ) : (
                  scanCaptionData.issues.map((issue) => (
                    <div key={issue.id} className={styles.issueItem}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <Badge color="danger">{t.captions}</Badge>
                            <Button size="small" icon={<ChevronRight24Regular />} appearance="subtle" onClick={() => selectIssueInDoc(issue.paragraphIndex, issue.text)}>{t.goTo}</Button>
                        </div>
                        <Text block style={{marginTop: "8px"}}>{issue.text}</Text>
                        <Text size={200} block style={{color: tokens.colorPaletteRedForeground1, marginTop: "4px"}}>⚠️ {issue.message}</Text>
                        <Text size={200} block style={{color: tokens.colorPaletteGreenForeground1, marginTop: "2px"}}>➜ {issue.suggestion}</Text>
                        <Button className={styles.fixBtn} appearance="primary" size="small" icon={<Wand24Regular />} onClick={() => handleApplySingleFix(issue)}>{t.fixCaption}</Button>
                    </div>
                  ))
                )}
            </div>
        )}

        {selectedTab === "cite" && !isLoading && scanCiteData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px 0" }}>
                  <Text size={300} weight="semibold">
                    {t.citationsDetected(scanCiteData.stats?.candidatesFound ?? 0)}
                  </Text>
                  {scanCiteData.autoFixes.length > 0 && (
                    <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                      {t.citationIssues(scanCiteData.autoFixes.length)}
                    </Text>
                  )}
                  {scanCiteData.aiCandidates.length > 0 && (
                    <Text size={200} style={{ color: tokens.colorPaletteBlueForeground2 }}>
                      {t.citationSuggestions(scanCiteData.aiCandidates.length)}
                    </Text>
                  )}
                  {scanCiteData.autoFixes.length === 0 && scanCiteData.aiCandidates.length === 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                      <Badge color="success">✓</Badge>
                      <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1 }}>
                        {language === "KOR" ? "이슈 없음" : "No issues found"}
                      </Text>
                    </div>
                  )}
                </div>

                {/* Auto-Fixes Section */}
                {scanCiteData.autoFixes.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Badge color="warning">{t.autoFix}</Badge>
                      <Text size={200} weight="semibold">{t.certainViolations(scanCiteData.autoFixes.length)}</Text>
                    </div>
                    {scanCiteData.autoFixes.map((issue) => (
                      <div key={issue.id} className={styles.issueItem}>
                        <Text block style={{ fontSize: "12px", color: tokens.colorNeutralForeground3 }}>{t.para} {issue.paragraphIndex}</Text>
                        <Text block style={{ marginTop: "4px", fontFamily: "monospace" }}>{issue.text}</Text>
                        <Text block style={{ marginTop: "4px", fontSize: "12px" }}>{issue.message}</Text>
                        <Button className={styles.fixBtn} appearance="primary" size="small" icon={<Wand24Regular />} onClick={() => handleApplySingleFix(issue)}>
                          {t.fix} → {issue.suggestion}
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
                  {isLoading ? <><Spinner size="tiny" />&nbsp;{t.analyzing}</> : t.analyzeTerm}
                </Button>
                {analysisResult && !isLoading && (
                    <Card className={styles.resultCard}>
                        {(analysisResult.suggestions?.length ?? 0) > 0
                          ? <Badge color="warning">{t.informal}</Badge>
                          : <Badge color="success">{t.formal}</Badge>
                        }
                        <Text size={300} block style={{marginTop: "8px"}}>
                          {analysisResult.reason || (
                            (analysisResult.suggestions?.length ?? 0) > 0
                              ? (language === "KOR"
                                  ? "이 표현은 학술 논문에 부적합할 수 있습니다. 아래 제안된 표현을 고려하세요."
                                  : "This term may be too informal for academic writing. Consider the suggestions below.")
                              : (language === "KOR"
                                  ? "이 표현은 학술 논문에 적합한 공식적인 표현입니다."
                                  : "This term is appropriate for formal academic writing.")
                          )}
                        </Text>
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
              {isStructureLoading ? <><Spinner size="tiny" />&nbsp; {t.scanning}</> : t.scanStructure}
            </Button>

            <Divider style={{ margin: "8px 0" }} />

            {/* Comparative Samples (Optional) */}
            <Button
              appearance="subtle"
              size="small"
              onClick={() => setShowSampleInput(!showSampleInput)}
              style={{ width: "100%", marginBottom: "8px" }}>
              {showSampleInput ? "▼" : "▶"} {t.optionalSamples}
            </Button>

            {showSampleInput && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
                <div>
                  <Text size={200} weight="semibold" block style={{ marginBottom: "4px" }}>
                    {t.acceptedPapers}
                  </Text>
                  <Textarea
                    placeholder={t.acceptedPlaceholder}
                    value={acceptedSamples}
                    onChange={(_, d) => setAcceptedSamples(d.value)}
                    rows={3}
                    style={{ width: "100%", fontSize: "11px" }}
                  />
                </div>
                <div>
                  <Text size={200} weight="semibold" block style={{ marginBottom: "4px" }}>
                    {t.rejectedPapers}
                  </Text>
                  <Textarea
                    placeholder={t.rejectedPlaceholder}
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
              {isReviewLoading ? <><Spinner size="tiny" />&nbsp; {t.reviewing}</> : t.reviewPaper}
            </Button>
            <Text size={100} style={{ color: tokens.colorNeutralForeground3, marginTop: "-4px" }}>
              {t.aiReviewNote}
            </Text>

            {isStructureLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0" }}>
                <Spinner size="small" />
                <Text size={200}>{t.checking}</Text>
              </div>
            )}

            {!isStructureLoading && scanStructureData && (
              scanStructureData.issues.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 0" }}>
                  <Badge color="success">✓</Badge>
                  <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1 }}>
                    {t.noStructureIssues}
                  </Text>
                </div>
              ) : (() => {
                const ruleLabel: Record<StructureIssue["rule"], string> = {
                  blank_paragraphs: t.blankParagraphs,
                  orphaned_list_item: t.orphanedListItem,
                  heading_level_skip: t.headingLevelSkip,
                  empty_section: t.emptySection,
                  placeholder_text: t.placeholderText,
                  abstract_word_count: t.abstractWordCount,
                  unreferenced_caption: t.unreferencedCaption,
                  abbreviation_order: t.abbreviationOrder,
                  duplicate_paragraph: t.duplicateParagraph,
                  cited_not_defined: t.citedNotDefined,
                  defined_not_cited: t.definedNotCited,
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
                      {t.nIssuesInNCategories(scanStructureData.issues.length, ruleOrder.filter(r => grouped[r]).length)}
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
                                      {t.go}
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
                  {t.whatThisScanChecks}
                </Text>
                {([
                  { rule: "blank_paragraphs",    label: t.blankParagraphs,      desc: t.blankParagraphsDesc },
                  { rule: "orphaned_list_item",   label: t.orphanedListItem,    desc: t.orphanedListItemDesc },
                  { rule: "heading_level_skip",   label: t.headingLevelSkip,     desc: t.headingLevelSkipDesc },
                  { rule: "empty_section",        label: t.emptySection,    desc: t.emptySectionDesc },
                  { rule: "placeholder_text",     label: t.placeholderText,      desc: t.placeholderTextDesc },
                  { rule: "abstract_word_count",  label: t.abstractWordCount,  desc: t.abstractWordCountDesc },
                  { rule: "unreferenced_caption", label: t.unreferencedCaption,       desc: t.unreferencedCaptionDesc },
                  { rule: "abbreviation_order",   label: t.abbreviationOrder,      desc: t.abbreviationOrderDesc },
                  { rule: "duplicate_paragraph",  label: t.duplicateParagraph,        desc: t.duplicateParagraphDesc },
                  { rule: "cited_not_defined",    label: t.citedNotDefined,    desc: t.citedNotDefinedDesc },
                  { rule: "defined_not_cited",    label: t.definedNotCited,      desc: t.definedNotCitedDesc },
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
                        {t.overallScore} {reviewData.overallScore.toFixed(1)}/10
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
                        {t.acceptProb}
                      </Text>
                    </div>
                  </div>
                </div>

                {/* Reviewer Scores */}
                <Text size={300} weight="semibold">{t.reviewerScores}</Text>
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
                          {t.strengths}
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
                          {t.weaknesses}
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
                      {t.criticalIssues}
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
                      {t.comparisonSamples}
                    </Text>
                    <div style={{
                      background: tokens.colorNeutralBackground3,
                      borderRadius: "8px",
                      padding: "12px",
                      borderLeft: `4px solid ${tokens.colorNeutralStroke1}`
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div>
                          <Text size={200} weight="semibold" block>{t.noveltyAssessment}</Text>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              {t.yourPaper} {reviewData.comparativeBenchmark.yourNoveltyScore.toFixed(1)}/10
                            </Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>•</Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              {t.acceptedAvg} {reviewData.comparativeBenchmark.acceptedAvgNovelty.toFixed(1)}/10
                            </Text>
                          </div>
                        </div>
                        <div>
                          <Text size={200} weight="semibold" block>{t.rigorAssessment}</Text>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              {t.yourPaper} {reviewData.comparativeBenchmark.yourRigorScore.toFixed(1)}/10
                            </Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>•</Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              {t.acceptedAvg} {reviewData.comparativeBenchmark.acceptedAvgRigor.toFixed(1)}/10
                            </Text>
                          </div>
                        </div>
                        {reviewData.comparativeBenchmark.keyGaps && reviewData.comparativeBenchmark.keyGaps.length > 0 && (
                          <div style={{ marginTop: "4px" }}>
                            <Text size={200} weight="semibold" block style={{ color: tokens.colorPaletteRedForeground1 }}>
                              {t.keyGaps}
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
                              {t.strengthsVsRejected}
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

      </div>
    </div>
  );
};

export default App;
