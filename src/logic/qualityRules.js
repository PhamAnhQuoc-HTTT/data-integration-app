/**
 * Data Quality Rules — phát hiện lỗi và PHÂN LOẠI theo 3 mức xử lý an toàn:
 *
 *   AUTO_FIXED         : lỗi có quy tắc chắc chắn 100%, không cần suy luận (áp dụng ở bước normalize)
 *   NEEDS_CONFIRMATION : có đề xuất sửa nhưng cần người dùng xác nhận (fuzzy match, nghi trùng lặp)
 *   FLAGGED_ONLY       : chỉ gắn cờ, không đề xuất — cần phán đoán nghiệp vụ (giá bất thường, thiếu dữ liệu)
 *
 * ⚠️ Nguyên tắc bắt buộc: hệ thống KHÔNG tự động sửa/xóa dữ liệu có tính suy luận — chỉ hỗ trợ
 * phát hiện + đề xuất, quyết định cuối luôn thuộc về người dùng.
 */
import { normalizeNumber, isValidDate, normalizeChannel, normalizeOrderStatus } from "./normalize";

const PRICE_DEVIATION_THRESHOLD = 0.3; // lệch > 30% so với giá chuẩn -> gắn cờ

export const GROUP_LABELS = {
  schema: '⚠️ Lỗi Cấu Trúc Dữ Liệu',
  entity: '🏷️ Lỗi Tên Sản Phẩm / Mã Hàng',
  value: '💰 Lỗi Giá Trị / Số Tiền',
  temporal: '📅 Lỗi Ngày Tháng',
  semantic: '🔍 Lỗi Ý Nghĩa Dữ Liệu',
  technical: '🔧 Lỗi Kỹ Thuật',
  missing: '❓ Thiếu Thông Tin',
  malformed: '✏️ Sai Định Dạng',
  duplicate: '🔁 Trùng Lặp',
  inconsistent: '↔️ Không Nhất Quán',
};

export const SEVERITY_LABELS = {
  AUTO_FIXED: "✅ Đã tự sửa",
  NEEDS_CONFIRMATION: "👆 Cần bạn xem",
  FLAGGED_ONLY: "🔔 Đã gắn cờ",
};

// ============================================================================
// Group I — Schema Conflicts (Xung đột cấu trúc)
// ============================================================================

export function checkMissingAttributes(rows) {
  const issues = [];
  const fieldsToCheck = ['ngay', 'kenh', 'thuong_hieu', 'ma_dinh_danh', 'trang_thai'];
  const sourceStats = {};
  
  rows.forEach((row, i) => {
    const source = row.__source || 'unknown';
    if (!sourceStats[source]) {
      sourceStats[source] = { count: 0, missing: { ngay: 0, kenh: 0, thuong_hieu: 0, ma_dinh_danh: 0, trang_thai: 0 }, sampleRowIndex: i };
    }
    sourceStats[source].count++;
    fieldsToCheck.forEach(f => {
      if (!row[f] || (typeof row[f] === 'string' && row[f].trim() === '')) {
        sourceStats[source].missing[f]++;
      }
    });
  });

  Object.keys(sourceStats).forEach(source => {
    const stats = sourceStats[source];
    if (stats.count > 0) {
      fieldsToCheck.forEach(f => {
        if (stats.missing[f] === stats.count) {
           issues.push({ rowIndex: stats.sampleRowIndex, group: "schema", severity: "FLAGGED_ONLY", detail: `Nguồn ${source} không có cột ${f}` });
        }
      });
    }
  });
  return issues;
}

export function checkStructuralConflict(rows) {
  const issues = [];
  const timeRegex = /\d{2}:\d{2}/;
  rows.forEach((row, i) => {
    if (row.ngay && timeRegex.test(String(row.ngay))) {
      issues.push({ rowIndex: i, group: "schema", severity: "AUTO_FIXED", detail: "Đã tách phần giờ khỏi trường ngày" });
    }
  });
  return issues;
}

// ============================================================================
// Group II — Entity Resolution Conflicts (Xung đột định danh thực thể)
// ============================================================================

export function checkMatchStatus(rows) {
  const issues = [];
  rows.forEach((row, i) => {
    if (row.matchStatus === "NEEDS_CONFIRMATION") {
      issues.push({
        rowIndex: i, group: "entity", severity: "NEEDS_CONFIRMATION",
        detail: `Khớp mờ với "${row.matched?.ten_sp}" (điểm ${row.matchScore}/100) — cần xác nhận`,
      });
    } else if (row.matchStatus === "UNRESOLVED") {
      issues.push({ rowIndex: i, group: "entity", severity: "FLAGGED_ONLY", detail: "Không tìm thấy sản phẩm khớp trong danh mục chuẩn" });
    }
  });
  return issues;
}

export function checkManyToOne(rows) {
  const issues = [];
  const productCodes = {}; 
  const sampleIndices = {};

  rows.forEach((row, i) => {
    if (row.ten_sp && row.ma_dinh_danh) {
      const normName = String(row.ten_sp).trim().toLowerCase();
      if (!productCodes[normName]) {
        productCodes[normName] = new Set();
        sampleIndices[normName] = i;
      }
      productCodes[normName].add(row.ma_dinh_danh);
    }
  });

  Object.keys(productCodes).forEach(name => {
    if (productCodes[name].size > 1) {
      const codes = Array.from(productCodes[name]).join(", ");
      issues.push({ rowIndex: sampleIndices[name], group: "entity", severity: "FLAGGED_ONLY", detail: `Sản phẩm ${name} có nhiều mã định danh khác nhau: ${codes}` });
    }
  });
  return issues;
}

// ============================================================================
// Group III — Data Value Conflicts (Xung đột giá trị)
// ============================================================================

export function checkMissing(rows) {
  const issues = [];
  rows.forEach((row, i) => {
    const missing = [];
    if (!row.so_luong) missing.push("số lượng");
    if (!row.gia) missing.push("giá bán");
    if (!row.ten_sp && !row.ma_dinh_danh) missing.push("tên/mã sản phẩm");
    if (missing.length) {
      issues.push({ rowIndex: i, group: "value", severity: "FLAGGED_ONLY", detail: `Thiếu: ${missing.join(", ")}` });
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
      issues.push({ rowIndex: i, group: "value", severity: "FLAGGED_ONLY", detail: `Số lượng không hợp lệ: "${row.so_luong}"` });
    }
    if (row.gia && (price === null || price <= 0)) {
      issues.push({ rowIndex: i, group: "value", severity: "FLAGGED_ONLY", detail: `Giá bán không hợp lệ: "${row.gia}"` });
    }
    if (row.ngay && !isValidDate(row.ngay)) {
      issues.push({ rowIndex: i, group: "temporal", severity: "FLAGGED_ONLY", detail: `Sai định dạng ngày: "${row.ngay}"` });
    }
  });
  return issues;
}

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
          rowIndex: i, group: "value", severity: "FLAGGED_ONLY",
          detail: `Giá lệch ${(diff * 100).toFixed(0)}% so với giá chuẩn (${listPrice.toLocaleString("vi-VN")}đ)`,
        });
      }
    }
  });
  return issues;
}

export function checkCrossChannelPrice(rows) {
  const issues = [];
  const productPrices = {}; 

  rows.forEach((row, i) => {
    const ma = row.ma_dinh_danh;
    const kenh = normalizeChannel(row.kenh);
    const price = normalizeNumber(row.gia);
    
    if (ma && kenh && price !== null && price > 0) {
      if (!productPrices[ma]) {
        productPrices[ma] = [];
      }
      productPrices[ma].push({ kenh, price, rowIndex: i });
    }
  });

  Object.keys(productPrices).forEach(ma => {
    const entries = productPrices[ma];
    let found = false;
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        if (a.kenh !== b.kenh) {
          const diff = Math.abs(a.price - b.price) / Math.min(a.price, b.price);
          if (diff > 0.3) {
            issues.push({ 
              rowIndex: b.rowIndex, 
              group: "value", 
              severity: "FLAGGED_ONLY", 
              detail: `Giá bán ${ma} ở kênh ${a.kenh} (${a.price}đ) chênh ${(diff * 100).toFixed(0)}% so với kênh ${b.kenh} (${b.price}đ)` 
            });
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }
  });
  return issues;
}

export function checkNullVsZero(rows) {
  const issues = [];
  rows.forEach((row, i) => {
    if (row.gia === 0 || row.gia === '0') {
      issues.push({ rowIndex: i, group: "value", severity: "FLAGGED_ONLY", detail: `Giá bán = 0 — cần xác nhận: miễn phí hay chưa nhập?` });
    }
    if (row.so_luong === 0 || row.so_luong === '0') {
      issues.push({ rowIndex: i, group: "value", severity: "FLAGGED_ONLY", detail: `Số lượng = 0 — cần xác nhận: miễn phí hay chưa nhập?` });
    }
  });
  return issues;
}

// ============================================================================
// Group IV — Temporal Conflicts (Xung đột thời gian)
// ============================================================================

export function checkTimingMismatch(rows) {
  const issues = [];
  const orderDates = {};

  rows.forEach((row, i) => {
    if (row.ma_don && row.ngay && isValidDate(row.ngay)) {
      const dateVal = new Date(row.ngay).getTime();
      const source = row.__source || 'unknown';
      if (!orderDates[row.ma_don]) {
        orderDates[row.ma_don] = [];
      }
      orderDates[row.ma_don].push({ source, dateVal, rowIndex: i });
    }
  });

  Object.keys(orderDates).forEach(ma => {
    const dates = orderDates[ma];
    let found = false;
    for (let i = 0; i < dates.length; i++) {
      for (let j = i + 1; j < dates.length; j++) {
        const a = dates[i];
        const b = dates[j];
        if (a.source !== b.source) {
          const diffHours = Math.abs(a.dateVal - b.dateVal) / (1000 * 60 * 60);
          if (diffHours > 24) {
             issues.push({ rowIndex: b.rowIndex, group: "temporal", severity: "FLAGGED_ONLY", detail: `Đơn hàng ${ma} có ngày lệch nhau đáng kể giữa các nguồn` });
             found = true;
             break;
          }
        }
      }
      if (found) break;
    }
  });
  return issues;
}

export function checkStaleData(rows) {
  const issues = [];
  rows.forEach((row, i) => {
    const normStatus = normalizeOrderStatus(row.trang_thai);
    const qty = normalizeNumber(row.so_luong);
    const price = normalizeNumber(row.gia);
    
    if ((normStatus === "Đã hủy" || normStatus === "Trả hàng") && qty > 0 && price > 0) {
      issues.push({ rowIndex: i, group: "temporal", severity: "FLAGGED_ONLY", detail: `Đơn hàng có trạng thái ${normStatus} nhưng vẫn ghi nhận doanh thu` });
    }
  });
  return issues;
}

// ============================================================================
// Group V — Semantic Conflicts (Xung đột ngữ nghĩa & phân loại)
// ============================================================================

export function checkCategoricalMismatch(rows) {
  const issues = [];
  const validKenh = ["Shopee", "Lazada", "TikTok Shop", "POS", "FAHASA", "Tiki", "Website"];
  const validStatus = ["Hoàn thành", "Đã hủy", "Đang xử lý", "Trả hàng"];

  rows.forEach((row, i) => {
    const normKenh = normalizeChannel(row.kenh);
    const isBranchChannel = row._isUnpivoted || (normKenh && (normKenh.toLowerCase().includes("fahasa") || normKenh.toLowerCase().includes("chi nhanh") || normKenh.toLowerCase().includes("ns ")));
    if (normKenh && !validKenh.includes(normKenh) && !isBranchChannel) {
      issues.push({ rowIndex: i, group: "semantic", severity: "FLAGGED_ONLY", detail: `Kênh bán "${normKenh}" không nằm trong danh sách chuẩn` });
    }
    const normStatus = normalizeOrderStatus(row.trang_thai);
    if (normStatus && !validStatus.includes(normStatus)) {
      issues.push({ rowIndex: i, group: "semantic", severity: "FLAGGED_ONLY", detail: `Trạng thái "${normStatus}" không nằm trong danh sách chuẩn` });
    }
  });
  return issues;
}

export function checkSynonymConflict(rows) {
  const issues = [];
  const seenMaps = new Set();
  rows.forEach((row, i) => {
    if (row.kenh) {
      const canonical = normalizeChannel(row.kenh);
      if (canonical && canonical !== row.kenh) {
        const mapping = `kenh:${row.kenh}->${canonical}`;
        if (!seenMaps.has(mapping)) {
          seenMaps.add(mapping);
          issues.push({ rowIndex: i, group: "semantic", severity: "AUTO_FIXED", detail: `Đã chuẩn hóa kênh bán: ${row.kenh} → ${canonical}` });
        }
      }
    }
    if (row.trang_thai) {
      const canonical = normalizeOrderStatus(row.trang_thai);
      if (canonical && canonical !== row.trang_thai) {
        const mapping = `trang_thai:${row.trang_thai}->${canonical}`;
        if (!seenMaps.has(mapping)) {
          seenMaps.add(mapping);
          issues.push({ rowIndex: i, group: "semantic", severity: "AUTO_FIXED", detail: `Đã chuẩn hóa trạng thái: ${row.trang_thai} → ${canonical}` });
        }
      }
    }
  });
  return issues;
}

// ============================================================================
// Group VI — Technical/Operational Conflicts (Xung đột kỹ thuật)
// ============================================================================

export function checkDuplicates(rows) {
  const issues = [];
  const seen = new Map(); 
  rows.forEach((row, i) => {
    if (!row.ma_don) return;
    const key = `${row.__source || ""}|${row.ma_don}`;
    if (seen.has(key)) {
      issues.push({ rowIndex: i, group: "technical", severity: "NEEDS_CONFIRMATION", detail: `Trùng mã đơn "${row.ma_don}" với dòng #${seen.get(key)}` });
    } else {
      seen.set(key, i);
    }
  });
  return issues;
}

export function checkReferentialIntegrity(rows) {
  const issues = [];
  rows.forEach((row, i) => {
    if (row.ma_dinh_danh && row.matchStatus === "UNRESOLVED") {
      issues.push({ rowIndex: i, group: "technical", severity: "FLAGGED_ONLY", detail: `Mã ${row.ma_dinh_danh} không tồn tại trong danh mục sản phẩm chuẩn` });
    }
  });
  return issues;
}

export function checkEncodingIssues(rows) {
  const issues = [];
  const encodingRegex = /\uFFFD|Ã¡|Ã©|Ã|Æ|Å|Ä/i;
  rows.forEach((row, i) => {
    const fields = ['ten_sp', 'kenh', 'thuong_hieu', 'trang_thai', 'ma_don', 'ma_dinh_danh'];
    for (const field of fields) {
      if (row[field] && typeof row[field] === 'string' && encodingRegex.test(row[field])) {
        issues.push({ rowIndex: i, group: "technical", severity: "FLAGGED_ONLY", detail: `Phát hiện ký tự lỗi encoding trong [${field}]: ${row[field]}` });
      }
    }
  });
  return issues;
}

// ============================================================================
// Runner & Summary
// ============================================================================

export function runAllChecks(rows) {
  return [
    ...checkMissingAttributes(rows),
    ...checkStructuralConflict(rows),
    ...checkMatchStatus(rows),
    ...checkManyToOne(rows),
    ...checkMissing(rows),
    ...checkMalformed(rows),
    ...checkPriceAnomaly(rows),
    ...checkCrossChannelPrice(rows),
    ...checkNullVsZero(rows),
    ...checkTimingMismatch(rows),
    ...checkStaleData(rows),
    ...checkCategoricalMismatch(rows),
    ...checkSynonymConflict(rows),
    ...checkDuplicates(rows),
    ...checkReferentialIntegrity(rows),
    ...checkEncodingIssues(rows),
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
      return { group, severity, count, groupLabel: GROUP_LABELS[group] || group };
    })
    .sort((a, b) => b.count - a.count);
}
