# Node.js 自有服务器部署

本目录包含 PassLoop CORS 代理的 Node.js 独立服务器版本。适合有自己 VPS 或云服务器的用户。

## 文件说明

| 文件 | 说明 |
|------|------|
| `server.js` | Express 代理服务器 |
| `package.json` | 依赖声明 |
| `Dockerfile` | Docker 容器化部署配置 |

## 前置条件

- Node.js 18+（需要原生 `fetch` 支持）
- 一台可公网访问的服务器（VPS、云主机等）

## 部署方式

### 方式一：直接运行

```bash
cd proxy/node
npm install

# 生成随机密钥
openssl rand -hex 32

# 启动服务（替换为你的密钥）
AUTH_SECRET=你的密钥 node server.js

# 指定端口
AUTH_SECRET=你的密钥 node server.js --port=8080
```

服务默认监听 `3001` 端口，可通过 `--port=端口号` 参数或 `PORT` 环境变量修改。

### 方式二：Docker 部署

```bash
cd proxy/node
docker build -t passloop-proxy .
docker run -d --name passloop-proxy \
  -p 3001:3001 \
  -e AUTH_SECRET=你的密钥 \
  --restart unless-stopped \
  passloop-proxy
```

### 方式三：systemd 守护进程（推荐 Linux 服务器）

1. 将文件复制到服务器：

```bash
scp -r proxy/node/* yourserver:/opt/passloop-proxy/
ssh yourserver "cd /opt/passloop-proxy && npm install"
```

2. 创建 systemd 服务文件 `/etc/systemd/system/passloop-proxy.service`：

```ini
[Unit]
Description=PassLoop CORS Proxy
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/passloop-proxy
ExecStart=/usr/bin/node server.js
Environment=AUTH_SECRET=你的密钥
Environment=PORT=3001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

3. 启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now passloop-proxy
sudo systemctl status passloop-proxy
```

## 生产环境建议：Nginx 反向代理 + HTTPS

裸跑 HTTP 不安全（密钥明文传输），生产环境务必加 HTTPS。

1. 安装 Nginx 和 Certbot：

```bash
sudo apt install nginx certbot python3-certbot-nginx
```

2. 创建 Nginx 配置 `/etc/nginx/sites-available/passloop-proxy`：

```nginx
server {
    listen 80;
    server_name proxy.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

3. 启用站点并申请 SSL 证书：

```bash
sudo ln -s /etc/nginx/sites-available/passloop-proxy /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d proxy.yourdomain.com
```

Certbot 会自动配置 HTTPS 并设置证书自动续期。

## 在 PassLoop 中配置

| 字段 | 填写内容 |
|------|----------|
| 代理 URL | `https://proxy.yourdomain.com`（或 `http://服务器IP:3001`） |
| 代理密钥 | 你设置的 `AUTH_SECRET` 值 |

## 验证

```bash
# 测试代理是否正常工作
curl "http://localhost:3001/?url=https%3A%2F%2Fhttpbin.org%2Fget" \
  -H "X-Proxy-Key: 你的密钥"

# 测试认证失败
curl "http://localhost:3001/?url=https%3A%2F%2Fhttpbin.org%2Fget" \
  -H "X-Proxy-Key: 错误的密钥"
# 应返回 401 Unauthorized
```
