/**
 * Chiến Lược 3: Ghép cặp tối ưu toàn cục (Bipartite Optimal Matching Strategy)
 * Giải quyết triệt để lỗi tranh chấp khớp giữa các nguồn đơn hàng và tự động tổng hợp Master Catalog.
 */
import { normalizeTextForMatching } from "../normalize";
import {
  extractUniqueEntitiesFromRows,
  matchBipartiteEntities,
  synthesizeCanonicalCatalog,
} from "../bipartiteMatching";

export function executeBipartiteStrategy({ allRows, sourceRowsMap, fuzzyHighThreshold = 90, fuzzyConfirmThreshold = 70 }) {
  const sourceLabels = Array.from(sourceRowsMap.keys());
  const source1Label = sourceLabels[0] || "Nguồn 1";
  const source2Label = sourceLabels[1] || "Nguồn 2";

  const rows1 = allRows.filter((r) => r.__source === source1Label);
  const rows2 = allRows.filter((r) => r.__source === source2Label);

  const entities1 = extractUniqueEntitiesFromRows(rows1, source1Label);
  const entities2 = rows2.length > 0 ? extractUniqueEntitiesFromRows(rows2, source2Label) : [];

  let bipartiteResult = matchBipartiteEntities(entities1, entities2, {
    fuzzyHighThreshold,
    fuzzyConfirmThreshold,
  });

  let synthesized = synthesizeCanonicalCatalog(bipartiteResult);
  let catalog = synthesized.catalog;
  const entityToCanonicalMap = synthesized.entityToCanonicalMap;
  let totalMatchedPairs = bipartiteResult.matchedPairs.length;

  // Ghép cặp lũy tiến (Progressive Bipartite Matching) cho các nguồn thứ 3, thứ 4 trở đi (nếu có)
  if (sourceLabels.length > 2) {
    for (let k = 2; k < sourceLabels.length; k++) {
      const nextSourceLabel = sourceLabels[k];
      const rowsK = allRows.filter((r) => r.__source === nextSourceLabel);
      const entitiesK = extractUniqueEntitiesFromRows(rowsK, nextSourceLabel);

      // Chuyển đổi catalog hiện tại thành danh sách entities để so khớp
      const catalogEntities = catalog.map((c, cIdx) => ({
        entityKey: c.ma_dinh_danh ? `ID:${c.ma_dinh_danh}` : `TITLE:${normalizeTextForMatching(c.ten_sp)}`,
        source: "CANONICAL_CATALOG",
        ma_dinh_danh: c.ma_dinh_danh,
        ten_sp: c.ten_sp,
        ten_sp_norm: normalizeTextForMatching(c.ten_sp),
        thuong_hieu: c.thuong_hieu,
        canonicalRef: c,
        idx: cIdx,
      }));

      const stepResult = matchBipartiteEntities(catalogEntities, entitiesK, {
        fuzzyHighThreshold,
        fuzzyConfirmThreshold,
      });

      totalMatchedPairs += stepResult.matchedPairs.length;

      // 1. Ánh xạ các cặp đã khớp
      stepResult.matchedPairs.forEach((pair) => {
        const canonical = pair.entityA.canonicalRef;
        const itemK = pair.entityB;

        if (!canonical.sources.includes(nextSourceLabel)) {
          canonical.sources.push(nextSourceLabel);
        }
        if (itemK.ten_sp && itemK.ten_sp.length > canonical.ten_sp.length) {
          canonical.ten_sp = itemK.ten_sp;
        }

        entityToCanonicalMap.set(`${nextSourceLabel}|${itemK.entityKey}`, {
          canonical,
          matchStatus: pair.status,
          matchScore: pair.score,
        });
      });

      // 2. Thêm các sản phẩm đặc thù chỉ có ở nguồn mới
      stepResult.unmatchedB.forEach((b) => {
        const newCanonical = {
          ma_dinh_danh: b.ma_dinh_danh || `GEN-${String(catalog.length + 1).padStart(4, "0")}`,
          ten_sp: b.ten_sp,
          thuong_hieu: b.thuong_hieu || "",
          danh_muc: "Đặc thù nguồn",
          gia_chuan: b.gia_chuan || 0,
          isSynthesized: true,
          matchStatus: "UNRESOLVED",
          matchScore: 0,
          matchMethod: "SOURCE_EXCLUSIVE",
          sources: [b.source],
        };
        catalog.push(newCanonical);
        entityToCanonicalMap.set(`${b.source}|${b.entityKey}`, {
          canonical: newCanonical,
          matchStatus: "UNRESOLVED",
          matchScore: 0,
        });
      });
    }
  }

  const resolved = allRows.map((row) => {
    const rawId = (row.ma_dinh_danh || "").replace(/[\s-]/g, "").toUpperCase();
    const normTitle = normalizeTextForMatching(row.ten_sp);
    const entityKey = rawId ? `ID:${rawId}` : `TITLE:${normTitle}`;
    const mappingKey = `${row.__source}|${entityKey}`;

    const mapping = entityToCanonicalMap.get(mappingKey);
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

  return {
    strategyKey: "BIPARTITE",
    strategyLabel: sourceLabels.length > 2
      ? `Cơ chế 3: Ghép cặp tối ưu toàn cục (${sourceLabels.length} nguồn)`
      : "Cơ chế 3: Ghép cặp tối ưu toàn cục (Bipartite Matching)",
    resolved,
    catalog,
    bipartiteStats: {
      totalSources: sourceLabels.length,
      totalUniqueSource1: entities1.length,
      totalUniqueSource2: entities2.length,
      matchedPairsCount: totalMatchedPairs,
      unmatchedSource1Count: bipartiteResult.unmatchedA.length,
      unmatchedSource2Count: bipartiteResult.unmatchedB.length,
    },
    stats: {
      totalRows: resolved.length,
      catalogSize: catalog.length,
      matchedCount: resolved.filter((r) => r.matchStatus === "MATCHED_EXACT" || r.matchStatus === "MATCHED_FUZZY_HIGH").length,
    },
  };
}
