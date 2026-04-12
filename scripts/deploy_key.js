const { Client } = require('ssh2');
const fs = require('fs');
const os = require('os');
const path = require('path');

const conn = new Client();
const pubKeyPath = path.join(os.homedir(), '.ssh', 'id_rsa.pub');
const pubKey = fs.readFileSync(pubKeyPath, 'utf8');

conn.on('ready', () => {
  console.log('[ssh2] Client :: ready');
  conn.exec(`mkdir -p ~/.ssh && echo "${pubKey.trim()}" >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys && echo KEY_ADDED_SUCCESSFULLY`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('[ssh2] Key deployed successfully! Closing connection.');
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  console.log('Server prompted for keyboard-interactive. Sending password.');
  finish(['WeClaw@2026']);
}).on('error', (err) => {
  console.error('[ssh2] Error: ', err);
}).connect({
  host: '101.33.199.203',
  port: 22,
  username: 'ubuntu',
  password: 'WeClaw@2026',
  tryKeyboard: true,
  algorithms: {
    serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa']
  }
});
