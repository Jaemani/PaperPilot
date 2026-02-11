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
  ChevronRight24Regular
} from "@fluentui/react-icons";
import { 
  getSelectedText, 
  replaceSelection, 
  replaceParagraphText,
  scanCaptions, 
  scanCitations, 
  selectIssueInDoc, 
  ScanResult,
  CaptionIssue, 
  CitationIssue 
} from "../taskpane";
import dataRaw from "../data/journalFormats.json"; 

const data = dataRaw as any; // Cast to any to avoid strict literal type issues from JSON
const API_BASE_URL = "http://localhost:3001";

interface AppProps { title: string; }

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
    maxHeight: "100px",
    overflowY: "auto",
    marginTop: "8px"
  },
  textArea: {
    minHeight: "120px",
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius("4px"),
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

  const currentDocType = data.ui.root.find((t: any) => t.id === docTypeId);
  const isJournal = docTypeId === "journal";
  const subTypes = isJournal ? currentDocType?.children || [] : [];
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

  const handleScanCaptions = async () => {
    setIsLoading(true);
    const result = await scanCaptions(profileId);
    setScanCaptionData(result);
    setIsLoading(false);
  };

  const handleScanCitations = async () => {
    setIsLoading(true);
    const result = await scanCitations(profileId);
    setScanCiteData(result);
    setIsLoading(false);
  };

  const handleApplySingleFix = async (issue: CaptionIssue | CitationIssue) => {
    if (!issue.suggestion) return;
    if (issue.paragraphIndex >= 0) {
        await replaceParagraphText(issue.paragraphIndex, issue.suggestion);
    } else {
        await replaceSelection(issue.suggestion);
    }
    if (issue.type === "caption") handleScanCaptions();
    else handleScanCitations();
  };

  const handleApplyAllFixes = async () => {
    const issues = selectedTab === "format" ? scanCaptionData?.issues : scanCiteData?.issues;
    if (!issues) return;
    setIsLoading(true);
    for (const issue of issues) {
        if (issue.suggestion && issue.paragraphIndex >= 0) {
            await replaceParagraphText(issue.paragraphIndex, issue.suggestion);
        }
    }
    if (selectedTab === "format") handleScanCaptions();
    else handleScanCitations();
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
            <div style={{ display: "flex", gap: "8px" }}>
                <Dropdown value={currentDocType?.labelKo} onOptionSelect={(_, d) => {
                    const val = d.optionValue as string;
                    setDocTypeId(val);
                    const firstProfile = data.ui.root.find((t: any) => t.id === val)?.profileIds?.[0];
                    if (firstProfile) setProfileId(firstProfile);
                    setSubTypeId("");
                }} style={{ flex: 1 }}>
                    {data.ui.root.map((t: any) => <Option key={t.id} value={t.id}>{t.labelKo}</Option>)}
                </Dropdown>
                {isJournal && (
                    <Dropdown value={subTypes?.find((s: any) => s.id === subTypeId)?.labelKo || "국내/외"} onOptionSelect={(_, d) => {
                        const val = d.optionValue as string;
                        setSubTypeId(val);
                        const firstProfile = subTypes?.find((s: any) => s.id === val)?.profileIds?.[0];
                        if (firstProfile) setProfileId(firstProfile);
                    }} style={{ flex: 1 }}>
                        {subTypes?.map((s: any) => <Option key={s.id} value={s.id}>{s.labelKo}</Option>)}
                    </Dropdown>
                )}
            </div>
            <Dropdown value={currentProfile?.name} onOptionSelect={(_, d) => setProfileId(d.optionValue as string)} style={{ width: "100%" }}>
                {(isJournal ? subTypes?.find((s: any) => s.id === subTypeId)?.profileIds : currentDocType?.profileIds)?.map((pid: string) => {
                    const p = data.profiles.find((prof: any) => prof.id === pid);
                    return <Option key={pid} value={pid}>{p?.name}</Option>;
                })}
            </Dropdown>

            <Button appearance="primary" icon={<Search24Regular />} onClick={selectedTab === "format" ? handleScanCaptions : handleScanCitations} disabled={isLoading || currentProfile?.status === "todo"}>
                {selectedTab === "format" ? "Scan All" : "Scan Citation"}
            </Button>
            
            {((selectedTab === "format" && (scanCaptionData?.issues.length ?? 0) > 0) || (selectedTab === "cite" && (scanCiteData?.issues.length ?? 0) > 0)) && (
                <Button appearance="outline" icon={<Wand24Regular />} onClick={handleApplyAllFixes} disabled={isLoading}>Apply All</Button>
            )}
            <Divider />
          </div>
        )}

        {/* Results */}
        {selectedTab === "format" && scanCaptionData && (
            <div style={{ display: "flex", flexDirection: "column" }}>
                {scanCaptionData.issues.map((issue) => (
                    <div key={issue.id} className={styles.issueItem}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <Badge color="danger">Format</Badge>
                            <Button size="small" icon={<ChevronRight24Regular />} appearance="subtle" onClick={() => selectIssueInDoc(issue.paragraphIndex, issue.text)}>Go to</Button>
                        </div>
                        <Text block style={{marginTop: "8px"}}>{issue.text}</Text>
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
      </div>
    </div>
  );
};

export default App;
