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
// 1. MASTER CATALOG — 25 sản phẩm chuẩn (Ground Truth)
//    Đây là nguồn sự thật duy nhất để đo lường RQ1 & RQ2
// ============================================================================
const catalogData = [
  ["Mã sản phẩm / Barcode", "Tên sản phẩm chuẩn", "Thương hiệu / NCC", "Thể loại", "Giá niêm yết"],
  // --- Sách & Văn hóa phẩm (10 đầu sách kinh điển Việt Nam) ---
  ["9786042392440", "Mãi Mãi Tuổi Hai Mươi (Độc Quyền - Bìa Cứng)", "NXB Kim Đồng", "Văn học Việt Nam", "135000"],
  ["9786045678901", "Đắc Nhân Tâm (Tái Bản 2025)", "NXB Trẻ", "Kỹ năng sống", "86000"],
  ["9786045678902", "Nhà Giả Kim", "NXB Nhã Nam", "Tiểu thuyết", "79000"],
  ["9786045678903", "Tuổi Trẻ Đáng Giá Bao Nhiêu", "NXB Hội Nhà Văn", "Kỹ năng sống", "90000"],
  ["9786045678904", "Cà Phê Cùng Tony", "NXB Trẻ", "Tản văn", "72000"],
  ["9786045678905", "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "NXB Trẻ", "Văn học Việt Nam", "85000"],
  ["9786045678906", "Cho Tôi Xin Một Vé Đi Tuổi Thơ", "NXB Trẻ", "Văn học Việt Nam", "65000"],
  ["9786045678907", "Sapiens: Lược Sử Loài Người", "NXB Thế Giới", "Khoa học", "189000"],
  ["9786045678908", "Atomic Habits - Thay Đổi Tí Hon Hiệu Quả Bất Ngờ", "NXB Thế Giới", "Kỹ năng sống", "149000"],
  ["9786045678909", "Dám Bị Ghét", "NXB Lao Động", "Tâm lý học", "115000"],
  // --- Thời trang & Phụ kiện (8 sản phẩm) ---
  ["8935001234567", "Áo Thun Nam Cotton Compact Cổ Tròn", "Coolmate", "Áo nam", "199000"],
  ["8935001234568", "Quần Jean Nam Slimfit Co Giãn", "Canifa", "Quần nam", "449000"],
  ["8935001234569", "Giày Thể Thao Biti's Hunter Street", "Biti's", "Giày dép", "899000"],
  ["8935001234571", "Áo Khoác Gió Nam Chống Thấm Nước", "Uniqlo", "Áo khoác", "699000"],
  ["8935001234573", "Balo Laptop Chống Sốc 15.6 inch", "Tomtoc", "Phụ kiện", "890000"],
  ["8935001234574", "Kính Mát Phân Cực Chống UV400", "Rayban", "Phụ kiện", "2490000"],
  ["8935001234575", "Dép Quai Ngang Adidas Adilette", "Adidas", "Giày dép", "750000"],
  ["8935001234576", "Nón Lưỡi Trai MLB NY Yankees", "MLB", "Phụ kiện", "1290000"],
  // --- Điện tử & Gia dụng (7 sản phẩm) ---
  ["8710103856789", "Nồi Chiên Không Dầu Philips 4.5L HD9200", "Philips", "Gia dụng", "1490000"],
  ["8935001234570", "Ấm Siêu Tốc Inox Sunhouse 1.8L SHD1351", "Sunhouse", "Gia dụng", "185000"],
  ["6934177785678", "Tai Nghe Bluetooth Xiaomi Redmi Buds 4", "Xiaomi", "Điện tử", "490000"],
  ["8935001234572", "Máy Xay Sinh Tố Cầm Tay Lock&Lock", "Lock&Lock", "Gia dụng", "550000"],
  ["3337875591079", "Kem Chống Nắng La Roche-Posay Anthelios 50ml", "La Roche-Posay", "Chăm sóc da", "395000"],
  ["8936173200123", "Nước Tẩy Trang Bí Đao Cocoon 500ml", "Cocoon", "Chăm sóc da", "245000"],
  ["3337875597354", "Sữa Rửa Mặt Tạo Bọt CeraVe Foaming Cleanser 236ml", "CeraVe", "Chăm sóc da", "320000"],
];

// ============================================================================
// 2. ĐƠN HÀNG SHOPEE — 35 dòng
//    Mô phỏng file xuất từ sàn Shopee: tên cột KHÔNG DẤU, kênh ghi lung tung,
//    trạng thái tiếng Anh lẫn lộn, thiếu mã vạch, lệch giá, tên viết tắt...
// ============================================================================
const shopeeData = [
  ["Ma don", "Ngay gio", "San pham", "Ma vach", "SL", "Gia ban", "Kenh", "Trang thai"],
  // --- Sách (tên không dấu, viết tắt, phụ đề khác catalog) ---
  ["SP-20250701-001", "2025-07-01 10:15:00", "Mai mai tuoi hai muoi", "9786042392440", "2", "135000", "shopee vn", "giao thanh cong"],
  ["SP-20250701-002", "2025-07-01 11:30:00", "Dac Nhan Tam", "9786045678901", "1", "86000", "shopee", "completed"],
  ["SP-20250701-003", "2025-07-01 14:20:00", "Nha Gia Kim (Ban tieng Viet)", "9786045678902", "1", "79000", "Shopee", "Hoàn thành"],
  ["SP-20250702-001", "2025-07-02 08:45:00", "Tuoi Tre Dang Gia Bao Nhieu", "9786045678903", "3", "90000", "Shopee", "Hoàn thành"],
  ["SP-20250702-002", "2025-07-02 10:10:00", "Ca Phe Cung Tony (Bia Mem)", "9786045678904", "1", "72000", "Shopee", "Hoàn thành"],
  ["SP-20250702-003", "2025-07-02 13:25:00", "Toi Thay Hoa Vang Tren Co Xanh", "", "1", "85000", "Shopee", "Hoàn thành"],          // THIẾU MÃ VẠCH → Fuzzy Tier 3
  ["SP-20250703-001", "2025-07-03 09:00:00", "Cho Toi Xin Mot Ve Di Tuoi Tho", "", "2", "65000", "Shopee", "Hoàn thành"],            // THIẾU MÃ VẠCH → Fuzzy Tier 3
  ["SP-20250703-002", "2025-07-03 11:30:00", "Sapiens - Luoc Su Loai Nguoi", "9786045678907", "1", "189000", "Shopee", "Hoàn thành"],
  ["SP-20250703-003", "2025-07-03 15:45:00", "Atomic Habits", "9786045678908", "1", "149000", "Shopee", "Hoàn thành"],               // Tên rút gọn (thiếu phụ đề)
  ["SP-20250704-001", "2025-07-04 10:20:00", "Dam Bi Ghet", "9786045678909", "1", "115000", "Shopee", "Hoàn thành"],
  // --- Thời trang (tên có thêm màu/size, giá lệch so catalog) ---
  ["SP-20250704-002", "2025-07-04 14:45:00", "Áo Thun Nam Cotton Coolmate (Trắng - Size L)", "8935001234567", "2", "199000", "Shopee", "Hoàn thành"],
  ["SP-20250705-001", "2025-07-05 09:30:00", "Quần Jean Nam Slimfit Canifa (Xanh Đậm - 31)", "8935001234568", "1", "449000", "Shopee", "Hoàn thành"],
  ["SP-20250705-002", "2025-07-05 11:00:00", "Giày Biti's Hunter Street - Đen 42", "", "hai", "899000", "Shopee", "Hoàn thành"],     // THIẾU MÃ + SỐ LƯỢNG LÀ CHỮ
  ["SP-20250705-003", "2025-07-05 16:20:00", "Áo Khoác Gió Uniqlo Chống Thấm", "8935001234571", "1", "550000", "Shopee", "Hoàn thành"], // GIÁ LỆCH (550k vs 699k = -21%)
  ["SP-20250706-001", "2025-07-06 08:10:00", "Balo Laptop Tomtoc 15.6 inch Chống Sốc", "8935001234573", "1", "890000", "Shopee", "Hoàn thành"],
  ["SP-20250706-002", "2025-07-06 10:45:00", "Kinh Mat Phan Cuc Chong UV400 Rayban", "", "1", "2490000", "Shopee", "Hoàn thành"],    // THIẾU MÃ + TÊN KHÔNG DẤU → Fuzzy
  ["SP-20250706-003", "2025-07-06 14:30:00", "Dép Quai Ngang Adidas", "8935001234575", "1", "750000", "Shopee", "Hoàn thành"],
  ["SP-20250707-001", "2025-07-07 09:15:00", "Non MLB NY Yankees", "8935001234576", "1", "1290000", "Shopee VN", "Hoàn thành"],
  // --- Gia dụng & Mỹ phẩm ---
  ["SP-20250707-002", "2025-07-07 11:00:00", "Nồi Chiên Không Dầu Philips 4.5L", "8710103856789", "1", "1490000", "Shopee", "Hoàn thành"],
  ["SP-20250707-003", "2025-07-07 14:30:00", "Ấm Siêu Tốc Inox Sunhouse 1.8L", "8935001234570", "2", "125000", "Shopee", "Hoàn thành"], // GIÁ BẤT THƯỜNG (125k vs 185k = -32%)
  ["SP-20250708-001", "2025-07-08 09:00:00", "Tai Nghe Bluetooth Xiaomi Redmi Buds 4", "6934177785678", "1", "490000", "Shopee", "Hoàn thành"],
  ["SP-20250708-002", "2025-07-08 10:30:00", "Máy Xay Sinh Tố Lock&Lock Cầm Tay", "8935001234572", "1", "550000", "Shopee", "Hoàn thành"],
  ["SP-20250708-003", "2025-07-08 15:00:00", "Kem Chống Nắng La Roche-Posay Anthelios", "3337875591079", "1", "395000", "Shopee", "Hoàn thành"],
  ["SP-20250709-001", "2025-07-09 08:40:00", "Nước Tẩy Trang Bí Đao Cocoon", "8936173200123", "2", "245000", "Shopee", "Hoàn thành"],
  ["SP-20250709-002", "2025-07-09 12:15:00", "Sữa Rửa Mặt CeraVe Foaming Cleanser 236ml", "3337875597354", "1", "320000", "Shopee", "Hoàn thành"],
  // --- Đơn hàng đặc biệt: Đơn hủy nhưng có doanh thu (Stale Data - RQ3) ---
  ["SP-20250709-003", "2025-07-09 17:30:00", "Đắc Nhân Tâm", "9786045678901", "1", "86000", "Shopee", "Đã hủy"],
  ["SP-20250710-001", "2025-07-10 09:00:00", "Nhà Giả Kim", "9786045678902", "2", "79000", "Shopee", "Trả hàng/Hoàn tiền"],
  // --- Sản phẩm KHÔNG CÓ trong Catalog (UNRESOLVED - kiểm thử RQ2) ---
  ["SP-20250710-002", "2025-07-10 11:30:00", "Bình Giữ Nhiệt Inox 500ml Lock&Lock", "8935001299999", "1", "350000", "Shopee", "Hoàn thành"],
  ["SP-20250710-003", "2025-07-10 14:00:00", "Túi Tote Vải Canvas In Hình", "", "1", "89000", "Shopee", "Hoàn thành"],
  // --- Đơn hàng trùng lặp Mã đơn (Duplicate - RQ3) ---
  ["SP-20250701-001", "2025-07-01 10:16:00", "Mai mai tuoi hai muoi", "9786042392440", "2", "135000", "Shopee", "giao thanh cong"], // TRÙNG MÃ ĐƠN dòng 1
  // --- Tổng cộng: 31 dòng dữ liệu ---
];

// ============================================================================
// 3. ĐƠN HÀNG POS TẠI QUẦY — 30 dòng
//    Mô phỏng file xuất từ phần mềm quản lý bán hàng tại cửa hàng:
//    tên cột ĐẦY ĐỦ DẤU, format ngày lẫn lộn, trùng mã đơn, giá = 0...
// ============================================================================
const posData = [
  ["Mã đơn hàng", "Ngày bán", "Tên sản phẩm", "Mã vạch / SKU", "Số lượng", "Đơn giá", "Thương hiệu", "Trạng thái", "Kênh"],
  // --- Sách (tên đầy đủ dấu, chuẩn) ---
  ["POS-2025-001", "2025-07-01 10:15:00", "Mãi Mãi Tuổi Hai Mươi (Độc Quyền - Bìa Cứng)", "9786042392440", "1", "135000", "NXB Kim Đồng", "Hoàn thành", "POS"],
  ["POS-2025-002", "2025-07-01 11:30:00", "Đắc Nhân Tâm (Tái Bản 2025)", "9786045678901", "2", "86000", "NXB Trẻ", "Hoàn thành", "Tại quầy"],
  ["POS-2025-003", "2025-07-02 09:20:00", "Nhà Giả Kim", "9786045678902", "1", "79000", "NXB Nhã Nam", "Hoàn thành", "POS"],
  ["POS-2025-004", "02/07/2025 14:00:00", "Tuổi Trẻ Đáng Giá Bao Nhiêu", "9786045678903", "1", "90000", "NXB Hội Nhà Văn", "Hoàn thành", "POS"],  // NGÀY dd/mm/yyyy
  ["POS-2025-005", "2025-07-03 08:45:00", "Cà Phê Cùng Tony", "9786045678904", "2", "72000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-006", "2025-07-03 10:30:00", "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "9786045678905", "1", "85000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-007", "2025-07-04 09:00:00", "Cho Tôi Xin Một Vé Đi Tuổi Thơ", "9786045678906", "3", "65000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-008", "2025-07-04 11:15:00", "Sapiens: Lược Sử Loài Người", "9786045678907", "1", "189000", "NXB Thế Giới", "Hoàn thành", "POS"],
  ["POS-2025-009", "15-07-2025 08:30:00", "Atomic Habits - Thay Đổi Tí Hon Hiệu Quả Bất Ngờ", "9786045678908", "1", "149000", "NXB Thế Giới", "Hoàn thành", "POS"], // NGÀY dd-mm-yyyy
  ["POS-2025-010", "2025-07-05 14:20:00", "Dám Bị Ghét", "9786045678909", "1", "115000", "NXB Lao Động", "Hoàn thành", "POS"],
  // --- Thời trang ---
  ["POS-2025-011", "2025-07-06 09:00:00", "Áo Thun Nam Cotton Compact Cổ Tròn", "8935001234567", "3", "199000", "Coolmate", "Hoàn thành", "POS"],
  ["POS-2025-012", "2025-07-06 10:30:00", "Quần Jean Nam Slimfit Co Giãn", "8935001234568", "1", "449000", "Canifa", "Hoàn thành", "POS"],
  ["POS-2025-012", "2025-07-06 10:35:00", "Quần Jean Nam Slimfit Co Giãn", "8935001234568", "1", "449000", "Canifa", "Hoàn thành", "POS"], // TRÙNG MÃ ĐƠN
  ["POS-2025-013", "2025-07-07 08:45:00", "Giày Thể Thao Biti's Hunter Street", "8935001234569", "1", "899000", "Biti's", "Hoàn thành", "POS"],
  ["POS-2025-014", "2025-07-07 11:00:00", "Áo Khoác Gió Nam Chống Thấm Nước", "8935001234571", "1", "699000", "Uniqlo", "Hoàn thành", "POS"],
  ["POS-2025-015", "2025-07-08 09:30:00", "Balo Laptop Chống Sốc 15.6 inch", "8935001234573", "1", "890000", "Tomtoc", "Hoàn thành", "POS"],
  ["POS-2025-016", "2025-07-08 14:00:00", "Kính Mát Phân Cực Chống UV400", "8935001234574", "1", "2490000", "Rayban", "Hoàn thành", "POS"],
  ["POS-2025-017", "2025-07-09 08:15:00", "Dép Quai Ngang Adidas Adilette", "8935001234575", "2", "750000", "Adidas", "Hoàn thành", "POS"],
  ["POS-2025-018", "2025-07-09 10:45:00", "Nón Lưỡi Trai MLB NY Yankees", "8935001234576", "1", "1290000", "MLB", "Hoàn thành", "POS"],
  // --- Gia dụng & Mỹ phẩm ---
  ["POS-2025-019", "2025-07-10 09:00:00", "Nồi Chiên Không Dầu Philips 4.5L HD9200", "8710103856789", "1", "1490000", "Philips", "Hoàn thành", "POS"],
  ["POS-2025-020", "2025-07-10 11:30:00", "Ấm Siêu Tốc Inox Sunhouse 1.8L SHD1351", "8935001234570", "1", "0", "Sunhouse", "Hoàn thành", "POS"],   // GIÁ = 0 (Null vs Zero)
  ["POS-2025-021", "2025-07-11 08:20:00", "Tai Nghe Bluetooth Xiaomi Redmi Buds 4", "6934177785678", "2", "490000", "Xiaomi", "Hoàn thành", "POS"],
  ["POS-2025-022", "2025-07-11 10:00:00", "Máy Xay Sinh Tố Cầm Tay Lock&Lock", "8935001234572", "1", "550000", "Lock&Lock", "Hoàn thành", "POS"],
  ["POS-2025-023", "2025-07-12 09:15:00", "Kem Chống Nắng La Roche-Posay Anthelios 50ml", "3337875591079", "2", "395000", "La Roche-Posay", "Hoàn thành", "POS"],
  ["POS-2025-024", "2025-07-12 14:30:00", "Nước Tẩy Trang Bí Đao Cocoon 500ml", "8936173200123", "1", "245000", "Cocoon", "Hoàn thành", "POS"],
  ["POS-2025-025", "2025-07-13 08:45:00", "Sữa Rửa Mặt Tạo Bọt CeraVe Foaming Cleanser 236ml", "3337875597354", "1", "320000", "CeraVe", "Đã hủy", "POS"], // STALE DATA: Đơn hủy có doanh thu
  // --- Sản phẩm KHÔNG CÓ trong Catalog (UNRESOLVED - kiểm thử RQ2) ---
  ["POS-2025-026", "2025-07-13 11:00:00", "Bút Bi Thiên Long TL-027", "8935001888001", "10", "5000", "Thiên Long", "Hoàn thành", "POS"],
  ["POS-2025-027", "2025-07-13 14:20:00", "Vở Kẻ Ngang Campus 200 Trang", "8935001888002", "5", "18000", "Campus", "Hoàn thành", "POS"],
  // --- Tổng cộng: 29 dòng dữ liệu ---
];

// ============================================================================
// 4. TỆP TIKTOK SHOP — 20 dòng
//    Mô phỏng file xuất từ TikTok Shop: tên cột viết tắt, format khác,
//    ngày ISO lẫn lộn, trạng thái tiếng Anh, giá có dấu chấm phân cách...
// ============================================================================
const tiktokData = [
  ["order_id", "created_at", "product_name", "sku_id", "quantity", "unit_price", "status"],
  ["TT-100001", "2025-07-01T09:30:00", "Đắc Nhân Tâm - Tái Bản 2025", "9786045678901", "1", "86.000", "Delivered"],
  ["TT-100002", "2025-07-01T14:00:00", "Nha Gia Kim", "9786045678902", "2", "79.000", "Delivered"],
  ["TT-100003", "2025-07-02T10:15:00", "Ca Phe Cung Tony", "9786045678904", "1", "72.000", "Delivered"],
  ["TT-100004", "2025-07-02T16:30:00", "Sapiens Luoc Su Loai Nguoi", "", "1", "189.000", "Delivered"],         // THIẾU MÃ → Fuzzy
  ["TT-100005", "2025-07-03T08:20:00", "Atomic Habits", "9786045678908", "1", "149.000", "Delivered"],
  ["TT-100006", "2025-07-03T11:45:00", "Dam Bi Ghet - Tam Ly Hoc", "", "1", "115.000", "Delivered"],           // THIẾU MÃ + tên mở rộng
  ["TT-100007", "2025-07-04T09:00:00", "Áo Thun Nam Coolmate Cotton", "8935001234567", "1", "199.000", "Delivered"],
  ["TT-100008", "2025-07-04T13:30:00", "Quan Jean Slimfit Canifa", "8935001234568", "1", "449.000", "Delivered"],
  ["TT-100009", "2025-07-05T10:00:00", "Giày Biti's Hunter Street", "8935001234569", "1", "850.000", "Delivered"], // GIÁ LỆCH (850k vs 899k)
  ["TT-100010", "2025-07-05T15:15:00", "Balo Tomtoc Laptop 15.6\"", "8935001234573", "1", "890.000", "Delivered"],
  ["TT-100011", "2025-07-06T09:45:00", "Noi Chien Khong Dau Philips 4.5L", "8710103856789", "1", "1.490.000", "Delivered"], // GIÁ CÓ DẤU CHẤM PHÂN CÁCH
  ["TT-100012", "2025-07-06T14:00:00", "Tai Nghe Xiaomi Redmi Buds 4", "6934177785678", "2", "490.000", "Delivered"],
  ["TT-100013", "2025-07-07T08:30:00", "Kem Chong Nang La Roche Posay", "3337875591079", "1", "395.000", "Delivered"],
  ["TT-100014", "2025-07-07T11:20:00", "Nuoc Tay Trang Cocoon Bi Dao 500ml", "8936173200123", "1", "245.000", "Delivered"],
  ["TT-100015", "2025-07-08T09:00:00", "Sua Rua Mat CeraVe 236ml", "3337875597354", "1", "320.000", "Delivered"],
  // --- Đơn hủy ---
  ["TT-100016", "2025-07-08T14:30:00", "Áo Khoác Gió Uniqlo", "8935001234571", "1", "699.000", "Cancelled"],
  ["TT-100017", "2025-07-09T10:00:00", "Dép Adidas Adilette Quai Ngang", "8935001234575", "1", "750.000", "Refunded"],
  // --- Sản phẩm KHÔNG CÓ trong Catalog ---
  ["TT-100018", "2025-07-09T15:40:00", "Gối Ôm Hình Mèo Kawaii", "", "1", "120.000", "Delivered"],
  ["TT-100019", "2025-07-10T09:30:00", "Dây Sạc USB-C Anker 1m", "B2B00123456", "2", "150.000", "Delivered"],
  // --- Tổng cộng: 19 dòng dữ liệu ---
];

// ============================================================================
// 5. TỆP FAHASA — Báo cáo phân phối đa chi nhánh (Wide / Pivot format)
//    Dữ liệu dạng bảng ngang theo chi nhánh — hệ thống tự Unpivot
// ============================================================================
const fahasaData = [
  ["STT", "Barcode", "Tên sản phẩm", "Mã NCC", "Tên NCC", "Giá bìa", "GDNSBT - NS FAHASA Long Bình Tân", "GDNSQN - NS FAHASA Quảng Nam", "GDNSST - NS FAHASA Sông Trà", "GDNSTD - NS Thủ Đức", "GDNSPN - NS FAHASA Phú Nhuận"],
  ["1", "9786042392440", "Mãi Mãi Tuổi Hai Mươi (Độc Quyền - Bìa Cứng)", "CN00015", "Chi nhánh NXB Kim Đồng TP.HCM", "135,000", "3", "1", "2", "5", "4"],
  ["2", "9786045678901", "Đắc Nhân Tâm (Tái Bản 2025)", "CN00018", "Chi nhánh Cty TNHH Văn Hóa Sáng Tạo Trí Việt", "86,000", "5", "3", "2", "8", "6"],
  ["3", "9786045678902", "Nhà Giả Kim", "CN00022", "Cty CP Văn hóa & Truyền thông Nhã Nam", "79,000", "4", "0", "3", "7", "5"],
  ["4", "9786045678903", "Tuổi Trẻ Đáng Giá Bao Nhiêu", "CN00030", "NXB Hội Nhà Văn", "90,000", "2", "2", "0", "4", "3"],
  ["5", "9786045678904", "Cà Phê Cùng Tony", "CN00018", "Chi nhánh Cty TNHH Văn Hóa Sáng Tạo Trí Việt", "72,000", "3", "1", "1", "5", "2"],
  ["6", "9786045678905", "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "CN00018", "Chi nhánh Cty TNHH Văn Hóa Sáng Tạo Trí Việt", "85,000", "2", "1", "2", "3", "4"],
  ["7", "9786045678906", "Cho Tôi Xin Một Vé Đi Tuổi Thơ", "CN00018", "Chi nhánh Cty TNHH Văn Hóa Sáng Tạo Trí Việt", "65,000", "1", "0", "1", "2", "3"],
  ["8", "9786045678907", "Sapiens: Lược Sử Loài Người", "CN00040", "NXB Thế Giới", "189,000", "1", "1", "0", "2", "1"],
  ["9", "9786045678908", "Atomic Habits - Thay Đổi Tí Hon Hiệu Quả Bất Ngờ", "CN00040", "NXB Thế Giới", "149,000", "2", "0", "1", "3", "2"],
  ["10", "9786045678909", "Dám Bị Ghét", "CN00035", "NXB Lao Động", "115,000", "1", "1", "0", "2", "1"],
];

// ============================================================================
// XUẤT TẤT CẢ CÁC TỆP
// ============================================================================
const file1 = path.join(outDir, "danh-muc-san-pham-chuan.xlsx");
const file2 = path.join(outDir, "don-hang-online-shopee.xlsx");
const file3 = path.join(outDir, "don-hang-pos-cua-hang.xlsx");
const file4 = path.join(outDir, "don-hang-tiktok-shop.xlsx");
const file5 = path.join(outDir, "bao-cao-phan-phoi-fahasa.xlsx");

XLSX.writeFile(createWorkbook(catalogData, "Master Catalog"), file1);
XLSX.writeFile(createWorkbook(shopeeData, "Đơn Shopee"), file2);
XLSX.writeFile(createWorkbook(posData, "Đơn POS Tại Quầy"), file3);
XLSX.writeFile(createWorkbook(tiktokData, "Đơn TikTok Shop"), file4);
XLSX.writeFile(createWorkbook(fahasaData, "FAHASA Xuất Bán Đa Chi Nhánh"), file5);

console.log("✅ Đã sinh thành công 5 tệp dữ liệu mẫu thực nghiệm:");
console.log("  📘", file1, "(Master Catalog chuẩn — 25 sản phẩm Ground Truth)");
console.log("  🛒", file2, "(Đơn hàng Shopee — 31 dòng, 8 loại lỗi cài cắm)");
console.log("  🏬", file3, "(Đơn hàng POS tại quầy — 29 dòng, 6 loại lỗi cài cắm)");
console.log("  🎵", file4, "(Đơn hàng TikTok Shop — 19 dòng, 5 loại lỗi cài cắm)");
console.log("  📊", file5, "(Báo cáo FAHASA đa chi nhánh — 10 SP × 5 chi nhánh = ~40 giao dịch sau unpivot)");
console.log("");
console.log("📌 Tổng cộng: ~120 giao dịch từ 4 kênh bán + 25 SP trong Catalog");
console.log("📌 Các loại lỗi đã cài cắm:");
console.log("   - Tên không dấu / viết tắt / có thêm phụ đề (Fuzzy Tier 3)");
console.log("   - Thiếu mã vạch / Barcode (buộc dùng Fuzzy Matching)");
console.log("   - Số lượng là chữ ('hai' thay vì 2)");
console.log("   - Giá lệch >30% so với Catalog (Price Anomaly)");
console.log("   - Giá = 0 (Null vs Zero)");
console.log("   - Giá có dấu chấm phân cách (150.000)");
console.log("   - Ngày sai format (dd/mm/yyyy, dd-mm-yyyy, ISO T)");
console.log("   - Trùng mã đơn hàng (Duplicate Order ID)");
console.log("   - Đơn hủy / Trả hàng có doanh thu (Stale Data)");
console.log("   - Kênh bán viết lộn xộn (shopee vn, Shopee VN, Tại quầy)");
console.log("   - Trạng thái tiếng Anh lẫn tiếng Việt (completed, Delivered, giao thanh cong)");
console.log("   - Sản phẩm không có trong Catalog (UNRESOLVED)");
