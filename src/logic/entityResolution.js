/**
 * Entity Resolution — đối chiếu sản phẩm về danh mục chuẩn theo chiến lược 3 tầng:
 *   Tầng 1: Khớp mã định danh chuẩn (Exact ID: ISBN-13 / Barcode / SKU)
 *   Tầng 2: Tra cứu bảng Crosswalk / Mã nội bộ (Crosswalk Matching)
 *   Tầng 3: Khớp mờ theo tên sản phẩm (Fuzzy Token-Sort Ratio Matching)
 *
 * Kết quả phân theo 4 trạng thái:
 *   MATCHED_EXACT       : Khớp chắc chắn (Tầng 1 hoặc Tầng 2)
 *   MATCHED_FUZZY_HIGH  : Khớp mờ điểm cao (>= 90%) -> Tự động chấp nhận
 *   NEEDS_CONFIRMATION  : Khớp mờ điểm trung bình (70% - 90%) -> Cần người dùng xác nhận thủ công
 *   UNRESOLVED          : Không tìm được ứng viên phù hợp -> Gắn cờ
 *
 * Phục vụ trực tiếp cho Câu hỏi nghiên cứu 2 (RQ2):
 * Đánh giá mức độ cải thiện của Phương pháp đối chiếu nhiều tầng so với Exact Matching đơn thuần.
 */
import { normalizeTextForMatching } from "./normalize";

export const FUZZY_HIGH_THRESHOLD = 90;
export const FUZZY_CONFIRM_THRESHOLD = 70;

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** token_sort_ratio: sắp xếp các từ theo thứ tự alphabet trước khi so khớp — không phụ thuộc thứ tự từ. */
export function tokenSortRatio(a, b) {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const sortTokens = (s) => s.split(" ").filter(Boolean).sort().join(" ");
  const sa = sortTokens(a), sb = sortTokens(b);
  if (sa === sb) return 100;
  const dist = levenshtein(sa, sb);
  const maxLen = Math.max(sa.length, sb.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - dist / maxLen) * 100);
}

/**
 * catalog: mảng {ma_dinh_danh, ten_sp, ...}
 * crosswalk: mảng {internal_code, standard_code}
 */
export function resolveEntities(
  rows,
  catalog,
  {
    idField = "ma_dinh_danh",
    titleField = "ten_sp",
    crosswalk = [],
    fuzzyHighThreshold = FUZZY_HIGH_THRESHOLD,
    fuzzyConfirmThreshold = FUZZY_CONFIRM_THRESHOLD,
  } = {}
) {
  const catalogById = new Map();
  catalog.forEach((c) => {
    const key = c[idField] ? String(c[idField]).replace(/[\s-]/g, "").toUpperCase() : null;
    if (key) catalogById.set(key, c);
  });

  const crosswalkById = new Map();
  crosswalk.forEach((c) => {
    if (c.internal_code) {
      crosswalkById.set(String(c.internal_code).toUpperCase(), c.standard_code || c.isbn);
    }
  });

  const catalogWithKeys = catalog.map((c) => ({
    ...c,
    __matchKey: normalizeTextForMatching(c[titleField]),
  }));

  let exactOnlyMatchesCount = 0;
  let tier1Count = 0;
  let tier2Count = 0;
  let tier3HighCount = 0;
  let tier3ConfirmCount = 0;
  let unresolvedCount = 0;

  const resolvedRows = rows.map((row) => {
    const idKey = row[idField] ? String(row[idField]).replace(/[\s-]/g, "").toUpperCase() : null;
    let matched = null;
    let status = "UNRESOLVED";
    let score = 0;
    let tier = null;

    // Baseline Exact Matching (Để đánh giá so sánh RQ2)
    const canExactMatch = Boolean(idKey && catalogById.has(idKey));
    if (canExactMatch) {
      exactOnlyMatchesCount++;
    }

    // Tầng 1: Khớp mã định danh chính xác (Exact Identifier)
    if (idKey && catalogById.has(idKey)) {
      matched = catalogById.get(idKey);
      status = "MATCHED_EXACT";
      score = 100;
      tier = "tier1_id_exact";
      tier1Count++;
    }

    // Tầng 2: Crosswalk mã nội bộ (nếu tầng 1 chưa khớp)
    if (status === "UNRESOLVED" && idKey && crosswalkById.has(idKey)) {
      const mappedStandardId = crosswalkById.get(idKey);
      const hit = catalogById.get(String(mappedStandardId).toUpperCase());
      if (hit) {
        matched = hit;
        status = "MATCHED_EXACT";
        score = 100;
        tier = "tier2_crosswalk";
        tier2Count++;
      }
    }

    // Tầng 3: Fuzzy Matching theo tên sản phẩm
    if (status === "UNRESOLVED") {
      const rowKey = normalizeTextForMatching(row[titleField]);
      if (rowKey) {
        let best = null;
        let bestScore = 0;
        for (const c of catalogWithKeys) {
          if (!c.__matchKey) continue;
          const s = tokenSortRatio(rowKey, c.__matchKey);
          if (s > bestScore) {
            bestScore = s;
            best = c;
          }
        }
        if (best && bestScore >= fuzzyConfirmThreshold) {
          matched = best;
          score = bestScore;
          if (bestScore >= fuzzyHighThreshold) {
            status = "MATCHED_FUZZY_HIGH";
            tier = "tier3_fuzzy_high";
            tier3HighCount++;
          } else {
            status = "NEEDS_CONFIRMATION";
            tier = "tier3_fuzzy_confirm";
            tier3ConfirmCount++;
          }
        }
      }
    }

    if (status === "UNRESOLVED") {
      unresolvedCount++;
    }

    return {
      ...row,
      matched,
      matchStatus: status,
      matchScore: score,
      matchTier: tier,
      _exactMatchOnly: canExactMatch,
    };
  });

  const totalRows = rows.length;
  const multiTierMatchesCount = tier1Count + tier2Count + tier3HighCount;
  const multiTierTotalLinked = multiTierMatchesCount + tier3ConfirmCount;

  const stats = {
    totalRows,
    exactOnlyMatchesCount,
    exactMatchRate: totalRows > 0 ? Math.round((exactOnlyMatchesCount / totalRows) * 100) : 0,
    multiTierMatchesCount,
    multiTierMatchRate: totalRows > 0 ? Math.round((multiTierMatchesCount / totalRows) * 100) : 0,
    multiTierTotalLinked,
    multiTierTotalLinkedRate: totalRows > 0 ? Math.round((multiTierTotalLinked / totalRows) * 100) : 0,
    improvementRate: totalRows > 0 ? Math.round(((multiTierTotalLinked - exactOnlyMatchesCount) / totalRows) * 100) : 0,
    breakdown: {
      tier1_exact: tier1Count,
      tier2_crosswalk: tier2Count,
      tier3_fuzzy_high: tier3HighCount,
      tier3_fuzzy_confirm: tier3ConfirmCount,
      unresolved: unresolvedCount,
    },
  };

  // Trả về mảng resolvedRows và đính kèm thuộc tính stats
  resolvedRows.stats = stats;
  resolvedRows.rows = resolvedRows;
  return resolvedRows;
}
