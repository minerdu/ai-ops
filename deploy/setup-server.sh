#!/bin/bash
# ============================================
# AI-Ops 一键服务器部署脚本
# 在 VPS 上以 root 执行即可
# ============================================
set -e

echo "=========================================="
echo "  AI-Ops VPS 部署脚本"
echo "=========================================="

# 1. 安装 Node.js 20 LTS
echo "[1/7] 安装 Node.js 20..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js: $(node -v)  npm: $(npm -v)"

# 2. 安装必要工具
echo "[2/7] 安装系统依赖..."
apt-get update -qq
apt-get install -y git nginx certbot python3-certbot-nginx ufw

# 3. 克隆项目
echo "[3/7] 克隆项目..."
PROJECT_DIR="/opt/ai-ops"
if [ -d "$PROJECT_DIR" ]; then
  echo "项目目录已存在，拉取最新代码..."
  cd "$PROJECT_DIR"
  git pull origin master
else
  git clone https://github.com/minerdu/AI-Sales.git "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

# 4. 安装依赖 + 构建
echo "[4/7] 安装依赖并构建..."
npm ci --production=false
npx prisma generate

# 创建 .env 文件
cat > .env << 'ENVEOF'
DATABASE_URL="file:./dev.db"
NODE_ENV=production
PORT=3000
ENVEOF

# 初始化数据库
npx prisma db push --accept-data-loss 2>/dev/null || true
npm run build

# 5. 创建 systemd 服务
echo "[5/7] 配置 systemd 服务..."
cat > /etc/systemd/system/ai-ops.service << 'SERVICEEOF'
[Unit]
Description=AI Ops Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ai-ops
ExecStart=/usr/bin/node /opt/ai-ops/node_modules/.bin/next start -p 3000
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable ai-ops
systemctl restart ai-ops

# 6. 配置 Nginx 反向代理
echo "[6/7] 配置 Nginx..."
cat > /etc/nginx/sites-available/ai-ops << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # WebSocket 支持
    location = / {
        return 302 /ops/;
    }

    location /ops/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;

        # 大文件上传
        client_max_body_size 50M;
    }

    # API webhook 专用（更长超时，AI 处理需要时间）
    location /ops/api/wecom/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/ai-ops /etc/nginx/sites-enabled/ai-ops
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 7. 配置防火墙
echo "[7/7] 配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 8. 初始化数据库种子数据
echo "[+] 初始化种子数据..."
sleep 3
curl -s http://127.0.0.1:3000/api/seed > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "  ✅ 部署完成!"
echo "=========================================="
echo ""
echo "  访问地址: http://101.33.199.203/ops/"
echo "  API 地址: http://101.33.199.203/ops/api"
echo "  Webhook:  http://101.33.199.203/ops/api/wecom/webhook"
echo ""
echo "  管理命令:"
echo "    查看状态: systemctl status ai-ops"
echo "    查看日志: journalctl -u ai-ops -f"
echo "    重启服务: systemctl restart ai-ops"
echo ""
