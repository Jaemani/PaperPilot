# Contributing to PaperPilot

Thank you for your interest in contributing to PaperPilot! This document provides guidelines and instructions for contributors.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Project Structure](#project-structure)
5. [Coding Standards](#coding-standards)
6. [Testing Guidelines](#testing-guidelines)
7. [Adding Format Profiles](#adding-format-profiles)
8. [Submitting Changes](#submitting-changes)
9. [Translation Contributions](#translation-contributions)
10. [Documentation](#documentation)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, background, or identity.

### Expected Behavior

- Be respectful and considerate
- Focus on constructive feedback
- Accept responsibility for mistakes
- Prioritize the project's success over individual preferences

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling, insulting, or inflammatory remarks
- Publishing others' private information
- Any conduct inappropriate in a professional setting

---

## Getting Started

### Prerequisites

- Node.js v18+ and npm
- Git
- Office 365 account (for testing in Word Online)
- Basic knowledge of TypeScript/React
- Familiarity with Office.js API (helpful but not required)

### Initial Setup

1. **Fork the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/PaperPilot.git
   cd PaperPilot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. **Configure environment:**
   ```bash
   # server/.env
   OPENAI_API_KEY=sk-your-key-here
   ```

4. **Start development servers:**
   ```bash
   # Terminal 1: Client
   npm run dev-server

   # Terminal 2: Server
   cd server && npm start
   ```

5. **Test in Word:**
   - Open Word Online (https://word.new)
   - Insert → Add-ins → Upload My Add-in
   - Select `manifest.xml`
   - Accept certificate warning at https://localhost:3000

---

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `dev` - Integration branch for features
- `feature/your-feature-name` - New features
- `fix/issue-description` - Bug fixes
- `docs/documentation-update` - Documentation only

### Workflow Steps

1. **Create a branch:**
   ```bash
   git checkout -b feature/add-oxford-format
   ```

2. **Make changes:**
   - Write code following our coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test thoroughly:**
   - Run in Word Online
   - Test in Word Desktop (if available)
   - Verify all scan functions work
   - Check translation coverage

4. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: add Oxford University Press format profile"
   ```

5. **Push and create PR:**
   ```bash
   git push origin feature/add-oxford-format
   ```
   - Open pull request on GitHub
   - Link related issues
   - Add clear description

---

## Project Structure

### Key Directories

```
PaperPilot/
├── src/
│   ├── taskpane/
│   │   ├── taskpane.ts           # Core Word API logic
│   │   ├── components/
│   │   │   └── App.tsx            # Main React component
│   │   └── data/
│   │       └── journalFormats.json  # Format profiles
│   ├── commands/
│   │   └── commands.ts            # Context menu handlers
│   └── server/
│       └── src/
│           └── index.ts           # Express API server
├── assets/                        # Icons and images
├── webpack.config.js              # Build configuration
├── manifest.xml                   # Office Add-in manifest
└── docs/                          # Documentation (if created)
```

### File Ownership

| File/Directory | Purpose | When to Modify |
|---|---|---|
| `taskpane.ts` | All Word API functions | Adding new scan/fix features |
| `App.tsx` | UI components and state | Changing UI, adding tabs |
| `journalFormats.json` | Format profiles | Adding journals/universities |
| `commands.ts` | Context menu actions | Adding right-click features |
| `server/src/index.ts` | API endpoints | Adding AI features |
| `manifest.xml` | Add-in configuration | Changing icons, commands |

---

## Coding Standards

### TypeScript

**Style Guide:**
- Use 2 spaces for indentation
- Prefer `const` over `let`
- Always specify types (no `any` unless absolutely necessary)
- Use meaningful variable names

**Good:**
```typescript
const scanResult: ScanResult<CaptionIssue> = await scanCaptions(profileId);
const issueCount = scanResult.issues.length;
```

**Bad:**
```typescript
let result: any = await scanCaptions(profileId);
let c = result.issues.length;
```

### React Components

**Functional components with hooks:**
```typescript
const MyComponent: React.FC<Props> = ({ data }) => {
  const [state, setState] = React.useState<string>("");
  const styles = useStyles();

  return (
    <div className={styles.container}>
      {data.map(item => <Item key={item.id} {...item} />)}
    </div>
  );
};
```

**Avoid:**
- Class components (use functional)
- Inline styles (use Fluent UI's `makeStyles`)
- Deeply nested JSX (extract sub-components)

### Word API Patterns

**Always use `Word.run`:**
```typescript
export async function scanCaptions(profileId: string): Promise<ScanResult<CaptionIssue>> {
  return await Word.run(async (context) => {
    const body = context.document.body;
    body.load("paragraphs");
    await context.sync();

    // Process paragraphs
    const issues: CaptionIssue[] = [];
    // ...

    return { issues, stats: {}, logs: [] };
  });
}
```

**Load only what you need:**
```typescript
// Good
paragraph.load(["text", "style"]);

// Bad (loads everything)
paragraph.load();
```

**Batch API calls:**
```typescript
// Good - single sync
paragraphs.forEach(p => p.load("text"));
await context.sync();

// Bad - sync in loop
for (const p of paragraphs.items) {
  p.load("text");
  await context.sync(); // ❌ Multiple round-trips
}
```

### Naming Conventions

- **Functions:** `camelCase` - `scanCaptions()`, `fixLayoutIssue()`
- **Interfaces:** `PascalCase` - `CaptionIssue`, `ScanResult<T>`
- **Constants:** `UPPER_SNAKE_CASE` - `BRAND_COLOR`, `API_BASE_URL`
- **Components:** `PascalCase` - `App`, `IssueCard`
- **Files:** `camelCase.ts` or `PascalCase.tsx`

---

## Testing Guidelines

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] **Load add-in** - No console errors
- [ ] **Select profile** - All dropdowns work
- [ ] **Scan captions** - Detects issues correctly
- [ ] **Scan citations** - Bracket fixes work
- [ ] **Scan layout** - Font/margin detection accurate
- [ ] **Full check** - Score calculation correct
- [ ] **Fix buttons** - All fixes apply correctly
- [ ] **Apply All** - Batch fixes work
- [ ] **Language toggle** - All text switches
- [ ] **Scan range** - Page boundaries work
- [ ] **Context menu** - Right-click analysis (Desktop)
- [ ] **Review tab** - Structure scan works
- [ ] **AI review** - Server responds (if API key set)

### Test Documents

Create test documents with:
1. Correct formatting (to verify no false positives)
2. Known violations (to verify detection)
3. Edge cases (empty doc, single paragraph, etc.)

**Example test cases:**

| Test Case | Expected Result |
|---|---|
| Caption "Figure 1: Test" with IEEE profile | Flagged (should use period) |
| Caption "Figure 1. Test" with IEEE profile | Pass |
| Citation `[1,2,3]` | Flagged with suggestion `[1], [2], [3]` |
| Citation `[1], [2]` | Pass |
| 11pt font with 12pt requirement | Flagged |
| Heading styled as "Heading 1" with wrong size | Flagged |

### Automated Tests (Future)

We plan to add:
- Unit tests for scan functions
- Integration tests for Word API
- E2E tests with Playwright

---

## Adding Format Profiles

### Profile Structure

Profiles are defined in `src/taskpane/data/journalFormats.json`.

**Basic profile:**
```json
{
  "id": "example_journal",
  "name": "Example Journal",
  "status": "verified",
  "rules": {
    "captionStyle": {
      "figure": {
        "prefix": "Figure",
        "format": "1",
        "separator": "period",
        "fontName": "Times New Roman",
        "fontSize": 10,
        "isBold": true
      },
      "table": {
        "prefix": "Table",
        "format": "1",
        "separator": "period",
        "fontName": "Times New Roman",
        "fontSize": 10,
        "isBold": true
      }
    },
    "layout": {
      "pageSize": "A4",
      "columns": 2,
      "margins": {
        "top": 2.5,
        "bottom": 2.5,
        "left": 2.0,
        "right": 2.0
      }
    },
    "typography": {
      "body": {
        "fontName": "Times New Roman",
        "fontSize": 10,
        "lineSpacingPct": 110
      },
      "headings": {
        "h1": { "fontSize": 14, "isBold": true },
        "h2": { "fontSize": 12, "isBold": true },
        "h3": { "fontSize": 10, "isBold": true }
      }
    }
  }
}
```

### Required Sources

**Do NOT create profiles from memory or guessing.** Every profile must be extracted from:

1. **Official template** (Word .docx or LaTeX .cls file)
2. **Author guidelines** (PDF or webpage)
3. **Published paper** (as last resort, verify with guidelines)

### Extraction Checklist

When adding a profile, verify:

- [ ] **Caption format** - Check Figure/Table captions in template
- [ ] **Typography** - Open .docx, check font/size in styles
- [ ] **Margins** - File → Page Setup → Margins
- [ ] **Line spacing** - Paragraph → Line spacing (single/1.5×/double)
- [ ] **Heading sizes** - Check H1/H2/H3 styles
- [ ] **Status** - Set to "verified" only if all fields extracted

### Profile Status Levels

- `"verified"` - All fields extracted from official sources
- `"partial"` - Some fields missing (document which in comments)
- `"todo"` - Placeholder (profile will be skipped in UI)

### Adding to UI

After creating profile in JSON, add to UI tree:

**File:** `journalFormats.json` → `ui.root` section

```json
{
  "id": "thesis",
  "labelKo": "학위논문",
  "labelEn": "Thesis",
  "profileIds": ["snu_grad_thesis", "kaist_grad_thesis", "YOUR_NEW_PROFILE"]
}
```

Or for journals:

```json
{
  "id": "journal",
  "labelKo": "저널",
  "children": [
    {
      "id": "journal_foreign",
      "labelKo": "국외",
      "profileIds": ["ieee_trans", "nature_numbered", "YOUR_NEW_PROFILE"]
    }
  ]
}
```

### Validation

Before submitting:

1. **JSON syntax:**
   ```bash
   python3 -m json.tool src/taskpane/data/journalFormats.json
   ```

2. **TypeScript build:**
   ```bash
   npm run build
   ```

3. **Manual test:**
   - Select your profile in UI
   - Run Full Check on a sample document
   - Verify detection accuracy

---

## Submitting Changes

### Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, no logic change)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance (dependencies, build)

**Examples:**
```
feat(profiles): add Oxford University Press format

Extracted from official OUP author guidelines (2025 edition).
Includes caption format, typography, and layout rules.

Closes #123

---

fix(scan): correct Korean josa detection for captions

Previous regex did not handle '으로' postposition.
Now detects all 15 common josa patterns.

Fixes #456
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested in Word Online
- [ ] Tested in Word Desktop
- [ ] All scan functions work
- [ ] Language toggle works

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings in console
- [ ] Translation keys added (if UI changed)

## Related Issues
Closes #XXX
```

### Review Process

1. **Automated checks** - Build must pass
2. **Code review** - At least 1 approver required
3. **Testing** - Reviewer tests in Word
4. **Documentation** - Check README, CHANGELOG updated
5. **Merge** - Squash and merge to maintain clean history

---

## Translation Contributions

### Adding Translations

All UI text is in `src/taskpane/components/App.tsx`:

```typescript
const translations = {
  KOR: {
    scanCaptions: "캡션 스캔",
    fix: "수정",
    // ... 200+ keys
  },
  ENG: {
    scanCaptions: "Scan Captions",
    fix: "Fix",
    // ...
  }
};
```

### Translation Guidelines

1. **Keep consistent tone:**
   - Korean: Polite/formal (존댓말)
   - English: Professional but approachable

2. **Preserve meaning:**
   - Don't translate literally if idiomatic phrase is better
   - Technical terms: keep English or use standard Korean equivalent

3. **Test in context:**
   - Load add-in
   - Toggle language
   - Check all tabs and states

4. **Character limits:**
   - Button labels: Keep under 15 chars (Korean) / 20 chars (English)
   - Error messages: No limit, but be concise

### Adding New Translation Keys

When adding new UI elements:

1. **Add to both languages:**
   ```typescript
   const translations = {
     KOR: {
       newFeature: "새 기능",
       // ...
     },
     ENG: {
       newFeature: "New Feature",
       // ...
     }
   };
   ```

2. **Use in JSX:**
   ```typescript
   <Button>{t.newFeature}</Button>
   ```

3. **For dynamic text, use functions:**
   ```typescript
   const translations = {
     KOR: {
       itemsFound: (n: number) => `${n}개 항목 발견`,
     },
     ENG: {
       itemsFound: (n: number) => `${n} item${n !== 1 ? 's' : ''} found`,
     }
   };
   ```

---

## Documentation

### Required Documentation

When adding features, update:

1. **README.md** - If feature is user-facing
2. **CHANGELOG.md** - Always add entry for your version
3. **API_REFERENCE.md** - If adding new functions
4. **USER_GUIDE.md** - If changing UI or workflow
5. **TECHNICAL_REPORT.md** - If architectural change

### Documentation Style

- Use clear headings (H2, H3, H4)
- Include code examples
- Add screenshots/diagrams if helpful
- Keep examples up-to-date with code

### Code Comments

**Do comment:**
- Complex algorithms
- Word API workarounds
- Non-obvious regex patterns
- TODOs and known limitations

**Don't comment:**
- Obvious code
- What the code does (describe WHY instead)
- Outdated information

**Good:**
```typescript
// Korean josa check must run AFTER prefix test to override false positives
// Order matters: negative check beats positive match
if (CAPTION_PREFIX_RE.test(text) && !BODY_SENTENCE_JOSA_RE.test(text)) {
  isCaption = true;
}
```

**Bad:**
```typescript
// Check if text matches caption prefix
if (CAPTION_PREFIX_RE.test(text)) {
  isCaption = true; // Set isCaption to true
}
```

---

## Getting Help

### Questions?

- Check existing documentation first
- Search closed issues/PRs on GitHub
- Open a GitHub Discussion (not Issue) for questions
- Tag maintainers if urgent: @jaeman

### Found a Bug?

1. Search existing issues
2. Create minimal reproduction case
3. Open issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (Word version, browser, OS)
   - Screenshots/error messages

### Feature Requests

1. Check roadmap in README.md
2. Search existing issues
3. Open issue with:
   - Use case description
   - Proposed solution (if any)
   - Alternative approaches considered

---

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md (if we create one)
- Credited in CHANGELOG.md for significant features
- Thanked in release notes

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

**Thank you for contributing to PaperPilot!** 🚀

Your efforts help researchers worldwide submit better papers with less formatting friction.
