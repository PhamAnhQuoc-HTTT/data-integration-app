import { describe, it, expect } from 'vitest';
import { detectFields, buildCatalog } from '../fieldMapping';
import { runPipeline, applyManualDecisions } from '../pipeline';
import { resolveEntities } from '../entityResolution';
import { normalizeDate, normalizeBrand, normalizeTransactionStatus } from '../normalize';
import { checkCrossChannelPrice, checkReferentialIntegrity, checkStaleData, checkCategoricalMismatch } from '../qualityRules';
import { getExportData } from '../exportData';

const source = (headers, dataRows) => ({ fileName: 'Orders.xlsx', dataRows, mapping: detectFields(headers), channelLabel: 'Shopee' });
const master = () => ({ dataRows: [['C1', 'abcdefghij', 'NXB Test', 100, 'N1', 'Distributor', 'Author']], mapping: detectFields(['ISBN-13', 'Tên sản phẩm', 'NXB cấp phép', 'Giá bìa', 'Mã NCC chuẩn', 'Tên NCC', 'Tác giả']) });

describe('audit corrections and conservative business policies', () => {
  it('keeps marketplace original price distinct from catalog list price', () => {
    const f = source(['Mã đơn hàng', 'SKU sản phẩm', 'Tên sản phẩm', 'Giá gốc', 'Giá ưu đãi', 'Số lượng', 'Trạng thái đơn hàng', 'Publisher'], [['A', 'C1', 'abcdefghij', 120, 80, 2, 'Đã giao', 'Company']]);
    const r = runPipeline([f], master());
    expect(r.integrated[0]).toMatchObject({ gia: 80, gia_goc: 120, gia_bia: '100', gia_tham_chieu: '100', ma_ncc: 'N1', ten_ncc: 'Distributor', tac_gia: 'Author', thuong_hieu: 'NXB Test', thuong_hieu_nguon: 'Company', thanh_tien: 160 });
    const { headers, rows } = getExportData(r);
    expect(rows[0][headers.indexOf('Giá gốc nguồn')]).toBe(120);
    expect(rows[0][headers.indexOf('Giá bìa')]).toBe('100');
    expect(rows[0]).toHaveLength(headers.length);
  });

  it('does not label source original price as list price when there is no catalog', () => {
    const f = source(['SKU sản phẩm', 'Tên sản phẩm', 'Giá gốc', 'Giá ưu đãi'], [['C1', 'Book', 120, 80]]);
    expect(runPipeline([f]).integrated[0]).toMatchObject({ gia_goc: 120, gia_bia: '' });
    const mapping = detectFields(['SKU', 'Tên sản phẩm', 'Giá chuẩn']);
    expect(buildCatalog([['C1', 'Book', 100]], mapping)[0]).toMatchObject({ gia_bia: '', gia_chuan: '100' });
  });

  it('copies catalog metadata only after a user accepts a pending link, and clears it on rejection', () => {
    const f = source(['Order ID', 'Product Name', 'Quantity', 'Unit Price', 'Status'], [['A', 'abcdefghiZ', 1, 80, 'Completed']]);
    const r = runPipeline([f], master(), { fuzzyHighThreshold: 95 });
    expect(r.integrated[0]).toMatchObject({ matchStatus: 'NEEDS_CONFIRMATION', gia_bia: '', gia_tham_chieu: null, ma_ncc: null });
    const yes = applyManualDecisions(r, new Map([[0, { decision: 'ACCEPT' }]]));
    expect(yes.integrated[0]).toMatchObject({ matchStatus: 'MATCHED_CONFIRMED_USER', ma_ncc: 'N1', gia_bia: '100' });
    const no = applyManualDecisions(yes, new Map([[0, { decision: 'REJECT' }]]));
    expect(no.integrated[0]).toMatchObject({ matchStatus: 'REJECTED_USER', ma_ncc: null, gia_bia: '', gia_tham_chieu: null });
    expect(no.revenueTotal).toBe(yes.revenueTotal);
  });

  it('distinguishes an existing catalog ID blocked by Combo from an absent identifier', () => {
    const cat = [{ ma_dinh_danh: 'C1', ten_sp: 'Book' }];
    const [combo, absent] = resolveEntities([{ ma_dinh_danh: 'C1', ten_sp: 'Book', phan_loai: 'Combo' }, { ma_dinh_danh: 'NEW', ten_sp: 'Something entirely unrelated' }], cat);
    expect(combo).toMatchObject({ matchStatus: 'UNRESOLVED', matchReason: 'VARIANT_CONFLICT', __catalogIdExists: true });
    expect(absent).toMatchObject({ matchStatus: 'UNRESOLVED', matchReason: 'ID_NOT_FOUND', __catalogIdExists: false });
    expect(checkReferentialIntegrity([combo])).toEqual([]);
    expect(checkReferentialIntegrity([absent])[0].detail).toContain('không tồn tại');
  });

  it('records competing candidates as ambiguity instead of automatically accepting a score of 100', () => {
    const [r] = resolveEntities([{ ten_sp: 'Book' }], [{ ma_dinh_danh: 'C1', ten_sp: 'Book' }, { ma_dinh_danh: 'C2', ten_sp: 'Book' }]);
    expect(r).toMatchObject({ matchStatus: 'NEEDS_CONFIRMATION', matchScore: 100, matchReason: 'AMBIGUOUS_CANDIDATES' });
  });

  it('does not report a valid crosswalk target as missing when a Combo conflicts with that target', () => {
    const [r] = resolveEntities([{ ma_dinh_danh: 'INTERNAL', ten_sp: 'Book', phan_loai: 'Combo' }], [{ ma_dinh_danh: 'C1', ten_sp: 'Book' }], { crosswalk: [{ internal_code: 'INTERNAL', standard_code: 'C1' }] });
    expect(r).toMatchObject({ matchStatus: 'UNRESOLVED', matchReason: 'VARIANT_CONFLICT', __catalogIdExists: true });
    expect(checkReferentialIntegrity([r])).toEqual([]);
  });

  it('compares prices only for accepted compatible variants', () => {
    const row = { ma_dinh_danh: 'C1', ten_sp: 'Book', matchStatus: 'MATCHED_EXACT', gia: 100, kenh: 'Shopee', phan_loai: 'Bìa mềm' };
    const other = { ...row, gia: 200, kenh: 'Lazada' };
    expect(checkCrossChannelPrice([row, other])).toHaveLength(1);
    expect(checkCrossChannelPrice([row, { ...other, phan_loai: 'Bìa cứng' }])).toEqual([]);
    expect(checkCrossChannelPrice([row, { ...other, phan_loai: 'Combo', matchStatus: 'UNRESOLVED' }])).toEqual([]);
    expect(checkCrossChannelPrice([row, { ...other, matchStatus: 'NEEDS_CONFIRMATION' }])).toEqual([]);
    expect(checkCrossChannelPrice([{ ...row, ten_sp: 'Book - Tập 1' }, { ...other, ten_sp: 'Book - Tập 2' }])).toEqual([]);
  });

  it.each(['Return requested', 'Đang yêu cầu hoàn tiền', 'Hoàn tiền', 'Trả hàng'])('keeps ambiguous/request refund status %s pending, not completed', refund => {
    const f = source(['Order ID', 'Product Name', 'Quantity', 'Unit Price', 'Order Status', 'Trạng thái Trả hàng/Hoàn tiền'], [['A', 'Book', 2, 100, 'Delivered', refund]]);
    const r = runPipeline([f]);
    expect(r.integrated[0]).toMatchObject({ trang_thai: 'Chờ đối soát trả hàng/hoàn tiền', revenueDisposition: 'UNCONFIRMED_STATUS', thanh_tien: 200 });
    expect(r.revenueTotal).toBe(0);
    expect(r.governanceAudit.unconfirmedRevenue).toBe(200);
    expect(r.governanceAudit.cancelledRevenuePrevented).toBe(0);
    expect(checkCategoricalMismatch(r.integrated)).toEqual([]);
  });

  it('keeps a composite main status pending even if the auxiliary return flag says no return', () => {
    expect(normalizeTransactionStatus('Trả hàng/Hoàn tiền', 'Không trả hàng')).toBe('Chờ đối soát trả hàng/hoàn tiền');
    expect(normalizeTransactionStatus('Hoàn tiền', '')).toBe('Chờ đối soát trả hàng/hoàn tiền');
    expect(normalizeTransactionStatus('Đã hoàn tiền', '')).toBe('Trả hàng');
    expect(normalizeTransactionStatus('Đã giao', 'Đã hoàn tiền')).toBe('Trả hàng');
    const issues = checkStaleData([{ trang_thai: 'Trả hàng', so_luong: 1, gia: 100 }]);
    expect(issues[0].detail).toContain('không cộng');
    expect(issues[0].detail).not.toContain('vẫn ghi nhận doanh thu');
  });

  it('defaults ambiguous dates to DD/MM but retains and warns about mixed-source dates', () => {
    expect(normalizeDate('07/09/2025')).toBe('2025-09-07');
    const f = source(['Order ID', 'Product Name', 'Quantity', 'Unit Price', 'Status', 'Sale Date'], [['A', 'Book', 1, 100, 'Completed', '07/20/2025']]);
    const r = runPipeline([f]);
    expect(r.integrated[0]).toMatchObject({ ngay: '2025-07-20', __raw_ngay: '07/20/2025' });
    expect(r.issues.some(i => i.detail.includes('MM/DD không mơ hồ'))).toBe(true);
  });

  it('does not invent a publisher role for Nhã Nam', () => {
    expect(normalizeBrand('Nhã Nam')).toBe('Nhã Nam');
  });
});
