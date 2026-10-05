import React from "react";
import {
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  ArrowUpRight,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

export function formatVND(n) {
  return n == null || !Number.isFinite(Number(n)) ? "—" : Math.round(n).toLocaleString("vi-VN") + " ₫";
}

export function MetricStatCards({
  result,
  liveMatchRate,
  liveMatchedCount,
  acceptedManualCount,
  orderFilesCount,
  onNavigateTab,
}) {
  const cancelledPrevented = result.governanceAudit?.cancelledRevenuePrevented || 0;
  const issuesCount = result.issues?.length || 0;
  const isSingleSourceWithoutCatalog = orderFilesCount <= 1 && result.integrationMode === "BIPARTITE";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* CARD 1: Tổng đơn hàng */}
      <div className="bg-white border border-slate-200/90 rounded-xl px-5 sm:px-6 py-4.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between min-h-[138px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
            Tổng Bản Ghi Nạp
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={17} />
          </div>
        </div>

        <div className="my-auto py-1">
          <div className="text-2xl sm:text-[26px] font-bold font-mono text-slate-900 tracking-tight">
            {result.stats.totalRows.toLocaleString()}
          </div>
        </div>

        <div className="text-[11.5px] text-slate-500 truncate pt-2 border-t border-slate-100 flex items-center gap-1.5">
          <span>Từ {orderFilesCount} kênh bán lẻ</span>
        </div>
      </div>

      {/* CARD 2: Tỷ lệ đối chiếu thực thể (RQ2) */}
      <div className="bg-white border border-slate-200/90 rounded-xl px-5 sm:px-6 py-4.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between min-h-[138px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
            Tỷ Lệ Định Danh (ER)
          </span>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isSingleSourceWithoutCatalog
                ? "bg-slate-100 text-slate-400"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {isSingleSourceWithoutCatalog ? <HelpCircle size={17} /> : <CheckCircle2 size={17} />}
          </div>
        </div>

        <div className="my-auto py-1">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-[26px] font-bold font-mono tracking-tight ${
                isSingleSourceWithoutCatalog ? "text-slate-500" : "text-emerald-600"
              }`}
            >
              {liveMatchRate}%
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                isSingleSourceWithoutCatalog
                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
              }`}
            >
              {isSingleSourceWithoutCatalog ? "Chưa có catalog" : "RQ2 Tối ưu"}
            </span>
          </div>
        </div>

        <div className="text-[11.5px] text-slate-500 truncate pt-2 border-t border-slate-100">
          {isSingleSourceWithoutCatalog ? (
            <span className="text-amber-600 font-medium">Cần thêm nguồn hoặc Catalog</span>
          ) : (
            <span>
              {liveMatchedCount}/{result.stats.totalRows} đơn khớp
              {acceptedManualCount > 0 && ` (+${acceptedManualCount} duyệt tay)`}
            </span>
          )}
        </div>
      </div>

      {/* CARD 3: Vấn đề dữ liệu phát hiện (RQ3) */}
      <div
        className="bg-white border border-slate-200/90 rounded-xl px-5 sm:px-6 py-4.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between min-h-[138px] cursor-pointer group"
        onClick={issuesCount > 0 ? () => onNavigateTab("issues") : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
            Vấn Đề Chất Lượng
          </span>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              issuesCount === 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            }`}
          >
            {issuesCount === 0 ? <ShieldCheck size={17} /> : <AlertTriangle size={17} />}
          </div>
        </div>

        <div className="my-auto py-1">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-[26px] font-bold font-mono tracking-tight ${
                issuesCount === 0 ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {issuesCount}
            </span>
            {issuesCount > 0 && (
              <span className="text-[11px] text-indigo-600 group-hover:underline flex items-center gap-0.5 font-medium ml-1">
                Xem chi tiết <ArrowUpRight size={12} />
              </span>
            )}
          </div>
        </div>

        <div className="text-[11.5px] text-slate-500 truncate pt-2 border-t border-slate-100">
          {issuesCount === 0 ? "Toàn bộ dữ liệu sạch" : "Phát hiện qua 6 chiều kiểm soát"}
        </div>
      </div>

      {/* CARD 4: Doanh thu thực tế sạch (Net Revenue) */}
      <div className="bg-white border border-slate-200/90 rounded-xl px-5 sm:px-6 py-4.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between min-h-[138px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
            Giá trị bán đủ điều kiện
          </span>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Banknote size={17} />
          </div>
        </div>

        <div className="my-auto py-1">
          <div
            className="text-xl sm:text-[23px] font-bold font-mono text-slate-900 tracking-tight truncate"
            title={formatVND(result.revenueTotal)}
          >
            {formatVND(result.revenueTotal)}
          </div>
        </div>

        <div className="text-[11.5px] text-slate-500 truncate pt-2 border-t border-slate-100">
          {cancelledPrevented > 0 ? (
            <span className="text-rose-600 font-medium">
              Đã trừ {formatVND(cancelledPrevented)} đơn hủy
            </span>
          ) : (
            <span>Chỉ dòng hoàn thành, giá/SL hợp lệ</span>
          )}
        </div>
      </div>
    </div>
  );
}
