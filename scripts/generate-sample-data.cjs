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

/** Tính mã EAN-13 / ISBN-13 có checksum chuẩn Modulo 10 */
function makeValid13(prefix12) {
  const s = String(prefix12).slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(s[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return s + checkDigit;
}

// Bảng mã chuẩn định sẵn (100% đúng chuẩn ISBN-13 & EAN-13)
const CODES = {
  // Sách (Bắt đầu bằng 978)
  MAI_MAI_TUOI_20: makeValid13("978604239244"),
  DAC_NHAN_TAM: makeValid13("978604567890"),
  NHA_GIA_KIM: makeValid13("978604567891"),
  TUOI_TRE_DANG_GIA: makeValid13("978604567892"),
  CA_PHE_TONY: makeValid13("978604567893"),
  HOA_VANG_CO_XANH: makeValid13("978604567894"),
  CHO_XIN_VE_TUOI_THO: makeValid13("978604567895"),
  SAPIENS: makeValid13("978604567896"),
  ATOMIC_HABITS: makeValid13("978604567897"),
  DAM_BI_GHET: makeValid13("978604567898"),
  // Thời trang (Bắt đầu bằng 893 - Việt Nam)
  AO_THUN_COOLMATE: makeValid13("893500123456"),
  QUAN_JEAN_CANIFA: makeValid13("893500123457"),
  GIAY_BITIS: makeValid13("893500123458"),
  AO_KHOAC_UNIQLO: makeValid13("893500123459"),
  BALO_TOMTOC: makeValid13("893500123460"),
  KINH_RAYBAN: makeValid13("893500123461"),
  DEP_ADIDAS: makeValid13("893500123462"),
  NON_MLB: makeValid13("893500123463"),
  // Gia dụng & Mỹ phẩm
  NOI_CHIEN_PHILIPS: makeValid13("871010385678"),
  AM_SIEU_TOC_SUNHOUSE: makeValid13("893500123464"),
  TAI_NGHE_XIAOMI: makeValid13("693417778567"),
  MAY_XAY_LOCKNEX: makeValid13("893500123465"),
  KEM_CN_LAROCHE: makeValid13("333787559107"),
  NUOC_TT_COCOON: makeValid13("893617320012"),
  SUA_RM_CERAVE: makeValid13("333787559735"),
};

// ============================================================================
// 1. MASTER CATALOG — 25 sản phẩm chuẩn (Ground Truth)
// ============================================================================
const catalogData = [
  ["Mã sản phẩm / Barcode", "Tên sản phẩm chuẩn", "Thương hiệu / NCC", "Thể loại", "Giá niêm yết"],
  // --- Sách & Văn hóa phẩm ---
  [CODES.MAI_MAI_TUOI_20, "Mãi Mãi Tuổi Hai Mươi (Độc Quyền - Bìa Cứng)", "NXB Kim Đồng", "Văn học Việt Nam", "135000"],
  [CODES.DAC_NHAN_TAM, "Đắc Nhân Tâm (Tái Bản 2025)", "NXB Trẻ", "Kỹ năng sống", "86000"],
  [CODES.NHA_GIA_KIM, "Nhà Giả Kim", "NXB Nhã Nam", "Tiểu thuyết", "79000"],
  [CODES.TUOI_TRE_DANG_GIA, "Tuổi Trẻ Đáng Giá Bao Nhiêu", "NXB Hội Nhà Văn", "Kỹ năng sống", "90000"],
  [CODES.CA_PHE_TONY, "Cà Phê Cùng Tony", "NXB Trẻ", "Tản văn", "72000"],
  [CODES.HOA_VANG_CO_XANH, "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "NXB Trẻ", "Văn học Việt Nam", "85000"],
  [CODES.CHO_XIN_VE_TUOI_THO, "Cho Tôi Xin Một Vé Đi Tuổi Thơ", "NXB Trẻ", "Văn học Việt Nam", "65000"],
  [CODES.SAPIENS, "Sapiens: Lược Sử Loài Người", "NXB Thế Giới", "Khoa học", "189000"],
  [CODES.ATOMIC_HABITS, "Atomic Habits - Thay Đổi Tí Hon Hiệu Quả Bất Ngờ", "NXB Thế Giới", "Kỹ năng sống", "149000"],
  [CODES.DAM_BI_GHET, "Dám Bị Ghét", "NXB Lao Động", "Tâm lý học", "115000"],
  // --- Thời trang & Phụ kiện ---
  [CODES.AO_THUN_COOLMATE, "Áo Thun Nam Cotton Compact Cổ Tròn", "Coolmate", "Áo nam", "199000"],
  [CODES.QUAN_JEAN_CANIFA, "Quần Jean Nam Slimfit Co Giãn", "Canifa", "Quần nam", "449000"],
  [CODES.GIAY_BITIS, "Giày Thể Thao Biti's Hunter Street", "Biti's", "Giày dép", "899000"],
  [CODES.AO_KHOAC_UNIQLO, "Áo Khoác Gió Nam Chống Thấm Nước", "Uniqlo", "Áo khoác", "699000"],
  [CODES.BALO_TOMTOC, "Balo Laptop Chống Sốc 15.6 inch", "Tomtoc", "Phụ kiện", "890000"],
  [CODES.KINH_RAYBAN, "Kính Mát Phân Cực Chống UV400", "Rayban", "Phụ kiện", "2490000"],
  [CODES.DEP_ADIDAS, "Dép Quai Ngang Adidas Adilette", "Adidas", "Giày dép", "750000"],
  [CODES.NON_MLB, "Nón Lưỡi Trai MLB NY Yankees", "MLB", "Phụ kiện", "1290000"],
  // --- Điện tử & Gia dụng ---
  [CODES.NOI_CHIEN_PHILIPS, "Nồi Chiên Không Dầu Philips 4.5L HD9200", "Philips", "Gia dụng", "1490000"],
  [CODES.AM_SIEU_TOC_SUNHOUSE, "Ấm Siêu Tốc Inox Sunhouse 1.8L SHD1351", "Sunhouse", "Gia dụng", "185000"],
  [CODES.TAI_NGHE_XIAOMI, "Tai Nghe Bluetooth Xiaomi Redmi Buds 4", "Xiaomi", "Điện tử", "490000"],
  [CODES.MAY_XAY_LOCKNEX, "Máy Xay Sinh Tố Cầm Tay Lock&Lock", "Lock&Lock", "Gia dụng", "550000"],
  [CODES.KEM_CN_LAROCHE, "Kem Chống Nắng La Roche-Posay Anthelios 50ml", "La Roche-Posay", "Chăm sóc da", "395000"],
  [CODES.NUOC_TT_COCOON, "Nước Tẩy Trang Bí Đao Cocoon 500ml", "Cocoon", "Chăm sóc da", "245000"],
  [CODES.SUA_RM_CERAVE, "Sữa Rửa Mặt Tạo Bọt CeraVe Foaming Cleanser 236ml", "CeraVe", "Chăm sóc da", "320000"],
];

// ============================================================================
// 2. ĐƠN HÀNG SHOPEE — 31 dòng
// ============================================================================
const shopeeData = [
  ["Ma don", "Ngay gio", "San pham", "Ma vach", "SL", "Gia ban", "Kenh", "Trang thai"],
  ["SP-20250701-001", "2025-07-01 10:15:00", "Mai mai tuoi hai muoi", CODES.MAI_MAI_TUOI_20, "2", "135000", "shopee vn", "giao thanh cong"],
  ["SP-20250701-002", "2025-07-01 11:30:00", "Dac Nhan Tam", CODES.DAC_NHAN_TAM, "1", "86000", "shopee", "completed"],
  ["SP-20250701-003", "2025-07-01 14:20:00", "Nha Gia Kim (Ban tieng Viet)", CODES.NHA_GIA_KIM, "1", "79000", "Shopee", "Hoàn thành"],
  ["SP-20250702-001", "2025-07-02 08:45:00", "Tuoi Tre Dang Gia Bao Nhieu", CODES.TUOI_TRE_DANG_GIA, "3", "90000", "Shopee", "Hoàn thành"],
  ["SP-20250702-002", "2025-07-02 10:10:00", "Ca Phe Cung Tony (Bia Mem)", CODES.CA_PHE_TONY, "1", "72000", "Shopee", "Hoàn thành"],
  ["SP-20250702-003", "2025-07-02 13:25:00", "Toi Thay Hoa Vang Tren Co Xanh", "", "1", "85000", "Shopee", "Hoàn thành"],
  ["SP-20250703-001", "2025-07-03 09:00:00", "Cho Toi Xin Mot Ve Di Tuoi Tho", "", "2", "65000", "Shopee", "Hoàn thành"],
  ["SP-20250703-002", "2025-07-03 11:30:00", "Sapiens - Luoc Su Loai Nguoi", CODES.SAPIENS, "1", "189000", "Shopee", "Hoàn thành"],
  ["SP-20250703-003", "2025-07-03 15:45:00", "Atomic Habits", CODES.ATOMIC_HABITS, "1", "149000", "Shopee", "Hoàn thành"],
  ["SP-20250704-001", "2025-07-04 10:20:00", "Dam Bi Ghet", CODES.DAM_BI_GHET, "1", "115000", "Shopee", "Hoàn thành"],
  ["SP-20250704-002", "2025-07-04 14:45:00", "Áo Thun Nam Cotton Coolmate (Trắng - Size L)", CODES.AO_THUN_COOLMATE, "2", "199000", "Shopee", "Hoàn thành"],
  ["SP-20250705-001", "2025-07-05 09:30:00", "Quần Jean Nam Slimfit Canifa (Xanh Đậm - 31)", CODES.QUAN_JEAN_CANIFA, "1", "449000", "Shopee", "Hoàn thành"],
  ["SP-20250705-002", "2025-07-05 11:00:00", "Giày Biti's Hunter Street - Đen 42", "", "hai", "899000", "Shopee", "Hoàn thành"],
  ["SP-20250705-003", "2025-07-05 16:20:00", "Áo Khoác Gió Uniqlo Chống Thấm", CODES.AO_KHOAC_UNIQLO, "1", "550000", "Shopee", "Hoàn thành"],
  ["SP-20250706-001", "2025-07-06 08:10:00", "Balo Laptop Tomtoc 15.6 inch Chống Sốc", CODES.BALO_TOMTOC, "1", "890000", "Shopee", "Hoàn thành"],
  ["SP-20250706-002", "2025-07-06 10:45:00", "Kinh Mat Phan Cuc Chong UV400 Rayban", "", "1", "2490000", "Shopee", "Hoàn thành"],
  ["SP-20250706-003", "2025-07-06 14:30:00", "Dép Quai Ngang Adidas", CODES.DEP_ADIDAS, "1", "750000", "Shopee", "Hoàn thành"],
  ["SP-20250707-001", "2025-07-07 09:15:00", "Non MLB NY Yankees", CODES.NON_MLB, "1", "1290000", "Shopee VN", "Hoàn thành"],
  ["SP-20250707-002", "2025-07-07 11:00:00", "Nồi Chiên Không Dầu Philips 4.5L", CODES.NOI_CHIEN_PHILIPS, "1", "1490000", "Shopee", "Hoàn thành"],
  ["SP-20250707-003", "2025-07-07 14:30:00", "Ấm Siêu Tốc Inox Sunhouse 1.8L", CODES.AM_SIEU_TOC_SUNHOUSE, "2", "125000", "Shopee", "Hoàn thành"],
  ["SP-20250708-001", "2025-07-08 09:00:00", "Tai Nghe Bluetooth Xiaomi Redmi Buds 4", CODES.TAI_NGHE_XIAOMI, "1", "490000", "Shopee", "Hoàn thành"],
  ["SP-20250708-002", "2025-07-08 10:30:00", "Máy Xay Sinh Tố Lock&Lock Cầm Tay", CODES.MAY_XAY_LOCKNEX, "1", "550000", "Shopee", "Hoàn thành"],
  ["SP-20250708-003", "2025-07-08 15:00:00", "Kem Chống Nắng La Roche-Posay Anthelios", CODES.KEM_CN_LAROCHE, "1", "395000", "Shopee", "Hoàn thành"],
  ["SP-20250709-001", "2025-07-09 08:40:00", "Nước Tẩy Trang Bí Đao Cocoon", CODES.NUOC_TT_COCOON, "2", "245000", "Shopee", "Hoàn thành"],
  ["SP-20250709-002", "2025-07-09 12:15:00", "Sữa Rửa Mặt CeraVe Foaming Cleanser 236ml", CODES.SUA_RM_CERAVE, "1", "320000", "Shopee", "Hoàn thành"],
  ["SP-20250709-003", "2025-07-09 17:30:00", "Đắc Nhân Tâm", CODES.DAC_NHAN_TAM, "1", "86000", "Shopee", "Đã hủy"],
  ["SP-20250710-001", "2025-07-10 09:00:00", "Nhà Giả Kim", CODES.NHA_GIA_KIM, "2", "79000", "Shopee", "Trả hàng/Hoàn tiền"],
  ["SP-20250710-002", "2025-07-10 11:30:00", "Bình Giữ Nhiệt Inox 500ml Lock&Lock", "8935001299990", "1", "350000", "Shopee", "Hoàn thành"],
  ["SP-20250710-003", "2025-07-10 14:00:00", "Túi Tote Vải Canvas In Hình", "", "1", "89000", "Shopee", "Hoàn thành"],
  ["SP-20250701-001", "2025-07-01 10:16:00", "Mai mai tuoi hai muoi", CODES.MAI_MAI_TUOI_20, "2", "135000", "Shopee", "giao thanh cong"],
];

// ============================================================================
// 3. ĐƠN HÀNG POS TẠI QUẦY — 29 dòng
// ============================================================================
const posData = [
  ["Mã đơn hàng", "Ngày bán", "Tên sản phẩm", "Mã vạch / SKU", "Số lượng", "Đơn giá", "Thương hiệu", "Trạng thái", "Kênh"],
  ["POS-2025-001", "2025-07-01 10:15:00", "Mãi Mãi Tuổi Hai Mươi (Độc Quyền - Bìa Cứng)", CODES.MAI_MAI_TUOI_20, "1", "135000", "NXB Kim Đồng", "Hoàn thành", "POS"],
  ["POS-2025-002", "2025-07-01 11:30:00", "Đắc Nhân Tâm (Tái Bản 2025)", CODES.DAC_NHAN_TAM, "2", "86000", "NXB Trẻ", "Hoàn thành", "Tại quầy"],
  ["POS-2025-003", "2025-07-02 09:20:00", "Nhà Giả Kim", CODES.NHA_GIA_KIM, "1", "79000", "NXB Nhã Nam", "Hoàn thành", "POS"],
  ["POS-2025-004", "02/07/2025 14:00:00", "Tuổi Trẻ Đáng Giá Bao Nhiêu", CODES.TUOI_TRE_DANG_GIA, "1", "90000", "NXB Hội Nhà Văn", "Hoàn thành", "POS"],
  ["POS-2025-005", "2025-07-03 08:45:00", "Cà Phê Cùng Tony", CODES.CA_PHE_TONY, "2", "72000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-006", "2025-07-03 10:30:00", "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", CODES.HOA_VANG_CO_XANH, "1", "85000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-007", "2025-07-04 09:00:00", "Cho Tôi Xin Một Vé Đi Tuổi Thơ", CODES.CHO_XIN_VE_TUOI_THO, "3", "65000", "NXB Trẻ", "Hoàn thành", "POS"],
  ["POS-2025-008", "2025-07-04 11:15:00", "Sapiens: Lược Sử Loài Người", CODES.SAPIENS, "1", "189000", "NXB Thế Giới", "Hoàn thành", "POS"],
  ["POS-2025-009", "15-07-2025 08:30:00", "Atomic Habits - Thay Đổi Tí Hon Hiệu Quả Bất Ngờ", CODES.ATOMIC_HABITS, "1", "149000", "NXB Thế Giới", "Hoàn thành", "POS"],
  ["POS-2025-010", "2025-07-05 14:20:00", "Dám Bị Ghét", CODES.DAM_BI_GHET, "1", "115000", "NXB Lao Động", "Hoàn thành", "POS"],
  ["POS-2025-011", "2025-07-06 09:00:00", "Áo Thun Nam Cotton Compact Cổ Tròn", CODES.AO_THUN_COOLMATE, "3", "199000", "Coolmate", "Hoàn thành", "POS"],
  ["POS-2025-012", "2025-07-06 10:30:00", "Quần Jean Nam Slimfit Co Giãn", CODES.QUAN_JEAN_CANIFA, "1", "449000", "Canifa", "Hoàn thành", "POS"],
  ["POS-2025-012", "2025-07-06 10:35:00", "Quần Jean Nam Slimfit Co Giãn", CODES.QUAN_JEAN_CANIFA, "1", "449000", "Canifa", "Hoàn thành", "POS"],
  ["POS-2025-013", "2025-07-07 08:45:00", "Giày Thể Thao Biti's Hunter Street", CODES.GIAY_BITIS, "1", "899000", "Biti's", "Hoàn thành", "POS"],
  ["POS-2025-014", "2025-07-07 11:00:00", "Áo Khoác Gió Nam Chống Thấm Nước", CODES.AO_KHOAC_UNIQLO, "1", "699000", "Uniqlo", "Hoàn thành", "POS"],
  ["POS-2025-015", "2025-07-08 09:30:00", "Balo Laptop Chống Sốc 15.6 inch", CODES.BALO_TOMTOC, "1", "890000", "Tomtoc", "Hoàn thành", "POS"],
  ["POS-2025-016", "2025-07-08 14:00:00", "Kính Mát Phân Cực Chống UV400", CODES.KINH_RAYBAN, "1", "2490000", "Rayban", "Hoàn thành", "POS"],
  ["POS-2025-017", "2025-07-09 08:15:00", "Dép Quai Ngang Adidas Adilette", CODES.DEP_ADIDAS, "2", "750000", "Adidas", "Hoàn thành", "POS"],
  ["POS-2025-018", "2025-07-09 10:45:00", "Nón Lưỡi Trai MLB NY Yankees", CODES.NON_MLB, "1", "1290000", "MLB", "Hoàn thành", "POS"],
  ["POS-2025-019", "2025-07-10 09:00:00", "Nồi Chiên Không Dầu Philips 4.5L HD9200", CODES.NOI_CHIEN_PHILIPS, "1", "1490000", "Philips", "Hoàn thành", "POS"],
  ["POS-2025-020", "2025-07-10 11:30:00", "Ấm Siêu Tốc Inox Sunhouse 1.8L SHD1351", CODES.AM_SIEU_TOC_SUNHOUSE, "1", "0", "Sunhouse", "Hoàn thành", "POS"],
  ["POS-2025-021", "2025-07-11 08:20:00", "Tai Nghe Bluetooth Xiaomi Redmi Buds 4", CODES.TAI_NGHE_XIAOMI, "2", "490000", "Xiaomi", "Hoàn thành", "POS"],
  ["POS-2025-022", "2025-07-11 10:00:00", "Máy Xay Sinh Tố Cầm Tay Lock&Lock", CODES.MAY_XAY_LOCKNEX, "1", "550000", "Lock&Lock", "Hoàn thành", "POS"],
  ["POS-2025-023", "2025-07-12 09:15:00", "Kem Chống Nắng La Roche-Posay Anthelios 50ml", CODES.KEM_CN_LAROCHE, "2", "395000", "La Roche-Posay", "Hoàn thành", "POS"],
  ["POS-2025-024", "2025-07-12 14:30:00", "Nước Tẩy Trang Bí Đao Cocoon 500ml", CODES.NUOC_TT_COCOON, "1", "245000", "Cocoon", "Hoàn thành", "POS"],
  ["POS-2025-025", "2025-07-13 08:45:00", "Sữa Rửa Mặt Tạo Bọt CeraVe Foaming Cleanser 236ml", CODES.SUA_RM_CERAVE, "1", "320000", "CeraVe", "Đã hủy", "POS"],
  ["POS-2025-026", "2025-07-13 11:00:00", "Bút Bi Thiên Long TL-027", "8935001888005", "10", "5000", "Thiên Long", "Hoàn thành", "POS"],
  ["POS-2025-027", "2025-07-13 14:20:00", "Vở Kẻ Ngang Campus 200 Trang", "8935001888012", "5", "18000", "Campus", "Hoàn thành", "POS"],
];

// ============================================================================
// 4. TỆP TIKTOK SHOP — 19 dòng (Header chuẩn API tiếng Anh)
// ============================================================================
const tiktokData = [
  ["order_id", "created_at", "product_name", "sku_id", "quantity", "unit_price", "channel", "status"],
  ["TT-100001", "2025-07-01T09:30:00", "Đắc Nhân Tâm - Tái Bản 2025", CODES.DAC_NHAN_TAM, "1", "86.000", "TikTok Shop", "Delivered"],
  ["TT-100002", "2025-07-01T14:00:00", "Nha Gia Kim", CODES.NHA_GIA_KIM, "2", "79.000", "TikTok Shop", "Delivered"],
  ["TT-100003", "2025-07-02T10:15:00", "Ca Phe Cung Tony", CODES.CA_PHE_TONY, "1", "72.000", "TikTok Shop", "Delivered"],
  ["TT-100004", "2025-07-02T16:30:00", "Sapiens Luoc Su Loai Nguoi", "", "1", "189.000", "TikTok Shop", "Delivered"],
  ["TT-100005", "2025-07-03T08:20:00", "Atomic Habits", CODES.ATOMIC_HABITS, "1", "149.000", "TikTok Shop", "Delivered"],
  ["TT-100006", "2025-07-03T11:45:00", "Dam Bi Ghet - Tam Ly Hoc", "", "1", "115.000", "TikTok Shop", "Delivered"],
  ["TT-100007", "2025-07-04T09:00:00", "Áo Thun Nam Coolmate Cotton", CODES.AO_THUN_COOLMATE, "1", "199.000", "TikTok Shop", "Delivered"],
  ["TT-100008", "2025-07-04T13:30:00", "Quan Jean Slimfit Canifa", CODES.QUAN_JEAN_CANIFA, "1", "449.000", "TikTok Shop", "Delivered"],
  ["TT-100009", "2025-07-05T10:00:00", "Giày Biti's Hunter Street", CODES.GIAY_BITIS, "1", "850.000", "TikTok Shop", "Delivered"],
  ["TT-100010", "2025-07-05T15:15:00", "Balo Tomtoc Laptop 15.6\"", CODES.BALO_TOMTOC, "1", "890.000", "TikTok Shop", "Delivered"],
  ["TT-100011", "2025-07-06T09:45:00", "Noi Chien Khong Dau Philips 4.5L", CODES.NOI_CHIEN_PHILIPS, "1", "1.490.000", "TikTok Shop", "Delivered"],
  ["TT-100012", "2025-07-06T14:00:00", "Tai Nghe Xiaomi Redmi Buds 4", CODES.TAI_NGHE_XIAOMI, "2", "490.000", "TikTok Shop", "Delivered"],
  ["TT-100013", "2025-07-07T08:30:00", "Kem Chong Nang La Roche Posay", CODES.KEM_CN_LAROCHE, "1", "395.000", "TikTok Shop", "Delivered"],
  ["TT-100014", "2025-07-07T11:20:00", "Nuoc Tay Trang Cocoon Bi Dao 500ml", CODES.NUOC_TT_COCOON, "1", "245.000", "TikTok Shop", "Delivered"],
  ["TT-100015", "2025-07-08T09:00:00", "Sua Rua Mat CeraVe 236ml", CODES.SUA_RM_CERAVE, "1", "320.000", "TikTok Shop", "Delivered"],
  ["TT-100016", "2025-07-08T14:30:00", "Áo Khoác Gió Uniqlo", CODES.AO_KHOAC_UNIQLO, "1", "699.000", "TikTok Shop", "Cancelled"],
  ["TT-100017", "2025-07-09T10:00:00", "Dép Adidas Adilette Quai Ngang", CODES.DEP_ADIDAS, "1", "750.000", "TikTok Shop", "Refunded"],
  ["TT-100018", "2025-07-09T15:40:00", "Gối Ôm Hình Mèo Kawaii", "", "1", "120.000", "TikTok Shop", "Delivered"],
  ["TT-100019", "2025-07-10T09:30:00", "Dây Sạc USB-C Anker 1m", "8935001999998", "2", "150.000", "TikTok Shop", "Delivered"],
];

// ============================================================================
// 5. TỆP FAHASA — Báo cáo phân phối đa chi nhánh
// ============================================================================
const fahasaData = [
  ["STT", "Barcode", "Tên sản phẩm", "Mã NCC", "Tên NCC", "Giá bìa", "GDNSBT - NS FAHASA Long Bình Tân", "GDNSQN - NS FAHASA Quảng Nam", "GDNSST - NS FAHASA Sông Trà", "GDNSTD - NS Thủ Đức", "GDNSPN - NS FAHASA Phú Nhuận"],
  ["1", CODES.MAI_MAI_TUOI_20, "Mãi Mãi Tuổi Hai Mươi (Độc Quyền - Bìa Cứng)", "CN00015", "Chi nhánh NXB Kim Đồng TP.HCM", "135,000", "3", "1", "2", "5", "4"],
  ["2", CODES.DAC_NHAN_TAM, "Đắc Nhân Tâm (Tái Bản 2025)", "CN00018", "Chi nhánh Cty TNHH Văn Hóa Sáng Tạo Trí Việt", "86,000", "5", "3", "2", "8", "6"],
  ["3", CODES.NHA_GIA_KIM, "Nhà Giả Kim", "CN00022", "Cty CP Văn hóa & Truyền thông Nhã Nam", "79,000", "4", "0", "3", "7", "5"],
  ["4", CODES.TUOI_TRE_DANG_GIA, "Tuổi Trẻ Đáng Giá Bao Nhiêu", "CN00030", "NXB Hội Nhà Văn", "90,000", "2", "2", "0", "4", "3"],
  ["5", CODES.CA_PHE_TONY, "Cà Phê Cùng Tony", "CN00018", "Chi nhánh Cty TNHH Văn Hóa Sáng Tạo Trí Việt", "72,000", "3", "1", "1", "5", "2"],
  ["6", CODES.HOA_VANG_CO_XANH, "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "CN00018", "Chi nhánh Cty TNHH Văn Hóa Sáng Tạo Trí Việt", "85,000", "2", "1", "2", "3", "4"],
  ["7", CODES.CHO_XIN_VE_TUOI_THO, "Cho Tôi Xin Một Vé Đi Tuổi Thơ", "CN00018", "Chi nhánh Cty TNHH Văn Hóa Sáng Tạo Trí Việt", "65,000", "1", "0", "1", "2", "3"],
  ["8", CODES.SAPIENS, "Sapiens: Lược Sử Loài Người", "CN00040", "NXB Thế Giới", "189,000", "1", "1", "0", "2", "1"],
  ["9", CODES.ATOMIC_HABITS, "Atomic Habits - Thay Đổi Tí Hon Hiệu Quả Bất Ngờ", "CN00040", "NXB Thế Giới", "149,000", "2", "0", "1", "3", "2"],
  ["10", CODES.DAM_BI_GHET, "Dám Bị Ghét", "CN00035", "NXB Lao Động", "115,000", "1", "1", "0", "2", "1"],
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

console.log("✅ Đã sinh thành công 5 tệp dữ liệu mẫu thực nghiệm với Barcode Modulo-10 chuẩn:");
console.log("  📘", file1, "(Master Catalog chuẩn — 25 sản phẩm Ground Truth)");
console.log("  🛒", file2, "(Đơn hàng Shopee — 31 dòng)");
console.log("  🏬", file3, "(Đơn hàng POS tại quầy — 29 dòng)");
console.log("  🎵", file4, "(Đơn hàng TikTok Shop — 19 dòng)");
console.log("  📊", file5, "(Báo cáo FAHASA đa chi nhánh — 10 SP × 5 chi nhánh)");
