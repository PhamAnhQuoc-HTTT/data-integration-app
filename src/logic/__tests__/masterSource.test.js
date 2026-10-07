import {describe,it,expect} from 'vitest';
import {runPipeline,applyManualDecisions} from '../pipeline';
import {getExportData} from '../exportData';
import {reconciliationCounts} from '../reconciliation';
import {detectFields} from '../fieldMapping';

const id='9780306406157';
const headers=['Order ID','Product Name','Seller SKU','Quantity','Unit Price','Status','Variation'];
const file=(name,rows)=>({fileName:name,dataRows:rows,mapping:detectFields(headers)});
const line=(order,variant,price=100,sku=id,title='Book')=>[order,title,sku,1,price,'Completed',variant];
const run=files=>runPipeline(files,null,{resolutionStrategy:'MASTER_SOURCE'});

describe('master source variant catalog and reviewed reports',()=>{
  it('averages transaction prices within one variant and keeps binding variants distinct',()=>{
    const r=run([file('POS',[line('A','Bìa cứng',100),line('B','Bìa cứng',120),line('C','Bìa mềm',200)])]);
    expect(r.synthesizedCatalog).toHaveLength(2);
    expect(r.synthesizedCatalog.map(c=>c.gia_chuan)).toEqual([110,200]);
    expect(r.stats.matchedCount).toBe(3);
    expect(r.integrated[0].productKey).toBe(r.integrated[1].productKey);
    expect(r.integrated[2].productKey).not.toBe(r.integrated[0].productKey);
    expect(r.revenueTotal).toBe(420);
  });
  it('does not overwrite a same-ISBN candidate by catalog insertion order',()=>{
    for(const variants of [['Bìa cứng','Bìa mềm'],['Bìa mềm','Bìa cứng']]){
      const r=run([file('POS',variants.map((v,i)=>line(`M${i}`,v))),file('Other',[line('H','Bìa cứng'),line('U','')])]);
      expect(r.integrated[2]).toMatchObject({matchStatus:'MATCHED_EXACT',matched:{phan_loai:'Bìa cứng'}});
      expect(r.integrated[3]).toMatchObject({matchStatus:'NEEDS_CONFIRMATION',matchScore:100});
      expect(r.revenueTotal).toBe(400);
    }
  });
  it('retains combo and single products separately even when the source reuses a SKU',()=>{
    const r=run([file('POS',[line('A','Combo'),line('B','Standard')]),file('Other',[line('C','')])]);
    expect(r.synthesizedCatalog).toHaveLength(2);
    expect(r.integrated[0].productKey).not.toBe(r.integrated[1].productKey);
    expect(r.integrated[2].matched.phan_loai).toBe('Standard');
  });
  it('still rejects conflicting duplicate IDs in an uploaded reference catalog',()=>{
    const catalog={mapping:detectFields(['ISBN','Tên sản phẩm','Giá chuẩn']),dataRows:[[id,'Book',100],[id,'Book',200]]};
    expect(()=>runPipeline([file('POS',[line('A','')])],catalog)).toThrow('mâu thuẫn');
  });
  it('does not let an explicit crosswalk merge a combo into a single book',()=>{
    const catalog={mapping:detectFields(['ISBN','Tên sản phẩm']),dataRows:[[id,'Book']]};
    const r=runPipeline([file('POS',[line('A','Combo',100,'LOCAL')])],catalog,{crosswalk:[{internal_code:'LOCAL',standard_code:id}]});
    expect(r.integrated[0].matchStatus).toBe('UNRESOLVED');
  });
  it('supports accept, reject and reaccept without corrupting revenue or the original proposal',()=>{
    const initial=run([file('POS',[line('H','Bìa cứng'),line('S','Bìa mềm')]),file('Other',[line('U','')])]);
    let decisions=new Map([[2,{decision:'ACCEPT'}]]);
    const yes=applyManualDecisions(initial,decisions);
    expect(yes.integrated[2].matchStatus).toBe('MATCHED_CONFIRMED_USER');
    expect(yes.stats.matchedCount).toBe(3);
    expect(reconciliationCounts(yes.pendingConfirmations,decisions)).toMatchObject({pending:0,reviewed:1});
    decisions=new Map([[2,{decision:'REJECT'}]]);
    const no=applyManualDecisions(yes,decisions);
    expect(no.integrated[2].matchStatus).toBe('REJECTED_USER');
    expect(no.stats.matchedCount).toBe(2);
    expect(no.integrated[2].productKey).toContain('SOURCE:');
    const again=applyManualDecisions(no,new Map([[2,{decision:'ACCEPT'}]]));
    expect(getExportData(again).rows[2][11]).toBe('MATCHED_CONFIRMED_USER');
    expect(getExportData(no).rows[2][11]).toBe('REJECTED_USER');
    for(const r of [initial,yes,no,again]){
      expect(r.revenueTotal).toBe(300);
      expect(r.revenueByChannel.reduce((a,c)=>a+c.doanhThu,0)).toBe(300);
      expect(r.topProducts.reduce((a,p)=>a+p.soLuong,0)).toBe(3);
      expect(r.integrated.some(x=>x.productKey==='CAT:-1')).toBe(false);
    }
    const fresh=run([file('New',[line('N','')])]);
    expect(fresh.integrated[0].matchStatus).toBe('MATCHED_EXACT');
    expect(fresh.pendingConfirmations).toHaveLength(0);
  });
});
