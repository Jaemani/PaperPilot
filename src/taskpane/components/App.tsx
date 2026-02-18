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
  Code24Regular
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
  InspectResult,
  ScanResult,
  CaptionIssue,
  CitationIssue,
  LayoutIssue,
  HeadingIssue,
  CheckItem,
  SubmissionReport
} from "../taskpane";
import dataRaw from "../data/journalFormats.json"; 

const data = dataRaw as any;
// Injected by webpack DefinePlugin from NEXT_PUBLIC_API_URL env var.
// - Dev:  set to http://localhost:3001 (webpack proxy forwards /analyze/* there)
// - Prod: set to your deployed server URL in Vercel env vars (API_SERVER_URL)
declare const __API_SERVER_URL__: string;
const API_BASE_URL: string = (typeof __API_SERVER_URL__ !== "undefined" ? __API_SERVER_URL__ : "");

interface AppProps { title: string; }

// Use 'any' cast to bypass strict style type checking for border properties
const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground1,
    boxSizing: "border-box",
  },
  headerContainer: {
    padding: "16px 16px 8px 16px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
  contentContainer: {
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    gap: "12px",
    flexGrow: 1,
    overflowY: "auto",
  },
  issueItem: {
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: tokens.colorNeutralStroke1,
    marginBottom: "8px",
    ...shorthands.borderRadius("8px"),
    ":hover": {
      borderColor: tokens.colorBrandStroke1,
    },
  },
  resultCard: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding("12px"),
    ...shorthands.borderRadius("8px"),
    boxShadow: tokens.shadow4,
  },
  fixBtn: {
    marginTop: "8px",
    width: "100%",
    justifyContent: "center",
  },
  suggestionBtn: {
    width: "100%",
    justifyContent: "flex-start",
    textAlign: "left",
    marginTop: "4px"
  },
  logBox: {
    backgroundColor: tokens.colorNeutralBackground3,
    padding: "8px",
    fontSize: "11px",
    fontFamily: "monospace",
    borderRadius: "4px",
    maxHeight: "150px",
    overflowY: "auto",
    marginTop: "8px",
    whiteSpace: "pre-wrap"
  },
  textArea: {
    minHeight: "120px",
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius("4px"),
  },
  devTool: {
    marginTop: "20px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingTop: "10px"
  }
} as any);

const App: React.FC<AppProps> = () => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("term");
  const [selection, setSelection] = React.useState<string>("");
  const [analysisResult, setAnalysisResult] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const [docTypeId, setDocTypeId] = React.useState<string>(data.ui.root[0].id);
  const [subTypeId, setSubTypeId] = React.useState<string>("");
  const [profileId, setProfileId] = React.useState<string>(data.ui.root[0].profileIds?.[0] || "");

  const [scanCaptionData, setScanCaptionData] = React.useState<ScanResult<CaptionIssue> | null>(null);
  const [scanCiteData, setScanCiteData] = React.useState<ScanResult<CitationIssue> | null>(null);
  const [scanLayoutData, setScanLayoutData] = React.useState<ScanResult<LayoutIssue> | null>(null);
  const [scanHeadingData, setScanHeadingData] = React.useState<ScanResult<HeadingIssue> | null>(null);
  const [isLayoutLoading, setIsLayoutLoading] = React.useState(false);
  const [reportData, setReportData] = React.useState<SubmissionReport | null>(null);
  const [isReportLoading, setIsReportLoading] = React.useState(false);

  // Scan range: paragraph indices (inclusive). undefined endAt = scan to document end.
  const [scanOffset, setScanOffset] = React.useState<number>(0);
  const [scanOffsetEnd, setScanOffsetEnd] = React.useState<number | undefined>(undefined);
  // Per-scan progress for Full Check
  type ScanKey = "captions" | "citations" | "layout" | "headings" | "references";
  const [scanProgress, setScanProgress] = React.useState<Record<ScanKey, "idle" | "done"> | null>(null);

  const [inspectData, setInspectData] = React.useState<InspectResult | null>(null);
  // Editable margin values for the Action Required callout (fallback to profile values)
  const [marginDraft, setMarginDraft] = React.useState<{top: number, bottom: number, left: number, right: number}>({ top: 2, bottom: 2, left: 2, right: 2 });

  const currentDocType = data.ui.root.find((t: any) => t.id === docTypeId);
  const isJournal = docTypeId === "journal";
  const subTypes: any[] = isJournal ? (currentDocType as any)?.children || [] : [];
  const currentProfile = data.profiles.find((p: any) => p.id === profileId);

  React.useEffect(() => {
    Office.onReady(() => {
      Office.context.document.addHandlerAsync(Office.EventType.DocumentSelectionChanged, () => handleGetSelection());
    });
  }, []);

  // Sync marginDraft with profile when profile changes
  React.useEffect(() => {
    const layoutRule = (currentProfile?.rules as any)?.layout;
    if (layoutRule?.margins) setMarginDraft(layoutRule.margins);
  }, [profileId]);

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
    const result = await scanCaptions(profileId, scanOffset, scanOffsetEnd);
    setScanCaptionData(result);
    setIsLoading(false);
  };

  const handleScanCitations = async () => {
    setIsLoading(true);
    const result = await scanCitations(profileId, scanOffset, scanOffsetEnd);
    setScanCiteData(result);
    setIsLoading(false);
  };

  const handleScanLayout = async () => {
    setIsLayoutLoading(true);
    const result = await scanLayout(profileId, scanOffset, scanOffsetEnd);
    setScanLayoutData(result);
    setIsLayoutLoading(false);
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
    setReportData(null);
    setScanProgress({ captions: "idle", citations: "idle", layout: "idle", headings: "idle", references: "idle" });
    const result = await generateSubmissionReport(
      profileId,
      scanOffset,
      scanOffsetEnd,
      (key) => setScanProgress(prev => prev ? { ...prev, [key]: "done" } : null)
    );
    setReportData(result);
    setScanLayoutData(result.rawScans.layout);
    setScanCaptionData(result.rawScans.captions);
    setScanCiteData(result.rawScans.citations);
    setScanHeadingData(result.rawScans.headings);
    setScanProgress(null);
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
      for (const issue of report.rawScans.citations.issues) {
        if (issue.suggestion && issue.paragraphIndex >= 0) await fixCitationIssue(issue);
      }
    }
  };

  // Rescan after fix operations and refresh all state
  const rescanAfterReportFix = async () => {
    const result = await generateSubmissionReport(profileId, scanOffset, scanOffsetEnd);
    setReportData(result);
    setScanLayoutData(result.rawScans.layout);
    setScanCaptionData(result.rawScans.captions);
    setScanCiteData(result.rawScans.citations);
    setScanHeadingData(result.rawScans.headings);
    return result;
  };

  const handleReportFix = async (item: CheckItem) => {
    if (!reportData) return;
    setIsReportLoading(true);
    await applyReportItemFix(item, reportData);
    await rescanAfterReportFix();
    setIsReportLoading(false);
  };

  // Fix all currently-failed auto-fixable items in one pass, single rescan at end
  const handleReportFixAll = async () => {
    if (!reportData) return;
    setIsReportLoading(true);
    const failItems = reportData.items.filter(i => i.status === "fail");
    for (const item of failItems) {
      await applyReportItemFix(item, reportData);
    }
    await rescanAfterReportFix();
    setIsReportLoading(false);
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
      if (scanCiteData?.issues.length) {
        const issuesToFix = [...scanCiteData.issues];
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Text size={600} weight="semibold" color="brand">PaperPilot</Text>
          <Button appearance="subtle" icon={<ArrowSync24Regular />} onClick={handleGetSelection} />
        </div>
        <TabList selectedValue={selectedTab} onTabSelect={(_, d) => setSelectedTab(d.value)} appearance="subtle">
          <Tab value="term">Term</Tab>
          <Tab value="cite">Cite</Tab>
          <Tab value="format">Format</Tab>
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
                setScanOffset(0);
                setScanOffsetEnd(undefined);
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
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}>
              <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground3, flexShrink: 0 }}>
                Scan range
              </Text>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
                <input
                  type="number"
                  min={0}
                  value={scanOffset}
                  onChange={e => {
                    const v = Math.max(0, parseInt(e.target.value) || 0);
                    setScanOffset(v);
                    setScanCaptionData(null); setScanCiteData(null);
                    setScanLayoutData(null); setScanHeadingData(null); setReportData(null);
                  }}
                  style={{
                    width: "54px", padding: "2px 4px", fontSize: "12px",
                    border: `1px solid ${tokens.colorNeutralStroke1}`,
                    borderRadius: "4px", background: tokens.colorNeutralBackground1,
                    color: tokens.colorNeutralForeground1, textAlign: "center"
                  }}
                />
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>–</Text>
                <input
                  type="number"
                  min={0}
                  placeholder="end"
                  value={scanOffsetEnd ?? ""}
                  onChange={e => {
                    const raw = e.target.value;
                    const v = raw === "" ? undefined : Math.max(0, parseInt(raw) || 0);
                    setScanOffsetEnd(v);
                    setScanCaptionData(null); setScanCiteData(null);
                    setScanLayoutData(null); setScanHeadingData(null); setReportData(null);
                  }}
                  style={{
                    width: "54px", padding: "2px 4px", fontSize: "12px",
                    border: `1px solid ${tokens.colorNeutralStroke1}`,
                    borderRadius: "4px", background: tokens.colorNeutralBackground1,
                    color: tokens.colorNeutralForeground1, textAlign: "center"
                  }}
                />
                <Text size={200} style={{ color: tokens.colorNeutralForeground4, fontSize: "11px" }}>para</Text>
              </div>
              <Button size="small" appearance="subtle" icon={<DocumentEdit24Regular />}
                title="Set start to current cursor position"
                onClick={async () => {
                  const idx = await getSelectionParagraphIndex();
                  setScanOffset(idx);
                  setScanCaptionData(null); setScanCiteData(null);
                  setScanLayoutData(null); setScanHeadingData(null); setReportData(null);
                }}>
                Set
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
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <Button appearance="primary" icon={<Search24Regular />} style={{ width: "100%" }}
                  onClick={handleScanCitations}
                  disabled={isLoading || currentProfile?.status === "todo"}>
                  {isLoading ? <><Spinner size="tiny" />&nbsp; Scanning…</> : "Scan Citations"}
                </Button>
                <Button appearance="outline" icon={<Search24Regular />} style={{ width: "100%" }}
                  onClick={handleScanCaptions}
                  disabled={isLoading || currentProfile?.status === "todo"}>
                  {isLoading ? <Spinner size="tiny" /> : "Scan Captions"}
                </Button>
              </div>
            )}

            {/* ── Per-scan progress (format Full Check only) ── */}
            {selectedTab === "format" && scanProgress !== null && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {(["layout", "captions", "citations", "headings", "references"] as const).map(key => (
                  <Badge key={key} color={scanProgress[key] === "done" ? "success" : "subtle"} size="small">
                    {scanProgress[key] === "done" ? "✓" : "…"} {key}
                  </Badge>
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
                      {/* Submission Readiness (Full Check) — same as primary button above */}
                      <Button appearance="primary" size="small" icon={<CheckmarkCircle24Regular />}
                        onClick={handleFullCheck}
                        disabled={isReportLoading || currentProfile?.status === "todo"}>
                        {isReportLoading ? <><Spinner size="tiny" />&nbsp;Checking…</> : "Submission Readiness"}
                      </Button>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <Button appearance="outline" size="small" icon={<CheckmarkCircle24Regular />} style={{ flex: 1 }}
                          onClick={handleScanLayout}
                          disabled={isLayoutLoading || currentProfile?.status === "todo"}>
                          {isLayoutLoading ? <Spinner size="tiny" /> : "Layout"}
                        </Button>
                        <Button appearance="outline" size="small" icon={<Search24Regular />} style={{ flex: 1 }}
                          onClick={async () => {
                            setIsLayoutLoading(true);
                            const result = await scanHeadings(profileId, scanOffset, scanOffsetEnd);
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
            {(selectedTab === "cite" && ((scanCiteData?.issues.length ?? 0) > 0 || (scanCaptionData?.issues.length ?? 0) > 0)) && (
              <Button appearance="outline" icon={<Wand24Regular />}
                onClick={handleApplyAllFixes} disabled={isLoading}>
                Apply All
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
              const n = reportData.rawScans.citations.issues.length;
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
                  <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground1 }}>
                    Action required ({manualItems.length})
                  </Text>
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
                        {/* Margin inputs — editable, pre-filled from profile */}
                        {item.id === "layout_margins" ? (
                          <div style={{ marginTop: "4px" }}>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", marginBottom: "4px" }}>
                              {(["top","bottom","left","right"] as const).map(k => (
                                <label key={k} style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "2px", color: tokens.colorNeutralForeground2 }}>
                                  {k[0].toUpperCase()}
                                  <input type="number" value={marginDraft[k]} step="0.1" min="0" max="10"
                                    onChange={e => setMarginDraft(prev => ({ ...prev, [k]: parseFloat(e.target.value) || 0 }))}
                                    style={{ width: "44px", fontSize: "11px", padding: "1px 3px", border: `1px solid ${tokens.colorNeutralStroke1}`, borderRadius: "3px" }} />
                                  cm
                                </label>
                              ))}
                            </div>
                            <Text size={200} block style={{ color: tokens.colorNeutralForeground4, fontStyle: "italic" }}>
                              On Word Online: Layout → Margins → Custom Margins
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
                                On Word Online: Layout → Size
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
                          disabled={isReportLoading}>
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

              {/* ── Fix All Flagged ──────────────────────────── */}
              {items.some(i => i.status === "fail") && (
                <Button appearance="outline" icon={<Wand24Regular />} size="small"
                  onClick={handleReportFixAll}
                  disabled={isReportLoading}
                  style={{ marginBottom: "8px" }}>
                  Fix All Flagged ({items.filter(i => i.status === "fail").length} issues)
                </Button>
              )}

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
                                disabled={isReportLoading}>
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

        {selectedTab === "cite" && scanCaptionData && (
            <div style={{ display: "flex", flexDirection: "column" }}>
                {scanCaptionData.issues.length === 0 && (
                  <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1, marginBottom: "8px" }}>
                    No caption issues found.
                  </Text>
                )}
                {scanCaptionData.issues.map((issue) => (
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
                ))}
                <Accordion collapsible><AccordionItem value="log"><AccordionHeader>Logs</AccordionHeader><AccordionPanel><div className={styles.logBox}>{scanCaptionData.logs.map((l, i) => <div key={i}>{l}</div>)}</div></AccordionPanel></AccordionItem></Accordion>
            </div>
        )}

        {selectedTab === "cite" && scanCiteData && (
            <div style={{ display: "flex", flexDirection: "column" }}>
                {scanCiteData.issues.map((issue) => (
                    <div key={issue.id} className={styles.issueItem}>
                        <Badge color="warning">Cite</Badge>
                        <Text block style={{marginTop: "8px"}}>{issue.text}</Text>
                        <Button className={styles.fixBtn} appearance="primary" size="small" icon={<Wand24Regular />} onClick={() => handleApplySingleFix(issue)}>Fix Style</Button>
                    </div>
                ))}
                <Accordion collapsible><AccordionItem value="log"><AccordionHeader>Logs</AccordionHeader><AccordionPanel><div className={styles.logBox}>{scanCiteData.logs.map((l, i) => <div key={i}>{l}</div>)}</div></AccordionPanel></AccordionItem></Accordion>
            </div>
        )}

        {selectedTab === "term" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Textarea className={styles.textArea} value={selection} onChange={(_, d) => setSelection(d.value)} />
                <Button appearance="primary" size="large" onClick={async () => {
                    setIsLoading(true);
                    // Send full paragraph as context so LLM understands usage, not just the selected word
                    const paragraphCtx = await getParagraphContext();
                    const res = await fetch(`${API_BASE_URL}/analyze/term`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ term: selection, context: paragraphCtx || selection }) });
                    setAnalysisResult(await res.json());
                    setIsLoading(false);
                }} disabled={!selection || isLoading}>
                  {isLoading ? <><Spinner size="tiny" />&nbsp;Analyzing…</> : "Analyze Term"}
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
