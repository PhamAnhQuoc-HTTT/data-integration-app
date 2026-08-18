/**
 * Pipeline chính: gộp dữ liệu từ nhiều file đơn hàng + đối chiếu danh mục chuẩn
 * + kiểm soát chất lượng dữ liệu -> dataset tích hợp + báo cáo lỗi (có phân mức).
 *
 * Hỗ trợ 2 chế độ:
 *   - Chế độ 1: Có file Danh mục sản phẩm chuẩn (Master Catalog)
 *   - Chế độ 2 (Mới): KHÔNG có file chuẩn -> Tự động Ghép cặp tối ưu toàn cục (Bipartite Matching)
 *     kết hợp Danh mục tích lũy dần (Progressive Crosswalk) theo Cơ chế 3 & 4.
 */

import { buildRows, buildCatalog } from "./fieldMapping";
import { resolveEntities } from "./entityResolution";
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
  normalizeTextForMatching,
} from "./normalize";
import {
  extractUniqueEntitiesFromRows,
  matchBipartiteEntities,
  synthesizeCanonicalCatalog,
  getProgressiveCrosswalk,
} from "./bipartiteMatching";

/**
 * orderFiles: mảng { fileName, dataRows, mapping }
 * catalogFile: { dataRows, mapping } (Tùy chọn - có thể null)
 * options: { crosswalk, fuzzyHighThreshold, fuzzyConfirmThreshold, masterSourceIndex }
 */
export function runPipeline(orderFiles, catalogFile = null, options = {}) {
  const { crosswalk = [], fuzzyHighThreshold = 90, fuzzyConfirmThreshold = 70, masterSourceIndex = null } = options;

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

  let resolved = [];
  let catalog = [];
  let integrationMode = "MASTER_CATALOG"; // 'MASTER_CATALOG' | 'BIPARTITE_MATCHING' | 'MASTER_SOURCE'
  let bipartiteStats = null;

  // -------------------------------------------------------------
  // CHẾ ĐỘ 1: Có File Danh Mục Chuẩn
  // -------------------------------------------------------------
  if (catalogFile && catalogFile.dataRows && catalogFile.dataRows.length > 0) {
    catalog = buildCatalog(catalogFile.dataRows, catalogFile.mapping);
    resolved = resolveEntities(allRows, catalog, { crosswalk, idField: "ma_dinh_danh", titleField: "ten_sp" });
    integrationMode = "MASTER_CATALOG";
  }
  // -------------------------------------------------------------
  // CHẾ ĐỘ 2: KHÔNG Có File Chuẩn -> Ghép cặp tối ưu & Tích lũy (Bipartite + Progressive Crosswalk)
  // -------------------------------------------------------------
  else {
    const sourceLabels = Array.from(sourceRowsMap.keys());
    
    // Nếu có chọn 1 nguồn làm chuẩn (Cơ chế 1)
    if (masterSourceIndex !== null && masterSourceIndex >= 0 && masterSourceIndex < orderFiles.length) {
      integrationMode = "MASTER_SOURCE";
      const masterLabel = sourceLabels[masterSourceIndex];
      const masterRows = allRows.filter((r) => r.__source === masterLabel);
      const masterEntities = extractUniqueEntitiesFromRows(masterRows, masterLabel);
      
      // Tạo catalog từ master source
      catalog = masterEntities.map((e) => ({
        ma_dinh_danh: e.ma_dinh_danh,
        ten_sp: e.ten_sp,
        thuong_hieu: e.thuong_hieu,
        danh_muc: `Chuẩn từ ${masterLabel}`,
        gia_chuan: e.gia_chuan,
        isMasterSource: true,
      }));

      resolved = resolveEntities(allRows, catalog, { crosswalk, idField: "ma_dinh_danh", titleField: "ten_sp" });
    }
    // Ghép cặp tối ưu toàn cục Bipartite Matching (Cơ chế 3 + 4 - Mặc định khi không có file chuẩn)
    else {
      integrationMode = "BIPARTITE_MATCHING";
      
      // Trích xuất unique entities cho từng nguồn
      const source1Label = sourceLabels[0] || "Nguồn 1";
      const source2Label = sourceLabels[1] || "Nguồn 2";
      
      const rows1 = allRows.filter((r) => r.__source === source1Label);
      const rows2 = allRows.filter((r) => r.__source === source2Label);

      const entities1 = extractUniqueEntitiesFromRows(rows1, source1Label);
      const entities2 = extractUniqueEntitiesFromRows(rows2, source2Label);

      const crosswalkMemory = getProgressiveCrosswalk();
      const bipartiteResult = matchBipartiteEntities(entities1, entities2, {
        crosswalkMemory,
        fuzzyHighThreshold,
        fuzzyConfirmThreshold,
      });

      const synthesized = synthesizeCanonicalCatalog(bipartiteResult);
      catalog = synthesized.catalog;
      bipartiteStats = {
        totalUniqueSource1: entities1.length,
        totalUniqueSource2: entities2.length,
        matchedPairsCount: bipartiteResult.matchedPairs.length,
        unmatchedSource1Count: bipartiteResult.unmatchedA.length,
        unmatchedSource2Count: bipartiteResult.unmatchedB.length,
      };

      // Ánh xạ từng dòng đơn hàng vào canonical product đã tổng hợp
      resolved = allRows.map((row) => {
        const rawId = (row.ma_dinh_danh || "").replace(/[\s-]/g, "").toUpperCase();
        const normTitle = normalizeTextForMatching(row.ten_sp);
        const entityKey = rawId ? `ID:${rawId}` : `TITLE:${normTitle}`;
        const mappingKey = `${row.__source}|${entityKey}`;

        const mapping = synthesized.entityToCanonicalMap.get(mappingKey);
        if (mapping) {
          return {
            ...row,
            matched: mapping.canonical,
            matchStatus: mapping.matchStatus,
            matchScore: mapping.matchScore,
            matchTier: mapping.canonical.matchTier || "tier_bipartite",
          };
        }

        return {
          ...row,
          matched: null,
          matchStatus: "UNRESOLVED",
          matchScore: 0,
          matchTier: null,
        };
      });
    }
  }

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
    integrationMode,
    bipartiteStats,
    synthesizedCatalog: catalog,
    stats: {
      totalRows: integrated.length,
      catalogSize: catalog.length,
      matchedCount: integrated.filter((r) => r.matchStatus === "MATCHED_EXACT" || r.matchStatus === "MATCHED_FUZZY_HIGH").length,
    },
  };
}
