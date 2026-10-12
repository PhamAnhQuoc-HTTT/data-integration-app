export const REVENUE_LABELS = {
  INCLUDED: 'Có — hoàn thành, giá và số lượng hợp lệ',
  CANCELLED: 'Không — đơn hủy hoặc trả hàng/hoàn tiền',
  INVALID_VALUE: 'Không — giá hoặc số lượng không hợp lệ',
  UNCONFIRMED_STATUS: 'Không — trạng thái chưa đủ điều kiện',
  UNKNOWN_DATA_TYPE: 'Không — chưa xác định nghiệp vụ bảng ngang',
};

export function linkingSummary(result) {
  const total = result.stats?.totalRows || 0;
  // Always read the immutable initial run, never the post-HITL KPI.
  const automatic = (result._base?.resolved || []).filter(row =>
    ['MATCHED_EXACT', 'MATCHED_FUZZY_HIGH'].includes(row.matchStatus)).length;
  const confirmed = (result.integrated || []).filter(row => row.matchStatus === 'MATCHED_CONFIRMED_USER').length;
  const linked = result.stats?.matchedCount || 0;
  const percent = count => total ? Math.round(count / total * 100) : 0;
  return { total, automatic, confirmed, linked, automaticRate: percent(automatic), linkedRate: percent(linked) };
}

export function compactVND(value) {
  const abs = Math.abs(value);
  const unit = abs >= 1e9 ? [1e9, ' tỷ'] : abs >= 1e6 ? [1e6, ' tr'] : abs >= 1e3 ? [1e3, ' nghìn'] : [1, ''];
  return (value / unit[0]).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + unit[1];
}
