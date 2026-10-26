import { buildBusinessReports } from './businessReports';

export function getReportTables(result) {
  const reports = result.businessReports || buildBusinessReports(result.integrated || []);
  const gov = result.governanceAudit || {};
  return [
    { name: 'Bao_Cao_Kenh', headers: ['Kênh', 'Giá trị bán đủ điều kiện'], rows: reports.byChannel.map(r => [r.channel, r.amount]) },
    { name: 'Bao_Cao_San_Pham', headers: ['ID thực thể danh mục', 'Tên sản phẩm', 'Số lượng', 'Giá trị bán đủ điều kiện'],
      rows: [...reports.byProduct.map(r => [r.canonicalEntityId, r.title, r.quantity, r.amount]), ['CHUA_PHAN_BO', 'Chưa xác lập liên kết sản phẩm', null, reports.unallocatedProduct]] },
    { name: 'Bao_Cao_Thang', headers: ['Kỳ theo ngày nguồn có căn cứ', 'Giá trị bán đủ điều kiện'],
      rows: [...reports.byMonth.map(r => [r.month, r.amount]), ['CHUA_PHAN_BO', reports.unallocatedPeriod]] },
    { name: 'Doi_Soat_Bao_Cao', headers: ['Chỉ tiêu', 'Giá trị', 'Diễn giải'], rows: [
      ['Phiên bản quy tắc', result.runConfig?.policyVersion || '', 'Tổng theo snapshot, chưa phải doanh thu thuần/tiền quyết toán sàn'],
      ['Giá trị bán đủ điều kiện', reports.total, 'Cùng phạm vi với báo cáo kênh, sản phẩm và kỳ'],
      ['Giá trị giao dịch tính được', gov.rawRevenueTotal ?? null, 'Đã đọc số và lọc điều kiện tính được; không phải baseline trước mọi xử lý'],
      ['Không cộng hủy/hoàn', gov.cancelledRevenuePrevented ?? null, 'Theo trạng thái đã xác định'],
      ['Chờ trạng thái', gov.unconfirmedRevenue ?? null, 'Chưa đủ điều kiện ghi nhận theo hợp đồng'],
      ['Giữ chờ lặp khóa dòng', gov.duplicateReviewRevenue ?? null, 'Cùng hệ thống/shop/đơn/dòng; chưa tự chọn snapshot giữ'],
      ['Nghi trùng chưa tự trừ', gov.duplicateRevenueDiscrepancy ?? null, 'Khóa yếu: có thể là dòng hợp lệ hoặc thiếu phạm vi nguồn'],
      ['Chưa phân bổ sản phẩm', reports.unallocatedProduct, 'Đã nằm trong tổng đủ điều kiện; không cộng thêm lần nữa'],
      ['Chưa phân bổ kỳ', reports.unallocatedPeriod, 'Đã nằm trong tổng đủ điều kiện; ngày thiếu/mơ hồ/không hợp lệ'],
      ['Đánh giá GT', 'Chưa đính kèm', 'Các tổng vận hành không tự chứng minh precision, recall hoặc mức giảm sai số'],
    ] },
  ];
}
