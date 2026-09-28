import React, { useCallback } from "react";
import { UploadCloud, CheckCircle2, Trash2, Package, HelpCircle } from "lucide-react";
import { FIELD_LABELS } from "../../logic/fieldMapping";

export function CatalogDropzone({
  fileState,
  onFile,
  onRemove,
  dragKey,
  dragOverKey,
  setDragOverKey,
}) {
  const inputId = "bsi-file-catalog";

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOverKey(null);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
    [onFile, setDragOverKey]
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col h-full hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
          <Package size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Danh Mục Sản Phẩm Gốc (Master Catalog)
            </h3>
            <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              {fileState ? "Đã nạp chuẩn" : "Tùy chọn"}
            </span>
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Dữ liệu sản phẩm chuẩn (Mã SKU, Tên chuẩn, Giá niêm yết)
          </p>
        </div>
      </div>

      {!fileState ? (
        <>
          <label
            htmlFor={inputId}
            className={`border-2 border-dashed rounded-xl py-6 px-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center flex-1 ${
              dragOverKey === dragKey
                ? "border-emerald-500 bg-emerald-50/50"
                : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50/80 bg-slate-50/40"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverKey(dragKey);
            }}
            onDragLeave={() => setDragOverKey(null)}
            onDrop={handleDrop}
          >
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UploadCloud size={20} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-800 block">
                Kéo thả hoặc nhấn để chọn Danh mục chuẩn
              </span>
              <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">
                Nếu không có catalog, hệ thống kích hoạt ER Strategy tự động
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
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </>
      ) : (
        <div className="rounded-lg p-3 bg-slate-50/80 border border-slate-200 text-xs flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span className="font-semibold text-slate-800 truncate" title={fileState.fileName}>
                  {fileState.fileName}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {fileState.dataRows?.length || 0} sản phẩm gốc
                </span>
                <button
                  type="button"
                  onClick={onRemove}
                  aria-label="Xóa tệp"
                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mt-3">
              {fileState.mapping &&
                Object.entries(fileState.mapping)
                  .filter(([k, i]) => k !== "branchColumns" && i >= 0)
                  .map(([f]) => (
                    <span
                      key={f}
                      className="text-[10.5px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200"
                    >
                      {FIELD_LABELS?.[f] || f}
                    </span>
                  ))}
            </div>
          </div>

          <div className="mt-3 p-2 rounded bg-emerald-50/50 border border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
            <span>Kích hoạt cơ chế <strong>Catalog Multi-tier Matching</strong> (3 tầng tối ưu).</span>
          </div>
        </div>
      )}
    </div>
  );
}
