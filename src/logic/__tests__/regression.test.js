import { describe, it, expect } from 'vitest';
import { normalizeDate, normalizeNumber } from '../normalize';
import { buildRows, detectFields } from '../fieldMapping';
import { runPipeline, applyManualDecisions } from '../pipeline';
import { resolveEntities } from '../entityResolution';
import { parseCrosswalk } from '../crosswalk';
import { getExportData, csvCell } from '../exportData';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HitlWorkbenchTab } from '../../components/tabs/HitlWorkbenchTab';
import { reconciliationCounts } from '../reconciliation';

const mapping = {ma_don:0,ten_sp:1,ma_dinh_danh:2,so_luong:3,gia:4,trang_thai:5,ngay:6,kenh:7,thuong_hieu:8};
const row = (id='D1',title='Book',sku='SKU1',price='100',status='Hoàn thành') => [id,title,sku,'1',price,status,'2026-01-01','POS','NXB'];
const file = (dataRows,name='orders.xlsx') => ({fileName:name,dataRows,mapping});
const catalog = (title='abcdefghij',sku='CAT1') => ({dataRows:[[title,sku,'100','NXB']],mapping:{ten_sp:0,ma_dinh_danh:1,gia_chuan:2,thuong_hieu:3}});

describe('input preservation and book business rules', () => {
  const renderWorkbench = (result, decisions = new Map()) => renderToStaticMarkup(createElement(HitlWorkbenchTab, {
    pendingConfirmations: result.pendingConfirmations, manualConfirmations: decisions,
    onManualDecision: () => {}, config: { fuzzyConfirmThreshold: 70, fuzzyHighThreshold: 90 },
  }));
  it('does not show a source-exclusive copy as a proposal or render a stray zero', () => {
    const r = runPipeline([file([row('D1', 'Đắc Nhân Tâm', 'SKU1')])]);
    const html = renderWorkbench(r);
    expect(html).toContain('Chưa có liên kết — giữ nguyên dữ liệu');
    expect(html).not.toContain('Chấp thuận ghép');
    expect(html).not.toContain('Từ chối ghép');
    expect(html).not.toContain('Giá tham chiếu');
    expect(html).not.toMatch(/>0</);
    expect(html.match(/Đắc Nhân Tâm/g)).toHaveLength(1);
    expect(reconciliationCounts(r.pendingConfirmations, new Map())).toEqual({ pending: 0, reviewed: 0, unlinked: 1 });
  });
  it('keeps catalog-unresolved rows without review actions', () => {
    const r = runPipeline([file([row('D1', 'zzzzzzzzzz', 'NONE')])], catalog());
    expect(renderWorkbench(r)).not.toContain('Từ chối ghép');
    const no = applyManualDecisions(r, new Map([[0, {decision: 'REJECT'}]]));
    expect(no.integrated[0].matchStatus).toBe('UNRESOLVED');
    expect(no.revenueTotal).toBe(r.revenueTotal);
  });
  it('counts only actionable proposals and keeps reviewed ones separate', () => {
    const r = runPipeline([file([row('D1', 'abcdefgxyz', 'RAW'), row('D2', 'zzzzzzzzzz', 'NONE')])], catalog());
    expect(reconciliationCounts(r.pendingConfirmations, new Map())).toEqual({pending: 1, reviewed: 0, unlinked: 1});
    const decisions = new Map([[0, {decision:'ACCEPT'}]]);
    const yes = applyManualDecisions(r, decisions);
    expect(reconciliationCounts(yes.pendingConfirmations, decisions)).toEqual({pending: 0, reviewed: 1, unlinked: 1});
    expect(renderWorkbench(yes, decisions)).toContain('Chấp thuận ghép');
  });
  it('loads and applies normalized crosswalk codes', () => {
    const crosswalk=parseCrosswalk(['internal_code','standard_code'],[['RAW1','CAT-1']]);
    const r=runPipeline([file([row('D1','Unrelated','RAW1')])],catalog(),{crosswalk});
    expect(r.integrated[0].matchTier).toBe('tier2_crosswalk');
    expect(r.integrated[0].ma_dinh_danh).toBe('CAT1');
  });
  it('rejects ambiguous crosswalks', () => {
    expect(()=>parseCrosswalk(['Mã nội bộ','Mã chuẩn'],[['A','X'],['A','Y']])).toThrow('mâu thuẫn');
  });
  it('does not pretend to apply crosswalk under an unsupported strategy', () => {
    expect(()=>runPipeline([file([row()])],null,{crosswalk:[{internal_code:'A',standard_code:'B'}]})).toThrow('Master Source');
  });
  it('exports the reviewed result with source lineage', () => {
    const r=runPipeline([file([[],row('D1','abcdefgxyz','RAW1')])],catalog());
    const no=applyManualDecisions(r,new Map([[0,{decision:'REJECT'}]]));
    const exported=getExportData(no);
    expect(exported.rows[0][3]).toBe('abcdefgxyz');
    expect(exported.rows[0][4]).toBe('RAW1');
    expect(exported.rows[0][13]).toBe(3);
    expect(exported.rows[0]).toHaveLength(exported.headers.length);
    expect(csvCell('=1+1')).toBe('"\'=1+1"');
  });
  it('renders a candidate and an accept action even after rejection', () => {
    const r=runPipeline([file([row('D1','abcdefgxyz','RAW1')])],catalog());
    const decisions=new Map([[0,{decision:'REJECT'}]]);
    const no=applyManualDecisions(r,decisions);
    const html=renderToStaticMarkup(createElement(HitlWorkbenchTab,{pendingConfirmations:no.pendingConfirmations,manualConfirmations:decisions,onManualDecision:()=>{},config:{fuzzyConfirmThreshold:70,fuzzyHighThreshold:90}}));
    expect(html).toContain('Chấp thuận ghép');
    expect(html).toContain('abcdefghij');
    expect(html).toContain('abcdefgxyz');
  });
  it('updates earlier source evidence in progressive matching', () => {
    const r=runPipeline([file([row('D1','Alpha','A')],'a'),file([row('D2','Zebra','Z')],'b'),file([row('D3','Alpha','A')],'c')]);
    expect(r.integrated[0].matchStatus).toBe('MATCHED_FUZZY_HIGH');
    expect(r.integrated[2].matchStatus).toBe('MATCHED_FUZZY_HIGH');
  });
  it('keeps different SKUs with identical titles as distinct catalog entities', () => {
    const c={mapping:catalog().mapping,dataRows:[['Book','A','100','NXB'],['Book','B','100','NXB']]};
    const r=runPipeline([file([row('D1','Book','A'),row('D2','Book','B')])],c);
    expect(r.governanceAudit.cleanUniqueProductsCount).toBe(2);
  });
  it.each(['31/02/2025','29/02/2025','31/04/2025'])('rejects impossible date %s', x => expect(normalizeDate(x)).toBeNull());
  it.each(['12abc34','1,2,3','Infinity','1e3'])('rejects malformed number %s', x => expect(normalizeNumber(x)).toBeNull());
  it('keeps local Excel dates through row construction', () => {
    const r=buildRows([['Book',new Date(2025,6,29)]],{ten_sp:0,ngay:1});
    expect(normalizeDate(r[0].ngay)).toBe('2025-07-29');
  });
  it('does not unpivot a categorical branch column', () => {
    const m=detectFields(['Mã đơn','Tên sản phẩm','Số lượng','Giá bán','Chi nhánh']);
    expect(m.branchColumns).toHaveLength(0);
    expect(buildRows([['D1','Book',2,100,'Hà Nội']],m)).toHaveLength(1);
  });
  it('separates list price and supplier from sales price and publisher', () => {
    const m=detectFields(['Barcode','Tên sản phẩm','Mã NCC','Tên NCC','Giá bìa','GDNSBT - NS FAHASA']);
    const result=runPipeline([{fileName:'sample',mapping:m,dataRows:[['SKU1','Book','N1','Supplier',100,'1.000']]}]);
    expect(result.integrated[0]).toMatchObject({so_luong:1000,gia:null,gia_bia:100,ten_ncc:'Supplier',ma_ncc:'N1',ngay:'',trang_thai:null});
    expect(result.revenueTotal).toBe(0);
  });
  it('preserves annotations and zero values in wide tables', () => {
    const m=detectFields(['Tên sản phẩm','GDNSBT - NS FAHASA']);
    expect(buildRows([['Book','hủy'],['Book',0]],m)).toHaveLength(2);
  });
  it('does not map order status to order id', () => {
    const m=detectFields(['Order Status','Product Name','Quantity','Price']);
    expect(m.ma_don).toBe(-1); expect(m.trang_thai).toBe(0);
  });
  it('rejects different book volumes and binding variants', () => {
    for (const [a,b] of [['Doraemon Tập 10','Doraemon Tập 11'],['Nhà Giả Kim (bìa cứng)','Nhà Giả Kim (bìa mềm)']]) {
      expect(resolveEntities([{ten_sp:a}],[{ten_sp:b,ma_dinh_danh:'C1'}])[0].matchStatus).toBe('UNRESOLVED');
    }
  });
  it('does not manufacture completed status or revenue', () => {
    const r=runPipeline([file([row('D1','Book','SKU1','100','')])]);
    expect(r.integrated[0].trang_thai).toBeNull(); expect(r.revenueTotal).toBe(0);
  });
  it('keeps all quality issues in the aggregate', () => {
    const r=runPipeline([file([row('D1','Book','9780306406158')])],catalog('Book','9780306406158'));
    expect(r.issues.some(x=>x.detail.includes('checksum'))).toBe(true);
    expect(r.issues.length).toBe(r.integrated.reduce((s,x)=>s+x.issues.length,0));
  });
  it('does not mark distinct order lines as duplicates', () => {
    const r=runPipeline([file([row('D1','A','A'),row('D1','B','B')])]);
    expect(r.governanceAudit.duplicateRevenueDiscrepancy).toBe(0);
  });
  it('reports excess duplicate candidates without silently removing them', () => {
    const r=runPipeline([file([row(),row(),row()])]);
    expect(r.governanceAudit.duplicateRevenueDiscrepancy).toBe(200);
    expect(r.revenueTotal).toBe(300);
  });
  it('uses one exclusion policy for all revenue views', () => {
    const r=runPipeline([file([row(),row('D2','Book','SKU1','100','Đã hoàn tiền'),row('D3','Book','SKU1','100','refund requested'),row('D4','Book','SKU1','100','Hoàn tiền')])]);
    expect(r.revenueTotal).toBe(100);
    expect(r.revenueByChannel.reduce((s,x)=>s+x.doanhThu,0)).toBe(100);
    expect(r.governanceAudit.cancelledRevenuePrevented).toBe(100);
    expect(r.governanceAudit.unconfirmedRevenue).toBe(200);
  });
  it('uses unique source identities despite equal filenames', () => {
    const r=runPipeline([file([row()]),file([row('D2')])]);
    expect(r.bipartiteStats.totalSources).toBe(2);
    expect(r.stats.matchedCount).toBe(2);
  });
  it('does not crash on object prototype names', () => expect(()=>runPipeline([file([row('D1','constructor')])])).not.toThrow());
  it('keeps pending candidates out of accepted statistics and permits reversible HITL', () => {
    const initial=runPipeline([file([row('D1','abcdefgxyz','RAW1')])],catalog());
    expect(initial.integrated[0]).toMatchObject({ten_sp:'abcdefgxyz',ma_dinh_danh:'RAW1',matchStatus:'NEEDS_CONFIRMATION'});
    expect(initial.resolutionStats.improvementRate).toBe(0);
    const yes=applyManualDecisions(initial,new Map([[0,{decision:'ACCEPT'}]]));
    expect(yes.integrated[0].ten_sp).toBe('abcdefghij'); expect(yes.stats.matchedCount).toBe(1);
    expect(yes.topProducts[0].ten).toBe('abcdefghij');
    const no=applyManualDecisions(yes,new Map([[0,{decision:'REJECT'}]]));
    expect(no.integrated[0]).toMatchObject({ten_sp:'abcdefgxyz',ma_dinh_danh:'RAW1',matchStatus:'REJECTED_USER'});
    expect(no.stats.matchedCount).toBe(0); expect(no.topProducts[0].ten).toBe('abcdefgxyz');
  });
});
