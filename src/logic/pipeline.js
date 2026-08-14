/**
 * Pipeline chính: gộp dữ liệu từ nhiều file đơn hàng + đối chiếu danh mục chuẩn
 * + kiểm soát chất lượng dữ liệu -> dataset tích hợp + báo cáo lỗi (có phân mức).
 *
 * Quy trình 5 bước:
 *   1. Gộp dữ liệu từ nhiều nguồn, gắn nhãn
 *   2. Chuẩn hóa dữ liệu (mã đơn, kênh, trạng thái, thương hiệu, ngày)
 *   3. Đối chiếu thực thể 3 tầng
 *   4. Kiểm soát chất lượng dữ liệu (6 nhóm lỗi)
 *   5. Xây dataset tích hợp cuối cùng
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
} from "./normalize";

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

  // 2. Chuẩn hóa dữ liệu — áp dụng trước khi đối chiếu
  allRows = allRows.map((row) => {
    // Lưu giá trị gốc trước khi chuẩn hóa (để checkSynonymConflict phát hiện)
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
      // Lưu giá trị gốc để tracking chuẩn hóa
      __raw_kenh: rawKenh,
      __raw_trang_thai: rawTrangThai,
    };
  });

  // 3. Đối chiếu thực thể 3 tầng
  const resolved = resolveEntities(allRows, catalog, { crosswalk });

  // 4. Kiểm soát chất lượng dữ liệu (đầy đủ 6 nhóm)
  const issues = runAllChecks(resolved);
  const issuesByRow = new Map();
  issues.forEach((issue) => {
    if (!issuesByRow.has(issue.rowIndex)) issuesByRow.set(issue.rowIndex, []);
    issuesByRow.get(issue.rowIndex).push(issue);
  });

  // 5. Xây dataset tích hợp cuối cùng (dùng thông tin từ danh mục khi đã khớp)
  const integrated = resolved.map((row, i) => {
    const qty = normalizeNumber(row.so_luong) || 0;
    const price = normalizeNumber(row.gia) || 0;
    const rowIssues = issuesByRow.get(i) || [];

    // Validate ISBN-13 checksum nếu có mã 13 chữ số
    const idCode = row.matched ? row.matched.ma_dinh_danh : row.ma_dinh_danh;
    let isbnValid = null;
    if (idCode) {
      const cleanId = String(idCode).replace(/[\s-]/g, "");
      if (/^\d{13}$/.test(cleanId)) {
        const result = validateISBN13(cleanId);
        isbnValid = result.valid;
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
    stats: {
      totalRows: integrated.length,
      catalogSize: catalog.length,
      matchedCount: integrated.filter((r) => r.matchStatus === "MATCHED_EXACT" || r.matchStatus === "MATCHED_FUZZY_HIGH").length,
    },
  };
}
