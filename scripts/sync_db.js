const { Client } = require('ssh2');
const fs = require('fs');
const os = require('os');
const path = require('path');

const conn = new Client();
const privateKeyPath = path.join(os.homedir(), '.ssh', 'id_rsa');
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

const localDbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const remoteDbPath = '/home/ubuntu/dev.db';

conn.on('ready', () => {
  console.log('[ssh2] Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('[sftp] Starting upload of dev.db...');
    
    // Using fastPut to upload the database file
    sftp.fastPut(localDbPath, remoteDbPath, (err) => {
      if (err) throw err;
      console.log('[sftp] dev.db successfully uploaded to home dir!');
      
      // Move to correct location and restart service
      conn.exec('sudo mv /home/ubuntu/dev.db /opt/ai-sales/prisma/dev.db && sudo chown root:root /opt/ai-sales/prisma/dev.db && sudo systemctl restart ai-sales', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log('[ssh2] Service restarted. Disconnected.');
          conn.end();
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
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
