# Documentation Index

Complete guide to all PaperPilot documentation. Start here to find what you need.

## 📚 Documentation Map

```
PaperPilot Documentation
│
├── 👥 For End Users (Researchers)
│   ├── USER_GUIDE.md .................... Complete user manual
│   └── INSTALLATION.md .................. Step-by-step installation
│
├── 👨‍💻 For Developers
│   ├── API_REFERENCE.md ................. Complete API documentation
│   ├── CONTRIBUTING.md .................. Contribution guidelines
│   ├── TECHNICAL_REPORT.md .............. Architecture & internals
│   ├── ARCHITECTURE.md .................. System design overview
│   ├── DECISION_LOG.md .................. Technical decisions log
│   └── HANDOVER.md ...................... Developer onboarding
│
├── 📝 Project Information
│   ├── README.md ........................ Project overview & quick start
│   ├── CHANGELOG.md ..................... Version history
│   └── LICENSE .......................... MIT License
│
└── 🔧 Implementation Guides
    ├── IMPLEMENTATION_COMPLETE.md ....... v1.4.0 features summary
    └── ICON_GENERATION_INSTRUCTIONS.md .. Icon generation guide
```

---

## Quick Navigation

### I want to...

**Use PaperPilot:**
- [Install the add-in](INSTALLATION.md) → Step-by-step installation
- [Learn how to use it](USER_GUIDE.md) → Complete user guide
- [See what's new](CHANGELOG.md) → Version history

**Develop for PaperPilot:**
- [Set up development environment](INSTALLATION.md#for-developers-local-setup) → Local setup
- [Understand the codebase](TECHNICAL_REPORT.md) → Architecture & internals
- [Add a new feature](CONTRIBUTING.md) → Contribution guidelines
- [Use the API](API_REFERENCE.md) → API documentation

**Contribute to PaperPilot:**
- [Contribution guidelines](CONTRIBUTING.md) → How to contribute
- [Add a journal format](CONTRIBUTING.md#adding-format-profiles) → Profile guide
- [Fix a bug](CONTRIBUTING.md#submitting-changes) → Bug fix workflow
- [Improve translations](CONTRIBUTING.md#translation-contributions) → Translation guide

**Understand design decisions:**
- [Technical decisions](DECISION_LOG.md) → Why we made certain choices
- [Architecture overview](ARCHITECTURE.md) → System design
- [Engineering details](TECHNICAL_REPORT.md) → Deep dive

---

## Documentation by Audience

### 🎓 For Researchers & Authors

You're writing an academic paper and want to check formatting.

**Start here:**
1. **[INSTALLATION.md](INSTALLATION.md)** - Get PaperPilot running (5 minutes)
2. **[USER_GUIDE.md](USER_GUIDE.md)** - Learn how to use all features
   - Interface overview
   - Term checking (AI formality analysis)
   - Citation & caption validation
   - Format verification
   - Submission preparation workflow

**Quick Reference:**
- [Supported Formats](USER_GUIDE.md#supported-formats) - List of journals/universities
- [Troubleshooting](USER_GUIDE.md#troubleshooting) - Common issues & solutions
- [Submission Checklist](USER_GUIDE.md#pre-submission-checklist) - Final checks

---

### 💻 For Developers

You want to contribute code, add features, or understand the implementation.

**Start here:**
1. **[INSTALLATION.md#for-developers](INSTALLATION.md#for-developers-local-setup)** - Local development setup
2. **[TECHNICAL_REPORT.md](TECHNICAL_REPORT.md)** - Architecture & implementation details
3. **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines

**Core Documentation:**
- **[API_REFERENCE.md](API_REFERENCE.md)** - Every function, endpoint, and data structure
  - Word API functions (scan, fix, inspect)
  - Server endpoints (term analysis, review)
  - Type definitions and interfaces
  - Translation keys
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - High-level system design
  - Component interaction
  - Data flow
  - Technology stack
- **[DECISION_LOG.md](DECISION_LOG.md)** - Why we made technical choices
  - Alternative approaches considered
  - Trade-offs and rationale

**Workflow Guides:**
- [Adding a format profile](CONTRIBUTING.md#adding-format-profiles)
- [Submitting a pull request](CONTRIBUTING.md#submitting-changes)
- [Testing guidelines](CONTRIBUTING.md#testing-guidelines)
- [Code style guide](CONTRIBUTING.md#coding-standards)

---

### 🔬 For Researchers (Adding Journal Formats)

You want to add your institution's format requirements.

**Follow this path:**
1. **[CONTRIBUTING.md#adding-format-profiles](CONTRIBUTING.md#adding-format-profiles)** - Profile creation guide
2. **[API_REFERENCE.md#format-profile](API_REFERENCE.md#format-profile)** - Profile structure reference
3. **[TECHNICAL_REPORT.md §4](TECHNICAL_REPORT.md)** - journalFormats.json schema

**Requirements:**
- Official template (Word .docx or LaTeX .cls)
- Author guidelines (PDF or webpage)
- Extract real values (no guessing!)

---

### 🌐 For Translators

You want to improve Korean/English translations or add a new language.

**Start here:**
1. **[CONTRIBUTING.md#translation-contributions](CONTRIBUTING.md#translation-contributions)** - Translation guide
2. **[API_REFERENCE.md#translation-keys](API_REFERENCE.md#translation-keys)** - All translation keys
3. **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - v1.4.0 translation system

**Translation Coverage:**
- 200+ keys in both KOR and ENG
- All UI elements: tabs, buttons, messages, errors
- Dynamic text with pluralization
- Function-based translations for complex cases

---

## Documentation by Topic

### Installation & Setup

| Document | Topic | Audience |
|---|---|---|
| [INSTALLATION.md](INSTALLATION.md) | Complete installation guide | All users |
| [README.md](README.md) | Quick start (5 min) | All users |
| [INSTALLATION.md#server-setup](INSTALLATION.md#server-setup) | Server configuration | Developers |
| [INSTALLATION.md#troubleshooting](INSTALLATION.md#troubleshooting) | Common install issues | All users |

### Usage & Features

| Document | Topic | Audience |
|---|---|---|
| [USER_GUIDE.md](USER_GUIDE.md) | Complete user manual | Researchers |
| [USER_GUIDE.md#term-check](USER_GUIDE.md#term-check) | AI term analysis | Researchers |
| [USER_GUIDE.md#format-check](USER_GUIDE.md#format-check) | Layout verification | Researchers |
| [USER_GUIDE.md#submission-preparation](USER_GUIDE.md#submission-preparation) | Pre-submission workflow | Researchers |

### API & Development

| Document | Topic | Audience |
|---|---|---|
| [API_REFERENCE.md](API_REFERENCE.md) | Complete API reference | Developers |
| [TECHNICAL_REPORT.md](TECHNICAL_REPORT.md) | Architecture & internals | Developers |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines | Contributors |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design | Developers |

### Project Management

| Document | Topic | Audience |
|---|---|---|
| [CHANGELOG.md](CHANGELOG.md) | Version history | All users |
| [DECISION_LOG.md](DECISION_LOG.md) | Technical decisions | Developers |
| [HANDOVER.md](HANDOVER.md) | Developer onboarding | New developers |
| [README.md#roadmap](README.md#roadmap) | Future plans | All users |

---

## Documentation Standards

All PaperPilot documentation follows these guidelines:

### Structure

- **Clear headings** - H2 for major sections, H3 for subsections
- **Table of contents** - For documents > 100 lines
- **Quick navigation** - Links to related docs
- **Examples** - Code snippets with expected output

### Style

- **Active voice** - "Click the button" not "The button should be clicked"
- **Present tense** - "The function returns" not "The function will return"
- **Concise** - Remove unnecessary words
- **Accessible** - Assume no prior knowledge

### Code Examples

- **Syntax highlighted** - Use markdown code fences with language
- **Complete** - Include imports and context
- **Tested** - All examples verified to work
- **Commented** - Explain non-obvious parts

### Maintenance

- **Version stamps** - "Last Updated: 2026-02-20 (v1.4.0)"
- **Cross-references** - Link to related sections
- **Changelog updates** - Document changes in CHANGELOG.md
- **Consistent** - Use same terminology across docs

---

## Finding Specific Information

### Word API Usage

**Question:** How do I scan captions?

**Answer:** [API_REFERENCE.md#scancaptions](API_REFERENCE.md#scancaptions)

**Also see:**
- [TECHNICAL_REPORT.md §6](TECHNICAL_REPORT.md) - Scan engine internals
- [USER_GUIDE.md#citation-check](USER_GUIDE.md#citation-check) - User-facing guide

---

### Adding Features

**Question:** How do I add a new scan function?

**Answer:** Follow this sequence:
1. [CONTRIBUTING.md#development-workflow](CONTRIBUTING.md#development-workflow) - Branch & commit strategy
2. [CONTRIBUTING.md#coding-standards](CONTRIBUTING.md#coding-standards) - Code style
3. [API_REFERENCE.md](API_REFERENCE.md) - Existing scan functions reference
4. [TECHNICAL_REPORT.md §7](TECHNICAL_REPORT.md) - Word API patterns

---

### Troubleshooting

**Question:** Why isn't my add-in loading?

**Answer:** [INSTALLATION.md#troubleshooting](INSTALLATION.md#troubleshooting)

**Common issues:**
- Certificate errors → [INSTALLATION.md#issue-certificate-error](INSTALLATION.md#issue-certificate-error-in-development)
- Blank screen → [INSTALLATION.md#issue-task-pane-shows-blank](INSTALLATION.md#issue-task-pane-shows-blank-white-screen)
- API errors → [INSTALLATION.md#issue-failed-to-fetch](INSTALLATION.md#issue-failed-to-fetch-errors)

**Also see:**
- [USER_GUIDE.md#troubleshooting](USER_GUIDE.md#troubleshooting) - Usage issues
- GitHub Issues - Community solutions

---

### Format Profiles

**Question:** Which journals are supported?

**Answer:** [USER_GUIDE.md#supported-formats](USER_GUIDE.md#supported-formats)

**Question:** How do I add a journal?

**Answer:** [CONTRIBUTING.md#adding-format-profiles](CONTRIBUTING.md#adding-format-profiles)

**Schema reference:** [API_REFERENCE.md#format-profile](API_REFERENCE.md#format-profile)

---

## Document Changelog

Track updates to documentation itself:

| Date | Document | Change | Version |
|---|---|---|---|
| 2026-02-20 | All docs | Created comprehensive documentation suite | v1.4.0 |
| 2026-02-20 | CHANGELOG.md | Added v1.4.0 release notes | v1.4.0 |
| 2026-02-20 | README.md | Updated to v1.4.0, added doc links | v1.4.0 |
| 2026-02-20 | API_REFERENCE.md | Complete API documentation created | v1.4.0 |
| 2026-02-20 | USER_GUIDE.md | Full user manual with all features | v1.4.0 |
| 2026-02-20 | CONTRIBUTING.md | Contributor guidelines created | v1.4.0 |
| 2026-02-20 | INSTALLATION.md | Installation guide for all platforms | v1.4.0 |

---

## Documentation TODO

Features not yet documented (planned):

- [ ] Video tutorials (YouTube)
- [ ] Interactive examples
- [ ] FAQ page
- [ ] API playground/sandbox
- [ ] Architecture diagrams (Mermaid/PlantUML)
- [ ] Performance benchmarks
- [ ] Security best practices
- [ ] Deployment guide (detailed)

---

## Getting Help with Documentation

### Documentation is unclear?

- **Open an issue:** Label it `documentation`
- **Suggest improvements:** What would help?
- **Submit a PR:** Fix typos, add examples

### Documentation is missing?

- **Check roadmap:** May be planned
- **Request it:** Open issue with `documentation` label
- **Write it yourself:** See [CONTRIBUTING.md](CONTRIBUTING.md)

### Want to contribute?

- **Fix typos:** Small PRs welcome
- **Add examples:** Code snippets highly valued
- **Improve clarity:** Reword confusing sections
- **Translate:** Help with KOR/ENG accuracy

---

## Documentation License

All documentation is licensed under CC-BY-4.0 (Creative Commons Attribution 4.0).

You may:
- ✅ Share and adapt the documentation
- ✅ Use for any purpose (commercial or non-commercial)
- ✅ Credit "PaperPilot Contributors"

---

**Last Updated:** 2026-02-20 (v1.4.0)

**Maintained by:** PaperPilot Contributors

**Questions?** Open an issue on GitHub or see [USER_GUIDE.md#getting-help](USER_GUIDE.md#getting-help)
