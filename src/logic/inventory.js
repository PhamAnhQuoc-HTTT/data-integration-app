import { normalizeIdCode, normalizeNumber, normalizeOrderStatus, normalizeText, removeDiacritics, isValidDate } from './normalize';

export function suggestedStockColumn(headers) {
  const matches = headers.map((header, index) => ({ index, text: removeDiacritics(header).trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ') }))
    .filter(({ text }) => ['ton kho', 'hang ton', 'so luong ton', 'sl ton', 'ton dau ky', 'opening stock', 'stock', 'inventory', 'stock quantity'].includes(text));
  return matches.length === 1 ? matches[0].index : -1;
}

const linked = status => ['MATCHED_EXACT', 'MATCHED_FUZZY_HIGH', 'MATCHED_CONFIRMED_USER'].includes(status);
const validStock = value => value !== null && Number.isInteger(value) && value >= 0;

/** A deterministic proposal from an unchanged opening snapshot, NOT a warehouse ledger.
 * Unknown shipments/returns/receipts are exposed, never inferred from revenue amounts.
 */
export function buildInventoryProposal(result, catalogFile, stockColumn) {
  if (result.integrationMode !== 'CATALOG' || !catalogFile) throw new Error('Cần master riêng để đối soát tồn kho; danh mục tổng hợp từ đơn hàng không phải tồn đầu kỳ.');
  if (!Number.isInteger(stockColumn) || stockColumn < 0 || stockColumn >= catalogFile.headers.length) throw new Error('Hãy chọn cột tồn đầu kỳ trong master.');
  const idColumn = catalogFile.mapping?.ma_dinh_danh;
  if (!(idColumn >= 0)) throw new Error('Master cần cột mã SKU/Barcode để đối soát tồn.');
  // "SL" is a common master-stock header but also matches sales quantity.
  // Allow it only here, with the explicit opening-stock column selection in the UI.
  if (Object.entries(catalogFile.mapping).some(([field, index]) => field !== 'so_luong' && Number.isInteger(index) && index === stockColumn)) throw new Error('Cột tồn kho không được là cột mã, giá hoặc trường đã ánh xạ khác.');
  const byCode = new Map();
  const master = catalogFile.dataRows.map((raw, index) => {
    const code = normalizeIdCode(raw[idColumn]) || '';
    const entry = { index, code, opening: normalizeNumber(raw[stockColumn]), deducted: 0, pending: 0, reasons: new Set(), raw };
    if (code) { if (!byCode.has(code)) byCode.set(code, []); byCode.get(code).push(entry); }
    if (raw.some(value => String(value ?? '').trim())) {
      if (!code) entry.reasons.add('Thiếu mã sản phẩm master');
      if (!validStock(entry.opening)) entry.reasons.add('Tồn đầu kỳ thiếu hoặc không phải số nguyên không âm');
    }
    return entry;
  });
  byCode.forEach(entries => { if (entries.length > 1) entries.forEach(entry => entry.reasons.add('Mã master bị lặp; chưa xác định một dòng tồn duy nhất')); });
  const rows = result.integrated || [];
  // Do not silently choose one repeated order line. Hold all members for review.
  const counts = new Map();
  const orderKey = row => JSON.stringify([row.__source || row.nguon, row.ma_don, row.productKey || row.ma_dinh_danh]);
  rows.filter(row => row.ma_don).forEach(row => { const key = orderKey(row); counts.set(key, (counts.get(key) || 0) + 1); });
  const movements = rows.map(row => {
    const candidates = linked(row.matchStatus) && row.productKey?.startsWith('CAT:') ? byCode.get(normalizeIdCode(row.ma_dinh_danh)) || [] : [];
    const entry = candidates.length === 1 ? candidates[0] : null;
    const qty = normalizeNumber(row.so_luong);
    const status = normalizeOrderStatus(row.trang_thai);
    let reason = '';
    let disposition = 'PENDING';
    if (row._isUnpivoted) reason = 'Bảng ngang chưa xác định nghiệp vụ';
    else if (status === 'Đã hủy') { disposition = 'NO_DEDUCTION'; reason = 'Đơn hủy: không giảm theo quy tắc bán hoàn thành'; }
    else if (status === 'Trả hàng') reason = 'Trả hàng/hoàn tiền: cần chứng từ xuất và nhập lại, không tự cộng hoặc trừ';
    else if (!linked(row.matchStatus) || !row.productKey?.startsWith('CAT:')) reason = 'Chưa có liên kết được chấp thuận với master';
    else if (!entry) reason = 'Mã master thiếu hoặc bị lặp';
    else if (!validStock(entry.opening)) reason = 'Tồn đầu kỳ không hợp lệ';
    else if (!row.ma_don) reason = 'Thiếu mã đơn để đối soát lần giảm tồn';
    else if (counts.get(orderKey(row)) > 1) reason = 'Nhiều dòng cùng nguồn, đơn và sản phẩm; cần kiểm tra trùng hoặc tách dòng';
    else if (!isValidDate(row.ngay)) reason = 'Ngày giao dịch chưa hợp lệ để đối soát kỳ tồn';
    else if (qty === null || !Number.isInteger(qty) || qty <= 0) reason = 'Số lượng không phải số nguyên dương';
    else if (status !== 'Hoàn thành') reason = 'Chưa hoàn thành; chưa suy đoán hàng đã xuất kho';
    else { disposition = 'DEDUCTED'; reason = 'Liên kết được chấp thuận, đơn hoàn thành, số lượng hợp lệ'; entry.deducted += qty; }
    if (entry && disposition === 'PENDING') { entry.pending++; entry.reasons.add(reason); }
    return { rowIndex: row.rowIndex, source: row.nguon, orderId: row.ma_don, sourceRow: row.__sourceRow, code: row.ma_dinh_danh, title: row.ten_sp, qty, deducted: disposition === 'DEDUCTED' ? qty : 0, disposition, reason };
  });
  const outputRows = master.map(entry => {
    const empty = !entry.raw.some(value => String(value ?? '').trim());
    const calculable = !!entry.code && byCode.get(entry.code)?.length === 1 && validStock(entry.opening);
    const closing = calculable ? entry.opening - entry.deducted : null;
    if (closing < 0) entry.reasons.add('Tồn đề xuất âm; kiểm tra kỳ tồn, dữ liệu bán và nhập hàng');
    const label = empty ? '' : [...entry.reasons].join('; ') || 'Đã đối soát theo phạm vi đơn tải lên';
    return [...catalogFile.headers.map((_, i) => entry.raw[i] ?? ''), empty ? '' : entry.deducted, closing ?? '', empty ? '' : entry.pending, label];
  });
  const pendingCount = movements.filter(row => row.disposition === 'PENDING').length;
  return {
    headers: [...catalogFile.headers, 'SL giảm theo đơn hoàn thành', 'Tồn sau bán đề xuất', 'Dòng chờ đối soát', 'Ghi chú tồn kho'],
    rows: outputRows, movements,
    summary: { deductedQuantity: movements.reduce((sum, row) => sum + row.deducted, 0), pendingCount, negativeCount: master.filter(entry => validStock(entry.opening) && entry.opening - entry.deducted < 0).length },
    stockColumn, masterName: normalizeText(catalogFile.fileName),
  };
}
