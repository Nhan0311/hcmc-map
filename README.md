# Ngập & Bất động sản Việt Nam — công cụ kiểm tra trước khi thuê / mua

[![CI](https://github.com/Nhan0311/hcmc-map/actions/workflows/ci.yml/badge.svg)](https://github.com/Nhan0311/hcmc-map/actions/workflows/ci.yml)
[![Trang trực tiếp](https://img.shields.io/badge/xem%20tr%E1%BB%B1c%20ti%E1%BA%BFp-nhan0311.github.io%2Fhcmc--map-2563eb)](https://nhan0311.github.io/hcmc-map/)
[![Giấy phép: MIT](https://img.shields.io/badge/gi%E1%BA%A5y%20ph%C3%A9p-MIT-059669)](LICENSE)

Bản đồ tra cứu **rủi ro ngập, giá thuê/mua, quy hoạch hạ tầng và vùng phát thải thấp**
cho TP.HCM và Hà Nội — **cả hai thành phố nay đều chia màu theo đơn vị hành chính sau sáp nhập**.
Dành cho người đi **thuê mặt bằng kinh doanh, thuê nhà ở, hoặc mua nhà/đất**.

👉 Xem trực tiếp: **https://nhan0311.github.io/hcmc-map/**

Một trang HTML tĩnh, không cần máy chủ, không cần đăng ký, không thu thập gì.

## Dùng để làm gì

1. **Kiểm tra một địa chỉ cụ thể** — dán địa chỉ trong tin đăng, nhận điểm rủi ro 0–100,
   điểm ngập công bố gần nhất, độ sâu, thời gian rút nước, **tên phường mới** (để ghi hợp đồng / sổ đỏ),
   có nằm trong vùng phát thải thấp không, ga metro gần nhất, và việc cần làm trước khi ký.
2. **So sánh 2–3 khu vực** theo ngập, tiền và mức đáng tiền.
3. **Quy rủi ro ngập ra tiền** — máy tính thiệt hại, ra con số cụ thể để thương lượng giảm giá thuê.
4. **Checklist in được** mang theo khi đi xem nhà.

## Ba loại dữ liệu — phân biệt rõ

| Nhãn | Nghĩa |
|---|---|
| `chính thức` | Cơ quan nhà nước công bố |
| `báo chí` | Báo chí dẫn số liệu |
| `ước tính` | Mô hình của công cụ, **không phải số đo** |

% ngập, số ngày ngập/năm, độ sâu và giá thuê theo vùng đều là **ước tính để so sánh tương đối**.
Điểm ngập, ranh giới phường, vùng phát thải thấp và hình học tuyến đường là dữ liệu thật.

## Nguồn chính

- **34 tuyến ngập TP.HCM** (26 do mưa, 8 do triều) — Sở Xây dựng TP.HCM công bố 6/2026.
  Công cụ định vị được 32/34; 2 tuyến do mưa chưa được nêu tên cụ thể trong nguồn.
- **159 vị trí ngập** toàn TP.HCM sau sáp nhập (TP.HCM cũ 76, Thủ Đức cũ 19, Bình Dương cũ 52, BR-VT cũ 31).
- **Triều cường**: đỉnh Thủ Dầu Một **1,88 m** (06/11/2025), Phú An **1,78 m** — đều vượt kỷ lục cũ.
- **168 phường/xã TP.HCM** (113 phường, 54 xã, 1 đặc khu) theo Nghị quyết 1685/NQ-UBTVQH15,
  hiệu lực 01/07/2025 — bỏ cấp quận/huyện, sáp nhập Bình Dương và Bà Rịa–Vũng Tàu.
- **Hà Nội**: 11 / 71 / 220 điểm ngập ứng với mưa 50–70 / 70–100 / >100 mm/h (kế hoạch thoát nước 2026,
  UBND TP phê duyệt 29/4); 220 điểm rơi vào **54 phường/xã**.
  Thực tế 10/2025 ghi nhận 122 điểm ngập, 23 điểm không lưu thông được.
- **11 điểm ngập cố hữu Hà Nội** (ngập khi mưa 50–100 mm trong 2 giờ): Nguyễn Khuyến, Hoa Bằng,
  Phan Bội Châu × Lý Thường Kiệt, ngã năm Đường Thành – Bát Đàn – Nhà Hỏa, Cao Bá Quát,
  Thụy Khuê (dốc La Pho), Minh Khai (chân cầu Vĩnh Tuy), Nguyễn Chính, Đại lộ Thăng Long,
  Ngọc Lâm, Hoàng Như Tiếp.
- **126 phường/xã Hà Nội** (51 phường, 75 xã) theo Nghị quyết 1656/NQ-UBTVQH15, hiệu lực 01/07/2025.
  Bản đồ Hà Nội vẽ **thẳng theo ranh phường/xã mới** — mỗi phường kèm quận/huyện cũ để đối chiếu tin đăng.
- **Vùng phát thải thấp Hà Nội**: 9 phường trong Vành đai 1, cấm xe máy xăng theo khung giờ
  từ **01/07/2026**; mở rộng 14 phường/xã từ 01/01/2028.
- **TP.HCM**: đề án vùng phát thải thấp trung tâm (15 cầu, 20 tuyến đường) + Cần Giờ.
- **Hạ tầng**: Metro 1 Bến Thành–Suối Tiên đang khai thác; Metro 2 khởi công 15/01/2026;
  Bến Thành–Cần Giờ (~54 km) khởi công cuối 2025, dự kiến 2028; Vành đai 3 lùi thông xe
  toàn tuyến sang cuối 2026; Hà Nội tuyến 2A và 3.1 đang khai thác.
- **Giá**: nhà mặt phố cả nước Q2/2026 giảm ~3% (214 → 202 tr/m²); Hà Nội nhà riêng ~253 tr/m²;
  bán lẻ tầng trệt Hà Nội 51,8 USD/m²/tháng.
- **Hình học tuyến đường, metro và ranh 126 phường/xã Hà Nội**: OpenStreetMap qua Overpass API (8/2026).
- **Nền bản đồ**: Esri World Light Gray Canvas; **ảnh vệ tinh**: Esri World Imagery (Maxar, Earthstar Geographics).
- **Ảnh 3D chụp thật**: Google Photorealistic 3D Tiles hiển thị bằng CesiumJS — tuỳ chọn, cần khoá API của người dùng.

## Cấu trúc thư mục

```
index.html              toàn bộ ứng dụng: giao diện + dữ liệu ngập, quy hoạch, hạ tầng, giá
data/
  ban_do_data.js        window.MAP_DATA   — 41 vùng TP.HCM + trục đường BĐS + bảng tra phường→vùng
  ban_do_phuong.js      window.WARD_DATA  — ranh 168 phường/xã TP.HCM (nạp khi cần)
  ban_do_hanoi.js       window.HANOI_DATA — ranh 126 phường/xã Hà Nội + ước tính ngập/giá (nạp khi cần)
  hinh_hoc_osm.js       window.ROAD_GEOM, window.METRO_GEOM — hình học thật từ OpenStreetMap
tests/
  data.test.mjs         kiểm tra toàn vẹn dữ liệu (Node, không cần trình duyệt)
  ui.test.mjs           kiểm tra giao diện bằng Chromium thật (Playwright)
  serve.mjs             máy chủ tĩnh cho phát triển và kiểm tra
  helpers.mjs           tiện ích dùng chung
```

`data/*.js` nạp theo kiểu `window.X = …` chứ không phải module, để trang mở được
bằng `file://` mà không cần máy chủ.

## Chạy cục bộ

Cách nhanh nhất: tải cả thư mục rồi mở `index.html` bằng trình duyệt — không cần cài gì.

Muốn giống môi trường GitHub Pages (khuyến nghị khi sửa mã):

```bash
npm install     # chỉ cần cho phần chạy thử và kiểm tra
npm start       # → http://127.0.0.1:8080
```

## Kiểm tra

```bash
npm install
npx playwright install chromium   # lần đầu
npm test                          # dữ liệu + giao diện
npm run test:data                 # chỉ phần dữ liệu, chạy trong ~0,2 giây
npm run test:ui                   # chỉ phần giao diện
```

Bài kiểm tra giao diện **chặn toàn bộ mạng ngoài** (Esri, Overpass, Photon, CDN) và trả lời giả,
nên chạy được ngoại tuyến và không phụ thuộc dịch vụ bên thứ ba. Leaflet được phục vụ từ
`node_modules` đúng phiên bản mà `index.html` gọi từ CDN.

Bài kiểm tra dữ liệu đọc thẳng các hằng số nằm trong `index.html` (`FLOOD_POINTS`, `LEZ`,
`INFRA`, `I18N`, `CITIES`…), nên số liệu trong bài kiểm tra và số liệu trang chạy thật
luôn là một. Thêm một vùng mà quên số liệu bổ sung, đặt sai toạ độ một điểm ngập, hay
thiếu một khoá tiếng Anh — đều bị chặn ngay.

GitHub Actions chạy `npm test` cho mỗi lần đẩy mã và mỗi pull request
(`.github/workflows/ci.yml`), rồi xuất bản lên GitHub Pages
(`.github/workflows/pages.yml`).

## Sửa dữ liệu

| Muốn thêm/sửa | Sửa ở đâu |
|---|---|
| Điểm ngập | `FLOOD_POINTS` trong `index.html` |
| Ước tính giá / ngày ngập theo vùng TP.HCM | `DISTRICT_EXTRA` trong `index.html`, hoặc `NEW_EXTRA` trong `data/ban_do_data.js` |
| Ước tính theo phường/xã Hà Nội | `EXTRA` trong `data/ban_do_hanoi.js` |
| Vùng phát thải thấp / CBD / hạ tầng | `LEZ`, `CBD`, `INFRA` trong `index.html` |
| Chữ trên giao diện | `I18N` trong `index.html` (phải có đủ cả `vi` và `en`) |

Sửa xong chạy `npm run test:data` — mất chưa tới một giây và bắt được hầu hết lỗi gõ nhầm.

## Nhìn tận nơi trước khi ký

Sau khi kiểm tra một địa chỉ, bấm **👁 Nhìn tận nơi** để thấy chính mảnh đất / căn nhà đó —
hẻm rộng bao nhiêu, có sát kênh mương ao hồ không, mặt đường cao hơn hay thấp hơn nền nhà:

| Cách | Cần khoá API | Được gì |
|---|---|---|
| 🧊 Cảnh 3D ngay trong công cụ | không | Ảnh vệ tinh phủ địa hình thật + khối nhà OpenStreetMap + **khối nước dựng theo độ sâu ngập đã công bố** |
| 🛰 Ảnh vệ tinh ngay trong bản đồ | không | Điểm ngập, ranh phường, vùng phát thải thấp chồng lên ảnh vệ tinh, không rời trang |
| 🗺 Google Maps vệ tinh / 🚶 Street View / 🌍 Google Earth | không | Mở tab mới: nhìn mặt tiền, bậc thềm, cốt nền |
| 👁 Ảnh 3D chụp thật của Google | có (của bạn) | Photorealistic 3D Tiles qua CesiumJS, kèm các điểm ngập hiện ngay trong không gian 3D |

Khoá Google Maps API (nếu dùng) chỉ lưu trong trình duyệt của bạn (`localStorage`) và gửi thẳng
tới Google — công cụ này không có máy chủ nào để nhận nó. Google tính phí theo lượt tải ảnh 3D,
nên hãy giới hạn khoá theo tên miền trong Cloud Console.

## Giới hạn cần biết

- Ranh giới vùng phát thải thấp và CBD **vẽ gần đúng** để định vị, không thay bản đồ quy hoạch chính thức.
- Hà Nội: mức ngập và giá của từng phường/xã là **mô hình**, suy từ lưu vực thoát nước
  (Tô Lịch, Kim Ngưu, Lừ, Sét, Nhuệ, Cầu Bây, Bùi, Tích, Đáy), 11 điểm ngập cố hữu đã công bố
  và mặt bằng giá từng khu vực — **không phải số đo riêng cho từng phường**.
- Hà Nội chưa có lớp trục đường bất động sản như TP.HCM.
- Ảnh 3D chụp thật cần khoá Google Maps API của chính người dùng; ảnh vệ tinh, Street View
  và Google Earth thì không cần gì.
- Khu vực Bình Dương cũ và Bà Rịa–Vũng Tàu cũ mới có điểm ngập và ranh phường, chưa có ước tính giá.
- Tuyến 3 Hà Nội chỉ vẽ được đoạn trên cao đã xây; đoạn ngầm chưa có trong dữ liệu bản đồ mở.
- Khung nhìn mở đầu ôm phần đô thị liền mạch; **đặc khu Côn Đảo** cách bờ ~200 km nên nằm ngoài
  khung — vẫn có trong danh sách bên phải và hiện ra khi kéo bản đồ.

**Điều quan trọng nhất không nằm trên bản đồ nào**: đường được nâng không có nghĩa là nhà hết ngập.
Nguyễn Hữu Cảnh đã được đầu tư gần 500 tỷ để nâng đường, mặt đường nay cao hơn nhà dân có nơi gần 1 m,
khiến nhà trong hẻm ngập **nặng hơn trước**. Hãy tự đo **cao độ nền nhà so với mặt đường**:
dưới 20 cm là rủi ro, nên từ 30 cm, và từ 50 cm nếu ở vùng triều cường.

## Miễn trừ

Công cụ giúp thu hẹp lựa chọn và biết cần hỏi gì. Không thay thế việc đi xem tận nơi,
hỏi hàng xóm và xin thông tin quy hoạch tại UBND phường. Không dùng làm căn cứ pháp lý hay định giá.

## Giấy phép

Mã nguồn: [MIT](LICENSE). Dữ liệu bản đồ giữ giấy phép của nguồn gốc —
ranh giới và hình học tuyến đường từ OpenStreetMap theo ODbL, nền bản đồ và ảnh vệ tinh
theo điều khoản của Esri. Xem phần cuối tệp `LICENSE`.

---

<details>
<summary><b>In English</b></summary>

**Flood & property risk map for Ho Chi Minh City and Hanoi.** Paste an address from a rental or
sale listing and get a 0–100 flood-risk score, the nearest officially published flood point
(distance, typical depth, drain time), the **new ward name** you must write on the contract or
land title after Vietnam abolished the district tier on 01/07/2025, whether the address sits
inside a low-emission zone, the nearest metro, and a checklist of what to do before signing.

Both cities are drawn on the post-merger administrative units: 41 zones covering HCMC
(including former Binh Duong and Ba Ria–Vung Tau) plus a 168-ward overlay, and Hanoi's
126 wards/communes directly.

Three data labels are kept strictly apart: `chính thức` (official), `báo chí` (press),
`ước tính` (this tool's model — **not** a measurement). Flood points, ward boundaries and road
geometry are real data; flood percentages, flood days per year, depths and rents per zone are
estimates for relative comparison only.

A single static HTML page — no server, no sign-up, no tracking. Open `index.html`, or run
`npm start`. Tests: `npm install && npx playwright install chromium && npm test`.
The UI tests block all outbound network traffic, so they run offline.

Code is MIT; map data keeps its upstream licences (OpenStreetMap ODbL, Esri terms).

</details>
