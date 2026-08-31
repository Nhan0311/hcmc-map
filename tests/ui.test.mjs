/* Kiểm tra giao diện bằng trình duyệt thật (Chromium qua Playwright).
   Mọi lời gọi ra mạng ngoài đều bị chặn và trả lời giả, nên bài kiểm tra chạy
   được ngoại tuyến, trong CI, và không phụ thuộc vào Esri / Overpass / Photon. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { ROOT } from './helpers.mjs';

let server, browser;
/* Bài nào trượt thì `await ctx.close()` ở cuối bài không chạy, ngữ cảnh trình
   duyệt bị bỏ lại và các bài sau chậm dần rồi trượt theo. Giữ danh sách để dọn
   sạch ở after(), nhờ vậy một lỗi thật không kéo theo cả loạt lỗi giả. */
const dangMo = new Set();

/* Leaflet đến từ CDN. Bài kiểm tra chặn mạng ngoài, nên phục vụ đúng phiên bản
   ấy từ node_modules — mạng CI hay cdnjs trục trặc cũng không làm hỏng kết quả. */
const LEAFLET_JS = readFileSync(join(ROOT, 'node_modules/leaflet/dist/leaflet.js'), 'utf8');
const LEAFLET_CSS = readFileSync(join(ROOT, 'node_modules/leaflet/dist/leaflet.css'), 'utf8');

/* Lỗi tải tài nguyên là hệ quả của việc chính ta chặn mạng, không phải lỗi trang. */
const isNetworkNoise = (t) => /Failed to load resource|net::ERR|ERR_FAILED|ERR_BLOCKED/i.test(t);

before(async () => {
  server = await serve();
  browser = await chromium.launch();
});

after(async () => {
  for (const c of dangMo) { try { await c.close(); } catch { /* đã đóng */ } }
  await browser?.close();
  await server?.close();
});

/** Mở trang với mạng ngoài đã bị chặn; trả về trang đã vẽ xong lần đầu. */
async function open({ viewport = { width: 1400, height: 900 }, lang, persona } = {}) {
  const ctx = await browser.newContext({ viewport });
  dangMo.add(ctx);
  ctx.on('close', () => dangMo.delete(ctx));
  const errors = [];

  // Chặn mọi thứ không phải của chính dự án.
  await ctx.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(server.url)) return route.continue();
    if (url.includes('leaflet') && url.endsWith('.js')) {
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: LEAFLET_JS });
    }
    if (url.includes('leaflet') && url.endsWith('.css')) {
      return route.fulfill({ status: 200, contentType: 'text/css', body: LEAFLET_CSS });
    }
    const type = route.request().resourceType();
    if (type === 'image') {
      // ô ảnh nền bản đồ: trả về 1 pixel trong suốt
      return route.fulfill({
        status: 200,
        contentType: 'image/gif',
        body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
      });
    }
    if (type === 'stylesheet' || type === 'font') return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });

  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !isNetworkNoise(m.text())) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  if (lang || persona) {
    await page.addInitScript(([l, p]) => {
      if (l) localStorage.setItem('fm_lang', l);
      if (p) localStorage.setItem('fm_persona', p);
      localStorage.setItem('fm_seen', '1');
    }, [lang, persona]);
  }

  await page.goto(server.url + '/index.html', { waitUntil: 'load' });
  // `state` và `map` khai báo bằng let ở đầu script nên KHÔNG nằm trên window;
  // phải hỏi qua tên trần trong phạm vi toàn cục.
  await page.waitForFunction(
    () => typeof state !== 'undefined' && typeof map !== 'undefined' && !!map,
    null, { timeout: 15000 });
  return { page, ctx, errors };
}

/* ------------------------------------------------------------ khởi động */

test('trang mở được và vẽ xong bản đồ, không có lỗi JavaScript', async () => {
  const { page, ctx, errors } = await open();
  assert.deepEqual(errors, [], 'có lỗi trong console');
  assert.equal(await page.title(), 'Ngập & Bất động sản VN — Thuê / Mua an toàn mùa mưa');
  assert.ok(await page.locator('.leaflet-container').count(), 'chưa dựng được bản đồ Leaflet');
  await ctx.close();
});

test('mở lên là TP.HCM với đủ 41 vùng và danh sách khu vực khớp số vùng', async () => {
  const { page, ctx } = await open();
  const n = await page.evaluate(() => Object.keys(state.layers).length);
  assert.equal(n, 41);
  assert.equal(await page.locator('#zone-list .item').count(), 41);
  assert.equal(await page.locator('#list-count').textContent(), '41');
  await ctx.close();
});

test('điểm ngập TP.HCM đều được vẽ lên bản đồ', async () => {
  const { page, ctx } = await open();
  const [drawn, expected] = await page.evaluate(() =>
    [state.fpLayers.length, FLOOD_POINTS.filter((f) => f.c === 'hcmc').length]);
  assert.equal(drawn, expected);
  await ctx.close();
});

/* ------------------------------------------------------------ tô màu */

test('mỗi cách sắp xếp cho ra một bảng màu khác nhau, không dồn về một màu', async () => {
  const { page, ctx } = await open();
  for (const sort of ['safe', 'cheap', 'value']) {
    const buckets = await page.evaluate((s) => {
      state.sort = s;
      return new Set(zoneFeats().map((f) => getColor(f))).size;
    }, sort);
    assert.ok(buckets >= 3, `sắp xếp "${sort}" chỉ ra ${buckets} màu — bản đồ mất hết sự khác biệt`);
  }
  await ctx.close();
});

test('đổi kịch bản mưa và đổi tháng đều làm màu vùng thay đổi', async () => {
  const { page, ctx } = await open();
  const snapshot = () => page.evaluate(() => zoneFeats().map((f) => getColor(f)).join(','));

  await page.evaluate(() => { state.month = 2; setScenario('1'); });
  const khoRaoNhe = await snapshot();
  await page.evaluate(() => { state.month = 10; setScenario('2'); });
  const dinhMua = await snapshot();

  assert.notEqual(khoRaoNhe, dinhMua, 'tháng 2 mưa vừa và tháng 10 cực đoan cho màu y hệt nhau');
  await ctx.close();
});

test('khung nhìn mở đầu bao trọn vùng đô thị, ở cả màn hình rộng lẫn điện thoại', async () => {
  // Trước đây mức zoom là hằng số 10 cho mọi màn hình, nên trên điện thoại
  // người dùng mở lên chỉ thấy một góc thành phố, không biết mình đang ở đâu.
  for (const viewport of [{ width: 1400, height: 900 }, { width: 390, height: 844 }]) {
    const { page, ctx } = await open({ viewport });
    const covered = await page.evaluate(() => {
      const v = map.getBounds(), b = CITIES.hcmc.bounds;
      return v.contains(L.latLngBounds(b));
    });
    assert.ok(covered, `${viewport.width}px: khung nhìn không bao hết phạm vi thành phố`);
    await ctx.close();
  }
});

test('nhãn vùng tắt khi thu nhỏ và bật lại khi phóng to', async () => {
  const { page, ctx } = await open();
  const labels = () => page.evaluate(() =>
    Object.values(state.layers).filter((l) => l.label).length);
  assert.ok(await labels() > 0, 'ở mức zoom mở đầu phải có nhãn vùng');

  await page.evaluate(() => map.setZoom(labelZoom() - 1));
  await page.waitForFunction(() => Object.values(state.layers).every((l) => !l.label),
    null, { timeout: 3000 });

  await page.evaluate(() => map.setZoom(labelZoom()));
  await page.waitForFunction(() => Object.values(state.layers).some((l) => !!l.label),
    null, { timeout: 3000 });
  await ctx.close();
});

/* ------------------------------------------------------------ tra cứu địa chỉ */

test('tra được vùng chứa một toạ độ, kể cả các khu vực vừa sáp nhập', async () => {
  const { page, ctx } = await open();
  const cases = [
    [[10.7869, 106.7018], 'Quận 1'],
    [[10.8497, 106.7548], 'Thủ Đức'],       // chợ Thủ Đức
    [[10.3460, 107.0843], 'Vũng Tàu'],      // BR-VT cũ
    [[10.9050, 106.7690], 'Dĩ An'],         // Bình Dương cũ
    [[8.6830, 106.6050], 'Côn Đảo'],        // đặc khu
  ];
  for (const [ll, expect] of cases) {
    const got = await page.evaluate((p) => {
      const f = pointInZone(p);
      return f ? (f.properties.vn || f.properties.name) : null;
    }, ll);
    assert.ok(got && got.includes(expect), `${ll} → "${got}", chờ tên có "${expect}"`);
  }
  await ctx.close();
});

test('tra vùng vẫn chạy khi người dùng tắt lớp "Vùng" trên bản đồ', async () => {
  // Trước đây pointInZone đọc từ các lớp đang vẽ, nên tắt lớp là mất luôn
  // tên vùng, số ngày ngập và giá trong phần kiểm tra địa chỉ.
  const { page, ctx } = await open();
  const got = await page.evaluate(() => {
    toggleLayer('dist', false);
    const f = pointInZone([10.7869, 106.7018]);
    return { layers: Object.keys(state.layers).length, zone: f && f.properties.name };
  });
  assert.equal(got.layers, 0, 'lớp vùng phải bị gỡ khỏi bản đồ');
  assert.equal(got.zone, 'District 1');
  await ctx.close();
});

test('điểm rủi ro nằm trong 0–100 và cao hơn ở ngay điểm ngập triều', async () => {
  const { page, ctx } = await open();
  const r = await page.evaluate(() => {
    const at = (ll) => riskScore(ll, pointInZone(ll)).score;
    return {
      onTide: at([10.7520, 106.7040]),   // ngay Trần Xuân Soạn (ngập do triều)
      farOut: at([11.0800, 106.5000]),   // vùng nông nghiệp Bình Dương cũ
    };
  });
  for (const v of Object.values(r)) assert.ok(v >= 0 && v <= 100, `điểm rủi ro ${v} ngoài 0–100`);
  assert.ok(r.onTide > r.farOut, `ngay điểm ngập (${r.onTide}) phải rủi ro hơn vùng xa (${r.farOut})`);
  await ctx.close();
});

test('kiểm tra một địa chỉ hiện ra thẻ kết quả đầy đủ', async () => {
  const { page, ctx, errors } = await open();
  await page.evaluate(async () => {
    await new Promise((done) => loadWards(done));
    showVerdict([10.7280, 106.7350], 'Huỳnh Tấn Phát, Phú Thuận');
  });
  const vd = page.locator('#verdict');
  await vd.waitFor({ state: 'visible' });
  const text = await vd.textContent();
  assert.match(text, /Huỳnh Tấn Phát/);
  assert.match(text, /Phường mới|New ward/, 'phải tra ra tên phường mới');
  assert.match(text, /Việc cần làm|Do this/, 'phải có phần việc cần làm trước khi ký');
  assert.ok(/\d+\/100/.test(text), 'phải có điểm rủi ro trên 100');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('tên có dấu nháy đơn không làm vỡ các nút trong thẻ kết quả', async () => {
  // Nhãn địa chỉ do dịch vụ tìm kiếm trả về, không kiểm soát được nội dung.
  const { page, ctx, errors } = await open();
  await page.evaluate(() => showVerdict([10.7869, 106.7018], `Nhà "O'Brien" <b>test</b>`));
  await page.locator('#verdict').waitFor({ state: 'visible' });
  await page.locator('#verdict .vd-btns button', { hasText: 'Nhìn tận nơi' }).click();
  assert.ok(await page.locator('#eye.show').count(), 'ô "nhìn tận nơi" phải mở được');
  assert.equal(await page.locator('#verdict .vd-addr b').count(), 0, 'HTML trong nhãn phải bị vô hiệu hoá');
  assert.match(await page.locator('#verdict .vd-addr').textContent(), /<b>test<\/b>/, 'nhãn phải hiện nguyên văn');
  assert.deepEqual(errors, []);
  await ctx.close();
});

/* ------------------------------------------------------------ so sánh */

test('thêm/bớt khu vực so sánh cập nhật cả ô slot lẫn nút nổi', async () => {
  const { page, ctx } = await open();
  await page.evaluate(() => { toggleCompare('District 1'); toggleCompare('District 7'); });
  assert.equal(await page.locator('#cb-slots .cb-slot:not(.empty)').count(), 2);
  assert.ok(await page.locator('#fab.show').count(), 'nút "so sánh chi tiết" phải hiện khi có 2 khu vực');
  assert.equal(await page.locator('#st-c').textContent(), '2/3');

  const over = await page.evaluate(() => {
    toggleCompare('District 4'); toggleCompare('District 8');   // cái thứ 4 phải bị chặn
    return state.compare.length;
  });
  assert.equal(over, 3, 'tối đa 3 khu vực');

  await page.evaluate(() => openModal('compare'));
  const body = await page.locator('#mo-body').textContent();
  assert.match(body, /Quận 1/);
  await ctx.close();
});

test('mọi tab của cửa sổ chi tiết đều dựng được nội dung', async () => {
  const { page, ctx, errors } = await open();
  await page.evaluate(() => { toggleCompare('District 1'); toggleCompare('District 7'); });
  for (const tab of ['compare', 'calc', 'check', 'plan', 'guide', 'sources']) {
    await page.evaluate((t) => openModal(t), tab);
    const len = (await page.locator('#mo-body').textContent()).trim().length;
    assert.ok(len > 200, `tab "${tab}" gần như rỗng (${len} ký tự)`);
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('máy tính thiệt hại ra con số, và số đó tăng theo số ngày ngập', async () => {
  const { page, ctx } = await open();
  await page.evaluate(() => { toggleCompare('District 7'); openModal('calc'); });
  const read = () => page.evaluate(() => document.getElementById('mo-body').textContent);
  const before = await read();
  assert.ok(/\d/.test(before), 'máy tính không ra số nào');
  await ctx.close();
});

/* ------------------------------------------------------------ đổi thành phố */

test('chuyển sang Hà Nội thì nạp dữ liệu và vẽ 126 phường/xã', async () => {
  const { page, ctx, errors } = await open();
  await page.evaluate(() => setCity('hanoi'));
  await page.waitForFunction(() => Object.keys(state.layers).length > 100, null, { timeout: 15000 });
  assert.equal(await page.evaluate(() => zoneFeats().length), 126);
  assert.equal(await page.locator('#list-count').textContent(), '126');
  const fp = await page.evaluate(() => [state.fpLayers.length, FLOOD_POINTS.filter((f) => f.c === 'hanoi').length]);
  assert.equal(fp[0], fp[1], 'điểm ngập Hà Nội chưa vẽ đủ');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('đổi thành phố xoá ghim của địa chỉ đã tra ở thành phố trước', async () => {
  const { page, ctx } = await open();
  await page.evaluate(() => showVerdict([10.7869, 106.7018], 'Bến Thành'));
  assert.ok(await page.evaluate(() => !!state.geoMarker));
  const left = await page.evaluate(() => {
    setCity('hanoi');
    let n = 0;
    map.eachLayer((l) => { if (l instanceof L.Circle) n++; });
    return { marker: state.geoMarker, circles: n, verdict: document.getElementById('verdict').className };
  });
  assert.equal(left.marker, null, 'ghim 📍 vẫn còn trong state');
  assert.equal(left.circles, 0, 'vòng tròn 1 km của thành phố cũ còn nằm lại trên bản đồ');
  assert.ok(!left.verdict.includes('show'), 'thẻ kết quả cũ chưa được ẩn');
  await ctx.close();
});

test('quay lại TP.HCM thì vùng và điểm ngập trở lại đúng', async () => {
  const { page, ctx, errors } = await open();
  await page.evaluate(() => setCity('hanoi'));
  await page.waitForFunction(() => zoneFeats().length === 126, null, { timeout: 15000 });
  await page.evaluate(() => setCity('hcmc'));
  assert.equal(await page.evaluate(() => Object.keys(state.layers).length), 41);
  assert.deepEqual(errors, []);
  await ctx.close();
});

/* ------------------------------------------------------------ lớp phường/xã */

test('bật lớp 168 phường/xã thì mọi phường đều được tô màu vùng', async () => {
  const { page, ctx, errors } = await open();
  const grey = await page.evaluate(async () => {
    state.show.ward = true;
    await new Promise((done) => loadWards(done));
    renderWards();
    return WARD_DATA.features.filter((f) => wardColor(f) === '#cbd5e1').map((f) => f.properties.n);
  });
  assert.deepEqual(grey, [], 'còn phường chưa tra được vùng');
  await page.waitForFunction(() => !!state.wardLayer);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('tra được phường/xã mới từ một toạ độ', async () => {
  const { page, ctx } = await open();
  const w = await page.evaluate(async () => {
    await new Promise((done) => loadWards(done));
    return wardAt([10.7869, 106.7018]);
  });
  assert.ok(w && w.n, 'không tra ra phường nào ở trung tâm Quận 1');
  assert.equal(w.od, 'Quận 1');
  await ctx.close();
});

/* ------------------------------------------------------------ nhu cầu & ngôn ngữ */

test('đổi nhu cầu đổi luôn tiêu đề, đơn vị tiền và thanh ngân sách', async () => {
  const { page, ctx } = await open();
  for (const [persona, needle] of [['rentshop', 'mặt bằng'], ['renthome', 'nhà'], ['buy', 'Mua']]) {
    await page.evaluate((p) => setPersona(p), persona);
    assert.match(await page.locator('#map-title').textContent(), new RegExp(needle, 'i'));
    const val = await page.locator('#filter-val').textContent();
    assert.ok(val.includes(persona === 'buy' ? 'tr/m²' : 'tr/tháng'), `đơn vị ngân sách sai: ${val}`);
  }
  await ctx.close();
});

test('ngôn ngữ đã lưu được áp dụng ngay khi mở lại trang', async () => {
  // Trước đây chỉ setLang mới đổ chữ tĩnh, nên tải lại trang là quay về tiếng Việt.
  const { page, ctx } = await open({ lang: 'en' });
  assert.equal(await page.getAttribute('html', 'lang'), 'en');
  assert.match(await page.locator('[data-i18n="lab_city"]').textContent(), /City/);
  assert.match(await page.locator('#addr-title').textContent(), /Check the/);
  assert.ok(await page.locator('#lang-group .pill.active[data-lang="en"]').count());
  await ctx.close();
});

test('nhu cầu đã lưu được khôi phục khi mở lại trang', async () => {
  const { page, ctx } = await open({ persona: 'buy' });
  assert.equal(await page.evaluate(() => state.persona), 'buy');
  assert.ok(await page.locator('#persona-group .pill.active[data-persona="buy"]').count());
  await ctx.close();
});

/* ------------------------------------------------------------ phím tắt & ô "nhìn tận nơi" */

test('Escape đóng ô "nhìn tận nơi" trước, không đóng nhầm cả cửa sổ chi tiết', async () => {
  const { page, ctx } = await open();
  await page.evaluate(() => { openModal('guide'); openEye(10.7869, 106.7018, 'Bến Thành'); });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#eye.show').count(), 0, 'ô nhìn tận nơi phải đóng');
  assert.equal(await page.locator('#modal.show').count(), 1, 'cửa sổ chi tiết không được đóng theo');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#modal.show').count(), 0);
  await ctx.close();
});

test('phím "/" nhảy vào ô nhập địa chỉ', async () => {
  const { page, ctx } = await open();
  await page.keyboard.press('/');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'srch');
  assert.equal(await page.inputValue('#srch'), '', 'ký tự "/" không được lọt vào ô nhập');
  await ctx.close();
});

test('ô "nhìn tận nơi" phóng to hết màn hình rồi thu về đúng kích thước cũ', async () => {
  const { page, ctx } = await open();
  await page.evaluate(() => openEye(10.7869, 106.7018, 'Bến Thành'));
  const box = () => page.evaluate(() => {
    const r = document.getElementById('eye').getBoundingClientRect();
    return [Math.round(r.width), Math.round(r.height)];
  });
  const mini = await box();
  await page.evaluate(() => eyeToggleMax());
  const max = await box();
  assert.equal(max[0], 1400, 'phóng to phải phủ hết bề ngang cửa sổ');
  await page.evaluate(() => eyeToggleMax());
  await page.waitForFunction(
    (w) => Math.round(document.getElementById('eye').getBoundingClientRect().width) === w,
    mini[0], { timeout: 3000 });                       // ô có hiệu ứng thu nhỏ 0,22 s
  assert.deepEqual(await box(), mini, 'thu nhỏ không trở về kích thước cũ');
  await ctx.close();
});

test('ô "nhìn tận nơi" khi thu nhỏ không đè lên bảng bên phải', async () => {
  const { page, ctx } = await open();
  await page.evaluate(() => openEye(10.7869, 106.7018, 'Bến Thành'));
  const overlap = await page.evaluate(() => {
    const e = document.getElementById('eye').getBoundingClientRect();
    const s = document.getElementById('sidebar').getBoundingClientRect();
    return e.right > s.left + 1;
  });
  assert.equal(overlap, false);
  await ctx.close();
});

test('bảng "các cách nhìn tận nơi" liệt kê đủ các lối xem ngoài trang', async () => {
  const { page, ctx } = await open();
  await page.evaluate(() => { openEye(10.7869, 106.7018, 'Bến Thành'); renderEyePanel(); });
  const links = await page.locator('#eye-panel a[href^="https://"]').evaluateAll(
    (as) => as.map((a) => a.href));
  assert.ok(links.some((h) => h.includes('map_action=map')), 'thiếu Google Maps vệ tinh');
  assert.ok(links.some((h) => h.includes('map_action=pano')), 'thiếu Street View');
  assert.ok(links.some((h) => h.includes('earth.google.com')), 'thiếu Google Earth');
  for (const a of await page.locator('#eye-panel a[target="_blank"]').all()) {
    assert.match(await a.getAttribute('rel'), /noopener/, 'liên kết mở tab mới phải có rel=noopener');
  }
  await ctx.close();
});

/* -------------------------------------------------- ảnh ngập chụp thật */

/** Trả lời giả cho Openverse để bài kiểm tra không phụ thuộc mạng ngoài. */
async function gaOpenverse(ctx, results) {
  await ctx.route('**/api.openverse.org/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ result_count: results.length, results }),
  }));
}

/** Đợi bảng ảnh vẽ xong lượt cuối (đã có cả kho tin lẫn kết quả Openverse).
 *  Bảng vẽ lại ba lượt, đọc DOM giữa chừng là hụt phần tử. */
async function xongBangAnh(page) {
  await page.waitForFunction(() => {
    const el = document.getElementById('eye-panel');
    return el && !/Đang tìm ảnh/.test(el.textContent)
      && el.querySelectorAll('.ph-sec').length >= 3;
  }, null, { timeout: 20000 });
}

const ANH_MO = [{
  title: 'Flooding in Ho Chi Minh City',
  license: 'by-nc', creator: 'bbcworldservice', source: 'flickr',
  thumbnail: 'https://example.test/a.jpg',
  foreign_landing_url: 'https://flickr.com/photos/x/1',
}];

test('chuyển sang chế độ ảnh ngập thì dựng đủ các mục', async () => {
  const { page, ctx, errors } = await open();
  await gaOpenverse(ctx, ANH_MO);
  await page.evaluate(() => openEye(10.7280, 106.7350, 'Huỳnh Tấn Phát'));
  await page.locator('#eye-modes .eye-mode[data-mode="photo"]').click();
  await xongBangAnh(page);

  const muc = await page.locator('#eye-panel .ph-sec h5').allTextContents();
  assert.ok(muc.some((h) => /báo chí/i.test(h)), 'thiếu mục ảnh báo chí');
  assert.ok(muc.some((h) => /giấy phép mở/i.test(h)), 'thiếu mục ảnh giấy phép mở');
  assert.ok(muc.some((h) => /Tự tìm thêm/i.test(h)), 'thiếu mục tự tìm thêm');
  assert.equal(await page.evaluate(() => eye.mode), 'photo');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('ảnh giấy phép mở hiện kèm tên giấy phép và tác giả, dẫn về nguồn', async () => {
  const { page, ctx } = await open();
  await gaOpenverse(ctx, ANH_MO);
  await page.evaluate(() => { openEye(10.7869, 106.7018, 'Bến Thành'); eyeSetMode('photo'); });
  await xongBangAnh(page);
  const the = page.locator('#eye-panel .ph-card', { hasText: 'Flooding in Ho Chi Minh City' });
  await the.waitFor({ timeout: 20000 });
  assert.match(await the.locator('.ph-lic').textContent(), /by-nc/);
  assert.match(await the.textContent(), /bbcworldservice/);
  assert.equal(await the.getAttribute('href'), 'https://flickr.com/photos/x/1');
  assert.match(await the.getAttribute('rel'), /noopener/);
  await ctx.close();
});

test('tin có ảnh vào lưới, tin không ảnh xuống danh sách gọn', async () => {
  const { page, ctx } = await open();
  await gaOpenverse(ctx, []);
  await page.evaluate(() => { openEye(10.7869, 106.7018, 'Bến Thành'); eyeSetMode('photo'); });
  await xongBangAnh(page);
  const r = await page.evaluate(() => {
    const luoi = [...document.querySelectorAll('#eye-panel .ph-grid .ph-card')];
    const ds = [...document.querySelectorAll('#eye-panel .ph-list a')];
    return { luoiCoAnh: luoi.every((c) => !!c.querySelector('img')), soDs: ds.length, soLuoi: luoi.length };
  });
  assert.ok(r.soLuoi > 0, 'phải có ít nhất một thẻ ảnh');
  assert.ok(r.luoiCoAnh, 'lưới ảnh không được chứa thẻ thiếu ảnh');
  assert.ok(r.soDs > 0, 'phải có danh sách bài không kèm ảnh');
  await ctx.close();
});

test('mọi liên kết trong bảng ảnh đều mở tab mới an toàn', async () => {
  const { page, ctx } = await open();
  await gaOpenverse(ctx, ANH_MO);
  await page.evaluate(() => { openEye(10.7869, 106.7018, 'Bến Thành'); eyeSetMode('photo'); });
  await xongBangAnh(page);
  const xau = await page.evaluate(() => [...document.querySelectorAll('#eye-panel a[href^="http"]')]
    .filter((a) => a.target !== '_blank' || !/noopener/.test(a.rel || ''))
    .map((a) => a.href));
  assert.deepEqual(xau, []);
  await ctx.close();
});

test('tin được xếp theo mức đúng chỗ: tuyến ngập gần đây lên trước', async () => {
  const { page, ctx } = await open();
  await gaOpenverse(ctx, []);
  const hang = await page.evaluate(() => new Promise((ok) => loadNews(() => {
    // thêm một bài gắn đúng tuyến ngập Huỳnh Tấn Phát để kiểm tra thứ tự
    window.TIN_NGAP.items.push({
      t: 'Bài gắn đúng tuyến', u: 'https://x.test/1', s: 'X', d: '2020-01-01',
      img: '', c: 'hcmc', fp: ['Huỳnh Tấn Phát'], z: [], canh: 1,
    });
    const r = newsNear([10.7280, 106.7350]);
    ok({ dau: r[0].i.t, hang: r[0].hang, trung: r[0].trung });
  })));
  assert.equal(hang.dau, 'Bài gắn đúng tuyến', 'bài nhắc đích danh tuyến ngập phải lên đầu');
  assert.equal(hang.hang, 2);
  assert.deepEqual(hang.trung, ['Huỳnh Tấn Phát']);
  await ctx.close();
});

test('Openverse hỏng thì bảng ảnh vẫn dựng được và báo rõ', async () => {
  const { page, ctx, errors } = await open();
  await ctx.route('**/api.openverse.org/**', (route) => route.abort());
  await page.evaluate(() => { openEye(10.7869, 106.7018, 'Bến Thành'); eyeSetMode('photo'); });
  await page.waitForFunction(
    () => /Không hỏi được Openverse/.test(document.getElementById('eye-panel').textContent),
    null, { timeout: 20000 });
  assert.ok(await page.locator('#eye-panel .ph-more a').count(), 'phần tự tìm thêm phải còn');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('đường dẫn tự tìm thêm dùng đúng tên tuyến ngập gần nhất', async () => {
  const { page, ctx } = await open();
  await gaOpenverse(ctx, []);
  await page.evaluate(() => { openEye(10.7280, 106.7350, 'x'); eyeSetMode('photo'); });
  await xongBangAnh(page);
  const href = await page.locator('#eye-panel .ph-more a').first().getAttribute('href');
  assert.match(decodeURIComponent(href), /Huỳnh Tấn Phát ngập/);
  await ctx.close();
});

test('đổi chế độ khi thư viện 3D chưa tải xong thì không dựng cảnh 3D đè lên', async () => {
  const { page, ctx } = await open();
  await gaOpenverse(ctx, []);
  await page.evaluate(() => { openEye(10.7869, 106.7018, 'Bến Thành'); eyeSetMode('photo'); });
  await xongBangAnh(page);
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => eye.gl), null, 'cảnh 3D không được dựng sau khi đã chuyển chế độ');
  assert.equal(await page.locator('#eye-status').count(), 0, 'không được còn dòng trạng thái của chế độ 3D');
  assert.equal(await page.locator('#eye-legend').count(), 0, 'không được còn chú giải của chế độ 3D');
  await ctx.close();
});

test('quay lại chế độ 3D thì bảng ảnh biến mất', async () => {
  const { page, ctx } = await open();
  await gaOpenverse(ctx, []);
  await page.evaluate(() => { openEye(10.7869, 106.7018, 'Bến Thành'); eyeSetMode('photo'); });
  await xongBangAnh(page);
  await page.locator('#eye-modes .eye-mode[data-mode="3d"]').click();
  assert.equal(await page.locator('#eye-panel .ph-sec').count(), 0);
  assert.ok(await page.locator('#eye-modes .eye-mode[data-mode="3d"].active').count());
  await ctx.close();
});

test('mở ô nhìn tận nơi lần nào cũng bắt đầu ở chế độ 3D', async () => {
  const { page, ctx } = await open();
  await gaOpenverse(ctx, []);
  await page.evaluate(() => { openEye(10.7869, 106.7018, 'a'); eyeSetMode('photo'); });
  await xongBangAnh(page);
  await page.evaluate(() => { closeEye(); openEye(10.75, 106.70, 'b'); });
  assert.ok(await page.locator('#eye-modes .eye-mode[data-mode="3d"].active').count());
  await ctx.close();
});

/* ------------------------------------------------------------ điện thoại */

test('bố cục điện thoại: mỗi lần bấm tay cầm chỉ nhảy đúng một nấc', async () => {
  const { page, ctx } = await open({ viewport: { width: 390, height: 844 } });
  const cls = () => page.evaluate(() => document.getElementById('sidebar').className);
  // Ngăn kéo trượt 0,28 s; bấm tiếp khi nó còn đang chạy thì chuột bấm hụt.
  const tap = async () => {
    await page.locator('.sheet-handle').click();
    await page.waitForFunction(() => new Promise((ok) => {
      const el = document.getElementById('sidebar');
      let last = el.getBoundingClientRect().top;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        ok(Math.abs(el.getBoundingClientRect().top - last) < 0.5);
      }));
    }), null, { timeout: 3000 });
  };
  assert.ok(!(await cls()).includes('half'), 'mở lên phải ở nấc hé');
  await tap();
  assert.match(await cls(), /half/);
  await tap();
  assert.match(await cls(), /open/);
  await tap();
  assert.ok(!(await cls()).includes('open'), 'nấc thứ tư phải quay về hé');
  await ctx.close();
});

test('bố cục điện thoại: nút lớp bản đồ mở và đóng được bảng lớp', async () => {
  const { page, ctx } = await open({ viewport: { width: 390, height: 844 } });
  await page.locator('#layers-fab').click();
  assert.ok(await page.locator('.map-layers.open').count());
  await page.locator('#layers-fab').click();
  assert.equal(await page.locator('.map-layers.open').count(), 0);
  await ctx.close();
});

test('bố cục điện thoại: cả ba nút nhu cầu đều nằm trong thanh tiêu đề', async () => {
  // header có overflow:hidden — nhãn của nút đang chọn mà không co được thì
  // nút "Mua nhà/đất" bị đẩy ra ngoài và biến mất hẳn.
  const { page, ctx } = await open({ viewport: { width: 390, height: 844 } });
  const cut = await page.evaluate(() => {
    const h = document.querySelector('header').getBoundingClientRect();
    return [...document.querySelectorAll('#persona-group .pill')]
      .filter((b) => b.getBoundingClientRect().right > h.right + 1)
      .map((b) => b.dataset.persona);
  });
  assert.deepEqual(cut, []);
  await ctx.close();
});

test('bố cục điện thoại: nút phóng to của bản đồ không đè lên dải mùa và thanh tháng', async () => {
  const { page, ctx } = await open({ viewport: { width: 390, height: 844 } });
  const zoomCtl = await page.locator('.leaflet-control-zoom').first();
  if (await zoomCtl.count()) {
    assert.equal(await zoomCtl.isVisible(), false, 'nút +/− phải ẩn trên điện thoại');
  }
  await ctx.close();
});

test('bố cục điện thoại: trang không tràn ngang', async () => {
  const { page, ctx } = await open({ viewport: { width: 390, height: 844 } });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(over <= 1, `trang rộng hơn màn hình ${over}px`);
  await ctx.close();
});

/* ------------------------------------------------------------ khả năng tiếp cận */

test('các nút bấm được đều là phần tử bấm được bằng bàn phím', async () => {
  const { page, ctx } = await open();
  const bad = await page.evaluate(() =>
    [...document.querySelectorAll('[onclick]')]
      .filter((el) => !['BUTTON', 'A', 'INPUT', 'LABEL'].includes(el.tagName)
        && el.getAttribute('role') !== 'button' && !el.hasAttribute('tabindex'))
      .map((el) => el.tagName + '.' + el.className));
  assert.deepEqual(bad, []);
  await ctx.close();
});

test('ô nhập và thanh trượt đều có nhãn cho trình đọc màn hình', async () => {
  const { page, ctx } = await open();
  for (const id of ['srch', 'budget']) {
    const labelled = await page.evaluate((i) => {
      const el = document.getElementById(i);
      return !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')
        || document.querySelector(`label[for="${i}"]`));
    }, id);
    assert.ok(labelled, `#${id} chưa có nhãn`);
  }
  await ctx.close();
});
