/* Đọc dữ liệu của dự án từ phía Node.

   Trang là một tệp HTML tĩnh không có bước build: dữ liệu nằm rải trong
   data/*.js (gắn lên `window`) và trong chính các hằng số của index.html.
   Mô-đun này lấy chúng ra để bài kiểm tra và công cụ thu thập tin dùng chung —
   nhờ vậy không nơi nào phải chép lại số liệu. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const DATA_FILES = ['ban_do_data.js', 'ban_do_phuong.js', 'ban_do_hanoi.js', 'hinh_hoc_osm.js'];

/** Nạp mọi tệp dữ liệu vào một object `window` giả và trả về nó. */
export function loadData() {
  const sandbox = { window: {} };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  for (const f of DATA_FILES) {
    vm.runInContext(readFileSync(join(ROOT, 'data', f), 'utf8'), sandbox, { filename: f });
  }
  const { window: _self, ...data } = sandbox.window;   // bỏ window.window tự trỏ
  // vm chạy trong một realm khác: mảng nó tạo ra có prototype riêng, khiến
  // assert.deepEqual([], []) cũng trượt. Chuyển về dữ liệu thuần của Node.
  return JSON.parse(JSON.stringify(data));
}

/** Nội dung index.html. */
export function html() {
  return readFileSync(join(ROOT, 'index.html'), 'utf8');
}

/** Trả về đoạn mã nguồn của một hằng dữ liệu thuần khai báo trong index.html. */
export function constFromHtml(name) {
  const src = html();
  const m = new RegExp(`\\bconst ${name}\\s*=\\s*`).exec(src);
  if (!m) throw new Error(`không tìm thấy const ${name} trong index.html`);

  let i = m.index + m[0].length;
  const open = src[i];
  const close = open === '[' ? ']' : open === '{' ? '}' : null;
  if (!close) throw new Error(`const ${name} không phải mảng hay đối tượng`);

  let depth = 0, str = null;
  let j = i;
  for (; j < src.length; j++) {
    const c = src[j];
    if (str) {
      if (c === '\\') j++;
      else if (c === str) str = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) { j++; break; }
  }
  return src.slice(i, j);
}

/** Lấy hằng dữ liệu ra dưới dạng giá trị JavaScript thật.
 *  Nhận nhiều tên một lượt vì các hằng tham chiếu lẫn nhau
 *  (ví dụ CITIES dùng RAIN_HCM), nên phải chạy chung một ngữ cảnh. */
export function evalConsts(names) {
  const ctx = vm.createContext({});
  const out = {};
  for (const name of names) {
    const v = vm.runInContext(`var ${name} = ${constFromHtml(name)};${name}`, ctx, { filename: name });
    out[name] = JSON.parse(JSON.stringify(v));   // xem chú thích ở loadData()
  }
  return out;
}
