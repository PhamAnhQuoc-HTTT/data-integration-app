import React from 'react';
import { FIELD_LABELS } from '../../logic/fieldMapping';

export function MappingDetails({ fileState, catalog = false }) {
  const { mapping = {}, headers = [] } = fileState;
  const fields = Object.entries(mapping).filter(([field, index]) => field !== 'branchColumns' && Number.isInteger(index) && index >= 0);
  const required = catalog ? ['ma_dinh_danh', 'ten_sp'] : ['ma_don', 'ngay', 'so_luong', 'trang_thai'];
  const missing = required.filter(field => !(mapping[field] >= 0));
  if (!catalog && !(mapping.gia >= 0) && !(mapping.gia_dong >= 0)) missing.push('gia');
  return <details className="mt-3 text-xs">
    <summary className="cursor-pointer font-semibold text-indigo-700">Xem ánh xạ cột ({fields.length} trường)</summary>
    <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-[11px]">
        <thead className="bg-slate-100"><tr><th className="p-2">Trường hệ thống</th><th className="p-2">Cột nguồn</th></tr></thead>
        <tbody>{fields.map(([field, index]) => <tr key={field} className="border-t border-slate-100"><td className="p-2 font-medium">{FIELD_LABELS[field] || field}</td><td className="p-2 break-words">{headers[index]} <span className="text-slate-400">(cột {index + 1})</span></td></tr>)}</tbody>
      </table>
    </div>
    {missing.length > 0 && <p className="mt-2 text-amber-800">Chưa ánh xạ: {missing.map(field => FIELD_LABELS[field] || field).join(', ')}. Cần kiểm tra nguồn; hệ thống không tự bổ sung giá trị thiếu.</p>}
    {!catalog && <p className="mt-2 text-slate-600">{mapping.gia_dong >= 0 ? 'Giá trị dòng sản phẩm sau giảm giá; không nhân tổng tiền dòng với số lượng lần nữa.' : mapping.gia >= 0 ? 'Giá bán theo đơn vị × số lượng. Giá bìa chỉ để tham khảo.' : 'Chưa có cột giá bán để tính giá trị giao dịch.'}</p>}
    {mapping.branchColumns?.length > 0 && <p className="mt-2 text-amber-800">Cột chi nhánh: {mapping.branchColumns.map(branch => headers[branch.colIndex ?? branch.index] || branch.branchName).join(', ')}. Chưa coi là doanh số hoặc tồn kho.</p>}
  </details>;
}
