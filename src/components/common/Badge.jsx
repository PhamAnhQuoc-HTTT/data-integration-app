import React from "react";
import { CheckCircle2, AlertCircle, ShieldAlert, Check, X, HelpCircle } from "lucide-react";
import { SEVERITY_LABELS } from "../../logic/qualityRules";

export function SeverityBadge({ severity, className = "" }) {
  const baseClass = `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap h-6 px-2.5 rounded-full text-xs leading-none font-medium border ${className}`;
  switch (severity) {
    case "AUTO_FIXED":
      return (
        <span className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200`}>
          <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
          <span>{SEVERITY_LABELS[severity] || "Tự động chuẩn hóa"}</span>
        </span>
      );
    case "NEEDS_CONFIRMATION":
      return (
        <span className={`${baseClass} bg-amber-50 text-amber-700 border-amber-200`}>
          <AlertCircle size={12} className="shrink-0 text-amber-600" />
          <span>{SEVERITY_LABELS[severity] || "Cần duyệt tay"}</span>
        </span>
      );
    case "FLAGGED_ONLY":
      return (
        <span className={`${baseClass} bg-rose-50 text-rose-700 border-rose-200`}>
          <ShieldAlert size={12} className="shrink-0 text-rose-600" />
          <span>{SEVERITY_LABELS[severity] || "Cảnh báo / Dị thường"}</span>
        </span>
      );
    case "MATCHED_CONFIRMED_USER":
      return (
        <span className={`${baseClass} bg-emerald-50 text-emerald-800 border-emerald-300`}>
          <Check size={12} className="shrink-0 text-emerald-600" />
          <span>Đã duyệt khớp (HITL)</span>
        </span>
      );
    case "REJECTED_USER":
      return (
        <span className={`${baseClass} bg-slate-100 text-slate-700 border-slate-300`}>
          <X size={12} className="shrink-0 text-slate-500" />
          <span>Từ chối ghép (HITL)</span>
        </span>
      );
    case "UNRESOLVED":
      return (
        <span className={`${baseClass} bg-rose-50 text-rose-700 border-rose-200`}>
          <HelpCircle size={12} className="shrink-0 text-rose-500" />
          <span>Chưa thể phân giải</span>
        </span>
      );
    default:
      return (
        <span className={`${baseClass} bg-slate-100 text-slate-700 border-slate-200`}>
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

export function MatchScoreBadge({ score, status }) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) return null;
  const num = Number(score);
  const accepted = ['MATCHED_EXACT', 'MATCHED_FUZZY_HIGH', 'MATCHED_CONFIRMED_USER'].includes(status);
  const color = accepted ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : status === 'NEEDS_CONFIRMATION' ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';
  return <span title="Điểm tương đồng văn bản, không phải xác suất hoặc độ chính xác liên kết"
    className={'inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-semibold border ' + color}>
    {num.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% tương đồng
  </span>;
}
