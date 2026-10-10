import React from "react";
import { CheckCircle2, Sparkles, Check, X } from "lucide-react";
import { SeverityBadge, MatchScoreBadge } from "../common/Badge";
import { normalizeNumber } from "../../logic/normalize";
import { getReviewCandidate, reconciliationCounts } from "../../logic/reconciliation";

function SourceRecord({ item }) {
  const original = item.original || item;
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
      <p className="text-[11px] text-slate-500 mb-1">Dữ liệu nguồn · Đơn: {item.ma_don || "—"} · {item.nguon}</p>
      <p className="font-semibold text-xs text-slate-900">{original.__raw_ten_sp || original.ten_sp || "(Chưa có tên)"}</p>
      <p className="text-[11px] font-mono text-slate-500 mt-1">Mã nguồn: {original.__raw_ma_dinh_danh || original.ma_dinh_danh || "—"}</p>
      {original.phan_loai && <p className="text-[11px] text-slate-600 mt-1">Biến thể nguồn: {original.phan_loai}</p>}
    </div>
  );
}

export function HitlWorkbenchTab({ pendingConfirmations, manualConfirmations, onManualDecision, config }) {
  const proposals = pendingConfirmations.filter(getReviewCandidate);
  const unlinked = pendingConfirmations.filter(item => !getReviewCandidate(item));
  const counts = reconciliationCounts(pendingConfirmations, manualConfirmations);
  return (
    <div className="space-y-4">
      <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2"><Sparkles size={17} />Đối soát liên kết sách</h3>
        <p className="text-xs text-amber-900 mt-2">Có {counts.pending} dòng cần duyệt, {counts.reviewed} dòng đã duyệt và {counts.unlinked} dòng chưa có liên kết. Số đếm theo dòng dữ liệu, không phải số đầu sách.</p>
        <p className="text-xs text-slate-600 mt-1">Chỉ đề xuất ghép chưa chắc chắn mới cần chấp thuận hoặc từ chối. Ngưỡng lần chạy: {config.fuzzyConfirmThreshold}% – {config.fuzzyHighThreshold}%. Điểm cao vẫn cần duyệt nếu có ứng viên cạnh tranh chênh không quá 5 điểm.</p>
      </div>

      <section className="space-y-3" aria-label="Đề xuất cần xác nhận">
        <h3 className="font-semibold text-sm text-slate-800">Đề xuất ghép cần xác nhận ({proposals.length} dòng)</h3>
        {proposals.length === 0 && <p className="bg-white border rounded-xl p-4 text-xs text-slate-600">Không có đề xuất ghép cần xác nhận. Các dòng chưa liên kết, nếu có, vẫn được giữ nguyên bên dưới.</p>}
        {proposals.map(item => {
          const candidate = getReviewCandidate(item);
          const manual = manualConfirmations.get(item.rowIndex);
          const price = normalizeNumber(candidate.gia_chuan);
          return (
            <div key={item.rowIndex} className="bg-white border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                {Number.isFinite(item.matchScore) && item.matchScore > 0 && <MatchScoreBadge score={item.matchScore} />}
                <SeverityBadge severity={item.matchStatus} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SourceRecord item={item} />
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-[11px] text-slate-500 mb-1">Đề xuất liên kết</p>
                  <p className="font-semibold text-xs">{candidate.ten_sp}</p>
                  <p className="text-[11px] font-mono mt-1">Mã đề xuất: {candidate.ma_dinh_danh || "—"}</p>
                  <p className="text-[11px] mt-1">Biến thể danh mục: {candidate.phan_loai || 'Chưa có thông tin'}</p>
                  {price !== null && <p className="text-[11px] mt-1">Giá tham chiếu{candidate.isSynthesized || candidate.isClustered || candidate.isMasterSource ? " (tổng hợp từ nguồn)" : ""}: {price.toLocaleString("vi-VN")} ₫</p>}
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <button type="button" aria-pressed={manual?.decision === "ACCEPT"} onClick={() => onManualDecision(item.rowIndex, "ACCEPT", item)} className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded border border-emerald-300 text-emerald-800 hover:bg-emerald-50"><Check size={14} />Chấp thuận ghép</button>
                <button type="button" aria-pressed={manual?.decision === "REJECT"} onClick={() => onManualDecision(item.rowIndex, "REJECT", item)} className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded border border-slate-300 hover:bg-slate-50"><X size={14} />Từ chối ghép</button>
                {manual && <span className="inline-flex items-center gap-1 text-xs text-slate-600"><CheckCircle2 size={14} />{manual.decision === "ACCEPT" ? "Đã chấp thuận" : "Đã từ chối — giữ dữ liệu nguồn"}</span>}
              </div>
            </div>
          );
        })}
      </section>

      {unlinked.length > 0 && <section className="space-y-3" aria-label="Dữ liệu giữ riêng">
        <h3 className="font-semibold text-sm text-slate-800">Chưa có liên kết — giữ nguyên dữ liệu ({unlinked.length} dòng)</h3>
        <p className="text-xs text-slate-600">Chưa xác lập được liên kết với nguồn khác hoặc danh mục đối chiếu. Trường hợp này không tự chứng minh dữ liệu sai và không có đề xuất ghép để duyệt. Có thể bổ sung danh mục hoặc kiểm tra lại nguồn rồi chạy lại.</p>
        {unlinked.map(item => <div key={item.rowIndex} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <SourceRecord item={item} />
          <p className="text-xs text-slate-600">Được giữ riêng trong dữ liệu tích hợp; chưa xác lập liên kết.</p>
          {item.matchReason === 'VARIANT_CONFLICT' && <p className="text-xs text-amber-800">Mã có trong danh mục nhưng biến thể/Combo không tương thích. Muốn tách Combo cần danh sách sách thành phần, số lượng và quy tắc phân bổ giá; hệ thống không tự đoán.</p>}
        </div>)}
      </section>}
    </div>
  );
}
