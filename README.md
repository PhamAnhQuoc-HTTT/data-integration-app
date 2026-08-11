# Hệ thống tích hợp & kiểm soát chất lượng dữ liệu bán hàng đa nguồn

Khóa luận tốt nghiệp UIT — nhóm Phạm Anh Quốc (DA/DE) & Trần Thanh Huy (BA).

Bản React/JavaScript, chạy 100% trong trình duyệt (không cần server/backend) — kế thừa giao diện
Huy đã thiết kế, thay lõi xử lý bằng pipeline có phân 3 mức xử lý an toàn.

**Nguyên tắc thiết kế quan trọng:** hệ thống chỉ *tự động sửa* lỗi chắc chắn 100%. Mọi trường hợp
có độ mờ (fuzzy match, nghi ngờ trùng lặp, giá bất thường...) đều gắn nhãn `NEEDS_CONFIRMATION`
hoặc `FLAGGED_ONLY` — hiển thị rõ trên UI (tab "Vấn đề dữ liệu"), không tự ý sửa/xóa dữ liệu.

## Cấu trúc thư mục

```
├── src/
│   ├── App.jsx                       # Giao diện chính (giữ nguyên thiết kế của Huy)
│   ├── logic/
│   │   ├── fieldMapping.js           # FIELD_PATTERNS đa ngành hàng — chỉ sửa file này khi đổi ngành hàng
│   │   ├── normalize.js              # Chuẩn hóa text / số / ngày / mã định danh
│   │   ├── entityResolution.js       # Đối chiếu 3 tầng (mã chuẩn → crosswalk → fuzzy token-sort-ratio)
│   │   ├── qualityRules.js           # 4 nhóm lỗi, PHÂN 3 MỨC xử lý an toàn
│   │   ├── pipeline.js               # Ghép toàn bộ pipeline
│   │   └── __tests__/logic.test.js   # 22 unit test (vitest)
├── package.json
└── vite.config.js
```

## Chạy thử local

```bash
npm install
npm run dev        # mở http://localhost:5173
```

Chạy test:

```bash
npx vitest run
```

Build production:

```bash
npm run build
npm run preview     # xem thử bản build tại http://localhost:4173
```

## Deploy lên Vercel (miễn phí, có link public để gửi doanh nghiệp)

1. Tạo repo GitHub mới (public), push toàn bộ thư mục này lên (đã có sẵn `.gitignore` bỏ qua
   `node_modules`, không cần lo dung lượng).
2. Vào **vercel.com** → đăng nhập bằng GitHub → **Add New Project** → chọn repo vừa push.
3. Vercel tự nhận diện đây là project Vite — để mặc định (Build command: `npm run build`,
   Output: `dist`) → **Deploy**.
4. Sau khoảng 1 phút sẽ có link dạng `https://<tên-project>.vercel.app` — gửi link này cho
   doanh nghiệp dùng thử, không cần họ cài đặt gì.

*(Netlify cũng dùng được tương tự nếu muốn thử lựa chọn khác.)*

## Khác biệt quan trọng so với bản gốc Huy gửi

- Tách toàn bộ logic xử lý ra khỏi component UI, thành các module riêng trong `src/logic/` — dễ
  test, dễ maintain, dễ đưa cho AI khác review từng phần.
- Thêm phân loại 3 mức xử lý (`AUTO_FIXED` / `NEEDS_CONFIRMATION` / `FLAGGED_ONLY`) cho mọi lỗi
  phát hiện được — bản gốc chỉ có 1 danh sách "issues" phẳng, không phân biệt mức độ.
  Xem chi tiết lý do trong docstring đầu file `src/logic/qualityRules.js`.
- Đổi thuật toán fuzzy matching từ Levenshtein thô sang `tokenSortRatio` (không phụ thuộc thứ tự
  từ trong tên sản phẩm) — xem `src/logic/entityResolution.js`.
- Thêm interface cho crosswalk (mã nội bộ ↔ mã chuẩn) — tầng 2 trong đối chiếu 3 tầng, hiện chưa
  có dữ liệu thật nên mặc định rỗng, sẽ dùng khi có dữ liệu từ doanh nghiệp thử nghiệm.
- Có 22 unit test cho toàn bộ logic chuẩn hóa/matching/quality rules.

## Việc cần làm tiếp

- [ ] Thay dữ liệu mẫu bằng dữ liệu thật khi có doanh nghiệp đồng ý hợp tác.
- [ ] Nạp dữ liệu crosswalk thật khi cần (tầng 2 entity resolution).
- [ ] Xây ground truth thủ công (50-100 giao dịch) để đo Precision/Recall/F1, tinh chỉnh lại
      `FUZZY_HIGH_THRESHOLD` / `FUZZY_CONFIRM_THRESHOLD` trong `entityResolution.js`.
- [ ] Cân nhắc bổ sung Bootstrap CI cho các chỉ số đánh giá (có thể viết thuần JS, hoặc export
      dữ liệu ra CSV rồi tính bằng Python/Excel riêng cho phần báo cáo).
