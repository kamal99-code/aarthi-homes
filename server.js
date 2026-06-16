import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple native .env loader
const dotenvPath = path.join(__dirname, '.env');
if (fs.existsSync(dotenvPath)) {
  const envContent = fs.readFileSync(dotenvPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        // Remove outer quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  });
  console.log('Loaded local .env variables');
}

const PORT = process.env.PORT || 8080;

// Helper to determine Content-Type
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg': return 'image/jpeg';
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

// Helper to parse JSON request body
function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
  });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`[${method}] ${pathname}`);

  // CORS headers for local API testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // API Route Simulation
  if (pathname.startsWith('/api/save')) {
    try {
      const handlerModule = await import('./api/save.js');
      const handler = handlerModule.default;
      
      const body = method === 'POST' ? await parseJsonBody(req) : {};
      
      // Mock Vercel req and res
      const mockReq = {
        method,
        body,
        headers: req.headers,
        url: req.url,
      };

      const mockRes = {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
          this.headers[name] = value;
          res.setHeader(name, value);
          return this;
        },
        status(code) {
          this.statusCode = code;
          res.statusCode = code;
          return this;
        },
        json(data) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return this;
        },
        end(data = '') {
          res.end(data);
          return this;
        }
      };

      await handler(mockReq, mockRes);
    } catch (error) {
      console.error('API /api/save error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Internal server error running API handler locally.', error: error.message }));
    }
    return;
  }

  if (pathname.startsWith('/api/cleanup')) {
    try {
      const handlerModule = await import('./api/cleanup.js');
      const handler = handlerModule.default;

      // Mock Vercel req and res
      const mockReq = {
        method,
        body: {},
        headers: req.headers,
        url: req.url,
      };

      const mockRes = {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
          this.headers[name] = value;
          res.setHeader(name, value);
          return this;
        },
        status(code) {
          this.statusCode = code;
          res.statusCode = code;
          return this;
        },
        json(data) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return this;
        },
        end(data = '') {
          res.end(data);
          return this;
        }
      };

      await handler(mockReq, mockRes);
    } catch (error) {
      console.error('API /api/cleanup error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Internal server error running cleanup locally.', error: error.message }));
    }
    return;
  }

  if (pathname.startsWith('/api/history')) {
    try {
      const handlerModule = await import('./api/history.js');
      const handler = handlerModule.default;

      // Mock Vercel req and res
      const mockReq = {
        method,
        body: {},
        headers: req.headers,
        url: req.url,
      };

      const mockRes = {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
          this.headers[name] = value;
          res.setHeader(name, value);
          return this;
        },
        status(code) {
          this.statusCode = code;
          res.statusCode = code;
          return this;
        },
        json(data) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return this;
        },
        end(data = '') {
          res.end(data);
          return this;
        }
      };

      await handler(mockReq, mockRes);
    } catch (error) {
      console.error('API /api/history error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Internal server error running history API locally.', error: error.message }));
    }
    return;
  }

  if (pathname.startsWith('/api/delete-calculation')) {
    try {
      const handlerModule = await import('./api/delete-calculation.js');
      const handler = handlerModule.default;
      
      const body = method === 'POST' ? await parseJsonBody(req) : {};

      // Mock Vercel req and res
      const mockReq = {
        method,
        body,
        headers: req.headers,
        url: req.url,
      };

      const mockRes = {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
          this.headers[name] = value;
          res.setHeader(name, value);
          return this;
        },
        status(code) {
          this.statusCode = code;
          res.statusCode = code;
          return this;
        },
        json(data) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return this;
        },
        end(data = '') {
          res.end(data);
          return this;
        }
      };

      await handler(mockReq, mockRes);
    } catch (error) {
      console.error('API /api/delete-calculation error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Internal server error running delete calculation API locally.', error: error.message }));
    }
    return;
  }

  // Static File Serving
  let relativeFilePath = pathname;
  if (relativeFilePath === '/') {
    relativeFilePath = '/index.html';
  } else if (relativeFilePath === '/admin') {
    relativeFilePath = '/admin.html';
  }

  // Check if serving aarthi-homes folder specifically, otherwise serve from root or aarthi-homes fallback
  let fileSearchPaths = [];
  if (relativeFilePath.startsWith('/aarthi-homes/')) {
    fileSearchPaths = [path.join(__dirname, relativeFilePath)];
  } else {
    fileSearchPaths = [
      path.join(__dirname, relativeFilePath),
      path.join(__dirname, 'aarthi-homes', relativeFilePath) // fallback to find aarthi-homes files easily
    ];
  }

  let fileFound = false;
  for (const filePath of fileSearchPaths) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      fileFound = true;
      const contentType = getContentType(filePath);
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      break;
    }
  }

  if (!fileFound) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1><p>The file <b>${pathname}</b> could not be found locally.</p></body></html>`);
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Local dev server running at: http://localhost:${PORT}/`);
  console.log(`📁 Static files served from root and aarthi-homes/`);
  console.log(`🔗 API save simulates at: http://localhost:${PORT}/api/save`);
  console.log(`🔗 API cleanup simulates at: http://localhost:${PORT}/api/cleanup`);
  console.log(`======================================================\n`);
});
