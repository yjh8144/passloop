# PassLoop Backup Server

一个轻量化的 PassLoop 配置备份 API 服务端。它只暴露 HTTP API，不包含页面。

## 功能

- 使用用户名和密码上传配置 JSON。
- 上传时如果用户不存在，会自动注册。
- 密码使用 Node.js `crypto.scrypt` 哈希保存，不明文落盘。
- 支持分页获取当前用户的备份列表。
- 支持下载指定备份 JSON，用于在 PassLoop 前端还原。
- 数据保存在本地文件系统，默认目录是 `server/data/`。

## 启动

```bash
cd server
npm start
```

默认监听：

```text
http://127.0.0.1:8787
```

可用环境变量：

```bash
HOST=0.0.0.0 PORT=8787 PASSLOOP_DATA_DIR=/path/to/data MAX_BODY_BYTES=10485760 npm start
```

## API

所有接口都使用 JSON 请求体，除下载接口外也返回 JSON。

### 健康检查

```http
GET /health
```

响应：

```json
{
  "ok": true,
  "service": "passloop-backup-server"
}
```

### 上传配置备份

```http
POST /api/backups
```

请求：

```json
{
  "username": "alice",
  "password": "secret123",
  "note": "before changing browser",
  "config": {
    "version": 1,
    "lists": [
      {
        "id": "list-1",
        "name": "Demo",
        "description": "",
        "questions": [],
        "createdAt": "2026-06-04T00:00:00.000Z",
        "updatedAt": "2026-06-04T00:00:00.000Z"
      }
    ],
    "activeListId": "list-1",
    "attempts": [],
    "settings": {
      "theme": "mint",
      "language": "zh",
      "autoNext": false,
      "autoNextPause": true,
      "autoNextScope": "all",
      "viewMode": "single",
      "practiceMode": "practice",
      "sortMode": "manual",
      "typeOrder": ["single", "multiple", "boolean", "blank", "short"],
      "submitMode": "each",
      "revealMode": "immediate",
      "randomSeed": 0
    }
  }
}
```

说明：

- 如果 `alice` 不存在，会自动注册。
- 如果 `alice` 已存在，必须提供正确密码。
- `config` 必须是 JSON 对象。

响应：

```json
{
  "ok": true,
  "registered": true,
  "backup": {
    "id": "b4e045d7-4aa1-4b31-9b61-8f25b85e59b5",
    "note": "before changing browser",
    "sizeBytes": 1234,
    "createdAt": "2026-06-02T12:00:00.000Z"
  }
}
```

### 分页获取备份列表

```http
POST /api/backups/list
```

请求：

```json
{
  "username": "alice",
  "password": "secret123",
  "page": 1,
  "pageSize": 20
}
```

响应：

```json
{
  "ok": true,
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1,
  "items": [
    {
      "id": "b4e045d7-4aa1-4b31-9b61-8f25b85e59b5",
      "note": "before changing browser",
      "sizeBytes": 1234,
      "createdAt": "2026-06-02T12:00:00.000Z"
    }
  ]
}
```

### 下载指定备份

```http
POST /api/backups/download
```

请求：

```json
{
  "username": "alice",
  "password": "secret123",
  "backupId": "b4e045d7-4aa1-4b31-9b61-8f25b85e59b5"
}
```

响应是备份时上传的原始 JSON，并带有：

```http
Content-Disposition: attachment; filename="passloop-alice-b4e045d7-4aa1-4b31-9b61-8f25b85e59b5.json"
```

## 数据结构

默认会创建：

```text
server/data/users.json
server/data/backups/<username>/<backupId>.json
```

`users.json` 只保存用户索引、密码哈希和备份元数据；完整配置 JSON 独立保存为文件。

## 安全提示

- 这个服务端适合轻量自托管，不建议直接裸奔暴露到公网。
- 如果部署到公网，建议放到 HTTPS 反向代理后面，并设置合理的访问控制。
- 当前实现没有 JWT/session，每次请求都用用户名和密码鉴权，方便与简单前端直接集成。
- 默认最大请求体是 5MB，可通过 `MAX_BODY_BYTES` 调整。
