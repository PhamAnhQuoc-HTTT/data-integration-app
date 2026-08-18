/**
 * Bipartite Optimal Matching & Progressive Crosswalk Engine
 * (Cơ chế 3: Ghép cặp tối ưu toàn cục + Cơ chế 4: Danh mục tích lũy dần)
 * 
 * Áp dụng khi người dùng KHÔNG CÓ file danh mục sản phẩm chuẩn (Master Catalog).
 * Tự động đối chiếu chéo giữa các nguồn đơn hàng (ví dụ: POS vs Shopee / Lazada),
 * giải quyết triệt để vấn đề tranh chấp khớp (conflicts), và tích lũy tri thức
 * từ các lần xác nhận thủ công của người dùng qua Progressive Crosswalk.
 */

import { normalizeTextForMatching, normalizeText, normalizeNumber, removeDiacritics } from "./normalize";
import { tokenSortRatio, FUZZY_HIGH_THRESHOLD, FUZZY_CONFIRM_THRESHOLD } from "./entityResolution";

const STORAGE_KEY_PROGRESSIVE_CROSSWALK = "sales_data_progressive_crosswalk_v1";

/**
 * Lấy danh sách Crosswalk đã tích lũy từ LocalStorage (Cơ chế 4)
 */
export function getProgressiveCrosswalk() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const data = localStorage.getItem(STORAGE_KEY_PROGRESSIVE_CROSSWALK);
      return data ? JSON.parse(data) : [];
    }
  } catch (e) {
    console.warn("Không thể đọc Progressive Crosswalk từ localStorage:", e);
  }
  return [];
}

/**
 * Lưu 1 cặp khớp mới vào Progressive Crosswalk khi người dùng bấm xác nhận thủ công
 */
export function saveProgressiveCrosswalkPair(keyA, keyB, canonicalProduct) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const current = getProgressiveCrosswalk();
      const normA = normalizeTextForMatching(keyA);
      const normB = normalizeTextForMatching(keyB);
      
      // Xóa bản ghi cũ nếu đã có
      const filtered = current.filter(
        (item) => !(item.normA === normA && item.normB === normB) && !(item.normA === normB && item.normB === normA)
      );

      filtered.push({
        keyA,
        keyB,
        normA,
        normB,
        canonical: canonicalProduct,
        timestamp: new Date().toISOString(),
      });

      localStorage.setItem(STORAGE_KEY_PROGRESSIVE_CROSSWALK, JSON.stringify(filtered));
      return true;
    }
  } catch (e) {
    console.warn("Không thể lưu Progressive Crosswalk:", e);
  }
  return false;
}

/**
 * Xóa toàn bộ bộ nhớ Progressive Crosswalk (để reset thử nghiệm)
 */
export function clearProgressiveCrosswalk() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY_PROGRESSIVE_CROSSWALK);
      return true;
    }
  } catch (e) {
    console.warn("Không thể xóa Progressive Crosswalk:", e);
  }
  return false;
}

/**
 * Trích xuất danh sách các thực thể sản phẩm duy nhất (Unique Entities) từ 1 nguồn đơn hàng
 */
export function extractUniqueEntitiesFromRows(rows, sourceLabel) {
  const entityMap = new Map();

  rows.forEach((r, idx) => {
    const rawTitle = r.ten_sp || "";
    const normTitle = normalizeTextForMatching(rawTitle);
    const rawId = (r.ma_dinh_danh || "").replace(/[\s-]/g, "").toUpperCase();
    
    // Khóa phân nhóm: ưu tiên mã định danh, nếu không có thì dùng tên chuẩn hóa
    const entityKey = rawId ? `ID:${rawId}` : `TITLE:${normTitle}`;
    if (!normTitle && !rawId) return;

    if (!entityMap.has(entityKey)) {
      entityMap.set(entityKey, {
        entityKey,
        source: sourceLabel,
        ma_dinh_danh: rawId || "",
        ten_sp: rawTitle,
        ten_sp_norm: normTitle,
        thuong_hieu: r.thuong_hieu || "",
        prices: [],
        count: 0,
        originalRowsIndices: [idx],
      });
    }

    const item = entityMap.get(entityKey);
    item.count++;
    item.originalRowsIndices.push(idx);
    
    const p = normalizeNumber(r.gia);
    if (p !== null && p > 0) item.prices.push(p);

    // Cập nhật tên hiển thị giàu thông tin nhất (có dấu tiếng Việt, dài hơn)
    if (rawTitle.length > item.ten_sp.length && removeDiacritics(rawTitle) !== rawTitle) {
      item.ten_sp = rawTitle;
    }
    if (!item.thuong_hieu && r.thuong_hieu) {
      item.thuong_hieu = r.thuong_hieu;
    }
  });

  return Array.from(entityMap.values()).map((e) => {
    // Tính giá trung vị/trung bình của sản phẩm trong nguồn
    let avgPrice = 0;
    if (e.prices.length > 0) {
      const sum = e.prices.reduce((a, b) => a + b, 0);
      avgPrice = Math.round(sum / e.prices.length);
    }
    return {
      ...e,
      gia_chuan: avgPrice,
    };
  });
}

/**
 * Cơ chế 3: Ghép cặp tối ưu toàn cục (Bipartite Matching with Conflict Resolution)
 * Kết hợp Cơ chế 4 (Progressive Crosswalk Memory)
 * 
 * @param {Array} entitiesA - Danh sách thực thể từ Nguồn A
 * @param {Array} entitiesB - Danh sách thực thể từ Nguồn B
 * @param {Object} options - Cấu hình (threshold, progressive crosswalk)
 */
export function matchBipartiteEntities(entitiesA, entitiesB, options = {}) {
  const crosswalkMemory = options.crosswalkMemory || getProgressiveCrosswalk();
  const highThreshold = options.fuzzyHighThreshold || FUZZY_HIGH_THRESHOLD;
  const confirmThreshold = options.fuzzyConfirmThreshold || FUZZY_CONFIRM_THRESHOLD;

  const matchedPairs = [];
  const matchedSetA = new Set();
  const matchedSetB = new Set();

  // -------------------------------------------------------------
  // Bước 1: Kiểm tra Progressive Crosswalk (Cơ chế 4 - Tích lũy dần)
  // -------------------------------------------------------------
  for (const itemA of entitiesA) {
    for (const itemB of entitiesB) {
      if (matchedSetA.has(itemA.entityKey) || matchedSetB.has(itemB.entityKey)) continue;

      const inMemory = crosswalkMemory.some((cw) => {
        const matchAB =
          (cw.normA === itemA.ten_sp_norm && cw.normB === itemB.ten_sp_norm) ||
          (cw.normA === itemB.ten_sp_norm && cw.normB === itemA.ten_sp_norm);
        return matchAB;
      });

      if (inMemory) {
        matchedPairs.push({
          entityA: itemA,
          entityB: itemB,
          score: 100,
          method: "PROGRESSIVE_CROSSWALK",
          status: "MATCHED_EXACT",
          tier: "tier_progressive_crosswalk",
        });
        matchedSetA.add(itemA.entityKey);
        matchedSetB.add(itemB.entityKey);
      }
    }
  }

  // -------------------------------------------------------------
  // Bước 2: Khớp chính xác theo Mã định danh (ISBN/Barcode)
  // -------------------------------------------------------------
  for (const itemA of entitiesA) {
    if (matchedSetA.has(itemA.entityKey) || !itemA.ma_dinh_danh) continue;

    for (const itemB of entitiesB) {
      if (matchedSetB.has(itemB.entityKey) || !itemB.ma_dinh_danh) continue;

      if (itemA.ma_dinh_danh === itemB.ma_dinh_danh) {
        matchedPairs.push({
          entityA: itemA,
          entityB: itemB,
          score: 100,
          method: "EXACT_IDENTIFIER",
          status: "MATCHED_EXACT",
          tier: "tier1_exact_id",
        });
        matchedSetA.add(itemA.entityKey);
        matchedSetB.add(itemB.entityKey);
        break;
      }
    }
  }

  // -------------------------------------------------------------
  // Bước 3: Ghép cặp tối ưu toàn cục (Bipartite Conflict-Free Matching)
  // Tính ma trận tương đồng cho tất cả các cặp còn lại và phân bổ tối ưu
  // -------------------------------------------------------------
  const candidatePairs = [];

  for (const itemA of entitiesA) {
    if (matchedSetA.has(itemA.entityKey) || !itemA.ten_sp_norm) continue;

    for (const itemB of entitiesB) {
      if (matchedSetB.has(itemB.entityKey) || !itemB.ten_sp_norm) continue;

      const score = tokenSortRatio(itemA.ten_sp_norm, itemB.ten_sp_norm);
      if (score >= confirmThreshold) {
        candidatePairs.push({
          entityA: itemA,
          entityB: itemB,
          score,
        });
      }
    }
  }

  // Sắp xếp các cặp theo điểm tương đồng giảm dần (Best-First Global Optimal Assignment)
  candidatePairs.sort((a, b) => b.score - a.score);

  for (const pair of candidatePairs) {
    const keyA = pair.entityA.entityKey;
    const keyB = pair.entityB.entityKey;

    // Loại trừ tranh chấp khớp: nếu 1 trong 2 đã được ghép với thực thể tốt hơn trước đó, bỏ qua
    if (matchedSetA.has(keyA) || matchedSetB.has(keyB)) {
      continue;
    }

    const status = pair.score >= highThreshold ? "MATCHED_FUZZY_HIGH" : "NEEDS_CONFIRMATION";
    const tier = pair.score >= highThreshold ? "tier3_fuzzy_high" : "tier3_fuzzy_confirm";

    matchedPairs.push({
      entityA: pair.entityA,
      entityB: pair.entityB,
      score: pair.score,
      method: "BIPARTITE_FUZZY",
      status,
      tier,
    });

    matchedSetA.add(keyA);
    matchedSetB.add(keyB);
  }

  // -------------------------------------------------------------
  // Bước 4: Tập hợp các thực thể không khớp (Đặc thù của từng nguồn)
  // -------------------------------------------------------------
  const unmatchedA = entitiesA.filter((e) => !matchedSetA.has(e.entityKey));
  const unmatchedB = entitiesB.filter((e) => !matchedSetB.has(e.entityKey));

  return {
    matchedPairs,
    unmatchedA,
    unmatchedB,
  };
}

/**
 * Tự động tổng hợp Master Catalog từ kết quả ghép cặp tối ưu (Canonical Synthesis)
 */
export function synthesizeCanonicalCatalog(bipartiteResult) {
  const catalog = [];
  const entityToCanonicalMap = new Map();

  // 1. Tổng hợp từ các cặp đã khớp
  bipartiteResult.matchedPairs.forEach((pair, idx) => {
    const a = pair.entityA;
    const b = pair.entityB;

    // Chọn tên giàu thông tin nhất
    const chosenTitle = a.ten_sp.length >= b.ten_sp.length ? a.ten_sp : b.ten_sp;
    const chosenId = a.ma_dinh_danh || b.ma_dinh_danh || `GEN-${String(idx + 1).padStart(4, "0")}`;
    const chosenBrand = a.thuong_hieu || b.thuong_hieu || "";
    
    // Giá tham chiếu: lấy trung bình các nguồn có giá
    const validPrices = [a.gia_chuan, b.gia_chuan].filter((p) => p > 0);
    const avgPrice = validPrices.length > 0 ? Math.round(validPrices.reduce((x, y) => x + y, 0) / validPrices.length) : 0;

    const canonicalEntry = {
      ma_dinh_danh: chosenId,
      ten_sp: chosenTitle,
      thuong_hieu: chosenBrand,
      danh_muc: "Tổng hợp đa kênh",
      gia_chuan: avgPrice,
      isSynthesized: true,
      matchStatus: pair.status,
      matchScore: pair.score,
      matchMethod: pair.method,
      matchTier: pair.tier,
      sources: [a.source, b.source],
    };

    catalog.push(canonicalEntry);
    entityToCanonicalMap.set(`${a.source}|${a.entityKey}`, { canonical: canonicalEntry, matchStatus: pair.status, matchScore: pair.score });
    entityToCanonicalMap.set(`${b.source}|${b.entityKey}`, { canonical: canonicalEntry, matchStatus: pair.status, matchScore: pair.score });
  });

  // 2. Thêm các sản phẩm chỉ có ở nguồn A
  bipartiteResult.unmatchedA.forEach((a) => {
    const canonicalEntry = {
      ma_dinh_danh: a.ma_dinh_danh || "",
      ten_sp: a.ten_sp,
      thuong_hieu: a.thuong_hieu || "",
      danh_muc: "Đặc thù nguồn",
      gia_chuan: a.gia_chuan || 0,
      isSynthesized: true,
      matchStatus: "UNRESOLVED",
      matchScore: 0,
      matchMethod: "SOURCE_EXCLUSIVE",
      sources: [a.source],
    };
    catalog.push(canonicalEntry);
    entityToCanonicalMap.set(`${a.source}|${a.entityKey}`, { canonical: canonicalEntry, matchStatus: "UNRESOLVED", matchScore: 0 });
  });

  // 3. Thêm các sản phẩm chỉ có ở nguồn B
  bipartiteResult.unmatchedB.forEach((b) => {
    const canonicalEntry = {
      ma_dinh_danh: b.ma_dinh_danh || "",
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
    catalog.push(canonicalEntry);
    entityToCanonicalMap.set(`${b.source}|${b.entityKey}`, { canonical: canonicalEntry, matchStatus: "UNRESOLVED", matchScore: 0 });
  });

  return {
    catalog,
    entityToCanonicalMap,
  };
}
