const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, '../certificates/dev.key');
const certPath = path.join(__dirname, '../certificates/dev.cert');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error("SSL development certificates not found in certificates/ directory.");
  console.error("Please run 'npm run dev:https' once to generate them first, or create them manually.");
  process.exit(1);
}

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

const TARGET_PORT = 3000;
const PROXY_PORT = 3002;

const server = https.createServer(options, (req, res) => {
  // Forward HTTP requests to Next.js dev server
  const proxyReq = http.request({
    host: 'localhost',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      'x-forwarded-proto': 'https',
      'x-forwarded-host': req.headers.host
    }
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[HTTPS Proxy] Error forwarding request:', err.message);
    res.writeHead(502);
    res.end('Bad Gateway: Next.js dev server might not be running on port ' + TARGET_PORT);
  });

  req.pipe(proxyReq, { end: true });
});

// Handle WebSocket connections (for Next.js Fast Refresh / HMR)
server.on('upgrade', (req, socket, head) => {
  const proxyReq = http.request({
    host: 'localhost',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    // Write the handshake response back to the client socket
    socket.write(`HTTP/${req.httpVersion} 101 Switching Protocols\r\n`);
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      socket.write(`${key}: ${value}\r\n`);
    }
    socket.write('\r\n');
    
    proxySocket.write(proxyHead);
    proxySocket.pipe(socket).pipe(proxySocket);
  });

  proxyReq.on('error', (err) => {
    console.error('[HTTPS Proxy] WebSocket upgrade error:', err.message);
    socket.destroy();
  });

  proxyReq.end();
});

server.listen(PROXY_PORT, () => {
  console.log(`\n==================================================`);
  console.log(`[HTTPS Proxy] Running successfully!`);
  console.log(`- HTTP Dev Server:  http://localhost:${TARGET_PORT}`);
  console.log(`- HTTPS Dev Server: https://localhost:${PROXY_PORT}`);
  console.log(`==================================================\n`);
});
