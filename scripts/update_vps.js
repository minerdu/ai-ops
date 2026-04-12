const { Client } = require('ssh2');
const fs = require('fs');
const os = require('os');
const path = require('path');

const conn = new Client();
const privateKeyPath = path.join(os.homedir(), '.ssh', 'id_rsa');
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

const updateCommand = `
  set -e
  cd /opt/ai-sales
  sudo git config http.postBuffer 524288000
  echo "Pulling..."
  for i in 1 2 3 4; do
    sudo git pull origin master && break || sleep 5
  done
  echo "Building..."
  sudo npm install
  sudo npm run build
  sudo systemctl restart ai-sales
  echo "✅ VPS SUCCESSFULLY UPDATED"
`;

conn.on('ready', () => {
  console.log('[ssh2] Client :: ready');
  conn.exec(updateCommand, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('[ssh2] Disconnected with code', code);
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
