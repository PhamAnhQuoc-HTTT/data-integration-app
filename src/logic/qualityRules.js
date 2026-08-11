/**
 * Data Quality Rules — phát hiện lỗi và PHÂN LOẠI theo 3 mức xử lý an toàn:
 *
 *   AUTO_FIXED         : lỗi có quy tắc chắc chắn 100%, không cần suy luận (áp dụng ở bước normalize)
 *   NEEDS_CONFIRMATION : có đề xuất sửa nhưng cần người dùng xác nhận (fuzzy match, nghi trùng lặp)
 *   FLAGGED_ONLY        : chỉ gắn cờ, không đề xuất — cần phán đoán nghiệp vụ (giá bất thường, thiếu dữ liệu)
 *
 * ⚠️ Nguyên tắc bắt buộc: hệ thống KHÔNG tự động sửa/xóa dữ liệu có tính suy luận — chỉ hỗ trợ
 * phát hiện + đề xuất, quyết định cuối luôn thuộc về người dùng.
 */
import { normalizeNumber, isValidDate } from "./normalize";

const PRICE_DEVIATION_THRESHOLD = 0.3; // lệch > 30% so với giá chuẩn -> gắn cờ

export function checkMissing(rows) {
  const issues = [];
  rows.forEach((row, i) => {
    const missing = [];
    if (!row.so_luong) missing.push("số lượng");
    if (!row.gia) missing.push("giá bán");
    if (!row.ten_sp && !row.ma_dinh_danh) missing.push("tên/mã sản phẩm");
    if (missing.length) {
      issues.push({ rowIndex: i, group: "missing", severity: "FLAGGED_ONLY", detail: `Thiếu: ${missing.join(", ")}` });
    }
  });
  return issues;
}

export function checkMalformed(rows) {
  const issues = [];
  rows.forEach((row, i) => {
    const qty = normalizeNumber(row.so_luong);
    const price = normalizeNumber(row.gia);
    if (row.so_luong && (qty === null || qty <= 0)) {
      issues.push({ rowIndex: i, group: "malformed", severity: "FLAGGED_ONLY", detail: `Số lượng không hợp lệ: "${row.so_luong}"` });
    }
    if (row.gia && (price === null || price <= 0)) {
      issues.push({ rowIndex: i, group: "malformed", severity: "FLAGGED_ONLY", detail: `Giá bán không hợp lệ: "${row.gia}"` });
    }
    if (row.ngay && !isValidDate(row.ngay)) {
      issues.push({ rowIndex: i, group: "malformed", severity: "FLAGGED_ONLY", detail: `Sai định dạng ngày: "${row.ngay}"` });
    }
  });
  return issues;
}

/** Trùng mã đơn hàng trong cùng 1 nguồn -> NEEDS_CONFIRMATION (không tự xóa, có thể là 2 dòng hợp lệ trùng ngẫu nhiên). */
export function checkDuplicates(rows) {
  const issues = [];
  const seen = new Map(); // key: nguồn|mã đơn -> rowIndex đầu tiên gặp
  rows.forEach((row, i) => {
    if (!row.ma_don) return;
    const key = `${row.__source || ""}|${row.ma_don}`;
    if (seen.has(key)) {
      issues.push({ rowIndex: i, group: "duplicate", severity: "NEEDS_CONFIRMATION", detail: `Trùng mã đơn "${row.ma_don}" với dòng #${seen.get(key)}` });
    } else {
      seen.set(key, i);
    }
  });
  return issues;
}

/** Giá lệch nhiều so với giá chuẩn trong danh mục -> FLAGGED_ONLY (có thể là khuyến mãi thật, không tự đoán). */
export function checkPriceAnomaly(rows) {
  const issues = [];
  rows.forEach((row, i) => {
    if (!row.matched) return;
    const listPrice = normalizeNumber(row.matched.gia_chuan);
    const price = normalizeNumber(row.gia);
    if (listPrice && price !== null) {
      const diff = (price - listPrice) / listPrice;
      if (Math.abs(diff) > PRICE_DEVIATION_THRESHOLD) {
        issues.push({
          rowIndex: i, group: "inconsistent", severity: "FLAGGED_ONLY",
          detail: `Giá lệch ${(diff * 100).toFixed(0)}% so với giá chuẩn (${listPrice.toLocaleString("vi-VN")}đ)`,
        });
      }
    }
  });
  return issues;
}

/** Chuyển kết quả entity resolution thành issue — đây là chỗ khác biệt quan trọng nhất so với bản gốc. */
export function checkMatchStatus(rows) {
  const issues = [];
  rows.forEach((row, i) => {
    if (row.matchStatus === "NEEDS_CONFIRMATION") {
      issues.push({
        rowIndex: i, group: "inconsistent", severity: "NEEDS_CONFIRMATION",
        detail: `Khớp mờ với "${row.matched?.ten_sp}" (điểm ${row.matchScore}/100) — cần xác nhận`,
      });
    } else if (row.matchStatus === "UNRESOLVED") {
      issues.push({ rowIndex: i, group: "inconsistent", severity: "FLAGGED_ONLY", detail: "Không tìm thấy sản phẩm khớp trong danh mục chuẩn" });
    }
  });
  return issues;
}

export function runAllChecks(rows) {
  return [
    ...checkMissing(rows),
    ...checkMalformed(rows),
    ...checkDuplicates(rows),
    ...checkPriceAnomaly(rows),
    ...checkMatchStatus(rows),
  ];
}

export function summarizeIssues(issues) {
  const counts = new Map();
  issues.forEach(({ group, severity }) => {
    const key = `${group}|${severity}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([key, count]) => {
      const [group, severity] = key.split("|");
      return { group, severity, count };
    })
    .sort((a, b) => b.count - a.count);
}

export const SEVERITY_LABELS = {
  AUTO_FIXED: "Đã tự sửa",
  NEEDS_CONFIRMATION: "Cần xác nhận",
  FLAGGED_ONLY: "Chỉ gắn cờ",
};
