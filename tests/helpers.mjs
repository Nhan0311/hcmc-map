/* Tiện ích dùng chung cho các bài kiểm tra.
   Trang này là một tệp HTML tĩnh, không có bước build — nên bài kiểm tra dữ liệu
   nạp thẳng các tệp data/*.js vào một `window` giả, còn bài kiểm tra giao diện
   mở chính index.html bằng trình duyệt thật. */
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

/** Sinh mọi toạ độ [lat,lng] của một GeoJSON feature. */
export function* coordsOf(feature) {
  const g = feature.geometry;
  const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  for (const poly of polys) for (const ring of poly) for (const c of ring) yield [c[1], c[0]];
}

/** Hộp bao của Việt Nam — mọi toạ độ trong dự án phải nằm trong đây. */
export const VN_BOUNDS = { south: 8.0, north: 23.6, west: 102.0, east: 110.0 };

/** Hộp bao rộng rãi quanh mỗi thành phố (sau sáp nhập 01/07/2025). */
export const CITY_BOUNDS = {
  // TP.HCM nay gồm cả Bình Dương cũ (phía bắc) và Bà Rịa – Vũng Tàu cũ,
  // trong đó có đặc khu Côn Đảo ở ~8,7°N.
  hcmc: { south: 8.5, north: 11.6, west: 106.0, east: 107.7 },
  hanoi: { south: 20.5, north: 21.4, west: 105.2, east: 106.1 },
};
