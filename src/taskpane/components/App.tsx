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

  // Scan offset: paragraphs before this index are excluded from all scans
  const [scanOffset, setScanOffset] = React.useState<number>(0);
  // Per-scan progress for Full Check
  type ScanKey = "captions" | "citations" | "layout" | "headings" | "references";
  const [scanProgress, setScanProgress] = React.useState<Record<ScanKey, "idle" | "done"> | null>(null);

  const [inspectData, setInspectData] = React.useState<InspectResult | null>(null);

  const currentDocType = data.ui.root.find((t: any) => t.id === docTypeId);
  const isJournal = docTypeId === "journal";
  const subTypes: any[] = isJournal ? (currentDocType as any)?.children || [] : [];
  const currentProfile = data.profiles.find((p: any) => p.id === profileId);

  React.useEffect(() => {
    Office.onReady(() => {
      Office.context.document.addHandlerAsync(Office.EventType.DocumentSelectionChanged, () => handleGetSelection());
    });
  }, []);

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
    const result = await scanCaptions(profileId, scanOffset);
    setScanCaptionData(result);
    setIsLoading(false);
  };

  const handleScanCitations = async () => {
    setIsLoading(true);
    const result = await scanCitations(profileId, scanOffset);
    setScanCiteData(result);
    setIsLoading(false);
  };

  const handleScanLayout = async () => {
    setIsLayoutLoading(true);
    const result = await scanLayout(profileId, scanOffset);
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

  const handleReportFix = async (item: CheckItem) => {
    if (!reportData) return;
    setIsReportLoading(true);

    const typoFieldMap: Record<string, LayoutIssue["field"]> = {
      "typo_font": "body_font",
      "typo_size": "body_size",
      "typo_spacing": "line_spacing",
    };

    if (typoFieldMap[item.id]) {
      const rawIssue = reportData.rawScans.layout.issues.find(i => i.field === typoFieldMap[item.id]);
      if (rawIssue) await fixLayoutIssue(rawIssue, profileId);
    } else if (item.id.startsWith("layout_margin_")) {
      const rawIssue = reportData.rawScans.layout.issues.find(i => i.id === item.id);
      if (rawIssue) await fixLayoutIssue(rawIssue, profileId);
    } else if (item.id === "layout_page_size") {
      const rawIssue = reportData.rawScans.layout.issues.find(i => i.field === "page_size");
      if (rawIssue) await fixLayoutIssue(rawIssue, profileId);
    } else if (item.id === "typography_headings") {
      for (const issue of reportData.rawScans.headings.issues) {
        await fixHeadingIssue(issue, profileId);
      }
    } else if (item.id === "content_captions") {
      await applyAllCaptionFixes(reportData.rawScans.captions.issues, profileId);
    } else if (item.id === "content_citations") {
      await applyAllCitationFixes(reportData.rawScans.citations.issues);
    }

    // Re-run full check to refresh all states
    const result = await generateSubmissionReport(profileId);
    setReportData(result);
    setScanLayoutData(result.rawScans.layout);
    setScanCaptionData(result.rawScans.captions);
    setScanCiteData(result.rawScans.citations);
    setScanHeadingData(result.rawScans.headings);
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
    if (selectedTab === "format" && scanCaptionData?.issues.length) {
      // Snapshot issues and clear UI immediately — Apply All button disappears on click
      const issuesToFix = [...scanCaptionData.issues];
      setScanCaptionData(null);
      // Apply each fix serially using the same path as individual Fix (proven to work)
      for (const issue of issuesToFix) {
        if (issue.suggestion && issue.paragraphIndex >= 0) {
          await replaceParagraphText(issue.paragraphIndex, issue.suggestion, profileId);
        }
      }
      // Rescan directly — no handleScanCaptions() to avoid isLoading state conflicts
      setScanCaptionData(await scanCaptions(profileId));
    } else if (selectedTab === "cite" && scanCiteData?.issues.length) {
      const issuesToFix = [...scanCiteData.issues];
      setScanCiteData(null);
      for (const issue of issuesToFix) {
        if (issue.suggestion && issue.paragraphIndex >= 0) {
          await fixCitationIssue(issue);
        }
      }
      setScanCiteData(await scanCitations(profileId));
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
              gap: "6px",
              flexWrap: "wrap",
            }}>
              <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground3, marginRight: "2px" }}>
                Scan range
              </Text>
              <Button size="small" appearance="subtle" icon={<DocumentEdit24Regular />}
                onClick={async () => {
                  const idx = await getSelectionParagraphIndex();
                  setScanOffset(idx);
                  setScanCaptionData(null); setScanCiteData(null);
                  setScanLayoutData(null); setScanHeadingData(null); setReportData(null);
                }}>
                Set start here
              </Button>
              {scanOffset > 0 ? (
                <Badge color="informative" style={{ cursor: "pointer" }}
                  onClick={() => {
                    setScanOffset(0);
                    setScanCaptionData(null); setScanCiteData(null);
                    setScanLayoutData(null); setScanHeadingData(null); setReportData(null);
                  }}>
                  From para {scanOffset} &nbsp;✕
                </Badge>
              ) : (
                <Text size={200} style={{ color: tokens.colorNeutralForeground4 }}>Full doc</Text>
              )}
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
                onClick={handleScanCitations}
                disabled={isLoading || currentProfile?.status === "todo"}>
                {isLoading ? <><Spinner size="tiny" />&nbsp; Scanning…</> : "Scan Citations"}
              </Button>
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
                      <div style={{ display: "flex", gap: "6px" }}>
                        <Button appearance="outline" size="small" icon={<Search24Regular />} style={{ flex: 1 }}
                          onClick={handleScanCaptions}
                          disabled={isLoading || currentProfile?.status === "todo"}>
                          {isLoading ? <Spinner size="tiny" /> : "Captions"}
                        </Button>
                        <Button appearance="outline" size="small" icon={<CheckmarkCircle24Regular />} style={{ flex: 1 }}
                          onClick={handleScanLayout}
                          disabled={isLayoutLoading || currentProfile?.status === "todo"}>
                          {isLayoutLoading ? <Spinner size="tiny" /> : "Layout"}
                        </Button>
                      </div>
                      <Button appearance="outline" size="small" icon={<Search24Regular />}
                        onClick={async () => {
                          setIsLayoutLoading(true);
                          const result = await scanHeadings(profileId, scanOffset);
                          setScanHeadingData(result);
                          setIsLayoutLoading(false);
                        }}
                        disabled={isLayoutLoading || currentProfile?.status === "todo"}>
                        {isLayoutLoading ? <Spinner size="tiny" /> : "Headings"}
                      </Button>
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            )}

            {/* ── Apply All ────────────────────────────────── */}
            {((selectedTab === "format" && (scanCaptionData?.issues.length ?? 0) > 0) ||
              (selectedTab === "cite"   && (scanCiteData?.issues.length ?? 0) > 0)) && (
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
          return (
            <div style={{ marginBottom: "12px" }}>
              {/* Score header */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <Text weight="semibold">Submission Readiness</Text>
                <Badge color={scoreBadgeColor} size="large">{score.pct}%</Badge>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  {score.passed}/{autoItems.length} auto-verified
                  {score.warned > 0 ? ` · ${score.warned} undetected` : ""}
                  {" · "}{score.manual} manual
                </Text>
              </div>

              {/* Auto-verified and warn items by category */}
              {cats.map(({ key, label }) => {
                const catItems = items.filter(i => i.category === key);
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
                                Fix
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

              {/* Manual checks */}
              {manualItems.length > 0 && (
                <div style={{ marginTop: "8px", padding: "8px", background: tokens.colorNeutralBackground2, borderRadius: "4px" }}>
                  <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground2 }}>
                    🔍 Manual checks required ({manualItems.length})
                  </Text>
                  {manualItems.map(item => (
                    <div key={item.id} style={{ marginTop: "4px" }}>
                      <Text size={200} weight="semibold" block>{item.label}</Text>
                      {item.expectedValue && (
                        <Text size={200} block style={{ color: tokens.colorPaletteGreenForeground1 }}>
                          Expected: {item.expectedValue}
                        </Text>
                      )}
                      <Text size={200} block style={{ color: tokens.colorNeutralForeground3 }}>{item.detail}</Text>
                    </div>
                  ))}
                </div>
              )}

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

        {selectedTab === "format" && scanCaptionData && (
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
                    const res = await fetch(`${API_BASE_URL}/analyze/term`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ term: selection, context: selection }) });
                    setAnalysisResult(await res.json());
                    setIsLoading(false);
                }} disabled={!selection || isLoading}>Analyze Term</Button>
                {analysisResult && (
                    <Card className={styles.resultCard}>
                        <Badge color="warning">Informal</Badge>
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
