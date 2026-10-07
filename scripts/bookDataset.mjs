// Synthetic pilot only. Truth is assigned BEFORE corruption, never by the matcher.
export function createBookDataset() {
  const topics = ['Khu vườn sao nhỏ','Hành trình qua thung lũng','Những lá thư mùa hạ','Bí mật thành phố mây','Dòng sông ký ức','Bản đồ miền ánh sáng','Khám phá đại dương','Chuyện kể dưới tán cây','Toán học quanh ta','Lập trình cùng bạn nhỏ','Góc bếp ngày nắng','Nhật ký người trồng cây','Tiếng đàn bên cửa sổ','Chiếc hộp màu xanh','Đường về ngọn hải đăng','Bầu trời sau cơn mưa','Bức tranh chưa hoàn thành','Ngôi nhà bên triền đồi','Tư duy qua câu đố','Một ngày ở bảo tàng','Ngôn ngữ của khu rừng','Chuyến tàu cuối mùa','Nhịp sống trong trang sách','Đi tìm hạt mầm','Thế giới của hình khối','Câu chuyện chiếc đồng hồ','Sổ tay quan sát chim','Bài học từ dòng suối','Mùa gió trên cao nguyên','Người bạn từ hành tinh xa'];
  const books = topics.flatMap((title,family) => ['Bìa mềm','Bìa cứng'].map((binding,v) => ({
    id:`SIM${String(family*2+v+1).padStart(4,'0')}`, title:`${title} (${binding})`,
    publisher:`NXB Mô phỏng ${family%3+1}`, price:60000+family*3000+v*20000,
    family, split:family<10?'development':'evaluation',
  })));
  const headers = [
    ['Mã đơn','Tên sản phẩm','Barcode','Số lượng','Giá bán','Trạng thái','Ngày bán','Kênh','Nhà xuất bản'],
    ['Order ID','Product Name','SKU','Quantity','Unit Price','Order Status','Order Date','Platform','Publisher'],
    ['Mã hóa đơn','Tên hàng','Mã SP','SL','Đơn giá','Tình trạng','Ngày','Cửa hàng','NXB'],
  ];
  const sources=['POS_simulated.xlsx','Shopee_simulated.xlsx','Lazada_simulated.xlsx'];
  const files=sources.map((fileName,s)=>({fileName,headers:headers[s],rows:[]}));
  const truth=[], crosswalk=[], scenarios={};
  const plain=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
  for(let s=0;s<3;s++) for(let i=0;i<66;i++) for(let repeat=0;repeat<(i<60?3:1);repeat++) {
    const known=i<60, b=books[i]||{id:`OUT${i}`,title:`Tác phẩm ngoài danh mục ${i}`,publisher:'NXB Mô phỏng ngoài',price:85000,split:'evaluation'};
    const n=truth.length, qty=1+n%3, price=b.price-5000;
    const status=['Hoàn thành','Hoàn thành','Hoàn thành','Đã hủy','Trả hàng','Đang xử lý'][n%6];
    const day=`2026-01-${String(1+n%28).padStart(2,'0')}`;
    let title=b.title, code=b.id;
    const mutations=[];
    if(repeat===1){code=`LOCAL${String(i+1).padStart(3,'0')}`;crosswalk.push([code,b.id,sources[s]]);mutations.push('crosswalk');}
    if(repeat===2){code='';title=plain(title).toUpperCase();mutations.push('title_without_accents');}
    if(repeat===2 && i%5===0){title=title.replace(/\s*\([^)]*\)/,'');mutations.push('binding_omitted');}
    if(repeat===2 && i%7===0){title=title.replace(/A/g,'E');mutations.push('title_typo');}
    let observedQty=qty, observedPrice=price, observedStatus=status, observedDay=day;
    const anomaly=n%23;
    if(anomaly===0){observedQty='1.5';mutations.push('fractional_quantity');}
    if(anomaly===1){observedPrice='';mutations.push('missing_price');}
    if(anomaly===2){observedPrice='12abc34';mutations.push('invalid_price');}
    if(anomaly===3){observedDay='31/02/2026';mutations.push('invalid_date');}
    if(anomaly===4){observedStatus='';mutations.push('missing_status');}
    if(anomaly===5){observedPrice=0;mutations.push('zero_price');}
    if(anomaly===6){observedPrice=price*3;mutations.push('price_outlier');}
    if(anomaly===7){observedDay=day.split('-').reverse().join('/');mutations.push('date_format');}
    const orderId=`SYN-${s+1}-${String(files[s].rows.length+1).padStart(4,'0')}`;
    const observed=[orderId,title,code,observedQty,observedPrice,observedStatus,observedDay,['POS','Shopee','Lazada'][s],b.publisher];
    files[s].rows.push(observed);
    const validValue=![0,1,2].includes(anomaly);
    const eligible=validValue && observedStatus==='Hoàn thành';
    const expectedRevenue=eligible ? qty*observedPrice : 0;
    const entry={source:sources[s],sourceRow:files[s].rows.length+1,orderId,entityId:b.id,expectedCatalogId:known?b.id:null,split:b.split,mutations,
      expectedEligibleRevenue:expectedRevenue,expectedUniqueRevenue:expectedRevenue,
      latent:{title:b.title,quantity:qty,price,status,date:day},duplicateOf:null};
    truth.push(entry);
    // Exact duplicate imports: pipeline currently flags, but does not remove them.
    if(i%20===0 && repeat===0){files[s].rows.push([...observed]);truth.push({...entry,sourceRow:files[s].rows.length+1,mutations:[...mutations,'duplicate_import'],expectedUniqueRevenue:0,duplicateOf:entry.sourceRow});}
  }
  truth.forEach(r=>r.mutations.forEach(m=>scenarios[m]=(scenarios[m]||0)+1));
  const tables=[{fileName:'Catalog_simulated.xlsx',headers:['Mã định danh','Tên sản phẩm','Nhà xuất bản','Giá chuẩn'],rows:books.map(b=>[b.id,b.title,b.publisher,b.price])},
    ...files,{fileName:'Crosswalk_simulated.xlsx',headers:['internal_code','standard_code','source'],rows:crosswalk}];
  return {tables,books,truth,manifest:{version:'book-pilot-v1',synthetic:true,seed:'deterministic-v1-no-random',reviewStatus:'generated_not_human_validated',currency:'VND',catalogCount:books.length,rowCount:truth.length,scenarios,
    expectedEligibleRevenue:truth.reduce((a,b)=>a+b.expectedEligibleRevenue,0),expectedUniqueRevenue:truth.reduce((a,b)=>a+b.expectedUniqueRevenue,0)}};
}
