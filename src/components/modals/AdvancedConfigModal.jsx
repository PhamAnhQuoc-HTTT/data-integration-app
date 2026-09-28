import React, { useState } from "react";
import { SlidersHorizontal, X, Check, BookOpen, ChevronDown, ChevronUp, Cpu } from "lucide-react";
import { PRESETS, PresetSelector } from "../upload/PresetSelector";

export function AdvancedConfigModal({
  isOpen,
  onClose,
  activePresetId,
  config,
  onSelectPreset,
  onCustomParamChange,
  selectedStrategy,
  setSelectedStrategy,
  masterSourceIndex,
  setMasterSourceIndex,
  orderFiles,
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Cấu Hình Tham Số & Chiến Lược Tích Hợp
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tùy chỉnh độ nghiêm ngặt của bộ quy tắc chất lượng và thuật toán phân giải thực thể
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Preset Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              1. Chọn Gói Cấu Hình Nghiệp Vụ:
            </label>
            <PresetSelector
              activePresetId={activePresetId}
              onSelectPreset={onSelectPreset}
            />
          </div>

          {/* Technical Param Sliders */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 transition text-xs font-bold text-slate-800 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Cpu size={15} className="text-indigo-600" />
                <span>Tùy Chỉnh Tham Số Kỹ Thuật (Advanced Hyperparameters)</span>
              </span>
              {showTechnicalDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTechnicalDetails && (
              <div className="p-4 space-y-4 bg-white border-t border-slate-200 text-xs">
                {/* Fuzzy Confirm Threshold */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-800">
                      Ngưỡng xác nhận thủ công (Fuzzy Confirm):
                    </span>
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {config.fuzzyConfirmThreshold}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="90"
                    value={config.fuzzyConfirmThreshold}
                    onChange={(e) =>
                      onCustomParamChange("fuzzyConfirmThreshold", Number(e.target.value))
                    }
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Bản ghi có độ tương đồng từ {config.fuzzyConfirmThreshold}% trở lên sẽ chuyển vào tab Human-in-the-Loop để người dùng xem xét.
                  </p>
                </div>

                {/* Fuzzy High Threshold */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-800">
                      Ngưỡng tự động ghép chắc chắn (Fuzzy Auto-Link):
                    </span>
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {config.fuzzyHighThreshold}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="75"
                    max="99"
                    value={config.fuzzyHighThreshold}
                    onChange={(e) =>
                      onCustomParamChange("fuzzyHighThreshold", Number(e.target.value))
                    }
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Bản ghi đạt từ {config.fuzzyHighThreshold}% trở lên được hệ thống tự động gán mã định danh mà không cần duyệt tay.
                  </p>
                </div>

                {/* Price Deviation Threshold */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-800">
                      Ngưỡng cảnh báo lệch giá (Price Anomaly):
                    </span>
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {config.priceDeviationThreshold}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={config.priceDeviationThreshold}
                    onChange={(e) =>
                      onCustomParamChange("priceDeviationThreshold", Number(e.target.value))
                    }
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Gắn cờ cảnh báo nếu giá bán thực tế lệch quá {config.priceDeviationThreshold}% so với giá niêm yết trong danh mục gốc.
                  </p>
                </div>

                {/* Strategy Pattern Selection */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900">
                      Chiến lược Đối chiếu khi không có Catalog (Strategy Pattern):
                    </span>
                    <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      RQ2 Engine
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: "BIPARTITE",
                        name: "Bipartite Graph",
                        desc: "Ghép cặp tối ưu toàn cục (Khuyên dùng)",
                      },
                      {
                        id: "CLUSTERING",
                        name: "Agglomerative Clustering",
                        desc: "Gom cụm tự động liên kết đa nguồn",
                      },
                      {
                        id: "MASTER_SOURCE",
                        name: "Master Source",
                        desc: "Chỉ định 1 tệp đơn hàng làm chuẩn",
                      },
                    ].map((strat) => (
                      <button
                        key={strat.id}
                        type="button"
                        onClick={() => setSelectedStrategy(strat.id)}
                        className={`p-2.5 rounded-lg text-left border text-xs transition cursor-pointer ${
                          selectedStrategy === strat.id
                            ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="font-semibold">{strat.name}</div>
                        <div
                          className={`text-[10.5px] mt-0.5 ${
                            selectedStrategy === strat.id ? "text-indigo-100" : "text-slate-400"
                          }`}
                        >
                          {strat.desc}
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedStrategy === "MASTER_SOURCE" && orderFiles.length > 0 && (
                    <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                        Tệp nguồn chuẩn:
                      </span>
                      <select
                        value={masterSourceIndex}
                        onChange={(e) => setMasterSourceIndex(Number(e.target.value))}
                        className="text-xs p-1.5 rounded border border-slate-300 bg-white font-medium flex-1 outline-none focus:border-indigo-500"
                      >
                        {orderFiles.map((f, fIdx) => (
                          <option key={fIdx} value={fIdx}>
                            {f.fileName || `Tệp ${fIdx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm shadow-indigo-200 cursor-pointer"
          >
            <Check size={14} />
            <span>Áp dụng cấu hình</span>
          </button>
        </div>
      </div>
    </div>
  );
}
