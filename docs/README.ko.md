# PassLoop

[中文](../README.md) | [English](README.en.md) | [日本語](README.ja.md) | [Français](README.fr.md)

로컬 경량 문제 연습 플랫폼. 문제 가져오기/내보내기, 다양한 연습 모드, LLM 보조 분석, 오답 관리, 답변 통계를 지원합니다. 모든 데이터는 브라우저 localStorage에 저장되며 백엔드 없이 바로 사용할 수 있습니다.

## 스크린샷

![문제 관리](screenshot-home.png)

![연습 모드](screenshot-practice.png)

## 기능

### 연습

- **연습 모드**: 하나씩 답하고, 제출 후 정오와 해설 표시
- **암기 모드**: 정답과 해설을 바로 표시하여 암기 보조
- **한 문제 / 전체**: 하나씩 보거나 전체 한꺼번에 제출
- **답 공개**: 즉시 공개 또는 완료 후 공개
- **답 후 자동 다음**: 빠른 연습 페이스 옵션
- **검색 및 필터**: 제목, 본문, 유형으로 빠르게 검색
- **내비게이션 그리드**: 색상 코딩으로 답변 상태 시각화
- **완료 요약**: 모든 문제 완료 후 정답률과 시간 요약

### 문제 유형

- 단일 선택, 다중 선택, 참/거짓, 빈칸 채우기, 서술형, 복합 문제(하위 문제 포함)

### 문제 관리

- 수동으로 문제 추가, 편집, 삭제
- JSON 가져오기/내보내기(로컬 파일 또는 URL에서 가져오기, 로딩 애니메이션 포함)
- 목록 생성, 편집, 삭제
- 전체 백업 및 복원(병합 또는 덮어쓰기 모드)
- 플로팅 편집 패널, 작은 화면에서도 편리하게 관리

### LLM 보조

- OpenAI / Anthropic / Gemini 또는 호환 API 연결
- CORS 프록시 지원, 크로스 오리진 문제 해결
- 정리되지 않은 텍스트를 붙여넣거나 업로드, 원클릭으로 표준 퀴즈 JSON 변환
- 답과 해설 자동 보충(스트리밍 미리보기 지원)
- 연결 테스트 및 모델 목록 가져오기
- 자체 모드: 외부 AI 생성 JSON을 수동으로 붙여넣어 검증 후 가져오기

### 오답 관리

- 오답 자동 수집
- 연습 중 오답 목록을 만들거나 내보내 집중 복습
- 세션 타이머와 실시간 통계

### 답변 통계

- 정답률, 평균 시간
- 제출 진행률 추적
- 문제별 통계
- 오답 수 통계

### 개인화 및 반응형

- 7가지 테마: Mint, Paper, Lavender, Ocean, Rose, Night, Nord
- 5개 언어: 중국어, English, 日本語, 한국어, Français
- 반응형 레이아웃(데스크톱 및 모바일)
- 모바일 하단 내비게이션 바 및 플로팅 패널
- 사이드바 접기 가능

## 기술 스택

| 카테고리 | 기술 |
|----------|------|
| 프레임워크 | React 18 |
| 언어 | TypeScript |
| 빌드 | Vite 7 |
| 아이콘 | Lucide React |
| 저장소 | localStorage |
| 배포 | 순수 정적 파일, 모든 웹 서버 |

## 빠른 시작

### 바로 사용(설치 불필요)

[Releases](https://github.com/yjh8144/passloop/releases)에서 `passloop.html`을 다운로드하고 브라우저에서 열면 됩니다. 모든 기능이 하나의 파일에 통합되어 있습니다.

### 로컬 개발

요구사항: Node.js >= 18, npm >= 9

```bash
# 프로젝트 클론
git clone https://github.com/yjh8144/passloop.git
cd passloop

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행되며 LAN 접근을 지원합니다.

### Lint 및 포맷

```bash
npm run lint      # ESLint 검사
npm run format    # Prettier 포맷
```

### 프로덕션 빌드

```bash
npm run build          # 일반 빌드, dist/에 출력
npm run build:single   # 단일 파일 빌드, dist-single/index.html에 출력
```

출력은 `dist/`에 생성됩니다. 단일 파일 버전은 `dist-single/index.html`로 브라우저에서 바로 열 수 있습니다.

### 프로덕션 미리보기

```bash
npm run preview
```

## 배포

PassLoop 빌드 결과물은 순수 정적 파일(HTML + CSS + JS)이며 모든 정적 호스팅 서비스(Vercel, Netlify, GitHub Pages, Cloudflare Pages 등)에 배포하거나 Nginx/Docker로 자체 호스팅할 수 있습니다.

빌드 명령어: `npm run build`, 출력 디렉터리: `dist`.

## CORS 프록시

LLM API에는 크로스 오리진 제한이 있습니다. `proxy/` 디렉터리에 2가지 프록시 방안을 제공합니다:

- **Cloudflare Workers** — 서버리스, 무료 할당량
- **Node.js** — 자체 VPS 배포, Docker 지원

자세한 내용은 [proxy/README.md](../proxy/README.md)를 참조하세요.

## 데이터

모든 사용자 데이터는 브라우저 localStorage에 저장됩니다:

| Key | 내용 |
|-----|------|
| `passloop.app.v1` | 문제, 목록, 답변 기록, 설정 |
| `passloop.llm-config.v2` | LLM 제공자 구성(API 키 제외) |
| `passloop.proxy.v1` | CORS 프록시 구성(프록시 키 제외) |
| `passloop.debug` | 디버그 모드 토글 |

브라우저 데이터를 삭제하면 모든 문제와 기록이 사라집니다. 정기적으로 백업을 내보내세요.

## 라이선스

MIT
