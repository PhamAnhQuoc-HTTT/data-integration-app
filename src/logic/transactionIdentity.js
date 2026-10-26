import { normalizeNumber, normalizeOrderId, normalizeText, removeDiacritics } from './normalize';

const scopeText = v => removeDiacritics(normalizeText(v) || '').toLowerCase();
const id = v => normalizeOrderId(v) || '';
const textKey = v => (normalizeText(v) || '').toLowerCase();

/** A file identifies an export, not a shop. Missing shop scope is never proof
 * of a duplicate. Keep all rows; hold colliding fully scoped line IDs. */
export function annotateDuplicateReview(rows) {
  const groups = new Map();
  const output = rows.map(row => ({ ...row, duplicateStatus: 'NONE', duplicateGroupId: null, duplicateFirst: false }));
  output.forEach((row, index) => {
    if (!id(row.ma_don)) return;
    const system = scopeText(row.sourceSystem || row.kenh);
    const shop = id(row.shopId);
    const line = id(row.sourceOrderLineId);
    const strong = Boolean(system && shop && line);
    const key = strong ? JSON.stringify(['LINE', system, shop, id(row.ma_don), line])
      : JSON.stringify(['POSSIBLE', system || 'UNSPECIFIED_SYSTEM', shop, id(row.ma_don), line,
        row.ma_dinh_danh || textKey(row.ten_sp), textKey(row.phan_loai), row.ngay,
        normalizeNumber(row.so_luong), row.__priceBasis === 'PRODUCT_LINE_AFTER_DISCOUNT' ? row.gia_dong : normalizeNumber(row.gia), textKey(row.trang_thai)]);
    if (!groups.has(key)) groups.set(key, { strong, indices: [] });
    groups.get(key).indices.push(index);
  });
  for (const [key, { strong, indices }] of groups) {
    if (indices.length < 2) continue;
    indices.forEach((index, position) => Object.assign(output[index], {
      duplicateStatus: strong ? 'REVIEW_REQUIRED' : 'POSSIBLE_DUPLICATE',
      duplicateGroupId: key, duplicateFirst: position === 0,
    }));
  }
  return output;
}
