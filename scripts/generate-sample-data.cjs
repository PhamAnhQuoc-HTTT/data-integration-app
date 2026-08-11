const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Ensure output directory exists
const outputDir = path.join(__dirname, '..', 'sample-data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// -----------------------------------------------------------------------------
// File 3: Master Product Catalog (20 rows)
// -----------------------------------------------------------------------------
const masterCatalog = [
  {
    'Tên sản phẩm': 'Đắc Nhân Tâm',
    'ISBN': '9786045678901',
    'Nhà xuất bản': 'NXB Tổng Hợp TPHCM',
    'Thể loại': 'Kỹ năng sống',
    'Giá bìa': 86000
  },
  {
    'Tên sản phẩm': 'Nhà Giả Kim',
    'ISBN': '9786045678902',
    'Nhà xuất bản': 'NXB Hội Nhà Văn',
    'Thể loại': 'Văn học',
    'Giá bìa': 79000
  },
  {
    'Tên sản phẩm': 'Tuổi Trẻ Đáng Giá Bao Nhiêu',
    'ISBN': '9786045678903',
    'Nhà xuất bản': 'NXB Hội Nhà Văn',
    'Thể loại': 'Kỹ năng sống',
    'Giá bìa': 90000
  },
  {
    'Tên sản phẩm': 'Cà Phê Cùng Tony',
    'ISBN': '9786045678904',
    'Nhà xuất bản': 'NXB Trẻ',
    'Thể loại': 'Kỹ năng sống',
    'Giá bìa': 95000
  },
  {
    'Tên sản phẩm': 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh',
    'ISBN': '9786045678905',
    'Nhà xuất bản': 'NXB Trẻ',
    'Thể loại': 'Văn học',
    'Giá bìa': 125000
  },
  {
    'Tên sản phẩm': 'Mắt Biếc',
    'ISBN': '9786045678906',
    'Nhà xuất bản': 'NXB Trẻ',
    'Thể loại': 'Văn học',
    'Giá bìa': 110000
  },
  {
    'Tên sản phẩm': 'Khéo Ăn Nói Sẽ Có Được Thiên Hạ',
    'ISBN': '9786045678907',
    'Nhà xuất bản': 'NXB Văn Học',
    'Thể loại': 'Kỹ năng sống',
    'Giá bìa': 110000
  },
  {
    'Tên sản phẩm': 'Đời Thay Đổi Khi Chúng Ta Thay Đổi',
    'ISBN': '9786045678908',
    'Nhà xuất bản': 'NXB Trẻ',
    'Thể loại': 'Tâm lý học',
    'Giá bìa': 75000
  },
  {
    'Tên sản phẩm': 'Cha Giàu Cha Nghèo',
    'ISBN': '9786045678909',
    'Nhà xuất bản': 'NXB Trẻ',
    'Thể loại': 'Kinh tế',
    'Giá bìa': 135000
  },
  {
    'Tên sản phẩm': 'Tư Duy Nhanh Và Chậm',
    'ISBN': '9786045678910',
    'Nhà xuất bản': 'NXB Thế Giới',
    'Thể loại': 'Tâm lý học',
    'Giá bìa': 220000
  },
  {
    'Tên sản phẩm': 'Người Giàu Có Nhất Thành Babylon',
    'ISBN': '9786045678911',
    'Nhà xuất bản': 'NXB Lao Động',
    'Thể loại': 'Kinh tế',
    'Giá bìa': 98000
  },
  {
    'Tên sản phẩm': 'Sức Mạnh Của Hiện Tại',
    'ISBN': '9786045678912',
    'Nhà xuất bản': 'NXB Tổng Hợp TPHCM',
    'Thể loại': 'Tâm lý học',
    'Giá bìa': 130000
  },
  {
    'Tên sản phẩm': 'Đi Tìm Lẽ Sống',
    'ISBN': '9786045678913',
    'Nhà xuất bản': 'NXB Tổng Hợp TPHCM',
    'Thể loại': 'Tâm lý học',
    'Giá bìa': 88000
  },
  {
    'Tên sản phẩm': 'Đọc Vị Bất Kỳ Ai',
    'ISBN': '9786045678914',
    'Nhà xuất bản': 'NXB Thế Giới',
    'Thể loại': 'Tâm lý học',
    'Giá bìa': 89000
  },
  {
    'Tên sản phẩm': 'Lược Sử Loài Người',
    'ISBN': '9786045678915',
    'Nhà xuất bản': 'NXB Tri Thức',
    'Thể loại': 'Lịch sử',
    'Giá bìa': 240000
  },
  {
    'Tên sản phẩm': 'Hạt Giống Tâm Hồn',
    'ISBN': '9786045678916',
    'Nhà xuất bản': 'NXB Tổng Hợp TPHCM',
    'Thể loại': 'Kỹ năng sống',
    'Giá bìa': 68000
  },
  {
    'Tên sản phẩm': 'Số Đỏ',
    'ISBN': '9786045678917',
    'Nhà xuất bản': 'NXB Văn Học',
    'Thể loại': 'Văn học',
    'Giá bìa': 65000
  },
  {
    'Tên sản phẩm': 'Tắt Đèn',
    'ISBN': '9786045678918',
    'Nhà xuất bản': 'NXB Kim Đồng',
    'Thể loại': 'Văn học',
    'Giá bìa': 55000
  },
  {
    'Tên sản phẩm': 'Rừng Na Uy',
    'ISBN': '9786045678919',
    'Nhà xuất bản': 'NXB Hội Nhà Văn',
    'Thể loại': 'Văn học',
    'Giá bìa': 145000
  },
  {
    'Tên sản phẩm': 'Thế Giới Quả Là Rộng Lớn Và Có Nhiều Việc Phải Làm',
    'ISBN': '9786045678920',
    'Nhà xuất bản': 'NXB Trẻ',
    'Thể loại': 'Kinh tế',
    'Giá bìa': 105000
  }
];

// -----------------------------------------------------------------------------
// File 1: POS / In-store Orders (30 rows)
// -----------------------------------------------------------------------------
// Intentional issues included:
// - 2 rows with missing ISBN (rows 3 and 11)
// - 1 row with price = 0 (row 4)
// - 1 row with slightly different name from catalog ("Dac Nhan Tam" - row 6)
// - 1 duplicate order ID ("POS-2025-005" on row 5 and row 12)
// - 1 row with date format "15-07-2025" (dd-mm-yyyy - row 15)
// - Rest normal dates like "10/07/2025" (dd/mm/yyyy)
const posOrders = [
  { 'Mã đơn hàng': 'POS-2025-001', 'Ngày bán': '01/07/2025', 'Tên sản phẩm': 'Đắc Nhân Tâm', 'ISBN': '9786045678901', 'Số lượng': 2, 'Đơn giá': 86000, 'Thương hiệu': 'First News' },
  { 'Mã đơn hàng': 'POS-2025-002', 'Ngày bán': '02/07/2025', 'Tên sản phẩm': 'Nhà Giả Kim', 'ISBN': '9786045678902', 'Số lượng': 1, 'Đơn giá': 79000, 'Thương hiệu': 'Nhã Nam' },
  { 'Mã đơn hàng': 'POS-2025-003', 'Ngày bán': '02/07/2025', 'Tên sản phẩm': 'Tuổi Trẻ Đáng Giá Bao Nhiêu', 'ISBN': '', 'Số lượng': 1, 'Đơn giá': 90000, 'Thương hiệu': 'Nhã Nam' }, // Issue: missing ISBN
  { 'Mã đơn hàng': 'POS-2025-004', 'Ngày bán': '03/07/2025', 'Tên sản phẩm': 'Cà Phê Cùng Tony', 'ISBN': '9786045678904', 'Số lượng': 3, 'Đơn giá': 0, 'Thương hiệu': 'NXB Trẻ' }, // Issue: price = 0
  { 'Mã đơn hàng': 'POS-2025-005', 'Ngày bán': '03/07/2025', 'Tên sản phẩm': 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh', 'ISBN': '9786045678905', 'Số lượng': 1, 'Đơn giá': 125000, 'Thương hiệu': 'NXB Trẻ' },
  { 'Mã đơn hàng': 'POS-2025-006', 'Ngày bán': '04/07/2025', 'Tên sản phẩm': 'Dac Nhan Tam', 'ISBN': '9786045678901', 'Số lượng': 1, 'Đơn giá': 86000, 'Thương hiệu': 'First News' }, // Issue: no diacritics
  { 'Mã đơn hàng': 'POS-2025-007', 'Ngày bán': '04/07/2025', 'Tên sản phẩm': 'Mắt Biếc', 'ISBN': '9786045678906', 'Số lượng': 2, 'Đơn giá': 110000, 'Thương hiệu': 'NXB Trẻ' },
  { 'Mã đơn hàng': 'POS-2025-008', 'Ngày bán': '05/07/2025', 'Tên sản phẩm': 'Khéo Ăn Nói Sẽ Có Được Thiên Hạ', 'ISBN': '9786045678907', 'Số lượng': 1, 'Đơn giá': 110000, 'Thương hiệu': 'Minh Long Book' },
  { 'Mã đơn hàng': 'POS-2025-009', 'Ngày bán': '05/07/2025', 'Tên sản phẩm': 'Đời Thay Đổi Khi Chúng Ta Thay Đổi', 'ISBN': '9786045678908', 'Số lượng': 4, 'Đơn giá': 75000, 'Thương hiệu': 'NXB Trẻ' },
  { 'Mã đơn hàng': 'POS-2025-010', 'Ngày bán': '06/07/2025', 'Tên sản phẩm': 'Cha Giàu Cha Nghèo', 'ISBN': '9786045678909', 'Số lượng': 1, 'Đơn giá': 135000, 'Thương hiệu': 'Alpha Books' },
  { 'Mã đơn hàng': 'POS-2025-011', 'Ngày bán': '06/07/2025', 'Tên sản phẩm': 'Tư Duy Nhanh Và Chậm', 'ISBN': '', 'Số lượng': 1, 'Đơn giá': 220000, 'Thương hiệu': 'Alpha Books' }, // Issue: missing ISBN
  { 'Mã đơn hàng': 'POS-2025-005', 'Ngày bán': '07/07/2025', 'Tên sản phẩm': 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh', 'ISBN': '9786045678905', 'Số lượng': 1, 'Đơn giá': 125000, 'Thương hiệu': 'NXB Trẻ' }, // Issue: duplicate order ID POS-2025-005
  { 'Mã đơn hàng': 'POS-2025-012', 'Ngày bán': '07/07/2025', 'Tên sản phẩm': 'Người Giàu Có Nhất Thành Babylon', 'ISBN': '9786045678911', 'Số lượng': 2, 'Đơn giá': 98000, 'Thương hiệu': 'First News' },
  { 'Mã đơn hàng': 'POS-2025-013', 'Ngày bán': '08/07/2025', 'Tên sản phẩm': 'Sức Mạnh Của Hiện Tại', 'ISBN': '9786045678912', 'Số lượng': 1, 'Đơn giá': 130000, 'Thương hiệu': 'First News' },
  { 'Mã đơn hàng': 'POS-2025-014', 'Ngày bán': '15-07-2025', 'Tên sản phẩm': 'Đi Tìm Lẽ Sống', 'ISBN': '9786045678913', 'Số lượng': 1, 'Đơn giá': 88000, 'Thương hiệu': 'First News' }, // Issue: date format "15-07-2025"
  { 'Mã đơn hàng': 'POS-2025-015', 'Ngày bán': '09/07/2025', 'Tên sản phẩm': 'Đọc Vị Bất Kỳ Ai', 'ISBN': '9786045678914', 'Số lượng': 3, 'Đơn giá': 89000, 'Thương hiệu': 'Alpha Books' },
  { 'Mã đơn hàng': 'POS-2025-016', 'Ngày bán': '10/07/2025', 'Tên sản phẩm': 'Lược Sử Loài Người', 'ISBN': '9786045678915', 'Số lượng': 1, 'Đơn giá': 240000, 'Thương hiệu': 'Nhã Nam' },
  { 'Mã đơn hàng': 'POS-2025-017', 'Ngày bán': '10/07/2025', 'Tên sản phẩm': 'Hạt Giống Tâm Hồn', 'ISBN': '9786045678916', 'Số lượng': 2, 'Đơn giá': 68000, 'Thương hiệu': 'First News' },
  { 'Mã đơn hàng': 'POS-2025-018', 'Ngày bán': '11/07/2025', 'Tên sản phẩm': 'Số Đỏ', 'ISBN': '9786045678917', 'Số lượng': 5, 'Đơn giá': 65000, 'Thương hiệu': 'Nhã Nam' },
  { 'Mã đơn hàng': 'POS-2025-019', 'Ngày bán': '11/07/2025', 'Tên sản phẩm': 'Tắt Đèn', 'ISBN': '9786045678918', 'Số lượng': 2, 'Đơn giá': 55000, 'Thương hiệu': 'Kim Đồng' },
  { 'Mã đơn hàng': 'POS-2025-020', 'Ngày bán': '12/07/2025', 'Tên sản phẩm': 'Rừng Na Uy', 'ISBN': '9786045678919', 'Số lượng': 1, 'Đơn giá': 145000, 'Thương hiệu': 'Nhã Nam' },
  { 'Mã đơn hàng': 'POS-2025-021', 'Ngày bán': '12/07/2025', 'Tên sản phẩm': 'Thế Giới Quả Là Rộng Lớn Và Có Nhiều Việc Phải Làm', 'ISBN': '9786045678920', 'Số lượng': 1, 'Đơn giá': 105000, 'Thương hiệu': 'NXB Trẻ' },
  { 'Mã đơn hàng': 'POS-2025-022', 'Ngày bán': '13/07/2025', 'Tên sản phẩm': 'Đắc Nhân Tâm', 'ISBN': '9786045678901', 'Số lượng': 1, 'Đơn giá': 86000, 'Thương hiệu': 'First News' },
  { 'Mã đơn hàng': 'POS-2025-023', 'Ngày bán': '13/07/2025', 'Tên sản phẩm': 'Nhà Giả Kim', 'ISBN': '9786045678902', 'Số lượng': 3, 'Đơn giá': 79000, 'Thương hiệu': 'Nhã Nam' },
  { 'Mã đơn hàng': 'POS-2025-024', 'Ngày bán': '14/07/2025', 'Tên sản phẩm': 'Tuổi Trẻ Đáng Giá Bao Nhiêu', 'ISBN': '9786045678903', 'Số lượng': 2, 'Đơn giá': 90000, 'Thương hiệu': 'Nhã Nam' },
  { 'Mã đơn hàng': 'POS-2025-025', 'Ngày bán': '14/07/2025', 'Tên sản phẩm': 'Mắt Biếc', 'ISBN': '9786045678906', 'Số lượng': 1, 'Đơn giá': 110000, 'Thương hiệu': 'NXB Trẻ' },
  { 'Mã đơn hàng': 'POS-2025-026', 'Ngày bán': '15/07/2025', 'Tên sản phẩm': 'Cha Giàu Cha Nghèo', 'ISBN': '9786045678909', 'Số lượng': 2, 'Đơn giá': 135000, 'Thương hiệu': 'Alpha Books' },
  { 'Mã đơn hàng': 'POS-2025-027', 'Ngày bán': '16/07/2025', 'Tên sản phẩm': 'Sức Mạnh Của Hiện Tại', 'ISBN': '9786045678912', 'Số lượng': 1, 'Đơn giá': 130000, 'Thương hiệu': 'First News' },
  { 'Mã đơn hàng': 'POS-2025-028', 'Ngày bán': '16/07/2025', 'Tên sản phẩm': 'Lược Sử Loài Người', 'ISBN': '9786045678915', 'Số lượng': 2, 'Đơn giá': 240000, 'Thương hiệu': 'Nhã Nam' },
  { 'Mã đơn hàng': 'POS-2025-029', 'Ngày bán': '17/07/2025', 'Tên sản phẩm': 'Rừng Na Uy', 'ISBN': '9786045678919', 'Số lượng': 1, 'Đơn giá': 145000, 'Thương hiệu': 'Nhã Nam' }
];

// -----------------------------------------------------------------------------
// File 2: Online / Shopee Orders (25 rows)
// -----------------------------------------------------------------------------
// Intentional issues included:
// - Column names WITHOUT diacritics: Ma don, Ngay gio, San pham, Ma vach, SL, Gia ban, Kenh
// - Slightly different book titles (e.g. "Đắc Nhân Tâm - Bìa Cứng")
// - Kenh = "Shopee" for all
// - 2 rows missing Ma vach (rows 4 and 11)
// - 1 row with quantity as text "hai" (row 5)
// - 1 row with price having dot separator "110.000" (row 7)
// - 1 row with a book NOT in catalog ("Lập Trình Node.js Từ Cơ Bản Đến Nâng Cao" - row 13)
const shopeeOrders = [
  { 'Ma don': 'SP-20250701-01', 'Ngay gio': '2025-07-01 10:15:00', 'San pham': 'Đắc Nhân Tâm - Bìa Cứng', 'Ma vach': '9786045678901', 'SL': 1, 'Gia ban': 86000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250701-02', 'Ngay gio': '2025-07-01 11:30:00', 'San pham': 'Nhà Giả Kim (Tái Bản)', 'Ma vach': '9786045678902', 'SL': 2, 'Gia ban': 79000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250702-01', 'Ngay gio': '2025-07-02 09:20:00', 'San pham': 'Tuổi Trẻ Đáng Giá Bao Nhiêu?', 'Ma vach': '9786045678903', 'SL': 1, 'Gia ban': 90000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250702-02', 'Ngay gio': '2025-07-02 14:45:00', 'San pham': 'Cà Phê Cùng Tony - Bản Đặc Biệt', 'Ma vach': '', 'SL': 1, 'Gia ban': 95000, 'Kenh': 'Shopee' }, // Issue: missing Ma vach
  { 'Ma don': 'SP-20250703-01', 'Ngay gio': '2025-07-03 08:10:00', 'San pham': 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh (Bìa Mềm)', 'Ma vach': '9786045678905', 'SL': 'hai', 'Gia ban': 125000, 'Kenh': 'Shopee' }, // Issue: quantity text "hai"
  { 'Ma don': 'SP-20250703-02', 'Ngay gio': '2025-07-03 16:00:00', 'San pham': 'Mắt Biếc (Bìa Mới)', 'Ma vach': '9786045678906', 'SL': 1, 'Gia ban': 110000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250704-01', 'Ngay gio': '2025-07-04 10:00:00', 'San pham': 'Khéo Ăn Nói Sẽ Có Được Thiên Hạ - Tập 1', 'Ma vach': '9786045678907', 'SL': 1, 'Gia ban': '110.000', 'Kenh': 'Shopee' }, // Issue: price dot separator "110.000"
  { 'Ma don': 'SP-20250704-02', 'Ngay gio': '2025-07-04 15:30:00', 'San pham': 'Đời Thay Đổi Khi Chúng Ta Thay Đổi (Bộ 1)', 'Ma vach': '9786045678908', 'SL': 3, 'Gia ban': 75000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250705-01', 'Ngay gio': '2025-07-05 11:15:00', 'San pham': 'Cha Giàu Cha Nghèo (Tập 1)', 'Ma vach': '9786045678909', 'SL': 1, 'Gia ban': 135000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250705-02', 'Ngay gio': '2025-07-05 13:40:00', 'San pham': 'Tư Duy Nhanh Và Chậm - Sách Tiếng Việt', 'Ma vach': '9786045678910', 'SL': 1, 'Gia ban': 220000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250706-01', 'Ngay gio': '2025-07-06 09:50:00', 'San pham': 'Người Giàu Có Nhất Thành Babylon (Bìa Cứng)', 'Ma vach': '', 'SL': 2, 'Gia ban': 98000, 'Kenh': 'Shopee' }, // Issue: missing Ma vach
  { 'Ma don': 'SP-20250706-02', 'Ngay gio': '2025-07-06 17:25:00', 'San pham': 'Sức Mạnh Của Hiện Tại - Tái Bản 2025', 'Ma vach': '9786045678912', 'SL': 1, 'Gia ban': 130000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250707-01', 'Ngay gio': '2025-07-07 10:05:00', 'San pham': 'Lập Trình Node.js Từ Cơ Bản Đến Nâng Cao', 'Ma vach': '9786049999999', 'SL': 1, 'Gia ban': 180000, 'Kenh': 'Shopee' }, // Issue: NOT in catalog
  { 'Ma don': 'SP-20250707-02', 'Ngay gio': '2025-07-07 14:15:00', 'San pham': 'Đi Tìm Lẽ Sống (Bản Mới)', 'Ma vach': '9786045678913', 'SL': 1, 'Gia ban': 88000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250708-01', 'Ngay gio': '2025-07-08 08:30:00', 'San pham': 'Đọc Vị Bất Kỳ Ai - Tâm Lý Học ứng dụng', 'Ma vach': '9786045678914', 'SL': 2, 'Gia ban': 89000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250708-02', 'Ngay gio': '2025-07-08 19:00:00', 'San pham': 'Lược Sử Loài Người (Kèm Minh Họa)', 'Ma vach': '9786045678915', 'SL': 1, 'Gia ban': 240000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250709-01', 'Ngay gio': '2025-07-09 12:20:00', 'San pham': 'Hạt Giống Tâm Hồn - Tập 1', 'Ma vach': '9786045678916', 'SL': 1, 'Gia ban': 68000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250709-02', 'Ngay gio': '2025-07-09 15:45:00', 'San pham': 'Số Đỏ (Vũ Trọng Phụng)', 'Ma vach': '9786045678917', 'SL': 4, 'Gia ban': 65000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250710-01', 'Ngay gio': '2025-07-10 10:10:00', 'San pham': 'Tắt Đèn (Ngô Tất Tố)', 'Ma vach': '9786045678918', 'SL': 2, 'Gia ban': 55000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250710-02', 'Ngay gio': '2025-07-10 16:50:00', 'San pham': 'Rừng Na Uy - Haruki Murakami', 'Ma vach': '9786045678919', 'SL': 1, 'Gia ban': 145000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250711-01', 'Ngay gio': '2025-07-11 09:00:00', 'San pham': 'Thế Giới Quả Là Rộng Lớn Và Có Nhiều Việc Phải Làm - Daewoo', 'Ma vach': '9786045678920', 'SL': 1, 'Gia ban': 105000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250711-02', 'Ngay gio': '2025-07-11 14:30:00', 'San pham': 'Đắc Nhân Tâm - Dale Carnegie', 'Ma vach': '9786045678901', 'SL': 2, 'Gia ban': 86000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250712-01', 'Ngay gio': '2025-07-12 11:00:00', 'San pham': 'Nhà Giả Kim - Paulo Coelho', 'Ma vach': '9786045678902', 'SL': 1, 'Gia ban': 79000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250712-02', 'Ngay gio': '2025-07-12 17:15:00', 'San pham': 'Tuổi Trẻ Đáng Giá Bao Nhiêu - Rosie Nguyễn', 'Ma vach': '9786045678903', 'SL': 1, 'Gia ban': 90000, 'Kenh': 'Shopee' },
  { 'Ma don': 'SP-20250713-01', 'Ngay gio': '2025-07-13 10:40:00', 'San pham': 'Cha Giàu Cha Nghèo - Robert Kiyosaki', 'Ma vach': '9786045678909', 'SL': 2, 'Gia ban': 135000, 'Kenh': 'Shopee' }
];

function createExcelFile(filename, data, headers) {
  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  const targetPath = path.join(outputDir, filename);
  XLSX.writeFile(workbook, targetPath);
  console.log(`Created Excel file successfully: ${targetPath}`);
}

// Write files
createExcelFile(
  'don-hang-pos-cua-hang.xlsx',
  posOrders,
  ['Mã đơn hàng', 'Ngày bán', 'Tên sản phẩm', 'ISBN', 'Số lượng', 'Đơn giá', 'Thương hiệu']
);

createExcelFile(
  'don-hang-online-shopee.xlsx',
  shopeeOrders,
  ['Ma don', 'Ngay gio', 'San pham', 'Ma vach', 'SL', 'Gia ban', 'Kenh']
);

createExcelFile(
  'danh-muc-san-pham-chuan.xlsx',
  masterCatalog,
  ['Tên sản phẩm', 'ISBN', 'Nhà xuất bản', 'Thể loại', 'Giá bìa']
);

console.log('All sample data files generated successfully!');
