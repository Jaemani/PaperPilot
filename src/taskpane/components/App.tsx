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
  Card
} from "@fluentui/react-components";
import { 
  TextQuote24Regular, 
  CheckmarkCircle24Regular, 
  DocumentEdit24Regular,
  Play24Regular,
  ArrowSync24Regular
} from "@fluentui/react-icons";
import { getSelectedText, insertText, replaceSelection } from "../taskpane";
import journalFormats from "../data/journalFormats.json"; 

interface AppProps {
  title: string;
}

// 🎨 스타일 정의
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
    minHeight: "150px",
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius("4px"),
    "& textarea": {
      resize: "vertical",
    }
  },
  resultCard: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding("12px"),
    ...shorthands.borderRadius("8px"),
    boxShadow: tokens.shadow4,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  suggestionBtn: {
    width: "100%",
    justifyContent: "flex-start",
    padding: "12px",
    height: "auto",
    whiteSpace: "normal",
    textAlign: "left",
    marginBottom: "4px"
  },
  dropdownArea: {
    marginBottom: "8px",
  }
});

const App: React.FC<AppProps> = () => {
  const styles = useStyles();
  
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("term");
  const [selection, setSelection] = React.useState<string>("");
  const [analysisResult, setAnalysisResult] = React.useState<any>(null);
  const [selectedJournalId, setSelectedJournalId] = React.useState<string>(journalFormats[0].id);

  const currentJournal = journalFormats.find(j => j.id === selectedJournalId) || journalFormats[0];

  React.useEffect(() => {
    const registerHandler = async () => {
      await Office.onReady();
      Office.context.document.addHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        handleGetSelection
      );
    };
    registerHandler();
    return () => {};
  }, []);

  const onTabSelect = (_: any, data: SelectTabData) => {
    setSelectedTab(data.value);
    setAnalysisResult(null);
  };

  const handleGetSelection = async () => {
    const text = await getSelectedText();
    if (text) {
        setSelection(text);
        setAnalysisResult(null);
    }
  };

  const onJournalChange = (_: any, data: OptionOnSelectData) => {
    if (data.optionValue) {
      setSelectedJournalId(data.optionValue);
      setAnalysisResult(null); 
    }
  };

  const handleAnalyze = () => {
    if (!selection) return;

    // 🔴 정규표현식 리터럴을 문자열 생성 방식으로 변경 (더 안전함)
    const regex = new RegExp("[\\r\\n]+", "g");
    const cleanText = selection.replace(regex, " ").trim();

    if (selectedTab === "term") {
      setAnalysisResult({
        type: "warning",
        title: "Vague Term Detected",
        message: `The phrase '${cleanText.substring(0, 20)}...' appears informal for academic writing.`,
        suggestions: ["significant", "substantial", "considerable"],
        mode: "replace"
      });
    } else if (selectedTab === "cite") {
      setAnalysisResult({
        type: "error",
        title: "Citation Needed",
        message: "This statement appears to be a claim requiring evidence.",
        suggestions: [currentJournal.citationStyle.brackets === "square" ? " [1]" : "¹"],
        mode: "append"
      });
    } else if (selectedTab === "format") {
      const style = currentJournal.captionStyle;
      const formattedCaption = `${style.figurePrefix} 1${style.separator} ${cleanText}`;

      setAnalysisResult({
        type: "success",
        title: "Caption Format Ready",
        message: `Converted to ${currentJournal.journalName} style rules.`, 
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
      {/* 1. 고정 헤더 영역 */}
      <div className={styles.headerContainer}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
                <Text className={styles.appTitle}>PaperPilot</Text>
                <Text size={200} block style={{ opacity: 0.7 }}>Research Assistant Toolkit</Text>
            </div>
            <Button appearance="subtle" icon={<ArrowSync24Regular />} onClick={handleGetSelection} title="Force Refresh" />
        </div>
        
        <div style={{ marginTop: "12px" }}>
            <TabList selectedValue={selectedTab} onTabSelect={onTabSelect} appearance="subtle">
                <Tab value="term">Term</Tab>
                <Tab value="cite">Cite</Tab>
                <Tab value="format">Format</Tab>
            </TabList>
        </div>
      </div>

      {/* 2. 스크롤 가능한 메인 콘텐츠 영역 */}
      <div className={styles.contentContainer}>        
        {/* 저널 선택 (Format 탭 전용) */}
        {selectedTab === "format" && (
            <div className={styles.dropdownArea}>
            <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground2 }}>Target Journal</Text>
            <Dropdown
                aria-label="Select Journal"
                value={currentJournal.journalName}
                selectedOptions={[selectedJournalId]}
                onOptionSelect={onJournalChange}
                style={{ width: "100%", marginTop: "4px" }}
            >
                {journalFormats.map((journal) => (
                <Option key={journal.id} value={journal.id} text={journal.journalName}>
                    {journal.journalName}
                </Option>
                ))}
            </Dropdown>
            </div>
        )}

        {/* 메인 텍스트 에디터 */}
        <div className={styles.editorArea}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text weight="semibold">Selected Context</Text>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    {selection.length} chars
                </Text>
            </div>
            <Textarea 
                className={styles.textArea}
                value={selection} 
                onChange={(_, data) => setSelection(data.value)} 
                placeholder="Select text in Word to analyze..."
            />
        </div>

        {/* 분석 버튼 */}
        <Button 
            appearance="primary" 
            size="large" 
            icon={<Play24Regular />}
            onClick={handleAnalyze}
            disabled={!selection}
            style={{ width: "100%" }}
        >
            Analyze Selection
        </Button>

        <Divider />

        {/* 3. 분석 결과 카드 */}
        {analysisResult && (
            <Card className={styles.resultCard}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {analysisResult.type === "warning" && <TextQuote24Regular style={{ color: tokens.colorPaletteYellowBorderActive }} />}
                    {analysisResult.type === "error" && <CheckmarkCircle24Regular style={{ color: tokens.colorPaletteRedBorderActive }} />}
                    {analysisResult.type === "success" && <DocumentEdit24Regular style={{ color: tokens.colorPaletteGreenBorderActive }} />}
                    <Text weight="bold" size={400}>{analysisResult.title}</Text>
                </div>

                <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
                    {analysisResult.message}
                </Text>

                <div style={{ marginTop: "8px" }}>
                    <Text size={200} weight="semibold" style={{ display: "block", marginBottom: "4px" }}>
                        SUGGESTIONS
                    </Text>
                    {analysisResult.suggestions.map((s: string, idx: number) => (
                        <Button 
                            key={idx} 
                            className={styles.suggestionBtn}
                            appearance="outline"
                            onClick={() => handleApplyFix(s, analysisResult.mode)}
                        >
                            <span style={{ marginRight: "6px" }}>
                                {analysisResult.mode === "replace" ? "⚡" : "➕"}
                            </span>
                            <Text weight="semibold">{s}</Text>
                        </Button>
                    ))}
                </div>
            </Card>
        )}
      </div>
    </div>
  );
};

export default App;
