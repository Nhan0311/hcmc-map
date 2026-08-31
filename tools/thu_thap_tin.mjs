/* Thu thập tin & ảnh ngập mới nhất từ RSS báo chí Việt Nam → data/tin_ngap.js
   =========================================================================
   VÌ SAO PHẢI CHẠY Ở ĐÂY MÀ KHÔNG PHẢI TRONG TRÌNH DUYỆT
   Không một RSS nào của báo Việt Nam gửi kèm `Access-Control-Allow-Origin`,
   nên trang tĩnh không thể tự đọc. Việc thu thập vì thế chạy bằng GitHub
   Actions theo lịch (.github/workflows/tin-ngap.yml), kết quả ghi vào
   data/tin_ngap.js — trang chỉ việc nạp tệp của chính mình.

   ẢNH
   Chỉ giữ đường dẫn ảnh do CHÍNH toà soạn đặt trong feed của họ (đó là công
   dụng của ảnh trong RSS). Không tải về, không lưu lại, luôn dẫn nguồn và
   luôn liên kết ngược về bài gốc. Bản quyền ảnh thuộc toà soạn.

   Chạy tay:  node tools/thu_thap_tin.mjs
              node tools/thu_thap_tin.mjs --kho    (in ra, không ghi tệp)
   ========================================================================= */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { ROOT, loadData, evalConsts } from './doc_du_lieu.mjs';

/* Ghi ra .js gắn lên window chứ không phải .json: trang phải mở được bằng
   file:// (README hứa thế), mà fetch() một tệp file:// thì trình duyệt chặn.
   Cách này giống hệt các tệp dữ liệu còn lại của dự án. */
export const OUT_FILE = join(ROOT, 'data', 'tin_ngap.js');

/** Giữ tin trong bao nhiêu ngày. Ngập là chuyện theo mùa: quá hạn này thì
 *  bức ảnh không còn nói được gì về tình trạng hiện nay nữa. */
export const GIU_NGAY = 120;
export const TOI_DA = 90;

/* ------------------------------------------------------------------ nguồn */

/* Feed chuyên mục của các toà soạn: có ảnh, nhưng phải tự lọc ra tin ngập.
   Google News: bám sát chủ đề hơn hẳn nhưng không kèm ảnh — dùng để không bỏ
   sót tin, còn ảnh thì trông vào các feed phía trên. */
export const NGUON = [
  // Feed của VietnamNet giữ tới 1000 bài — nguồn ảnh ngập dày dặn nhất.
  { ten: 'VietnamNet', url: 'https://vietnamnet.vn/rss/thoi-su.rss' },
  { ten: 'Dân Trí', url: 'https://dantri.com.vn/rss/xa-hoi.rss' },
  { ten: 'Dân Trí', url: 'https://dantri.com.vn/rss/home.rss' },
  { ten: 'Tiền Phong', url: 'https://tienphong.vn/rss/home.rss' },
  { ten: 'SGGP', url: 'https://www.sggp.org.vn/rss/home.rss' },
  { ten: 'VnExpress', url: 'https://vnexpress.net/rss/thoi-su.rss' },
  { ten: 'VnExpress', url: 'https://vnexpress.net/rss/tin-noi-bat.rss' },
  { ten: 'Tuổi Trẻ', url: 'https://tuoitre.vn/rss/thoi-su.rss' },
  { ten: 'Thanh Niên', url: 'https://thanhnien.vn/rss/thoi-su.rss' },
  { ten: 'Người Lao Động', url: 'https://nld.com.vn/rss/home.rss' },
  { ten: 'VTC News', url: 'https://vtcnews.vn/rss/thoi-su.rss' },
  { ten: 'VOV', url: 'https://vov.vn/rss/xa-hoi.rss' },
  { ten: 'Báo Giao thông', url: 'https://www.baogiaothong.vn/rss/home.rss' },
  { ten: 'Znews', url: 'https://znews.vn/rss/xa-hoi.rss' },
  { ten: 'Tuổi Trẻ', url: 'https://tuoitre.vn/rss/moi-truong.rss' },
  ...[
    'ngập nước TPHCM', 'triều cường TPHCM', 'ngập đường TP.HCM',
    'ngập lụt Hà Nội', 'úng ngập Hà Nội', 'mưa ngập Hà Nội',
  ].map((q) => ({
    ten: null,     // Google News gắn tên báo vào cuối tiêu đề
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=vi&gl=VN&ceid=VN:vi`,
  })),
];

/* Google News bám chủ đề rất tốt nhưng KHÔNG kèm ảnh, và liên kết của nó là
   token đã mã hoá (news.google.com/rss/articles/CBM…) nên không lần ra được
   bài gốc để đọc og:image. Vậy nên: feed của toà soạn lo phần ảnh, Google News
   lo phần không bỏ sót tin — thẻ tin không ảnh vẫn có ích vì dẫn tới bài đọc. */

/* ------------------------------------------------------- lọc theo nội dung */

/* "ngập" một mình dính cả "ngập tràn", "ngập trong niềm vui" — nên đòi hỏi
   một từ khoá thật sự nói về nước. */
const TU_NGAP = /(ngập nước|ngập sâu|ngập lụt|ngập úng|úng ngập|điểm ngập|ngập đường|đường ngập|nước ngập|bị ngập|gây ngập|chống ngập|triều cường|lụt|rốn ngập|ngập nặng|thành sông|biển nước)/i;
const TU_LOAI = /(ngập tràn|ngập trong niềm|ngập trong hạnh|ngập nắng|ngập sắc)/i;

const TU_HCM = /(TP\.?\s?HCM|TPHCM|Hồ Chí Minh|Sài Gòn|Thủ Đức|Bình Dương|Vũng Tàu|Bà Rịa|Cần Giờ|Thủ Dầu Một|Dĩ An|Thuận An)/i;
const TU_HN = /(Hà Nội|Thủ đô|Hoàn Kiếm|Cầu Giấy|Hà Đông|Long Biên|Thanh Xuân|Chương Mỹ|Sơn Tây|Ba Đình|Đống Đa)/i;

/** Bài này có nói về ngập nước không? */
export function laTinNgap(text) {
  const s = String(text || '');
  return TU_NGAP.test(s) && !(TU_LOAI.test(s) && !/(ngập nước|ngập lụt|triều cường|ngập sâu)/i.test(s));
}

/* Ảnh của bài "đường thành sông, dân lội bì bõm" mới là thứ người thuê nhà cần
   nhìn. Ảnh của bài "TP.HCM chi 7.150 tỷ chống ngập" chỉ là ảnh họp báo hoặc
   phối cảnh dự án. Chấm điểm để xếp loại thứ nhất lên trước. */
const TU_CANH = /(lội|bì bõm|thành sông|biển nước|nước dâng|chết máy|ngập sâu|ngập nặng|mênh mông|dọn dẹp|sơ tán|ngâm nước|bơi|xắn quần|đẩy xe)/i;
const TU_CHINH_SACH = /(tỷ đồng|dự án|đầu tư|khởi công|phê duyệt|quy hoạch|đề án|chủ trương|nghiệm thu|đấu thầu|kế hoạch vốn)/i;

/** 1 nếu bài kể lại cảnh ngập thật, 0 nếu là tin chính sách / dự án. */
export function laCanhNgap(tieuDe) {
  const t = String(tieuDe || '');
  if (TU_CANH.test(t)) return 1;
  return TU_CHINH_SACH.test(t) ? 0 : (/(ngập|triều cường|mưa)/i.test(t) ? 1 : 0);
}

/** Bài này nói về thành phố nào? null nếu không rõ (thì bỏ qua). */
export function thanhPhoCua(text) {
  const s = String(text || '');
  const hcm = TU_HCM.test(s), hn = TU_HN.test(s);
  if (hcm && !hn) return 'hcmc';
  if (hn && !hcm) return 'hanoi';
  return null;    // nói cả hai, hoặc không nói thành phố nào — không gắn nhãn được
}

/* ------------------------------------------------------------- đọc RSS/XML */

const boCdata = (s) => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
const goThe = (s) => boCdata(s).replace(/<[^>]*>/g, ' ');
/* Vài feed mã hoá hai lần (&amp;apos;) — giải cho tới khi không đổi nữa, tối đa
   ba vòng để không quẩn vô hạn với chuỗi cố tình xấu. */
const motVong = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const giaiMa = (s) => {
  let t = String(s || '');
  for (let i = 0; i < 3; i++) { const u = motVong(t); if (u === t) break; t = u; }
  return t.replace(/\s+/g, ' ').trim();
};

const lay = (item, the) => {
  const m = item.match(new RegExp(`<${the}[^>]*>([\\s\\S]*?)</${the}>`, 'i'));
  return m ? m[1] : '';
};

/** Tách một tài liệu RSS thành danh sách bài. Thuần chuỗi — kiểm tra được
 *  ngoại tuyến, không cần mạng. */
export function docRss(xml, tenNguon) {
  const items = String(xml || '').split(/<item[\s>]/i).slice(1);
  const ra = [];
  for (const raw of items) {
    const item = raw.slice(0, raw.search(/<\/item>/i) + 1 || undefined);

    let tieuDe = giaiMa(goThe(lay(item, 'title')));
    const moTa = giaiMa(goThe(lay(item, 'description')));
    const lienKet = giaiMa(boCdata(lay(item, 'link'))) || (item.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const ngayRaw = giaiMa(boCdata(lay(item, 'pubDate')));

    // Google News: "Tiêu đề bài - Tên báo"
    let nguon = tenNguon;
    if (!nguon) {
      const m = tieuDe.match(/^(.*)\s+-\s+([^-]{2,40})$/);
      if (m) { tieuDe = m[1].trim(); nguon = m[2].trim(); }
      else nguon = 'Google News';
    }

    // Ảnh: chỉ nhận đường dẫn toà soạn tự đặt trong feed của mình.
    const anh = (item.match(/<enclosure[^>]+url=["']([^"']+)["']/i)
      || item.match(/<media:content[^>]+url=["']([^"']+)["']/i)
      || item.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)
      || boCdata(lay(item, 'description')).match(/<img[^>]+src=["']([^"']+)["']/i)
      || [])[1] || '';

    if (!tieuDe || !lienKet) continue;
    const ngay = new Date(ngayRaw);
    ra.push({
      t: tieuDe,
      u: lienKet,
      s: nguon,
      d: isNaN(ngay) ? null : ngay.toISOString().slice(0, 10),
      img: /^https:\/\//.test(anh) ? anh : '',
      _text: `${tieuDe} ${moTa}`,
    });
  }
  return ra;
}

/* --------------------------------------------------- gắn tin vào địa điểm */

/** Bảng tên địa điểm để dò trong tiêu đề: tên tuyến ngập và tên vùng.
 *  Lấy thẳng từ dữ liệu của trang nên không bao giờ lệch nhau. */
export function bangDiaDiem({ FLOOD_POINTS, zonesHcmc, zonesHanoi }) {
  const duong = [];
  for (const f of FLOOD_POINTS) {
    // "Võ Văn Kiệt × Hồ Học Lãm" → hai tên; "Dương Văn Cam (chợ Thủ Đức)" → bỏ ngoặc
    const phan = f.n.replace(/\([^)]*\)/g, ' ').split(/[×–—-]|,/);
    for (const p of phan) {
      const ten = p.replace(/\s+/g, ' ').trim();
      // tên quá ngắn ("Tứ Liên") dễ dính nhầm; đòi ít nhất 8 ký tự
      if (ten.length >= 8) duong.push({ ten, fp: f.n, c: f.c });
    }
  }
  const vung = [];
  for (const [city, feats] of [['hcmc', zonesHcmc], ['hanoi', zonesHanoi]]) {
    for (const f of feats) {
      const ten = String(f.properties.vn || f.properties.name)
        .replace(/\s*\([^)]*\)\s*$/, '').replace(/^(P|X|TP)\.\s*/, '').trim();
      if (ten.length >= 4) vung.push({ ten, z: f.properties.name, c: city });
    }
  }
  return { duong, vung };
}

/* "Quận 1" không được khớp vào "Quận 12"; tên có dấu cách phải khớp trọn từ. */
const thoat = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const dungTen = (ten) => new RegExp(`(^|[^\\p{L}\\p{N}])${thoat(ten)}($|[^\\p{L}\\p{N}])`, 'iu');

/** Gắn nhãn tuyến ngập / vùng cho một bài. */
export function ganDiaDiem(text, bang, city) {
  const fp = [], z = [];
  for (const d of bang.duong) {
    if (d.c === city && dungTen(d.ten).test(text) && !fp.includes(d.fp)) fp.push(d.fp);
  }
  for (const v of bang.vung) {
    if (v.c === city && dungTen(v.ten).test(text) && !z.includes(v.z)) z.push(v.z);
  }
  return { fp: fp.slice(0, 6), z: z.slice(0, 6) };
}

/* ------------------------------------------------------------ ghép, dọn dẹp */

const chuanTieuDe = (t) => t.toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Lọc, gắn nhãn, khử trùng lặp và sắp xếp.
 *  `cu` là các tin đã thu được ở những lần chạy trước: mỗi feed chỉ giữ tin rất
 *  mới, nên nếu lần nào cũng ghi đè thì ngoài mùa mưa tệp sẽ trống trơn. Gộp
 *  dần như thế này thì qua một mùa mưa sẽ có được một kho ảnh thực sự dùng được.
 *  `homNay` để bài kiểm tra cố định được mốc thời gian. */
export function dungChiMuc(raw, bang, homNay = new Date(), cu = []) {
  const hanCuoi = new Date(homNay.getTime() - GIU_NGAY * 864e5).toISOString().slice(0, 10);
  const theoUrl = new Map(), theoTieuDe = new Map();

  // tin cũ vào trước để giữ nguyên bản ghi đã có (kể cả ảnh đã lấy được)
  for (const it of cu) {
    if (it.d && it.d < hanCuoi) continue;
    const khoa = chuanTieuDe(it.t);
    if (theoTieuDe.has(khoa)) continue;
    theoUrl.set(it.u, it);
    theoTieuDe.set(khoa, it);
  }

  for (const it of raw) {
    if (!laTinNgap(it._text)) continue;
    const c = thanhPhoCua(it._text);
    if (!c) continue;
    if (it.d && it.d < hanCuoi) continue;

    const { fp, z } = ganDiaDiem(it._text, bang, c);
    const ban = { t: it.t, u: it.u, s: it.s, d: it.d, img: it.img, c, fp, z, canh: laCanhNgap(it.t) };

    const khoa = chuanTieuDe(it.t);
    const cu = theoTieuDe.get(khoa);
    if (cu) {
      // giữ bản có ảnh, và gộp nhãn địa điểm của cả hai
      cu.fp = [...new Set([...cu.fp, ...fp])];
      cu.z = [...new Set([...cu.z, ...z])];
      if (!cu.img && ban.img) { cu.img = ban.img; cu.u = ban.u; cu.s = ban.s; }
      continue;
    }
    if (theoUrl.has(it.u)) continue;
    theoUrl.set(it.u, ban);
    theoTieuDe.set(khoa, ban);
  }

  /* Cắt bớt theo từng thành phố: nếu không, một đợt mưa lớn ngoài Hà Nội có
     thể đẩy sạch tin TP.HCM ra khỏi tệp. Ảnh được ưu tiên hơn tin trần. */
  const xep = (a, b) => (b.img ? 1 : 0) - (a.img ? 1 : 0)
    || (b.canh || 0) - (a.canh || 0)
    || (b.d || '').localeCompare(a.d || '');
  const ra = [];
  for (const c of ['hcmc', 'hanoi']) {
    ra.push(...[...theoTieuDe.values()].filter((i) => i.c === c).sort(xep).slice(0, TOI_DA));
  }
  return ra.sort((a, b) => (b.d || '').localeCompare(a.d || ''));
}

/** Đọc tệp đã có từ lần chạy trước (nếu có). */
export function docTepCu(file = OUT_FILE) {
  if (!existsSync(file)) return [];
  try {
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(readFileSync(file, 'utf8'), ctx, { filename: 'tin_ngap.js' });
    return JSON.parse(JSON.stringify(ctx.window.TIN_NGAP?.items || []));
  } catch { return []; }
}

/* ------------------------------------------------------------------ chạy */

async function tai(url) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: { 'user-agent': 'hcmc-map news collector (+https://github.com/Nhan0311/hcmc-map)' },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(to); }
}

export async function main({ khoChay = false } = {}) {
  const W = loadData();
  const { FLOOD_POINTS } = evalConsts(['FLOOD_POINTS']);
  const bang = bangDiaDiem({
    FLOOD_POINTS,
    zonesHcmc: W.MAP_DATA.DISTRICTS.features,
    zonesHanoi: W.HANOI_DATA.ZONES.features,
  });

  const raw = [];
  const hong = [];
  await Promise.all(NGUON.map(async (n) => {
    try { raw.push(...docRss(await tai(n.url), n.ten)); }
    catch (e) { hong.push(`${n.url} → ${e.message}`); }
  }));

  const cu = docTepCu();
  const items = dungChiMuc(raw, bang, new Date(), cu);
  const ra = {
    capNhat: new Date().toISOString(),
    nguon: 'RSS công khai của các toà soạn Việt Nam + Google News. Ảnh và bản quyền thuộc toà soạn; '
      + 'chỉ hiện ảnh do chính họ đặt trong feed của mình, luôn kèm tên báo và liên kết về bài gốc.',
    items,
  };

  const dem = (f) => items.filter(f).length;
  console.log(`đọc ${raw.length} bài (+${cu.length} tin cũ) → giữ ${items.length} tin ngập: `
    + `${dem((i) => i.c === 'hcmc')} TP.HCM, ${dem((i) => i.c === 'hanoi')} Hà Nội, `
    + `${dem((i) => i.img)} có ảnh, ${dem((i) => i.fp.length)} gắn được tuyến ngập`);
  if (hong.length) console.warn('nguồn không đọc được:\n  ' + hong.join('\n  '));

  if (khoChay) { console.log(JSON.stringify(ra.items.slice(0, 5), null, 2)); return ra; }

  // Không bao giờ ghi đè bằng tệp rỗng: thà giữ tin cũ còn hơn mất sạch vì mạng lỗi.
  if (!items.length && cu.length) {
    console.warn('không lấy được tin nào — giữ nguyên tệp cũ.');
    return ra;
  }
  writeFileSync(OUT_FILE, viet(ra), 'utf8');
  console.log(`đã ghi ${OUT_FILE} (${Math.round(viet(ra).length / 1024)} KB)`);
  return ra;
}

/** Tệp .js gắn dữ liệu lên window, giống các tệp trong data/. */
export function viet(ra) {
  return '/* Tin & ảnh ngập mới nhất — TỆP NÀY DO MÁY SINH RA, đừng sửa tay.\n'
    + '   Sinh bởi tools/thu_thap_tin.mjs, chạy theo lịch trong\n'
    + '   .github/workflows/tin-ngap.yml. Ảnh và bản quyền thuộc các toà soạn. */\n'
    + 'window.TIN_NGAP = ' + JSON.stringify(ra, null, 1) + ';\n';
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href) {
  await main({ khoChay: process.argv.includes('--kho') });
}
