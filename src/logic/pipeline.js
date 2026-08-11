/**
 * Pipeline chính: gộp dữ liệu từ nhiều file đơn hàng + đối chiếu danh mục chuẩn
 * + kiểm soát chất lượng dữ liệu -> dataset tích hợp + báo cáo lỗi (có phân mức).
 */
import { buildRows, buildCatalog } from "./fieldMapping";
import { resolveEntities } from "./entityResolution";
import { runAllChecks, summarizeIssues } from "./qualityRules";
import { normalizeNumber } from "./normalize";

/**
 * orderFiles: mảng { fileName, dataRows, mapping }
 * catalogFile: { dataRows, mapping }
 * crosswalk: mảng tùy chọn [{ internal_code, isbn }]
 */
export function runPipeline(orderFiles, catalogFile, { crosswalk = [] } = {}) {
  const catalog = buildCatalog(catalogFile.dataRows, catalogFile.mapping);

  // 1. Gộp toàn bộ dòng từ các file đơn hàng, gắn nhãn nguồn
  let allRows = [];
  orderFiles.forEach((file, idx) => {
    const label = file.fileName || `Tệp ${idx + 1}`;
    const rows = buildRows(file.dataRows, file.mapping).map((r) => ({ ...r, __source: label }));
    allRows = allRows.concat(rows);
  });

  // 2. Đối chiếu thực thể 3 tầng
  const resolved = resolveEntities(allRows, catalog, { crosswalk });

  // 3. Kiểm soát chất lượng dữ liệu
  const issues = runAllChecks(resolved);
  const issuesByRow = new Map();
  issues.forEach((issue) => {
    if (!issuesByRow.has(issue.rowIndex)) issuesByRow.set(issue.rowIndex, []);
    issuesByRow.get(issue.rowIndex).push(issue);
  });

  // 4. Xây dataset tích hợp cuối cùng (dùng thông tin từ danh mục khi đã khớp)
  const integrated = resolved.map((row, i) => {
    const qty = normalizeNumber(row.so_luong) || 0;
    const price = normalizeNumber(row.gia) || 0;
    const rowIssues = issuesByRow.get(i) || [];
    return {
      nguon: row.__source,
      ma_don: row.ma_don,
      ngay: row.ngay,
      ten_sp: row.matched ? row.matched.ten_sp : row.ten_sp,
      ma_dinh_danh: row.matched ? row.matched.ma_dinh_danh : row.ma_dinh_danh,
      thuong_hieu: row.matched ? row.matched.thuong_hieu : row.thuong_hieu,
      kenh: row.kenh || row.__source,
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
    stats: {
      totalRows: integrated.length,
      catalogSize: catalog.length,
      matchedCount: integrated.filter((r) => r.matchStatus === "MATCHED_EXACT" || r.matchStatus === "MATCHED_FUZZY_HIGH").length,
    },
  };
}
