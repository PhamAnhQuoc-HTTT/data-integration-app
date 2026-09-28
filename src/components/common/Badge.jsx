import React from "react";
import { CheckCircle2, AlertCircle, ShieldAlert, Check, X, HelpCircle } from "lucide-react";
import { SEVERITY_LABELS } from "../../logic/qualityRules";

export function SeverityBadge({ severity }) {
  switch (severity) {
    case "AUTO_FIXED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} className="text-emerald-600" />
          <span>{SEVERITY_LABELS[severity] || "Tự động chuẩn hóa"}</span>
        </span>
      );
    case "NEEDS_CONFIRMATION":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <AlertCircle size={12} className="text-amber-600" />
          <span>{SEVERITY_LABELS[severity] || "Cần duyệt tay"}</span>
        </span>
      );
    case "FLAGGED_ONLY":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <ShieldAlert size={12} className="text-rose-600" />
          <span>{SEVERITY_LABELS[severity] || "Cảnh báo / Dị thường"}</span>
        </span>
      );
    case "MATCHED_CONFIRMED_USER":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-300">
          <Check size={12} className="text-emerald-600" />
          <span>Đã duyệt khớp (HITL)</span>
        </span>
      );
    case "REJECTED_USER":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
          <X size={12} className="text-slate-500" />
          <span>Từ chối ghép (HITL)</span>
        </span>
      );
    case "UNRESOLVED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <HelpCircle size={12} className="text-rose-500" />
          <span>Chưa thể phân giải</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <span>{severity || "—"}</span>
        </span>
      );
  }
}

export function AcademicBadge({ code, label }) {
  const styles = {
    RQ1: "bg-indigo-50 text-indigo-700 border-indigo-200",
    RQ2: "bg-blue-50 text-blue-700 border-blue-200",
    RQ3: "bg-teal-50 text-teal-700 border-teal-200",
    HITL: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const activeStyle = styles[code] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border tracking-wide uppercase ${activeStyle}`}>
      <span className="font-mono">{code}</span>
      {label && <span className="normal-case font-medium opacity-90">· {label}</span>}
    </span>
  );
}

export function MatchScoreBadge({ score }) {
  if (score === null || score === undefined) return null;
  const num = Number(score);
  let color = "bg-rose-50 text-rose-700 border-rose-200";
  if (num >= 90) {
    color = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (num >= 70) {
    color = "bg-amber-50 text-amber-700 border-amber-200";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-semibold border ${color}`}>
      {num}% tương đồng
    </span>
  );
}
