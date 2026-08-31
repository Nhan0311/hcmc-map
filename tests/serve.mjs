/* Máy chủ tĩnh tối giản cho phát triển và cho bài kiểm tra giao diện.
   Trang chạy được khi mở thẳng bằng file:// , nhưng dùng http:// thì mới giống
   GitHub Pages (và fetch/localStorage không bị trình duyệt chặn vì origin lạ).

   Chạy tay:  npm start   →  http://127.0.0.1:8080 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './helpers.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
};

/** Mở máy chủ trên một cổng tự chọn; trả về { url, close() }. */
export function serve(root = ROOT, port = 0) {
  const server = http.createServer(async (req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    // normalize + bỏ mọi ".." để không ra ngoài thư mục gốc
    const safe = normalize(rel).replace(/^([/\\]|\.\.)+/, '');
    const file = join(root, safe || 'index.html');
    try {
      const s = await stat(file);
      const target = s.isDirectory() ? join(file, 'index.html') : file;
      res.writeHead(200, {
        'content-type': TYPES[extname(target)] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      createReadStream(target).pipe(res);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404 ' + safe);
    }
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const { port: p } = server.address();
      resolve({
        url: `http://127.0.0.1:${p}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

// `npm start` — chạy trực tiếp thì mở cổng cố định và giữ máy chủ sống
const runDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (runDirectly) {
  const { url } = await serve(ROOT, Number(process.env.PORT) || 8080);
  console.log(`hcmc-map đang chạy tại ${url}  (Ctrl+C để dừng)`);
}
