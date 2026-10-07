import { buildRows } from './fieldMapping';
import { runAllChecks, summarizeIssues } from './qualityRules';
import { normalizeNumber, normalizeDate, normalizeOrderId, normalizeChannel, normalizeOrderStatus, normalizeTransactionStatus, normalizeBrand, normalizeIdCode, normalizeText, validateISBN13 } from './normalize';
import { runResolutionStrategy } from './strategies';
import { bookEntityKey } from './bookMatching';

const accepted = status => ['MATCHED_EXACT', 'MATCHED_FUZZY_HIGH', 'MATCHED_CONFIRMED_USER'].includes(status);
const present = value => value != null && String(value).trim() !== '';

/** Complete transactions only. Unknown statuses and wide-format quantities are not sales evidence. */
export function revenueDisposition(row) {
  if (row._isUnpivoted) return 'UNKNOWN_DATA_TYPE';
  const q = normalizeNumber(row.so_luong), p = normalizeNumber(row.gia);
  if (q === null || p === null || q <= 0 || !Number.isInteger(q) || p < 0) return 'INVALID_VALUE';
  const status = normalizeOrderStatus(row.trang_thai);
  if (status === 'Đã hủy' || status === 'Trả hàng') return 'CANCELLED';
  return status === 'Hoàn thành' ? 'INCLUDED' : 'UNCONFIRMED_STATUS';
}

function finalize(base, decisions = new Map()) {
  const resolved = base.resolved.map((row, i) => {
    const decision = decisions.get(i)?.decision;
    if (decision === 'ACCEPT' && row.matched && row.matchStatus === 'NEEDS_CONFIRMATION') return { ...row, matchStatus: 'MATCHED_CONFIRMED_USER' };
    if (decision === 'REJECT' && row.matched && row.matchStatus === 'NEEDS_CONFIRMATION') return { ...row, matchStatus: 'REJECTED_USER', matched: null };
    return { ...row };
  });
  const issues = runAllChecks(resolved, base.qualityOptions);
  resolved.forEach((row, i) => {
    const code = normalizeIdCode(row.ma_dinh_danh);
    if (/^(978|979)\d{10}$/.test(code || '') && !validateISBN13(code).valid) {
      issues.push({ rowIndex: i, group: 'value', severity: 'FLAGGED_ONLY', detail: `ISBN-13 sai checksum: ${code}` });
    }
    if (row._isUnpivoted) issues.push({ rowIndex: i, group: 'schema', severity: 'FLAGGED_ONLY', detail: 'Bảng ngang tham khảo: chưa xác định ý nghĩa số lượng, không tính doanh thu.' });
    if (!present(row.ma_don)) issues.push({ rowIndex: i, group: 'value', severity: 'FLAGGED_ONLY', detail: 'Thiếu mã đơn; không suy đoán mã giao dịch.' });
    const slash = String(row.__raw_ngay || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slash && Number(slash[1]) <= 12 && Number(slash[2]) <= 12 && slash[1] !== slash[2]) issues.push({rowIndex:i,group:'temporal',severity:'FLAGGED_ONLY',detail:'Ngày dạng slash có thể là DD/MM hoặc MM/DD; đang dùng DD/MM, cần đối soát nguồn.'});
    if (row.hoan_tra && row.trang_thai !== normalizeOrderStatus(row.__raw_trang_thai)) issues.push({rowIndex:i,group:'semantic',severity:'FLAGGED_ONLY',detail:`Đã xét trạng thái trả hàng/hoàn tiền (${row.hoan_tra}); trạng thái giao hàng gốc: ${row.__raw_trang_thai || 'thiếu'}.`});
  });
  const byRow = new Map();
  issues.forEach(issue => { if (!byRow.has(issue.rowIndex)) byRow.set(issue.rowIndex, []); byRow.get(issue.rowIndex).push(issue); });
  const integrated = resolved.map((row, i) => {
    const product = accepted(row.matchStatus) ? row.matched : null;
    const qty = normalizeNumber(row.so_luong), price = normalizeNumber(row.gia);
    return {
      ...row, id: i, rowIndex: i, nguon: row.__sourceName,
      original: base.resolved[i],
      ten_sp: product?.ten_sp || row.ten_sp,
      ma_dinh_danh: product?.ma_dinh_danh || row.ma_dinh_danh,
      thuong_hieu: product?.thuong_hieu || row.thuong_hieu,
      productKey: product ? `CAT:${base.catalog.findIndex(c => c === product || (normalizeIdCode(c.ma_dinh_danh) === normalizeIdCode(product.ma_dinh_danh) && c.ten_sp === product.ten_sp && c.__sourceEntityKey === product.__sourceEntityKey))}` : `SOURCE:${row.__source}:${row.ma_dinh_danh || row.ten_sp ? bookEntityKey(row) : i}`,
      so_luong: qty, gia: price,
      thanh_tien: qty === null || price === null ? null : row.__priceBasis === 'PRODUCT_LINE_AFTER_DISCOUNT' ? row.gia_dong : qty * price,
      revenueDisposition: revenueDisposition(row),
      issues: byRow.get(i) || [],
    };
  });
  const sum = rows => rows.reduce((s, r) => s + (r.thanh_tien ?? 0), 0);
  const eligibleValues = integrated.filter(r => !r._isUnpivoted && r.thanh_tien !== null && r.so_luong > 0 && Number.isInteger(r.so_luong) && r.gia >= 0);
  const cleanRows = integrated.filter(r => r.revenueDisposition === 'INCLUDED');
  const rawRevenueTotal = sum(eligibleValues), cleanRevenueTotal = sum(cleanRows);
  const cancelledRevenuePrevented = sum(integrated.filter(r => r.revenueDisposition === 'CANCELLED'));
  const rawTitles = new Set(base.resolved.map(r => r.__raw_ten_sp || r.ten_sp).filter(Boolean));
  const products = new Set(integrated.map(r => r.productKey));
  const duplicateRows = new Set(issues.filter(i => i.group === 'technical' && i.severity === 'NEEDS_CONFIRMATION').map(i => i.rowIndex));
  const channels = new Map(), top = new Map();
  cleanRows.forEach(r => {
    const channel = r.kenh || '(Thiếu kênh)';
    channels.set(channel, (channels.get(channel) || 0) + r.thanh_tien);
    const item = top.get(r.productKey) || { ten: r.ten_sp || '(Thiếu tên)', soLuong: 0 };
    item.soLuong += r.so_luong; top.set(r.productKey, item);
  });
  return {
    ...base.metadata, _base: base, integrated, issues, issuesSummary: summarizeIssues(issues),
    synthesizedCatalog: base.catalog, normStats: base.normStats,
    governanceAudit: {
      rawRevenueTotal, cleanRevenueTotal, cancelledRevenuePrevented,
      revenueDiscrepancyPrevented: rawRevenueTotal - cleanRevenueTotal,
      unconfirmedRevenue: rawRevenueTotal - cleanRevenueTotal - cancelledRevenuePrevented,
      duplicateRevenueDiscrepancy: sum(integrated.filter(r => duplicateRows.has(r.rowIndex) && r.revenueDisposition === 'INCLUDED')),
      excludedRowsCount: integrated.length - cleanRows.length,
      rawUniqueTitlesCount: rawTitles.size, cleanUniqueProductsCount: products.size,
      productFragmentationReduced: Math.max(0, rawTitles.size - products.size),
    },
    stats: { totalRows: integrated.length, catalogSize: base.catalog.length, matchedCount: integrated.filter(r => accepted(r.matchStatus)).length },
    revenueTotal: cleanRevenueTotal,
    revenueByChannel: [...channels].map(([kenh, doanhThu]) => ({kenh, doanhThu})).sort((a,b) => b.doanhThu-a.doanhThu),
    topProducts: [...top.values()].sort((a,b) => b.soLuong-a.soLuong).slice(0,8),
    pendingConfirmations: integrated.filter(r => ['NEEDS_CONFIRMATION','UNRESOLVED','MATCHED_CONFIRMED_USER','REJECTED_USER'].includes(r.matchStatus)),
  };
}

export function applyManualDecisions(result, decisions) {
  return { ...result, ...finalize(result._base, decisions) };
}

export function runPipeline(orderFiles, catalogFile = null, options = {}) {
  const { resolutionStrategy = 'BIPARTITE', fuzzyHighThreshold = 90, fuzzyConfirmThreshold = 70, masterSourceIndex = 0, crosswalk = [], priceDeviationThreshold = 30 } = options;
  if (fuzzyConfirmThreshold > fuzzyHighThreshold) throw new Error('Ngưỡng cần duyệt phải nhỏ hơn hoặc bằng ngưỡng tự động ghép.');
  const normStats = { idCount: 0, textCount: 0, numberCount: 0, dateCount: 0, channelCount: 0, statusCount: 0, structureCount: 0, encodingFixedCount: 0 };
  const sourceRowsMap = new Map();
  const preparedFiles = orderFiles.map((file, idx) => ({ ...file, sourceName: file.fileName || `Tệp ${idx+1}`, fileName: `SOURCE-${idx}` }));
  const allRows = preparedFiles.flatMap((file, idx) => {
    const rows = buildRows(file.dataRows, file.mapping).map(row => {
      const values = {
        ma_don: normalizeOrderId(row.ma_don), ma_dinh_danh: normalizeIdCode(row.ma_dinh_danh),
        ten_sp: normalizeText(row.ten_sp), thuong_hieu: normalizeBrand(row.thuong_hieu),
        ten_ncc: normalizeText(row.ten_ncc), ma_ncc: normalizeText(row.ma_ncc), tac_gia: normalizeText(row.tac_gia),
        ngay: normalizeDate(row.ngay) || (row.ngay instanceof Date ? String(row.ngay) : row.ngay),
        kenh: normalizeChannel(row.kenh) || normalizeChannel(file.channelLabel),
        trang_thai: normalizeTransactionStatus(row.trang_thai, row.hoan_tra),
      };
      const count = (field, bucket) => { if (present(row[field]) && values[field] !== row[field]) normStats[bucket]++; };
      count('ma_dinh_danh','idCount'); count('ma_don','idCount'); count('ten_sp','textCount'); count('thuong_hieu','textCount');
      count('ngay','dateCount'); count('kenh','channelCount'); count('trang_thai','statusCount');
      ['gia','so_luong'].forEach(f => { if (present(row[f]) && normalizeNumber(row[f]) !== null && String(normalizeNumber(row[f])) !== String(row[f])) normStats.numberCount++; });
      if (row._isUnpivoted) normStats.structureCount++;
      return { ...row, ...values, __source: file.fileName, __sourceName: file.sourceName, __sourceIndex: idx,
        __raw_ma_dinh_danh: row.ma_dinh_danh, __raw_ten_sp: row.ten_sp, __raw_ngay: row.ngay, __raw_kenh: row.kenh, __raw_trang_thai: row.trang_thai };
    });
    sourceRowsMap.set(file.fileName, rows); return rows;
  });
  if (!allRows.length) throw new Error('Không có dòng dữ liệu để xử lý. Kiểm tra tiêu đề và cấu trúc tệp.');
  const strategyKey = catalogFile?.dataRows?.length ? 'CATALOG' : resolutionStrategy;
  if (crosswalk.length && !['CATALOG','MASTER_SOURCE'].includes(strategyKey)) throw new Error('Crosswalk cần Catalog hoặc chiến lược Master Source.');
  if (strategyKey === 'CATALOG' && !catalogFile?.dataRows?.length) throw new Error('Danh mục chuẩn rỗng.');
  const result = runResolutionStrategy(strategyKey, { allRows, catalogFile, orderFiles: preparedFiles, sourceRowsMap, masterSourceIndex, fuzzyHighThreshold, fuzzyConfirmThreshold, crosswalk });
  const referenceRows = result.resolved.map(row => ({...row, __hasReferenceCatalog: ['CATALOG', 'MASTER_SOURCE'].includes(strategyKey)}));
  return finalize({
    resolved: referenceRows, catalog: result.catalog, normStats,
    qualityOptions: { priceDeviationThreshold: priceDeviationThreshold / 100 },
    metadata: { runConfig: { fuzzyHighThreshold, fuzzyConfirmThreshold, priceDeviationThreshold }, integrationMode: result.strategyKey, strategyLabel: result.strategyLabel, resolutionStats: result.resolutionStats || null, bipartiteStats: result.bipartiteStats || null, clustersStats: result.clustersStats || null },
  });
}
