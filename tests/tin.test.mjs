/* Kiểm tra bộ thu thập tin ngập — hoàn toàn ngoại tuyến.
   Phần đọc RSS và lọc là hàm thuần trên chuỗi, nên đưa thẳng XML mẫu vào được;
   không bài nào ở đây chạm tới mạng. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  docRss, laTinNgap, laCanhNgap, thanhPhoCua, bangDiaDiem, ganDiaDiem,
  dungChiMuc, viet, OUT_FILE, GIU_NGAY,
} from '../tools/thu_thap_tin.mjs';
import { loadData, evalConsts } from './helpers.mjs';

const W = loadData();
// CITIES tham chiếu RAIN_HCM/RAIN_HN nên phải lấy kèm (xem evalConsts)
const { FLOOD_POINTS, CITIES } = evalConsts(['RAIN_HCM', 'RAIN_HN', 'FLOOD_POINTS', 'CITIES']);
const BANG = bangDiaDiem({
  FLOOD_POINTS,
  zonesHcmc: W.MAP_DATA.DISTRICTS.features,
  zonesHanoi: W.HANOI_DATA.ZONES.features,
});

/* ------------------------------------------------------------------ đọc RSS */

const RSS_TOA_SOAN = `<?xml version="1.0"?><rss><channel>
<item>
  <title><![CDATA[Mưa lớn, nhiều tuyến đường TPHCM ngập sâu]]></title>
  <link>https://vnexpress.net/mua-lon-1234.html</link>
  <description><![CDATA[<a href="x"><img src="https://i.vnecdn.net/anh.jpg"></a> Nước ngập tới yên xe trên đường Huỳnh Tấn Phát.]]></description>
  <pubDate>Wed, 26 Aug 2026 04:00:31 GMT</pubDate>
</item>
<item>
  <title>Lễ hội ngập tràn sắc màu tại Hà Nội</title>
  <link>https://vnexpress.net/le-hoi-9.html</link>
  <description>Không khí ngập tràn niềm vui</description>
  <pubDate>Wed, 26 Aug 2026 04:00:31 GMT</pubDate>
</item>
<item>
  <title>Tin không có liên kết</title>
  <description>abc</description>
</item>
</channel></rss>`;

const RSS_GOOGLE = `<rss><channel><item>
  <title>Triều cường TPHCM tăng nhanh, cảnh báo ngập - Laodong.vn</title>
  <link>https://news.google.com/rss/articles/CBMiabc?oc=5</link>
  <pubDate>Wed, 26 Aug 2026 04:00:31 GMT</pubDate>
</item></channel></rss>`;

test('đọc được bài, ngày, ảnh từ feed của toà soạn', () => {
  const r = docRss(RSS_TOA_SOAN, 'VnExpress');
  assert.equal(r.length, 2, 'bài thiếu liên kết phải bị bỏ');
  assert.equal(r[0].t, 'Mưa lớn, nhiều tuyến đường TPHCM ngập sâu');
  assert.equal(r[0].s, 'VnExpress');
  assert.equal(r[0].d, '2026-08-26');
  assert.equal(r[0].img, 'https://i.vnecdn.net/anh.jpg');
});

test('Google News: tách được tên báo ra khỏi tiêu đề', () => {
  const [r] = docRss(RSS_GOOGLE, null);
  assert.equal(r.t, 'Triều cường TPHCM tăng nhanh, cảnh báo ngập');
  assert.equal(r.s, 'Laodong.vn');
  assert.equal(r.img, '', 'Google News không kèm ảnh');
});

test('chỉ nhận ảnh https (không nhúng ảnh http vào trang https)', () => {
  const [r] = docRss(RSS_TOA_SOAN.replace('https://i.vnecdn.net/anh.jpg', 'http://i.vnecdn.net/anh.jpg'), 'X');
  assert.equal(r.img, '');
});

test('giải mã cả thực thể HTML bị mã hoá hai lần', () => {
  const xml = `<rss><item><title>Hà Nội tính &amp;apos;xoá&amp;apos; ngập úng</title>
    <link>https://x.vn/a</link></item></rss>`;
  assert.equal(docRss(xml, 'X')[0].t, "Hà Nội tính 'xoá' ngập úng");
});

/* ------------------------------------------------------------------- lọc */

test('nhận ra tin ngập, bỏ qua "ngập tràn niềm vui"', () => {
  assert.ok(laTinNgap('nhiều tuyến đường ngập sâu'));
  assert.ok(laTinNgap('triều cường dâng cao'));
  assert.ok(laTinNgap('Hà Nội úng ngập sau mưa'));
  assert.ok(!laTinNgap('Lễ hội ngập tràn sắc màu'));
  assert.ok(!laTinNgap('Giá nhà mặt phố giảm 3%'));
});

test('phân biệt ảnh cảnh ngập thật với ảnh tin dự án', () => {
  assert.equal(laCanhNgap('Đường thành sông, người dân lội bì bõm'), 1);
  assert.equal(laCanhNgap('Mưa xối xả, nhiều xe chết máy giữa đường ngập'), 1);
  assert.equal(laCanhNgap('TP.HCM chi 7.150 tỷ đồng chống ngập'), 0);
  assert.equal(laCanhNgap('Khởi công dự án chống ngập 10.000 tỷ'), 0);
});

test('gắn đúng thành phố, bỏ qua bài nói cả hai hoặc không nói thành phố nào', () => {
  assert.equal(thanhPhoCua('Đường Huỳnh Tấn Phát TPHCM ngập'), 'hcmc');
  assert.equal(thanhPhoCua('Phố Hà Nội ngập nước'), 'hanoi');
  assert.equal(thanhPhoCua('Hà Nội và TPHCM cùng ngập'), null);
  assert.equal(thanhPhoCua('Miền Trung mưa lũ'), null);
});

/* --------------------------------------------------------- gắn địa điểm */

test('bảng địa điểm dựng từ chính dữ liệu của trang', () => {
  assert.ok(BANG.duong.length > 30, 'phải có tên tuyến ngập');
  assert.ok(BANG.vung.length > 150, 'phải có tên vùng của cả hai thành phố');
  // "Võ Văn Kiệt × Hồ Học Lãm" phải tách thành hai tên tra được
  assert.ok(BANG.duong.some((d) => d.ten === 'Võ Văn Kiệt'));
  assert.ok(BANG.duong.some((d) => d.ten === 'Hồ Học Lãm'));
  // tên trong ngoặc bị bỏ: "Dương Văn Cam (chợ Thủ Đức)"
  assert.ok(BANG.duong.some((d) => d.ten === 'Dương Văn Cam'));
  assert.ok(!BANG.duong.some((d) => /\(/.test(d.ten)));
});

test('nhận ra tên tuyến ngập và tên vùng trong tiêu đề', () => {
  const r = ganDiaDiem('Đường Huỳnh Tấn Phát ngập sâu, Quận 7 lại thành sông', BANG, 'hcmc');
  assert.ok(r.fp.some((n) => n.includes('Huỳnh Tấn Phát')), 'phải nhận ra tuyến ngập');
  assert.ok(r.z.includes('District 7'), 'phải nhận ra vùng');
});

test('"Quận 1" không khớp nhầm vào "Quận 12"', () => {
  const r = ganDiaDiem('Quận 12 ngập nặng', BANG, 'hcmc');
  assert.ok(!r.z.includes('District 1'), 'không được nhận nhầm Quận 1');
  assert.ok(r.z.includes('District 12'));
});

test('không gắn địa điểm của thành phố khác', () => {
  const r = ganDiaDiem('Huỳnh Tấn Phát ngập sâu', BANG, 'hanoi');
  assert.deepEqual(r.fp, []);
});

/* ------------------------------------------------------- dựng chỉ mục */

const HOM_NAY = new Date('2026-08-31T00:00:00Z');
const bai = (o) => ({ t: 'x', u: 'https://a/1', s: 'X', d: '2026-08-30', img: '', _text: '', ...o });

test('chỉ giữ tin ngập, có thành phố, còn trong hạn', () => {
  const cu = new Date(HOM_NAY.getTime() - (GIU_NGAY + 5) * 864e5).toISOString().slice(0, 10);
  const r = dungChiMuc([
    bai({ t: 'A', u: 'https://a/1', _text: 'TPHCM ngập sâu' }),
    bai({ t: 'B', u: 'https://a/2', _text: 'Giá nhà tăng ở TPHCM' }),
    bai({ t: 'C', u: 'https://a/3', _text: 'Miền Trung ngập lụt' }),
    bai({ t: 'D', u: 'https://a/4', _text: 'Hà Nội ngập nước', d: cu }),
  ], BANG, HOM_NAY);
  assert.deepEqual(r.map((i) => i.t), ['A']);
});

test('trùng tiêu đề thì gộp, ưu tiên giữ bản có ảnh', () => {
  const r = dungChiMuc([
    bai({ t: 'Hà Nội ngập nước', u: 'https://a/1', _text: 'Hà Nội ngập nước' }),
    bai({ t: 'Hà Nội  ngập  nước', u: 'https://a/2', img: 'https://i/x.jpg', _text: 'Hà Nội ngập nước' }),
  ], BANG, HOM_NAY);
  assert.equal(r.length, 1);
  assert.equal(r[0].img, 'https://i/x.jpg');
});

test('gộp dần: tin cũ được giữ lại qua các lần chạy', () => {
  const cu = [{ t: 'Tin cũ', u: 'https://a/cu', s: 'X', d: '2026-08-01', img: '', c: 'hcmc', fp: [], z: [], canh: 1 }];
  const r = dungChiMuc([bai({ t: 'Tin mới', u: 'https://a/moi', _text: 'TPHCM ngập sâu' })], BANG, HOM_NAY, cu);
  assert.deepEqual(r.map((i) => i.t).sort(), ['Tin cũ', 'Tin mới']);
});

test('tin cũ quá hạn bị loại khỏi kho tích luỹ', () => {
  const qua = new Date(HOM_NAY.getTime() - (GIU_NGAY + 1) * 864e5).toISOString().slice(0, 10);
  const cu = [{ t: 'Quá hạn', u: 'https://a/x', s: 'X', d: qua, img: '', c: 'hcmc', fp: [], z: [], canh: 1 }];
  assert.deepEqual(dungChiMuc([], BANG, HOM_NAY, cu), []);
});

test('một thành phố mưa to không đẩy hết tin của thành phố kia ra ngoài', () => {
  const nhieu = [];
  for (let i = 0; i < 300; i++) {
    nhieu.push(bai({ t: 'HN ' + i, u: 'https://a/hn' + i, _text: 'Hà Nội ngập nước ' + i }));
  }
  nhieu.push(bai({ t: 'SG duy nhất', u: 'https://a/sg', _text: 'TPHCM ngập sâu' }));
  const r = dungChiMuc(nhieu, BANG, HOM_NAY);
  assert.ok(r.some((i) => i.t === 'SG duy nhất'), 'tin TP.HCM phải còn');
});

/* ------------------------------------------------------------ tệp sinh ra */

test('tệp sinh ra là JavaScript hợp lệ, gắn window.TIN_NGAP', () => {
  const js = viet({ capNhat: 'x', nguon: 'y', items: [{ t: "có 'nháy' và <thẻ>", u: 'https://a', s: 'X', d: null, img: '', c: 'hcmc', fp: [], z: [], canh: 1 }] });
  const ctx = { window: {} };
  vm.runInNewContext(js, ctx);
  assert.equal(ctx.window.TIN_NGAP.items.length, 1);
  assert.equal(ctx.window.TIN_NGAP.items[0].t, "có 'nháy' và <thẻ>");
});

test('data/tin_ngap.js đang có trong kho là hợp lệ', { skip: !existsSync(OUT_FILE) && 'chưa thu thập lần nào' }, () => {
  const ctx = { window: {} };
  vm.runInNewContext(readFileSync(OUT_FILE, 'utf8'), ctx, { filename: 'tin_ngap.js' });
  const kho = ctx.window.TIN_NGAP;
  assert.ok(kho && Array.isArray(kho.items), 'phải có window.TIN_NGAP.items');
  assert.ok(!isNaN(new Date(kho.capNhat)), 'capNhat phải là mốc thời gian đọc được');

  const tenVung = new Set([
    ...W.MAP_DATA.DISTRICTS.features.map((f) => f.properties.name),
    ...W.HANOI_DATA.ZONES.features.map((f) => f.properties.name),
  ]);
  const tenTuyen = new Set(FLOOD_POINTS.map((f) => f.n));

  for (const i of kho.items) {
    assert.ok(i.t && i.t.length > 5, 'tiêu đề quá ngắn: ' + i.t);
    assert.match(i.u, /^https:\/\//, 'liên kết phải là https: ' + i.u);
    assert.ok(i.s, 'thiếu tên báo: ' + i.t);
    assert.ok(CITIES[i.c], 'thành phố lạ: ' + i.c);
    if (i.img) assert.match(i.img, /^https:\/\//, 'ảnh phải là https: ' + i.img);
    if (i.d) assert.match(i.d, /^\d{4}-\d{2}-\d{2}$/, 'ngày sai định dạng: ' + i.d);
    // nhãn địa điểm phải trỏ vào thứ có thật, kẻo giao diện lọc trượt hết
    for (const n of i.fp) assert.ok(tenTuyen.has(n), `nhãn tuyến ngập không tồn tại: ${n}`);
    for (const n of i.z) assert.ok(tenVung.has(n), `nhãn vùng không tồn tại: ${n}`);
  }
});
