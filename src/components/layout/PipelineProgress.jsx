import React from "react";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";

export function PipelineProgress({ procIdx }) {
  const steps = [
    {
      title: "Tiền xử lý & Chuẩn hóa 7 nhóm",
      sub: "Schema mapping, Unpivot đa chi nhánh, chuẩn hóa định dạng số/ngày/kênh (RQ1)",
      code: "RQ1",
    },
    {
      title: "Đối chiếu & Giải quyết thực thể (ER)",
      sub: "Multi-tier Matching (Mã chính xác -> Crosswalk -> Fuzzy Token-Sort) / Strategy Pattern (RQ2)",
      code: "RQ2",
    },
    {
      title: "Kiểm tra 6 nhóm xung đột chất lượng",
      sub: "Phát hiện dị thường giá, lệch ngưỡng, xung đột cấu trúc và phân loại 3 mức an toàn (RQ3)",
      code: "RQ3",
    },
    {
      title: "Kiểm toán Quản trị & Doanh thu thực",
      sub: "Loại trừ đơn hủy/trả hàng, tổng hợp danh mục thực thể duy nhất và báo cáo thất thoát (Governance)",
      code: "GOV",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-xl text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
        <Loader2 size={28} className="animate-spin" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-1">
        Đang thực thi Pipeline Tích hợp & Kiểm toán Dữ liệu
      </h2>
      <p className="text-xs text-slate-500 mb-8 max-w-md mx-auto">
        Hệ thống đang chạy qua các tầng xử lý tự động theo chuẩn nghiên cứu khoa học. Vui lòng đợi trong giây lát...
      </p>

      <div className="space-y-3 text-left">
        {steps.map((st, i) => {
          const isDone = i < procIdx;
          const isCurrent = i === procIdx;

          return (
            <div
              key={i}
              className={`p-3.5 rounded-xl border transition-all duration-300 flex items-center gap-3.5 ${
                isDone
                  ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                  : isCurrent
                  ? "bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-xs"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <div className="flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 size={20} className="text-emerald-600" />
                ) : isCurrent ? (
                  <Loader2 size={20} className="text-indigo-600 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold text-xs tracking-tight ${
                      isDone
                        ? "text-emerald-900"
                        : isCurrent
                        ? "text-indigo-900 font-bold"
                        : "text-slate-400"
                    }`}
                  >
                    {st.title}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                      isDone
                        ? "bg-emerald-100 text-emerald-800"
                        : isCurrent
                        ? "bg-indigo-100 text-indigo-800"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {st.code}
                  </span>
                </div>
                <p
                  className={`text-[11px] truncate mt-0.5 ${
                    isDone
                      ? "text-emerald-700/80"
                      : isCurrent
                      ? "text-indigo-700/90"
                      : "text-slate-400"
                  }`}
                >
                  {st.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
