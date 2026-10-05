# Quy tắc xử lý bản cập nhật cho dữ liệu sách

## Phạm vi

Ứng dụng vẫn xử lý trong trình duyệt. Đánh giá chính hướng đến ngành sách. Mẫu bảng ngang FAHASA chỉ là tham khảo cấu trúc, không phải bằng chứng giao dịch bán hàng.

## Dữ liệu và truy vết

- Mỗi dòng kết quả giữ nguồn nội bộ độc lập với tên file, số dòng nguồn (tính cả hàng tiêu đề), ô dữ liệu gốc và ứng viên ghép.
- Nhà xuất bản, tác giả và nhà cung cấp là các trường riêng.
- Giá bìa không thay giá bán. Thiếu ngày/trạng thái/mã đơn được giữ thiếu.
- Bảng ngang giữ cả ô 0 hoặc ghi chú không phải số để kiểm tra; không chuyển thành doanh thu. Ô trống không tạo dòng.
- Ngày Excel dạng Date giữ ngày địa phương. Ngày không tồn tại và số sai định dạng bị từ chối chuẩn hóa.

## Đối chiếu và duyệt

- Khớp tự động gồm MATCHED_EXACT và MATCHED_FUZZY_HIGH. NEEDS_CONFIRMATION chỉ chứa ứng viên; chưa thay thông tin sách gốc.
- Chấp thuận chuyển thành MATCHED_CONFIRMED_USER. Từ chối trả về thông tin nguồn, giữ quyết định REJECTED_USER. Có thể đổi lại quyết định.
- Mỗi lần duyệt tính lại dữ liệu, cảnh báo, KPI, biểu đồ và dữ liệu xuất từ cùng một kết quả.
- Chặn fuzzy khi có khác biệt số trong tên, hai ISBN khác nhau, bìa cứng/bìa mềm hoặc bộ/combo và sách lẻ. Đây là hàng rào heuristic, chưa bảo đảm mọi liên kết đều đúng.
- Crosswalk nhận internal_code/standard_code hoặc Mã nội bộ/Mã chuẩn. Mã nội bộ phải không mâu thuẫn trên toàn tệp. Dùng với Catalog hoặc Master Source.
- Bipartite là greedy, không bảo đảm tối ưu tổng trọng số; thứ tự nguồn vẫn có thể ảnh hưởng kết quả. Không dùng catalog ghép còn chờ duyệt làm bằng chứng cho nguồn tiếp theo.

## Bổ sung hàng rào định danh sách

- Crosswalk có thêm cột source (hoặc Nguồn), là tên tệp đơn hàng. Mã không được mâu thuẫn trong từng nguồn; bỏ trống source là ánh xạ chung. Mã đích phải có trong danh mục. Quy tắc này thay thế yêu cầu mã nội bộ duy nhất toàn cục ở trên.
- Khóa tên sách giữ thông tin trong ngoặc. Cùng mã trong một nguồn nhưng khác tập/kiểu bìa được báo lỗi để đối soát.
- SKU nội bộ trùng giữa các nguồn không đủ để khớp chính xác. ISBN dạng 978/979 gồm 13 chữ số được dùng chung; sai checksum vẫn được cảnh báo riêng. Catalog tải riêng được giả định dùng hệ mã chuẩn chung.
- Fuzzy điểm cao nhưng ứng viên cạnh tranh chênh không quá 5 điểm vẫn cần duyệt. Biên 5 điểm là heuristic cần đánh giá trên Ground Truth.
- Clustering không tự tính bản ghi đầu tiên là đã khớp. Thành viên chờ duyệt không đóng góp giá/tên đại diện. Duyệt thủ công cập nhật liên kết dòng và báo cáo, không tái gom cụm.
- Danh mục trùng mã nhưng khác tên/NXB/giá tham chiếu bị chặn; bản ghi giống nhau được gộp.
- Cảnh báo giá chỉ so với liên kết đã chấp nhận. Không báo thiếu danh mục khi chiến lược không có danh mục đối chiếu.
- Kết quả giữ cấu hình của lần chạy; thay đổi cấu hình cần chạy lại để có hiệu lực.

## Giá trị giao dịch

- INCLUDED: dòng không phải bảng ngang; số lượng nguyên dương; giá bán không âm; trạng thái chuẩn là Hoàn thành.
- CANCELLED: cùng điều kiện số liệu nhưng trạng thái Đã hủy/Trả hàng (bao gồm Hoàn tiền đã chuẩn hóa).
- UNCONFIRMED_STATUS: thiếu hoặc chưa xác định trạng thái, hoặc giao dịch chưa hoàn thành.
- INVALID_VALUE: thiếu/sai số lượng hoặc giá; không thay số thiếu bằng 0.
- UNKNOWN_DATA_TYPE: bảng ngang chưa xác định nghiệp vụ.
- Giá trị đầu vào tính được = giá trị đủ điều kiện + giá trị hủy/hoàn + giá trị chưa xác định trạng thái. Không tính phí vận chuyển, chiết khấu hay doanh thu thuần kế toán.
- Dòng nghi trùng chỉ được cảnh báo theo nguồn, mã đơn, sản phẩm, ngày, số lượng, giá, kênh và trạng thái. Phần giá trị nghi trùng tính trên các lần xuất hiện sau dòng đầu; chưa tự khấu trừ và chưa có luồng duyệt loại trùng.

## Chỉ số nghiên cứu

- Bộ đếm chuẩn hóa là số thao tác, không phải độ chính xác.
- Delta RQ2 chỉ dùng liên kết tự động đã chấp nhận trước HITL; ứng viên không chắc chắn không được tính. Không có baseline thì không hiển thị delta.
- Chỉ số định danh phân biệt các mã sách khác nhau dù trùng tên. Bản ghi chưa liên kết giữ riêng theo nguồn.
- Các tổng giá trị trước/sau chưa chứng minh hiệu quả nghiên cứu khi chưa có Ground Truth độc lập.

## Kiểm tra

Chạy `npm test`, `npm run build`, `npm run lint`. Bộ regression bao phủ lỗi đầu vào, date, unpivot, HITL, Crosswalk, dòng trùng, ISBN và thống nhất số liệu. Có kiểm tra render HTML tĩnh cho HITL; chưa thay thế kiểm thử tương tác trình duyệt với các file thực tế.

## Công việc nghiên cứu tiếp theo

Chuẩn bị bộ sách và giao dịch tổng hợp có kiểm soát, xác nhận Ground Truth, bổ sung bộ chạy precision/recall/F1 và đo thời gian. Những phần này chưa được thay bằng số liệu giả định trong ứng dụng.
