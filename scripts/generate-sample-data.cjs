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
// 1. TỆP DANH MỤC SẢN PHẨM CHUẨN ĐA NGÀNH HÀNG (MASTER CATALOG - 16 Sản phẩm)
// Bao gồm: Sách, Thời trang, Điện máy & Gia dụng, Mỹ phẩm
// ============================================================================
const catalogData = [
  ["Mã sản phẩm / Barcode", "Tên sản phẩm chuẩn", "Thương hiệu / NCC", "Ngành hàng", "Giá niêm yết"],
  // --- Sách & Văn hóa phẩm ---
  ["9786042392440", "Mãi mãi tuổi hai mươi (Độc quyền - Bìa cứng)", "NXB Kim Đồng", "Sách & Văn hóa phẩm", "135.000"],
  ["9786045678901", "Đắc Nhân Tâm (Tái bản 2025)", "NXB Trẻ", "Sách & Văn hóa phẩm", "86.000"],
  ["9786045678902", "Nhà Giả Kim", "NXB Nhã Nam", "Sách & Văn hóa phẩm", "79.000"],
  ["9786045678903", "Tuổi Trẻ Đáng Giá Bao Nhiêu", "NXB Hội Nhà Văn", "Sách & Văn hóa phẩm", "90.000"],
  // --- Thời trang & May mặc ---
  ["8935001234567", "Áo Thun Nam Cotton Compact Cổ Tròn", "Coolmate", "Thời trang & May mặc", "199.000"],
  ["8935001234568", "Quần Jean Nam Slimfit Co Giãn", "Canifa", "Thời trang & May mặc", "449.000"],
  ["8935001234569", "Giày Thể Thao Biti's Hunter Street", "Biti's", "Thời trang & May mặc", "899.000"],
  ["8935001234571", "Áo Khoác Gió Nam Chống Thấm Nước", "Uniqlo", "Thời trang & May mặc", "699.000"],
  // --- Điện máy & Thiết bị gia dụng ---
  ["8710103856789", "Nồi Chiên Không Dầu Philips 4.5L HD9200", "Philips", "Điện tử & Gia dụng", "1.490.000"],
  ["8935001234570", "Ấm Siêu Tốc Inox Sunhouse 1.8L SHD1351", "Sunhouse", "Điện tử & Gia dụng", "185.000"],
  ["6934177785678", "Tai Nghe Bluetooth Xiaomi Redmi Buds 4", "Xiaomi", "Điện tử & Gia dụng", "490.000"],
  ["8935001234572", "Máy Xay Sinh Tố Cầm Tay Lock&Lock", "Lock&Lock", "Điện tử & Gia dụng", "550.000"],
  // --- Mỹ phẩm & Chăm sóc cá nhân ---
  ["3337875591079", "Kem Chống Nắng La Roche-Posay Anthelios 50ml", "La Roche-Posay", "Mỹ phẩm & Làm đẹp", "395.000"],
  ["8936173200123", "Nước Tẩy Trang Bí Đao Cocoon 500ml", "Cocoon", "Mỹ phẩm & Làm đẹp", "245.000"],
  ["3337875597354", "Sữa Rửa Mặt Tạo Bọt CeraVe Foaming Cleanser 236ml", "CeraVe", "Mỹ phẩm & Làm đẹp", "320.000"],
  ["8936173200124", "Dầu Gội Bưởi Phục Hồi Tóc Cocoon 310ml", "Cocoon", "Mỹ phẩm & Làm đẹp", "165.000"],
];

// ============================================================================
// 2. TỆP ĐƠN HÀNG TRỰC TUYẾN SHOPEE (Đa ngành hàng, chứa các biến thể & lỗi thực tế)
// ============================================================================
const shopeeData = [
  ["Ma don", "Ngay gio", "San pham", "Ma vach", "SL", "Gia ban", "Kenh", "Trang thai"],
  // Sách
  ["SP-20250701-01", "2025-07-01 10:15:00", "Mãi mãi tuổi hai mươi", "9786042392440", "2", "135000", "shopee vn", "giao thanh cong"],
  ["SP-20250701-02", "2025-07-01 11:30:00", "Đắc Nhân Tâm", "9786045678901", "1", "86000", "shopee", "completed"],
  ["SP-20250702-01", "2025-07-02 09:20:00", "Nha Gia Kim (Bản tiếng Việt)", "9786045678902", "1", "79000", "Shopee", "Hoàn thành"],
  // Thời trang
  ["SP-20250702-02", "2025-07-02 14:45:00", "Áo Thun Nam Cotton Coolmate (Trắng - Size L)", "8935001234567", "2", "199000", "Shopee", "Hoàn thành"],
  ["SP-20250703-01", "2025-07-03 16:10:00", "Quần Jean Nam Slimfit Canifa (Xanh Đậm - 31)", "8935001234568", "1", "449000", "Shopee", "Hoàn thành"],
  ["SP-20250703-02", "2025-07-03 18:00:00", "Giày Biti's Hunter Street - Đen 42", "", "hai", "899000", "Shopee", "Hoàn thành"], // Missing Barcode + Malformed Qty
  // Gia dụng
  ["SP-20250704-01", "2025-07-04 09:15:00", "Nồi Chiên Không Dầu Philips 4.5L", "8710103856789", "1", "1490000", "Shopee", "Hoàn thành"],
  ["SP-20250704-02", "2025-07-04 14:30:00", "Ấm Siêu Tốc Inox Sunhouse 1.8L", "8935001234570", "2", "125000", "Shopee", "Hoàn thành"], // Price anomaly (125k vs 185k)
  ["SP-20250705-01", "2025-07-05 11:00:00", "Tai Nghe Bluetooth Xiaomi Redmi Buds 4", "6934177785678", "1", "490000", "Shopee", "Hoàn thành"],
  // Mỹ phẩm
  ["SP-20250705-02", "2025-07-05 16:45:00", "Kem Chống Nắng La Roche-Posay Anthelios", "3337875591079", "1", "395000", "Shopee", "Hoàn thành"],
  ["SP-20250706-01", "2025-07-06 10:20:00", "Nước Tẩy Trang Bí Đao Cocoon", "8936173200123", "1", "245000", "Shopee", "Hoàn thành"],
  ["SP-20250706-02", "2025-07-06 15:10:00", "Sữa Rửa Mặt CeraVe Foaming Cleanser 236ml", "3337875597354", "1", "320000", "Shopee", "Hoàn thành"],
];

// ============================================================================
// 3. TỆP ĐƠN HÀNG TẠI QUẦY POS / CỬA HÀNG ĐA NGÀNH HÀNG
// ============================================================================
const posData = [
  ["Mã đơn hàng", "Ngày bán", "Tên sản phẩm", "Mã vạch / SKU", "Số lượng", "Đơn giá", "Thương hiệu", "Trạng thái", "Kênh"],
  // Sách
  ["POS-2025-001", "2025-07-01 10:15:00", "Mãi mãi tuổi hai mươi (Độc quyền - Bìa cứng)", "9786042392440", "1", "135000", "NXB Kim Đồng", "Hoàn thành", "POS"],
  ["POS-2025-002", "2025-07-01 11:30:00", "Đắc Nhân Tâm", "9786045678901", "2", "86000", "NXB Trẻ", "Hoàn thành", "Tai quay"],
  ["POS-2025-003", "2025-07-02 09:20:00", "Nhà Giả Kim", "9786045678902", "1", "79000", "NXB Nhã Nam", "Hoàn thành", "POS"],
  // Thời trang
  ["POS-2025-004", "2025-07-02 14:45:00", "Áo Thun Nam Cotton Compact", "8935001234567", "3", "199000", "Coolmate", "Hoàn thành", "POS"],
  ["POS-2025-005", "2025-07-03 16:10:00", "Quần Jean Nam Slimfit", "8935001234568", "1", "449000", "Canifa", "Hoàn thành", "POS"],
  ["POS-2025-005", "2025-07-03 16:15:00", "Quần Jean Nam Slimfit", "8935001234568", "1", "449000", "Canifa", "Hoàn thành", "POS"], // Duplicate Order ID
  ["POS-2025-006", "15-07-2025 08:30:00", "Giày Thể Thao Biti's Hunter Street", "8935001234569", "1", "899000", "Biti's", "Hoàn thành", "POS"], // Date format
  // Gia dụng
  ["POS-2025-007", "2025-07-04 10:00:00", "Nồi Chiên Không Dầu Philips 4.5L", "8710103856789", "1", "1490000", "Philips", "Hoàn thành", "POS"],
  ["POS-2025-008", "2025-07-04 11:20:00", "Ấm Siêu Tốc Inox Sunhouse 1.8L", "8935001234570", "1", "0", "Sunhouse", "Hoàn thành", "POS"], // Price = 0 (Null vs Zero)
  ["POS-2025-009", "2025-07-05 13:15:00", "Tai Nghe Bluetooth Xiaomi Redmi Buds 4", "6934177785678", "2", "490000", "Xiaomi", "Hoàn thành", "POS"],
  // Mỹ phẩm
  ["POS-2025-010", "2025-07-05 15:40:00", "Kem Chống Nắng La Roche-Posay Anthelios", "3337875591079", "2", "395000", "La Roche-Posay", "Hoàn thành", "POS"],
  ["POS-2025-011", "2025-07-06 09:10:00", "Nước Tẩy Trang Bí Đao Cocoon 500ml", "8936173200123", "1", "245000", "Cocoon", "Hoàn thành", "POS"],
  ["POS-2025-012", "2025-07-06 14:25:00", "Sữa Rửa Mặt CeraVe Foaming Cleanser 236ml", "3337875597354", "1", "320000", "CeraVe", "Đã hủy", "POS"], // Stale data
];

// ============================================================================
// 4. TỆP FAHASA THỰC TẾ: Báo cáo xuất bán đa chi nhánh
// ============================================================================
const fahasaData = [
  ["STT", "Barcode", "Tên sản phẩm", "Mã NCC", "Tên NCC", "Giá bìa", "GDNSBT - NS FAHASA Long Bình Tân", "GDNSQN - NS FAHASA Quảng Nam", "GDNSST - NS FAHASA Sông Trà", "GDNSTD - NS Thủ Đức"],
  ["1", "9786042392440", "Mãi mãi tuổi hai mươi (Độc quyền - Bìa cứng)", "CN00015", "Chi nhánh Nhà xuất bản Kim Đồng tại Thành phố Hồ Chí Minh", "135,000", "1", "1", "1", "2"],
  ["2", "9786045678901", "Đắc Nhân Tâm (Tái bản 2025)", "CN00018", "Chi nhánh Công ty TNHH Văn Hóa Sáng Tạo Trí Việt", "86,000", "3", "2", "1", "4"],
  ["3", "9786045678902", "Nhà Giả Kim", "CN00022", "Công ty Cổ phần Văn hóa & Truyền thông Nhã Nam", "79,000", "2", "0", "3", "5"],
  ["4", "9786045678903", "Tuổi Trẻ Đáng Giá Bao Nhiêu", "CN00030", "Nhà xuất bản Hội Nhà Văn", "90,000", "1", "2", "0", "3"],
];

const file1 = path.join(outDir, "danh-muc-san-pham-chuan.xlsx");
const file2 = path.join(outDir, "don-hang-online-shopee.xlsx");
const file3 = path.join(outDir, "don-hang-pos-cua-hang.xlsx");
const file4 = path.join(outDir, "bao-cao-phan-phoi-fahasa.xlsx");

XLSX.writeFile(createWorkbook(catalogData, "Master Catalog Đa Ngành"), file1);
XLSX.writeFile(createWorkbook(shopeeData, "Đơn Shopee Đa Ngành"), file2);
XLSX.writeFile(createWorkbook(posData, "Đơn POS Đa Ngành"), file3);
XLSX.writeFile(createWorkbook(fahasaData, "FAHASA Xuất Bán"), file4);

console.log("✓ Đã sinh thành công 4 tệp dữ liệu mẫu thực tế ĐA NGÀNH HÀNG:");
console.log("  -", file1, "(Master Catalog chuẩn: Sách, Thời trang, Điện gia dụng, Mỹ phẩm)");
console.log("  -", file2, "(Đơn hàng online Shopee)");
console.log("  -", file3, "(Đơn hàng tại quầy POS)");
console.log("  -", file4, "(Báo cáo xuất bán đa chi nhánh FAHASA)");
