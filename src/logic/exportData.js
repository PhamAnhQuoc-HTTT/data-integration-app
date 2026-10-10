import { GROUP_LABELS, SEVERITY_LABELS } from './qualityRules';

export function getExportData(result) {
  const headers = ['Nguồn','Mã đơn','Ngày (ISO)','Tên sách','Mã định danh','NXB/Thương hiệu','Kênh','Trạng thái','Số lượng','Giá bán','Giá trị dòng','Trạng thái khớp','Vấn đề chất lượng','Dòng nguồn','Tên gốc','Mã gốc','Giá bìa','Mã NCC','Tên NCC','Tác giả','Điều kiện tính giá trị bán'];
  const rows = (result?.integrated || []).map(r => [
    r.nguon,r.ma_don,r.ngay,r.ten_sp,r.ma_dinh_danh,r.thuong_hieu,r.kenh,r.trang_thai,r.so_luong,r.gia,r.thanh_tien,r.matchStatus,
    r.issues.map(i => `[${GROUP_LABELS[i.group]} | ${SEVERITY_LABELS[i.severity]}] ${i.detail}`).join(' | ') || 'Không có',
    r.__sourceRow,r.original?.__raw_ten_sp,r.original?.__raw_ma_dinh_danh,r.gia_bia,r.ma_ncc,r.ten_ncc,r.tac_gia,r.revenueDisposition,
  ]);
  headers.push('Biến thể sách', 'Trạng thái trả hàng/hoàn tiền gốc', 'Trạng thái giao hàng gốc', 'Cơ sở giá bán', 'Tổng tiền sản phẩm nguồn');
  rows.forEach((r,i) => { const item = result.integrated[i]; r.push(item.phan_loai,item.hoan_tra,item.__raw_trang_thai,item.__priceBasis,item.gia_dong); });
  headers.push('Giá gốc nguồn', 'Giá tham chiếu danh mục', 'NXB/Thương hiệu nguồn', 'Mã NCC nguồn', 'Tên NCC nguồn', 'Ngày nguồn', 'Nguyên nhân liên kết');
  rows.forEach((r,i) => { const item = result.integrated[i]; r.push(item.gia_goc,item.gia_tham_chieu,item.thuong_hieu_nguon,item.ma_ncc_nguon,item.ten_ncc_nguon,item.__raw_ngay,item.matchReason || null); });
  return { headers, rows };
}

export function csvCell(value) {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
