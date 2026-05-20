# PassLoop CORS 代理服务

PassLoop 是纯前端应用，直接从浏览器请求 LLM API 或远程 JSON 文件时会遇到跨域（CORS）限制。此 Cloudflare Worker 脚本作为中间代理，转发请求并添加 CORS 响应头。

## 工作原理

```
浏览器 (PassLoop)
    │
    │  带 X-Proxy-Key 头的请求
    ▼
Cloudflare Worker (本代理)
    │
    │  转发请求（去掉代理头，保留 Authorization 等）
    ▼
目标 API (OpenAI / Anthropic / Gemini / 任意 URL)
    │
    │  响应
    ▼
Worker 添加 Access-Control-Allow-Origin: *
    │
    ▼
浏览器收到响应（无 CORS 错误）
```

## 功能

- 处理 CORS 预检（OPTIONS）请求
- 通过 `X-Proxy-Key` 验证请求者身份，防止滥用
- 转发 `Authorization`、`x-api-key`、`anthropic-version` 等认证头
- 支持所有 HTTP 方法（GET / POST / PUT / DELETE）
- 目标 URL 通过查询参数 `?url=` 传递

## 部署步骤

### 前置条件

- 一个 [Cloudflare](https://cloudflare.com) 账户（免费计划即可）
- 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

```bash
npm install -g wrangler
```

### 1. 登录 Cloudflare

```bash
wrangler login
```

### 2. 设置密钥

生成一个随机字符串作为认证密钥：

```bash
# 生成随机密钥（可用任意方式生成）
openssl rand -hex 32
```

将密钥设置为 Worker 的加密环境变量：

```bash
wrangler secret put AUTH_SECRET
# 粘贴刚才生成的密钥，回车确认
```

### 3. 部署

```bash
cd proxy
wrangler deploy
```

部署成功后会输出 Worker 的 URL，类似：

```
https://passloop-proxy.<your-subdomain>.workers.dev
```

### 4. 在 PassLoop 中配置

打开 PassLoop 侧边栏的 **LLM 配置**：

| 字段 | 填写内容 |
|------|----------|
| 代理 URL | `https://passloop-proxy.<your-subdomain>.workers.dev` |
| 代理密钥 | 第 2 步生成的随机字符串 |

配置完成后，所有 LLM 请求和 URL 导入都会通过你的代理转发。

## 请求格式

代理通过查询参数接收目标 URL：

```
GET/POST https://<worker-url>/?url=<编码后的目标URL>
```

### 必需请求头

| 头部 | 说明 |
|------|------|
| `X-Proxy-Key` | 认证密钥，必须与 `AUTH_SECRET` 匹配 |

### 可选转发头

以下头部会被自动转发到目标服务器：

| 头部 | 用途 |
|------|------|
| `Authorization` | OpenAI / Gemini Bearer Token |
| `x-api-key` | Anthropic API Key |
| `anthropic-version` | Anthropic API 版本号 |
| `Content-Type` | 请求体类型 |

## 使用示例

### 通过代理调用 OpenAI

```bash
curl "https://passloop-proxy.xxx.workers.dev/?url=https%3A%2F%2Fapi.openai.com%2Fv1%2Fchat%2Fcompletions" \
  -H "X-Proxy-Key: 你的代理密钥" \
  -H "Authorization: Bearer sk-你的openai密钥" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4.1-mini","messages":[{"role":"user","content":"hello"}]}'
```

### 通过代理下载远程 JSON 题库

```bash
curl "https://passloop-proxy.xxx.workers.dev/?url=https%3A%2F%2Fexample.com%2Fquestions.json" \
  -H "X-Proxy-Key: 你的代理密钥"
```

## 安全说明

- `AUTH_SECRET` 必须通过 `wrangler secret put` 设置，不要写在代码或 `wrangler.toml` 中
- Worker 免费计划每天 100,000 次请求，一般个人使用绑绑有余
- 建议定期轮换密钥：更新 Worker secret 后同步更新 PassLoop 中的代理密钥配置

## 自定义

如需修改 Worker 名称或其他配置，编辑 `wrangler.toml`：

```toml
name = "passloop-proxy"        # Worker 名称，影响 URL 中的子域名
main = "worker.js"             # 入口文件
compatibility_date = "2024-01-01"
```

## 故障排查

| 症状 | 可能原因 |
|------|----------|
| 401 Unauthorized | 代理密钥不匹配，检查 PassLoop 配置中的密钥是否与 `AUTH_SECRET` 一致 |
| 400 Missing ?url= | 请求未携带目标 URL 参数 |
| 500 Proxy Error | 目标服务器不可达或返回异常 |
| CORS 仍然报错 | 检查是否填写了正确的代理 URL（末尾不要加 `/`） |
