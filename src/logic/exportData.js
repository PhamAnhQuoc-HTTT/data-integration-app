import { GROUP_LABELS, SEVERITY_LABELS } from './qualityRules';

export function getExportData(result) {
  const headers = ['Nguồn','Mã đơn','Ngày','Tên sách','Mã định danh','Nhà xuất bản','Kênh','Trạng thái','Số lượng','Giá bán','Giá trị dòng','Trạng thái khớp','Vấn đề chất lượng','Dòng nguồn','Tên gốc','Mã gốc','Giá bìa','Mã NCC','Tên NCC','Tác giả','Điều kiện tính giá trị bán'];
  const rows = (result?.integrated || []).map(r => [
    r.nguon,r.ma_don,r.ngay,r.ten_sp,r.ma_dinh_danh,r.thuong_hieu,r.kenh,r.trang_thai,r.so_luong,r.gia,r.thanh_tien,r.matchStatus,
    r.issues.map(i => `[${GROUP_LABELS[i.group]} | ${SEVERITY_LABELS[i.severity]}] ${i.detail}`).join(' | ') || 'Không có',
    r.__sourceRow,r.original?.__raw_ten_sp,r.original?.__raw_ma_dinh_danh,r.gia_bia,r.ma_ncc,r.ten_ncc,r.tac_gia,r.revenueDisposition,
  ]);
  return { headers, rows };
}

export function csvCell(value) {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
