const { Client } = require('ssh2');
const fs = require('fs');
const os = require('os');
const path = require('path');

const conn = new Client();
const privateKeyPath = path.join(os.homedir(), '.ssh', 'id_rsa');
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

const setupHysteriaCmd = `
set -e

# 1. Download Hysteria2
echo "Downloading Hysteria2 using ghproxy mirror..."
sudo systemctl stop hysteria || true
sudo rm -f /usr/local/bin/hysteria || true
sudo wget -qO /usr/local/bin/hysteria "https://ghfast.top/https://github.com/apernet/hysteria/releases/download/app%2Fv2.4.0/hysteria-linux-amd64" || sudo wget -qO /usr/local/bin/hysteria "https://ghp.ci/https://github.com/apernet/hysteria/releases/download/app%2Fv2.4.0/hysteria-linux-amd64"
sudo chmod +x /usr/local/bin/hysteria

# 2. Create Hysteria2 Config
echo "Creating Hysteria2 Config..."
sudo mkdir -p /etc/hysteria
sudo tee /etc/hysteria/config.yaml > /dev/null << 'EOF'
server: olf.bluepig.top:443
auth: 1dfu4E8QT65Wjz7m2GbJatzV
tls:
  sni: olf.bluepig.top
  insecure: false
socks5:
  listen: 127.0.0.1:10808
http:
  listen: 127.0.0.1:10809
bandwidth:
  up: 50 mbps
  down: 200 mbps
EOF

# 3. Create Systemd Service for Hysteria
echo "Creating Hysteria Service..."
sudo tee /etc/systemd/system/hysteria.service > /dev/null << 'EOF'
[Unit]
Description=Hysteria2 Client
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/hysteria client -c /etc/hysteria/config.yaml
Restart=on-failure
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable hysteria
sudo systemctl restart hysteria

# 4. Modify ai-sales systemd service to use proxy conditionally
echo "Modifying AI-Sales Service for Proxy..."
sudo tee /etc/systemd/system/ai-sales.service > /dev/null << 'EOF'
[Unit]
Description=AI Sales Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ai-sales
ExecStart=/usr/bin/node /opt/ai-sales/node_modules/.bin/next start -p 3000
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment="HTTP_PROXY=http://127.0.0.1:10809"
Environment="HTTPS_PROXY=http://127.0.0.1:10809"
Environment="NO_PROXY=localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16,172.16.0.0/12,gateway.bilinl.com,tencentyun.com"

[Install]
WantedBy=multi-user.target
EOF

# 5. Restart ai-sales
sudo systemctl daemon-reload
sudo systemctl restart ai-sales

echo "✅ HYSTERIA PROXY CONFIGURED AND NEXT.JS APP RESTARTED"
# Test the proxy
sleep 2
echo "Testing proxy connection to openai..."
curl -s --proxy http://127.0.0.1:10809 https://api.openai.com/v1/models || echo "Failed to reach openai"
`;

conn.on('ready', () => {
  console.log('[ssh2] Client :: ready');
  conn.exec(setupHysteriaCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('[ssh2] Disconnected. Code:', code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('[ssh2] Error: ', err);
}).connect({
  host: '101.33.199.203',
  port: 22,
  username: 'ubuntu',
  keepaliveInterval: 10000,
  privateKey: privateKey,
  algorithms: {
    serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa']
  }
});
