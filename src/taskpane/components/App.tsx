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
  OptionOnSelectData,
  Card,
  Spinner
} from "@fluentui/react-components";
import { 
  TextQuote24Regular, 
  CheckmarkCircle24Regular, 
  DocumentEdit24Regular,
  Play24Regular,
  ArrowSync24Regular,
  Search24Regular,
  ErrorCircle24Regular
} from "@fluentui/react-icons";
import { getSelectedText, insertText, replaceSelection, scanCaptions, selectIssueInDoc, CaptionIssue } from "../taskpane";
import journalFormats from "../data/journalFormats.json"; 

const API_BASE_URL = "http://localhost:3001";

interface AppProps {
  title: string;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground1,
    boxSizing: "border-box",
    padding: "0px",
  },
  headerContainer: {
    padding: "16px 16px 8px 16px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
  appTitle: {
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
  },
  contentContainer: {
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    gap: "12px",
    flexGrow: 1,
    overflowY: "auto",
  },
  editorArea: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  textArea: {
    minHeight: "120px",
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius("4px"),
  },
  resultCard: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding("12px"),
    ...shorthands.borderRadius("8px"),
    boxShadow: tokens.shadow4,
  },
  suggestionBtn: {
    width: "100%",
    justifyContent: "flex-start",
    textAlign: "left",
    marginTop: "4px"
  },
  issueItem: {
    padding: "8px",
    backgroundColor: tokens.colorNeutralBackground1,
    marginBottom: "4px",
    ...shorthands.borderRadius("4px"),
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.colorNeutralBackgroundHover }
  }
});

const App: React.FC<AppProps> = () => {
  const styles = useStyles();
  
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("term");
  const [selection, setSelection] = React.useState<string>("");
  const [analysisResult, setAnalysisResult] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedJournalId, setSelectedJournalId] = React.useState<string>(journalFormats[0].id);
  const [scanResults, setScanResults] = React.useState<CaptionIssue[] | null>(null);

  const currentJournal = journalFormats.find(j => j.id === selectedJournalId) || journalFormats[0];

  React.useEffect(() => {
    const registerHandler = async () => {
      await Office.onReady();
      Office.context.document.addHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        () => handleGetSelection()
      );
    };
    registerHandler();
  }, []);

  const handleGetSelection = async () => {
    const text = await getSelectedText();
    if (text && text !== selection) {
      setSelection(text);
      setAnalysisResult(null);
    }
  };

  const handleScanAll = async () => {
    setIsLoading(true);
    setScanResults(null);
    const issues = await scanCaptions(selectedJournalId);
    setScanResults(issues);
    setIsLoading(false);
  };

  const handleAnalyze = async () => {
    if (!selection) return;
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      if (selectedTab === "term") {
        const res = await fetch(`${API_BASE_URL}/analyze/term`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term: selection, context: selection })
        });
        const data = await res.json();
        
        if (data.isInformal) {
          setAnalysisResult({
            type: "warning",
            title: "Style Suggestion",
            message: data.reason,
            suggestions: data.suggestions,
            mode: "replace"
          });
        } else {
          setAnalysisResult({ type: "success", title: "Perfect!", message: "This term is appropriate for academic writing." });
        }

      } else if (selectedTab === "cite") {
        const res = await fetch(`${API_BASE_URL}/analyze/cite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentence: selection })
        });
        const data = await res.json();
        
        if (data.type === "EXTERNAL") {
          setAnalysisResult({
            type: "error",
            title: "Citation Missing",
            message: "This sentence appears to be an external claim. Consider adding a citation.",
            suggestions: [currentJournal.citationStyle.brackets === "square" ? " [1]" : "¹"],
            mode: "append"
          });
        } else {
          setAnalysisResult({ type: "success", title: "No Citation Needed", message: `Classified as ${data.type.toLowerCase()}.` });
        }

      } else if (selectedTab === "format") {
        const res = await fetch(`${API_BASE_URL}/analyze/format`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawCaption: selection })
        });
        const parsed = await res.json();
        
        const rule = currentJournal.captionStyle.figure;
        const corrected = `${rule.prefix} ${parsed.number}${rule.separator} ${parsed.content}`;
        const isWrong = parsed.prefix !== rule.prefix || parsed.separator !== rule.separator;

        if (isWrong) {
          setAnalysisResult({
            type: "warning",
            title: "Formatting Issue",
            message: `Does not match ${currentJournal.journalName} style.`,
            suggestions: [corrected],
            mode: "replace"
          });
        } else {
          setAnalysisResult({ type: "success", title: "Format OK", message: "Matches target journal style." });
        }
      }
    } catch (error) {
      setAnalysisResult({ type: "error", title: "Error", message: "Failed to connect to the analysis server." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFix = async (textToApply: string, mode: "replace" | "append") => {
    if (mode === "replace") {
      await replaceSelection(textToApply);
    } else {
      await insertText(textToApply);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.headerContainer}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Text className={styles.appTitle}>PaperPilot</Text>
          <Button appearance="subtle" icon={<ArrowSync24Regular />} onClick={handleGetSelection} />
        </div>
        <div style={{ marginTop: "12px" }}>
          <TabList selectedValue={selectedTab} onTabSelect={(_, d) => setSelectedTab(d.value)} appearance="subtle">
            <Tab value="term">Term</Tab>
            <Tab value="cite">Cite</Tab>
            <Tab value="format">Format</Tab>
          </TabList>
        </div>
      </div>

      <div className={styles.contentContainer}>
        {selectedTab === "format" && (
          <div style={{ marginBottom: "8px" }}>
            <Text size={200} weight="semibold">Target Journal</Text>
            <Dropdown value={currentJournal.journalName} onOptionSelect={(_, d) => setSelectedJournalId(d.optionValue!)} style={{ width: "100%", marginTop: "4px" }}>
              {journalFormats.map((j) => <Option key={j.id} value={j.id}>{j.journalName}</Option>)}
            </Dropdown>
            
            {/* --- v0.4.0 New: Scan All Button --- */}
            <Button 
              style={{ marginTop: "8px", width: "100%" }} 
              icon={<Search24Regular />} 
              onClick={handleScanAll}
              disabled={isLoading}
            >
              Scan All Captions
            </Button>
          </div>
        )}

        {/* --- Scan Results List (Format Tab Only) --- */}
        {selectedTab === "format" && scanResults && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Text weight="semibold">Scan Results ({scanResults.length})</Text>
            {scanResults.length === 0 && <Text>No captions found.</Text>}
            {scanResults.map((issue) => (
              <div key={issue.id} className={styles.issueItem} onClick={() => selectIssueInDoc(issue.text)}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {issue.isValid ? 
                    <CheckmarkCircle24Regular style={{ color: tokens.colorPaletteGreenBorderActive }} /> : 
                    <ErrorCircle24Regular style={{ color: tokens.colorPaletteRedBorderActive }} />
                  }
                  <Text weight="semibold" style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                    {issue.text}
                  </Text>
                </div>
                {!issue.isValid && issue.suggestion && (
                  <Text size={200} style={{ display: "block", color: tokens.colorPaletteRedForeground1, marginTop: "4px" }}>
                    Suggest: {issue.suggestion}
                  </Text>
                )}
              </div>
            ))}
            <Divider />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Text weight="semibold">Selected Context</Text>
          <Textarea className={styles.textArea} value={selection} onChange={(_, d) => setSelection(d.value)} />
        </div>

        <Button appearance="primary" size="large" icon={isLoading ? <Spinner size="tiny" /> : <Play24Regular />} onClick={handleAnalyze} disabled={!selection || isLoading}>
          {isLoading ? "Analyzing..." : "Analyze Selection"}
        </Button>

        <Divider />

        {analysisResult && (
          <Card className={styles.resultCard}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              {analysisResult.type === "warning" && <Badge color="warning">Warning</Badge>}
              {analysisResult.type === "error" && <Badge color="danger">Issue</Badge>}
              {analysisResult.type === "success" && <Badge color="success">Valid</Badge>}
              <Text weight="bold">{analysisResult.title}</Text>
            </div>
            <Text size={300}>{analysisResult.message}</Text>
            {analysisResult.suggestions && (
              <div style={{ marginTop: "12px" }}>
                <Text size={200} weight="semibold">SUGGESTIONS</Text>
                {analysisResult.suggestions.map((s: string, i: number) => (
                  <Button key={i} className={styles.suggestionBtn} appearance="outline" onClick={() => handleApplyFix(s, analysisResult.mode)}>
                    {analysisResult.mode === "replace" ? "⚡ Replace with: " : "➕ Add: "} <b>{s}</b>
                  </Button>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default App;
