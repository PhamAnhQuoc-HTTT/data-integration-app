import React from "react";
import {
  Tag,
  Calendar,
  Wrench,
  Truck,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { GROUP_LABELS } from "../../logic/qualityRules";
import { SeverityBadge } from "../common/Badge";

export function IssuesTab({
  integratedRows,
  issueGroupFilter,
  setIssueGroupFilter,
}) {
  const allIssueRows = integratedRows.filter((r) => r.issues && r.issues.length > 0);
  const issueRowsByGroup =
    issueGroupFilter === "ALL"
      ? allIssueRows
      : allIssueRows.filter((r) => r.issues.some((iss) => iss.group === issueGroupFilter));

  const groupCounts = {};
  allIssueRows.forEach((r) => {
    const groups = new Set(r.issues.map((iss) => iss.group));
    groups.forEach((g) => {
      groupCounts[g] = (groupCounts[g] || 0) + 1;
    });
  });

  const GROUP_FILTER_INFO = {
    value: { label: "Giá Trị & Tiền Tệ", icon: Tag, color: "text-amber-700 bg-amber-50 border-amber-200" },
    temporal: { label: "Ngày Tháng & Giờ", icon: Calendar, color: "text-purple-700 bg-purple-50 border-purple-200" },
    technical: { label: "Kỹ Thuật & Khóa", icon: Wrench, color: "text-rose-700 bg-rose-50 border-rose-200" },
    semantic: { label: "Ngữ Nghĩa Kênh/Đơn", icon: Truck, color: "text-blue-700 bg-blue-50 border-blue-200" },
    schema: { label: "Cấu Trúc & Ánh Xạ", icon: Layers, color: "text-orange-700 bg-orange-50 border-orange-200" },
    entity: { label: "Thực Thể & Danh Mục", icon: Search, color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {allIssueRows.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Không phát hiện vấn đề dữ liệu nào!
          </h3>
          <p className="text-xs text-slate-500">
            Dữ liệu tích hợp từ tất cả các nguồn hoàn toàn sạch, chuẩn hóa và nhất quán.
          </p>
        </div>
      ) : (
        <div>
          {/* Filter Pills Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              Phân loại 6 chiều xung đột:
            </span>

            <button
              type="button"
              onClick={() => setIssueGroupFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                issueGroupFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>Tất cả</span>
              <span
                className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                  issueGroupFilter === "ALL"
                    ? "bg-slate-700 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {allIssueRows.length}
              </span>
            </button>

            {Object.entries(groupCounts).map(([grp, count]) => {
              const info = GROUP_FILTER_INFO[grp] || {
                label: GROUP_LABELS[grp] || grp,
                icon: AlertTriangle,
                color: "text-slate-700 bg-slate-100 border-slate-200",
              };
              const Icon = info.icon;
              const isSelected = issueGroupFilter === grp;

              return (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setIssueGroupFilter(isSelected ? "ALL" : grp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                      : `${info.color} hover:opacity-90`
                  }`}
                >
                  <Icon size={13} />
                  <span>{info.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                      isSelected ? "bg-slate-700 text-white" : "bg-white/80 border"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-fixed border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-[10.5px] tracking-wider font-bold border-b border-slate-200">
                  <th className="p-3 w-[4%] text-center">STT</th>
                  <th className="p-3 w-[12%]">Mã Đơn</th>
                  <th className="p-3 w-[26%]">Tên Sản Phẩm</th>
                  <th className="p-3 w-[13%]">Nguồn File</th>
                  <th className="p-3 w-[15%]">Nhóm Xung Đột</th>
                  <th className="p-3 w-[30%]">Chi Tiết Kiểm Toán & Xử Lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {issueRowsByGroup.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      Không có bản ghi nào thuộc nhóm lỗi này.
                    </td>
                  </tr>
                ) : (
                  issueRowsByGroup.map((r, i) => (
                    <tr key={r.id || `${r.ma_don}-${i}`} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 text-center text-slate-400 font-mono align-top pt-3.5">
                        {i + 1}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800 align-top pt-3.5 break-all">
                        {r.ma_don || "—"}
                      </td>
                      <td className="p-3 font-medium text-slate-900 leading-relaxed align-top pt-3.5 break-words">
                        {r.ten_sp || "Sản phẩm chưa rõ tên"}
                      </td>
                      <td className="p-3 align-top pt-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200 truncate max-w-full">
                          {r.nguon}
                        </span>
                      </td>
                      <td className="p-3 align-top pt-3">
                        <div className="flex flex-col gap-1">
                          {[...new Set(r.issues.map((iss) => iss.group))].map((g) => {
                            const info = GROUP_FILTER_INFO[g];
                            return (
                              <span
                                key={g}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 w-fit"
                              >
                                {info?.label || GROUP_LABELS[g] || g}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3 align-top pt-2.5">
                        <div className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                          {r.issues.map((iss, issIdx) => (
                            <div key={issIdx} className="flex items-start gap-2">
                              <SeverityBadge severity={iss.severity} />
                              <span className="text-[11.5px] text-slate-700 mt-0.5">
                                {iss.detail}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
