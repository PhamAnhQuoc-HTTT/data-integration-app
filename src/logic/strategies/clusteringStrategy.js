/**
 * Chiến Lược 2: Tự động gom cụm sản phẩm (Clustering Strategy)
 * Sử dụng thuật toán gom cụm Leader-based Agglomerative Clustering dựa trên độ tương đồng tên và mã.
 */
import { normalizeTextForMatching, removeDiacritics, normalizeNumber } from "../normalize";
import { tokenSortRatio, FUZZY_HIGH_THRESHOLD, FUZZY_CONFIRM_THRESHOLD } from "../entityResolution";

export function executeClusteringStrategy({ allRows, fuzzyHighThreshold = 90, fuzzyConfirmThreshold = 75 }) {
  // 1. Trích xuất danh sách thực thể duy nhất
  const uniqueItemsMap = new Map();

  allRows.forEach((r, idx) => {
    const rawTitle = r.ten_sp || "";
    const normTitle = normalizeTextForMatching(rawTitle);
    const rawId = (r.ma_dinh_danh || "").replace(/[\s-]/g, "").toUpperCase();
    const key = rawId ? `ID:${rawId}` : `TITLE:${normTitle}`;
    if (!normTitle && !rawId) return;

    if (!uniqueItemsMap.has(key)) {
      uniqueItemsMap.set(key, {
        key,
        source: r.__source,
        rawTitle,
        normTitle,
        idCode: rawId,
        brand: r.thuong_hieu || "",
        prices: [],
        count: 0,
      });
    }

    const item = uniqueItemsMap.get(key);
    item.count++;
    const p = normalizeNumber(r.gia);
    if (p && p > 0) item.prices.push(p);

    if (rawTitle.length > item.rawTitle.length && removeDiacritics(rawTitle) !== rawTitle) {
      item.rawTitle = rawTitle;
    }
  });

  const uniqueItems = Array.from(uniqueItemsMap.values());
  const clusters = []; // Mảng các cụm { clusterId, leader, members: [] }
  const itemToClusterMap = new Map();

  // 2. Gom cụm dựa trên Mã định danh trước
  const idClustersMap = new Map();
  uniqueItems.forEach((item) => {
    if (item.idCode) {
      if (!idClustersMap.has(item.idCode)) {
        idClustersMap.set(item.idCode, []);
      }
      idClustersMap.get(item.idCode).push(item);
    }
  });

  idClustersMap.forEach((members, idCode) => {
    const leader = members[0];
    const clusterId = `CLUSTER-ID-${idCode}`;
    const clusterObj = { clusterId, leader, members };
    clusters.push(clusterObj);
    members.forEach((m) => itemToClusterMap.set(m.key, clusterObj));
  });

  // 3. Gom cụm các sản phẩm còn lại dựa trên Fuzzy String Similarity
  const remainingItems = uniqueItems.filter((item) => !itemToClusterMap.has(item.key));

  remainingItems.forEach((item) => {
    let bestCluster = null;
    let bestScore = 0;

    for (const cluster of clusters) {
      const leader = cluster.leader;
      if (!leader.normTitle || !item.normTitle) continue;

      const score = tokenSortRatio(item.normTitle, leader.normTitle);
      if (score > bestScore && score >= fuzzyConfirmThreshold) {
        bestScore = score;
        bestCluster = cluster;
      }
    }

    if (bestCluster && bestScore >= fuzzyConfirmThreshold) {
      bestCluster.members.push(item);
      itemToClusterMap.set(item.key, bestCluster);
    } else {
      // Tạo cụm mới với chính item này làm Leader
      const newClusterId = `CLUSTER-FUZZY-${clusters.length + 1}`;
      const newCluster = {
        clusterId: newClusterId,
        leader: item,
        members: [item],
      };
      clusters.push(newCluster);
      itemToClusterMap.set(item.key, newCluster);
    }
  });

  // 4. Tổng hợp Master Catalog đại diện cho từng cụm (Canonical Synthesis)
  const catalog = clusters.map((cluster, cIdx) => {
    // Chọn tên đại diện giàu thông tin nhất trong cụm
    let chosenTitle = cluster.leader.rawTitle;
    let chosenId = cluster.leader.idCode || `CLU-${String(cIdx + 1).padStart(4, "0")}`;
    let chosenBrand = cluster.leader.brand;
    let allPrices = [];

    cluster.members.forEach((m) => {
      if (m.rawTitle.length > chosenTitle.length && removeDiacritics(m.rawTitle) !== m.rawTitle) {
        chosenTitle = m.rawTitle;
      }
      if (!chosenId && m.idCode) chosenId = m.idCode;
      if (!chosenBrand && m.brand) chosenBrand = m.brand;
      allPrices = allPrices.concat(m.prices);
    });

    const avgPrice = allPrices.length > 0 ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length) : 0;

    const canonicalProduct = {
      ma_dinh_danh: chosenId,
      ten_sp: chosenTitle,
      thuong_hieu: chosenBrand,
      danh_muc: "Gom cụm tự động",
      gia_chuan: avgPrice,
      isClustered: true,
      clusterSize: cluster.members.length,
    };

    cluster.canonical = canonicalProduct;
    return canonicalProduct;
  });

  // 5. Ánh xạ từng dòng giao dịch vào đại diện của cụm
  const resolved = allRows.map((row) => {
    const rawId = (row.ma_dinh_danh || "").replace(/[\s-]/g, "").toUpperCase();
    const normTitle = normalizeTextForMatching(row.ten_sp);
    const key = rawId ? `ID:${rawId}` : `TITLE:${normTitle}`;

    const cluster = itemToClusterMap.get(key);
    if (cluster) {
      const matchScore = row.ten_sp === cluster.canonical.ten_sp ? 100 : tokenSortRatio(normalizeTextForMatching(row.ten_sp), normalizeTextForMatching(cluster.canonical.ten_sp));
      const status = matchScore >= fuzzyHighThreshold ? "MATCHED_FUZZY_HIGH" : "MATCHED_EXACT";

      return {
        ...row,
        matched: cluster.canonical,
        matchStatus: status,
        matchScore,
        matchTier: "tier_clustering",
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
    strategyKey: "CLUSTERING",
    strategyLabel: `Cơ chế 2: Tự động gom cụm (${clusters.length} cụm phát hiện)`,
    resolved,
    catalog,
    clustersStats: {
      totalClusters: clusters.length,
      multiItemClusters: clusters.filter((c) => c.members.length > 1).length,
    },
    stats: {
      totalRows: resolved.length,
      catalogSize: catalog.length,
      matchedCount: resolved.filter((r) => r.matchStatus === "MATCHED_EXACT" || r.matchStatus === "MATCHED_FUZZY_HIGH").length,
    },
  };
}
