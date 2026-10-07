import {describe,it,expect} from 'vitest';
import * as XLSX from 'xlsx';
import {createBookDataset} from '../../../scripts/bookDataset.mjs';
import {detectFields} from '../fieldMapping';
import {parseCrosswalk} from '../crosswalk';
import {runPipeline} from '../pipeline';

const data=createBookDataset();
function read(table){
  // Exercise the same Excel serialization/parser without requiring local exports.
  const source=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(source,XLSX.utils.aoa_to_sheet([table.headers,...table.rows]),'Data');
  const wb=XLSX.read(XLSX.write(source,{type:'buffer',bookType:'xlsx'}),{type:'buffer',cellDates:true});
  const [headers,...dataRows]=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''});
  return {fileName:table.fileName,headers,dataRows,mapping:detectFields(headers)};
}
describe('synthetic pilot integrity (not matcher accuracy evaluation)',()=>{
  it('reproduces the same truth without importing production matching code',()=>{
    expect(createBookDataset()).toEqual(data);
    expect(data.books).toHaveLength(60);
    expect(data.truth).toHaveLength(570);
    expect(new Set(data.truth.map(r=>`${r.source}:${r.sourceRow}`)).size).toBe(570);
    const ids=new Set(data.books.map(b=>b.id));
    expect(data.truth.every(r=>r.expectedCatalogId===null || ids.has(r.expectedCatalogId))).toBe(true);
    const families=new Map();
    for(const b of data.books){if(families.has(b.family))expect(families.get(b.family)).toBe(b.split);families.set(b.family,b.split);}
  });
  it('round-trips every Excel cell without dropping injected errors',()=>{
    for(const t of data.tables){const f=read(t);expect(f.headers).toEqual(t.headers);expect(f.dataRows).toEqual(t.rows);}
  });
  it('maps the three source schemas and reconciles every observed-row revenue',()=>{
    const files=data.tables.map(read);
    const result=runPipeline(files.slice(1,4),files[0],{crosswalk:parseCrosswalk(files[4].headers,files[4].dataRows)});
    expect(result.integrated).toHaveLength(570);
    expect(result.revenueTotal).toBe(data.manifest.expectedEligibleRevenue);
    result.integrated.forEach((r,i)=>{
      const truth=data.truth[i];
      expect(r.__sourceName).toBe(truth.source);
      expect(r.ma_don).toBe(truth.orderId);
      expect(r.revenueDisposition==='INCLUDED'?r.thanh_tien:0).toBe(truth.expectedEligibleRevenue);
    });
    expect(data.manifest.expectedEligibleRevenue-data.manifest.expectedUniqueRevenue).toBe(795000);
  });
});
