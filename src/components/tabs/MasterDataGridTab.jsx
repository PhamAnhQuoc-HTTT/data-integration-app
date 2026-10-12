import React, { useEffect, useState } from "react";
import { Search, X, Download, Copy, Check, FileSpreadsheet } from "lucide-react";
import { REVENUE_LABELS } from "../../logic/uiPresentation";
import { formatVND } from "../dashboard/MetricStatCards";

export function MasterDataGridTab({
  integratedRows,
  onExportCsv,
  onExportExcel,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [copyError, setCopyError] = useState("");

  useEffect(() => {
    if (copiedId === null) return;
    const timer = setTimeout(() => setCopiedId(null), 1500);
    return () => clearTimeout(timer);
  }, [copiedId]);

  const handleCopy = async (text, id) => {
    if (!text || text === "—") return;
    setCopyError("");
    setCopiedId(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(String(text));
      setCopiedId(id);
    } catch {
      setCopyError("Không sao chép được mã đơn. Bạn có thể chọn và sao chép trực tiếp trong bảng.");
    }
  };

  const filteredRows = integratedRows.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (
      (r.ma_don && String(r.ma_don).toLowerCase().includes(term)) ||
      (r.ten_sp && String(r.ten_sp).toLowerCase().includes(term)) ||
      (r.kenh && String(r.kenh).toLowerCase().includes(term)) ||
      (r.ma_dinh_danh && String(r.ma_dinh_danh).toLowerCase().includes(term)) ||
      (r.nguon && String(r.nguon).toLowerCase().includes(term)) ||
      (r.trang_thai && String(r.trang_thai).toLowerCase().includes(term))
    );
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Toolbar */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700">
            Tổng cộng: {integratedRows.length} bản ghi
          </span>
          {searchTerm && (
            <span className="text-xs text-indigo-600 font-medium">
              (Khớp {filteredRows.length} kết quả)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:max-w-md sm:ml-auto min-w-0">
          <div className="relative min-w-0 flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              aria-label="Tìm trong dữ liệu tích hợp"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã đơn, tên sản phẩm, kênh, SKU..."
              className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-300 bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onExportCsv}
            aria-label="Xuất dữ liệu CSV"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition shadow-2xs whitespace-nowrap cursor-pointer"
            title="Xuất file CSV (UTF-8 BOM)"
          >
            <Download size={13} />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            aria-label="Xuất dữ liệu Excel"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs whitespace-nowrap cursor-pointer"
            title="Xuất bảng tính Excel chuẩn (.xlsx)"
          >
            <FileSpreadsheet size={13} />
            <span className="hidden sm:inline">Excel (.xlsx)</span>
          </button>
        </div>
      </div>
      {copyError && <p role="alert" className="px-4 py-2 text-xs text-amber-800 bg-amber-50">{copyError}</p>}

      {/* Data Table */}
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-slate-700 uppercase text-[10.5px] tracking-wider font-bold border-b border-slate-200 z-10">
            <tr>
              <th className="px-3.5 py-2.5 whitespace-nowrap">Nguồn</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap">Mã Đơn</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap">Ngày</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap">Tên Sản Phẩm (Chuẩn Hóa)</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap">Mã Định Danh (SKU)</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap">Kênh Bán</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap">Trạng Thái</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap text-right">SL</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap text-right">Đơn Giá</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap text-right">Thành Tiền</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap text-center">Trạng Thái Liên Kết</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap text-center">Chất Lượng Dữ Liệu</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap">Đưa vào báo cáo?</th>
              <th className="px-3.5 py-2.5 whitespace-nowrap text-right">Giá trị cộng báo cáo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={14} className="p-8 text-center text-slate-400 text-xs">
                  Không tìm thấy dòng dữ liệu nào khớp với từ khóa "{searchTerm}".
                </td>
              </tr>
            ) : (
              filteredRows.map((r, i) => {
                const rowId = r.rowIndex !== undefined ? r.rowIndex : i;
                const prodName = r.ten_sp || "—";
                const idCode = r.ma_dinh_danh || "—";
                const issueCount = r.issues?.length || 0;

                return (
                  <tr key={r.id || `${r.ma_don}-${i}`} className="hover:bg-slate-50/80 transition">
                    <td className="px-3.5 py-2 whitespace-nowrap text-slate-600 font-medium">
                      {r.nguon}
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap font-mono font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span>{r.ma_don || "—"}</span>
                        {r.ma_don && (
                          <button
                            type="button"
                            onClick={() => handleCopy(r.ma_don, `order-${rowId}`)}
                            aria-label={"Sao chép mã đơn " + r.ma_don}
                            className="text-slate-300 hover:text-slate-600 transition"
                            title="Sao chép mã đơn"
                          >
                            {copiedId === `order-${rowId}` ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap text-slate-500 font-mono">
                      {r.ngay || "—"}
                    </td>
                    <td className="px-3.5 py-2 text-slate-900 font-medium max-w-xs truncate" title={prodName}>
                      {prodName}
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap font-mono text-slate-700">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {idCode}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap text-slate-600">
                      {r.kenh}
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap text-slate-600">
                      {r.trang_thai || "—"}
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap text-right font-mono font-semibold text-slate-800">
                      {r.so_luong}
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap text-right font-mono text-slate-600">
                      {formatVND(r.gia)}
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                      {formatVND(r.thanh_tien)}
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap text-center">
                      <MatchStatusBadge row={r} />
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap text-center">
                      {issueCount === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Không phát hiện vấn đề
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {issueCount} vấn đề
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 min-w-[220px] text-slate-600">{REVENUE_LABELS[r.revenueDisposition] || "Chưa xác định điều kiện ghi nhận"}</td>
                    <td className="px-3.5 py-2 whitespace-nowrap text-right font-mono font-semibold">{r.revenueDisposition === "INCLUDED" ? formatVND(r.thanh_tien) : formatVND(0)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchStatusBadge({ row }) {
  const labels = {
    MATCHED_EXACT: row.matchTier === 'tier2_crosswalk' ? 'Khớp qua Crosswalk' : 'Khớp mã chính xác',
    MATCHED_FUZZY_HIGH: 'Tự động ghép theo tên',
    NEEDS_CONFIRMATION: 'Chờ duyệt liên kết',
    MATCHED_CONFIRMED_USER: 'Đã duyệt ghép',
    REJECTED_USER: 'Đã từ chối ghép',
    UNRESOLVED: 'Chưa có liên kết',
  };
  const linked = ['MATCHED_EXACT', 'MATCHED_FUZZY_HIGH', 'MATCHED_CONFIRMED_USER'].includes(row.matchStatus);
  const style = linked ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : row.matchStatus === 'NEEDS_CONFIRMATION' ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';
  return <span className={'px-2 py-0.5 rounded-full text-[11px] font-semibold border ' + style}>{labels[row.matchStatus] || 'Chưa xác định'}</span>;
}
