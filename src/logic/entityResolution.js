/**
 * Entity Resolution — đối chiếu sản phẩm về danh mục chuẩn theo chiến lược 3 tầng:
 *   Tầng 1: khớp mã định danh chuẩn (chính xác tuyệt đối)
 *   Tầng 2: crosswalk mã nội bộ ↔ mã chuẩn (tùy chọn — dùng khi nguồn dùng mã riêng)
 *   Tầng 3: fuzzy matching theo tên khi không có mã hoặc mã không khớp
 *
 * Kết quả phân theo 4 trạng thái:
 *   MATCHED_EXACT       : khớp chắc chắn (tầng 1 hoặc 2)
 *   MATCHED_FUZZY_HIGH   : fuzzy match điểm cao -> chấp nhận nhưng vẫn gắn nhãn để truy vết
 *   NEEDS_CONFIRMATION  : fuzzy match điểm trung bình -> cần người dùng xác nhận thủ công
 *   UNRESOLVED          : không tìm được ứng viên phù hợp -> gắn cờ
 *
 * Ngưỡng (thang 0-100) CẦN tinh chỉnh lại khi có dữ liệu thật + ground truth thủ công
 * (đo Precision/Recall/F1), hiện đặt tạm theo kinh nghiệm.
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
 * catalog: mảng {isbn (hoặc ma_dinh_danh), title (hoặc ten_sp)}
 * crosswalk: mảng tùy chọn {internal_code, isbn} — chưa có dữ liệu thật nên mặc định rỗng
 */
export function resolveEntities(rows, catalog, { idField = "ma_dinh_danh", titleField = "ten_sp", crosswalk = [] } = {}) {
  const catalogById = new Map();
  catalog.forEach((c) => {
    const key = c[idField] ? String(c[idField]).replace(/[\s-]/g, "").toUpperCase() : null;
    if (key) catalogById.set(key, c);
  });
  const crosswalkById = new Map();
  crosswalk.forEach((c) => {
    if (c.internal_code) crosswalkById.set(String(c.internal_code).toUpperCase(), c.isbn);
  });
  const catalogWithKeys = catalog.map((c) => ({
    ...c,
    __matchKey: normalizeTextForMatching(c[titleField]),
  }));

  return rows.map((row) => {
    const idKey = row[idField] ? String(row[idField]).replace(/[\s-]/g, "").toUpperCase() : null;
    let matched = null, status = "UNRESOLVED", score = 0, tier = null;

    // Tầng 1: khớp mã định danh chính xác
    if (idKey && catalogById.has(idKey)) {
      matched = catalogById.get(idKey);
      status = "MATCHED_EXACT"; score = 100; tier = "tier1_id_exact";
    }

    // Tầng 2: crosswalk mã nội bộ (nếu tầng 1 chưa khớp)
    if (status === "UNRESOLVED" && idKey && crosswalkById.has(idKey)) {
      const mappedIsbn = crosswalkById.get(idKey);
      const hit = catalogById.get(String(mappedIsbn).toUpperCase());
      if (hit) {
        matched = hit; status = "MATCHED_EXACT"; score = 100; tier = "tier2_crosswalk";
      }
    }

    // Tầng 3: fuzzy matching theo tên
    if (status === "UNRESOLVED") {
      const rowKey = normalizeTextForMatching(row[titleField]);
      if (rowKey) {
        let best = null, bestScore = 0;
        for (const c of catalogWithKeys) {
          if (!c.__matchKey) continue;
          const s = tokenSortRatio(rowKey, c.__matchKey);
          if (s > bestScore) { bestScore = s; best = c; }
        }
        if (best && bestScore >= FUZZY_CONFIRM_THRESHOLD) {
          matched = best; score = bestScore;
          if (bestScore >= FUZZY_HIGH_THRESHOLD) { status = "MATCHED_FUZZY_HIGH"; tier = "tier3_fuzzy_high"; }
          else { status = "NEEDS_CONFIRMATION"; tier = "tier3_fuzzy_confirm"; }
        }
      }
    }

    return { ...row, matched, matchStatus: status, matchScore: score, matchTier: tier };
  });
}
