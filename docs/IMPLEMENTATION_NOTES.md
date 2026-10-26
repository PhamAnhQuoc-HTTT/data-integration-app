# Quy tắc xử lý bản cập nhật cho dữ liệu sách

Phiên bản hợp đồng: `sales-contract-v2-2026-10-26`.

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
- Fuzzy xét số theo vai trò tập, năm ấn bản và số thuộc tên; giữ thông tin bìa/ngôn ngữ trong ngoặc. Chặn xung đột đã biết, chuyển duyệt khi thiếu metadata phân biệt, không coi mọi chữ số khác nhau là xung đột. Đây là hàng rào heuristic, chưa bảo đảm mọi liên kết đều đúng.
- Crosswalk nhận internal_code/standard_code hoặc Mã nội bộ/Mã chuẩn, tùy chọn source theo tên file. Mã nội bộ phải không mâu thuẫn trong từng phạm vi nguồn. Dùng với Catalog hoặc Master Source.
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

- INCLUDED: dòng không phải bảng ngang/lặp khóa mạnh; số lượng nguyên dương an toàn; giá bán không âm; tiền hữu hạn; trạng thái chuẩn là Hoàn thành.
- CANCELLED: cùng điều kiện số liệu nhưng trạng thái Đã hủy/Trả hàng (bao gồm Hoàn tiền đã chuẩn hóa).
- UNCONFIRMED_STATUS: thiếu hoặc chưa xác định trạng thái, hoặc giao dịch chưa hoàn thành.
- DUPLICATE_REVIEW: lặp khóa mạnh gồm hệ thống + shop + đơn + mã dòng. Giữ tất cả các dòng chờ chọn snapshot, không tự chọn bản cuối.
- INVALID_VALUE: thiếu/sai số lượng hoặc giá; không thay số thiếu bằng 0.
- UNKNOWN_DATA_TYPE: bảng ngang chưa xác định nghiệp vụ.
- Giá trị đầu vào tính được = giá trị đủ điều kiện + giá trị hủy/hoàn + giá trị chưa xác định trạng thái + giá trị chờ lặp khóa mạnh. Tổng sản phẩm sau giảm giá được giữ khi nguồn cung cấp; chưa trừ phí vận chuyển/phí sàn hoặc xác định doanh thu thuần kế toán.
- Khi thiếu khóa mạnh, tổ hợp mã đơn/sản phẩm/ngày/số lượng/giá/trạng thái và phạm vi sẵn có chỉ tạo POSSIBLE_DUPLICATE. Phần tiền nghi trùng tính trên các lần xuất hiện sau dòng đầu, chưa tự khấu trừ; tồn kho giữ chờ tránh trừ hai lần. Hai shop hoặc hai mã dòng khác nhau không tự bị gộp.

## Chỉ số nghiên cứu

- Bộ đếm chuẩn hóa là số thao tác, không phải độ chính xác.
- Delta RQ2 chỉ dùng liên kết tự động đã chấp nhận trước HITL; ứng viên không chắc chắn không được tính. Không có baseline thì không hiển thị delta.
- Chỉ số định danh phân biệt các mã sách khác nhau dù trùng tên. Bản ghi chưa liên kết giữ riêng theo nguồn.
- Các tổng giá trị trước/sau chưa chứng minh hiệu quả nghiên cứu khi chưa có Ground Truth độc lập.

## Kiểm tra

### Định dạng xuất của sàn và POS

- Tiêu đề camelCase được tách từ trước khi nhận diện. Mã đơn Lazada là orderNumber, không phải orderItemId. Mã sách ưu tiên ISBN trong danh mục và sellerSku/Seller SKU/SKU sản phẩm trong đơn hàng.
- Voucher, giảm giá và phí không được nhận diện thành kênh bán. Khi nguồn không có cột kênh, giao diện dùng tên tệp để xác định kênh.
- Shopee lấy Giá ưu đãi theo đơn vị. Lazada lấy itemSubtotal, TikTok lấy SKU Subtotal After Discount làm giá trị sản phẩm sau giảm giá; đơn giá hiển thị là tổng dòng chia số lượng. Không nhân tổng dòng lần thứ hai. Tổng thanh toán, phí vận chuyển và phí sàn không thay thế tổng sản phẩm. Đây là quy ước cho các file xuất đang hỗ trợ, cần xác nhận khi đổi cấu trúc nguồn.
- Hoàn tiền/trả hàng đã hoàn tất loại dòng khỏi giá trị bán hoàn thành. Yêu cầu hoàn tiền đang xử lý hoặc chưa rõ được giữ chờ đối soát. Trạng thái giao hàng gốc và hoàn tiền được giữ riêng trong file xuất.
- Số serial Excel có phần giờ được chuyển về ngày. Ngày số dùng /, - hoặc . có thể xác định cấu trúc khi không mơ hồ. Khi hai thành phần <=12 và khác nhau, DD/MM mặc định chỉ phục vụ hiển thị nếu chưa có profile DMY/MDY; canonicalDate để trống với AMBIGUOUS_LOCALE, chưa phân bổ tháng hoặc trừ tồn. Ngày không tồn tại không tự sửa.
- Cột biến thể được lưu và xét khi so khớp; Combo không được ghép với sách lẻ chỉ vì mã/tên giống nhau. Master Source giữ riêng các biến thể cùng mã, dùng giá giao dịch trung bình trong từng nhóm làm tham chiếu (không phải giá bìa). Nguồn khác thiếu thông tin phân biệt giữa nhiều ứng viên được chuyển sang duyệt; mã trùng không đủ để tự chọn ứng viên cuối cùng trong danh mục. Danh mục tải riêng vẫn bị chặn khi có mã trùng mâu thuẫn.
- ISBN sai checksum là cảnh báo; không chặn việc nhập hoặc khớp mã mô phỏng.

Chạy `npm test`, `npm run build`, `npm run lint`. Bộ regression bao phủ lỗi đầu vào, date, unpivot, HITL, Crosswalk, dòng trùng, ISBN và thống nhất số liệu. Có kiểm tra render HTML tĩnh cho HITL; chưa thay thế kiểm thử tương tác trình duyệt với các file thực tế.

Bộ kiểm thử dữ liệu pilot sinh dữ liệu và round-trip Excel trong bộ nhớ, không phụ thuộc outputs/ hoặc sample-data/new/. Khi commit phải đưa kèm scripts/bookDataset.mjs và các bài kiểm thử mới. Hủy cấu hình giữ kết quả/duyệt hiện có. Chạy lại thành công hoặc reset xóa quyết định HITL cũ sau xác nhận; chạy lại thất bại giữ kết quả và cấu hình đã áp dụng trước đó.

## Công việc nghiên cứu tiếp theo

Đã có evaluator độc lập và pilot tổng hợp có đáp án trước khi chèn lỗi; chưa thay thế Ground Truth do nhóm duyệt hoặc đo thời gian thực nghiệm. Còn cần schema/ca khó chưa thấy, nhãn ấn bản/biến thể, chính sách Combo/hoàn một phần/chọn snapshot, phân tích sai/độ bất định và thực nghiệm người dùng HITL.

## Bổ sung hợp đồng v2 và nhiều tệp nguồn

- UI nhận tối đa **10 tệp đơn hàng**; Catalog và Crosswalk tải riêng, không tính vào giới hạn. Một kênh có thể có nhiều file. File thứ 11 được thông báo chưa nạp; có thể xóa rồi nạp thay thế. Danh sách có vùng cuộn và thu gọn tên dài. Giới hạn số file chưa phải cam kết hiệu năng theo dung lượng/số dòng.
- Mapping giữ chỗ alias tường minh trước luật tổng quát; không dùng amount như số lượng, giá vốn/giá bìa như giá bán hoặc Order Item ID như mã đơn. Nhận diện hiện dựa trên header, chưa suy luận ngữ nghĩa từ phân bố giá trị.
- canonicalEntityId định danh bản ghi Catalog, chưa xác minh độc lập cấp tác phẩm/ấn bản/biến thể. Catalog không mã dùng fingerprint nội dung, không coi là khóa toàn cục bền vững.
- sourceCodeType hỗ trợ CATALOG, INTERNAL, ISBN; chưa khai báo dùng giả định tương thích CATALOG_ASSUMED được lưu rõ trong output. INTERNAL không khớp chính xác Catalog chỉ vì chuỗi giống nhau; có thể dùng Crosswalk theo nguồn.
- noReturnMarkers chỉ khai báo sau khi nguồn xác nhận ý nghĩa dấu -, N/A, 0. Không mặc nhiên coi đó là không hoàn trả. Yêu cầu hoàn bị từ chối được phân biệt với hoàn tất; chưa tự tính hoàn một phần khi thiếu tiền/bằng chứng.
- CSV và sheet Ket_Qua_Tich_Hop có **41 cột**. Excel thêm Bao_Cao_Kenh, Bao_Cao_San_Pham, Bao_Cao_Thang, Doi_Soat_Bao_Cao. Báo cáo sản phẩm đầy đủ; phần chưa liên kết/chưa xác lập tháng đã nằm trong tổng, không cộng hai lần. Lớp báo cáo từ chối dòng INCLUDED có tiền không hữu hạn hoặc số lượng chưa chuẩn hóa.
- Tồn kho chỉ là đề xuất từ cột tồn đầu kỳ người dùng chọn và xác nhận chưa trừ đơn nạp. Giữ chờ ngày mơ hồ, nghi trùng, chưa liên kết và trả/hoàn; không tự nhập lại hàng trả hoặc tách Combo thiếu bảng thành phần/phân bổ tiền. Xuất master không sửa file nguồn.

Ví dụ profile kỹ thuật (chưa có màn hình cấu hình riêng):

```js
runPipeline(orderFiles, catalog, {
  sourceProfiles: {
    'orders.xlsx': {
      sourceSystem: 'Shopee', shopId: 'SHOP-A', sourceCodeType: 'INTERNAL',
      dateLocale: 'DMY', noReturnMarkers: ['-'], // Chỉ khi nguồn xác nhận ý nghĩa.
    },
  },
});
```

Cột Source System, Shop ID, Order Item ID, Source Code Type cũng có thể cung cấp metadata. Không giả shop để tạo khóa mạnh; mâu thuẫn shop/loại mã giữa cột và profile làm pipeline dừng.

`npm run evaluate:research` chạy Exact-only, Fuzzy-only, Multi-tier độc lập trên cùng pilot và guard nghiệp vụ, chia họ sản phẩm phát triển/đánh giá. Wrong-link tính FP+FN, no-match đúng là TN, pending không tính TP. GT chưa duyệt/không xác định được tách riêng và báo coverage; mẫu số rỗng cho null. Pilot hiện chưa chứng minh Multi-tier tốt hơn Fuzzy-only; không mô phỏng người dùng duyệt bằng cách đọc GT.

RQ3 phân biệt tính đúng hợp đồng trên dữ liệu quan sát và phục hồi thế giới sạch/duy nhất trước lỗi. Tổng vận hành không tự chứng minh giảm sai lệch. `npm run audit:gt` đọc workbook chú giải, ghi hash/tên nguồn thực tế, giữ nhãn PENDING và không sửa workbook. Mặc định ưu tiên bản local sample-data/new/ nếu có, nếu không dùng bản tương ứng đã có trong sample-data/; cũng có thể gọi auditGroundTruth({ sourceDir: 'sample-data' }). Kịch bản lỗi chưa là đủ đáp án từng dòng cho ba RQ.

UI test kiểm tra nạp đủ/vượt 10 file, thêm nhiều đợt, xóa/thay thế, Master Source và nút xuất CSV/Excel. Dữ liệu Huy trong sample-data/ được chia thành 10 workbook trong bộ nhớ để kiểm tra đủ 266 dòng và đối soát tổng khi clone mới. JSDOM không chứng minh bố cục trực quan trên trình duyệt thật; công cụ Windows ngày 26/10 dừng do không xác định được URL.
