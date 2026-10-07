import { removeDiacritics, normalizeIdCode } from './normalize';

// Identity retains edition/binding notes; fuzzy search may discard annotations separately.
export function bookTitleKey(value) {
  return removeDiacritics(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function bookVariantKey(row) {
  const variant = bookTitleKey(row.phan_loai);
  return /\b(combo|boxset|tron bo|bia cung|bia mem)\b/.test(variant) ? variant : '';
}

export function bookEntityKey(row) {
  const id = normalizeIdCode(row.ma_dinh_danh);
  const identityVariant = bookVariantKey(row);
  return id ? `ID:${id}${identityVariant ? ':VARIANT:' + identityVariant : ''}` : `TITLE:${bookTitleKey(row.ten_sp)}:${identityVariant}`;
}

export function isSharedBookId(value) {
  return /^(978|979)\d{10}$/.test(normalizeIdCode(value) || '');
}

export function canMatchIdentifier(a, b) {
  const id = normalizeIdCode(a.ma_dinh_danh);
  return Boolean(id && id === normalizeIdCode(b.ma_dinh_danh) &&
    (isSharedBookId(id) || (a.source && a.source === b.source)) && !bookConflict(a, b));
}

// Different editions/volumes must never be auto-linked solely by title similarity.
export function bookConflict(a, b) {
  const title = x => removeDiacritics(`${x.ten_sp || ''} ${x.phan_loai || ''}`).toLowerCase();
  const x = title(a), y = title(b);
  const ids = [a, b].map(v => normalizeIdCode(v.ma_dinh_danh));
  if (ids.every(v => /^(978|979)\d{10}$/.test(v || '')) && ids[0] !== ids[1]) return true;
  const numbers = s => (s.match(/\d+/g) || []).join('|');
  if (numbers(x) && numbers(y) && numbers(x) !== numbers(y)) return true;
  if ((x.includes('bia cung') && y.includes('bia mem')) || (y.includes('bia cung') && x.includes('bia mem'))) return true;
  if (/\b(combo|boxset|tron bo)\b/.test(x) !== /\b(combo|boxset|tron bo)\b/.test(y)) return true;
  return false;
}
