import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { buildInventoryProposal, suggestedStockColumn } from '../../logic/inventory';
import { inventoryWorkbook } from '../../logic/inventoryExport';

export function InventoryTab({ result, catalogFile }) {
  const [stockColumn, setStockColumn] = useState(() => suggestedStockColumn(catalogFile?.headers || []));
  const [acknowledged, setAcknowledged] = useState(false);
  const [exportError, setExportError] = useState('');
  const calculation = useMemo(() => {
    if (stockColumn < 0 || !catalogFile || result.integrationMode !== 'CATALOG') return null;
    try { return { proposal: buildInventoryProposal(result, catalogFile, stockColumn) }; }
    catch (error) { return { error: error.message }; }
  }, [result, catalogFile, stockColumn]);
  if (!catalogFile || result.integrationMode !== 'CATALOG') return <div className="p-5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">Cần tải master riêng có mã sản phẩm và tồn đầu kỳ. Danh mục tổng hợp từ đơn hàng không cung cấp tồn kho.</div>;
  const proposal = calculation?.proposal;
  return <section className="p-4 sm:p-5 bg-white border border-slate-200 rounded-xl space-y-4">
    <div><h3 className="text-sm font-bold text-slate-900">Xuất master và tồn sau bán đề xuất</h3>
      <p className="mt-2 text-xs text-slate-600">Giữ nguyên các cột master gốc, thêm số lượng giảm và tồn sau bán. Chỉ giảm đơn hoàn thành đã liên kết, số lượng hợp lệ, có mã đơn và ngày hợp lệ. Không dùng giá hoặc điều kiện doanh thu để suy đoán xuất kho.</p></div>
    <label className="block text-xs font-semibold text-slate-700">Cột tồn đầu kỳ trong master
      <select aria-label="Cột tồn đầu kỳ trong master" value={stockColumn} onChange={event => { setStockColumn(Number(event.target.value)); setAcknowledged(false); setExportError(''); }} className="block mt-2 w-full sm:max-w-md border border-slate-300 rounded-lg p-2 bg-white">
        <option value={-1}>Chọn cột tồn đầu kỳ</option>
        {catalogFile.headers.map((header, i) => <option key={i} value={i}>{header || '(Cột không có tên)'} — cột {i + 1}</option>)}
      </select>
    </label>
    {stockColumn < 0 && <p className="text-xs text-amber-800">Chưa chọn được cột tồn kho. Nếu master dùng tên “SL”, hãy chọn cột đó sau khi xác nhận đây là tồn đầu kỳ. Không lấy số lượng từ tệp đơn hàng hoặc cột chi nhánh làm tồn.</p>}
    {calculation?.error && <p role="alert" className="text-xs text-rose-700">{calculation.error}</p>}
    <label className="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-0.5 accent-indigo-600" />
      <span>Tôi xác nhận đây là tồn đầu kỳ chưa trừ các đơn tải lên, các kênh dùng chung tập tồn này và không dùng tồn sau bán để trừ lại cùng bộ đơn.</span></label>
    <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 p-3 rounded-lg">Đây chưa phải tồn kho thực tế: chưa xử lý nhập hàng, điều chuyển, đơn đang vận chuyển hoặc chứng từ hàng hoàn nhập lại. Các dòng chờ đối soát không tự giảm/cộng tồn. Nếu tồn đề xuất âm, giữ giá trị âm để phát hiện sai lệch, không tự đưa về 0.</p>
    {proposal && <>
      <p className="text-xs text-slate-700" role="status">SL giảm: <strong>{proposal.summary.deductedQuantity}</strong> · Chờ đối soát: <strong>{proposal.summary.pendingCount} dòng</strong> · Tồn âm: <strong>{proposal.summary.negativeCount} dòng</strong>.</p>
      <div className="overflow-auto max-h-96 rounded-lg border border-slate-200"><table className="text-xs w-full min-w-[640px] text-left"><thead className="sticky top-0 z-10 bg-slate-100"><tr><th className="p-2">Mã master</th><th className="p-2">Tồn đầu kỳ</th><th className="p-2">SL giảm</th><th className="p-2">Tồn đề xuất</th><th className="p-2">Đối soát</th></tr></thead>
        <tbody>{proposal.rows.map((row, i) => <tr key={i} className="border-t border-slate-100"><td className="p-2 font-mono">{row[catalogFile.mapping.ma_dinh_danh] || '—'}</td><td className="p-2">{row[stockColumn]}</td><td className="p-2">{row[catalogFile.headers.length]}</td><td className="p-2 font-semibold">{row[catalogFile.headers.length + 1] === '' ? 'Chưa tính được' : row[catalogFile.headers.length + 1]}</td><td className="p-2 min-w-[220px]">{row.at(-1)}</td></tr>)}</tbody></table></div>
    </>}
    {exportError && <p role="alert" className="text-xs text-rose-700">{exportError}</p>}
    <button type="button" disabled={!proposal || !acknowledged} onClick={() => {
      try { XLSX.writeFile(inventoryWorkbook(proposal), 'master-ton-sau-ban-de-xuat.xlsx'); setExportError(''); }
      catch { setExportError('Không xuất được master. Kết quả tích hợp vẫn được giữ nguyên.'); }
    }} className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed">Xuất master & đối soát tồn (.xlsx)</button>
  </section>;
}
