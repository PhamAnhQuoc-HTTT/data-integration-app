# Hệ thống Tích hợp & Quản trị Chất lượng Dữ liệu Bán hàng Đa nguồn

Multi-source Sales Data Integration and Data Quality Management System

Khóa luận tốt nghiệp ngành Hệ thống Thông tin, Trường Đại học Công nghệ Thông tin — ĐHQG-HCM.
Sinh viên thực hiện: Phạm Anh Quốc & Trần Thanh Huy.

[Demo](https://data-integration-app-phamanhquoc-httts-projects.vercel.app/) · [Quy tắc triển khai](docs/IMPLEMENTATION_NOTES.md) · [Dữ liệu mẫu](sample-data/README.md)

## Phạm vi và ba câu hỏi nghiên cứu

Ứng dụng React xử lý tệp Excel/CSV trong trình duyệt, tập trung thử nghiệm ngành sách với các nguồn mô phỏng POS, Shopee, Lazada và TikTok Shop. Dữ liệu mẫu không phải giao dịch thực do FAHASA cung cấp. Bảng ngang theo chi nhánh chỉ phục vụ đối soát khi chưa xác định được nghiệp vụ.

1. **RQ1:** Hệ thống đạt hiệu quả như thế nào trong việc ánh xạ và chuẩn hóa dữ liệu bán hàng không đồng nhất từ nhiều nguồn?
2. **RQ2:** Phương pháp đối chiếu thực thể nhiều tầng có cải thiện khả năng liên kết sản phẩm so với exact matching đơn giản hay không?
3. **RQ3:** Việc tích hợp và kiểm soát chất lượng dữ liệu có làm giảm sai lệch trong các báo cáo quản trị cơ bản hay không?

Tỷ lệ liên kết, số thao tác chuẩn hóa và tổng tiền trên giao diện là số liệu vận hành. Độ chính xác và mức giảm sai lệch cần đánh giá riêng với Ground Truth độc lập.

## Chạy local

Vite 8 yêu cầu Node.js `^20.19.0 || >=22.12.0`. Môi trường đã kiểm tra dùng Node.js 24.15.0.

```bash
git clone https://github.com/PhamAnhQuoc-HTTT/data-integration-app.git
cd data-integration-app
npm ci
npm run dev
```

Mở địa chỉ Vite thông báo trong terminal, thường là `http://localhost:5173/`.

```bash
npm test
npm run lint
npm run build
npm run preview
```

Bộ test bao gồm chuẩn hóa, mapping, matching, HITL, tồn kho, đối soát báo cáo, round-trip CSV/Excel và tương tác React/JSDOM. Kiểm thử JSDOM không thay thế kiểm tra bố cục trên trình duyệt thật. Các bài kiểm tra dùng tài liệu chỉ có ở local được bỏ qua khi thiếu dữ liệu đó.

## Nạp dữ liệu và cấu hình

- Tối đa **10 tệp đơn hàng** mỗi lần chạy; một kênh có thể có nhiều file. Tệp Catalog và Crosswalk được tải riêng, không tính vào giới hạn này. Giới hạn số file chưa phải cam kết hiệu năng cho mọi dung lượng hoặc số dòng.
- Nhận `.xlsx`, `.xls`, `.csv` UTF-8; giao diện đọc sheet đầu tiên và dùng hàng đầu làm header. Bộ kiểm toán GT riêng có hợp đồng đọc khác cho workbook chú giải.
- Xem lại ánh xạ cột và kênh bán trước khi chạy. Cùng tên file trong một lần nạp bị bỏ qua để tránh nhầm nguồn truy vết.
- Chọn **Gói cấu hình** để mở ba preset và tham số kỹ thuật. Thay đổi ngưỡng trên kết quả cần chạy lại; quyết định HITL cũ được xóa khi chạy lại thành công sau xác nhận.
- Có Catalog: dùng Exact → Crosswalk → Fuzzy Token-Sort. Không có Catalog: chọn ghép cặp tham lam, gom cụm hoặc chỉ định một nguồn làm chuẩn. Ghép cặp tham lam không bảo đảm tối ưu tổng trọng số.
- Crosswalk dùng `internal_code`, `standard_code`; thêm `source` là tên file nếu mã nội bộ khác nhau giữa các nguồn. Mã đích phải tồn tại và ánh xạ không được mâu thuẫn trong phạm vi nguồn. Dùng với Catalog hoặc Master Source.

| Gói | Đề xuất từ | Tự động từ | Cảnh báo lệch giá |
| --- | ---: | ---: | ---: |
| Tiêu Chuẩn | 70% | 90% | Trên 30% |
| Nghiêm Ngặt | 85% | 95% | Trên 15% |
| Tự Động Hóa Cao | 55% | 80% | Trên 50% |

Tự động ghép còn phụ thuộc ràng buộc thực thể và khoảng cách ứng viên. Điểm cao vẫn cần duyệt khi ứng viên cạnh tranh chênh không quá 5 điểm hoặc thiếu metadata phân biệt. Dòng chưa có ứng viên được giữ riêng; đây không phải đề xuất để người dùng chấp thuận. HITL là duyệt liên kết, chưa có mô hình Active Learning tự học từ các quyết định.

## Đầu ra và chính sách nghiệp vụ

- CSV và sheet `Ket_Qua_Tich_Hop` có **41 cột**, giữ dữ liệu nguồn, mã thực thể Catalog, ngày có căn cứ, tình trạng ngày, phạm vi nguồn/shop/dòng đơn và trạng thái nghi trùng.
- Excel thêm `Bao_Cao_Kenh`, `Bao_Cao_San_Pham`, `Bao_Cao_Thang`, `Doi_Soat_Bao_Cao`. Phần chưa phân bổ đã nằm trong tổng đủ điều kiện, không cộng thêm lần nữa.
- Giá trị bán đủ điều kiện là tiền sản phẩm của dòng hoàn thành, giá hợp lệ và số lượng nguyên dương an toàn. Giá bìa/giá vốn/tổng thanh toán đơn không thay giá bán. Tiền dòng sau giảm giá được giữ nguyên, không nhân lại đơn giá đã làm tròn.
- Hoàn tiền hoàn tất, yêu cầu trả/hoàn và yêu cầu bị từ chối được phân biệt. Chưa tự xác định doanh thu thuần sau hoàn một phần, phí sàn hoặc phí vận chuyển.
- Ngày mơ hồ DD/MM–MM/DD chưa có quy ước nguồn chỉ dùng mặc định DD/MM để hiển thị; chưa phân bổ kỳ hoặc đề xuất trừ tồn cho dòng đó.
- Lặp khóa mạnh hệ thống/shop/đơn/dòng giữ tất cả bản ghi chờ đối soát. Nghi trùng thiếu khóa mạnh chỉ cảnh báo, chưa tự trừ tiền. Không tự xóa mọi dòng cùng mã đơn.
- Xuất master tồn kho cần chọn cột **tồn đầu kỳ chưa trừ các đơn nạp** và xác nhận trên giao diện. Kết quả là đề xuất đối soát; chưa tự cộng hàng trả hoặc tự tách Combo thiếu danh sách thành phần.

Các profile nguồn (`shopId`, `sourceCodeType`, `dateLocale`, `noReturnMarkers`) hiện khai báo qua API pipeline; chưa có màn hình cấu hình profile riêng. Xem ví dụ và các giả định tại [ghi chú triển khai](docs/IMPLEMENTATION_NOTES.md).

## Đánh giá nghiên cứu

```bash
npm run evaluate:research
npm run audit:gt
```

`evaluate:research` dùng generator tổng hợp có đáp án trước khi chèn lỗi, tách họ sản phẩm phát triển/đánh giá và chạy Exact-only, Fuzzy-only, Multi-tier độc lập. Các baseline cùng dùng ràng buộc nghiệp vụ; Fuzzy-only không phải phép so tên hoàn toàn không có guard. Nhãn `KNOWN_BY_CONSTRUCTION` không phải nhãn shop thật được người duyệt xác nhận.

Pilot hiện cho Multi-tier và Fuzzy-only cùng F1 khoảng 94,37%, so với Exact-only khoảng 51,22% trên 387 dòng đánh giá. Chưa chứng minh Multi-tier tốt hơn Fuzzy-only hoặc suy rộng kết quả sang dữ liệu thật. RQ3 phân biệt tính đúng hợp đồng trên dữ liệu quan sát và sai lệch so với dữ liệu sạch/duy nhất trước lỗi; hai phép đo không được dùng thay nhau.

`audit:gt` đọc workbook chú giải trong `Ground Truth/`, dùng bản nguồn local `sample-data/new/` nếu có, nếu không dùng các bản tương ứng trong `sample-data/`. Script ghi hash/tên file thực tế, không sửa workbook và không tự duyệt nhãn. Các chú giải kịch bản chưa đủ để chấm đáp án từng trường/liên kết/số tiền cho toàn bộ dữ liệu.

Kết quả script sinh dưới `outputs/research-2026-10-26/`; thư mục này không cần có sẵn và không được dùng làm đầu vào đáp án cho matcher.

## Các thành phần chính

| Thành phần | Vai trò |
| --- | --- |
| `fieldMapping.js`, `normalize.js` | Nhận diện header, chuẩn hóa giá trị, căn cứ ngày |
| `entityResolution.js`, `bookMatching.js`, `strategies/` | Đối chiếu thực thể và ràng buộc sách |
| `transactionIdentity.js`, `qualityRules.js` | Phạm vi giao dịch, nghi trùng và chất lượng |
| `pipeline.js`, `businessReports.js` | Điều phối, duyệt HITL, phân bổ báo cáo |
| `exportData.js`, `reportExport.js`, `inventory.js` | Dữ liệu dòng, bảng báo cáo, đề xuất tồn kho |
| `researchEvaluation.js`, `scripts/evaluateResearch.mjs` | Chấm ba RQ bằng nhãn độc lập |

Giao diện dùng React 19, Tailwind CSS, Recharts và Lucide; đọc/ghi bảng tính bằng SheetJS. Tệp giao dịch được xử lý tại trình duyệt, không có API upload giao dịch trong ứng dụng hiện tại.
