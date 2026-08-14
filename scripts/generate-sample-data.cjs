const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const outDir = path.join(__dirname, "..", "sample-data");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Catalog (Master Product List - 20 products)
const catalogData = [
  ["Tên sản phẩm", "ISBN", "Nhà xuất bản", "Thể loại", "Giá bìa"],
  ["Đắc Nhân Tâm", "9786045678901", "NXB Trẻ", "Kỹ năng sống", "86.000"],
  ["Nhà Giả Kim", "9786045678902", "NXB Nhã Nam", "Văn học", "79.000"],
  ["Tuổi Trẻ Đáng Giá Bao Nhiêu", "9786045678903", "NXB Hội Nhà Văn", "Kỹ năng sống", "90.000"],
  ["Cà Phê Cùng Tony", "9786045678904", "NXB Trẻ", "Kỹ năng sống", "95.000"],
  ["Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "9786045678905", "NXB Trẻ", "Văn học", "125.000"],
  ["Đời Thay Đổi Khi Chúng Ta Thay Đổi", "9786045678906", "NXB Trẻ", "Kỹ năng sống", "68.000"],
  ["Cha Giàu Cha Nghèo", "9786045678907", "NXB Trẻ", "Kinh doanh", "115.000"],
  ["Đọc Vị Bất Kỳ Ai", "9786045678908", "NXB Thế Giới", "Tâm lý học", "89.000"],
  ["Mắt Biếc", "9786045678909", "NXB Trẻ", "Văn học", "110.000"],
  ["Số Đỏ", "9786045678910", "NXB Văn Học", "Văn học", "65.000"],
  ["Tư Duy Nhanh Và Chậm", "9786045678911", "NXB Thế Giới", "Tâm lý học", "210.000"],
  ["Khéo Ăn Nói Sẽ Có Được Thiên Hạ", "9786045678912", "NXB Văn Học", "Kỹ năng sống", "118.000"],
  ["Dế Mèn Phiêu Lưu Ký", "9786045678913", "NXB Kim Đồng", "Thiếu nhi", "55.000"],
  ["Chiếc Thuyền Ngoài Xa", "9786045678914", "NXB Văn Học", "Văn học", "48.000"],
  ["Tắt Đèn", "9786045678915", "NXB Văn Học", "Văn học", "52.000"],
  ["Lão Hạc", "9786045678916", "NXB Văn Học", "Văn học", "45.000"],
  ["Vợ Nhặt", "9786045678917", "NXB Văn Học", "Văn học", "42.000"],
  ["Hạt Giống Tâm Hồn", "9786045678918", "NXB Tổng Hợp TP.HCM", "Tâm lý học", "75.000"],
  ["Sức Mạnh Của Hiện Tại", "9786045678919", "NXB Tổng Hợp TP.HCM", "Tâm lý học", "135.000"],
  ["Đắc Nhân Tâm - Bìa Cứng Special", "9786045678920", "NXB Trẻ", "Kỹ năng sống", "180.000"],
];

// 2. POS Store Orders (30 rows - Has POS/At-counter channels, various 6-group issues)
const posData = [
  ["Mã đơn hàng", "Ngày bán", "Tên sản phẩm", "ISBN", "Số lượng", "Đơn giá", "Thương hiệu", "Trạng thái", "Kênh"],
  ["POS-2025-001", "2025-07-01 10:15:00", "Đắc Nhân Tâm", "9786045678901", "2", "86000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-002", "2025-07-01 11:30:00", "Nhà Giả Kim", "9786045678902", "1", "79000", "NXB Trẻ", "Hoàn thành", "Tai quay"],
  ["POS-2025-003", "2025-07-02 09:20:00", "Tuổi Trẻ Đáng Giá Bao Nhiêu", "9786045678903", "3", "90000", "NXB Hội Nhà Văn", "Hoàn thành", "Cua hang"],
  ["POS-2025-004", "2025-07-02 14:45:00", "Cà Phê Cùng Tony", "9786045678904", "1", "0", "NXB Trẻ", "Hoàn thành", "POS"], // Null vs Zero
  ["POS-2025-005", "2025-07-03 16:10:00", "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "9786045678905", "1", "125000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-005", "2025-07-03 16:15:00", "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "9786045678905", "1", "125000", "NXB Trẻ", "Hoàn thành", "POS"], // Duplicate order ID
  ["POS-2025-006", "15-07-2025 08:30:00", "Đời Thay Đổi Khi Chúng Ta Thay Đổi", "9786045678906", "2", "68000", "NXB Trẻ", "Hoàn thành", "POS"], // Structural Date format
  ["POS-2025-007", "2025-07-04 10:00:00", "Cha Giàu Cha Nghèo", "978-604-5678907", "1", "115000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-008", "2025-07-04 11:20:00", "Đọc Vị Bất Kỳ Ai", "9786045678908", "1", "89000", "NXB Thế Giới", "Hoàn thành", "POS"],
  ["POS-2025-009", "2025-07-05 13:15:00", "Mắt Biếc", "9786045678909", "2", "110000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-010", "2025-07-05 15:40:00", "Số Đỏ", "9786045678910", "5", "65000", "NXB Văn Học", "Hoàn thành", "POS"],
  ["POS-2025-011", "2025-07-06 09:10:00", "Tư Duy Nhanh Và Chậm", "9786045678911", "1", "210000", "NXB Thế Giới", "Hoàn thành", "POS"],
  ["POS-2025-012", "2025-07-06 14:25:00", "Khéo Ăn Nói Sẽ Có Được Thiên Hạ", "9786045678912", "2", "118000", "NXB Văn Học", "Hoàn thành", "POS"],
  ["POS-2025-013", "2025-07-07 10:50:00", "Dế Mèn Phiêu Lưu Ký", "9786045678913", "4", "55000", "NXB Kim Đồng", "Hoàn thành", "POS"],
  ["POS-2025-014", "2025-07-07 16:30:00", "Chiếc Thuyền Ngoài Xa", "9786045678914", "1", "48000", "NXB Văn Học", "Hoàn thành", "POS"],
  ["POS-2025-015", "2025-07-08 11:05:00", "Tắt Đèn", "9786045678915", "2", "52000", "NXB Văn Học", "Hoàn thành", "POS"],
  ["POS-2025-016", "2025-07-08 15:20:00", "Lão Hạc", "9786045678916", "3", "45000", "NXB Văn Học", "Hoàn thành", "POS"],
  ["POS-2025-017", "2025-07-09 09:40:00", "Vợ Nhặt", "9786045678917", "2", "42000", "NXB Văn Học", "Hoàn thành", "POS"],
  ["POS-2025-018", "2025-07-09 14:15:00", "Hạt Giống Tâm Hồn", "9786045678918", "1", "75000", "NXB Tổng Hợp TP.HCM", "Hoàn thành", "POS"],
  ["POS-2025-019", "2025-07-10 10:30:00", "Sức Mạnh Của Hiện Tại", "9786045678919", "1", "135000", "NXB Tổng Hợp TP.HCM", "Hoàn thành", "POS"],
  ["POS-2025-020", "2025-07-10 16:00:00", "Đắc Nhân Tâm", "9786045678901", "1", "86000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-021", "2025-07-11 11:45:00", "Nhà Giả Kim (bản đặc biệt)", "9786045678902", "1", "79000", "NXB Nhã Nam", "Hoàn thành", "POS"], // Fuzzy match
  ["POS-2025-022", "2025-07-11 15:10:00", "Cha Giàu Cha Nghèo", "9786045678907", "2", "115000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-023", "2025-07-12 09:30:00", "Số Đỏ", "9786045678910", "4", "65000", "NXB Văn Học", "Hoàn thành", "POS"],
  ["POS-2025-024", "2025-07-12 14:00:00", "Mắt Biếc", "9786045678909", "1", "110000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-025", "2025-07-13 10:20:00", "Đắc Nhân Tâm", "9786045678999", "1", "86000", "NXB Trẻ", "Hoàn thành", "POS"], // Referential Integrity error
  ["POS-2025-026", "2025-07-13 16:45:00", "Tuổi Trẻ Đáng Giá Bao Nhiêu", "9786045678903", "2", "90000", "NXB Hội Nhà Văn", "Hoàn thành", "POS"],
  ["POS-2025-027", "2025-07-14 11:15:00", "Sách Giáo Khoa Toán 12", "9789999999999", "1", "35000", "NXB Giáo Dục", "Đã hủy", "POS"], // Stale status cancel with revenue
  ["POS-2025-028", "2025-07-14 15:30:00", "Cà Phê Cùng Tony", "9786045678904", "1", "95000", "NXB Trẻ", "Hoàn thành", "POS"],
];

// 3. Online Multichannel Orders (Shopee, Lazada, TikTok Shop - 25 rows)
const onlineData = [
  ["Ma don", "Ngay gio", "San pham", "Ma vach", "SL", "Gia ban", "Kenh", "Trang thai"],
  ["SP-20250701-01", "2025-07-01 10:15:00", "Đắc Nhân Tâm", "9786045678901", "1", "86000", "shopee vn", "giao thanh cong"], // Synonym channel & status
  ["SP-20250701-02", "2025-07-01 11:30:00", "Nhà Giả Kim", "9786045678902", "2", "79000", "shopee", "completed"],
  ["SP-20250702-01", "2025-07-02 09:20:00", "Tuổi Trẻ Đáng Giá Bao Nhiêu", "9786045678903", "1", "90000", "Shopee", "Hoàn thành"],
  ["SP-20250702-02", "2025-07-02 14:45:00", "Cà Phê Cùng Tony - Bản Đặc Biệt", "", "1", "95000", "Shopee", "Hoàn thành"], // Missing bar code
  ["SP-20250703-01", "2025-07-03 16:10:00", "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "9786045678905", "hai", "125000", "Shopee", "Hoàn thành"], // Malformed quantity "hai"
  ["LZD-88202501", "2025-07-03 18:00:00", "Cha Giàu Cha Nghèo", "9786045678907", "1", "115000", "lazada.vn", "delivered"], // Lazada channel
  ["LZD-88202502", "2025-07-04 09:15:00", "Đọc Vị Bất Kỳ Ai", "9786045678908", "2", "89000", "LAZADA", "giao thanh cong"],
  ["LZD-88202503", "2025-07-04 14:30:00", "Mắt Biếc", "9786045678909", "1", "110000", "Lazada", "Hoàn thành"],
  ["TT-99100201", "2025-07-05 11:00:00", "Số Đỏ", "9786045678910", "3", "35000", "tiktok shop", "Hoàn thành"], // Cross-channel price anomaly (35k vs 65k catalog)
  ["TT-99100202", "2025-07-05 16:45:00", "Tư Duy Nhanh Và Chậm", "9786045678911", "1", "210000", "tiktok", "Hoàn thành"], // TikTok channel
  ["SP-20250707-01", "2025-07-07 08:30:00", "Lập Trình Node.js Từ Cơ Bản Đến Nâng Cao", "", "1", "150000", "Shopee", "Hoàn thành"], // Unresolved product
  ["SP-20250707-02", "2025-07-07 10:15:00", "Khéo Ăn Nói Sẽ Có Được Thiên Hạ", "9786045678912", "1", "118000", "Shopee", "Hoàn thành"],
  ["SP-20250708-01", "2025-07-08 13:40:00", "Dế Mèn Phiêu Lưu Ký", "9786045678913", "2", "55000", "Shopee", "Hoàn thành"],
  ["LZD-88202504", "2025-07-08 17:20:00", "Chiếc Thuyền Ngoài Xa", "9786045678914", "1", "48000", "Lazada", "Hoàn thành"],
  ["LZD-88202505", "2025-07-09 10:00:00", "Tắt Đèn", "9786045678915", "1", "52000", "Lazada", "Hoàn thành"],
  ["TT-99100203", "2025-07-09 15:30:00", "Lão Hạc", "9786045678916", "2", "45000", "TikTok Shop", "Hoàn thành"],
  ["TT-99100204", "2025-07-10 09:10:00", "Vợ Nhặt", "9786045678917", "1", "42000", "TikTok Shop", "Hoàn thành"],
  ["SP-20250710-01", "2025-07-10 14:00:00", "Hạt Giống Tâm Hồn", "9786045678918", "1", "75000", "Shopee", "Hoàn thành"],
  ["SP-20250711-01", "2025-07-11 11:20:00", "Sức Mạnh Của Hiện Tại", "9786045678919", "1", "135000", "Shopee", "Hoàn thành"],
  ["LZD-88202506", "2025-07-11 16:15:00", "Đắc Nhân Tâm", "9786045678901", "1", "86000", "Lazada", "Hoàn thành"],
  ["TT-99100205", "2025-07-12 10:45:00", "Nhà Giả Kim", "9786045678902", "3", "79000", "TikTok Shop", "Hoàn thành"],
  ["TT-99100206", "2025-07-12 15:00:00", "Tuổi Trẻ Đáng Giá Bao Nhiêu", "9786045678903", "1", "90000", "TikTok Shop", "Hoàn thành"],
  ["SP-20250713-01", "2025-07-13 09:30:00", "Cha Giàu Cha Nghèo", "9786045678907", "1", "115000", "Shopee", "Hoàn thành"],
  ["SP-20250713-02", "2025-07-13 14:20:00", "Đọc Vị Bất Kỳ Ai", "9786045678908", "1", "89000", "Shopee", "Hoàn thành"],
  ["LZD-88202507", "2025-07-14 11:00:00", "Mắt Biếc", "9786045678909", "2", "110000", "Lazada", "Hoàn thành"],
];

function createWorkbook(rows, sheetName) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

const file1Path = path.join(outDir, "don-hang-pos-cua-hang.xlsx");
const file2Path = path.join(outDir, "don-hang-online-da-kenh.xlsx");
const file3Path = path.join(outDir, "danh-muc-san-pham-chuan.xlsx");

XLSX.writeFile(createWorkbook(posData, "Đơn POS"), file1Path);
console.log("Created Excel file successfully:", file1Path);

XLSX.writeFile(createWorkbook(onlineData, "Đơn Online"), file2Path);
console.log("Created Excel file successfully:", file2Path);

XLSX.writeFile(createWorkbook(catalogData, "Danh mục chuẩn"), file3Path);
console.log("Created Excel file successfully:", file3Path);

console.log("All 6-group sample data files generated successfully!");
