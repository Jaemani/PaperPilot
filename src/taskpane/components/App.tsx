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
  OptionOnSelectData
} from "@fluentui/react-components";
import {
  TextQuote24Regular,
  CheckmarkCircle24Regular,
  DocumentEdit24Regular,
  Play24Regular
} from "@fluentui/react-icons";
import { getSelectedText, insertText, replaceSelection } from "../taskpane";
import journalFormats from "../data/journalFormats.json";

interface AppProps {
  title: string;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    padding: "15px",
    backgroundColor: tokens.colorNeutralBackground1,
    minHeight: "100vh",
  },
  header: {
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
    marginBottom: "5px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  resultCard: {
    marginTop: "10px",
    padding: "10px",
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius("8px"),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
  },
  cardTitle: {
    fontWeight: "bold",
    marginBottom: "5px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  suggestionContainer: {
    marginTop: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  actionButton: {
    width: "100%",
    justifyContent: "flex-start",
    textAlign: "left",
  },
  dropdownArea: {
    marginBottom: "10px",
  }
});

const App: React.FC<AppProps> = () => {
  const styles = useStyles();
  
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("term");
  const [selection, setSelection] = React.useState<string>("");
  const [analysisResult, setAnalysisResult] = React.useState<any>(null);
  const [selectedJournalId, setSelectedJournalId] = React.useState<string>(journalFormats[0].id);

  const currentJournal = journalFormats.find(j => j.id === selectedJournalId) || journalFormats[0];

  const onTabSelect = (_: any, data: SelectTabData) => {
    setSelectedTab(data.value);
    setAnalysisResult(null);
  };

  const handleGetSelection = async () => {
    const text = await getSelectedText();
    setSelection(text);
    setAnalysisResult(null);
  };

  const onJournalChange = (_: any, data: OptionOnSelectData) => {
    if (data.optionValue) {
      setSelectedJournalId(data.optionValue);
      setAnalysisResult(null); 
    }
  };

  const handleAnalyze = () => {
    if (!selection) return;

    // 정규식 오류 수정 및 안전한 처리
    const cleanText = selection.replace(/[\r\n]+/g, " ").trim();

    if (selectedTab === "term") {
      setAnalysisResult({
        type: "warning",
        title: "Vague Term Detected",
        message: `'${cleanText.substring(0, 15)}...' might be informal.`, 
        suggestions: ["significant", "substantial"],
        mode: "replace"
      });
    } else if (selectedTab === "cite") {
      setAnalysisResult({
        type: "error",
        title: "Citation Needed",
        message: "This claim lacks a citation.",
        suggestions: [currentJournal.citationStyle.brackets === "square" ? " [1]" : "¹"],
        mode: "append" 
      });
    } else if (selectedTab === "format") {
      const style = currentJournal.captionStyle;
      const expectedPrefix = style.figurePrefix; 
      const separator = style.separator;
      
      const formattedCaption = `${expectedPrefix} 1${separator} ${cleanText}`;

      setAnalysisResult({
        type: "success",
        title: `${currentJournal.journalName} Format`,
        message: `Applying ${currentJournal.journalName} caption style.`,
        suggestions: [formattedCaption],
        mode: "replace" 
      });
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
      <div>
        <Text className={styles.header}>PaperPilot</Text>
        <Text size={200} block>Research Assistant Toolkit</Text>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={onTabSelect} appearance="subtle">
        <Tab value="term" icon={<TextQuote24Regular />}>Term</Tab>
        <Tab value="cite" icon={<CheckmarkCircle24Regular />}>Cite</Tab>
        <Tab value="format" icon={<DocumentEdit24Regular />}>Format</Tab>
      </TabList>

      <Divider />

      {selectedTab === "format" && (
        <div className={styles.dropdownArea}>
          <Text size={200} weight="semibold" block style={{marginBottom: "4px"}}>Target Journal:</Text>
          <Dropdown
            aria-label="Select Journal"
            value={currentJournal.journalName}
            selectedOptions={[selectedJournalId]}
            onOptionSelect={onJournalChange}
            style={{ minWidth: "100%" }}
          >
            {journalFormats.map((journal) => (
              <Option key={journal.id} value={journal.id} text={journal.journalName}>
                {journal.journalName}
              </Option>
            ))}
          </Dropdown>
        </div>
      )}

      <div className={styles.section}>
        <Text weight="semibold">Selected Text:</Text>
        <div style={{ display: "flex", gap: "8px" }}>
          <Textarea 
            value={selection} 
            onChange={(_, data) => setSelection(data.value)} 
            placeholder="Select text in Word..."
            style={{ flex: 1, minHeight: "60px" }} 
          />
          <Button icon={<TextQuote24Regular />} onClick={handleGetSelection} />
        </div>
      </div>

      <Button 
        appearance="primary" 
        size="large" 
        icon={<Play24Regular />}
        onClick={handleAnalyze}
        disabled={!selection}
      >
        Analyze Selection
      </Button>

      {analysisResult && (
        <div className={styles.resultCard}>
          <div className={styles.cardTitle}>
            {analysisResult.type === "warning" && <Badge appearance="filled" color="warning">Warning</Badge>}
            {analysisResult.type === "error" && <Badge appearance="filled" color="danger">Missing</Badge>}
            {analysisResult.type === "success" && <Badge appearance="filled" color="success">Format</Badge>}
            <Text>{analysisResult.title}</Text>
          </div>
          
          <Text block style={{ marginBottom: "10px" }}>{analysisResult.message}</Text>
          
          <Divider />
          
          <div className={styles.suggestionContainer}>
            <Text weight="semibold">Suggestions:</Text>
            {analysisResult.suggestions.map((s: string, idx: number) => (
              <Button 
                key={idx} 
                className={styles.actionButton}
                onClick={() => handleApplyFix(s, analysisResult.mode)}
              >
                {analysisResult.mode === "replace" ? "⚡ Replace with: " : "➕ Add: "} 
                <span style={{ fontWeight: "bold", marginLeft: "4px" }}>{s}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
