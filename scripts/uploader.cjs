const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = 8080;
const DEFAULT_HOST = '127.0.0.1';
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

function resolveUploadPath(publicDir, filename) {
  if (typeof filename !== 'string' || filename.length === 0) {
    throw new Error('Invalid filename');
  }

  if (
    path.isAbsolute(filename) ||
    filename !== path.basename(filename) ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename === '.' ||
    filename === '..'
  ) {
    throw new Error('Invalid filename');
  }

  const resolvedPublicDir = path.resolve(publicDir);
  const targetPath = path.resolve(resolvedPublicDir, filename);
  const relative = path.relative(resolvedPublicDir, targetPath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid filename');
  }

  return targetPath;
}

function getListenHost(env = process.env) {
  return env.UPLOADER_HOST || DEFAULT_HOST;
}

function getListenPort(env = process.env) {
  const port = Number(env.UPLOADER_PORT || DEFAULT_PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('Invalid UPLOADER_PORT');
  }
  return port;
}

function createUploaderServer({ publicDir = PUBLIC_DIR } = {}) {
  return http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Uploader Rápido - ConectaPeru</title>
          <style>
            body { font-family: system-ui; background: #1A1A2E; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .drop-zone { border: 2px dashed #F39C12; border-radius: 12px; padding: 40px; text-align: center; background: #27272A; width: 400px; transition: 0.3s; }
            .drop-zone.dragover { background: #C0392B; border-color: white; }
            .btn { background: #F39C12; color: #1A1A2E; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer; margin-top: 15px; }
            input[type="file"] { display: none; }
            #status { margin-top: 15px; font-size: 14px; color: #27AE60; }
          </style>
        </head>
        <body>
          <h2>Sube tus imágenes aquí</h2>
          <div class="drop-zone" id="drop-zone" onclick="document.getElementById('file-input').click()">
            <p>Arrastra los archivos o haz click aquí</p>
            <input type="file" id="file-input" multiple>
          </div>
          <div id="status"></div>

          <script>
            const dropZone = document.getElementById('drop-zone');
            const fileInput = document.getElementById('file-input');
            const status = document.getElementById('status');

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
              dropZone.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

            ['dragenter', 'dragover'].forEach(eventName => {
              dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
              dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
            });

            dropZone.addEventListener('drop', handleDrop, false);
            fileInput.addEventListener('change', (e) => uploadFiles(e.target.files), false);

            function handleDrop(e) { uploadFiles(e.dataTransfer.files); }

            async function uploadFiles(files) {
              status.innerHTML = 'Subiendo...';
              for (let file of files) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                  const base64 = e.target.result.split(',')[1];
                  await fetch('/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: file.name, base64 })
                  });
                  status.innerHTML += '<br>✅ ' + file.name + ' subido.';
                };
                reader.readAsDataURL(file);
              }
            }
          </script>
        </body>
        </html>
      `);
      return;
    }

    if (req.method === 'POST' && req.url === '/upload') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          const { filename, base64 } = JSON.parse(body);
          const targetPath = resolveUploadPath(publicDir, filename);
          fs.writeFileSync(targetPath, Buffer.from(base64, 'base64'));
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          console.log(`✅ Subido: ${filename}`);
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });
}

function startServer(env = process.env) {
  const server = createUploaderServer();
  const host = getListenHost(env);
  const port = getListenPort(env);
  server.listen(port, host, () => {
    console.log(`🚀 Uploader web listo en http://${host}:${port}`);
    if (host === '0.0.0.0') {
      console.log('⚠️  UPLOADER_HOST=0.0.0.0 habilita acceso desde la red. Úsalo solo en entornos confiables.');
    }
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  PUBLIC_DIR,
  createUploaderServer,
  getListenHost,
  getListenPort,
  resolveUploadPath,
  startServer,
};
