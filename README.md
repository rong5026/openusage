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

## 소스에서 빌드 및 실행하기

수정 후 직접 빌드하여 사용하고 싶은 분들을 위한 단계별 가이드입니다.

### 1. 사전 준비 (필수 도구 설치)

아래 도구들이 모두 설치되어 있어야 합니다. 터미널에서 각 명령어로 설치 여부를 확인하세요.

| 도구 | 확인 명령어 | 설치 방법 |
|------|------------|----------|
| **Xcode Command Line Tools** | `xcode-select -p` | `xcode-select --install` |
| **Rust** | `rustc --version` | [rustup.rs](https://rustup.rs) 에서 설치 |
| **Node.js** (v18 이상) | `node --version` | [nodejs.org](https://nodejs.org) 또는 `brew install node` |
| **Bun** | `bun --version` | `curl -fsSL https://bun.sh/install \| bash` |

> **Tip**: macOS에서 [Homebrew](https://brew.sh)가 설치되어 있다면 `brew install rust node bun`으로 한번에 설치할 수 있습니다.

### 2. 저장소 클론

```bash
git clone https://github.com/rong5026/openusage.git
cd openusage
```

### 3. 의존성 설치

```bash
# 프론트엔드 (JavaScript) 의존성 설치
bun install

# 백엔드 (Rust) 의존성은 첫 빌드 시 자동으로 다운로드됩니다.
```

### 4. 개발 모드로 실행

코드를 수정하면서 실시간으로 결과를 확인할 수 있습니다.

```bash
bun run tauri dev
```

- 프론트엔드(React) 개발 서버와 Tauri 앱이 동시에 실행됩니다.
- **첫 실행 시** Rust 컴파일에 수 분이 걸릴 수 있습니다. 이후에는 변경된 부분만 컴파일하므로 빠릅니다.
- 프론트엔드 코드(TypeScript/React) 수정 시 **핫 리로드**로 즉시 반영됩니다.
- Rust 코드 수정 시 자동으로 재컴파일 후 앱이 재시작됩니다.

### 5. 프로덕션 빌드 (배포용 앱 생성)

```bash
bun run tauri build
```

빌드가 완료되면 아래 경로에 설치 파일이 생성됩니다:

```
src-tauri/target/release/bundle/
├── macos/          # OpenUsage.app (앱 번들)
└── dmg/            # OpenUsage_x.x.x_aarch64.dmg (설치 이미지)
```

- `.app` 파일을 `/Applications` 폴더로 드래그하여 설치할 수 있습니다.
- `.dmg` 파일은 다른 사람에게 배포할 때 사용합니다.

### 6. 테스트

```bash
bun run test                 # 전체 테스트 실행
bun run test:watch           # 파일 변경 시 자동 재실행
bun run test:coverage        # 커버리지 리포트 포함
cd src-tauri && cargo test   # Rust 백엔드 테스트
```

### 기술 스택

| 영역 | 기술 |
|------|------|
| **프론트엔드** | React + TypeScript + Tailwind CSS v4 |
| **백엔드** | Rust (Tauri v2) |
| **플러그인 런타임** | QuickJS 샌드박스 |
| **패키지 매니저** | Bun |
| **테스트** | Vitest (프론트엔드) + Cargo Test (백엔드) |

### 프로젝트 구조 (참고)

```
openusage/
├── src/                    # 프론트엔드 소스 (React/TypeScript)
│   ├── components/         #   UI 컴포넌트
│   ├── hooks/              #   커스텀 훅
│   ├── pages/              #   페이지 (overview, settings, analytics 등)
│   └── stores/             #   상태 관리 (Zustand)
├── src-tauri/              # 백엔드 소스 (Rust/Tauri)
│   └── src/
│       ├── lib.rs          #   Tauri 커맨드 정의
│       └── plugin_engine/  #   플러그인 실행 엔진
├── plugins/                # 프로바이더 플러그인 (JS)
└── package.json            # 프론트엔드 빌드 스크립트
```

### 자주 묻는 문제

**Q: `bun run tauri dev` 실행 시 Rust 관련 에러가 발생해요**
> Rust가 올바르게 설치되었는지 확인하세요: `rustc --version`. 설치 후 터미널을 재시작해야 할 수 있습니다.

**Q: 첫 빌드가 너무 오래 걸려요**
> 정상입니다. Rust 의존성을 모두 컴파일해야 하므로 첫 빌드에 5~10분 정도 소요됩니다. 이후 빌드는 훨씬 빠릅니다.

**Q: 빌드한 앱을 실행하면 "개발자를 확인할 수 없음" 경고가 나와요**
> 코드 서명이 되지 않은 빌드이므로 정상입니다. **시스템 설정 > 개인정보 보호 및 보안**에서 "확인 없이 열기"를 클릭하거나, 앱을 우클릭 → "열기"로 실행하세요.
