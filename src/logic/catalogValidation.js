import { normalizeIdCode, normalizeNumber, normalizeText } from './normalize';

export function validateCatalog(rows) {
  const byId = new Map();
  const result = [];
  for (const row of rows) {
    const id = normalizeIdCode(row.ma_dinh_danh);
    const fingerprint = JSON.stringify([normalizeText(row.ten_sp), normalizeText(row.thuong_hieu), normalizeNumber(row.gia_chuan)]);
    if (id && byId.has(id)) {
      if (byId.get(id) !== fingerprint) throw new Error(`Danh mục mâu thuẫn: mã ${id} có nhiều tên, nhà xuất bản hoặc giá tham chiếu. Hãy đối soát danh mục trước khi chạy.`);
      continue;
    }
    if (id) byId.set(id, fingerprint);
    result.push({...row, ma_dinh_danh: id || ''});
  }
  return result;
}
