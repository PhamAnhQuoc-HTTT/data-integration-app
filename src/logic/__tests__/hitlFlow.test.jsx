import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { runPipeline, applyManualDecisions } from '../pipeline';
import { detectFields } from '../fieldMapping';
import { getReviewCandidate, reconciliationCounts } from '../reconciliation';
import { getExportData } from '../exportData';
import { HitlWorkbenchTab } from '../../components/tabs/HitlWorkbenchTab';

// Synthetic inputs deliberately cover uncertain proposals and genuinely unlinked books.
// These are functional test cases, not a real-data accuracy benchmark.
const catalogHeaders = ['ISBN', 'Tên sản phẩm', 'Giá chuẩn'];
const catalog = {
  fileName: 'Danh_muc_HITL_test.xlsx',
  mapping: detectFields(catalogHeaders),
  dataRows: [
    ['9780306406157', 'Nhà Giả Kim', 100000],
    ['9786040000001', 'Doraemon - Tập 1', 25000],
    ['9786040000002', 'Những Bài Học Kỹ Năng Sống Và Làm Việc Hiệu Quả A', 80000],
    ['9786040000003', 'Những Bài Học Kỹ Năng Sống Và Làm Việc Hiệu Quả B', 80000],
  ],
};
const headers = ['Order ID', 'Product Name', 'Seller SKU', 'Quantity', 'Unit Price', 'Status', 'Variation'];
const row = (order, title, sku = '', status = 'Completed', variant = '') =>
  [order, title, sku, 1, 100000, status, variant];
const source = {
  fileName: 'Don_hang_HITL_test.xlsx',
  mapping: detectFields(headers),
  dataRows: [
    row('EXACT', 'Nhà Giả Kim', '9780306406157'),
    row('HIGH', 'Nha Gia Kim'),
    row('REVIEW', 'Nhà Giả K', 'LOCAL-REVIEW'),
    row('CANCELLED-REVIEW', 'Nhà Giả K', 'LOCAL-CANCELLED', 'Cancelled'),
    row('UNKNOWN', 'Cẩm nang nuôi ong trên sao Hỏa', 'LOCAL-UNKNOWN'),
    row('ISBN-CONFLICT', 'Nhà Giả Kim', '9780306406164'),
    row('VOLUME-CONFLICT', 'Doraemon - Tập 2', 'LOCAL-VOLUME'),
    row('COMBO-CONFLICT', 'Nhà Giả Kim', 'LOCAL-COMBO', 'Completed', 'Combo'),
    row('TIE', 'Những Bài Học Kỹ Năng Sống Và Làm Việc Hiệu Quả C', 'LOCAL-TIE'),
  ],
};
const run = () => runPipeline([source], catalog);
const decide = (r, decision) => applyManualDecisions(r, new Map([[2, { decision }], [3, { decision }]]));
const html = (result, decisions = new Map()) => renderToStaticMarkup(
  <HitlWorkbenchTab pendingConfirmations={result.pendingConfirmations}
    manualConfirmations={decisions} onManualDecision={() => {}} config={result.runConfig} />,
);

describe('HITL end-to-end logic and rendered controls', () => {
  it('separates certain matches, uncertain proposals and unlinked records at default thresholds', () => {
    const result = run();
    expect(result.integrated.map(r => r.matchStatus)).toEqual([
      'MATCHED_EXACT', 'MATCHED_FUZZY_HIGH', 'NEEDS_CONFIRMATION', 'NEEDS_CONFIRMATION',
      'UNRESOLVED', 'UNRESOLVED', 'UNRESOLVED', 'UNRESOLVED', 'NEEDS_CONFIRMATION',
    ]);
    expect(result.integrated[2].matchScore).toBeGreaterThanOrEqual(70);
    expect(result.integrated[2].matchScore).toBeLessThan(90);
    expect(result.integrated[8].matchScore).toBeGreaterThanOrEqual(90);
    expect(reconciliationCounts(result.pendingConfirmations, new Map())).toEqual({ pending: 3, reviewed: 0, unlinked: 4 });
    console.info('HITL cases:', result.integrated.map(r => ({ order: r.ma_don, status: r.matchStatus, score: r.matchScore })));
  });

  it('does not invent a candidate or allow ACCEPT to link a genuinely unresolved row', () => {
    const initial = run();
    const attempted = applyManualDecisions(initial, new Map([[4, { decision: 'ACCEPT' }]]));
    for (const r of [initial, attempted]) {
      expect(r.integrated[4].matchStatus).toBe('UNRESOLVED');
      expect(r.integrated[4].matched).toBeNull();
      expect(getReviewCandidate(r.integrated[4])).toBeNull();
      expect(r.integrated[4].productKey).toContain('SOURCE:');
      expect(r.integrated[4].ten_sp).toBe(source.dataRows[4][1]);
    }
  });

  it('accepts proposals, updates links and exports, but never includes a cancelled sale', () => {
    const initial = run();
    const yes = decide(initial, 'ACCEPT');
    expect(yes.stats.matchedCount).toBe(4);
    expect(yes.integrated[2]).toMatchObject({ matchStatus: 'MATCHED_CONFIRMED_USER', ten_sp: 'Nhà Giả Kim', ma_dinh_danh: '9780306406157' });
    expect(yes.integrated[2].productKey).toBe(yes.integrated[0].productKey);
    expect(yes.integrated[3].revenueDisposition).toBe('CANCELLED');
    expect(yes.revenueTotal).toBe(800000);
    expect(initial.integrated[2].matchStatus).toBe('NEEDS_CONFIRMATION');
    const exported = getExportData(yes);
    expect(exported.rows[2][11]).toBe('MATCHED_CONFIRMED_USER');
    expect(exported.rows[2][14]).toBe('Nhà Giả K');
    expect(exported.rows[2][15]).toBe('LOCAL-REVIEW');
  });

  it('rejects and reverses decisions without losing the original candidate or changing revenue', () => {
    const initial = run();
    const yes = decide(initial, 'ACCEPT');
    const no = decide(yes, 'REJECT');
    expect(no.integrated[2]).toMatchObject({ matchStatus: 'REJECTED_USER', ten_sp: 'Nhà Giả K', ma_dinh_danh: 'LOCALREVIEW', matched: null });
    expect(getReviewCandidate(no.integrated[2]).ten_sp).toBe('Nhà Giả Kim');
    expect(no.stats.matchedCount).toBe(2);
    expect(getExportData(no).rows[2][11]).toBe('REJECTED_USER');
    const again = decide(no, 'ACCEPT');
    const cleared = applyManualDecisions(again, new Map());
    for (const r of [initial, yes, no, again, cleared]) expect(r.revenueTotal).toBe(800000);
    expect(cleared.integrated[2].matchStatus).toBe('NEEDS_CONFIRMATION');
    expect(reconciliationCounts(no.pendingConfirmations, new Map([[2, { decision: 'REJECT' }], [3, { decision: 'REJECT' }]])))
      .toEqual({ pending: 1, reviewed: 2, unlinked: 4 });
  });

  it('renders both actions only for proposals, with separate unlinked records and reviewed feedback', () => {
    const initial = run();
    const markup = html(initial);
    expect(markup.match(/Chấp thuận ghép/g)).toHaveLength(3);
    expect(markup.match(/Từ chối ghép/g)).toHaveLength(3);
    expect(markup).toContain('3 dòng cần duyệt');
    expect(markup).toContain('4 dòng chưa có liên kết');
    const decisions = new Map([[2, { decision: 'REJECT' }], [3, { decision: 'ACCEPT' }]]);
    const reviewed = html(applyManualDecisions(initial, decisions), decisions);
    expect(reviewed).toContain('1 dòng cần duyệt');
    expect(reviewed).toContain('2 dòng đã duyệt');
    expect(reviewed).toContain('Đã từ chối');
    expect(reviewed).toContain('Đã chấp thuận');
  });
});
