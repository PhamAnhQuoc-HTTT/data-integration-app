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
    ((a.sourceCodeType !== 'INTERNAL' && b.sourceCodeType !== 'INTERNAL' && isSharedBookId(id)) || (a.source && a.source === b.source)) && !bookConflict(a, b));
}

export function bookFeatures(row) {
  const value = bookTitleKey(`${row.ten_sp || ''} ${row.phan_loai || ''}`);
  const collect = pattern => [...new Set([...value.matchAll(pattern)].map(m => m[1]))].sort().join('|');
  const volumeText = `${row.ten_sp || ''} ${row.phan_loai || ''}`.normalize('NFC');
  const volumePattern = /\b(?:tập|tap|vol(?:ume)?|quyển|quyen|phần|phan)\s*(\d+|\p{L}+)(?![\p{L}\p{N}_])/giu;
  const roman = /^(?=[MDCLXVI]+$)M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/;
  const volumeMatches = [...volumeText.matchAll(volumePattern)].filter(m => /^\d+$/.test(m[1]) || (roman.test(m[1]) && /\s$/.test(m[0].slice(0, -m[1].length))));
  const volumeNumber = text => {
    if (/^\d+$/.test(text)) return String(Number(text));
    const digits = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
    const lower = text.toLowerCase();
    return String([...lower].reduce((sum, ch, i) => sum + (digits[ch] < (digits[lower[i + 1]] || 0) ? -digits[ch] : digits[ch]), 0));
  };
  return {
    volume: [...new Set(volumeMatches.map(m => volumeNumber(m[1])))].sort().join('|'),
    edition: collect(/\b(?:tai ban|an ban|edition)\s+(?:nam\s+)?(\d{4})\b/g),
    binding: /\bbia cung\b/.test(value) ? 'HARD' : /\bbia mem\b/.test(value) ? 'SOFT' : '',
    language: /\b(?:tieng anh|english)\b/.test(value) ? 'EN' : /\b(?:tieng viet|vietnamese)\b/.test(value) ? 'VI' : /\b(?:tieng nhat|japanese)\b/.test(value) ? 'JA' : '',
    bundle: /\b(combo|boxset|tron bo)\b/.test(value),
    titleNumbers: (value.replace(/\b(?:tap|vol(?:ume)?|quyen|phan)\s*\d+\b/g, '')
      .replace(/\b(?:tai ban|an ban|edition)\s+(?:nam\s+)?\d{4}\b/g, '')
      .replace(/\b\d+\s*(?:cm|mm|trang|pages)\b/g, '').match(/\d+/g) || []).join('|'),
  };
}

export function bookNeedsReview(a, b) {
  const x = bookFeatures(a), y = bookFeatures(b);
  return ['volume', 'edition', 'binding', 'language', 'titleNumbers'].some(field => Boolean(x[field]) !== Boolean(y[field]));
}

// Contradiction blocks linking. Missing metadata is not a conflict, but
// bookNeedsReview prevents automatic fuzzy acceptance based on partial evidence.
export function bookConflict(a, b) {
  const x = bookFeatures(a), y = bookFeatures(b);
  const ids = [a, b].map(v => normalizeIdCode(v.ma_dinh_danh));
  if (a.sourceCodeType !== 'INTERNAL' && b.sourceCodeType !== 'INTERNAL' && ids.every(v => /^(978|979)\d{10}$/.test(v || '')) && ids[0] !== ids[1]) return true;
  if (['volume', 'edition', 'binding', 'language', 'titleNumbers'].some(field => x[field] && y[field] && x[field] !== y[field])) return true;
  if (x.bundle !== y.bundle) return true;
  return false;
}
