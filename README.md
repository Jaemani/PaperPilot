# PaperPilot (Research Toolkit MVP)

**PaperPilot**은 연구자가 논문 작성 중 실시간으로 용어, 인용, 포맷을 검증하고 수정할 수 있는 **Word 인라인 툴킷**입니다.
작성 흐름을 끊지 않고("탭 이동 없이"), 문서 안에서 즉시 피드백을 제공하는 것을 목표로 합니다.

## 🌟 Key Features (v0.1.0)
| Feature | Type | Logic Source | Description |
| :--- | :--- | :--- | :--- |
| **Term Check** | `Replace` | Mock (Static) | 비표준 용어를 감지하고 학술적 표현(`significant` 등)으로 교체 제안. |
| **Cite Check** | `Append` | Logic (Config) | 인용이 필요한 문장에 저널 스타일에 맞는 Placeholder(`[1]`, `¹`) 추가. |
| **Format Check** | `Replace` | **Data-driven** | 선택한 텍스트를 저널 규정(`Fig. 1.` vs `Figure 1 |`)에 맞춰 캡션 스타일로 자동 변환. |

## 🛠️ Tech Stack
- **Platform**: Microsoft Word Add-in (Office.js)
- **Framework**: React + TypeScript
- **UI Library**: Fluent UI v9 (Microsoft Native Design)
- **Bundler**: Webpack

## 📂 Project Structure
```bash
PaperPilot/
├── src/
│   ├── taskpane/
│   │   ├── components/
│   │   │   └── App.tsx       # 메인 UI (탭, 결과 카드, 액션 버튼)
│   │   ├── data/
│   │   │   └── journalFormats.json # 저널별 포맷 규칙 DB (IEEE, Nature...)
│   │   ├── taskpane.ts       # Word API 연동 (getSelection, replaceSelection)
│   │   └── index.tsx         # 진입점
├── manifest.xml              # Word 애드인 설정 (권한, 아이콘, 리본 버튼)
└── CHANGELOG.md              # 버전별 변경 사항 및 구현 로직 상세
```

## 🚀 How to Run (Development)
1. **의존성 설치**:
   ```bash
   npm install
   ```
2. **개발 서버 실행**:
   ```bash
   npm run dev-server
   ```
   *서버가 `https://localhost:3000`에서 실행됩니다.*
3. **Word Online에서 로드**:
   - [Word Online](https://word.new) 접속 -> **삽입(Insert)** -> **추가 기능(Add-ins)**
   - **내 추가 기능 업로드(Upload My Add-in)** -> `manifest.xml` 선택

## 🔮 Future Roadmap (To-Do)
- [ ] **LLM Integration**: Mock 로직을 실제 OpenAI/Claude API로 교체하여 문맥 기반 검증 구현.
- [ ] **Context Menu**: 텍스트 드래그 후 우클릭으로 분석 실행.
- [ ] **Advanced Formatting**: 캡션 번호 자동 인식 및 참고문헌 순서 정렬.
