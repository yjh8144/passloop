# Cloudflare Workers 部署

本目录包含 PassLoop CORS 代理的 Cloudflare Workers 版本。适合无自有服务器的用户，利用 Cloudflare 免费计划即可运行。

## 文件说明

| 文件 | 说明 |
|------|------|
| `worker.js` | Worker 入口，处理代理逻辑 |
| `wrangler.toml` | Wrangler CLI 部署配置 |

## 前置条件

- [Cloudflare](https://cloudflare.com) 账户（免费计划即可）
- 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

```bash
npm install -g wrangler
```

## 部署步骤

### 1. 登录 Cloudflare

```bash
wrangler login
```

### 2. 生成并设置密钥

```bash
# 生成随机密钥
openssl rand -hex 32

# 设置为 Worker 加密环境变量
wrangler secret put AUTH_SECRET
# 粘贴刚才生成的密钥，回车确认
```

### 3. 部署 Worker

```bash
cd proxy/cloudflare
wrangler deploy
```

部署成功后输出 Worker URL，类似：

```
https://passloop-proxy.<your-subdomain>.workers.dev
```

### 4. 在 PassLoop 中配置

| 字段 | 填写内容 |
|------|----------|
| 代理 URL | `https://passloop-proxy.<your-subdomain>.workers.dev` |
| 代理密钥 | 第 2 步生成的随机字符串 |

## 自定义

编辑 `wrangler.toml` 可修改 Worker 名称（影响 URL 子域名）：

```toml
name = "passloop-proxy"
```

## 限制

- 免费计划每天 100,000 次请求
- 单次请求执行时间上限 10ms CPU / 30s 挂钟时间
- 部分地区可能无法直接访问 Workers 域名
