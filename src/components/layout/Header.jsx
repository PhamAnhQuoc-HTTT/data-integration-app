import React from "react";
import {
  SlidersHorizontal,
  Download,
  RotateCcw,
  Sparkles,
  Database,
  GraduationCap,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

export function Header({
  step,
  activePreset,
  onOpenConfig,
  onExportCsv,
  onExportExcel,
  onReset,
}) {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 flex-wrap">
        {/* Brand & Academic Info */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200 flex-shrink-0">
            <Layers size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                <GraduationCap size={12} />
                KLTN · ĐH Công Nghệ Thông Tin (UIT — ĐHQG-HCM)
              </span>
              <span className="text-[11px] font-medium text-slate-400 font-mono hidden sm:inline">
                HTTT · 2026
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight mt-0.5">
              Hệ Thống Tích Hợp & Quản Trị Chất Lượng Dữ Liệu Bán Hàng Đa Kênh
            </h1>
            <p className="text-[11.5px] text-slate-500 font-mono hidden md:block">
              Multi-source Sales Data Integration and Data Quality Management System
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 ml-auto">
          {step !== "results" ? (
            <button
              type="button"
              onClick={onOpenConfig}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition shadow-2xs cursor-pointer"
            >
              <SlidersHorizontal size={14} className="text-slate-500" />
              <span>Gói cấu hình:</span>
              <span className="font-bold text-indigo-600">{activePreset}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenConfig}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition shadow-2xs cursor-pointer"
              >
                <SlidersHorizontal size={13} className="text-slate-500" />
                <span className="hidden sm:inline">Cấu hình</span>
              </button>
              <button
                type="button"
                onClick={onExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition shadow-2xs cursor-pointer"
                title="Tải file CSV (UTF-8 BOM)"
              >
                <Download size={13} />
                <span>Xuất CSV</span>
              </button>
              <button
                type="button"
                onClick={onExportExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm shadow-emerald-200 cursor-pointer"
                title="Tải bảng tính Excel chuẩn (.xlsx)"
              >
                <FileSpreadsheet size={14} />
                <span>Xuất Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition shadow-2xs cursor-pointer"
                title="Tải lại file khác"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">Đổi file</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
