import {describe,it,expect} from 'vitest';
import {detectFields,buildRows} from '../fieldMapping';
import {runPipeline} from '../pipeline';
import {normalizeDate,normalizeTransactionStatus} from '../normalize';
import {bookConflict} from '../bookMatching';

const file=(headers,dataRows)=>({fileName:'Shopee.xlsx',headers,dataRows,mapping:detectFields(headers),channelLabel:'Shopee'});
describe('marketplace export business rules',()=>{
  it('selects Shopee sale unit price, product SKU and order creation date',()=>{
    const h=['Mã đơn hàng','Trạng thái đơn hàng','Trạng thái Trả hàng/Hoàn tiền','Thời gian đặt hàng','Tên Sản phẩm','Mã SKU cha','SKU sản phẩm','Giá gốc','Giá ưu đãi','Số lượng','Tổng giá bán (sản phẩm)'];
    const f=file(h,[['A','Đã giao','Không trả hàng','2025-07-04','Book','PARENT','CHILD',60000,55200,3,165600]]);
    const r=runPipeline([f]);
    expect(r.integrated[0]).toMatchObject({ma_dinh_danh:'CHILD',ngay:'2025-07-04',gia:55200,thanh_tien:165600});
    expect(r.revenueTotal).toBe(165600);
  });
  it('excludes delivered Shopee orders that were refunded',()=>{
    const f=file(['Mã đơn hàng','Tên sản phẩm','SKU sản phẩm','Giá ưu đãi','Số lượng','Trạng thái đơn hàng','Trạng thái Trả hàng/Hoàn tiền'],[['A','Book','X',100,2,'Đã giao','Đã hoàn tiền']]);
    const r=runPipeline([f]);
    expect(r.revenueTotal).toBe(0);
    expect(r.integrated[0]).toMatchObject({trang_thai:'Trả hàng',revenueDisposition:'CANCELLED',__raw_trang_thai:'Đã giao',hoan_tra:'Đã hoàn tiền'});
  });
  it('keeps return requests out of completed revenue without calling them completed refunds',()=>{
    expect(normalizeTransactionStatus('Đã giao','Return requested')).toBe('Chờ đối soát trả hàng/hoàn tiền');
    expect(normalizeTransactionStatus('Đã hủy','Không trả hàng')).toBe('Đã hủy');
  });
  it('recognizes Lazada camelCase columns and does not treat voucherPlatform as a channel',()=>{
    const h=['orderItemId','orderNumber','sellerSku','lazadaSku','itemName','unitPrice','itemSubtotal','Qty','status','createTime','voucherPlatform'];
    const f=file(h,[['LINE1','ORDER1','SELLER','PLATFORM','Book',100,180,2,'Đã giao','2025-07-20',20]]);
    f.channelLabel='Lazada';
    const r=runPipeline([f]);
    expect(r.integrated[0]).toMatchObject({ma_don:'ORDER1',ma_dinh_danh:'SELLER',ten_sp:'Book',gia:90,thanh_tien:180,kenh:'Lazada'});
  });
  it('uses TikTok product subtotal after discounts, preserving exact line amount',()=>{
    const h=['Order ID','Product Name','Seller SKU','TikTok Shop SKU ID','Quantity','SKU Unit Original Price','SKU Subtotal After Discount','Order Amount','Order Status','Created Time','Platform Discount'];
    const f=file(h,[['A','Book','S','T',3,100,250,400,'Đã giao','2025-07-20',50]]);
    f.channelLabel='TikTok Shop';
    const r=runPipeline([f]);
    expect(r.integrated[0]).toMatchObject({ma_dinh_danh:'S',gia:250/3,thanh_tien:250,kenh:'TikTok Shop'});
    expect(r.revenueTotal).toBe(250);
  });
  it.each([0,-1,'1.5',''])('does not include invalid line quantity %s',qty=>{
    const f=file(['Order ID','Product Name','Quantity','itemSubtotal','Status'],[['A','Book',qty,250,'Completed']]);
    expect(runPipeline([f]).revenueTotal).toBe(0);
  });
  it('keeps missing line totals missing instead of replacing them with original prices',()=>{
    const f=file(['Order ID','Product Name','Quantity','SKU Subtotal After Discount','SKU Unit Original Price','Status'],[['A','Book',2,'',100,'Completed']]);
    expect(runPipeline([f]).revenueTotal).toBe(0);
  });
  it('prefers ISBN over EAN when both are present without checksum-gating import',()=>{
    expect(detectFields(['Barcode EAN-13','ISBN-13']).ma_dinh_danh).toBe(1);
    const cat={mapping:detectFields(['ISBN-13','Tên sản phẩm']),dataRows:[['9780306406158','Book']]};
    const f=file(['Order ID','Product Name','SKU','Quantity','Unit Price','Status'],[['A','Book','9780306406158',1,100,'Completed']]);
    expect(runPipeline([f],cat).integrated[0].matchStatus).toBe('MATCHED_EXACT');
  });
  it('retains variant metadata and blocks combo to single-book matches',()=>{
    const f=file(['Product Name','Seller SKU','Variation'],[['Book','X','Combo']]);
    const r=buildRows(f.dataRows,f.mapping)[0];
    expect(r.phan_loai).toBe('Combo');
    expect(bookConflict(r,{ten_sp:'Book',ma_dinh_danh:'X'})).toBe(true);
  });
  it.each([[45869.65416666667,'2025-07-31'],['07/20/2025 14:45','2025-07-20'],['31/07/2025','2025-07-31'],['2025-07-32',null],['2025-13-04',null]])('normalizes dates without rolling over invalid days: %s', (raw,expected)=>{
    expect(normalizeDate(raw)).toBe(expected);
  });
});
