# AI 코딩 구독 사용량을 한눈에 확인하세요

메뉴바에서 사용량을 바로 확인할 수 있습니다. 대시보드를 뒤질 필요 없습니다.

> 이 프로젝트는 [robinebers/openusage](https://github.com/robinebers/openusage)의 개인 포크입니다.

![OpenUsage Screenshot](screenshot.png)

## 다운로드

[**최신 릴리스 다운로드**](https://github.com/rong5026/openusage/releases/latest) (macOS, Apple Silicon)

## 주요 기능

OpenUsage는 메뉴바에 상주하며 AI 코딩 구독 사용량을 표시합니다. 프로그레스 바, 뱃지, 명확한 레이블로 한눈에 파악할 수 있습니다.

- **한눈에 확인.** 모든 AI 도구를 하나의 패널에서.
- **항상 최신 상태.** 설정한 주기에 따라 자동 새로고침.
- **글로벌 단축키.** 어디서든 커스텀 단축키로 패널 토글.
- **가벼움.** 즉시 열리고, 방해하지 않음.
- **플러그인 기반.** 앱 업데이트 없이 새 프로바이더 추가 가능.

## 지원 프로바이더

- [**Amp**](docs/providers/amp.md) / 무료 티어, 보너스, 크레딧
- [**Antigravity**](docs/providers/antigravity.md) / 전체 모델
- [**Claude**](docs/providers/claude.md) / 세션, 주간, 추가 사용량, 로컬 토큰 사용량 (ccusage)
- [**Codex**](docs/providers/codex.md) / 세션, 주간, 리뷰, 크레딧
- [**Copilot**](docs/providers/copilot.md) / 프리미엄, 채팅, 완성
- [**Cursor**](docs/providers/cursor.md) / 크레딧, 총 사용량, 자동 사용량, API 사용량, 온디맨드, CLI 인증
- [**Factory / Droid**](docs/providers/factory.md) / 표준, 프리미엄 토큰
- [**Gemini**](docs/providers/gemini.md) / Pro, Flash, Workspace/무료/유료 티어
- [**JetBrains AI Assistant**](docs/providers/jetbrains-ai-assistant.md) / 할당량, 잔여량
- [**Kimi Code**](docs/providers/kimi.md) / 세션, 주간
- [**MiniMax**](docs/providers/minimax.md) / 코딩 플랜 세션
- [**OpenCode Go**](docs/providers/opencode-go.md) / 5시간, 주간, 월간 지출 한도
- [**Windsurf**](docs/providers/windsurf.md) / 프롬프트 크레딧, 플렉스 크레딧
- [**Z.ai**](docs/providers/zai.md) / 세션, 주간, 웹 검색

## 포크 변경 내역

원본 [robinebers/openusage](https://github.com/robinebers/openusage) 대비 변경 사항:

### 기능 추가
- **프로젝트 별칭** — 프로젝트에 커스텀 표시 이름 설정 가능
- **분석 세분화** — 분 단위 분석에 5분/10분/30분 간격 옵션 추가

### UI/스타일 개선
- **분석 드롭다운** — 분 단위 옵션을 드롭다운으로 변경하여 가로 스크롤 방지
- **프로젝트 색상 통일** — 바, 모델 분석, Daily breakdown 색상을 차트 컬러 팔레트로 통일

### 버그 수정
- **차트 Y축 오버플로** — 큰 토큰 값을 K/M 단위로 축약 표시 (예: 50M, 10K)
- **자동 업데이터 제거** — 실행 시 크래시 및 원본 저장소 업데이트 알림 방지

## 크레딧

[CodexBar](https://github.com/steipete/CodexBar) by [@steipete](https://github.com/steipete)에서 영감을 받았습니다.

## 라이선스

[MIT](LICENSE)

---

<details>
<summary><strong>소스에서 빌드</strong></summary>

> **주의**: `main` 브랜치는 안정적이지 않을 수 있습니다. 스테이징 없이 직접 머지되므로, 안정적인 빌드를 원하면 태그된 버전을 사용하세요.

### 기술 스택

- **프론트엔드**: React + TypeScript + Tailwind CSS v4
- **백엔드**: Rust (Tauri v2)
- **플러그인 런타임**: QuickJS 샌드박스

### 빌드 명령어

```bash
bun install                  # 의존성 설치
bun run tauri dev            # 개발 모드 실행
bun run tauri build          # 프로덕션 빌드
bun run test                 # 테스트 실행
```

</details>
