export const STRATEGY_LABELS = {
  BIPARTITE: 'Ghép cặp tham lam giữa các nguồn',
  CLUSTERING: 'Gom cụm theo sản phẩm đại diện',
  MASTER_SOURCE: 'Chọn một tệp đơn hàng làm nguồn chuẩn',
};

export function createConfigDraft({ activePresetId, config, selectedStrategy, masterSourceIndex }) {
  return { activePresetId, config: { ...config }, selectedStrategy, masterSourceIndex };
}

export function validateUiConfig(draft, { hasCatalog = false, orderFiles = [], crosswalkCount = 0 } = {}) {
  const limits = [
    ['fuzzyConfirmThreshold', 40, 90, 'Ngưỡng cần duyệt'],
    ['fuzzyHighThreshold', 75, 99, 'Ngưỡng tự động ghép'],
    ['priceDeviationThreshold', 10, 60, 'Ngưỡng cảnh báo lệch giá'],
  ];
  for (const [field, min, max, label] of limits) {
    const value = draft.config[field];
    if (!Number.isFinite(value) || value < min || value > max) return label + ' phải nằm trong khoảng ' + min + '%–' + max + '%.';
  }
  if (draft.config.fuzzyConfirmThreshold > draft.config.fuzzyHighThreshold) {
    return 'Ngưỡng cần duyệt phải nhỏ hơn hoặc bằng ngưỡng tự động ghép.';
  }
  if (!hasCatalog && !Object.hasOwn(STRATEGY_LABELS, draft.selectedStrategy)) return 'Vui lòng chọn chiến lược liên kết hợp lệ.';
  if (crosswalkCount > 0 && !hasCatalog && draft.selectedStrategy !== 'MASTER_SOURCE') {
    return 'Crosswalk cần danh mục chuẩn hoặc chế độ nguồn chuẩn chỉ định. Hãy đổi chế độ hoặc xóa Crosswalk.';
  }
  if (!hasCatalog && draft.selectedStrategy === 'MASTER_SOURCE' && orderFiles.length > 0
    && (!Number.isInteger(draft.masterSourceIndex) || draft.masterSourceIndex < 0 || draft.masterSourceIndex >= orderFiles.length)) {
    return 'Vui lòng chọn lại tệp đơn hàng làm nguồn chuẩn.';
  }
  return '';
}

export function sourceIndexAfterRemoval(selectedIndex, removedIndex) {
  return selectedIndex === removedIndex ? 0 : selectedIndex > removedIndex ? selectedIndex - 1 : selectedIndex;
}
