# PassLoop 数据保存端部署指南

本文档说明如何把 `server/` 下的 PassLoop 数据保存端部署到一台服务器上。这个服务端是一个轻量 Node.js API 服务，只负责保存、列出和下载用户上传的 PassLoop 配置 JSON，不提供网页界面。

## 1. 服务端概览

项目位置：

```text
passloop/server
```

核心文件：

```text
server/package.json
server/src/server.js
server/data/.gitignore
```

默认启动后监听：

```text
http://127.0.0.1:8787
```

默认数据目录：

```text
server/data/
```

生产环境建议改成系统目录，例如：

```text
/var/lib/passloop-backup
```

## 2. 环境要求

最低要求：

- Linux 服务器，推荐 Ubuntu / Debian。
- Node.js 18 或以上版本。
- 一个用于运行服务的普通系统用户。
- 如果公网访问，建议使用 Nginx 或 Caddy 做 HTTPS 反向代理。

查看 Node.js 版本：

```bash
node -v
```

如果版本低于 18，请先升级 Node.js。

## 3. 环境变量

服务端支持以下环境变量：

```bash
HOST=127.0.0.1
PORT=8787
PASSLOOP_DATA_DIR=/var/lib/passloop-backup
MAX_BODY_BYTES=5242880
CORS_ORIGIN=https://your-passloop-site.example.com
```

说明：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | 服务监听地址。反向代理部署推荐保持 `127.0.0.1`。 |
| `PORT` | `8787` | 服务监听端口。 |
| `PASSLOOP_DATA_DIR` | `server/data` | 用户索引和备份 JSON 保存目录。 |
| `MAX_BODY_BYTES` | `5242880` | 最大请求体大小，默认 5MB。 |
| `CORS_ORIGIN` | `*` | 允许跨域访问的前端来源。公网部署建议设置成前端站点域名。 |

## 4. 推荐目录规划

推荐把代码和数据分开：

```text
/opt/passloop/server              # 服务端代码
/var/lib/passloop-backup          # 备份数据
/etc/passloop-backup.env          # 环境变量
```

创建运行用户和目录：

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin passloop
sudo mkdir -p /opt/passloop
sudo mkdir -p /var/lib/passloop-backup
sudo chown -R passloop:passloop /var/lib/passloop-backup
```

把项目代码放到 `/opt/passloop` 后，确认目录大致如下：

```text
/opt/passloop/server/package.json
/opt/passloop/server/src/server.js
```

设置代码目录权限：

```bash
sudo chown -R passloop:passloop /opt/passloop
```

## 5. 创建环境变量文件

创建 `/etc/passloop-backup.env`：

```bash
sudo nano /etc/passloop-backup.env
```

写入：

```bash
HOST=127.0.0.1
PORT=8787
PASSLOOP_DATA_DIR=/var/lib/passloop-backup
MAX_BODY_BYTES=5242880
CORS_ORIGIN=https://your-passloop-site.example.com
```

如果只是内网测试，可以先写：

```bash
HOST=0.0.0.0
PORT=8787
PASSLOOP_DATA_DIR=/var/lib/passloop-backup
MAX_BODY_BYTES=5242880
CORS_ORIGIN=*
```

设置权限：

```bash
sudo chown root:passloop /etc/passloop-backup.env
sudo chmod 640 /etc/passloop-backup.env
```

## 6. 直接启动测试

先用普通命令确认服务能启动：

```bash
cd /opt/passloop/server
sudo -u passloop env $(cat /etc/passloop-backup.env) npm start
```

看到类似输出即可：

```text
PassLoop backup server listening on http://127.0.0.1:8787
Data directory: /var/lib/passloop-backup
```

另开一个终端验证健康检查：

```bash
curl http://127.0.0.1:8787/health
```

预期响应：

```json
{"ok":true,"service":"passloop-backup-server"}
```

确认没问题后按 `Ctrl+C` 停止临时进程。

## 7. 使用 systemd 守护运行

生产环境推荐使用 systemd，让服务开机自启、异常自动重启。

创建 service 文件：

```bash
sudo nano /etc/systemd/system/passloop-backup.service
```

写入：

```ini
[Unit]
Description=PassLoop Backup Server
After=network.target

[Service]
Type=simple
User=passloop
Group=passloop
WorkingDirectory=/opt/passloop/server
EnvironmentFile=/etc/passloop-backup.env
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

注意：如果 `npm` 不在 `/usr/bin/npm`，先查看实际路径：

```bash
which npm
```

然后把 `ExecStart=/usr/bin/npm start` 改成实际路径。

加载并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable passloop-backup
sudo systemctl start passloop-backup
```

查看状态：

```bash
sudo systemctl status passloop-backup
```

查看日志：

```bash
sudo journalctl -u passloop-backup -f
```

重启服务：

```bash
sudo systemctl restart passloop-backup
```

停止服务：

```bash
sudo systemctl stop passloop-backup
```

## 8. 使用 PM2 运行

如果你更熟悉 PM2，也可以这样部署。

安装 PM2：

```bash
npm install -g pm2
```

启动：

```bash
cd /opt/passloop/server
sudo -u passloop env HOST=127.0.0.1 PORT=8787 PASSLOOP_DATA_DIR=/var/lib/passloop-backup pm2 start src/server.js --name passloop-backup
```

保存进程列表：

```bash
pm2 save
```

配置开机自启：

```bash
pm2 startup
```

查看日志：

```bash
pm2 logs passloop-backup
```

重启：

```bash
pm2 restart passloop-backup
```

如果已经使用 systemd，通常不需要再使用 PM2，二选一即可。

## 9. Nginx 反向代理

公网部署建议不要直接暴露 Node.js 服务端口，而是让 Node 只监听 `127.0.0.1:8787`，由 Nginx 暴露 HTTPS。

示例域名：

```text
backup.example.com
```

Nginx 配置：

```nginx
server {
    listen 80;
    server_name backup.example.com;

    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

保存为：

```text
/etc/nginx/sites-available/passloop-backup
```

启用：

```bash
sudo ln -s /etc/nginx/sites-available/passloop-backup /etc/nginx/sites-enabled/passloop-backup
sudo nginx -t
sudo systemctl reload nginx
```

如果 `MAX_BODY_BYTES` 调大了，例如 10MB，也要同步调整：

```nginx
client_max_body_size 10m;
```

## 10. 配置 HTTPS

公网部署必须使用 HTTPS，否则用户名和密码会明文经过网络。

常见做法是用 Certbot 给 Nginx 配证书：

```bash
sudo certbot --nginx -d backup.example.com
```

配置完成后验证：

```bash
curl https://backup.example.com/health
```

预期响应：

```json
{"ok":true,"service":"passloop-backup-server"}
```

如果只是内网使用，也建议在可信网络内访问，不要把 `8787` 端口直接开放到公网。

## 11. 防火墙建议

反向代理部署时，公网只需要开放 80 和 443：

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

不建议开放 Node 端口：

```bash
sudo ufw deny 8787/tcp
```

如果你明确要内网直连，才开放 `8787`：

```bash
sudo ufw allow from 192.168.0.0/16 to any port 8787 proto tcp
```

## 12. 接口验证

健康检查：

```bash
curl https://backup.example.com/health
```

上传配置：

```bash
curl -X POST https://backup.example.com/api/backups \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "secret123",
    "note": "first backup",
    "config": {
      "version": 1,
      "lists": [],
      "activeListId": "",
      "attempts": [],
      "settings": {}
    }
  }'
```

分页获取备份列表：

```bash
curl -X POST https://backup.example.com/api/backups/list \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "secret123",
    "page": 1,
    "pageSize": 20
  }'
```

下载备份：

```bash
curl -X POST https://backup.example.com/api/backups/download \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "secret123",
    "backupId": "替换成列表接口返回的 id"
  }' \
  -o passloop-backup.json
```

## 13. 数据目录说明

数据目录结构：

```text
/var/lib/passloop-backup/users.json
/var/lib/passloop-backup/backups/<username>/<backupId>.json
```

`users.json` 保存：

- 用户名。
- 密码哈希和 salt。
- 备份元数据列表。

`backups/<username>/<backupId>.json` 保存：

- 用户上传的原始 PassLoop 配置 JSON。

不要手动编辑 `users.json`，除非你知道自己在恢复什么。

## 14. 数据备份

生产环境最重要的是备份 `PASSLOOP_DATA_DIR`。

例如：

```bash
sudo tar -czf passloop-backup-data-$(date +%F).tar.gz -C /var/lib passloop-backup
```

建议：

- 至少每天备份一次。
- 备份文件放到另一台机器或对象存储。
- 定期做恢复演练。

恢复时：

```bash
sudo systemctl stop passloop-backup
sudo mkdir -p /var/lib/passloop-backup
sudo tar -xzf passloop-backup-data-2026-06-03.tar.gz -C /var/lib
sudo chown -R passloop:passloop /var/lib/passloop-backup
sudo systemctl start passloop-backup
```

恢复后验证：

```bash
curl http://127.0.0.1:8787/health
```

## 15. 更新服务端代码

如果是从 git 更新：

```bash
cd /opt/passloop
sudo -u passloop git pull
sudo systemctl restart passloop-backup
```

如果是手动上传代码，替换 `/opt/passloop/server` 后重启：

```bash
sudo systemctl restart passloop-backup
```

更新前建议先备份数据目录：

```bash
sudo tar -czf passloop-backup-data-before-update-$(date +%F).tar.gz -C /var/lib passloop-backup
```

## 16. 与前端集成时的注意事项

前端调用服务端时，需要使用完整 API 地址，例如：

```text
https://backup.example.com/api/backups
```

如果前端站点和服务端不是同源，需要设置：

```bash
CORS_ORIGIN=https://your-passloop-site.example.com
```

如果暂时本地开发，可以使用：

```bash
CORS_ORIGIN=*
```

生产环境不建议长期使用 `*`，尤其是服务端放在公网时。

## 17. 安全建议

- 必须使用 HTTPS 访问公网服务。
- 不要把 `PASSLOOP_DATA_DIR` 放在 Web 静态目录中。
- 不要开放 `server/data` 给 Nginx 静态访问。
- 使用强密码，避免简单密码被猜中。
- 通过防火墙限制 Node 原始端口。
- 定期备份 `/var/lib/passloop-backup`。
- 如果未来用户量增大，建议迁移到数据库并加入限流、登录会话和审计日志。

## 18. 常见问题

### 端口被占用

查看占用：

```bash
sudo lsof -i :8787
```

解决：

- 停掉占用进程。
- 或修改 `PORT`。

### systemd 启动失败

查看日志：

```bash
sudo journalctl -u passloop-backup -n 100 --no-pager
```

常见原因：

- `ExecStart` 中的 `npm` 路径不对。
- `/var/lib/passloop-backup` 没有写权限。
- 环境变量文件格式错误。
- Node.js 版本低于 18。

### 上传返回 413

说明请求体超过限制。

需要同时调整服务端和 Nginx：

```bash
MAX_BODY_BYTES=10485760
```

Nginx：

```nginx
client_max_body_size 10m;
```

然后重启服务并 reload Nginx：

```bash
sudo systemctl restart passloop-backup
sudo systemctl reload nginx
```

### 浏览器跨域失败

检查 `CORS_ORIGIN`：

```bash
sudo systemctl show passloop-backup --property=Environment
```

如果前端域名是：

```text
https://passloop.example.com
```

则服务端应设置：

```bash
CORS_ORIGIN=https://passloop.example.com
```

修改 `/etc/passloop-backup.env` 后重启：

```bash
sudo systemctl restart passloop-backup
```

### 列表为空但文件存在

列表接口读取的是 `users.json` 中的备份元数据。不要只复制 `backups/` 文件夹，还要一起复制 `users.json`。

正确恢复时必须完整恢复整个 `PASSLOOP_DATA_DIR`。

## 19. 最小生产部署清单

上线前确认：

- Node.js 版本 >= 18。
- 服务使用普通用户运行，不使用 root。
- `PASSLOOP_DATA_DIR` 已设置到持久目录。
- 数据目录权限归运行用户所有。
- systemd 或 PM2 已配置守护运行。
- 反向代理已配置 HTTPS。
- `CORS_ORIGIN` 已设置为前端正式域名。
- 防火墙没有直接暴露 Node 原始端口。
- `/health` 返回正常。
- 上传、列表、下载三个接口都验证通过。
- 数据目录已经纳入定期备份。
