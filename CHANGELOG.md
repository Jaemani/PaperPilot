# Changelog

## [v0.5.4] - 2026-02-01 (False Positive Mitigation)

### 🚀 New Features
- **Particle-Aware Gating**: 한국어 조사(`은/는/이/가/의` 등)가 번호 뒤에 바로 붙는 경우를 "본문 참조"로 인식하여 캡션 후보에서 자동 제외.
  - 이를 통해 본문 설명 문단이 캡션으로 오탐되어 강제 수정되는 심각한 UX 오류 해결.
- **Strict Separator Enforcement**: 캡션 탐지 시 번호 뒤에 반드시 `.`(점), `:`(콜론), `|`(바), 또는 공백이 와야 한다는 규칙을 적용하여 탐지 정확도 향상.

## [v0.5.3] - 2026-02-01 (Regex & Stat Fix)
- **Regex Normalization**: JSON과 TypeScript 간의 이중/사중 이스케이프 문제를 해결하여 정규식 탐지 정확도 복구.
- **Stat Refinement**: 인용 마커 인덱싱 시 숫자가 포함된 유효한 마커만 집계하도록 수정.

## [v0.5.2] - 2026-02-01 (Cascading Selection & KSDS)
- **Hierarchical Selection UI**: 학위논문/저널 -> 대학/지역 -> 최종 포맷으로 이어지는 3단 선택 UI 구현.
- **KSDS Support**: 한국디자인학회 Design Works 포맷 프로필 추가.

## [v0.5.1] - 2026-02-01 (Fix & Fix All)
- **One-Click Fix**: 개별 이슈 카드 및 상단 'Apply All Fixes' 버튼 추가.
- **Doc Anchor**: `paragraphIndex` 기반의 안정적인 문서 위치 추적 및 수정 로직 구현.

## [v0.4.0] - 2026-01-31 (Full Scan & Indexer)
- **Format Indexer**: `Scan All Captions` 버튼 추가. 문서 전체 스캔 기능 도입.

## [v0.1.0] - 2026-01-31 (Initial MVP)
- Initial release with Term, Cite, and Format mock logic.
