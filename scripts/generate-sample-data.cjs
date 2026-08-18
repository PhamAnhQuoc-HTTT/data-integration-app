const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const outDir = path.join(__dirname, "..", "sample-data");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function createWorkbook(rows, sheetName) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

// ============================================================================
// 1. TỆP FAHASA THỰC TẾ: Báo cáo xuất bán đa chi nhánh (Template chuẩn FAHASA)
// ============================================================================
const fahasaData = [
  ["STT", "Barcode", "Tên sản phẩm", "Mã NCC", "Tên NCC", "Giá bìa", "GDNSBT - NS FAHASA Long Bình Tân", "GDNSQN - NS FAHASA Quảng Nam", "GDNSST - NS FAHASA Sông Trà", "GDNSTD - NS Thủ Đức"],
  ["1", "9786042392440", "Mãi mãi tuổi hai mươi (Độc quyền - Bìa cứng)", "CN00015", "Chi nhánh Nhà xuất bản Kim Đồng tại Thành phố Hồ Chí Minh", "135,000", "1", "1", "1", "2"],
  ["2", "9786045678901", "Đắc Nhân Tâm (Tái bản 2025)", "CN00018", "Chi nhánh Công ty TNHH Văn Hóa Sáng Tạo Trí Việt", "86,000", "3", "2", "1", "4"],
  ["3", "9786045678902", "Nhà Giả Kim", "CN00022", "Công ty Cổ phần Văn hóa & Truyền thông Nhã Nam", "79,000", "2", "0", "3", "5"],
  ["4", "9786045678903", "Tuổi Trẻ Đáng Giá Bao Nhiêu", "CN00030", "Nhà xuất bản Hội Nhà Văn", "90,000", "1", "2", "0", "3"],
  ["5", "9786045678904", "Cà Phê Cùng Tony", "CN00018", "Nhà xuất bản Trẻ", "95,000", "2", "1", "1", "1"],
  ["6", "9786045678905", "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "CN00018", "Nhà xuất bản Trẻ", "125,000", "0", "1", "2", "2"],
  ["7", "9786045678913", "Dế Mèn Phiêu Lưu Ký (Ấn bản kỷ niệm)", "CN00015", "Chi nhánh Nhà xuất bản Kim Đồng tại Thành phố Hồ Chí Minh", "55,000", "5", "3", "4", "6"],
  ["8", "9786045678910", "Số Đỏ", "CN00045", "Nhà xuất bản Văn Học", "65,000", "1", "0", "1", "2"],
  ["9", "9786045678911", "Tư Duy Nhanh Và Chậm", "CN00088", "Nhà xuất bản Thế Giới", "210,000", "1", "1", "0", "2"],
  ["10", "9786045678918", "Hạt Giống Tâm Hồn", "CN00099", "Nhà xuất bản Tổng Hợp TP.HCM", "75,000", "2", "2", "1", "3"],
];

// ============================================================================
// 2. TỆP ĐƠN HÀNG ONLINE SHOPEE / TMĐT (Đa dạng 6 nhóm lỗi để test)
// ============================================================================
const shopeeData = [
  ["Ma don", "Ngay gio", "San pham", "Ma vach", "SL", "Gia ban", "Kenh", "Trang thai"],
  ["SP-20250701-01", "2025-07-01 10:15:00", "Mãi mãi tuổi hai mươi", "9786042392440", "2", "135000", "shopee vn", "giao thanh cong"],
  ["SP-20250701-02", "2025-07-01 11:30:00", "Đắc Nhân Tâm", "9786045678901", "1", "86000", "shopee", "completed"],
  ["SP-20250702-01", "2025-07-02 09:20:00", "Nha Gia Kim", "9786045678902", "2", "79000", "Shopee", "Hoàn thành"],
  ["SP-20250702-02", "2025-07-02 14:45:00", "Tuổi Trẻ Đáng Giá Bao Nhiêu", "9786045678903", "1", "90000", "Shopee", "Hoàn thành"],
  ["SP-20250703-01", "2025-07-03 16:10:00", "Cà Phê Cùng Tony - Bản Đẹp", "", "1", "95000", "Shopee", "Hoàn thành"], // Missing ISBN
  ["SP-20250703-02", "2025-07-03 18:00:00", "Dế Mèn Phiêu Lưu Ký", "9786045678913", "hai", "55000", "Shopee", "Hoàn thành"], // Malformed quantity
  ["SP-20250704-01", "2025-07-04 09:15:00", "Số Đỏ", "9786045678910", "1", "35000", "Shopee", "Hoàn thành"], // Cross-channel price anomaly (35k vs 65k)
  ["SP-20250704-02", "2025-07-04 14:30:00", "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "9786045678905", "1", "125000", "Shopee", "Hoàn thành"],
  ["SP-20250705-01", "2025-07-05 11:00:00", "Sách Lập Trình React 19 Mới Nhất", "9789999999999", "1", "180000", "Shopee", "Hoàn thành"], // Unresolved exclusive
  ["SP-20250705-02", "2025-07-05 16:45:00", "Hạt Giống Tâm Hồn (Tập 1)", "9786045678918", "2", "75000", "Shopee", "Hoàn thành"],
];

// ============================================================================
// 3. TỆP ĐƠN HÀNG POS TẠI CỬA HÀNG
// ============================================================================
const posData = [
  ["Mã đơn hàng", "Ngày bán", "Tên sản phẩm", "ISBN", "Số lượng", "Đơn giá", "Thương hiệu", "Trạng thái", "Kênh"],
  ["POS-2025-001", "2025-07-01 10:15:00", "Mãi mãi tuổi hai mươi (Độc quyền - Bìa cứng)", "9786042392440", "1", "135000", "NXB Kim Đồng", "Hoàn thành", "POS"],
  ["POS-2025-002", "2025-07-01 11:30:00", "Đắc Nhân Tâm", "9786045678901", "2", "86000", "NXB Trẻ", "Hoàn thành", "Tai quay"],
  ["POS-2025-003", "2025-07-02 09:20:00", "Nhà Giả Kim", "9786045678902", "1", "79000", "NXB Nhã Nam", "Hoàn thành", "POS"],
  ["POS-2025-004", "2025-07-02 14:45:00", "Tuổi Trẻ Đáng Giá Bao Nhiêu", "9786045678903", "1", "0", "NXB Hội Nhà Văn", "Hoàn thành", "POS"], // Null vs Zero
  ["POS-2025-005", "2025-07-03 16:10:00", "Cà Phê Cùng Tony", "9786045678904", "2", "95000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-005", "2025-07-03 16:15:00", "Cà Phê Cùng Tony", "9786045678904", "2", "95000", "NXB Trẻ", "Hoàn thành", "POS"], // Duplicate ID
  ["POS-2025-006", "15-07-2025 08:30:00", "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "9786045678905", "1", "125000", "NXB Trẻ", "Hoàn thành", "POS"], // Date format
  ["POS-2025-007", "2025-07-04 10:00:00", "Dế Mèn Phiêu Lưu Ký", "9786045678913", "3", "55000", "NXB Kim Đồng", "Hoàn thành", "POS"],
  ["POS-2025-008", "2025-07-04 11:20:00", "Sách Giáo Khoa Toán 12", "9789999999999", "1", "35000", "NXB Giáo Dục", "Đã hủy", "POS"], // Stale data
];

// ============================================================================
// 4. DANH MỤC SẢN PHẨM CHUẨN (MASTER CATALOG)
// ============================================================================
const catalogData = [
  ["Tên sản phẩm", "ISBN", "Nhà xuất bản", "Thể loại", "Giá bìa"],
  ["Mãi mãi tuổi hai mươi (Độc quyền - Bìa cứng)", "9786042392440", "NXB Kim Đồng", "Văn học", "135.000"],
  ["Đắc Nhân Tâm", "9786045678901", "NXB Trẻ", "Kỹ năng sống", "86.000"],
  ["Nhà Giả Kim", "9786045678902", "NXB Nhã Nam", "Văn học", "79.000"],
  ["Tuổi Trẻ Đáng Giá Bao Nhiêu", "9786045678903", "NXB Hội Nhà Văn", "Kỹ năng sống", "90.000"],
  ["Cà Phê Cùng Tony", "9786045678904", "NXB Trẻ", "Kỹ năng sống", "95.000"],
  ["Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "9786045678905", "NXB Trẻ", "Văn học", "125.000"],
  ["Dế Mèn Phiêu Lưu Ký", "9786045678913", "NXB Kim Đồng", "Thiếu nhi", "55.000"],
  ["Số Đỏ", "9786045678910", "NXB Văn Học", "Văn học", "65.000"],
  ["Tư Duy Nhanh Và Chậm", "9786045678911", "NXB Thế Giới", "Tâm lý học", "210.000"],
  ["Hạt Giống Tâm Hồn", "9786045678918", "NXB Tổng Hợp TP.HCM", "Tâm lý học", "75.000"],
];

const file1 = path.join(outDir, "bao-cao-phan-phoi-fahasa.xlsx");
const file2 = path.join(outDir, "don-hang-online-shopee.xlsx");
const file3 = path.join(outDir, "don-hang-pos-cua-hang.xlsx");
const file4 = path.join(outDir, "danh-muc-san-pham-chuan.xlsx");

XLSX.writeFile(createWorkbook(fahasaData, "FAHASA Xuất Bán"), file1);
XLSX.writeFile(createWorkbook(shopeeData, "Đơn Shopee"), file2);
XLSX.writeFile(createWorkbook(posData, "Đơn POS"), file3);
XLSX.writeFile(createWorkbook(catalogData, "Danh mục chuẩn"), file4);

console.log("✓ Đã sinh thành công các tệp dữ liệu mẫu thực tế:");
console.log("  -", file1, "(Báo cáo đa chi nhánh chuẩn FAHASA)");
console.log("  -", file2, "(Đơn hàng trực tuyến Shopee)");
console.log("  -", file3, "(Đơn hàng tại quầy POS)");
console.log("  -", file4, "(Danh mục sản phẩm chuẩn Master Catalog)");
