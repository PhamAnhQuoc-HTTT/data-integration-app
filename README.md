# 🛒 Hệ Thống Tích Hợp & Kiểm Soát Chất Lượng Dữ Liệu Bán Hàng Đa Nguồn

Dự án Khóa luận tốt nghiệp ngành Hệ thống thông tin — Trường Đại học Công nghệ Thông tin (UIT — ĐHQG TP.HCM).  
**Sinh viên thực hiện:** Phạm Anh Quốc & Trần Thanh Huy.  
**🌐 Live Demo (Vercel):** [https://data-integration-app-uit.vercel.app/](https://data-integration-app-uit.vercel.app/)

---

## 🏛️ Kiến trúc & Luồng xử lý (Data Pipeline)

Hệ thống hoạt động theo kiến trúc Client-side pure JavaScript trên nền Vite + React. Hỗ trợ **Chế độ Kép (Dual Mode)** linh hoạt: Có sẵn Danh mục sản phẩm chuẩn **HOẶC** Tự động đối chiếu chéo giữa các nguồn đơn hàng (POS, Shopee, Lazada, TikTok Shop, FAHASA) bằng thuật toán Ghép cặp tối ưu toàn cục.

```mermaid
graph TD
    A[Tệp Đơn Hàng POS / Shopee / Lazada / TikTok / FAHASA] --> B[Ánh Xạ & Unpivot Đa Chi Nhánh - fieldMapping.js]
    C[Tùy chọn: Tệp Master Catalog Chuẩn] -.-> B
    B --> D[Chuẩn Hóa Dữ Liệu - normalize.js]
    D --> E{Có Master Catalog?}
    E -- Có --> F[Đối Chiếu 3 Tầng Standard - entityResolution.js]
    E -- Không có --> G[Ghép Cặp Tối Ưu Bipartite & Progressive Crosswalk - bipartiteMatching.js]
    F --> H[Kiểm Soát 6 Nhóm Lỗi - qualityRules.js]
    G --> H
    H --> I[Dataset Tích Hợp + Báo Cáo Chất Lượng + UI Xác Nhận & Học Tích Lũy]
```

---

## 📁 Cấu trúc thư mục dự án

```text
data-integration-app/
├── public/                 # Assets tĩnh
├── sample-data/            # Bộ dữ liệu mẫu Excel thực tế
│   ├── bao-cao-phan-phoi-fahasa.xlsx # Báo cáo đa chi nhánh chuẩn template FAHASA
│   ├── don-hang-online-shopee.xlsx   # Đơn hàng sàn TMĐT Shopee
│   ├── don-hang-pos-cua-hang.xlsx    # Đơn hàng tại quầy POS
│   └── danh-muc-san-pham-chuan.xlsx  # Master Catalog sản phẩm
├── scripts/
│   └── generate-sample-data.cjs  # Script sinh dữ liệu giả lập & dữ liệu thực tế
├── src/
│   ├── assets/
│   ├── logic/              # Modules xử lý lõi (Core Data Pipeline)
│   │   ├── __tests__/
│   │   │   └── logic.test.js    # Suite 52 unit tests tự động (Vitest)
│   │   ├── bipartiteMatching.js # Ghép cặp tối ưu toàn cục (Cơ chế 3) & Học tích lũy (Cơ chế 4)
│   │   ├── entityResolution.js  # Đối chiếu thực thể 3 tầng (Mã chuẩn -> Crosswalk -> Token-sort)
│   │   ├── fieldMapping.js      # Ánh xạ tên cột & Tự động Unpivot bảng ngang đa chi nhánh (FAHASA)
│   │   ├── normalize.js         # Chuẩn hóa văn bản, mã đơn, kênh bán, trạng thái, NXB, ISBN-13
│   │   ├── pipeline.js          # Main pipeline kết nối xử lý Chế độ Kép (Dual Mode)
│   │   └── qualityRules.js      # Kiểm soát chất lượng dữ liệu (6 nhóm lỗi & 3 mức severity)
│   ├── App.jsx             # Giao diện chính React UI & 3 tính năng mở rộng
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── README.md
└── vite.config.js
```

---

## 🛠️ Hướng dẫn cài đặt & Chạy ứng dụng

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Sinh tệp dữ liệu mẫu thực tế (FAHASA, Shopee, POS, Catalog)
node scripts/generate-sample-data.cjs

# 3. Chạy giao diện thử nghiệm (Dev server)
npm run dev

# 4. Chạy suite unit tests (Vitest - 52/52 tests pass)
npx vitest run

# 5. Đóng gói bản sản xuất (Production Build)
npm run build
```

---

## 📌 Các điểm cải tiến & Tính năng nổi bật
- **Chế độ Kép (Dual Mode)**: Tích hợp thành công cả khi có Master Catalog lẫn khi **không có file chuẩn** (tự động ghép cặp tối ưu bằng Bipartite Matching và tổng hợp danh mục đại diện).
- **Học tích lũy (Progressive Crosswalk Memory)**: Tự động ghi nhớ các cặp ghép do người dùng xác nhận thủ công vào LocalStorage, giúp độ chính xác tăng dần theo thời gian.
- **Xử lý dữ liệu thực tế FAHASA**: Tự động nhận diện và chuyển đổi bảng ngang phân phối đa chi nhánh (Unpivot: `GDNSBT - Long Bình Tân`, `GDNSTD - Thủ Đức`...) thành từng dòng giao dịch bán lẻ.
- **Phân loại 3 mức xử lý an toàn**: `AUTO_FIXED` (tự động sửa), `NEEDS_CONFIRMATION` (cần xác nhận), `FLAGGED_ONLY` (chỉ gắn cờ).
- **Bao phủ 6 nhóm lỗi tích hợp**: Cấu trúc (Schema), Định danh (Entity), Giá trị (Value), Thời gian (Temporal), Ngữ nghĩa (Semantic), Kỹ thuật (Technical).
- **Kiểm thử tự động**: Đạt **52/52 unit test cases** pass 100%.
- **3 Tính năng mở rộng**: Xác nhận thủ công ER, Báo cáo chất lượng dữ liệu so sánh trước/sau, và Cấu hình xử lý trực quan.
