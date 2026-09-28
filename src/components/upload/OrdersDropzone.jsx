import React, { useCallback } from "react";
import { UploadCloud, CheckCircle2, Trash2, ShoppingCart, Info, Store } from "lucide-react";
import { FIELD_LABELS } from "../../logic/fieldMapping";

export function OrdersDropzone({
  files,
  onAddFile,
  onRemoveFile,
  onUpdateChannelLabel,
  maxFiles,
  dragKey,
  dragOverKey,
  setDragOverKey,
}) {
  const inputId = "bsi-file-orders";
  const full = files.length >= maxFiles;

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOverKey(null);
      if (full) return;
      const f = e.dataTransfer.files?.[0];
      if (f) onAddFile(f);
    },
    [onAddFile, setDragOverKey, full]
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col h-full hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
          <ShoppingCart size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Tệp Đơn Hàng Đa Nguồn (Multi-source)
            </h3>
            <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {files.length}/{maxFiles} file
            </span>
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Dữ liệu bán hàng từ POS quầy, Shopee, TikTok Shop, Lazada...
          </p>
        </div>
      </div>

      {!full && (
        <>
          <label
            htmlFor={inputId}
            className={`border-2 border-dashed rounded-xl py-6 px-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center ${
              dragOverKey === dragKey
                ? "border-indigo-500 bg-indigo-50/50"
                : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/80 bg-slate-50/40"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverKey(dragKey);
            }}
            onDragLeave={() => setDragOverKey(null)}
            onDrop={handleDrop}
          >
            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UploadCloud size={20} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-800 block">
                Kéo thả hoặc nhấn để chọn tệp đơn hàng
              </span>
              <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">
                Định dạng hỗ trợ: .xlsx, .xls, .csv
              </span>
            </div>
          </label>
          <input
            id={inputId}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAddFile(f);
              e.target.value = "";
            }}
          />
        </>
      )}

      {files.length > 0 && (
        <div className="mt-3 space-y-2.5 flex-1">
          {files.map((fileState, i) => {
            const mappedCount = Object.entries(fileState.mapping || {}).filter(
              ([k, idx]) => k !== "branchColumns" && idx >= 0
            ).length;

            return (
              <div
                key={i}
                className="rounded-lg p-3 bg-slate-50/80 border border-slate-200 text-xs transition hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span className="font-semibold text-slate-800 truncate" title={fileState.fileName}>
                      {fileState.fileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {fileState.dataRows.length} dòng
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveFile(i)}
                      aria-label="Xóa tệp"
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Channel Label input */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60">
                  <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap flex items-center gap-1">
                    <Store size={12} />
                    Kênh bán:
                  </span>
                  <input
                    type="text"
                    value={fileState.channelLabel || ""}
                    onChange={(e) => onUpdateChannelLabel(i, e.target.value)}
                    placeholder="VD: Shopee, POS, TikTok Shop…"
                    className="flex-1 text-xs px-2 py-1 rounded border border-slate-300 bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Schema Mapping Pills */}
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10.5px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    Map: {mappedCount} cột
                  </span>
                  {fileState.mapping?.branchColumns && fileState.mapping.branchColumns.length > 0 && (
                    <span className="text-[10.5px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Đa chi nhánh ({fileState.mapping.branchColumns.length} cột unpivot)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {full && (
        <p className="text-xs font-semibold text-emerald-700 mt-2 flex items-center gap-1">
          <CheckCircle2 size={13} />
          Đã đạt giới hạn tối đa ({maxFiles} file). Sẵn sàng tích hợp!
        </p>
      )}
    </div>
  );
}
