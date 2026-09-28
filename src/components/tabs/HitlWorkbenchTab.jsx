import React from "react";
import {
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  HelpCircle,
  Sparkles,
  Info,
  Check,
  X,
} from "lucide-react";
import { SeverityBadge, MatchScoreBadge, AcademicBadge } from "../common/Badge";

export function HitlWorkbenchTab({
  pendingConfirmations,
  manualConfirmations,
  onManualDecision,
  config,
}) {
  return (
    <div className="space-y-4">
      {/* Information Header */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles size={17} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-amber-950">
              Phân Hệ Đối Soát Thực Thể Có Giám Sát (Human-in-the-Loop Reconciliation)
            </h3>
            <AcademicBadge code="RQ2" label="Fuzzy Token-Sort" />
            <AcademicBadge code="HITL" label="Active Confirmation" />
          </div>
          <p className="text-xs text-amber-900 mt-1 leading-relaxed">
            Các bản ghi dưới đây có độ tương đồng văn bản nằm trong khoảng không chắc chắn (
            <strong>{config.fuzzyConfirmThreshold}%</strong> – <strong>{config.fuzzyHighThreshold}%</strong>)
            hoặc chưa có dữ liệu đối chiếu tương ứng.
          </p>
        </div>
      </div>

      {pendingConfirmations.length > 0 && pendingConfirmations.every((item) => !item.matched) && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
          <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-blue-950">
              Lưu ý quan trọng về Đối soát thực thể (RQ2 Entity Resolution):
            </h4>
            <p className="text-blue-800 leading-relaxed">
              Bạn hiện đang chạy với <strong>1 tệp đơn hàng duy nhất và chưa nạp Danh Mục Sản Phẩm Gốc (Master Catalog)</strong>. Vì không có catalog chuẩn và không có nguồn thứ 2 để ghép đôi Bipartite, hệ thống chưa có dữ liệu đích để tìm sản phẩm tương đương (toàn bộ rơi vào trạng thái <em>Chưa thể phân giải</em>).
            </p>
            <p className="text-blue-700 font-medium">
              💡 <strong>Để kích hoạt đối chiếu 3 tầng và phê duyệt ghép:</strong> Hãy nạp thêm tệp <code>Danh_Muc_Sach_Master.xlsx</code> ở ô "Danh Sách Sản Phẩm Gốc" hoặc nạp từ 2 tệp đơn hàng trở lên (Shopee + TikTok Shop)!
            </p>
          </div>
        </div>
      )}

      {pendingConfirmations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Không có sản phẩm nào cần xác nhận thêm!
          </h3>
          <p className="text-xs text-slate-500">
            Toàn bộ thực thể đã được liên kết chính xác tự động qua Tầng 1 (Exact ID), Tầng 2 (Crosswalk) hoặc vượt ngưỡng Tầng 3.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {pendingConfirmations.map((item, idx) => {
            const rowId = item.rowIndex !== undefined ? item.rowIndex : idx;
            const manual = manualConfirmations.get(rowId);
            const isUnresolved = item.matchStatus === "UNRESOLVED";

            return (
              <div
                key={rowId}
                className={`bg-white border rounded-xl p-4 shadow-xs transition-all ${
                  manual?.decision === "ACCEPT"
                    ? "border-emerald-300 ring-1 ring-emerald-400/20 bg-emerald-50/10"
                    : manual?.decision === "REJECT"
                    ? "border-slate-300 bg-slate-50/30 opacity-75"
                    : isUnresolved
                    ? "border-rose-300 bg-rose-50/10"
                    : "border-amber-200"
                }`}
              >
                {/* Record Header */}
                <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      Đơn: {item.ma_don || "—"}
                    </span>
                    <span className="text-xs text-slate-500">
                      Nguồn: <strong>{item.nguon}</strong> ({item.kenh})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.matchScore && <MatchScoreBadge score={item.matchScore} />}
                    <SeverityBadge severity={item.matchStatus} />
                  </div>
                </div>

                {/* Comparison Card (Side by Side) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  {/* Cột trái: Tên gốc từ đơn hàng */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Dữ liệu thô từ đơn hàng:
                    </span>
                    <div className="font-semibold text-xs text-slate-900 leading-snug">
                      {item.ten_sp || "(Chưa có tên)"}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1">
                      Mã SKU nguồn: {item.ma_dinh_danh || "—"}
                    </div>
                  </div>

                  {/* Cột phải: Đề xuất từ Catalog */}
                  <div
                    className={`p-3 rounded-lg border ${
                      item.matched
                        ? "bg-amber-50/50 border-amber-200 text-amber-950"
                        : "bg-rose-50/50 border-rose-200 text-rose-900"
                    }`}
                  >
                    <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Đề xuất liên kết từ Danh mục chuẩn:
                    </span>
                    {item.matched ? (
                      <div>
                        <div className="font-bold text-xs text-slate-900 leading-snug">
                          {item.matched.ten_sp}
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 mt-1 flex items-center justify-between">
                          <span>Mã chuẩn: {item.matched.ma_dinh_danh || "—"}</span>
                          {item.matched.gia && (
                            <span>Giá niêm yết: {Number(item.matched.gia).toLocaleString("vi-VN")} ₫</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-rose-700">
                        Không tìm thấy thực thể tương đồng trong danh mục chuẩn.
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {item.matched && (
                      <button
                        type="button"
                        onClick={() => onManualDecision(rowId, "ACCEPT", item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs ${
                          manual?.decision === "ACCEPT"
                            ? "bg-emerald-600 text-white shadow-emerald-200"
                            : "bg-white text-slate-700 border border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                        }`}
                      >
                        <Check size={14} />
                        <span>Chấp thuận ghép</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onManualDecision(rowId, "REJECT", item)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        manual?.decision === "REJECT"
                          ? "bg-slate-700 text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <X size={14} />
                      <span>{item.matched ? "Từ chối ghép" : "Bỏ qua bản ghi"}</span>
                    </button>
                  </div>

                  {manual && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      <span>
                        Đã ghi nhận: {manual.decision === "ACCEPT" ? "Đồng ý ghép" : "Từ chối / giữ nguyên"}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
