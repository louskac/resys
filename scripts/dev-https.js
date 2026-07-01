const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const certDir = path.join(__dirname, '..', 'certificates');
const keyPath = path.join(certDir, 'dev.key');
const certPath = path.join(certDir, 'dev.cert');

// Ensure certificates directory exists
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.log('SSL development certificates not found. Generating wildcard certificates for localhost and *.localhost...');
  
  // Try using mkcert if available
  let generated = false;
  try {
    execSync('which mkcert', { stdio: 'ignore' });
    console.log('Found mkcert! Generating trusted local certificates...');
    execSync(
      `mkcert -key-file "${keyPath}" -cert-file "${certPath}" localhost "*.localhost" sfera.localhost umelka.localhost zskomenskeho.localhost londonfit.localhost`,
      { stdio: 'inherit' }
    );
    console.log('Trusted local certificates generated successfully with mkcert.');
    generated = true;
  } catch (e) {
    console.log('mkcert is not installed. Falling back to self-signed openssl wildcard certificate.');
  }

  if (!generated) {
    try {
      // Run openssl to generate self-signed wildcard certificate
      execSync(
        `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -sha256 -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,DNS:*.localhost,DNS:sfera.localhost,DNS:umelka.localhost,DNS:zskomenskeho.localhost,DNS:londonfit.localhost"`,
        { stdio: 'inherit' }
      );
      console.log('Self-signed SSL wildcard certificates generated successfully with openssl.');
    } catch (error) {
      console.error('Error generating SSL certificates with openssl:', error.message);
      console.error('Please make sure openssl is installed and on your PATH.');
      process.exit(1);
    }
  }
}

console.log('Starting Next.js development server with HTTPS...');

const nextProcess = spawn('npx', [
  'next',
  'dev',
  '--experimental-https',
  '--experimental-https-key',
  `"${keyPath}"`,
  '--experimental-https-cert',
  `"${certPath}"`,
  ...process.argv.slice(2)
], {
  stdio: 'inherit',
  shell: true
});

nextProcess.on('close', (code) => {
  process.exit(code);
});
