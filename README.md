# Ngập & Bất động sản Việt Nam — công cụ kiểm tra trước khi thuê / mua

Bản đồ tra cứu **rủi ro ngập, giá thuê/mua, quy hoạch hạ tầng và vùng phát thải thấp**
cho TP.HCM và Hà Nội. Dành cho người đi **thuê mặt bằng kinh doanh, thuê nhà ở, hoặc mua nhà/đất**.

👉 Xem trực tiếp: https://nhan0311.github.io/hcmc-map/

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
- **Hà Nội**: 11 / 71 / 220 điểm ngập ứng với mưa 50–70 / 70–100 / >100 mm/h (kế hoạch thoát nước 2026).
  Thực tế 10/2025 ghi nhận 122 điểm ngập, 23 điểm không lưu thông được.
- **Vùng phát thải thấp Hà Nội**: 9 phường trong Vành đai 1, cấm xe máy xăng theo khung giờ
  từ **01/07/2026**; mở rộng 14 phường/xã từ 01/01/2028.
- **TP.HCM**: đề án vùng phát thải thấp trung tâm (15 cầu, 20 tuyến đường) + Cần Giờ.
- **Hạ tầng**: Metro 1 Bến Thành–Suối Tiên đang khai thác; Metro 2 khởi công 15/01/2026;
  Bến Thành–Cần Giờ (~54 km) khởi công cuối 2025, dự kiến 2028; Vành đai 3 lùi thông xe
  toàn tuyến sang cuối 2026; Hà Nội tuyến 2A và 3.1 đang khai thác.
- **Giá**: nhà mặt phố cả nước Q2/2026 giảm ~3% (214 → 202 tr/m²); Hà Nội nhà riêng ~253 tr/m²;
  bán lẻ tầng trệt Hà Nội 51,8 USD/m²/tháng.
- **Hình học tuyến đường và metro**: OpenStreetMap qua Overpass API (8/2026).
- **Nền bản đồ**: Esri World Light Gray Canvas.

## Tệp

| Tệp | Nội dung |
|---|---|
| `index.html` | Toàn bộ ứng dụng (giao diện + dữ liệu ngập, quy hoạch, hạ tầng, giá) |
| `ban_do_data.js` | `window.MAP_DATA` — ranh giới quận/huyện cũ + danh sách trục đường BĐS |
| `ban_do_phuong.js` | `window.WARD_DATA` — 168 phường/xã mới (nạp khi cần) |
| `hinh_hoc_osm.js` | `window.ROAD_GEOM`, `window.METRO_GEOM` — hình học thật từ OpenStreetMap |

Chạy cục bộ: tải cả thư mục rồi mở `index.html` bằng trình duyệt (không cần máy chủ).

## Giới hạn cần biết

- Ranh giới vùng phát thải thấp và CBD **vẽ gần đúng** để định vị, không thay bản đồ quy hoạch chính thức.
- Hà Nội chưa có ranh giới vùng và dữ liệu giá theo khu vực — mới có điểm ngập, quy hoạch và metro.
- Khu vực Bình Dương cũ và Bà Rịa–Vũng Tàu cũ mới có điểm ngập và ranh phường, chưa có ước tính giá.
- Tuyến 3 Hà Nội chỉ vẽ được đoạn trên cao đã xây; đoạn ngầm chưa có trong dữ liệu bản đồ mở.

**Điều quan trọng nhất không nằm trên bản đồ nào**: đường được nâng không có nghĩa là nhà hết ngập.
Nguyễn Hữu Cảnh đã được đầu tư gần 500 tỷ để nâng đường, mặt đường nay cao hơn nhà dân có nơi gần 1 m,
khiến nhà trong hẻm ngập **nặng hơn trước**. Hãy tự đo **cao độ nền nhà so với mặt đường**:
dưới 20 cm là rủi ro, nên từ 30 cm, và từ 50 cm nếu ở vùng triều cường.

## Miễn trừ

Công cụ giúp thu hẹp lựa chọn và biết cần hỏi gì. Không thay thế việc đi xem tận nơi,
hỏi hàng xóm và xin thông tin quy hoạch tại UBND phường. Không dùng làm căn cứ pháp lý hay định giá.
