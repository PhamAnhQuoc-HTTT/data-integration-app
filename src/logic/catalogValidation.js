import { normalizeIdCode, normalizeNumber, normalizeText } from './normalize';

export function validateCatalog(rows, { sourceVariants = false } = {}) {
  const byId = new Map();
  const result = [];
  for (const row of rows) {
    const id = normalizeIdCode(row.ma_dinh_danh);
    // Only source-generated catalogs can carry multiple variants of the same SKU.
    const key = sourceVariants && row.__sourceEntityKey ? JSON.stringify([id, row.__sourceEntityKey]) : id;
    const fingerprint = JSON.stringify([normalizeText(row.ten_sp), normalizeText(row.thuong_hieu), normalizeNumber(row.gia_chuan), normalizeText(row.phan_loai)]);
    if (id && byId.has(key)) {
      if (byId.get(key) !== fingerprint) throw new Error(`Danh mục mâu thuẫn: mã ${id} có nhiều tên, nhà xuất bản hoặc giá tham chiếu. Hãy đối soát danh mục trước khi chạy.`);
      continue;
    }
    if (id) byId.set(key, fingerprint);
    const canonicalEntityId = sourceVariants && row.__sourceEntityKey
      ? `SOURCE_ENTITY:${row.__sourceEntityKey}` : id ? `ID:${id}` : `CATALOG_RECORD:${fingerprint}`;
    result.push({...row, ma_dinh_danh: id || '', canonicalEntityId});
  }
  return result;
}
