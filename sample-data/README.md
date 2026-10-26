# Bộ dữ liệu mẫu ngành sách

Ngày cập nhật: 07/10/2026. Bộ mới thay nội dung 5 file mẫu cũ; giữ tên file để không đổi đường dẫn sử dụng trong repo.

| File trong repo | File gốc trong `new/` | Số dòng dữ liệu |
| --- | --- | ---: |
| Danh_Muc_Sach_Master.xlsx | Danh_Muc_Sach_Master_Chuan_Hoa_inventory.xlsx | 57 |
| Don_Hang_Lazada.xlsx | Don_Hang_Lazada_final.xlsx | 33 |
| Don_Hang_POS.xlsx | Don_Hang_POS_final.xlsx | 100 |
| Don_Hang_Shopee.xlsx | Don_Hang_Shopee_final.xlsx | 100 |
| Don_Hang_TikTok_Shop.xlsx | Don_Hang_TikTok_Shop_final.xlsx | 33 |

Đây là dữ liệu mẫu/mô phỏng phục vụ kiểm thử, không phải dữ liệu giao dịch thực được FAHASA cung cấp. Một số mã barcode có thể không đạt checksum; hệ thống cảnh báo nhưng không chặn nạp dữ liệu.

Để thử chế độ đối chiếu danh mục, chọn `Danh_Muc_Sach_Master.xlsx` làm danh mục chuẩn và 4 file còn lại làm nguồn giao dịch (tổng 266 dòng). Với cấu hình mặc định, kết quả đã kiểm tra: 255 dòng khớp mã, 11 dòng chưa liên kết, giá trị bán đủ điều kiện 26.644.760 đồng. Đây không phải phép đo precision/recall: workbook trong `Ground Truth/` mới chứa chú giải kịch bản, chưa đủ đáp án từng dòng được duyệt cho ba RQ.

Giao diện hiện cho nạp tối đa **10 tệp đơn hàng**, không tính Catalog/Crosswalk. Một kênh có thể có nhiều file nhưng cần đối soát kỳ, shop và các giao dịch chồng lấn. UI test chia bốn file đơn hàng thành mười workbook trong bộ nhớ để xác minh giữ đủ dòng, mã đơn và tổng báo cáo; không cần tạo hoặc đưa thêm các file chia nhỏ lên Git.

Thư mục `new/` giữ bản gốc ở local, không cần đưa lên Git lần nữa. Bộ mẫu cũ có thể khôi phục từ lịch sử Git trước lần cập nhật này. Các script `fix_*.cjs` cũ có thể ghi lại file mẫu; không chạy chúng lên bộ mới nếu chưa kiểm tra giả định về cấu trúc cột.
