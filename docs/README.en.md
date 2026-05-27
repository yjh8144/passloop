# PassLoop

[中文](../README.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md)

A local, lightweight quiz platform. Supports question import/export, multiple practice modes, LLM-assisted parsing, wrong answer management, and answer statistics. All data is stored in browser localStorage — no backend needed, ready to use out of the box.

## Screenshots

![Question Bank](screenshot-home.png)

![Practice Mode](screenshot-practice.png)

## Features

### Practice

- **Practice mode**: Answer one by one, see results and explanations after submission
- **Memorize mode**: Directly displays correct answers and explanations for review
- **Single / Paper**: Browse one at a time or submit all answers at once
- **Answer reveal**: Immediate reveal or reveal after completion
- **Auto-next after answer**: Optional fast-paced practice
- **Search & filter**: Quickly locate questions by title, body, or type
- **Navigation grid**: Visual question number panel with color-coded answer status
- **Completion summary**: Shows accuracy and time after finishing all questions

### Question Types

- Single choice, multiple choice, true/false, fill-in-the-blank, short answer

### Question Bank Management

- Manually add, edit, and delete questions
- JSON import/export (local file or URL import with loading animation)
- List creation, editing, and deletion
- Full backup and restore (merge or overwrite mode)
- Floating editor panel, convenient for small screen devices

### LLM Assistance

- Connect to OpenAI / Anthropic / Gemini or any compatible API
- CORS proxy support to resolve cross-origin issues
- Paste or upload unformatted text, one-click conversion to standard quiz JSON
- Auto-fill answers and explanations (with streaming preview)
- Connection test and model list fetching
- Self-fill mode: manually paste AI-generated JSON and validate import

### Wrong Answer Management

- Automatic collection of incorrect answers
- Focused review on wrong questions page
- Export wrong answers as standalone list
- Session timer and real-time statistics

### Answer Statistics

- Accuracy rate, average time
- Submission progress tracking
- Per-question statistics
- Wrong answer count

### Personalization & Responsive

- 7 themes: Mint, Paper, Lavender, Ocean, Rose, Night, Nord
- 5 languages: Chinese, English, Japanese, Korean, French
- Responsive layout for desktop and mobile
- Mobile bottom navigation bar and floating panel
- Collapsible sidebar

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 18 |
| Language | TypeScript |
| Build | Vite 7 |
| Icons | Lucide React |
| Storage | localStorage |
| Deployment | Pure static files, any web server |

## Quick Start

### Direct Use (No Installation)

Download `passloop.html` from [Releases](https://github.com/yjh8144/passloop/releases), open it in your browser. All features are bundled in this single file — no server, no installation needed.

### Local Development

Requirements: Node.js >= 18, npm >= 9

```bash
# Clone the project
git clone https://github.com/yjh8144/passloop.git
cd passloop

# Install dependencies
npm install

# Start dev server
npm run dev
```

The dev server listens on `http://localhost:5173` by default, with LAN access enabled.

### Linting & Formatting

```bash
npm run lint      # ESLint check
npm run format    # Prettier format
```

### Production Build

```bash
npm run build          # Standard build, output to dist/
npm run build:single   # Single-file build, output dist-single/index.html
```

Output goes to `dist/`. The single-file version outputs to `dist-single/index.html` and can be opened directly in a browser.

### Preview Production Build

```bash
npm run preview
```

## Deployment

PassLoop builds to pure static files (HTML + CSS + JS) and can be deployed to any static hosting service (Vercel, Netlify, GitHub Pages, Cloudflare Pages, etc.), or self-hosted with Nginx or Docker.

Build command: `npm run build`, output directory: `dist`.

## CORS Proxy

LLM APIs have cross-origin restrictions. The `proxy/` directory provides two optional proxy solutions:

- **Cloudflare Workers** — Serverless, free tier
- **Node.js** — Self-hosted VPS, Docker support

See [proxy/README.md](../proxy/README.md) for details.

## Data

All user data is stored in browser localStorage:

| Key | Content |
|-----|---------|
| `passloop.app.v1` | Questions, lists, answer records, settings |
| `passloop.llm-config.v1` | LLM API configuration |
| `passloop.debug` | Debug mode toggle |

Clearing browser data will delete all questions and records. Export backups regularly.

## License

MIT
