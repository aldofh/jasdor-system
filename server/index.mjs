import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(root, 'server-data');
const catalogPath = path.join(dataDirectory, 'catalog.json');
const distDirectory = path.join(root, 'dist');
const maxRequestBytes = 30 * 1024 * 1024;
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '127.0.0.1';

let writeQueue = Promise.resolve();

async function readCatalog() {
  try {
    const saved = JSON.parse(await readFile(catalogPath, 'utf8'));
    if (Array.isArray(saved)) {
      const currentCatalog = saved.find((entry) => entry.id === 'kopi-kenangan') ?? saved[0];
      if (!currentCatalog) return null;

      const store = {
        id: 'ketoprak-was-was',
        name: 'Ketoprak Was Was',
        slug: 'ketoprak-was-was',
        logoUrl: '/images/kopi-kenangan-cup.png',
        whatsappNumber: currentCatalog.defaultWhatsApp,
        categories: currentCatalog.categories,
        menus: currentCatalog.menus,
      };
      await writeCatalog(store);
      return store;
    }
    return saved;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function isValidStore(store) {
  return typeof store?.id === 'string' &&
    typeof store?.name === 'string' &&
    typeof store?.slug === 'string' &&
    typeof store?.logoUrl === 'string' &&
    typeof store?.whatsappNumber === 'string' &&
    Array.isArray(store.categories) &&
    Array.isArray(store.menus) &&
    store.menus.every((menu) =>
      typeof menu?.id === 'string' &&
      typeof menu?.name === 'string' &&
      typeof menu?.description === 'string' &&
      Number.isFinite(menu?.basePrice) &&
      menu.basePrice >= 0 &&
      typeof menu?.imageUrl === 'string' &&
      typeof menu?.category === 'string' &&
      typeof menu?.isAvailable === 'boolean',
    );
}

async function writeCatalog(store) {
  const operation = writeQueue.then(async () => {
    await mkdir(dataDirectory, { recursive: true });
    const temporaryPath = `${catalogPath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(store, null, 2), 'utf8');
    await rename(temporaryPath, catalogPath);
  });
  writeQueue = operation.catch(() => {});
  await operation;
}

async function readRequestBody(request) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxRequestBytes) {
      const error = new Error('Request body terlalu besar (maks. 30 MB).');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Format JSON tidak valid.');
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(data));
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

async function serveFrontend(request, response) {
  let requestPath;
  try {
    requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Invalid URL');
    return;
  }

  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const candidatePath = path.resolve(distDirectory, relativePath);
  if (!candidatePath.startsWith(`${distDirectory}${path.sep}`) && candidatePath !== path.join(distDirectory, 'index.html')) {
    response.writeHead(400).end('Invalid path');
    return;
  }

  try {
    const content = await readFile(candidatePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(candidatePath)] ?? 'application/octet-stream',
    });
    response.end(content);
  } catch (error) {
    if (error?.code !== 'ENOENT' && error?.code !== 'EISDIR') throw error;
    if (path.extname(requestPath)) {
      response.writeHead(404).end('Not found');
      return;
    }
    const index = await readFile(path.join(distDirectory, 'index.html'));
    response.writeHead(200, { 'Content-Type': mimeTypes['.html'] });
    response.end(index);
  }
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (pathname === '/api/catalog' && request.method === 'GET') {
    try {
      sendJson(response, 200, { store: await readCatalog() });
    } catch (error) {
      console.error('Failed to read catalog:', error);
      sendJson(response, 500, { error: 'Katalog gagal dibaca dari penyimpanan server.' });
    }
    return;
  }

  if ((pathname === '/api/catalog' && request.method === 'PUT') ||
      (pathname === '/api/catalog/seed' && request.method === 'POST')) {
    try {
      const { store } = await readRequestBody(request);
      if (!isValidStore(store)) {
        sendJson(response, 400, { error: 'Struktur katalog tidak valid.' });
        return;
      }

      if (pathname.endsWith('/seed')) {
        const existing = await readCatalog();
        if (existing) {
          sendJson(response, 200, { store: existing });
          return;
        }
      }

      await writeCatalog(store);
      sendJson(response, 200, { store });
    } catch (error) {
      console.error('Failed to save catalog:', error);
      sendJson(response, error?.statusCode ?? 500, {
        error: error?.statusCode ? error.message : 'Katalog gagal disimpan ke server.',
      });
    }
    return;
  }

  if (pathname.startsWith('/api/')) {
    sendJson(response, 404, { error: 'API tidak ditemukan.' });
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end('Method not allowed');
    return;
  }

  try {
    await serveFrontend(request, response);
  } catch (error) {
    console.error('Failed to serve frontend:', error);
    response.writeHead(500).end('Frontend gagal dimuat.');
  }
});

server.listen(port, host, () => {
  console.log(`Jasdor server: http://${host}:${port}`);
});
