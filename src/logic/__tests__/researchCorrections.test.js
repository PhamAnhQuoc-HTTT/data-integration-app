import { describe, it, expect } from 'vitest';
import { detectFields } from '../fieldMapping';
import { bookConflict, bookFeatures } from '../bookMatching';
import { normalizeTextForMatching, normalizeTransactionStatus, dateEvidence } from '../normalize';
import { resolveEntities } from '../entityResolution';
import { runPipeline, applyManualDecisions } from '../pipeline';
import { buildInventoryProposal } from '../inventory';
import { buildBusinessReports } from '../businessReports';
import { annotateDuplicateReview } from '../transactionIdentity';
import { getReportTables } from '../reportExport';

const headers = ['Order ID', 'Product Name', 'Seller SKU', 'Quantity', 'Unit Price', 'Status', 'Sale Date', 'Order Item ID', 'Shop ID'];
const line = (overrides = {}) => ({ order: 'O1', title: 'A sufficiently long book title', code: 'C1', qty: 1, price: 100, status: 'Completed', date: '2025-07-20', line: '', shop: '', ...overrides });
const file = (name, items, profile = {}) => ({ fileName: name, channelLabel: 'Shopee', profile, mapping: detectFields(headers), headers,
  dataRows: items.map(r => [r.order, r.title, r.code, r.qty, r.price, r.status, r.date, r.line, r.shop]) });
const catalog = { headers: ['ISBN', 'Tên sản phẩm', 'Stock'], mapping: detectFields(['ISBN', 'Tên sản phẩm', 'Stock']), dataRows: [['C1', 'A sufficiently long book title', 10]] };

describe('research corrections backed by counterexamples', () => {
  it('rejects inconsistent INCLUDED rows instead of concatenating quantities or silently dropping money', () => {
    const row = { revenueDisposition: 'INCLUDED', thanh_tien: 100, so_luong: '2', matchStatus: 'MATCHED_EXACT', canonicalEntityId: 'C1' };
    expect(() => buildBusinessReports([row])).toThrow();
    expect(() => buildBusinessReports([{ ...row, so_luong: 2, thanh_tien: NaN }])).toThrow();
  });
  it('normalizes weak duplicate text while keeping the result advisory', () => {
    const a = { ma_don: 'O', ten_sp: 'Tên Sách', phan_loai: ' Bìa Mềm ', kenh: 'POS', so_luong: 1, gia: 100 };
    const result = annotateDuplicateReview([a, { ...a, ten_sp: 'tên sách ', phan_loai: 'bìa mềm' }]);
    expect(result.every(r => r.duplicateStatus === 'POSSIBLE_DUPLICATE')).toBe(true);
  });
  it('does not invent quantity/order IDs from monetary headers', () => {
    expect(detectFields(['Order Amount', 'Product Name']).so_luong).toBe(-1);
    expect(detectFields(['Order Amount', 'Product Name']).ma_don).toBe(-1);
    expect(detectFields(['Order Amount', 'Qty']).so_luong).toBe(1);
    expect(detectFields(['Order Amount', 'Units']).so_luong).toBe(1);
    expect(detectFields(['List Price', 'Cost']).gia).toBe(-1);
  });
  it('reserves explicit line/order and price roles before generic matching', () => {
    const h = ['orderItemId', 'orderNumber', 'sellerSku', 'itemSubtotal', 'unitPrice', 'Qty'];
    const m = detectFields(h);
    expect(m).toMatchObject({ sourceOrderLineId: 0, ma_don: 1, ma_dinh_danh: 2, gia_dong: 3, gia: -1, so_luong: 5 });
  });
  it('preserves edition evidence in parenthetical text', () => {
    expect(normalizeTextForMatching('Nhà Giả Kim (Bản tiếng Anh)')).toBe('nha gia kim ban tieng anh');
    expect(bookConflict({ ten_sp: 'Sách (Tiếng Anh)' }, { ten_sp: 'Sách (Tiếng Việt)' })).toBe(true);
  });
  it('does not confuse an intrinsic title number with an added reprint year', () => {
    expect(bookConflict({ ten_sp: '1984 (Tái bản 2024)' }, { ten_sp: '1984' })).toBe(false);
    expect(bookConflict({ ten_sp: '1984' }, { ten_sp: '1985' })).toBe(true);
    expect(bookConflict({ ten_sp: 'Truyện Tập 1', phan_loai: 'Tập 1' }, { ten_sp: 'Truyện Tập 1' })).toBe(false);
    expect(bookConflict({ ten_sp: 'Truyện Tập IV' }, { ten_sp: 'Truyện Tập V' })).toBe(true);
    expect(bookConflict({ ten_sp: 'Truyện Tập IV' }, { ten_sp: 'Truyện Tập 4' })).toBe(false);
    expect(bookFeatures({ ten_sp: 'Tập đi' }).volume).toBe('');
    expect(bookFeatures({ ten_sp: 'Phần vì yêu thương' }).volume).toBe('');
    expect(bookFeatures({ ten_sp: 'PHẦN VÌ YÊU THƯƠNG' }).volume).toBe('');
    expect(bookFeatures({ ten_sp: 'Truyện Tập VX' }).volume).toBe('');
  });
  it('does not auto-accept fuzzy links when a volume or language is unspecified', () => {
    for (const suffix of [' Tập 2', ' (Bản tiếng Anh)']) {
      const [r] = resolveEntities([{ ten_sp: 'Tên cuốn sách rất dài để kiểm tra nhận diện sản phẩm' + suffix }], [{ ma_dinh_danh: 'C1', ten_sp: 'Tên cuốn sách rất dài để kiểm tra nhận diện sản phẩm' }]);
      expect(r.matchStatus).not.toBe('MATCHED_FUZZY_HIGH');
    }
  });
  it('runs each baseline independently on the entire query set', () => {
    const rows = [{ ma_dinh_danh: 'C1', ten_sp: 'Totally different' }, { ten_sp: 'A sufficiently long book title' }];
    const cat = [{ ma_dinh_danh: 'C1', ten_sp: 'A sufficiently long book title' }];
    expect(resolveEntities(rows, cat, { matchingMode: 'EXACT_ONLY' }).map(r => r.matchStatus)).toEqual(['MATCHED_EXACT', 'UNRESOLVED']);
    expect(resolveEntities(rows, cat, { matchingMode: 'FUZZY_ONLY' }).map(r => r.matchStatus)).toEqual(['UNRESOLVED', 'MATCHED_FUZZY_HIGH']);
  });
  it('does not treat a declared internal SKU as a same-text Catalog identifier', () => {
    const cat = { headers: ['ISBN', 'Tên sản phẩm'], mapping: detectFields(['ISBN', 'Tên sản phẩm']), dataRows: [['C1', 'Alpha'], ['C2', 'Zebra']] };
    const f = file('a', [line({ code: 'C1', title: 'Zebra' })], { sourceCodeType: 'INTERNAL' });
    const r = runPipeline([f], cat, { crosswalk: [{ source: 'a', internal_code: 'C1', standard_code: 'C2' }] });
    expect(r.integrated[0]).toMatchObject({ ma_dinh_danh: 'C2', matchTier: 'tier2_crosswalk' });
  });
  it('holds all colliding scoped line IDs across snapshots without deleting data', () => {
    const a = line({ line: 'L1', shop: 'SHOP-A' });
    const r = runPipeline([file('week1.xlsx', [a]), file('week2.xlsx', [a])], catalog);
    expect(r.integrated).toHaveLength(2);
    expect(r.integrated.every(x => x.revenueDisposition === 'DUPLICATE_REVIEW')).toBe(true);
    expect(r.revenueTotal).toBe(0);
    expect(r.governanceAudit).toMatchObject({ duplicateReviewRevenue: 200, unconfirmedRevenue: 0 });
    expect(buildInventoryProposal(r, catalog, 2).summary.deductedQuantity).toBe(0);
  });
  it('does not merge identical order/line IDs belonging to different shops', () => {
    const r = runPipeline([file('a', [line({ line: 'L1', shop: 'A' })]), file('b', [line({ line: 'L1', shop: 'B' })])], catalog);
    expect(r.revenueTotal).toBe(200);
    expect(r.integrated.every(x => x.duplicateStatus === 'NONE')).toBe(true);
  });
  it('does not infer separate-file duplicates as proven when shop scope is missing', () => {
    const r = runPipeline([file('a', [line()]), file('b', [line()])], catalog);
    expect(r.revenueTotal).toBe(200);
    expect(r.integrated.every(x => x.duplicateStatus === 'POSSIBLE_DUPLICATE')).toBe(true);
    expect(buildInventoryProposal(r, catalog, 2).summary.deductedQuantity).toBe(0);
  });
  it('preserves separate legitimate lines of one product in one order', () => {
    const r = runPipeline([file('a', [line({ line: 'L1', shop: 'A' }), line({ line: 'L2', shop: 'A' })])], catalog);
    expect(r.revenueTotal).toBe(200);
    expect(r.integrated.every(x => x.duplicateStatus === 'NONE')).toBe(true);
    expect(buildInventoryProposal(r, catalog, 2).summary.deductedQuantity).toBe(2);
  });
  it('keeps rejected return requests separate from completed refunds and unknown flags', () => {
    expect(normalizeTransactionStatus('Delivered', 'Refund rejected')).toBe('Hoàn thành');
    expect(normalizeTransactionStatus('Cancelled', 'Return requested')).toBe('Đã hủy');
    expect(normalizeTransactionStatus('Delivered', '-')).toBe('Chờ đối soát trả hàng/hoàn tiền');
    expect(normalizeTransactionStatus('Delivered', '-', { noReturnMarkers: ['-'] })).toBe('Hoàn thành');
    expect(normalizeTransactionStatus('Đã hoàn tiền', 'Refund rejected')).toBe('Trả hàng');
  });
  it('allocates ambiguous dates only after a source locale is explicitly supplied', () => {
    expect(dateEvidence('03/04/2025')).toEqual({ canonicalDate: null, dateValidity: 'AMBIGUOUS_LOCALE' });
    expect(dateEvidence('03/04/2025', 'MDY').canonicalDate).toBe('2025-03-04');
    expect(dateEvidence('31/07/2025', 'MDY').dateValidity).toBe('INVALID');
    expect(dateEvidence('03-04-2025').dateValidity).toBe('AMBIGUOUS_LOCALE');
    expect(dateEvidence('03.04.2025', 'MDY').canonicalDate).toBe('2025-03-04');
    expect(dateEvidence('07-20-2025', 'MDY').canonicalDate).toBe('2025-07-20');
    const r = runPipeline([file('a', [line({ date: '03/04/2025' })])], catalog);
    expect(r.businessReports).toMatchObject({ total: 100, unallocatedPeriod: 100 });
    expect(r.businessReports.byMonth).toEqual([]);
    const confirmed = runPipeline([file('a', [line({ date: '03/04/2025' })], { dateLocale: 'DMY' })], catalog);
    expect(confirmed.businessReports.byMonth).toEqual([{ month: '2025-04', amount: 100 }]);
    const us = runPipeline([file('a', [line({ date: '03/04/2025' })], { dateLocale: 'MDY' })], catalog);
    expect(us.integrated[0]).toMatchObject({ ngay: '2025-03-04', canonicalDate: '2025-03-04' });
    expect(() => runPipeline([file('a', [line({ shop: 'A' })], { shopId: 'B' })], catalog)).toThrow('Mã shop');
    expect(() => runPipeline([file('a', [line()], { dateLocale: 'GUESS' })], catalog)).toThrow('Quy ước ngày');
  });
  it('keeps product/channel/period totals reconciled before and after HITL', () => {
    const r = runPipeline([file('a', [line({ code: '', title: 'A sufficiently long book titlx' })])], catalog, { fuzzyHighThreshold: 99 });
    expect(r.integrated[0].matchStatus).toBe('NEEDS_CONFIRMATION');
    expect(r.businessReports.unallocatedProduct).toBe(100);
    const accepted = applyManualDecisions(r, new Map([[0, { decision: 'ACCEPT' }]]));
    expect(accepted.businessReports.unallocatedProduct).toBe(0);
    expect(accepted.businessReports.byProduct[0].amount).toBe(100);
    expect(accepted.businessReports.total).toBe(r.businessReports.total);
    const tables = getReportTables(accepted);
    expect(tables.map(t => t.name)).toEqual(['Bao_Cao_Kenh', 'Bao_Cao_San_Pham', 'Bao_Cao_Thang', 'Doi_Soat_Bao_Cao']);
    expect(tables[1].rows.reduce((s, row) => s + row[3], 0)).toBe(accepted.revenueTotal);
    expect(tables[2].rows.reduce((s, row) => s + row[1], 0)).toBe(accepted.revenueTotal);
  });
});
