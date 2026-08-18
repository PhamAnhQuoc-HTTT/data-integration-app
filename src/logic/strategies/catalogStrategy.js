/**
 * Chiến Lược 0: Đối chiếu theo Danh mục sản phẩm chuẩn có sẵn (Master Catalog Strategy)
 */
import { buildCatalog } from "../fieldMapping";
import { resolveEntities } from "../entityResolution";

export function executeCatalogStrategy({ allRows, catalogFile, crosswalk = [] }) {
  const catalog = buildCatalog(catalogFile.dataRows, catalogFile.mapping);
  const resolved = resolveEntities(allRows, catalog, {
    crosswalk,
    idField: "ma_dinh_danh",
    titleField: "ten_sp",
  });

  return {
    strategyKey: "CATALOG",
    strategyLabel: "Chế độ: Có sẵn Master Catalog",
    resolved,
    catalog,
    stats: {
      totalRows: resolved.length,
      catalogSize: catalog.length,
      matchedCount: resolved.filter((r) => r.matchStatus === "MATCHED_EXACT" || r.matchStatus === "MATCHED_FUZZY_HIGH").length,
    },
  };
}
