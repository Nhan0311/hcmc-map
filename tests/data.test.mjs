/* Kiểm tra tính toàn vẹn của dữ liệu — chạy bằng Node, không cần trình duyệt.
   Mục tiêu: bắt được các lỗi âm thầm (vùng thiếu số liệu, toạ độ lệch,
   khoá tra cứu trỏ vào chỗ không tồn tại) trước khi nó lên bản đồ. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadData, evalConsts, coordsOf, VN_BOUNDS, CITY_BOUNDS } from './helpers.mjs';

const W = loadData();
const DISTRICTS = W.MAP_DATA.DISTRICTS.features;
const WARDS = W.WARD_DATA.features;
const HANOI = W.HANOI_DATA.ZONES.features;

/* Các hằng dữ liệu nằm ngay trong index.html — đọc thẳng từ đó để bài kiểm tra
   và trang chạy thật luôn nói về cùng một bộ số. */
const C = evalConsts(['RAIN_HCM', 'RAIN_HN', 'TIDE_HCM', 'FLOOD_POINTS',
  'DISTRICT_EXTRA', 'LEZ', 'CBD', 'INFRA', 'I18N', 'CITIES']);
const { FLOOD_POINTS, LEZ, CBD, INFRA, I18N, CITIES } = C;
const DISTRICT_EXTRA = { ...C.DISTRICT_EXTRA, ...W.MAP_DATA.NEW_EXTRA };

const inBox = ([lat, lng], b) =>
  lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;

/* ------------------------------------------------------------------ ranh giới */

test('mọi tệp dữ liệu đều gắn lên window với đúng tên mà index.html chờ', () => {
  for (const k of ['MAP_DATA', 'WARD_DATA', 'HANOI_DATA', 'ROAD_GEOM', 'METRO_GEOM']) {
    assert.ok(W[k], `thiếu window.${k}`);
  }
});

test('số lượng đơn vị hành chính đúng như tài liệu công bố', () => {
  assert.equal(WARDS.length, 168, 'TP.HCM: 168 phường/xã theo NQ 1685/NQ-UBTVQH15');
  assert.equal(HANOI.length, 126, 'Hà Nội: 126 phường/xã theo NQ 1656/NQ-UBTVQH15');
  assert.equal(DISTRICTS.length, 41, 'TP.HCM vẽ theo 41 vùng phủ kín');
});

for (const [label, feats] of [
  ['vùng TP.HCM', DISTRICTS],
  ['phường/xã TP.HCM', WARDS],
  ['phường/xã Hà Nội', HANOI],
]) {
  test(`GeoJSON hợp lệ: ${label}`, () => {
    for (const f of feats) {
      const name = f.properties.name || f.properties.n;
      assert.ok(['Polygon', 'MultiPolygon'].includes(f.geometry.type), `${name}: geometry lạ`);
      const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
      for (const poly of polys) {
        for (const ring of poly) {
          assert.ok(ring.length >= 4, `${name}: vòng có ${ring.length} điểm, cần ≥ 4`);
          const [a, b] = [ring[0], ring[ring.length - 1]];
          assert.deepEqual(a, b, `${name}: vòng chưa khép kín`);
        }
      }
      for (const ll of coordsOf(f)) {
        assert.ok(inBox(ll, VN_BOUNDS), `${name}: toạ độ ${ll} nằm ngoài Việt Nam`);
      }
    }
  });
}

test('ranh giới mỗi thành phố nằm trong hộp bao của thành phố đó', () => {
  for (const f of DISTRICTS) {
    for (const ll of coordsOf(f)) {
      assert.ok(inBox(ll, CITY_BOUNDS.hcmc), `${f.properties.name}: ${ll} ngoài TP.HCM`);
    }
  }
  for (const f of HANOI) {
    for (const ll of coordsOf(f)) {
      assert.ok(inBox(ll, CITY_BOUNDS.hanoi), `${f.properties.name}: ${ll} ngoài Hà Nội`);
    }
  }
});

test('tên vùng là duy nhất và không đụng nhau giữa hai thành phố', () => {
  const hcmc = DISTRICTS.map((f) => f.properties.name);
  const hanoi = HANOI.map((f) => f.properties.name);
  assert.equal(new Set(hcmc).size, hcmc.length, 'trùng tên vùng TP.HCM');
  assert.equal(new Set(hanoi).size, hanoi.length, 'trùng tên vùng Hà Nội');
  // extra() tra DISTRICT_EXTRA trước rồi mới tới HANOI_DATA.EXTRA, nên tên trùng
  // sẽ khiến vùng thành phố này lấy nhầm số liệu của thành phố kia.
  const clash = hcmc.filter((n) => hanoi.includes(n));
  assert.deepEqual(clash, [], 'tên vùng trùng giữa hai thành phố');
});

/* ------------------------------------------------------------------ số liệu vùng */

test('mọi vùng đều có đủ thuộc tính bản đồ cần để tô màu', () => {
  for (const f of [...DISTRICTS, ...HANOI]) {
    const p = f.properties;
    assert.equal(typeof p.name, 'string', 'thiếu name');
    assert.ok(Number.isInteger(p.risk) && p.risk >= 0 && p.risk <= 5, `${p.name}: risk phải là 0–5`);
    assert.ok(p.pct >= 0 && p.pct <= 100, `${p.name}: pct ngoài 0–100`);
    assert.ok(p.house_min <= p.house_max, `${p.name}: house_min > house_max`);
  }
});

test('mọi vùng đều tra được số liệu bổ sung (không rơi vào giá trị mặc định “—”)', () => {
  for (const f of DISTRICTS) {
    assert.ok(DISTRICT_EXTRA[f.properties.name], `TP.HCM: vùng ${f.properties.name} thiếu DISTRICT_EXTRA`);
  }
  for (const f of HANOI) {
    assert.ok(W.HANOI_DATA.EXTRA[f.properties.name], `Hà Nội: vùng ${f.properties.name} thiếu EXTRA`);
  }
});

test('số liệu bổ sung có khoảng giá hợp lý và nguyên nhân ngập hợp lệ', () => {
  const causes = new Set(['rain', 'tide', 'both', 'river']);
  const all = { ...DISTRICT_EXTRA, ...W.HANOI_DATA.EXTRA };
  for (const [name, e] of Object.entries(all)) {
    for (const k of ['rent_home', 'rent_shop']) {
      assert.ok(Array.isArray(e[k]) && e[k].length === 2, `${name}: ${k} phải là [min,max]`);
      assert.ok(e[k][0] <= e[k][1], `${name}: ${k} min > max`);
    }
    assert.ok(e.fdays >= 0 && e.fdays <= 366, `${name}: fdays = ${e.fdays}`);
    assert.ok(e.drain > 0, `${name}: drain phải > 0`);
    assert.ok(causes.has(e.cause), `${name}: cause lạ "${e.cause}"`);
  }
});

/* ------------------------------------------------------------------ tra cứu chéo */

test('WARD2ZONE trỏ tới vùng có thật và phủ hết 168 phường/xã', () => {
  const zones = new Set(DISTRICTS.map((f) => f.properties.name));
  const map = W.MAP_DATA.WARD2ZONE;
  for (const [ward, zone] of Object.entries(map)) {
    assert.ok(zones.has(zone), `phường "${ward}" trỏ tới vùng không tồn tại "${zone}"`);
  }
  for (const f of WARDS) {
    assert.ok(map[f.properties.n], `phường "${f.properties.n}" chưa có trong WARD2ZONE`);
  }
});

test('mỗi phường/xã TP.HCM đều tô được màu (không có vùng xám “chưa tra được”)', () => {
  const byName = new Map(DISTRICTS.map((f) => [f.properties.name, f]));
  const grey = WARDS.filter((f) => !byName.get(W.MAP_DATA.WARD2ZONE[f.properties.n]));
  assert.deepEqual(grey.map((f) => f.properties.n), []);
});

test('phường/xã có đủ ba trường mà cửa sổ thông tin dùng', () => {
  for (const f of WARDS) {
    for (const k of ['n', 't', 'od']) {
      assert.equal(typeof f.properties[k], 'string', `phường thiếu trường "${k}"`);
    }
  }
});

/* ------------------------------------------------------------------ điểm ngập */

test('điểm ngập: đủ trường, độ sâu và thời gian rút hợp lý', () => {
  const causes = new Set(['rain', 'tide', 'river']);
  const srcs = new Set(['official', 'press']);
  for (const f of FLOOD_POINTS) {
    assert.ok(CITIES[f.c], `"${f.n}": thành phố lạ "${f.c}"`);
    assert.ok(f.n && f.w, `điểm ngập thiếu tên hoặc phường`);
    assert.ok(causes.has(f.cause), `"${f.n}": cause lạ "${f.cause}"`);
    assert.ok(srcs.has(f.src), `"${f.n}": src lạ "${f.src}"`);
    assert.ok(f.d > 0 && f.d <= 300, `"${f.n}": độ sâu ${f.d} cm không hợp lý`);
    assert.ok(f.drain > 0, `"${f.n}": thời gian rút phải > 0`);
  }
});

test('điểm ngập nằm đúng trong thành phố của nó', () => {
  for (const f of FLOOD_POINTS) {
    assert.ok(inBox(f.ll, CITY_BOUNDS[f.c]), `"${f.n}" (${f.c}) ở ${f.ll} — ngoài hộp bao thành phố`);
  }
});

test('không có hai điểm ngập trùng tên trong cùng một thành phố', () => {
  for (const c of Object.keys(CITIES)) {
    const names = FLOOD_POINTS.filter((f) => f.c === c).map((f) => f.n);
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    assert.deepEqual(dup, [], `${c}: điểm ngập trùng tên`);
  }
});

test('mỗi thành phố đều có điểm ngập để hiển thị', () => {
  for (const c of Object.keys(CITIES)) {
    assert.ok(FLOOD_POINTS.some((f) => f.c === c), `${c} không có điểm ngập nào`);
  }
});

test('TP.HCM giữ đúng 34 tuyến ngập Sở Xây dựng công bố (26 mưa + 8 triều)', () => {
  const official = FLOOD_POINTS.filter((f) => f.c === 'hcmc' && f.src === 'official');
  const tide = official.filter((f) => f.cause === 'tide');
  assert.equal(tide.length, 8, 'đủ 8 tuyến ngập do triều');
  // README nêu rõ 2/26 tuyến do mưa chưa được nguồn nêu tên cụ thể nên chưa định vị được.
  assert.equal(official.length, 32, 'định vị được 32/34 tuyến — khớp với phần "Giới hạn" trong README');
});

/* ------------------------------------------------------------------ lớp quy hoạch */

test('vùng phát thải thấp, CBD và hạ tầng đều gắn đúng thành phố và toạ độ', () => {
  for (const z of LEZ) {
    assert.ok(CITIES[z.c], `LEZ "${z.name}": thành phố lạ`);
    assert.ok(z.poly.length >= 3, `LEZ "${z.name}": đa giác dưới 3 đỉnh`);
    for (const ll of z.poly) assert.ok(inBox(ll, CITY_BOUNDS[z.c]), `LEZ "${z.name}": ${ll} ngoài thành phố`);
  }
  for (const z of CBD) {
    assert.ok(CITIES[z.c], `CBD "${z.name}": thành phố lạ`);
    assert.ok(z.r > 0, `CBD "${z.name}": bán kính phải > 0`);
    assert.ok(inBox(z.ll, CITY_BOUNDS[z.c]), `CBD "${z.name}": ${z.ll} ngoài thành phố`);
  }
  for (const i of INFRA) {
    assert.ok(CITIES[i.c], `hạ tầng "${i.name}": thành phố lạ`);
    assert.ok(['run', 'build', 'plan'].includes(i.cls), `hạ tầng "${i.name}": cls lạ "${i.cls}"`);
    for (const ll of i.path || []) {
      assert.ok(inBox(ll, CITY_BOUNDS[i.c]), `hạ tầng "${i.name}": ${ll} ngoài thành phố`);
    }
  }
});

test('mọi khoá hình học của hạ tầng đều tồn tại trong METRO_GEOM', () => {
  // Dự án chưa thi công cố ý để path:null — nó chỉ xuất hiện trong tab
  // "Quy hoạch & hạ tầng", không vẽ lên bản đồ. Nhưng khi đã khai báo `geo`
  // thì khoá đó bắt buộc phải có thật, kẻo tuyến biến mất không báo lỗi.
  for (const i of INFRA) {
    if (i.geo) assert.ok(W.METRO_GEOM[i.geo], `hạ tầng "${i.name}": METRO_GEOM thiếu khoá "${i.geo}"`);
    if (i.path) assert.ok(i.path.length >= 2, `hạ tầng "${i.name}": path chỉ có 1 điểm`);
  }
});

test('mỗi thành phố có ít nhất một tuyến hạ tầng vẽ được lên bản đồ', () => {
  for (const c of Object.keys(CITIES)) {
    const drawable = INFRA.filter((i) => i.c === c && ((i.geo && W.METRO_GEOM[i.geo]) || i.path));
    assert.ok(drawable.length, `${c}: không tuyến hạ tầng nào vẽ được`);
  }
});

test('hình học OpenStreetMap khớp với danh sách trục đường BĐS', () => {
  const roads = new Set(W.MAP_DATA.BDS_ROADS.map((r) => r.name));
  for (const name of Object.keys(W.ROAD_GEOM)) {
    assert.ok(roads.has(name), `ROAD_GEOM có "${name}" nhưng BDS_ROADS thì không`);
  }
  for (const r of W.MAP_DATA.BDS_ROADS) {
    assert.ok(W.ROAD_GEOM[r.name] || (r.coords && r.coords.length >= 2),
      `trục "${r.name}" không có hình tuyến nào để vẽ`);
    assert.ok(r.price_min <= r.price_max, `trục "${r.name}": price_min > price_max`);
  }
});

/* ------------------------------------------------------------------ ngôn ngữ */

test('bản tiếng Anh có đủ mọi khoá của bản tiếng Việt', () => {
  const missing = Object.keys(I18N.vi).filter((k) => I18N.en[k] === undefined);
  assert.deepEqual(missing, []);
});

test('các khoá đổi theo persona có đủ ba persona ở cả hai ngôn ngữ', () => {
  // Thiếu một persona ở đây là màn hình hiện "undefined" ngay khi bấm đổi nhu cầu.
  const keys = ['title', 'sub', 'budget_lab', 'budget_unit', 'list_title', 'addr_title', 'addr_hint'];
  for (const lang of ['vi', 'en']) {
    for (const k of keys) {
      const v = I18N[lang][k];
      assert.ok(v, `I18N.${lang} thiếu khoá "${k}"`);
      for (const p of ['rentshop', 'renthome', 'buy']) {
        assert.ok(v[p], `I18N.${lang}.${k} thiếu persona "${p}"`);
      }
    }
  }
});

test('bảng mức rủi ro có đúng 6 bậc ở cả hai ngôn ngữ', () => {
  for (const lang of ['vi', 'en']) assert.equal(I18N[lang].risk.length, 6);
});

/* ------------------------------------------------------------------ mùa mưa */

test('hệ số mưa theo tháng có đủ 12 tháng và mùa mưa khai báo hợp lệ', () => {
  for (const [key, c] of Object.entries(CITIES)) {
    assert.equal(c.rain.length, 12, `${key}: hệ số mưa phải có 12 tháng`);
    for (const v of c.rain) assert.ok(v >= 0 && v <= 2, `${key}: hệ số mưa ${v} bất thường`);
    assert.ok(c.season.start >= 1 && c.season.end <= 12 && c.season.start < c.season.end, `${key}: mùa mưa lạ`);
    for (const m of c.season.peak) {
      assert.ok(m >= c.season.start && m <= c.season.end, `${key}: tháng đỉnh ${m} nằm ngoài mùa mưa`);
    }
  }
});
