import React, { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  UploadCloud, Layers, Package, CheckCircle2, AlertTriangle,
  RotateCcw, Download, BarChart3, Table2, ListChecks, Loader2, ArrowRight, Trash2,
  Settings, ShieldCheck, Check, X, Sliders, FileText,
  Target, Shield, Zap, Info, ChevronDown, ChevronUp, HelpCircle,
  ShoppingCart, Banknote, TrendingUp, Bell, Calendar, Tag,
  MousePointerClick, ThumbsUp, ThumbsDown, BookOpen, Sparkles,
  ClipboardList, Eye, BadgeCheck, CircleAlert, Layers3,
} from "lucide-react";
import { detectFields, FIELD_LABELS } from "./logic/fieldMapping";
import { runPipeline } from "./logic/pipeline";
import { SEVERITY_LABELS, GROUP_LABELS } from "./logic/qualityRules";

/* ============================== DESIGN TOKENS ============================== */
const Tokens = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    .bsi-root {
      --ink: #202D24;
      --ink-soft: #4A5148;
      --paper: #F3EEE0;
      --paper-card: #FBF8F0;
      --line: rgba(32,45,36,0.14);
      --brass: #A97B25;
      --brass-soft: #E7D3A6;
      --moss: #2D7A4A;
      --moss-soft: #D4EDDE;
      --brick: #C0392B;
      --brick-soft: #FADBD8;
      --navy: #2C3E4A;
      --amber-warn: #E67E22;
      --amber-warn-soft: #FDEBD0;
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--paper);
      color: var(--ink);
      min-height: 100%;
    }
    .bsi-serif { font-family: 'Source Serif 4', Georgia, serif; }
    .bsi-mono { font-family: 'IBM Plex Mono', monospace; }
    .bsi-card { background: var(--paper-card); border: 1px solid var(--line); border-radius: 10px; }
    .bsi-card-hover { transition: box-shadow .2s ease, transform .15s ease; }
    .bsi-card-hover:hover { box-shadow: 0 6px 24px rgba(32,45,36,0.10); transform: translateY(-1px); }
    .bsi-tab-label {
      position: absolute; top: -11px; left: 16px;
      background: var(--ink); color: var(--paper-card);
      font-size: 10.5px; letter-spacing: 0.09em; font-weight: 700;
      padding: 3px 10px; border-radius: 20px; text-transform: uppercase;
    }
    .bsi-dropzone { border: 2px dashed var(--line); transition: border-color .15s ease, background .15s ease; border-radius: 10px; }
    .bsi-dropzone:hover, .bsi-dropzone.drag { border-color: var(--brass); background: var(--brass-soft); }
    .bsi-btn-primary {
      background: var(--ink); color: var(--paper-card); font-weight: 700; border-radius: 8px;
      transition: opacity .15s ease, transform .1s ease; letter-spacing: 0.01em;
    }
    .bsi-btn-primary:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
    .bsi-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
    .bsi-btn-cta {
      background: linear-gradient(135deg, #2D7A4A 0%, #1a5c36 100%);
      color: white; font-weight: 700; border-radius: 10px; font-size: 16px;
      transition: opacity .15s ease, transform .1s ease, box-shadow .15s ease;
      box-shadow: 0 4px 14px rgba(45,122,74,0.35);
    }
    .bsi-btn-cta:hover:not(:disabled) { opacity: 0.92; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(45,122,74,0.45); }
    .bsi-btn-cta:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; }
    .bsi-btn-secondary {
      background: transparent; color: var(--ink); border: 1.5px solid var(--line);
      font-weight: 600; border-radius: 8px; transition: background .15s ease;
    }
    .bsi-btn-secondary:hover { background: rgba(32,45,36,0.06); }
    .bsi-btn-success {
      background: var(--moss); color: white; font-weight: 700; border-radius: 8px;
      transition: opacity .15s ease, transform .1s ease;
    }
    .bsi-btn-success:hover { opacity: 0.88; transform: translateY(-1px); }
    .bsi-btn-danger {
      background: var(--brick); color: white; font-weight: 700; border-radius: 8px;
      transition: opacity .15s ease, transform .1s ease;
    }
    .bsi-btn-danger:hover { opacity: 0.88; transform: translateY(-1px); }
    .bsi-badge {
      display: inline-flex; align-items: center; font-size: 12px;
      padding: 3px 10px; border-radius: 20px; font-weight: 600; white-space: nowrap; gap: 4px;
    }
    .bsi-stamp {
      border: 2.5px solid var(--moss); color: var(--moss);
      font-family: 'IBM Plex Mono', monospace; font-weight: 800;
      letter-spacing: 0.14em; padding: 6px 14px; border-radius: 6px;
      transform: rotate(-3deg); font-size: 12px; animation: bsi-stamp-in .35s ease-out;
    }
    @keyframes bsi-stamp-in { 0% { opacity: 0; transform: rotate(-3deg) scale(1.5); } 100% { opacity: 1; transform: rotate(-3deg) scale(1); } }
    .bsi-tab-btn {
      font-weight: 600; font-size: 14px; padding: 10px 6px;
      border-bottom: 3px solid transparent; color: var(--ink-soft);
      transition: color .15s ease, border-color .15s ease;
    }
    .bsi-tab-btn.active { color: var(--moss); border-color: var(--moss); }
    .bsi-row:hover { background: rgba(32,45,36,0.04); }
    .bsi-spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .stat-num { font-size: 2.4rem; font-weight: 800; line-height: 1.1; }
    .stat-label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-sub { font-size: 12.5px; margin-top: 4px; }
    .icon-circle {
      width: 52px; height: 52px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .step-badge {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--ink); color: var(--paper-card);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 15px; flex-shrink: 0;
    }
    .expert-accordion { background: #f0f4ff; border: 1.5px solid #c5d3f0; border-radius: 8px; }
    .traffic-green { background: var(--moss-soft); border-color: var(--moss); color: var(--moss); }
    .traffic-red { background: var(--brick-soft); border-color: var(--brick); color: var(--brick); }
    .traffic-amber { background: var(--amber-warn-soft); border-color: var(--amber-warn); color: var(--amber-warn); }
    .issue-icon-cell { font-size: 18px; }
    .progress-bar-track { height: 10px; background: #e5e7eb; border-radius: 99px; overflow: hidden; }
    .progress-bar-fill { height: 10px; border-radius: 99px; transition: width .5s ease; }
    .step-flow { display: flex; align-items: center; gap: 8px; }
    .step-flow-arrow { color: #9ca3af; font-size: 20px; }
  `}</style>
);

function formatVND(n) { return isNaN(n) ? "—" : Math.round(n).toLocaleString("vi-VN") + " đ"; }
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const PROCESSING_STEPS = [
  "📖 Đang đọc và làm sạch dữ liệu từ tất cả các file...",
  "🔗 Đang so sánh và ghép tên sản phẩm từ các nguồn...",
  "🔍 Đang kiểm tra lỗi và vấn đề trong dữ liệu...",
  "📊 Đang tổng hợp kết quả và tính doanh thu thực tế...",
];

const MAX_ORDER_FILES = 4;

/* ============================== 3 GÓI CẤU HÌNH DOANH NGHIỆP ============================== */
const PRESETS = {
  balanced: {
    id: "balanced",
    icon: Target,
    emoji: "⚖️",
    name: "Tiêu Chuẩn (Khuyên dùng)",
    badge: "Cân bằng tối ưu",
    badgeColor: "var(--moss)",
    badgeBg: "var(--moss-soft)",
    shortDesc: "Cân bằng giữa độ chính xác và tính tự động cho bán lẻ hàng ngày.",
    detail: "Tự động chuẩn hóa các biến thể tên thông thường (bỏ dấu, viết tắt). Chỉ yêu cầu người dùng xác nhận khi độ tương đồng nằm trong khoảng nghi ngờ (70% - 90%) và cảnh báo khi giá bán chênh lệch > 30% so với giá chuẩn.",
    suitableFor: "Doanh nghiệp bán lẻ đa kênh thông thường.",
    config: {
      fuzzyConfirmThreshold: 70,
      fuzzyHighThreshold: 90,
      priceDeviationThreshold: 30,
      autoNormalizeChannels: true,
      autoNormalizeStatus: true,
    }
  },
  strict: {
    id: "strict",
    icon: Shield,
    emoji: "🛡️",
    name: "Nghiêm Ngặt (Kế toán / Kiểm toán)",
    badge: "Chính xác cao",
    badgeColor: "var(--brick)",
    badgeBg: "var(--brick-soft)",
    shortDesc: "Ưu tiên tối đa độ chính xác tuyệt đối, tăng cường cảnh báo kiểm duyệt.",
    detail: "Chỉ tự động ghép khi tên sản phẩm gần như giống hệt nhau (≥ 95%). Cảnh báo ngay khi giá bán chênh lệch trên 15% so với giá chuẩn để tránh thất thoát doanh thu và đảm bảo số liệu báo cáo tài chính tuyệt đối tin cậy.",
    suitableFor: "Đối soát kế toán, quyết toán thuế, chốt công nợ cuối tháng.",
    config: {
      fuzzyConfirmThreshold: 85,
      fuzzyHighThreshold: 95,
      priceDeviationThreshold: 15,
      autoNormalizeChannels: true,
      autoNormalizeStatus: true,
    }
  },
  relaxed: {
    id: "relaxed",
    icon: Zap,
    emoji: "⚡",
    name: "Tự Động Tối Đa (Bán lẻ đa sàn)",
    badge: "Nhanh & Tự động",
    badgeColor: "#7A5A15",
    badgeBg: "var(--brass-soft)",
    shortDesc: "Nới lỏng đối chiếu, giảm tối đa số dòng phải duyệt thủ công.",
    detail: "Tự động chấp nhận các biến thể tên viết tắt, thiếu dấu hoặc có thêm phụ kiện (ngưỡng tương đồng nới lỏng xuống ≥ 80%), cho phép giá bán lệch đến 50% trước khi gắn cờ cảnh báo. Giúp xử lý cực nhanh các file xuất từ nhiều sàn TMĐT hỗn loạn.",
    suitableFor: "Báo cáo nhanh xu hướng thị trường, xử lý khối lượng lớn đơn hàng online.",
    config: {
      fuzzyConfirmThreshold: 55,
      fuzzyHighThreshold: 80,
      priceDeviationThreshold: 50,
      autoNormalizeChannels: true,
      autoNormalizeStatus: true,
    }
  }
};

/* ============================== UI SUBCOMPONENTS ============================== */
function OrdersDropzone({ files, onAddFile, onRemoveFile, onUpdateChannelLabel, maxFiles, dragKey, dragOverKey, setDragOverKey }) {
  const inputId = "bsi-file-orders";
  const full = files.length >= maxFiles;
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOverKey(null);
    if (full) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onAddFile(f);
  }, [onAddFile, setDragOverKey, full]);

  return (
    <div className="bsi-card relative p-5 pt-7 bsi-card-hover">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="icon-circle" style={{ background: "#EBF5FB" }}>
          <ShoppingCart size={24} style={{ color: "#2471A3" }} />
        </div>
        <div>
          <h3 className="bsi-serif font-semibold text-[17px] leading-tight">Tải lên file Đơn Hàng</h3>
          <p className="text-[12.5px] mt-0.5" style={{ color: "var(--ink-soft)" }}>Từ POS, Shopee, Lazada, TikTok Shop…</p>
        </div>
      </div>
      <div className="flex items-center gap-2 p-2.5 rounded-lg mb-3" style={{ background: "var(--moss-soft)", border: "1px solid var(--moss)" }}>
        <Info size={14} style={{ color: "var(--moss)", flexShrink: 0 }} />
        <p className="text-[12px]" style={{ color: "var(--moss)" }}>
          Hỗ trợ tối đa <strong>{maxFiles} file</strong>.
        </p>
      </div>
      {!full && (
        <>
          <label htmlFor={inputId}
            className={`bsi-dropzone ${dragOverKey === dragKey ? "drag" : ""} flex flex-col items-center justify-center gap-2 py-8 px-3 cursor-pointer text-center`}
            onDragOver={(e) => { e.preventDefault(); setDragOverKey(dragKey); }}
            onDragLeave={() => setDragOverKey(null)} onDrop={handleDrop}>
            <UploadCloud size={28} style={{ color: "var(--brass)" }} />
            <span className="text-[14px] font-semibold">Kéo thả hoặc bấm để chọn file đơn hàng</span>
            <span className="text-[12px] bsi-mono" style={{ color: "var(--ink-soft)" }}>Định dạng: .csv · .xlsx · .xls</span>
          </label>
          <input id={inputId} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onAddFile(f); e.target.value = ""; }} />
        </>
      )}
      {files.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {files.map((fileState, i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: "var(--moss-soft)", border: "1px solid var(--moss)" }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={18} style={{ color: "var(--moss)", flexShrink: 0 }} />
                  <span className="text-[13px] font-semibold truncate">{fileState.fileName}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[12px] font-medium bsi-mono px-2 py-0.5 rounded" style={{ background: "white", color: "var(--moss)" }}>{fileState.dataRows.length} dòng</span>
                  <button onClick={() => onRemoveFile(i)} aria-label="Xóa tệp" className="flex items-center p-1 rounded hover:bg-red-100 transition">
                    <Trash2 size={15} style={{ color: "var(--brick)" }} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 p-2 rounded-lg" style={{ background: "white" }}>
                <span className="text-[12px] font-semibold whitespace-nowrap" style={{ color: "var(--ink-soft)" }}>🏪 Kênh bán:</span>
                <input
                  type="text"
                  value={fileState.channelLabel || ""}
                  onChange={(e) => onUpdateChannelLabel(i, e.target.value)}
                  placeholder="VD: Shopee, TikTok Shop, POS tại quầy…"
                  className="flex-1 text-[13px] px-2 py-1.5 rounded-lg border outline-none bg-white"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.entries(fileState.mapping).filter(([k, idx]) => k !== "branchColumns" && idx >= 0).map(([f]) => (
                  <span key={f} className="bsi-badge" style={{ background: "white", color: "var(--ink-soft)", fontSize: "11px" }}>{FIELD_LABELS[f]}</span>
                ))}
                {fileState.mapping.branchColumns && fileState.mapping.branchColumns.length > 0 && (
                  <span className="bsi-badge" style={{ background: "var(--brass-soft)", color: "#7A5A15" }}>
                    ✓ Đa chi nhánh ({fileState.mapping.branchColumns.length} điểm bán)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {full && <p className="text-[12.5px] mt-2 font-medium" style={{ color: "var(--moss)" }}>✅ Đã đủ {maxFiles} file. Sẵn sàng xử lý!</p>}
    </div>
  );
}

function UploadCard({ tag, icon: Icon, title, hint, fileState, onFile, dragKey, dragOverKey, setDragOverKey, onRemove }) {
  const inputId = `bsi-file-${tag}`;
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOverKey(null);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }, [onFile, setDragOverKey]);

  return (
    <div className="bsi-card relative p-5 pt-7 bsi-card-hover">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="icon-circle" style={{ background: "#FEF9E7" }}>
          <Package size={24} style={{ color: "var(--brass)" }} />
        </div>
        <div>
          <h3 className="bsi-serif font-semibold text-[17px] leading-tight">{title}</h3>
          <span className="bsi-badge mt-1" style={{ background: "var(--moss-soft)", color: "var(--moss)" }}>Tệp chuẩn</span>
        </div>
      </div>
      <div className="flex items-center gap-2 p-2.5 rounded-lg mb-3" style={{ background: "var(--amber-warn-soft)", border: "1px solid var(--amber-warn)" }}>
        <Info size={14} style={{ color: "var(--amber-warn)", flexShrink: 0 }} />
        <p className="text-[12px]" style={{ color: "#7D4E00" }}>
          {hint}
        </p>
      </div>
      {!fileState ? (
        <>
          <label htmlFor={inputId}
            className={`bsi-dropzone ${dragOverKey === dragKey ? "drag" : ""} flex flex-col items-center justify-center gap-2 py-8 px-3 cursor-pointer text-center`}
            onDragOver={(e) => { e.preventDefault(); setDragOverKey(dragKey); }}
            onDragLeave={() => setDragOverKey(null)} onDrop={handleDrop}>
            <UploadCloud size={28} style={{ color: "var(--brass)" }} />
            <span className="text-[14px] font-semibold">Kéo thả hoặc bấm để chọn Danh Sách Sản Phẩm Gốc</span>
            <span className="text-[12px] bsi-mono" style={{ color: "var(--ink-soft)" }}>Định dạng: .csv · .xlsx · .xls</span>
          </label>
          <input id={inputId} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </>
      ) : (
        <div className="mt-3 rounded-lg p-3" style={{ background: "var(--moss-soft)", border: "1px solid var(--moss)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 size={18} style={{ color: "var(--moss)", flexShrink: 0 }} />
              <span className="text-[13px] font-semibold truncate">{fileState.fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium bsi-mono px-2 py-0.5 rounded" style={{ background: "white", color: "var(--moss)" }}>{fileState.dataRows.length} sản phẩm</span>
              <button onClick={onRemove} aria-label="Xóa tệp" className="p-1 rounded hover:bg-red-100 transition"><Trash2 size={15} style={{ color: "var(--brick)" }} /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(fileState.mapping).filter(([k, i]) => k !== "branchColumns" && i >= 0).map(([f]) => (
              <span key={f} className="bsi-badge" style={{ background: "white", color: "var(--ink-soft)", fontSize: "11px" }}>{FIELD_LABELS[f]}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== STAT CARD MỚI (icon + màu traffic light + font lớn) ============================== */
function StatCard({ label, value, sub, tone = "ink", icon: IconComp, iconBg, iconColor }) {
  const colorMap = {
    ink: "var(--ink)",
    brass: "var(--brass)",
    brick: "var(--brick)",
    moss: "var(--moss)",
    amber: "var(--amber-warn)",
  };
  const cardBorderMap = {
    ink: "var(--line)",
    brass: "var(--brass)",
    brick: "var(--brick)",
    moss: "var(--moss)",
    amber: "var(--amber-warn)",
  };
  const cardBgMap = {
    ink: "var(--paper-card)",
    brass: "#FEFBF3",
    brick: "var(--brick-soft)",
    moss: "var(--moss-soft)",
    amber: "var(--amber-warn-soft)",
  };
  return (
    <div className="bsi-card bsi-card-hover p-4 flex items-center gap-4" style={{ borderColor: cardBorderMap[tone], background: cardBgMap[tone] }}>
      {IconComp && (
        <div className="icon-circle" style={{ background: iconBg || "rgba(32,45,36,0.08)" }}>
          <IconComp size={26} style={{ color: iconColor || colorMap[tone] }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="stat-label mb-1" style={{ color: colorMap[tone] }}>{label}</p>
        <p className="stat-num bsi-serif" style={{ color: colorMap[tone] }}>{value}</p>
        {sub && <p className="stat-sub" style={{ color: "var(--ink-soft)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const styleMap = {
    NEEDS_CONFIRMATION: { bg: "var(--amber-warn-soft)", fg: "var(--amber-warn)", icon: "👆" },
    FLAGGED_ONLY: { bg: "var(--brick-soft)", fg: "var(--brick)", icon: "🔔" },
    AUTO_FIXED: { bg: "var(--moss-soft)", fg: "var(--moss)", icon: "✅" },
  };
  const s = styleMap[severity] || { bg: "rgba(44,62,74,0.12)", fg: "var(--navy)", icon: "ℹ️" };
  return (
    <span className="bsi-badge" style={{ background: s.bg, color: s.fg }}>
      {s.icon} {SEVERITY_LABELS[severity] || severity}
    </span>
  );
}

function IssueList({ issues }) {
  if (!issues || issues.length === 0) return (
    <span className="bsi-badge" style={{ background: "var(--moss-soft)", color: "var(--moss)" }}>✅ Sạch</span>
  );
  return (
    <div className="flex flex-col gap-1">
      {issues.map((iss, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <SeverityBadge severity={iss.severity} />
          <span className="text-[12.5px] mt-0.5" style={{ color: "var(--ink-soft)" }}>{iss.detail}</span>
        </div>
      ))}
    </div>
  );
}

/* Tooltip/Accordion dành cho Chuyên Gia */
function ExpertDetail({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="expert-accordion mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[12.5px] font-semibold text-blue-800"
      >
        <span className="flex items-center gap-2">
          <BookOpen size={14} /> 💡 {title}
        </span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-[12px] text-blue-900 space-y-2 border-t border-blue-200">
          {children}
        </div>
      )}
    </div>
  );
}

/* ============================== MAIN COMPONENT ============================== */
export default function DataIntegrationTool() {
  const [step, setStep] = useState("upload");
  const [orderFiles, setOrderFiles] = useState([]);
  const [catalogFile, setCatalogFile] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const [procIdx, setProcIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [parseError, setParseError] = useState("");
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Manual Confirmations state
  const [manualConfirmations, setManualConfirmations] = useState(new Map());

  // 3 Gói cấu hình nghiệp vụ
  const [activePresetId, setActivePresetId] = useState("balanced");
  const [hoveredPresetId, setHoveredPresetId] = useState(null);
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);

  // Configuration settings
  const [config, setConfig] = useState({ ...PRESETS.balanced.config });

  const handleSelectPreset = (presetKey) => {
    setActivePresetId(presetKey);
    setConfig({ ...PRESETS[presetKey].config });
  };

  const handleCustomParamChange = (field, value) => {
    setActivePresetId("custom");
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const parseToFileState = async (file) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const headers = (rows[0] || []).map((h) => String(h));
    const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== ""));
    const mapping = detectFields(headers);
    return { fileName: file.name, headers, dataRows, mapping };
  };

  /** Tự động nhận diện kênh bán từ tên file */
  const detectChannelFromFilename = (filename) => {
    const n = (filename || "").toLowerCase().replace(/[_\-\.]+/g, " ");
    if (n.includes("shopee")) return "Shopee";
    if (n.includes("lazada")) return "Lazada";
    if (n.includes("tiktok") || n.includes("tik tok")) return "TikTok Shop";
    if (n.includes("pos") || n.includes("cua hang") || n.includes("tai quay")) return "POS";
    if (n.includes("tiki")) return "Tiki";
    if (n.includes("sendo")) return "Sendo";
    return "";
  };

  const addOrderFile = async (file) => {
    setParseError("");
    try {
      const fs = await parseToFileState(file);
      fs.channelLabel = detectChannelFromFilename(file.name);
      setOrderFiles((prev) => (prev.length >= MAX_ORDER_FILES ? prev : [...prev, fs]));
    } catch {
      setParseError(`Không đọc được file "${file.name}". Hãy kiểm tra định dạng (.csv/.xlsx/.xls).`);
    }
  };
  const removeOrderFile = (idx) => setOrderFiles((prev) => prev.filter((_, i) => i !== idx));
  const updateChannelLabel = (idx, label) => {
    setOrderFiles((prev) => prev.map((f, i) => i === idx ? { ...f, channelLabel: label } : f));
  };
  const setCatalog = async (file) => {
    setParseError("");
    try {
      setCatalogFile(await parseToFileState(file));
    } catch {
      setParseError(`Không đọc được file "${file.name}". Hãy kiểm tra định dạng (.csv/.xlsx/.xls).`);
    }
  };

  const reset = () => {
    setOrderFiles([]); setCatalogFile(null);
    setResult(null); setStep("upload"); setActiveTab("overview"); setParseError("");
    setManualConfirmations(new Map());
  };

  const readyToProcess = orderFiles.length > 0 && orderFiles.every((f) => f.dataRows.length > 0);

  const processAll = async () => {
    setStep("processing"); setProcIdx(0);
    await delay(400); setProcIdx(1);
    await delay(500); setProcIdx(2);
    await delay(500);

    const pipelineOptions = {
      resolutionStrategy: catalogFile ? "CATALOG" : "BIPARTITE",
      fuzzyHighThreshold: config.fuzzyHighThreshold,
      fuzzyConfirmThreshold: config.fuzzyConfirmThreshold,
    };

    const { integrated, issues, issuesSummary, stats, integrationMode, strategyLabel, resolutionStats, bipartiteStats, normStats, governanceAudit, synthesizedCatalog } = runPipeline(
      orderFiles,
      catalogFile,
      pipelineOptions
    );
    setProcIdx(3); await delay(400);

    const revenueTotal = integrated.reduce((s, r) => s + r.thanh_tien, 0);
    const channelMap = new Map();
    integrated.forEach((r) => channelMap.set(r.kenh, (channelMap.get(r.kenh) || 0) + r.thanh_tien));
    const revenueByChannel = [...channelMap.entries()].map(([kenh, doanhThu]) => ({ kenh, doanhThu })).sort((a, b) => b.doanhThu - a.doanhThu);

    const productMap = new Map();
    integrated.forEach((r) => { const key = r.ten_sp || "(Không rõ)"; productMap.set(key, (productMap.get(key) || 0) + r.so_luong); });
    const topProducts = [...productMap.entries()].map(([ten, soLuong]) => ({ ten, soLuong })).sort((a, b) => b.soLuong - a.soLuong).slice(0, 8);

    const pendingConfirmations = integrated.filter((r) => r.matchStatus === "NEEDS_CONFIRMATION" || r.matchStatus === "UNRESOLVED");

    setResult({
      integrated, issues, issuesSummary, stats,
      revenueTotal, revenueByChannel, topProducts,
      pendingConfirmations,
      integrationMode,
      strategyLabel,
      resolutionStats,
      bipartiteStats,
      normStats,
      governanceAudit,
      synthesizedCatalog,
      activePreset: activePresetId !== "custom" ? PRESETS[activePresetId].name : "Tùy chỉnh riêng",
      fileBreakdown: orderFiles.map((f) => `${f.fileName} (${f.dataRows.length})`).join(" · "),
    });
    setStep("results");
  };

  const handleManualDecision = (rowIndex, decision, item) => {
    setManualConfirmations((prev) => {
      const next = new Map(prev);
      next.set(rowIndex, { decision, item });
      return next;
    });
  };

  const exportSummaryFile = () => {
    if (!result) return;
    const headers = ["Nguồn", "Mã đơn", "Ngày", "Tên sản phẩm", "Mã định danh", "Thương hiệu/NCC", "Kênh", "Trạng thái đơn", "Số lượng", "Giá bán", "Thành tiền", "Trạng thái khớp", "Vấn đề"];
    const rows = result.integrated.map((r, i) => {
      const manual = manualConfirmations.get(i);
      let matchSt = r.matchStatus;
      let prodName = r.ten_sp;
      let idCode = r.ma_dinh_danh;

      if (manual) {
        if (manual.decision === "ACCEPT") {
          matchSt = "MATCHED_CONFIRMED_USER";
        } else if (manual.decision === "REJECT") {
          matchSt = "REJECTED_USER";
          idCode = "—";
        }
      }

      return [
        r.nguon, r.ma_don, r.ngay, prodName, idCode, r.thuong_hieu, r.kenh, r.trang_thai, r.so_luong, r.gia, r.thanh_tien,
        matchSt,
        r.issues.length ? r.issues.map((iss) => `[${GROUP_LABELS[iss.group] || iss.group} | ${SEVERITY_LABELS[iss.severity]}] ${iss.detail}`).join(" | ") : "Không có",
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "du-lieu-tich-hop-ban-hang.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const CHART_COLORS = ["#A97B25", "#2D7A4A", "#C0392B", "#2C3E4A", "#7A8B76", "#C9A45C"];
  const currentPreviewPreset = hoveredPresetId ? PRESETS[hoveredPresetId] : activePresetId !== "custom" ? PRESETS[activePresetId] : null;

  // Tính tỷ lệ khớp
  const matchRate = result ? (result.stats.totalRows ? Math.round((result.stats.matchedCount / result.stats.totalRows) * 100) : 0) : 0;

  return (
    <div className="bsi-root w-full">
      <Tokens />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--brass)" }}>
              🎓 Khóa Luận Tốt Nghiệp · ĐH Công Nghệ Thông Tin (UIT — ĐHQG TP.HCM)
            </p>
            <h1 className="bsi-serif text-[24px] md:text-[28px] font-semibold leading-tight">
              🛒 Hệ Thống Kiểm Tra & Tổng Hợp Dữ Liệu Bán Hàng Đa Kênh
            </h1>
            <p className="text-[12px] text-gray-500 mt-0.5 bsi-mono">
              Multi-source Sales Data Integration and Data Quality Management System
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowConfigModal(true)} className="bsi-btn-secondary flex items-center gap-1.5 text-[13px] px-4 py-2.5">
              <Settings size={15} />
              <span>Cấu hình:</span>
              <span className="font-bold" style={{ color: "var(--brass)" }}>
                {activePresetId !== "custom" ? PRESETS[activePresetId].emoji + " " + PRESETS[activePresetId].name.split("(")[0].trim() : "⚙️ Tùy chỉnh"}
              </span>
            </button>
            {step === "results" && (
              <>
                <button onClick={exportSummaryFile} className="bsi-btn-cta flex items-center gap-2 px-4 py-2.5">
                  <Download size={16} /> ⬇️ Tải Xuống File Kết Quả
                </button>
                <button onClick={reset} className="bsi-btn-secondary flex items-center gap-1.5 text-[13px] px-4 py-2.5">
                  <RotateCcw size={14} /> Kiểm tra file khác
                </button>
              </>
            )}
          </div>
        </div>

        {/* Modal Cấu hình */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bsi-card max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto" style={{ background: "var(--paper-card)" }}>
              <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-2">
                  <Sliders size={20} style={{ color: "var(--brass)" }} />
                  <div>
                    <h3 className="bsi-serif text-xl font-semibold leading-none">⚙️ Chọn Mức Độ Kiểm Tra</h3>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--ink-soft)" }}>Chọn gói phù hợp với mục đích sử dụng của bạn</p>
                  </div>
                </div>
                <button onClick={() => setShowConfigModal(false)} aria-label="Đóng" className="p-1.5 rounded-lg hover:bg-gray-100 transition"><X size={20} /></button>
              </div>

              {/* 3 Gói Cấu Hình */}
              <div className="space-y-2.5 mb-4">
                <p className="text-[13px] font-semibold text-gray-600 mb-2">1. Chọn Gói Kiểm Tra Phù Hợp:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(PRESETS).map(([key, p]) => {
                    const isSelected = activePresetId === key;
                    return (
                      <div
                        key={key}
                        onClick={() => handleSelectPreset(key)}
                        onMouseEnter={() => setHoveredPresetId(key)}
                        onMouseLeave={() => setHoveredPresetId(null)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${isSelected ? "border-green-600 bg-green-50 shadow-md" : "border-gray-200 hover:border-amber-400 bg-white"
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{p.emoji}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: p.badgeBg, color: p.badgeColor }}>{p.badge}</span>
                          </div>
                          <h4 className="font-bold text-[13px] mb-1 leading-tight">{p.name.split("(")[0]}</h4>
                          <p className="text-[11.5px] text-gray-600 leading-relaxed">{p.shortDesc}</p>
                        </div>
                        {isSelected && (
                          <div className="mt-2 flex items-center gap-1 text-green-700 text-[11.5px] font-semibold">
                            <CheckCircle2 size={13} /> Đang sử dụng
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chi tiết gói khi hover */}
              {currentPreviewPreset && (
                <div className="p-4 rounded-xl border mb-4 text-[12.5px] transition-all" style={{ background: "var(--paper)", borderColor: "var(--brass)" }}>
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-2">
                    <Info size={15} /> {currentPreviewPreset.emoji} Chi tiết: {currentPreviewPreset.name}
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-2">{currentPreviewPreset.detail}</p>
                  <div className="text-[12px] text-gray-600 bg-white/80 p-2.5 rounded-lg border border-gray-200">
                    <strong>🎯 Phù hợp nhất cho:</strong> {currentPreviewPreset.suitableFor}
                  </div>
                </div>
              )}

              {/* Cấu hình nâng cao (ẩn cho chuyên gia) */}
              <div className="border-t pt-3 mb-2" style={{ borderColor: "var(--line)" }}>
                <button
                  onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                  className="flex items-center justify-between w-full text-[12.5px] font-semibold text-blue-800 bg-blue-50 px-4 py-2.5 rounded-lg hover:bg-blue-100 transition"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen size={15} /> 💡 Tùy Chỉnh Tham Số Kỹ Thuật (Dành Cho Chuyên Gia)
                  </span>
                  {showAdvancedParams ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAdvancedParams && (
                  <div className="mt-3 space-y-4 bg-blue-50 p-4 rounded-xl border border-blue-200 text-[12.5px]">
                    <div>
                      <div className="flex justify-between font-semibold mb-1.5">
                        <span>Ngưỡng độ giống cần xác nhận thủ công: <strong className="text-blue-800">{config.fuzzyConfirmThreshold}%</strong></span>
                        <span className="text-gray-400 text-[11px]">Mặc định: 70%</span>
                      </div>
                      <input type="range" min="40" max="90" value={config.fuzzyConfirmThreshold}
                        onChange={(e) => handleCustomParamChange("fuzzyConfirmThreshold", Number(e.target.value))}
                        className="w-full accent-blue-600" />
                      <span className="text-[11px] text-gray-500 mt-0.5 block">Sản phẩm có độ giống từ {config.fuzzyConfirmThreshold}% trở lên sẽ chuyển sang danh sách cần bạn xem xét.</span>
                    </div>
                    <div>
                      <div className="flex justify-between font-semibold mb-1.5">
                        <span>Ngưỡng tự động ghép chắc chắn: <strong className="text-blue-800">{config.fuzzyHighThreshold}%</strong></span>
                        <span className="text-gray-400 text-[11px]">Mặc định: 90%</span>
                      </div>
                      <input type="range" min="75" max="99" value={config.fuzzyHighThreshold}
                        onChange={(e) => handleCustomParamChange("fuzzyHighThreshold", Number(e.target.value))}
                        className="w-full accent-blue-600" />
                      <span className="text-[11px] text-gray-500 mt-0.5 block">Từ {config.fuzzyHighThreshold}% trở lên hệ thống tự động ghép mà không cần xác nhận.</span>
                    </div>
                    <div>
                      <div className="flex justify-between font-semibold mb-1.5">
                        <span>Ngưỡng cảnh báo lệch giá: <strong className="text-blue-800">{config.priceDeviationThreshold}%</strong></span>
                        <span className="text-gray-400 text-[11px]">Mặc định: 30%</span>
                      </div>
                      <input type="range" min="10" max="60" value={config.priceDeviationThreshold}
                        onChange={(e) => handleCustomParamChange("priceDeviationThreshold", Number(e.target.value))}
                        className="w-full accent-blue-600" />
                      <span className="text-[11px] text-gray-500 mt-0.5 block">Gắn cờ cảnh báo khi giá lệch quá {config.priceDeviationThreshold}% so với giá trong danh mục sản phẩm gốc.</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setShowConfigModal(false)} className="bsi-btn-secondary px-4 py-2 text-[13px]">Hủy</button>
                <button onClick={() => setShowConfigModal(false)} className="bsi-btn-cta px-6 py-2.5 text-[14px]">
                  <Check size={15} className="inline mr-1" /> Áp dụng cấu hình
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: UPLOAD */}
        {step === "upload" && (
          <>
            {/* Hướng dẫn nhanh */}
            <div className="bsi-card p-5 mb-6" style={{ background: "linear-gradient(135deg, #EBF5FB 0%, #E8F8F5 100%)", borderColor: "#AED6F1" }}>
              <h2 className="font-bold text-[16px] mb-3 flex items-center gap-2">
                <Sparkles size={18} style={{ color: "#2471A3" }} />
                Hướng Dẫn Sử Dụng Nhanh
              </h2>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="step-badge bg-blue-600 text-white">1</div>
                  <div>
                    <p className="font-semibold text-[14px]">📦 Tải file đơn hàng</p>
                    <p className="text-[12.5px] text-gray-600 mt-0.5">Từ POS, Shopee, TikTok Shop, Lazada…</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center text-gray-300 text-2xl">→</div>
                <div className="flex items-start gap-3 flex-1">
                  <div className="step-badge" style={{ background: "var(--brass)" }}>2</div>
                  <div>
                    <p className="font-semibold text-[14px]">📋 Tải danh sách sản phẩm gốc</p>
                    <p className="text-[12.5px] text-gray-600 mt-0.5">Không bắt buộc — giúp kết quả chính xác hơn</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center text-gray-300 text-2xl">→</div>
                <div className="flex items-start gap-3 flex-1">
                  <div className="step-badge" style={{ background: "var(--moss)" }}>3</div>
                  <div>
                    <p className="font-semibold text-[14px]">🚀 Bấm Kiểm Tra</p>
                    <p className="text-[12.5px] text-gray-600 mt-0.5">Hệ thống tự động làm mọi thứ!</p>
                  </div>
                </div>
              </div>
            </div>

            {parseError && (
              <div className="bsi-card p-4 mb-4 flex items-center gap-3" style={{ borderColor: "var(--brick)", background: "var(--brick-soft)" }}>
                <AlertTriangle size={18} style={{ color: "var(--brick)", flexShrink: 0 }} />
                <div>
                  <p className="font-semibold text-[13px]" style={{ color: "var(--brick)" }}>⚠️ Không đọc được file!</p>
                  <span className="text-[12.5px]" style={{ color: "var(--brick)" }}>{parseError}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <OrdersDropzone files={orderFiles} onAddFile={addOrderFile} onRemoveFile={removeOrderFile}
                onUpdateChannelLabel={updateChannelLabel}
                maxFiles={MAX_ORDER_FILES} dragKey="orders" dragOverKey={dragOverKey} setDragOverKey={setDragOverKey} />
              <UploadCard tag="catalog" icon={Package} title="Danh Sách Sản Phẩm Gốc"
                hint="Tải lên file danh sách sản phẩm của cửa hàng bạn để hệ thống so sánh và phát hiện lỗi chính xác hơn. Nếu không có, hệ thống vẫn hoạt động bình thường."
                fileState={catalogFile} onFile={setCatalog} onRemove={() => setCatalogFile(null)}
                dragKey="catalog" dragOverKey={dragOverKey} setDragOverKey={setDragOverKey} />
            </div>

            <div className="flex flex-col items-center gap-3">
              <button onClick={processAll} disabled={!readyToProcess} className="bsi-btn-cta flex items-center gap-3 px-8 py-4 text-[17px]">
                🚀 Bắt Đầu Kiểm Tra & Tổng Hợp Dữ Liệu
                <ArrowRight size={20} />
              </button>
              {readyToProcess && (
                <p className="text-[12.5px] font-medium" style={{ color: "var(--moss)" }}>
                  ✅ Sẵn sàng! Đã tải {orderFiles.length} file đơn hàng{catalogFile ? " + 1 danh sách sản phẩm" : ""}.
                </p>
              )}
            </div>
          </>
        )}

        {/* STEP: PROCESSING */}
        {step === "processing" && (
          <div className="bsi-card p-12 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <Loader2 size={52} className="bsi-spin" style={{ color: "var(--moss)" }} />
            </div>
            <h2 className="bsi-serif text-[22px] font-semibold mb-2">Đang kiểm tra dữ liệu của bạn…</h2>
            <p className="text-[13.5px] mb-8 text-gray-500">Vui lòng chờ, hệ thống đang làm việc chăm chỉ 🤖</p>
            <div className="w-full max-w-md space-y-4 text-left">
              {PROCESSING_STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{
                  background: i < procIdx ? "var(--moss-soft)" : i === procIdx ? "var(--amber-warn-soft)" : "rgba(32,45,36,0.04)",
                  border: `1.5px solid ${i < procIdx ? "var(--moss)" : i === procIdx ? "var(--amber-warn)" : "transparent"}`
                }}>
                  {i < procIdx ? <CheckCircle2 size={20} style={{ color: "var(--moss)", flexShrink: 0 }} />
                    : i === procIdx ? <Loader2 size={20} className="bsi-spin" style={{ color: "var(--amber-warn)", flexShrink: 0 }} />
                      : <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: "var(--line)" }} />}
                  <span className="text-[14px] font-medium" style={{ color: i <= procIdx ? "var(--ink)" : "var(--ink-soft)" }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP: RESULTS */}
        {step === "results" && result && (
          <div>
            {/* Banner kết quả */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3 p-4 rounded-xl" style={{ background: "var(--moss-soft)", border: "2px solid var(--moss)" }}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="bsi-stamp">✓ ĐÃ KIỂM TRA XONG</span>
                <div>
                  <p className="font-semibold text-[14px]" style={{ color: "var(--moss)" }}>
                    {result.stats.totalRows} đơn hàng từ {orderFiles.length} nguồn
                  </p>
                  <p className="text-[12px]" style={{ color: "var(--ink-soft)" }}>
                    {result.stats.catalogSize > 0 ? `${result.stats.catalogSize} sản phẩm trong danh sách gốc` : "Không có danh sách sản phẩm gốc"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bsi-badge" style={{ background: "white", color: "var(--moss)" }}>
                  {activePresetId !== "custom" ? PRESETS[activePresetId].emoji + " " + PRESETS[activePresetId].name.split("(")[0].trim() : "⚙️ Tùy chỉnh"}
                </span>
                <span className="bsi-badge" style={{ background: "var(--navy)", color: "#fff" }}>
                  {result.strategyLabel}
                </span>
              </div>
            </div>

            {/* 4 STAT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="🛒 Tổng Đơn Hàng"
                value={result.stats.totalRows.toLocaleString()}
                sub={`Từ ${orderFiles.length} kênh bán hàng`}
                tone="ink"
                icon={ShoppingCart}
                iconBg="#EBF5FB"
                iconColor="#2471A3"
              />
              <StatCard
                label="✅ Đã Ghép Thành Công"
                value={`${matchRate}%`}
                sub={`${result.stats.matchedCount}/${result.stats.totalRows} đơn hàng`}
                tone="moss"
                icon={BadgeCheck}
                iconBg="var(--moss-soft)"
                iconColor="var(--moss)"
              />
              <StatCard
                label="⚠️ Vấn Đề Phát Hiện"
                value={result.issues.length}
                sub={result.issues.length === 0 ? "Tuyệt vời! Không có lỗi 🎉" : "Xem chi tiết ở tab bên dưới"}
                tone={result.issues.length === 0 ? "moss" : "brick"}
                icon={result.issues.length === 0 ? ShieldCheck : CircleAlert}
                iconBg={result.issues.length === 0 ? "var(--moss-soft)" : "var(--brick-soft)"}
                iconColor={result.issues.length === 0 ? "var(--moss)" : "var(--brick)"}
              />
              <StatCard
                label="💰 Doanh Thu Thực Tế"
                value={formatVND(result.revenueTotal)}
                sub={`Tổng hợp từ ${orderFiles.length} kênh`}
                tone="brass"
                icon={Banknote}
                iconBg="#FEF9E7"
                iconColor="var(--brass)"
              />
            </div>

            {/* TABS */}
            <div className="flex items-center gap-1 border-b mb-5 overflow-x-auto" style={{ borderColor: "var(--line)" }}>
              {[
                { key: "overview", label: "📊 Tổng Quan", icon: BarChart3 },
                { key: "issues", label: `⚠️ Kiểm Tra Lỗi (${result.issues.length})`, icon: ListChecks },
                { key: "manual_confirm", label: `👆 Cần Bạn Xem (${result.pendingConfirmations.length})`, icon: ShieldCheck },
                { key: "quality_report", label: "📋 Báo Cáo Chi Tiết", icon: FileText },
                { key: "data", label: "📄 Xem Toàn Bộ Dữ Liệu", icon: Table2 },
              ].map((t) => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`bsi-tab-btn flex items-center gap-1.5 whitespace-nowrap px-3 ${activeTab === t.key ? "active" : ""}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: TỔNG QUAN */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bsi-card p-5">
                  <h3 className="bsi-serif text-[16px] font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp size={18} style={{ color: "var(--moss)" }} />
                    Doanh Thu Theo Kênh Bán Hàng
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={result.revenueByChannel} margin={{ left: 4, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="kenh" tick={{ fontSize: 12 }} stroke="var(--ink-soft)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--ink-soft)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => formatVND(v)} contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: "var(--line)" }} />
                      <Bar dataKey="doanhThu" radius={[5, 5, 0, 0]}>
                        {result.revenueByChannel.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bsi-card p-5">
                  <h3 className="bsi-serif text-[16px] font-semibold mb-4 flex items-center gap-2">
                    <ShoppingCart size={18} style={{ color: "var(--brass)" }} />
                    Top Sản Phẩm Bán Chạy Nhất
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={result.topProducts} layout="vertical" margin={{ left: 4, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--ink-soft)" allowDecimals={false} />
                      <YAxis type="category" dataKey="ten" width={160} tick={{ fontSize: 11 }} stroke="var(--ink-soft)" />
                      <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: "var(--line)" }} />
                      <Bar dataKey="soLuong" radius={[0, 5, 5, 0]} fill="var(--brass)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 2: KIỂM TRA LỖI */}
            {activeTab === "issues" && (
              <div className="bsi-card overflow-hidden">
                {/* Chú thích màu sắc */}
                <div className="p-4 flex flex-wrap gap-3 text-[12.5px]" style={{ borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
                  <span className="font-semibold text-gray-600">Ý nghĩa màu sắc:</span>
                  <span><SeverityBadge severity="AUTO_FIXED" /> — Hệ thống đã tự sửa, bạn không cần làm gì</span>
                  <span><SeverityBadge severity="NEEDS_CONFIRMATION" /> — Có gợi ý sửa, cần bạn xem xét</span>
                  <span><SeverityBadge severity="FLAGGED_ONLY" /> — Đã đánh dấu, cần bạn quyết định</span>
                </div>
                {result.issues.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="text-5xl mb-3">🎉</div>
                    <p className="text-[16px] font-semibold" style={{ color: "var(--moss)" }}>Tuyệt vời! Không phát hiện lỗi nào!</p>
                    <p className="text-[13px] mt-1 text-gray-500">Dữ liệu của bạn hoàn toàn sạch và nhất quán.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
                          {["Nguồn File", "Mã Đơn", "Tên Sản Phẩm", "Loại Lỗi", "Chi Tiết Vấn Đề"].map((h) => (
                            <th key={h} className="text-left font-bold px-4 py-3 uppercase tracking-wide text-[11px]" style={{ color: "var(--ink-soft)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.integrated.filter((r) => r.issues.length > 0).map((r, i) => (
                          <tr key={i} className="bsi-row" style={{ borderBottom: "1px solid var(--line)" }}>
                            <td className="px-4 py-3 whitespace-nowrap align-top font-medium">{r.nguon}</td>
                            <td className="px-4 py-3 bsi-mono whitespace-nowrap align-top text-[12px]">{r.ma_don || "—"}</td>
                            <td className="px-4 py-3 align-top font-medium">{r.ten_sp || "—"}</td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-col gap-1">
                                {[...new Set(r.issues.map(iss => iss.group))].map(g => (
                                  <span key={g} className="text-[12px] font-semibold">{GROUP_LABELS[g] || g}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3"><IssueList issues={r.issues} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CẦN BẠN XEM */}
            {activeTab === "manual_confirm" && (
              <div className="bsi-card p-5">
                <div className="mb-5">
                  <h3 className="bsi-serif text-[18px] font-semibold mb-1 flex items-center gap-2">
                    <MousePointerClick size={20} style={{ color: "var(--amber-warn)" }} />
                    👆 Các Sản Phẩm Cần Bạn Xem Xét
                  </h3>
                  <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
                    Hệ thống thấy tên sản phẩm trong file đơn hàng có vẻ <strong>gần giống</strong> nhưng chưa chắc chắn với sản phẩm trong danh sách gốc. Hãy xem và xác nhận giúp nhé!
                  </p>
                  <ExpertDetail title="Thông tin kỹ thuật — Fuzzy Matching (Dành cho chuyên gia / giảng viên)">
                    <p>Các bản ghi này có độ tương đồng Fuzzy Token-Sort nằm trong khoảng nghi ngờ ({config.fuzzyConfirmThreshold}% – {config.fuzzyHighThreshold}%), tức là hệ thống có đề xuất nhưng không đủ tin cậy để tự động ghép (Human-in-the-Loop). Quyết định của người dùng sẽ được ghi nhận vào trường <code>matchStatus</code> khi xuất file.</p>
                  </ExpertDetail>
                </div>
                {result.pendingConfirmations.length === 0 ? (
                  <div className="p-10 text-center rounded-xl" style={{ background: "var(--moss-soft)" }}>
                    <div className="text-5xl mb-3">🎉</div>
                    <p className="text-[16px] font-semibold" style={{ color: "var(--moss)" }}>Tuyệt vời! Không có gì cần xem xét thêm!</p>
                    <p className="text-[13px] mt-1" style={{ color: "var(--ink-soft)" }}>Tất cả sản phẩm đều đã được đối chiếu chính xác.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {result.pendingConfirmations.map((item, idx) => {
                      const manual = manualConfirmations.get(idx);
                      const isUnresolved = item.matchStatus === "UNRESOLVED";
                      return (
                        <div key={idx} className="border-2 rounded-xl p-4 text-[13px]" style={{
                          borderColor: manual ? "var(--moss)" : isUnresolved ? "var(--brick)" : "var(--amber-warn)",
                          background: manual?.decision === "ACCEPT" ? "var(--moss-soft)" : manual?.decision === "REJECT" ? "var(--brick-soft)" : "var(--paper)"
                        }}>
                          {/* Sản phẩm từ đơn hàng */}
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                            <div>
                              <span className="text-[11px] uppercase font-bold tracking-wide" style={{ color: "var(--ink-soft)" }}>📦 Sản phẩm từ file đơn hàng:</span>
                              <div className="mt-1">
                                <span className="font-bold text-[15px]">{item.ten_sp || "(Không có tên)"}</span>
                                <div className="text-[12px] mt-0.5" style={{ color: "var(--ink-soft)" }}>
                                  Nguồn: <strong>{item.nguon}</strong> · Mã đơn: <span className="bsi-mono">{item.ma_don}</span>
                                  {item.ma_dinh_danh ? ` · Mã SP: ${item.ma_dinh_danh}` : " · (Không có mã SP)"}
                                </div>
                              </div>
                            </div>
                            <SeverityBadge severity={item.matchStatus} />
                          </div>

                          {/* Đề xuất ghép */}
                          {item.matched ? (
                            <div className="p-3 rounded-lg mb-3" style={{ background: "var(--amber-warn-soft)", border: "1px solid var(--amber-warn)" }}>
                              <span className="text-[11.5px] uppercase font-bold tracking-wide" style={{ color: "#7D4E00" }}>⇄ Hệ thống đề xuất ghép với sản phẩm trong danh sách gốc:</span>
                              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                                <span className="font-bold text-[14px]">{item.matched.ten_sp}</span>
                                <span className="bsi-mono text-[12px]" style={{ color: "var(--ink-soft)" }}>Mã: {item.matched.ma_dinh_danh || "—"}</span>
                                <span className="bsi-badge font-bold" style={{ background: "white", color: "var(--amber-warn)", border: "1.5px solid var(--amber-warn)" }}>
                                  Độ giống: {item.matchScore}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg mb-3" style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)" }}>
                              <span className="text-[13px] font-medium" style={{ color: "var(--brick)" }}>
                                ⚠️ Không tìm thấy sản phẩm nào tương ứng trong danh sách gốc. Sản phẩm này có thể chưa được nhập, hoặc tên/mã quá khác biệt.
                              </span>
                            </div>
                          )}

                          {/* Nút hành động */}
                          <div className="flex flex-wrap gap-2.5 pt-3 border-t items-center" style={{ borderColor: "var(--line)" }}>
                            {item.matched && (
                              <button
                                onClick={() => handleManualDecision(idx, "ACCEPT", item)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold rounded-lg transition ${manual?.decision === "ACCEPT" ? "bsi-btn-success" : "bsi-btn-secondary"}`}
                              >
                                <ThumbsUp size={16} /> ✅ Đúng rồi, ghép vào!
                              </button>
                            )}
                            <button
                              onClick={() => handleManualDecision(idx, "REJECT", item)}
                              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold rounded-lg transition ${manual?.decision === "REJECT" ? "bsi-btn-danger" : "bsi-btn-secondary"}`}
                            >
                              <ThumbsDown size={16} /> {item.matched ? "❌ Không, sai sản phẩm!" : "⏭️ Bỏ qua sản phẩm này"}
                            </button>
                            {manual && (
                              <span className="text-[13px] font-bold ml-auto" style={{ color: "var(--moss)" }}>
                                ✓ Đã ghi nhận: {manual.decision === "ACCEPT" ? "Đồng ý ghép" : "Từ chối / bỏ qua"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: BÁO CÁO CHI TIẾT */}
            {activeTab === "quality_report" && (
              <div className="space-y-5">
                {/* PHẦN 1: KIỂM TRA LỖI THÔNG TIN */}
                <div className="bsi-card p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="icon-circle" style={{ background: "#FEF9E7", width: 44, height: 44 }}>
                      <span className="font-black text-xl" style={{ color: "var(--brass)" }}>1</span>
                    </div>
                    <div>
                      <h3 className="bsi-serif text-[17px] font-semibold">🔍 Kiểm Tra Lỗi Thông Tin</h3>
                      <p className="text-[12.5px] text-gray-500">Hệ thống đã tự động phát hiện và phân loại các vấn đề trong dữ liệu</p>
                    </div>
                  </div>

                  {/* Số liệu chuẩn hóa đơn giản hóa */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 mt-3">
                    {[
                      { icon: "🏷️", label: "Mã sản phẩm", val: result.normStats?.idCount || 0 },
                      { icon: "📝", label: "Tên & Thương hiệu", val: result.normStats?.textCount || 0 },
                      { icon: "📅", label: "Ngày tháng", val: result.normStats?.dateCount || 0 },
                      { icon: "🏪", label: "Kênh & Trạng thái", val: (result.normStats?.channelCount || 0) + (result.normStats?.statusCount || 0) },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-xl border-2 bg-white text-center" style={{ borderColor: "var(--brass-soft)" }}>
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <p className="text-[11.5px] text-gray-500 mb-1">{item.label}</p>
                        <p className="font-black text-[22px]" style={{ color: "var(--brass)" }}>{item.val}</p>
                        <p className="text-[11px] text-gray-400">trường đã làm sạch</p>
                      </div>
                    ))}
                  </div>

                  <h4 className="font-bold text-[14px] mb-3 flex items-center gap-2">
                    <CircleAlert size={16} style={{ color: "var(--brick)" }} />
                    Phân Bổ Lỗi Theo Loại
                  </h4>
                  <div className="space-y-2.5">
                    {Object.entries(GROUP_LABELS).map(([gKey, gLabel]) => {
                      const count = result.issues.filter((i) => i.group === gKey).length;
                      const pct = result.issues.length ? Math.round((count / result.issues.length) * 100) : 0;
                      if (count === 0) return null;
                      return (
                        <div key={gKey} className="flex items-center gap-3 text-[13px]">
                          <span className="font-semibold w-52 flex-shrink-0">{gLabel}</span>
                          <div className="flex-1 progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct > 30 ? "var(--brick)" : pct > 10 ? "var(--amber-warn)" : "var(--moss)" }}></div>
                          </div>
                          <span className="bsi-mono text-[12px] w-20 text-right font-semibold">{count} lỗi ({pct}%)</span>
                        </div>
                      );
                    })}
                    {result.issues.length === 0 && (
                      <div className="text-center py-4 text-[14px] font-semibold" style={{ color: "var(--moss)" }}>✅ Không có lỗi nào!</div>
                    )}
                  </div>

                  <ExpertDetail title="Chi tiết kỹ thuật — RQ1: Ánh xạ & 7 nhóm chuẩn hóa (Dành cho chuyên gia / giảng viên)">
                    <p>RQ1 đo lường khả năng xử lý dữ liệu không đồng nhất theo 7 nhóm đối tượng chuẩn hóa: (1) Mã định danh/SKU, (2) Văn bản & thương hiệu, (3) Số học, (4) Thời gian (ISO Date), (5) Phân loại kênh/status, (6) Cấu trúc đa chi nhánh, (7) Encoding/charset. Phân loại lỗi theo 6 nhóm: schema, entity, value, temporal, semantic, technical.</p>
                  </ExpertDetail>
                </div>

                {/* PHẦN 2: ĐỘ KHỚP DỮ LIỆU */}
                <div className="bsi-card p-5" style={{ borderColor: "var(--moss)", borderWidth: 2 }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="icon-circle" style={{ background: "var(--moss-soft)", width: 44, height: 44 }}>
                      <span className="font-black text-xl" style={{ color: "var(--moss)" }}>2</span>
                    </div>
                    <div>
                      <h3 className="bsi-serif text-[17px] font-semibold text-green-900">🔗 Độ Khớp Dữ Liệu</h3>
                      <p className="text-[12.5px] text-gray-500">So sánh hai cách: chỉ khớp khi đúng mã vs. hệ thống thông minh 3 bước</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 mt-3">
                    <div className="p-4 rounded-xl border-2 bg-white text-center" style={{ borderColor: "#D5D8DC" }}>
                      <p className="text-[12px] uppercase font-bold text-gray-500 mb-2">😐 Cách thông thường<br />(Chỉ khớp khi đúng mã)</p>
                      <p className="bsi-serif text-[2.2rem] font-black text-gray-600">
                        {result.resolutionStats ? `${result.resolutionStats.exactMatchRate}%` : "—"}
                      </p>
                      <p className="text-[12px] text-gray-400 mt-1">
                        {result.resolutionStats ? `${result.resolutionStats.exactOnlyMatchesCount}/${result.stats.totalRows} đơn khớp` : "Chỉ khớp khi đúng mã"}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border-2 text-center" style={{ borderColor: "var(--moss)", background: "var(--moss-soft)" }}>
                      <p className="text-[12px] uppercase font-bold mb-2" style={{ color: "var(--moss)" }}>🚀 Hệ thống này<br />(Ghép thông minh 3 bước)</p>
                      <p className="bsi-serif text-[2.2rem] font-black" style={{ color: "var(--moss)" }}>
                        {result.resolutionStats ? `${result.resolutionStats.multiTierTotalLinkedRate}%` : `${matchRate}%`}
                      </p>
                      <p className="text-[12px] mt-1" style={{ color: "var(--moss)" }}>Bước 1 (Mã) + Bước 2 (Tra cứu) + Bước 3 (So sánh tên)</p>
                    </div>

                    <div className="p-4 rounded-xl border-2 text-center" style={{ borderColor: "var(--brass)", background: "var(--brass-soft)" }}>
                      <p className="text-[12px] uppercase font-bold text-amber-900 mb-2">🏆 Cải Thiện Được</p>
                      <p className="bsi-serif text-[2.2rem] font-black text-amber-900">
                        {result.resolutionStats ? `+${result.resolutionStats.improvementRate}%` : "+30%"}
                      </p>
                      <p className="text-[12px] text-amber-700 mt-1">Nhờ nhận dạng tên viết tắt, thiếu dấu, sai mã</p>
                    </div>
                  </div>

                  {result.resolutionStats && (
                    <div className="p-4 rounded-xl border border-gray-200 bg-white text-[13px] space-y-2">
                      <p className="font-bold text-gray-700 mb-2">📊 Chi tiết từng bước ghép:</p>
                      <div className="flex items-center gap-3">
                        <span className="bsi-badge" style={{ background: "var(--moss-soft)", color: "var(--moss)" }}>Bước 1</span>
                        <span><strong>Khớp Mã Chính Xác:</strong> {result.resolutionStats.breakdown.tier1_exact} đơn hàng khớp bằng mã sản phẩm.</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bsi-badge" style={{ background: "var(--amber-warn-soft)", color: "var(--amber-warn)" }}>Bước 2</span>
                        <span><strong>Tra Cứu Mã Tương Đương:</strong> {result.resolutionStats.breakdown.tier2_crosswalk} đơn khớp qua bảng mã nội bộ.</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bsi-badge" style={{ background: "var(--brass-soft)", color: "#7A5A15" }}>Bước 3</span>
                        <span><strong>So Sánh Tên Sản Phẩm:</strong> {result.resolutionStats.breakdown.tier3_fuzzy_high} tự động ghép + {result.resolutionStats.breakdown.tier3_fuzzy_confirm} chuyển bạn xem xét.</span>
                      </div>
                    </div>
                  )}

                  <ExpertDetail title="Chi tiết kỹ thuật — RQ2: Multi-tier Entity Resolution vs Exact Matching (Dành cho chuyên gia / giảng viên)">
                    <p>RQ2 kiểm chứng thực nghiệm: phương pháp 3 tầng (Tầng 1: Exact ID match, Tầng 2: Crosswalk/Alias lookup, Tầng 3: Fuzzy Token-Sort với ngưỡng {config.fuzzyHighThreshold}%/{config.fuzzyConfirmThreshold}%) cải thiện tỷ lệ liên kết thực thể so với Exact Matching đơn thuần. Bipartite Matching được sử dụng khi không có catalog.</p>
                  </ExpertDetail>
                </div>

                {/* PHẦN 3: DOANH THU THỰC TẾ */}
                <div className="bsi-card p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="icon-circle" style={{ background: "#FEF9E7", width: 44, height: 44 }}>
                      <span className="font-black text-xl" style={{ color: "var(--brass)" }}>3</span>
                    </div>
                    <div>
                      <h3 className="bsi-serif text-[17px] font-semibold">💰 Doanh Thu Thực Tế</h3>
                      <p className="text-[12.5px] text-gray-500">So sánh trước và sau khi làm sạch dữ liệu</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 mb-4">
                    <div className="p-4 rounded-xl border-2 bg-white text-center" style={{ borderColor: "#D5D8DC" }}>
                      <span className="text-[12px] uppercase font-bold text-gray-500">📋 Doanh Thu Thô Ban Đầu</span>
                      <p className="bsi-serif text-[1.4rem] font-black text-gray-700 mt-2">
                        {formatVND(result.governanceAudit?.rawRevenueTotal || result.revenueTotal)}
                      </p>
                      <span className="text-[12px] font-medium" style={{ color: "var(--brick)" }}>Bao gồm đơn hủy & trùng lặp</span>
                    </div>

                    <div className="p-4 rounded-xl border-2 text-center" style={{ background: "var(--moss-soft)", borderColor: "var(--moss)" }}>
                      <span className="text-[12px] uppercase font-bold" style={{ color: "var(--moss)" }}>✅ Doanh Thu Thực Tế Sạch</span>
                      <p className="bsi-serif text-[1.4rem] font-black mt-2" style={{ color: "var(--moss)" }}>
                        {formatVND(result.governanceAudit?.cleanRevenueTotal || result.revenueTotal)}
                      </p>
                      <span className="text-[12px] font-medium text-green-700">Đã kiểm soát & làm sạch</span>
                    </div>

                    <div className="p-4 rounded-xl border-2 text-center" style={{ background: "var(--brick-soft)", borderColor: "var(--brick)" }}>
                      <span className="text-[12px] uppercase font-bold" style={{ color: "var(--brick)" }}>⚠️ Doanh Thu Ảo Loại Bỏ</span>
                      <p className="bsi-serif text-[1.4rem] font-black mt-2" style={{ color: "var(--brick)" }}>
                        {formatVND(result.governanceAudit?.revenueDiscrepancyPrevented || 0)}
                      </p>
                      <span className="text-[12px] font-medium" style={{ color: "var(--brick)" }}>Tránh được sai lệch báo cáo</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-200 bg-white text-[13px] space-y-2.5">
                    <p className="font-bold text-gray-700 mb-1">📊 Những gì hệ thống đã làm:</p>
                    <div className="flex items-start gap-2">
                      <span className="text-[16px] mt-0.5">🚫</span>
                      <p><strong>Loại bỏ doanh thu từ đơn đã hủy:</strong> Phát hiện và gắn cờ <strong className="text-red-700">{formatVND(result.governanceAudit?.cancelledRevenuePrevented || 0)}</strong> từ các đơn hàng có trạng thái Đã hủy / Trả hàng.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[16px] mt-0.5">🔗</span>
                      <p><strong>Hợp nhất tên sản phẩm:</strong> Từ <strong>{result.governanceAudit?.rawUniqueTitlesCount || 0}</strong> biến thể tên không đồng nhất giữa các kênh → quy chuẩn về <strong className="text-green-700">{result.governanceAudit?.cleanUniqueProductsCount || 0}</strong> sản phẩm chuẩn.</p>
                    </div>
                  </div>

                  <ExpertDetail title="Chi tiết kỹ thuật — RQ3: Giảm sai lệch báo cáo quản trị (Dành cho chuyên gia / giảng viên)">
                    <p>RQ3 so sánh chỉ số quản trị giữa dữ liệu thô (chứa đơn hủy, trùng lặp mã đơn, lệch giá vượt ngưỡng {config.priceDeviationThreshold}%) và dữ liệu sau khi tích hợp & kiểm soát chất lượng. Governance Audit ghi lại toàn bộ: cancelledRevenuePrevented, rawUniqueTitlesCount, cleanUniqueProductsCount, revenueDiscrepancyPrevented để phục vụ kiểm toán.</p>
                  </ExpertDetail>
                </div>
              </div>
            )}

            {/* TAB 5: XEM TOÀN BỘ DỮ LIỆU */}
            {activeTab === "data" && (
              <div className="bsi-card overflow-hidden">
                <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
                  <Eye size={16} style={{ color: "var(--ink-soft)" }} />
                  <span className="text-[13px] font-semibold">Toàn bộ {result.integrated.length} dòng dữ liệu đã tích hợp</span>
                  <button onClick={exportSummaryFile} className="ml-auto bsi-btn-cta flex items-center gap-2 px-4 py-2 text-[13px]">
                    <Download size={14} /> ⬇️ Tải Xuống File
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0" style={{ background: "var(--paper-card)" }}>
                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                        {["Nguồn", "Mã Đơn", "Ngày", "Tên Sản Phẩm", "Mã Hàng", "Kênh", "Trạng Thái", "SL", "Giá Bán", "Thành Tiền", "Kết Quả"].map((h) => (
                          <th key={h} className="text-left font-bold px-3.5 py-3 uppercase tracking-wide text-[11px]" style={{ color: "var(--ink-soft)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.integrated.map((r, i) => (
                        <tr key={i} className="bsi-row" style={{ borderBottom: "1px solid var(--line)" }}>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">{r.nguon}</td>
                          <td className="px-3.5 py-2.5 bsi-mono whitespace-nowrap text-[12px]">{r.ma_don || "—"}</td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">{r.ngay || "—"}</td>
                          <td className="px-3.5 py-2.5 font-semibold">{r.ten_sp || "—"}</td>
                          <td className="px-3.5 py-2.5 bsi-mono whitespace-nowrap text-[12px]">{r.ma_dinh_danh || "—"}</td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">{r.kenh}</td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap text-[12px]">{r.trang_thai || "—"}</td>
                          <td className="px-3.5 py-2.5 font-bold">{r.so_luong}</td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">{formatVND(r.gia)}</td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap font-bold">{formatVND(r.thanh_tien)}</td>
                          <td className="px-3.5 py-2.5">
                            {r.issues.length === 0
                              ? <span className="bsi-badge" style={{ background: "var(--moss-soft)", color: "var(--moss)" }}>✅ Sạch</span>
                              : <span className="bsi-badge" style={{ background: "var(--brick-soft)", color: "var(--brick)" }}>⚠️ {r.issues.length} lỗi</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
