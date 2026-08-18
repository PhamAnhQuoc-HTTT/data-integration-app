/**
 * Pipeline chính: gộp dữ liệu từ nhiều file đơn hàng + đối chiếu danh mục chuẩn
 * + kiểm soát chất lượng dữ liệu -> dataset tích hợp + báo cáo lỗi (có phân mức).
 *
 * Áp dụng Kiến trúc Strategy Pattern:
 *   - Chiến lược 0: CATALOG (Có Master Catalog)
 *   - Chiến lược 1: MASTER_SOURCE (Cơ chế 1: Chọn 1 nguồn làm chuẩn)
 *   - Chiến lược 2: CLUSTERING (Cơ chế 2: Tự động gom cụm)
 *   - Chiến lược 3: BIPARTITE (Cơ chế 3: Ghép cặp tối ưu toàn cục)
 */

import { buildRows } from "./fieldMapping";
import { runAllChecks, summarizeIssues } from "./qualityRules";
import {
  normalizeNumber,
  normalizeDate,
  normalizeOrderId,
  normalizeChannel,
  normalizeOrderStatus,
  normalizeBrand,
  normalizeIdCode,
  validateISBN13,
} from "./normalize";
import { runResolutionStrategy } from "./strategies";

/**
 * orderFiles: mảng { fileName, dataRows, mapping }
 * catalogFile: { dataRows, mapping } (Tùy chọn)
 * options: { resolutionStrategy, masterSourceIndex, fuzzyHighThreshold, fuzzyConfirmThreshold, crosswalk }
 */
export function runPipeline(orderFiles, catalogFile = null, options = {}) {
  const {
    resolutionStrategy = "BIPARTITE",
    fuzzyHighThreshold = 90,
    fuzzyConfirmThreshold = 70,
    masterSourceIndex = 0,
    crosswalk = [],
  } = options;

  // 1. Gộp toàn bộ dòng từ các file đơn hàng, gắn nhãn nguồn
  let allRows = [];
  const sourceRowsMap = new Map();

  orderFiles.forEach((file, idx) => {
    const label = file.fileName || `Tệp ${idx + 1}`;
    const rows = buildRows(file.dataRows, file.mapping).map((r) => ({ ...r, __source: label, __sourceIndex: idx }));
    sourceRowsMap.set(label, rows);
    allRows = allRows.concat(rows);
  });

  // 2. Chuẩn hóa dữ liệu — áp dụng trước khi đối chiếu
  allRows = allRows.map((row) => {
    const rawKenh = row.kenh;
    const rawTrangThai = row.trang_thai;

    return {
      ...row,
      ma_don: normalizeOrderId(row.ma_don),
      kenh: normalizeChannel(row.kenh) || row.__source,
      trang_thai: normalizeOrderStatus(row.trang_thai),
      thuong_hieu: normalizeBrand(row.thuong_hieu),
      ngay: normalizeDate(row.ngay) || row.ngay,
      ma_dinh_danh: normalizeIdCode(row.ma_dinh_danh),
      __raw_kenh: rawKenh,
      __raw_trang_thai: rawTrangThai,
    };
  });

  // 3. Thực thi Chiến Lược Đối Chiếu Thực Thể (Strategy Pattern Dispatcher)
  const targetStrategyKey = (catalogFile && catalogFile.dataRows && catalogFile.dataRows.length > 0)
    ? "CATALOG"
    : resolutionStrategy;

  const resolutionResult = runResolutionStrategy(targetStrategyKey, {
    allRows,
    catalogFile,
    orderFiles,
    sourceRowsMap,
    masterSourceIndex,
    fuzzyHighThreshold,
    fuzzyConfirmThreshold,
    crosswalk,
  });

  const resolved = resolutionResult.resolved;
  const catalog = resolutionResult.catalog;

  // 4. Kiểm soát chất lượng dữ liệu (đầy đủ 6 nhóm)
  const issues = runAllChecks(resolved);
  const issuesByRow = new Map();
  issues.forEach((issue) => {
    if (!issuesByRow.has(issue.rowIndex)) issuesByRow.set(issue.rowIndex, []);
    issuesByRow.get(issue.rowIndex).push(issue);
  });

  // 5. Xây dataset tích hợp cuối cùng
  const integrated = resolved.map((row, i) => {
    const qty = normalizeNumber(row.so_luong) || 0;
    const price = normalizeNumber(row.gia) || 0;
    const rowIssues = issuesByRow.get(i) || [];

    const idCode = row.matched ? row.matched.ma_dinh_danh : row.ma_dinh_danh;
    if (idCode) {
      const cleanId = String(idCode).replace(/[\s-]/g, "");
      if (/^\d{13}$/.test(cleanId)) {
        const result = validateISBN13(cleanId);
        if (!result.valid) {
          rowIssues.push({
            rowIndex: i,
            group: "value",
            severity: "FLAGGED_ONLY",
            detail: `Mã ISBN-13 "${cleanId}" không hợp lệ (sai checksum)`,
          });
        }
      }
    }

    return {
      nguon: row.__source,
      ma_don: row.ma_don,
      ngay: row.ngay,
      ten_sp: row.matched ? row.matched.ten_sp : row.ten_sp,
      ma_dinh_danh: idCode,
      thuong_hieu: row.matched ? row.matched.thuong_hieu : row.thuong_hieu,
      kenh: row.kenh || row.__source,
      trang_thai: row.trang_thai,
      so_luong: qty,
      gia: price,
      thanh_tien: qty * price,
      matchStatus: row.matchStatus,
      matchScore: row.matchScore,
      issues: rowIssues,
    };
  });

  return {
    integrated,
    issues,
    issuesSummary: summarizeIssues(issues),
    integrationMode: resolutionResult.strategyKey,
    strategyLabel: resolutionResult.strategyLabel,
    bipartiteStats: resolutionResult.bipartiteStats || null,
    clustersStats: resolutionResult.clustersStats || null,
    synthesizedCatalog: catalog,
    stats: {
      totalRows: integrated.length,
      catalogSize: catalog.length,
      matchedCount: integrated.filter((r) => r.matchStatus === "MATCHED_EXACT" || r.matchStatus === "MATCHED_FUZZY_HIGH").length,
    },
  };
}
