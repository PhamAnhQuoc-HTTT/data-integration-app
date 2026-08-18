/**
 * Chuẩn hóa giá trị: văn bản, số, ngày tháng, mã định danh.
 * Dùng chung cho mọi ngành hàng — không gắn cứng theo 1 loại sản phẩm cụ thể.
 */

export function removeDiacritics(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** Trim + gộp khoảng trắng thừa, GIỮ NGUYÊN dấu tiếng Việt (dùng để hiển thị). */
export function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().replace(/\s+/g, " ");
  return text === "" ? null : text;
}

/** Chuẩn hóa mạnh cho việc SO KHỚP: bỏ dấu, hạ chữ thường, bỏ chú thích trong ngoặc. */
export function normalizeTextForMatching(value) {
  if (value === null || value === undefined) return "";
  let text = String(value).trim().toLowerCase();
  text = text.replace(/\(.*?\)/g, " "); // bỏ chú thích "(bản đẹp)"...
  text = removeDiacritics(text).toLowerCase();
  text = text.replace(/[^a-z0-9\s]/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/** Chuẩn hóa mã định danh: bỏ khoảng trắng/gạch nối, viết hoa toàn bộ. */
export function normalizeIdCode(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/[\s-]/g, "").toUpperCase();
  return text === "" ? null : text;
}

/**
 * Chuẩn hóa số: loại bỏ ký hiệu tiền tệ, xử lý dấu phân cách hàng nghìn/thập phân.
 * Trả về Number hoặc null nếu không parse được.
 */
export function normalizeNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return isNaN(value) ? null : value;
  let text = String(value).trim();
  if (text === "") return null;
  text = text.replace(/[^\d.,-]/g, "");
  if (text === "") return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    const decimals = text.length - lastComma - 1;
    text = decimals === 3 ? text.replace(/,/g, "") : text.replace(",", ".");
  } else if (lastDot !== -1) {
    const decimals = text.length - lastDot - 1;
    if (decimals === 3) text = text.replace(/\./g, "");
  }
  const n = parseFloat(text);
  return isNaN(n) ? null : n;
}

const DATE_PATTERNS = [
  { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: ["d", "m", "y"] }, // dd/mm/yyyy
  { re: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, order: ["y", "m", "d"] }, // yyyy-mm-dd
  { re: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, order: ["d", "m", "y"] }, // dd-mm-yyyy
];

/** Thử các định dạng ngày phổ biến ở VN, trả về chuẩn ISO (yyyy-mm-dd) hoặc null. */
export function normalizeDate(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === "") return null;

  for (const { re, order } of DATE_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const parts = {};
      order.forEach((key, i) => { parts[key] = parseInt(m[i + 1], 10); });
      const { y, m: mo, d } = parts;
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
      return null;
    }
  }
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

export function isValidDate(value) {
  return normalizeDate(value) !== null;
}

// ----------------------------------------------------------------------
// CÁC HÀM BỔ SUNG
// ----------------------------------------------------------------------

/** 
 * Chuẩn hóa mã đơn hàng: Trim, xóa các ký tự ẩn/không in được, chuẩn hóa khoảng trắng.
 * Trả về chuỗi đã dọn dẹp hoặc null.
 */
export function normalizeOrderId(value) {
  if (value === null || value === undefined) return null;
  let text = String(value).replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, "").trim().replace(/\s+/g, " ");
  return text === "" ? null : text;
}

/**
 * Kiểm tra mã ISBN-13 (thuật toán checksum modulo 10).
 * Input đã được chuẩn hóa (chỉ gồm 13 chữ số).
 * @param {string} code - Mã cần kiểm tra
 * @returns {{valid: boolean, cleaned: string}} Kết quả kiểm tra và mã đã chuẩn hóa
 */
export function validateISBN13(code) {
  if (!code || typeof code !== "string" || code.length !== 13 || !/^\d{13}$/.test(code)) {
    return { valid: false, cleaned: code || "" };
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return {
    valid: checkDigit === parseInt(code[12], 10),
    cleaned: code
  };
}

/**
 * Kiểm tra mã EAN-13 (Cùng thuật toán checksum với ISBN-13).
 * @param {string} code - Mã cần kiểm tra
 * @returns {{valid: boolean, cleaned: string}} Kết quả kiểm tra và mã đã chuẩn hóa
 */
export function validateEAN13(code) {
  return validateISBN13(code);
}

/**
 * Chuẩn hóa kênh bán hàng: Ánh xạ các biến thể về dạng chuẩn.
 * @param {string|null|undefined} value - Giá trị cần chuẩn hóa
 * @returns {string|null} Tên kênh đã chuẩn hóa
 */
export function normalizeChannel(value) {
  if (value === null || value === undefined) return null;
  const original = String(value).trim();
  if (original === "") return null;
  
  const matchStr = removeDiacritics(original).toLowerCase().replace(/\s+/g, " ").trim();
  
  const map = {
    'shopee': 'Shopee',
    'shopee vn': 'Shopee',
    'shopee.vn': 'Shopee',
    'lazada': 'Lazada',
    'lazada vn': 'Lazada',
    'lazada.vn': 'Lazada',
    'tiktok': 'TikTok Shop',
    'tiktok shop': 'TikTok Shop',
    'tik tok': 'TikTok Shop',
    'tiktok.com': 'TikTok Shop',
    'pos': 'POS',
    'tai quay': 'POS',
    'cua hang': 'POS',
    'offline': 'POS',
    'tai cua hang': 'POS'
  };
  
  return map[matchStr] || original;
}

/**
 * Chuẩn hóa trạng thái đơn hàng: Ánh xạ các biến thể về dạng chuẩn.
 * @param {string|null|undefined} value - Giá trị cần chuẩn hóa
 * @returns {string|null} Trạng thái đã chuẩn hóa
 */
export function normalizeOrderStatus(value) {
  if (value === null || value === undefined) return null;
  const original = String(value).trim();
  if (original === "") return null;
  
  const matchStr = removeDiacritics(original).toLowerCase().replace(/\s+/g, " ").trim();
  
  const map = {
    'da giao': 'Hoàn thành',
    'hoan thanh': 'Hoàn thành',
    'completed': 'Hoàn thành',
    'giao thanh cong': 'Hoàn thành',
    'thanh cong': 'Hoàn thành',
    'delivered': 'Hoàn thành',
    'da huy': 'Đã hủy',
    'cancelled': 'Đã hủy',
    'canceled': 'Đã hủy',
    'huy': 'Đã hủy',
    'huy don': 'Đã hủy',
    'dang xu ly': 'Đang xử lý',
    'processing': 'Đang xử lý',
    'cho xac nhan': 'Đang xử lý',
    'pending': 'Đang xử lý',
    'dang giao': 'Đang xử lý',
    'shipping': 'Đang xử lý',
    'tra hang': 'Trả hàng',
    'returned': 'Trả hàng',
    'hoan tra': 'Trả hàng',
    'refund': 'Trả hàng'
  };
  
  return map[matchStr] || original;
}

/**
 * Chuẩn hóa thương hiệu/nhà xuất bản: Gộp khoảng trắng, áp dụng alias.
 * @param {string|null|undefined} value - Giá trị cần chuẩn hóa
 * @returns {string|null} Thương hiệu đã chuẩn hóa
 */
export function normalizeBrand(value) {
  const normValue = normalizeText(value);
  if (!normValue) return null;
  
  const matchStr = removeDiacritics(normValue).toLowerCase().replace(/\s+/g, " ").trim();
  
  // 1. Sách & NXB
  if (matchStr.includes("kim dong")) return "NXB Kim Đồng";
  if (matchStr.includes("nha xuat ban tre") || matchStr.includes("nxb tre") || matchStr === "tre") return "NXB Trẻ";
  if (matchStr.includes("nha nam")) return "NXB Nhã Nam";
  if (matchStr.includes("hoi nha van")) return "NXB Hội Nhà Văn";
  if (matchStr.includes("the gioi")) return "NXB Thế Giới";
  if (matchStr.includes("tong hop")) return "NXB Tổng Hợp TP.HCM";
  if (matchStr.includes("giao duc")) return "NXB Giáo Dục";
  if (matchStr.includes("van hoc")) return "NXB Văn Học";
  
  // 2. Thời trang & May mặc
  if (matchStr.includes("coolmate") || matchStr.includes("cool mate")) return "Coolmate";
  if (matchStr.includes("canifa")) return "Canifa";
  if (matchStr.includes("uniqlo")) return "Uniqlo";
  if (matchStr.includes("zara")) return "Zara";
  if (matchStr.includes("bitis") || matchStr.includes("biti's")) return "Biti's";
  if (matchStr.includes("nike")) return "Nike";
  if (matchStr.includes("adidas")) return "Adidas";

  // 3. Điện máy & Gia dụng
  if (matchStr.includes("sunhouse")) return "Sunhouse";
  if (matchStr.includes("philips")) return "Philips";
  if (matchStr.includes("lock&lock") || matchStr.includes("lock and lock") || matchStr.includes("locknlock")) return "Lock&Lock";
  if (matchStr.includes("xiaomi")) return "Xiaomi";
  if (matchStr.includes("panasonic")) return "Panasonic";
  if (matchStr.includes("samsung")) return "Samsung";

  // 4. Mỹ phẩm & Làm đẹp
  if (matchStr.includes("cocoon")) return "Cocoon";
  if (matchStr.includes("la roche") || matchStr.includes("laroche")) return "La Roche-Posay";
  if (matchStr.includes("cerave")) return "CeraVe";
  if (matchStr.includes("loreal") || matchStr.includes("l'oreal")) return "L'Oréal";
  if (matchStr.includes("innisfree")) return "Innisfree";
  if (matchStr.includes("simple")) return "Simple";
  
  return normValue;
}
