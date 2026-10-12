import * as XLSX from 'xlsx';

// Use the application's existing Excel exporter. No source workbook is overwritten.
export function inventoryWorkbook(proposal) {
  const workbook = XLSX.utils.book_new();
  const sheets = [
    ['Master_Sau_Ban', [proposal.headers, ...proposal.rows]],
    ['Doi_Soat_Ton', [['Nguồn', 'Mã đơn', 'Dòng nguồn', 'Mã sản phẩm', 'Tên sản phẩm', 'SL nguồn', 'SL giảm', 'Xử lý', 'Lý do'],
      ...proposal.movements.map(row => [row.source, row.orderId, row.sourceRow, row.code, row.title, row.qty ?? '', row.deducted, row.disposition, row.reason])]],
    ['Pham_Vi', [['Nội dung', 'Giá trị'], ['Master nguồn', proposal.masterName], ['Cột tồn đầu kỳ', proposal.headers[proposal.stockColumn]],
      ['Quy tắc', 'Tồn sau bán đề xuất = tồn đầu kỳ - SL đơn hoàn thành đã liên kết; không phải tồn kho thực tế'],
      ['Phạm vi xác nhận', 'Tồn đầu kỳ chưa trừ bộ đơn tải lên; cùng một kho/tập tồn, không có nhập hoặc điều chuyển trong phép tính này'],
      ['Ngoại lệ', 'Chưa liên kết, nghi trùng, thiếu dữ liệu, trạng thái chưa hoàn thành và trả/hoàn giữ để đối soát; không tự cộng hàng hoàn'],
      ['Dùng lại', 'Tính lại từ master đầu kỳ gốc; không dùng file tồn sau bán để trừ lại cùng bộ đơn'],
      ['Số lượng đã giảm', proposal.summary.deductedQuantity], ['Dòng chờ đối soát', proposal.summary.pendingCount], ['Dòng tồn âm', proposal.summary.negativeCount]]],
  ];
  for (const [name, data] of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = data[0].map((header, i) => ({ wch: Math.min(60, Math.max(14, String(header).length + 2, ...data.slice(1, 60).map(row => Math.min(60, String(row[i] ?? '').length + 2)))) }));
    if (data.length > 1) sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ r: 0, c: 0 }, { r: data.length - 1, c: data[0].length - 1 }) };
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  return workbook;
}
