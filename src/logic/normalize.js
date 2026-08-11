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
