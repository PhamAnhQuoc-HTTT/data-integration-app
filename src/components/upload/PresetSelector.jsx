import React from "react";
import { Target, Shield, Zap, CheckCircle2 } from "lucide-react";

export const PRESETS = {
  balanced: {
    id: "balanced",
    icon: Target,
    name: "Tiêu Chuẩn (Khuyên dùng)",
    badge: "Cân bằng tối ưu",
    color: "indigo",
    shortDesc: "Cân bằng giữa độ chính xác và tính tự động cho bán lẻ đa kênh hàng ngày.",
    detail: "Tự động chuẩn hóa biến thể tên thông thường (bỏ dấu, viết tắt). Chỉ yêu cầu xác nhận khi độ tương đồng nằm trong khoảng nghi ngờ (70% - 90%) và cảnh báo khi giá lệch > 30%.",
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
    badge: "Chính xác cao",
    color: "emerald",
    shortDesc: "Ưu tiên tối đa độ chính xác tuyệt đối, thắt chặt ngưỡng kiểm duyệt sai lệch.",
    detail: "Chỉ tự động ghép khi tên sản phẩm gần như giống hệt nhau (≥ 95%). Cảnh báo ngay khi giá bán chênh lệch trên 15% so với giá chuẩn để đảm bảo số liệu báo cáo tài chính tuyệt đối tin cậy.",
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
    shortDesc: "Nới lỏng đối chiếu, giảm tối đa số dòng phải duyệt tay thủ công.",
    detail: "Tự động chấp nhận các biến thể tên viết tắt, thiếu dấu hoặc có thêm phụ kiện (ngưỡng tương đồng nới lỏng xuống ≥ 80%), cho phép giá bán lệch đến 50% trước khi gắn cờ cảnh báo.",
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {Object.entries(PRESETS).map(([key, p]) => {
        const isSelected = activePresetId === key;
        const Icon = p.icon;

        return (
          <div
            key={key}
            onClick={() => onSelectPreset(key)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              isSelected
                ? "border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-500/20"
                : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon size={17} />
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold tracking-wide ${
                    isSelected
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {p.badge}
                </span>
              </div>
              <h4 className="font-bold text-xs text-slate-900 mb-1">{p.name}</h4>
              <p className="text-[11.5px] text-slate-500 leading-relaxed">{p.shortDesc}</p>
            </div>

            {isSelected && (
              <div className="mt-3 pt-2 border-t border-indigo-100 flex items-center gap-1.5 text-indigo-700 text-xs font-semibold">
                <CheckCircle2 size={13} />
                <span>Đang áp dụng</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
