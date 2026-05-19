# PassLoop

纯前端刷题与背题工具。支持题目导入导出、多种练习模式、LLM 辅助解析、错题管理和答题统计。所有数据存储在浏览器 localStorage 中，无需后端服务，开箱即用。

## 功能特性

### 练习模式
- **刷题模式**：逐题作答，提交后显示对错与解析
- **背题模式**：直接展示正确答案，辅助记忆
- **单题 / 整卷**：支持逐题浏览或整卷一次提交
- **答后自动下一题**：可选的快速刷题节奏

### 题库管理
- 手动新增题目（单选、多选、判断、填空、简答、复合题）
- JSON 格式导入导出题目
- 题单创建、编辑、删除
- 全量备份与恢复

### LLM 辅助解析
- 接入 OpenAI / Anthropic / Gemini 或自定义兼容接口
- 自动补充答案与解析
- 支持从文本批量解析题目并导入

### 错题管理
- 自动收录错误记录
- 错题重做
- 错题导出为独立题单

### 答题统计
- 正确率、平均用时
- 提交进度追踪
- 按题目维度统计

### 个性化
- 7 个主题：Mint、Paper、Lavender、Ocean、Rose、Night、Nord
- 5 种语言：中文、English、日本語、한국어、Français
- 响应式布局，适配桌面与移动端

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 |
| 语言 | TypeScript |
| 构建 | Vite 5 |
| 图标 | Lucide React |
| 存储 | localStorage |
| 部署 | 纯静态文件，任意 Web 服务器 |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 本地开发

```bash
# 克隆项目
git clone https://github.com/<your-username>/passloop.git
cd passloop

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

开发服务器默认监听 `http://localhost:5173`，支持局域网访问。

### 构建生产版本

```bash
npm run build
```

产物输出到 `dist/` 目录。

### 本地预览生产版本

```bash
npm run preview
```

## 部署

PassLoop 构建产物为纯静态文件（HTML + CSS + JS），可部署到任何静态托管服务。

### Vercel

1. Fork 或导入仓库到 Vercel
2. Framework Preset 选择 **Vite**
3. 构建命令：`npm run build`
4. 输出目录：`dist`
5. 点击 Deploy

### Netlify

1. 连接 GitHub 仓库
2. Build command：`npm run build`
3. Publish directory：`dist`
4. 点击 Deploy site

### GitHub Pages

1. 在 `vite.config.ts` 中设置 `base`：

```ts
export default defineConfig({
  plugins: [react()],
  base: "/passloop/",
});
```

2. 构建并部署：

```bash
npm run build
```

3. 将 `dist/` 目录内容推送到 `gh-pages` 分支，或使用 GitHub Actions 自动化部署。

### Cloudflare Pages

1. 连接 GitHub 仓库
2. 构建命令：`npm run build`
3. 输出目录：`dist`
4. 部署即完成

### 自托管（Nginx）

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/passloop/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Docker

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

```bash
docker build -t passloop .
docker run -p 8080:80 passloop
```

## 数据说明

所有用户数据存储在浏览器 localStorage 中：

| Key | 内容 |
|-----|------|
| `passloop.app.v1` | 题库、题单、答题记录、设置 |
| `passloop.llm-config.v1` | LLM 接口配置 |
| `passloop.debug` | 调试模式开关 |

清除浏览器数据会导致所有题目和记录丢失，建议定期使用「导出备份」功能保存数据。

## 许可证

MIT
