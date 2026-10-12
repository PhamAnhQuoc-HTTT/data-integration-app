import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildInventoryProposal, suggestedStockColumn } from '../inventory';
import { inventoryWorkbook } from '../inventoryExport';
import { detectFields } from '../fieldMapping';
import { applyManualDecisions, runPipeline } from '../pipeline';

const master = (stock = 10) => {
  const headers = ['ISBN', 'Tên sản phẩm', 'Giá chuẩn', 'Tồn kho'];
  return { fileName: 'Master.xlsx', headers, mapping: detectFields(headers), dataRows: [['9780306406157', 'Nhà Giả Kim', 100000, stock]] };
};
const orderFile = rows => {
  const headers = ['Order ID', 'Date', 'Product Name', 'Seller SKU', 'Quantity', 'Unit Price', 'Status', 'Return Status'];
  return { fileName: 'Shopee.xlsx', headers, mapping: detectFields(headers), channelLabel: 'Shopee', dataRows: rows };
};
const order = (id = 'A', qty = 2, status = 'Completed', title = 'Nhà Giả Kim', code = '9780306406157', refund = '') =>
  [id, '10/10/2026', title, code, qty, 100000, status, refund];
const calculate = (rows, stock = 10) => {
  const catalog = master(stock), result = runPipeline([orderFile(rows)], catalog);
  return { result, catalog, proposal: buildInventoryProposal(result, catalog, 3) };
};

describe('Opening inventory proposal', () => {
  it('suggests only an unambiguous stock header, not order quantity or branch columns', () => {
    expect(suggestedStockColumn(['Số lượng', 'FAHASA Thủ Đức'])).toBe(-1);
    expect(suggestedStockColumn(['Tồn kho', 'Stock'])).toBe(-1);
    expect(suggestedStockColumn(['Giá', 'Tồn đầu kỳ'])).toBe(1);
  });
  it('deducts completed linked quantities; keeps all original master columns intact', () => {
    const { proposal, catalog } = calculate([order('A'), order('B', 3)]);
    expect(proposal.rows[0].slice(0, 4)).toEqual(catalog.dataRows[0]);
    expect(proposal.rows[0].slice(4, 7)).toEqual([5, 5, 0]);
    expect(proposal.summary.deductedQuantity).toBe(5);
    expect(catalog.dataRows[0][3]).toBe(10);
  });
  it('does not deduct cancelled orders or treat returns/refunds as restocked goods', () => {
    const { proposal } = calculate([order('A', 2, 'Cancelled'), order('B', 3, 'Returned'), order('C', 1, 'Completed', undefined, undefined, 'Requested')]);
    expect(proposal.rows[0][5]).toBe(10);
    expect(proposal.movements.map(row => row.disposition)).toEqual(['NO_DEDUCTION', 'PENDING', 'PENDING']);
  });
  it('counts physical completed sales independently of invalid/missing prices', () => {
    const row = order(); row[5] = '';
    const { result, proposal } = calculate([row]);
    expect(result.revenueTotal).toBe(0);
    expect(proposal.summary.deductedQuantity).toBe(2);
  });
  it('requires date, order ID and positive integer quantity; unknown statuses remain pending', () => {
    const a = order('A'); a[1] = '';
    const { proposal } = calculate([a, order('', 1), order('B', 1.5), order('C', -1), order('D', 1, 'Processing')]);
    expect(proposal.summary).toEqual({ deductedQuantity: 0, pendingCount: 5, negativeCount: 0 });
  });
  it('holds every repeated order/product line instead of silently subtracting twice or selecting one', () => {
    const { proposal } = calculate([order(), order(), order('B', 1), order('B', 3)]);
    expect(proposal.summary.deductedQuantity).toBe(0);
    expect(proposal.summary.pendingCount).toBe(4);
    expect(proposal.movements.every(row => row.reason.includes('Nhiều dòng'))).toBe(true);
  });
  it.each(['', -1, 'abc', 1.5])('does not turn invalid opening stock %s into zero', stock => {
    const { proposal } = calculate([order()], stock);
    expect(proposal.rows[0][5]).toBe('');
    expect(proposal.summary.deductedQuantity).toBe(0);
  });
  it('preserves valid zero, exposes negative closing stock rather than clamping it', () => {
    const { proposal } = calculate([order()], 0);
    expect(proposal.rows[0][5]).toBe(-2);
    expect(proposal.summary.negativeCount).toBe(1);
    expect(proposal.rows[0].at(-1)).toContain('âm');
  });
  it('does not select one stock row when the master repeats an ID', () => {
    const catalog = master(); catalog.dataRows.push([...catalog.dataRows[0]]);
    const result = runPipeline([orderFile([order()])], catalog);
    const proposal = buildInventoryProposal(result, catalog, 3);
    expect(proposal.rows.map(row => row[5])).toEqual(['', '']);
    expect(proposal.summary.deductedQuantity).toBe(0);
    expect(proposal.rows[0].at(-1)).toContain('bị lặp');
  });
  it('never deducts a pending candidate; recalculates after HITL accept or reject from the original snapshot', () => {
    const { result, catalog, proposal } = calculate([order('A', 2, 'Completed', 'Nhà Giả K', 'LOCAL')]);
    expect(result.integrated[0].matchStatus).toBe('NEEDS_CONFIRMATION');
    expect(proposal.summary.deductedQuantity).toBe(0);
    const accepted = applyManualDecisions(result, new Map([[0, { decision: 'ACCEPT' }]]));
    const first = buildInventoryProposal(accepted, catalog, 3);
    expect(first.rows[0][5]).toBe(8);
    expect(buildInventoryProposal(accepted, catalog, 3)).toEqual(first);
    const rejected = applyManualDecisions(accepted, new Map([[0, { decision: 'REJECT' }]]));
    expect(buildInventoryProposal(rejected, catalog, 3).rows[0][5]).toBe(10);
  });
  it('rejects a synthetic master or a non-stock mapped column', () => {
    const { result, catalog } = calculate([order()]);
    expect(() => buildInventoryProposal(result, catalog, 2)).toThrow('không được');
    expect(() => buildInventoryProposal({ ...result, integrationMode: 'BIPARTITE' }, catalog, 3)).toThrow('master riêng');
    expect(() => buildInventoryProposal(result, catalog, -1)).toThrow('chọn cột');
  });
  it('allows an explicitly selected SL column in a master, without treating sales quantity as stock', () => {
    const catalog = master(); catalog.headers[3] = 'SL'; catalog.mapping = detectFields(catalog.headers);
    expect(catalog.mapping.so_luong).toBe(3);
    const result = runPipeline([orderFile([order()])], catalog);
    expect(buildInventoryProposal(result, catalog, 3).rows[0][5]).toBe(8);
    expect(suggestedStockColumn(catalog.headers)).toBe(-1);
  });
  it('round-trips the export with numeric stocks, identifier strings and a full movement audit', () => {
    const { proposal } = calculate([order(), order('B', 1, 'Returned')]);
    const buffer = XLSX.write(inventoryWorkbook(proposal), { type: 'array', bookType: 'xlsx' });
    const reopened = XLSX.read(buffer, { type: 'array' });
    expect(reopened.SheetNames).toEqual(['Master_Sau_Ban', 'Doi_Soat_Ton', 'Pham_Vi']);
    expect(reopened.Sheets.Master_Sau_Ban.A2.v).toBe('9780306406157');
    expect(reopened.Sheets.Master_Sau_Ban.D2.v).toBe(10);
    expect(reopened.Sheets.Master_Sau_Ban.F2.v).toBe(8);
    expect(reopened.Sheets.Master_Sau_Ban.F2.t).toBe('n');
    const audit = XLSX.utils.sheet_to_json(reopened.Sheets.Doi_Soat_Ton, { header: 1 });
    expect(audit[1][6]).toBe(2);
    expect(audit[2][7]).toBe('PENDING');
  });
});
