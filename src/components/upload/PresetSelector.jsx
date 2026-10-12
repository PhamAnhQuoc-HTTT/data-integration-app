import React from "react";
import { Target, Shield, Zap, CheckCircle2 } from "lucide-react";

export const PRESETS = {
  balanced: {
    id: "balanced",
    icon: Target,
    name: "Tiêu Chuẩn (Khuyên dùng)",
    badge: "Cân bằng",
    color: "indigo",
    shortDesc: "Cân bằng giữa độ chính xác và tính tự động cho bán lẻ đa kênh hàng ngày.",
    detail: "Duyệt ứng viên từ 70%; tự động ghép theo tên từ 90% nếu không xung đột và không có ứng viên cạnh tranh gần điểm. Cảnh báo lệch giá trên 30%.",
    suitableFor: "Doanh nghiệp bán lẻ đa kênh thông thường.",
    config: {
      fuzzyConfirmThreshold: 70,
      fuzzyHighThreshold: 90,
      priceDeviationThreshold: 30,
      autoNormalizeChannels: true,
      autoNormalizeStatus: true,
    },
  },
  strict: {
    id: "strict",
    icon: Shield,
    name: "Nghiêm Ngặt (Kiểm toán / Tài chính)",
    badge: "Ngưỡng chặt hơn",
    color: "emerald",
    shortDesc: "Tăng ngưỡng tự động ghép và cảnh báo lệch giá sớm hơn để hỗ trợ đối soát.",
    detail: "Duyệt ứng viên từ 85%; tự động ghép theo tên từ 95% khi đủ điều kiện. Cảnh báo lệch giá trên 15%; không bảo đảm độ chính xác nếu chưa đối chiếu Ground Truth.",
    suitableFor: "Đối soát kế toán, quyết toán tài chính, chốt công nợ.",
    config: {
      fuzzyConfirmThreshold: 85,
      fuzzyHighThreshold: 95,
      priceDeviationThreshold: 15,
      autoNormalizeChannels: true,
      autoNormalizeStatus: true,
    },
  },
  relaxed: {
    id: "relaxed",
    icon: Zap,
    name: "Tự Động Hóa Cao (TMĐT)",
    badge: "Nhanh & Tự động",
    color: "amber",
    shortDesc: "Dùng ngưỡng tự động ghép thấp hơn; vẫn kiểm tra các liên kết chưa chắc chắn.",
    detail: "Duyệt ứng viên từ 55%; tự động ghép theo tên từ 80% khi đủ điều kiện. Cảnh báo lệch giá trên 50%. Vẫn kiểm tra xung đột ấn bản và combo.",
    suitableFor: "Báo cáo nhanh xu hướng thị trường, xử lý khối lượng lớn đơn hàng online.",
    config: {
      fuzzyConfirmThreshold: 55,
      fuzzyHighThreshold: 80,
      priceDeviationThreshold: 50,
      autoNormalizeChannels: true,
      autoNormalizeStatus: true,
    },
  },
};

export function PresetSelector({ activePresetId, onSelectPreset }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3" role="group" aria-label="Chọn gói cấu hình nghiệp vụ">
      {Object.entries(PRESETS).map(([key, p]) => {
        const isSelected = activePresetId === key;
        const Icon = p.icon;

        return (
          <button
            key={key}
            type="button"
            aria-pressed={isSelected}
            aria-label={p.name}
            onClick={() => onSelectPreset(key)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              isSelected
                ? "border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-500/20"
                : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50"
            }`}
          >
            <span className="block text-left">
              <span className="flex items-center justify-between gap-2 mb-2.5">
                <span
                  className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon size={17} />
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold tracking-wide ${
                    isSelected
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {p.badge}
                </span>
              </span>
              <span className="block font-bold text-xs text-slate-900 mb-1">{p.name}</span>
              <span className="block text-[11.5px] text-slate-500 leading-relaxed">{p.shortDesc}</span>
              <span className="block text-[10.5px] text-slate-600 mt-2">Duyệt từ {p.config.fuzzyConfirmThreshold}% · Tự động từ {p.config.fuzzyHighThreshold}% · Lệch giá &gt; {p.config.priceDeviationThreshold}%</span>
            </span>

            {isSelected && (
              <span className="mt-3 pt-2 border-t border-indigo-100 flex items-center gap-1.5 text-indigo-700 text-xs font-semibold">
                <CheckCircle2 size={13} />
                <span>Đang chọn</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
