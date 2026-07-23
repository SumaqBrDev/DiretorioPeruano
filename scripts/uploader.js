const http = require('http');
const fs = require('fs');
const path = require('path');
const { parse } = require('querystring');

const PUBLIC_DIR = path.join('C:', 'openclaw_workspace', 'Proyectos', 'DiretorioPeruano', 'public');

const server = http.createServer((req, res) => {
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
        const targetPath = path.join(PUBLIC_DIR, filename);
        fs.writeFileSync(targetPath, Buffer.from(base64, 'base64'));
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        console.log(\`✅ Subido: \${filename}\`);
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  }
});

server.listen(8080, '0.0.0.0', () => {
  console.log('🚀 Uploader web listo en el puerto 8080 (accesible vía Tailscale)');
});
