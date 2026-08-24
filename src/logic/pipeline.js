/**
 * Pipeline chính: gộp dữ liệu từ nhiều file đơn hàng + đối chiếu danh mục chuẩn
 * + kiểm soát chất lượng dữ liệu -> dataset tích hợp + báo cáo chất lượng quản trị.
 *
 * Phục vụ trực tiếp 3 Câu hỏi nghiên cứu (Research Questions):
 *   - RQ1: Hiệu quả ánh xạ & 7 nhóm chuẩn hóa dữ liệu.
 *   - RQ2: Đánh giá cải thiện của đối chiếu thực thể nhiều tầng vs Exact Matching.
 *   - RQ3: Đánh giá mức độ giảm sai lệch trong các báo cáo quản trị doanh thu & sản phẩm.
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

  // Thống kê thô ban đầu phục vụ đánh giá RQ3 (Pre-integration Baseline)
  let rawRevenueTotal = 0;
  let rawUniqueTitles = new Set();
  let rawOrderIdsMap = new Map();
  let cancelledRevenue = 0;

  orderFiles.forEach((file, idx) => {
    const label = file.fileName || `Tệp ${idx + 1}`;
    const channelOverride = file.channelLabel ? file.channelLabel.trim() : null;
    const rows = buildRows(file.dataRows, file.mapping).map((r) => ({
      ...r,
      __source: label,
      __sourceIndex: idx,
      __channelLabel: channelOverride,
    }));
    sourceRowsMap.set(label, rows);
    allRows = allRows.concat(rows);

    rows.forEach((r) => {
      const p = normalizeNumber(r.gia) || 0;
      const q = normalizeNumber(r.so_luong) || 0;
      rawRevenueTotal += p * q;
      if (r.ten_sp) rawUniqueTitles.add(r.ten_sp.trim());
      if (r.ma_don) {
        rawOrderIdsMap.set(r.ma_don, (rawOrderIdsMap.get(r.ma_don) || 0) + 1);
      }
      const st = (r.trang_thai || "").toLowerCase();
      if (st.includes("huy") || st.includes("cancel") || st.includes("tra hang") || st.includes("refund")) {
        cancelledRevenue += p * q;
      }
    });
  });

  // 2. Thống kê 7 nhóm chuẩn hóa phục vụ RQ1
  let normStats = {
    idCount: 0,
    textCount: 0,
    numberCount: 0,
    dateCount: 0,
    channelCount: 0,
    statusCount: 0,
    structureCount: 0,
    encodingFixedCount: 0,
  };

  // Áp dụng 7 nhóm chuẩn hóa dữ liệu
  allRows = allRows.map((row) => {
    const rawKenh = row.kenh;
    const rawTrangThai = row.trang_thai;
    const rawNgay = row.ngay;
    const rawTen = row.ten_sp;
    const rawId = row.ma_dinh_danh;

    const normId = normalizeIdCode(rawId);
    const normOrderId = normalizeOrderId(row.ma_don);
    const normKenh = row.__channelLabel || normalizeChannel(row.kenh) || row.__source;
    const normStatus = normalizeOrderStatus(row.trang_thai);
    const normBrand = normalizeBrand(row.thuong_hieu);
    const normDate = normalizeDate(row.ngay) || row.ngay;

    if (normId !== rawId) normStats.idCount++;
    if (normBrand !== row.thuong_hieu || (rawTen && rawTen.trim() !== rawTen)) normStats.textCount++;
    if (normDate !== rawNgay) normStats.dateCount++;
    if (normKenh !== rawKenh) normStats.channelCount++;
    if (normStatus !== rawTrangThai) normStats.statusCount++;
    if (row._isUnpivoted) normStats.structureCount++;
    if (row.ma_don && normOrderId !== row.ma_don) normStats.encodingFixedCount++;

    return {
      ...row,
      ma_don: normOrderId,
      kenh: normKenh,
      trang_thai: normStatus,
      thuong_hieu: normBrand,
      ngay: normDate,
      ma_dinh_danh: normId,
      __raw_kenh: rawKenh,
      __raw_trang_thai: rawTrangThai,
    };
  });

  // 3. Thực thi Đối Chiếu Thực Thể (Strategy Pattern Dispatcher)
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

  // 4. Kiểm soát chất lượng dữ liệu (6 nhóm lỗi)
  const issues = runAllChecks(resolved);
  const issuesByRow = new Map();
  issues.forEach((issue) => {
    if (!issuesByRow.has(issue.rowIndex)) issuesByRow.set(issue.rowIndex, []);
    issuesByRow.get(issue.rowIndex).push(issue);
  });

  // 5. Xây dataset tích hợp cuối cùng & Đánh giá sai lệch báo cáo (RQ3)
  let cleanRevenueTotal = 0;
  let cleanUniqueProducts = new Set();
  let duplicateRevenueDiscrepancy = 0;

  const integrated = resolved.map((row, i) => {
    const qty = normalizeNumber(row.so_luong) || 0;
    const price = normalizeNumber(row.gia) || 0;
    const rowIssues = issuesByRow.get(i) || [];
    const lineTotal = qty * price;

    const isCancelled = (row.trang_thai || "").toLowerCase().includes("hủy");
    if (!isCancelled) {
      cleanRevenueTotal += lineTotal;
    }

    const isDuplicate = (rawOrderIdsMap.get(row.ma_don) || 0) > 1;
    if (isDuplicate) {
      duplicateRevenueDiscrepancy += lineTotal / 2; // tính phần thừa trùng lặp
    }

    const finalTitle = row.matched ? row.matched.ten_sp : row.ten_sp;
    if (finalTitle) cleanUniqueProducts.add(finalTitle);

    const idCode = row.matched ? row.matched.ma_dinh_danh : row.ma_dinh_danh;
    if (idCode) {
      const cleanId = String(idCode).replace(/[\s-]/g, "");
      // Chỉ kiểm tra ISBN-13 khi mã bắt đầu bằng 978 hoặc 979 (tiêu chuẩn sách quốc tế)
      if (/^(978|979)\d{10}$/.test(cleanId)) {
        const result = validateISBN13(cleanId);
        if (!result.valid) {
          rowIssues.push({
            rowIndex: i,
            group: "value",
            severity: "FLAGGED_ONLY",
            detail: `Mã ISBN-13 "${cleanId}" không hợp lệ (sai số kiểm tra checksum)`,
          });
        }
      }
    }

    return {
      nguon: row.__source,
      ma_don: row.ma_don,
      ngay: row.ngay,
      ten_sp: finalTitle,
      ma_dinh_danh: idCode,
      thuong_hieu: row.matched ? row.matched.thuong_hieu : row.thuong_hieu,
      kenh: row.kenh || row.__source,
      trang_thai: row.trang_thai,
      so_luong: qty,
      gia: price,
      thanh_tien: lineTotal,
      matchStatus: row.matchStatus,
      matchScore: row.matchScore,
      matchTier: row.matchTier,
      issues: rowIssues,
    };
  });

  // Báo cáo đo lường giảm sai lệch quản trị (RQ3 Governance Evaluation)
  const governanceAudit = {
    rawRevenueTotal,
    cleanRevenueTotal,
    revenueDiscrepancyPrevented: rawRevenueTotal - cleanRevenueTotal,
    cancelledRevenuePrevented: cancelledRevenue,
    duplicateRevenueDiscrepancy,
    rawUniqueTitlesCount: rawUniqueTitles.size,
    cleanUniqueProductsCount: cleanUniqueProducts.size,
    productFragmentationReduced: Math.max(0, rawUniqueTitles.size - cleanUniqueProducts.size),
  };

  return {
    integrated,
    issues,
    issuesSummary: summarizeIssues(issues),
    integrationMode: resolutionResult.strategyKey,
    strategyLabel: resolutionResult.strategyLabel,
    resolutionStats: resolutionResult.resolutionStats || null,
    bipartiteStats: resolutionResult.bipartiteStats || null,
    clustersStats: resolutionResult.clustersStats || null,
    synthesizedCatalog: catalog,
    normStats,
    governanceAudit,
    stats: {
      totalRows: integrated.length,
      catalogSize: catalog.length,
      matchedCount: integrated.filter((r) => r.matchStatus === "MATCHED_EXACT" || r.matchStatus === "MATCHED_FUZZY_HIGH").length,
    },
  };
}
