# PassLoop CORS 代理

PassLoop 是纯前端应用，浏览器直接请求 LLM API 会遇到跨域（CORS）限制。本代理作为中间层，转发请求并添加 CORS 响应头，使前端可以正常调用各家 API。

## 工作原理

```
浏览器 (PassLoop)
    │  带 X-Proxy-Key 头的请求
    ▼
CORS 代理服务
    │  转发请求（保留 Authorization 等认证头）
    ▼
目标 API (OpenAI / Anthropic / Gemini / 任意 URL)
    │  响应
    ▼
代理添加 Access-Control-Allow-Origin: *
    │
    ▼
浏览器收到响应（无 CORS 错误）
```

## 选择部署方式

本目录提供两种部署方案，功能完全一致，选择适合你的即可：

| 方案 | 目录 | 适用场景 |
|------|------|----------|
| [Cloudflare Workers](./cloudflare/) | `proxy/cloudflare/` | 无自有服务器，想快速部署，免费额度够用 |
| [Node.js 自有服务器](./node/) | `proxy/node/` | 有 VPS/云主机，需要完全控制，或 Workers 在你所在地区不可用 |

## 快速开始

### 方案 A：Cloudflare Workers（最简单）

```bash
npm install -g wrangler
wrangler login
cd proxy/cloudflare
wrangler secret put AUTH_SECRET   # 设置密钥
wrangler deploy                   # 部署
```

详见 [cloudflare/README.md](./cloudflare/README.md)

### 方案 B：Node.js 自有服务器

```bash
cd proxy/node
npm install
AUTH_SECRET=$(openssl rand -hex 32) node server.js
```

支持 Docker 和 systemd 守护进程，生产环境建议配合 Nginx + HTTPS。详见 [node/README.md](./node/README.md)

## 代理协议

两种方案使用完全相同的请求格式，客户端无需修改。

### 请求格式

```
GET/POST  https://<代理地址>/?url=<encodeURIComponent(目标URL)>
```

### 请求头

| 头部 | 必需 | 说明 |
|------|------|------|
| `X-Proxy-Key` | 是 | 代理认证密钥，必须与服务端 `AUTH_SECRET` 一致 |
| `Authorization` | 否 | OpenAI / Gemini Bearer Token，自动转发 |
| `x-api-key` | 否 | Anthropic API Key，自动转发 |
| `anthropic-version` | 否 | Anthropic API 版本号，自动转发 |
| `Content-Type` | 否 | 请求体类型，默认 `application/json` |

### 响应

代理原样返回目标服务器的响应体和状态码，并附加 `Access-Control-Allow-Origin: *` 头。

### 错误码

| 状态码 | 含义 |
|--------|------|
| 401 | `X-Proxy-Key` 不匹配 |
| 400 | 缺少 `?url=` 参数 |
| 500 | 代理请求目标服务器时出错 |

## 在 PassLoop 中配置

打开 PassLoop 侧边栏 → LLM 配置：

| 字段 | 填写内容 |
|------|----------|
| 代理 URL | 你部署的代理地址（末尾不加 `/`） |
| 代理密钥 | 部署时设置的 `AUTH_SECRET` 值 |

配置完成后，所有 LLM 请求和远程 URL 导入都会通过代理转发。

## 安全建议

1. **密钥管理**：密钥不要写在代码或配置文件中，使用环境变量或加密存储
2. **HTTPS**：生产环境必须使用 HTTPS，否则密钥和 API Key 会明文传输
3. **定期轮换**：建议每 90 天更换一次代理密钥
4. **访问限制**：如果只有固定 IP 使用，可在 Nginx 或防火墙层面限制来源 IP

## 示例

### 通过代理调用 OpenAI

```bash
curl "https://你的代理地址/?url=https%3A%2F%2Fapi.openai.com%2Fv1%2Fchat%2Fcompletions" \
  -H "X-Proxy-Key: 你的代理密钥" \
  -H "Authorization: Bearer sk-你的openai密钥" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4.1-mini","messages":[{"role":"user","content":"hello"}]}'
```

### 通过代理调用 Anthropic

```bash
curl "https://你的代理地址/?url=https%3A%2F%2Fapi.anthropic.com%2Fv1%2Fmessages" \
  -H "X-Proxy-Key: 你的代理密钥" \
  -H "x-api-key: sk-ant-你的anthropic密钥" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":1024,"messages":[{"role":"user","content":"hello"}]}'
```

### 通过代理下载远程 JSON

```bash
curl "https://你的代理地址/?url=https%3A%2F%2Fexample.com%2Fquestions.json" \
  -H "X-Proxy-Key: 你的代理密钥"
```
