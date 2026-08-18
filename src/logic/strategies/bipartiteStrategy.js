/**
 * Chiến Lược 3: Ghép cặp tối ưu toàn cục (Bipartite Optimal Matching Strategy)
 * Giải quyết triệt để lỗi tranh chấp khớp giữa 2 nguồn và kế thừa bộ nhớ Crosswalk.
 */
import { normalizeTextForMatching } from "../normalize";
import {
  extractUniqueEntitiesFromRows,
  matchBipartiteEntities,
  synthesizeCanonicalCatalog,
  getProgressiveCrosswalk,
} from "../bipartiteMatching";

export function executeBipartiteStrategy({ allRows, sourceRowsMap, fuzzyHighThreshold = 90, fuzzyConfirmThreshold = 70 }) {
  const sourceLabels = Array.from(sourceRowsMap.keys());
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
  const catalog = synthesized.catalog;

  const resolved = allRows.map((row) => {
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

  return {
    strategyKey: "BIPARTITE",
    strategyLabel: "Cơ chế 3: Ghép cặp tối ưu toàn cục (Bipartite Matching)",
    resolved,
    catalog,
    bipartiteStats: {
      totalUniqueSource1: entities1.length,
      totalUniqueSource2: entities2.length,
      matchedPairsCount: bipartiteResult.matchedPairs.length,
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
