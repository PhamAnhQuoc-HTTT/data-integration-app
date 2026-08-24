/**
 * Chiến Lược 0: Đối chiếu theo Danh mục sản phẩm chuẩn có sẵn (Master Catalog Strategy)
 * Áp dụng Phương pháp đối chiếu thực thể 3 tầng (Mã chuẩn -> Crosswalk -> Fuzzy token-sort).
 */
import { buildCatalog } from "../fieldMapping";
import { resolveEntities } from "../entityResolution";

export function executeCatalogStrategy({
  allRows,
  catalogFile,
  crosswalk = [],
  fuzzyHighThreshold = 90,
  fuzzyConfirmThreshold = 70,
}) {
  const catalog = buildCatalog(catalogFile.dataRows, catalogFile.mapping);
  const resolved = resolveEntities(allRows, catalog, {
    crosswalk,
    idField: "ma_dinh_danh",
    titleField: "ten_sp",
    fuzzyHighThreshold,
    fuzzyConfirmThreshold,
  });
  const resolutionStats = resolved.stats;

  return {
    strategyKey: "CATALOG",
    strategyLabel: "Chế độ: Đối chiếu Danh mục chuẩn (Master Catalog)",
    resolved,
    catalog,
    resolutionStats,
    stats: {
      totalRows: resolved.length,
      catalogSize: catalog.length,
      matchedCount: resolved.filter((r) => r.matchStatus === "MATCHED_EXACT" || r.matchStatus === "MATCHED_FUZZY_HIGH").length,
    },
  };
}
