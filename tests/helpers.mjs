/* Tiện ích chỉ dùng cho các bài kiểm tra.
   Phần đọc dữ liệu dùng chung nằm ở tools/doc_du_lieu.mjs. */
export { ROOT, DATA_FILES, loadData, html, constFromHtml, evalConsts } from '../tools/doc_du_lieu.mjs';

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
