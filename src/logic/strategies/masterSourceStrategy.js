/**
 * Chiến Lược 1: Chọn 1 nguồn đơn hàng làm chuẩn (Master Source Strategy)
 * Áp dụng khi người dùng biết rõ 1 file đơn hàng là nguồn đáng tin cậy nhất (ví dụ POS tại quầy).
 */
import { resolveEntities } from "../entityResolution";
import { extractUniqueEntitiesFromRows } from "../bipartiteMatching";

export function executeMasterSourceStrategy({ allRows, orderFiles, masterSourceIndex = 0, crosswalk = [] }) {
  const safeIdx = Math.max(0, Math.min(masterSourceIndex, orderFiles.length - 1));
  const masterFileName = orderFiles[safeIdx]?.fileName || `Tệp ${safeIdx + 1}`;

  const masterRows = allRows.filter((r) => r.__source === masterFileName);
  const masterEntities = extractUniqueEntitiesFromRows(masterRows, masterFileName);

  const catalog = masterEntities.map((e) => ({
    ma_dinh_danh: e.ma_dinh_danh,
    ten_sp: e.ten_sp,
    thuong_hieu: e.thuong_hieu,
    danh_muc: `Chuẩn từ nguồn ${masterFileName}`,
    gia_chuan: e.gia_chuan,
    isMasterSource: true,
  }));

  const resolved = resolveEntities(allRows, catalog, {
    crosswalk,
    idField: "ma_dinh_danh",
    titleField: "ten_sp",
  });

  return {
    strategyKey: "MASTER_SOURCE",
    strategyLabel: `Cơ chế 1: Nguồn chuẩn chỉ định (${masterFileName})`,
    resolved,
    catalog,
    stats: {
      totalRows: resolved.length,
      catalogSize: catalog.length,
      matchedCount: resolved.filter((r) => r.matchStatus === "MATCHED_EXACT" || r.matchStatus === "MATCHED_FUZZY_HIGH").length,
    },
  };
}
