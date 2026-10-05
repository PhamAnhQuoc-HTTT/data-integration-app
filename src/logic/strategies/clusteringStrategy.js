import { extractUniqueEntitiesFromRows } from '../bipartiteMatching';
import { tokenSortRatio } from '../entityResolution';
import { bookConflict, bookEntityKey, canMatchIdentifier } from '../bookMatching';

/** Leader clustering: only accepted evidence contributes to canonical attributes. */
export function executeClusteringStrategy({ allRows, fuzzyHighThreshold = 90, fuzzyConfirmThreshold = 75 }) {
  const sources = [...new Set(allRows.map(r => r.__source || 'unknown'))];
  const entities = sources.flatMap(source => extractUniqueEntitiesFromRows(allRows.filter(r => (r.__source || 'unknown') === source), source));
  const clusters = [];
  const mappings = new Map();
  const key = item => JSON.stringify([item.source, item.entityKey]);
  for (const item of entities) {
    const exact = clusters.filter(c => canMatchIdentifier(item, c.leader));
    const candidates = clusters.filter(c => !bookConflict(item, c.leader))
      .map(cluster => ({ cluster, score: tokenSortRatio(item.ten_sp_norm, cluster.leader.ten_sp_norm) }))
      .filter(c => item.ten_sp_norm && c.cluster.leader.ten_sp_norm && c.score >= fuzzyConfirmThreshold)
      .sort((a,b) => b.score-a.score);
    const best = exact.length === 1 ? {cluster: exact[0], score: 100} : candidates[0];
    if (!best) {
      const canonical = {
        ma_dinh_danh: item.ma_dinh_danh, ten_sp: item.ten_sp, thuong_hieu: item.thuong_hieu,
        gia_chuan: item.gia_chuan, isClustered: true, clusterSize: 1, danh_muc: 'Giữ riêng theo nguồn',
        sources: [item.source],
      };
      const cluster = {leader: item, canonical, members: [item], prices: [...item.prices]};
      clusters.push(cluster);
      mappings.set(key(item), {cluster, matchStatus:'UNRESOLVED', matchScore:0});
      continue;
    }
    const ambiguous = exact.length > 1 || (!exact.length && candidates.length > 1 && best.score - candidates[1].score <= 5);
    const status = exact.length === 1 ? 'MATCHED_EXACT'
      : best.score >= fuzzyHighThreshold && !ambiguous ? 'MATCHED_FUZZY_HIGH' : 'NEEDS_CONFIRMATION';
    mappings.set(key(item), {cluster: best.cluster, matchStatus: status, matchScore: best.score});
    if (status === 'NEEDS_CONFIRMATION') continue;
    const cluster = best.cluster;
    cluster.members.push(item);
    cluster.prices.push(...item.prices);
    cluster.canonical.clusterSize = cluster.members.length;
    cluster.canonical.danh_muc = 'Gom cụm có liên kết';
    if (!cluster.canonical.sources.includes(item.source)) cluster.canonical.sources.push(item.source);
    cluster.canonical.gia_chuan = cluster.prices.length ? Math.round(cluster.prices.reduce((a,b)=>a+b,0)/cluster.prices.length) : 0;
    for (const mapping of mappings.values()) {
      if (mapping.cluster === cluster && mapping.matchStatus === 'UNRESOLVED') {
        mapping.matchStatus = status; mapping.matchScore = best.score;
      }
    }
  }
  const catalog = clusters.map(c => c.canonical);
  const resolved = allRows.map(row => {
    const mapping = mappings.get(JSON.stringify([row.__source || 'unknown', bookEntityKey(row)]));
    return {...row, matched: mapping?.cluster.canonical || null, matchStatus: mapping?.matchStatus || 'UNRESOLVED',
      matchScore: mapping?.matchScore || 0, matchTier: mapping ? 'tier_clustering' : null};
  });
  return {
    strategyKey:'CLUSTERING', strategyLabel:`Cơ chế 2: Gom cụm theo đại diện (${catalog.length} nhóm)`,
    resolved, catalog,
    clustersStats:{totalClusters: catalog.length, multiItemClusters: clusters.filter(c=>c.members.length>1).length},
    stats:{totalRows: resolved.length, catalogSize:catalog.length, matchedCount:resolved.filter(r=>['MATCHED_EXACT','MATCHED_FUZZY_HIGH'].includes(r.matchStatus)).length},
  };
}
