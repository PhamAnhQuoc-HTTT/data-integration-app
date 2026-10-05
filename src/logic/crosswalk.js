import { normalizeIdCode, removeDiacritics } from './normalize';

/** Codes must be globally unambiguous within the supplied crosswalk. */
export function parseCrosswalk(headers, rows) {
  const normalized = headers.map(h => removeDiacritics(h).toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim());
  const internal = normalized.findIndex(h => ['internal code','ma noi bo','sku nguon'].includes(h));
  const standard = normalized.findIndex(h => ['standard code','ma chuan','isbn'].includes(h));
  const source = normalized.findIndex(h => ['source','nguon','ten tep','file name'].includes(h));
  if (internal < 0 || standard < 0) throw new Error('Crosswalk cần cột internal_code và standard_code (hoặc Mã nội bộ và Mã chuẩn).');
  const entries = [];
  for (const row of rows) {
    if (!row.some(v => String(v ?? '').trim())) continue;
    const key = normalizeIdCode(row[internal]), target = normalizeIdCode(row[standard]);
    if (!key || !target) throw new Error('Crosswalk có dòng thiếu mã nguồn hoặc mã chuẩn.');
    entries.push({internal_code: key, standard_code: target, ...(source >= 0 && row[source] ? {source: String(row[source]).trim()} : {})});
  }
  return validateCrosswalk(entries);
}

export const sourceKey = value => String(value || '').normalize('NFC').trim().toLowerCase();

export function validateCrosswalk(entries, catalogIds = null) {
  const seen = new Map();
  for (const entry of entries) {
    const internal_code = normalizeIdCode(entry.internal_code);
    const standard_code = normalizeIdCode(entry.standard_code || entry.isbn);
    if (!internal_code || !standard_code) throw new Error('Crosswalk có dòng thiếu mã nguồn hoặc mã chuẩn.');
    const key = JSON.stringify([sourceKey(entry.source), internal_code]);
    if (seen.has(key) && seen.get(key).standard_code !== standard_code) throw new Error('Crosswalk mâu thuẫn: một mã nguồn trỏ đến nhiều mã chuẩn.');
    if (catalogIds && !catalogIds.has(standard_code)) throw new Error(`Crosswalk: mã đích ${standard_code} không tồn tại trong danh mục đối chiếu.`);
    seen.set(key, {internal_code, standard_code, ...(entry.source ? {source: String(entry.source).trim()} : {})});
  }
  const values = [...seen.values()];
  for (const entry of values.filter(e => e.source)) {
    const global = seen.get(JSON.stringify(['', entry.internal_code]));
    if (global && global.standard_code !== entry.standard_code) throw new Error('Crosswalk mâu thuẫn giữa ánh xạ chung và ánh xạ theo nguồn. Hãy khai báo nguồn cho từng mã.');
  }
  return values;
}
