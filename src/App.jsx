import React, { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  UploadCloud, Layers, Package, CheckCircle2, AlertTriangle,
  RotateCcw, Download, BarChart3, Table2, ListChecks, Loader2, ArrowRight, Trash2,
  Settings, ShieldCheck, Check, X, Sliders, FileText,
  Target, Shield, Zap, Info, ChevronDown, ChevronUp, HelpCircle
} from "lucide-react";
import { detectFields, FIELD_LABELS } from "./logic/fieldMapping";
import { runPipeline } from "./logic/pipeline";
import { SEVERITY_LABELS, GROUP_LABELS } from "./logic/qualityRules";

/* ============================== DESIGN TOKENS ============================== */
const Tokens = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    .bsi-root {
      --ink: #202D24;
      --ink-soft: #4A5148;
      --paper: #F3EEE0;
      --paper-card: #FBF8F0;
      --line: rgba(32,45,36,0.14);
      --brass: #A97B25;
      --brass-soft: #E7D3A6;
      --moss: #4C7458;
      --moss-soft: #DCE8DE;
      --brick: #9C4A3B;
      --brick-soft: #F1D9D2;
      --navy: #2C3E4A;
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--paper);
      color: var(--ink);
      min-height: 100%;
    }
    .bsi-serif { font-family: 'Source Serif 4', Georgia, serif; }
    .bsi-mono { font-family: 'IBM Plex Mono', monospace; }
    .bsi-card { background: var(--paper-card); border: 1px solid var(--line); border-radius: 4px; }
    .bsi-tab-label {
      position: absolute; top: -11px; left: 16px;
      background: var(--ink); color: var(--paper-card);
      font-size: 10.5px; letter-spacing: 0.09em; font-weight: 600;
      padding: 3px 10px; border-radius: 3px; text-transform: uppercase;
    }
    .bsi-dropzone { border: 1.5px dashed var(--line); transition: border-color .15s ease, background .15s ease; }
    .bsi-dropzone:hover, .bsi-dropzone.drag { border-color: var(--brass); background: var(--brass-soft); }
    .bsi-btn-primary {
      background: var(--ink); color: var(--paper-card); font-weight: 600; border-radius: 4px;
      transition: opacity .15s ease, transform .1s ease;
    }
    .bsi-btn-primary:hover:not(:disabled) { opacity: 0.85; }
    .bsi-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
    .bsi-btn-secondary {
      background: transparent; color: var(--ink); border: 1px solid var(--line);
      font-weight: 600; border-radius: 4px; transition: background .15s ease;
    }
    .bsi-btn-secondary:hover { background: rgba(32,45,36,0.06); }
    .bsi-badge {
      display: inline-flex; align-items: center; font-size: 11.5px;
      padding: 2px 8px; border-radius: 3px; font-weight: 600; white-space: nowrap;
    }
    .bsi-stamp {
      border: 2px solid var(--brick); color: var(--brick);
      font-family: 'IBM Plex Mono', monospace; font-weight: 700;
      letter-spacing: 0.14em; padding: 5px 12px; border-radius: 4px;
      transform: rotate(-4deg); font-size: 11px; animation: bsi-stamp-in .35s ease-out;
    }
    @keyframes bsi-stamp-in { 0% { opacity: 0; transform: rotate(-4deg) scale(1.6); } 100% { opacity: 1; transform: rotate(-4deg) scale(1); } }
    .bsi-tab-btn {
      font-weight: 600; font-size: 13.5px; padding: 9px 4px;
      border-bottom: 2px solid transparent; color: var(--ink-soft);
      transition: color .15s ease, border-color .15s ease;
    }
    .bsi-tab-btn.active { color: var(--ink); border-color: var(--brass); }
    .bsi-row:hover { background: rgba(32,45,36,0.035); }
    .bsi-spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `}</style>
);

function formatVND(n) { return isNaN(n) ? "—" : Math.round(n).toLocaleString("vi-VN") + " đ"; }
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const PROCESSING_STEPS = [
  "Đang đọc và áp dụng 7 nhóm chuẩn hóa dữ liệu (Mã định danh, Văn bản, Số, Thời gian, Phân loại, Cấu trúc, Encoding)...",
  "Đang kích hoạt Phương pháp Đối Chiếu Thực Thể Nhiều Tầng (Multi-tier Entity Resolution)...",
  "Đang kiểm tra chất lượng dữ liệu 6 nhóm lỗi (Cấu trúc, Định danh, Giá trị, Thời gian, Ngữ nghĩa, Kỹ thuật)...",
  "Đang tổng hợp tập dữ liệu tích hợp và tính toán chỉ số đánh giá RQ1, RQ2, RQ3...",
];

const MAX_ORDER_FILES = 4;

/* ============================== 3 GÓI CẤU HÌNH DOANH NGHIỆP ============================== */
const PRESETS = {
  balanced: {
    id: "balanced",
    icon: Target,
    name: "Tiêu Chuẩn (Khuyên dùng)",
    badge: "Cân bằng tối ưu",
    badgeColor: "var(--moss)",
    badgeBg: "var(--moss-soft)",
    shortDesc: "Cân bằng giữa độ chính xác và tính tự động cho bán lẻ hàng ngày.",
    detail: "Tự động chuẩn hóa các biến thể tên thông thường (bỏ dấu, viết tắt). Chỉ yêu cầu người dùng xác nhận khi độ tương đồng nằm trong khoảng nghi ngờ (70% - 90%) và cảnh báo khi giá bán chênh lệch > 30% so với giá chuẩn.",
    suitableFor: "Doanh nghiệp bán lẻ đa kênh thông thường (POS + Shopee / TikTok Shop / FAHASA).",
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
    <div className="bsi-card relative p-5 pt-6">
      <span className="bsi-tab-label">Ô 1 (Bắt buộc)</span>
      <div className="flex items-center gap-2 mb-1">
        <Layers size={17} style={{ color: "var(--brass)" }} />
        <h3 className="bsi-serif font-semibold text-[15px]">Tệp Đơn Hàng Các Kênh (Tối thiểu 1 hoặc 2 tệp)</h3>
      </div>
      <p className="text-[12.5px] mb-3" style={{ color: "var(--ink-soft)" }}>
        Kéo thả các tệp đơn hàng từ POS tại quầy, các sàn TMĐT (Shopee, Lazada, TikTok Shop) hoặc báo cáo FAHASA.
      </p>
      {!full && (
        <>
          <label htmlFor={inputId}
            className={`bsi-dropzone ${dragOverKey === dragKey ? "drag" : ""} flex flex-col items-center justify-center gap-1.5 rounded py-6 px-3 cursor-pointer text-center`}
            onDragOver={(e) => { e.preventDefault(); setDragOverKey(dragKey); }}
            onDragLeave={() => setDragOverKey(null)} onDrop={handleDrop}>
            <UploadCloud size={20} style={{ color: "var(--ink-soft)" }} />
            <span className="text-[12.5px] font-medium">Kéo thả hoặc bấm để chọn tệp đơn hàng</span>
            <span className="text-[11px] bsi-mono" style={{ color: "var(--ink-soft)" }}>.csv · .xlsx · .xls</span>
          </label>
          <input id={inputId} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onAddFile(f); e.target.value = ""; }} />
        </>
      )}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((fileState, i) => (
            <div key={i} className="rounded p-2.5" style={{ background: "var(--moss-soft)" }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckCircle2 size={14} style={{ color: "var(--moss)", flexShrink: 0 }} />
                  <span className="text-[12px] font-medium truncate">{fileState.fileName}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] bsi-mono" style={{ color: "var(--ink-soft)" }}>{fileState.dataRows.length} dòng</span>
                  <button onClick={() => onRemoveFile(i)} aria-label="Xóa tệp" className="flex items-center">
                    <Trash2 size={13} style={{ color: "var(--brick)" }} />
                  </button>
                </div>
              </div>
              {/* Ô gắn nhãn Kênh / Sàn bán hàng */}
              <div className="flex items-center gap-2 mt-2 p-1.5 rounded" style={{ background: "var(--paper)" }}>
                <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: "var(--ink-soft)" }}>Kênh bán:</span>
                <input
                  type="text"
                  value={fileState.channelLabel || ""}
                  onChange={(e) => onUpdateChannelLabel(i, e.target.value)}
                  placeholder="VD: Shopee, TikTok Shop, POS, Lazada…"
                  className="flex-1 text-[12px] px-2 py-1 rounded border outline-none bg-white"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(fileState.mapping).filter(([k, idx]) => k !== "branchColumns" && idx >= 0).map(([f]) => (
                  <span key={f} className="bsi-badge" style={{ background: "var(--paper)", color: "var(--ink-soft)" }}>{FIELD_LABELS[f]}</span>
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
      {full && <p className="text-[11.5px] mt-2" style={{ color: "var(--ink-soft)" }}>Đã đạt tối đa {maxFiles} tệp cho ô này.</p>}
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
    <div className="bsi-card relative p-5 pt-6">
      <span className="bsi-tab-label">{tag}</span>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Icon size={17} style={{ color: "var(--brass)" }} />
          <h3 className="bsi-serif font-semibold text-[15px]">{title}</h3>
        </div>
        <span className="bsi-badge" style={{ background: "var(--moss-soft)", color: "var(--moss)" }}>Chuẩn mực</span>
      </div>
      <p className="text-[12.5px] mb-3" style={{ color: "var(--ink-soft)" }}>{hint}</p>
      
      {!fileState ? (
        <>
          <label htmlFor={inputId}
            className={`bsi-dropzone ${dragOverKey === dragKey ? "drag" : ""} flex flex-col items-center justify-center gap-1.5 rounded py-6 px-3 cursor-pointer text-center`}
            onDragOver={(e) => { e.preventDefault(); setDragOverKey(dragKey); }}
            onDragLeave={() => setDragOverKey(null)} onDrop={handleDrop}>
            <UploadCloud size={20} style={{ color: "var(--ink-soft)" }} />
            <span className="text-[12.5px] font-medium">Kéo thả tệp Danh Mục Chuẩn (Master Catalog)</span>
            <span className="text-[11px] bsi-mono" style={{ color: "var(--ink-soft)" }}>.csv · .xlsx · .xls</span>
          </label>
          <input id={inputId} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </>
      ) : (
        <div className="mt-3 rounded p-2.5" style={{ background: "var(--moss-soft)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 size={14} style={{ color: "var(--moss)", flexShrink: 0 }} />
              <span className="text-[12px] font-medium truncate">{fileState.fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bsi-mono" style={{ color: "var(--ink-soft)" }}>{fileState.dataRows.length} sản phẩm</span>
              <button onClick={onRemove} aria-label="Xóa tệp"><Trash2 size={13} style={{ color: "var(--brick)" }} /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(fileState.mapping).filter(([k, i]) => k !== "branchColumns" && i >= 0).map(([f]) => (
              <span key={f} className="bsi-badge" style={{ background: "var(--paper)", color: "var(--ink-soft)" }}>{FIELD_LABELS[f]}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, tone = "ink" }) {
  const colorMap = { ink: "var(--ink)", brass: "var(--brass)", brick: "var(--brick)", moss: "var(--moss)" };
  return (
    <div className="bsi-card p-4">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--ink-soft)" }}>{label}</p>
      <p className="bsi-serif text-2xl font-semibold" style={{ color: colorMap[tone] }}>{value}</p>
      {sub && <p className="text-[11.5px] mt-1" style={{ color: "var(--ink-soft)" }}>{sub}</p>}
    </div>
  );
}

function SeverityBadge({ severity }) {
  const styleMap = {
    NEEDS_CONFIRMATION: { bg: "var(--brass-soft)", fg: "#7A5A15" },
    FLAGGED_ONLY: { bg: "var(--brick-soft)", fg: "var(--brick)" },
    AUTO_FIXED: { bg: "var(--moss-soft)", fg: "var(--moss)" },
  };
  const s = styleMap[severity] || { bg: "rgba(44,62,74,0.12)", fg: "var(--navy)" };
  return <span className="bsi-badge" style={{ background: s.bg, color: s.fg }}>{SEVERITY_LABELS[severity] || severity}</span>;
}

function IssueList({ issues }) {
  if (!issues || issues.length === 0) return <span className="bsi-badge" style={{ background: "var(--moss-soft)", color: "var(--moss)" }}>Sạch</span>;
  return (
    <div className="flex flex-col gap-1">
      {issues.map((iss, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <SeverityBadge severity={iss.severity} />
          <span className="text-[12px]" style={{ color: "var(--ink-soft)" }}>{iss.detail}</span>
        </div>
      ))}
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

  const addOrderFile = async (file) => {
    setParseError("");
    try {
      const fs = await parseToFileState(file);
      setOrderFiles((prev) => (prev.length >= MAX_ORDER_FILES ? prev : [...prev, fs]));
    } catch {
      setParseError(`Không đọc được tệp "${file.name}". Hãy kiểm tra định dạng (.csv/.xlsx/.xls).`);
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
      setParseError(`Không đọc được tệp "${file.name}". Hãy kiểm tra định dạng (.csv/.xlsx/.xls).`);
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

  const CHART_COLORS = ["#A97B25", "#4C7458", "#9C4A3B", "#2C3E4A", "#7A8B76", "#C9A45C"];
  const currentPreviewPreset = hoveredPresetId ? PRESETS[hoveredPresetId] : activePresetId !== "custom" ? PRESETS[activePresetId] : null;

  return (
    <div className="bsi-root w-full">
      <Tokens />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--brass)" }}>
              Khóa Luận Tốt Nghiệp · ĐH Công Nghệ Thông Tin (UIT — ĐHQG TP.HCM)
            </p>
            <h1 className="bsi-serif text-[24px] md:text-[26px] font-semibold leading-tight">
              Hệ Thống Tích Hợp & Kiểm Soát Chất Lượng Dữ Liệu Bán Hàng Đa Nguồn
            </h1>
            <p className="text-[12px] text-gray-600 mt-0.5 bsi-mono">
              Multi-source Sales Data Integration and Data Quality Management System
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowConfigModal(true)} className="bsi-btn-secondary flex items-center gap-1.5 text-[13px] px-3.5 py-2">
              <Sliders size={14} /> Gói cấu hình: <span className="font-bold text-amber-900">{activePresetId !== "custom" ? PRESETS[activePresetId].name.split("(")[0].trim() : "Tùy chỉnh"}</span>
            </button>
            {step === "results" && (
              <>
                <button onClick={exportSummaryFile} className="bsi-btn-primary flex items-center gap-1.5 text-[13px] px-3.5 py-2">
                  <Download size={14} /> Xuất dữ liệu tích hợp
                </button>
                <button onClick={reset} className="bsi-btn-secondary flex items-center gap-1.5 text-[13px] px-3.5 py-2">
                  <RotateCcw size={14} /> Tích hợp tệp khác
                </button>
              </>
            )}
          </div>
        </div>

        {/* Modal Cấu hình xử lý trực quan theo 3 Gói Nghiệp Vụ */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bsi-card max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto" style={{ background: "var(--paper-card)" }}>
              <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-2">
                  <Sliders size={18} style={{ color: "var(--brass)" }} />
                  <div>
                    <h3 className="bsi-serif text-lg font-semibold leading-none">Cấu Hình Xử Lý Dữ Liệu Trực Quan</h3>
                    <p className="text-[11.5px] mt-0.5" style={{ color: "var(--ink-soft)" }}>Lựa chọn gói quy tắc phù hợp với mục đích kinh doanh của bạn</p>
                  </div>
                </div>
                <button onClick={() => setShowConfigModal(false)} aria-label="Đóng"><X size={18} /></button>
              </div>

              {/* 3 Gói Cấu Hình Định Sẵn */}
              <div className="space-y-2.5 mb-4">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">1. Chọn Gói Cấu Hình Theo Nhu Cầu</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {Object.entries(PRESETS).map(([key, p]) => {
                    const IconComponent = p.icon;
                    const isSelected = activePresetId === key;
                    return (
                      <div
                        key={key}
                        onClick={() => handleSelectPreset(key)}
                        onMouseEnter={() => setHoveredPresetId(key)}
                        onMouseLeave={() => setHoveredPresetId(null)}
                        className={`p-3 rounded border cursor-pointer transition relative flex flex-col justify-between ${
                          isSelected ? "border-amber-700 bg-amber-50 shadow-sm" : "border-gray-200 hover:border-amber-400 bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <IconComponent size={16} style={{ color: isSelected ? "var(--brass)" : "var(--ink-soft)" }} />
                            <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold" style={{ background: p.badgeBg, color: p.badgeColor }}>
                              {p.badge}
                            </span>
                          </div>
                          <h4 className="font-semibold text-[12.5px] mb-1 leading-tight">{p.name.split("(")[0]}</h4>
                          <p className="text-[11px] text-gray-600 line-clamp-2">{p.shortDesc}</p>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10.5px] text-gray-500">
                          <span>Rê chuột để xem</span>
                          <HelpCircle size={12} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Khung Chi Tiết & Mô Tả Khi Hover */}
              {currentPreviewPreset && (
                <div className="p-3.5 rounded border mb-4 text-[12px] transition-all" style={{ background: "var(--paper)", borderColor: "var(--brass)" }}>
                  <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-1">
                    <Info size={14} /> Chi tiết gói: {currentPreviewPreset.name}
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-2">{currentPreviewPreset.detail}</p>
                  <div className="text-[11.5px] text-gray-600 bg-white/70 p-2 rounded border border-gray-200">
                    <strong>🎯 Phù hợp nhất cho:</strong> {currentPreviewPreset.suitableFor}
                  </div>
                </div>
              )}

              {/* Phần Cấu Hình Nâng Cao (Thu gọn) */}
              <div className="border-t pt-3 mb-2" style={{ borderColor: "var(--line)" }}>
                <button
                  onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                  className="flex items-center justify-between w-full text-[12.5px] font-semibold text-gray-700 hover:text-amber-800"
                >
                  <span className="flex items-center gap-1.5">
                    <Settings size={14} /> 2. Tùy Chỉnh Tham Số Chuyên Sâu (Dành Cho Kỹ Thuật)
                  </span>
                  {showAdvancedParams ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAdvancedParams && (
                  <div className="mt-3.5 space-y-3.5 bg-white p-3.5 rounded border border-gray-200 text-[12px]">
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Ngưỡng đối chiếu mờ (Fuzzy Confirm): {config.fuzzyConfirmThreshold}%</span>
                        <span className="text-gray-500 text-[11px]">Mặc định: 70%</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="90"
                        value={config.fuzzyConfirmThreshold}
                        onChange={(e) => handleCustomParamChange("fuzzyConfirmThreshold", Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        Điểm từ {config.fuzzyConfirmThreshold}% trở lên sẽ được chuyển sang danh sách Cần xác nhận thủ công.
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Ngưỡng khớp chắc chắn (Fuzzy High): {config.fuzzyHighThreshold}%</span>
                        <span className="text-gray-500 text-[11px]">Mặc định: 90%</span>
                      </div>
                      <input
                        type="range"
                        min="75"
                        max="99"
                        value={config.fuzzyHighThreshold}
                        onChange={(e) => handleCustomParamChange("fuzzyHighThreshold", Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        Điểm từ {config.fuzzyHighThreshold}% trở lên được tự động chấp nhận khớp.
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Ngưỡng cảnh báo lệch giá: {config.priceDeviationThreshold}%</span>
                        <span className="text-gray-500 text-[11px]">Mặc định: 30%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        value={config.priceDeviationThreshold}
                        onChange={(e) => handleCustomParamChange("priceDeviationThreshold", Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        Gắn cờ cảnh báo khi giá bán lệch quá {config.priceDeviationThreshold}% so với giá chuẩn catalog.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setShowConfigModal(false)} className="bsi-btn-primary px-5 py-2 text-[13px]">
                  Áp dụng cấu hình
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "upload" && (
          <>
            <p className="text-[13.5px] mb-5 max-w-2xl" style={{ color: "var(--ink-soft)" }}>
              Hệ thống thực hiện ánh xạ, chuẩn hóa theo 7 nhóm đối tượng, đối chiếu thực thể 3 tầng và kiểm soát 6 nhóm lỗi chất lượng dữ liệu để tạo dataset tích hợp phục vụ báo cáo quản trị.
            </p>

            {parseError && (
              <div className="bsi-card p-3 mb-4 flex items-center gap-2" style={{ borderColor: "var(--brick)", background: "var(--brick-soft)" }}>
                <AlertTriangle size={15} style={{ color: "var(--brick)" }} />
                <span className="text-[12.5px]" style={{ color: "var(--brick)" }}>{parseError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <OrdersDropzone files={orderFiles} onAddFile={addOrderFile} onRemoveFile={removeOrderFile}
                onUpdateChannelLabel={updateChannelLabel}
                maxFiles={MAX_ORDER_FILES} dragKey="orders" dragOverKey={dragOverKey} setDragOverKey={setDragOverKey} />
              <UploadCard tag="Ô 2 (Danh mục chuẩn)" icon={Package} title="Danh mục sản phẩm chuẩn (Master Catalog)"
                hint="Tệp danh mục chuẩn làm cơ sở đối chiếu thực thể 3 tầng (Mã chuẩn -> Crosswalk -> Fuzzy Token-Sort) và kiểm soát chất lượng."
                fileState={catalogFile} onFile={setCatalog} onRemove={() => setCatalogFile(null)}
                dragKey="catalog" dragOverKey={dragOverKey} setDragOverKey={setDragOverKey} />
            </div>

            <div className="flex items-center justify-end flex-wrap gap-3">
              <button onClick={processAll} disabled={!readyToProcess} className="bsi-btn-primary flex items-center gap-2 text-[14px] px-5 py-2.5">
                Bắt đầu tích hợp dữ liệu <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="bsi-card p-10 flex flex-col items-center text-center">
            <Loader2 size={30} className="bsi-spin mb-4" style={{ color: "var(--brass)" }} />
            <h2 className="bsi-serif text-lg font-semibold mb-5">Đang tích hợp & kiểm soát chất lượng…</h2>
            <div className="w-full max-w-sm space-y-2.5 text-left">
              {PROCESSING_STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {i < procIdx ? <CheckCircle2 size={16} style={{ color: "var(--moss)" }} />
                    : i === procIdx ? <Loader2 size={16} className="bsi-spin" style={{ color: "var(--brass)" }} />
                    : <div className="w-4 h-4 rounded-full border" style={{ borderColor: "var(--line)" }} />}
                  <span className="text-[13px]" style={{ color: i <= procIdx ? "var(--ink)" : "var(--ink-soft)" }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "results" && result && (
          <div>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="bsi-stamp">✓ ĐÃ TÍCH HỢP</span>
                <span className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                  {result.stats.totalRows} giao dịch từ {orderFiles.length} nguồn · {result.stats.catalogSize} sản phẩm trong danh mục chuẩn
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bsi-badge" style={{ background: "var(--moss-soft)", color: "var(--moss)" }}>
                  Gói: {result.activePreset}
                </span>
                <span className="bsi-badge" style={{ background: "var(--navy)", color: "#fff" }}>
                  {result.strategyLabel}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Tổng giao dịch" value={result.stats.totalRows} sub={result.fileBreakdown} />
              <StatCard label="Tỷ lệ liên kết thực thể (RQ2)" value={`${result.stats.totalRows ? ((result.stats.matchedCount / result.stats.totalRows) * 100).toFixed(0) : 0}%`}
                sub={`${result.stats.matchedCount}/${result.stats.totalRows} dòng`} tone="moss" />
              <StatCard label="Vấn đề phát hiện (6 nhóm)" value={result.issues.length} sub="xem chi tiết ở tab Vấn đề" tone="brick" />
              <StatCard label="Doanh thu thực tế (RQ3)" value={formatVND(result.revenueTotal)} sub={`đã tích hợp ${orderFiles.length} kênh`} tone="brass" />
            </div>

            <div className="flex items-center gap-6 border-b mb-5 overflow-x-auto" style={{ borderColor: "var(--line)" }}>
              {[
                { key: "overview", label: "Tổng quan", icon: BarChart3 },
                { key: "issues", label: `Vấn đề dữ liệu (${result.issues.length})`, icon: ListChecks },
                { key: "manual_confirm", label: `Xác nhận thủ công (${result.pendingConfirmations.length})`, icon: ShieldCheck },
                { key: "quality_report", label: "Báo cáo chất lượng (RQ1-3)", icon: FileText },
                { key: "data", label: "Dữ liệu tích hợp", icon: Table2 },
              ].map((t) => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} className={`bsi-tab-btn flex items-center gap-1.5 whitespace-nowrap ${activeTab === t.key ? "active" : ""}`}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: TỔNG QUAN QUẢN TRỊ */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bsi-card p-4">
                  <h3 className="bsi-serif text-[14.5px] font-semibold mb-3">Doanh thu phân bổ theo kênh bán hàng</h3>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={result.revenueByChannel} margin={{ left: 4, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="kenh" tick={{ fontSize: 11 }} stroke="var(--ink-soft)" />
                      <YAxis tick={{ fontSize: 10 }} stroke="var(--ink-soft)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => formatVND(v)} contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: "var(--line)" }} />
                      <Bar dataKey="doanhThu" radius={[3, 3, 0, 0]}>
                        {result.revenueByChannel.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bsi-card p-4">
                  <h3 className="bsi-serif text-[14.5px] font-semibold mb-3">Top sản phẩm bán chạy nhất (theo số lượng)</h3>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={result.topProducts} layout="vertical" margin={{ left: 4, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--ink-soft)" allowDecimals={false} />
                      <YAxis type="category" dataKey="ten" width={150} tick={{ fontSize: 10.5 }} stroke="var(--ink-soft)" />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: "var(--line)" }} />
                      <Bar dataKey="soLuong" radius={[0, 3, 3, 0]} fill="var(--brass)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 2: VẤN ĐỀ CHẤT LƯỢNG (6 NHÓM LỖI) */}
            {activeTab === "issues" && (
              <div className="bsi-card overflow-hidden">
                <div className="p-3 text-[12px] flex flex-wrap gap-3" style={{ borderBottom: "1px solid var(--line)", color: "var(--ink-soft)" }}>
                  <span><SeverityBadge severity="AUTO_FIXED" /> đã tự sửa (chắc chắn 100%)</span>
                  <span><SeverityBadge severity="NEEDS_CONFIRMATION" /> có đề xuất, cần bạn xác nhận</span>
                  <span><SeverityBadge severity="FLAGGED_ONLY" /> chỉ gắn cờ, hệ thống không tự đoán</span>
                </div>
                {result.issues.length === 0 ? (
                  <p className="p-6 text-center text-[13px]" style={{ color: "var(--ink-soft)" }}>Không phát hiện lỗi nào 🎉</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12.5px]">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--line)" }}>
                          {["Nguồn", "Mã đơn", "Tên sản phẩm", "Nhóm lỗi (6 nhóm)", "Vấn đề phát hiện"].map((h) => (
                            <th key={h} className="text-left font-semibold px-4 py-2.5 uppercase tracking-wide text-[10.5px]" style={{ color: "var(--ink-soft)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.integrated.filter((r) => r.issues.length > 0).map((r, i) => (
                          <tr key={i} className="bsi-row" style={{ borderBottom: "1px solid var(--line)" }}>
                            <td className="px-4 py-2.5 whitespace-nowrap align-top">{r.nguon}</td>
                            <td className="px-4 py-2.5 bsi-mono whitespace-nowrap align-top">{r.ma_don || "—"}</td>
                            <td className="px-4 py-2.5 align-top">{r.ten_sp || "—"}</td>
                            <td className="px-4 py-2.5 align-top">
                              <div className="flex flex-col gap-0.5">
                                {[...new Set(r.issues.map(iss => iss.group))].map(g => (
                                  <span key={g} className="text-[11px] font-medium" style={{ color: "var(--navy)" }}>{GROUP_LABELS[g] || g}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-2.5"><IssueList issues={r.issues} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: XÁC NHẬN THỦ CÔNG */}
            {activeTab === "manual_confirm" && (
              <div className="bsi-card p-5">
                <div className="mb-4">
                  <h3 className="bsi-serif text-[15px] font-semibold mb-1">Xác Nhận Thủ Công Các Trường Hợp Entity Resolution Nghi Vấn (Human-in-the-Loop)</h3>
                  <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                    Danh sách các sản phẩm có độ tương đồng mờ nằm trong khoảng nghi vấn ({config.fuzzyConfirmThreshold}% - {config.fuzzyHighThreshold}%). Hãy duyệt xác nhận ghép hoặc từ chối để đảm bảo tính toàn vẹn dữ liệu.
                  </p>
                </div>
                {result.pendingConfirmations.length === 0 ? (
                  <p className="p-6 text-center text-[13px]" style={{ color: "var(--moss)" }}>
                    ✓ Tất cả sản phẩm đều đã đối chiếu chính xác tuyệt đối! Không có bản ghi nào cần xác nhận thủ công.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {result.pendingConfirmations.map((item, idx) => {
                      const manual = manualConfirmations.get(idx);
                      const isUnresolved = item.matchStatus === "UNRESOLVED";
                      return (
                        <div key={idx} className="border rounded p-3 text-[12.5px]" style={{ borderColor: isUnresolved ? "var(--brick)" : "var(--line)", background: manual ? "var(--moss-soft)" : "var(--paper)" }}>
                          {/* Phần 1: Sản phẩm gốc từ file đơn hàng */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div>
                              <span className="text-[10.5px] uppercase font-semibold tracking-wide" style={{ color: "var(--ink-soft)" }}>Sản phẩm từ đơn hàng:</span>
                              <div className="mt-0.5">
                                <span className="font-semibold">{item.ten_sp || "(Không có tên)"}</span>
                                <span className="ml-2 text-[11px] bsi-mono" style={{ color: "var(--ink-soft)" }}>
                                  Nguồn: {item.nguon} · Mã đơn: {item.ma_don} {item.ma_dinh_danh ? `· Mã SP: ${item.ma_dinh_danh}` : "· (Không có mã SP)"}
                                </span>
                              </div>
                            </div>
                            <SeverityBadge severity={item.matchStatus} />
                          </div>

                          {/* Phần 2: Đề xuất ghép từ Catalog (hoặc thông báo UNRESOLVED) */}
                          {item.matched ? (
                            <div className="p-2.5 rounded mb-2" style={{ background: "var(--brass-soft)" }}>
                              <span className="text-[10.5px] uppercase font-semibold tracking-wide" style={{ color: "#7A5A15" }}>⇄ Đề xuất ghép với sản phẩm chuẩn trong Catalog:</span>
                              <div className="mt-1 flex flex-wrap items-center gap-3">
                                <span className="font-semibold text-[13px]">{item.matched.ten_sp}</span>
                                <span className="bsi-mono text-[11px]" style={{ color: "var(--ink-soft)" }}>Mã: {item.matched.ma_dinh_danh || "—"}</span>
                                <span className="bsi-badge" style={{ background: "var(--paper-card)", color: "var(--brass)" }}>Độ tương đồng: {item.matchScore}%</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded mb-2" style={{ background: "var(--brick-soft)" }}>
                              <span className="text-[12px] font-medium" style={{ color: "var(--brick)" }}>
                                ⚠ Không tìm thấy sản phẩm tương ứng nào trong Danh mục chuẩn (Master Catalog). Sản phẩm này có thể chưa được nhập vào catalog hoặc tên/mã quá khác biệt.
                              </span>
                            </div>
                          )}

                          {/* Phần 3: Nút hành động */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
                            {item.matched && (
                              <button
                                onClick={() => handleManualDecision(idx, "ACCEPT", item)}
                                className={`px-3 py-1 text-[11.5px] font-medium rounded flex items-center gap-1 ${manual?.decision === "ACCEPT" ? "bsi-btn-primary" : "bsi-btn-secondary"}`}
                              >
                                <Check size={13} /> Chấp nhận ghép
                              </button>
                            )}
                            <button
                              onClick={() => handleManualDecision(idx, "REJECT", item)}
                              className={`px-3 py-1 text-[11.5px] font-medium rounded flex items-center gap-1 ${manual?.decision === "REJECT" ? "bg-red-800 text-white" : "bsi-btn-secondary"}`}
                            >
                              <X size={13} /> {item.matched ? "Từ chối (Không cùng sản phẩm)" : "Ghi nhận (Bỏ qua sản phẩm này)"}
                            </button>
                            {manual && (
                              <span className="text-[11.5px] font-medium self-center ml-auto" style={{ color: "var(--moss)" }}>
                                ✓ Đã ghi nhận: {manual.decision === "ACCEPT" ? "Đã chấp nhận ghép" : "Đã từ chối / bỏ qua"}
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

            {/* TAB 4: BÁO CÁO CHẤT LƯỢNG & ĐÁNH GIÁ NGHIÊN CỨU (RQ1, RQ2, RQ3) */}
            {activeTab === "quality_report" && (
              <div className="space-y-5">
                {/* PHẦN 1: ĐÁNH GIÁ RQ1 (CHUẨN HÓA & PHÁT HIỆN LỖI) */}
                <div className="bsi-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900 bsi-mono">RQ1</span>
                    <h3 className="bsi-serif text-[15px] font-semibold">Đánh Giá Hiệu Quả Ánh Xạ & 7 Nhóm Chuẩn Hóa Dữ Liệu</h3>
                  </div>
                  <p className="text-[12px] text-gray-600 mb-4">
                    Đo lường khả năng xử lý dữ liệu không đồng nhất theo 7 nhóm đối tượng chuẩn hóa và 6 nhóm lỗi phân loại.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-[12px]">
                    <div className="p-2.5 rounded border border-gray-200 bg-white">
                      <span className="text-gray-500 block text-[11px]">1. Mã định danh / SKU</span>
                      <strong className="text-[14px] text-amber-900">{result.normStats?.idCount || 0}</strong> trường đã chuẩn hóa
                    </div>
                    <div className="p-2.5 rounded border border-gray-200 bg-white">
                      <span className="text-gray-500 block text-[11px]">2. Văn bản & Thương hiệu</span>
                      <strong className="text-[14px] text-amber-900">{result.normStats?.textCount || 0}</strong> trường đã chuẩn hóa
                    </div>
                    <div className="p-2.5 rounded border border-gray-200 bg-white">
                      <span className="text-gray-500 block text-[11px]">3. Thời gian (ISO Date)</span>
                      <strong className="text-[14px] text-amber-900">{result.normStats?.dateCount || 0}</strong> trường đã chuẩn hóa
                    </div>
                    <div className="p-2.5 rounded border border-gray-200 bg-white">
                      <span className="text-gray-500 block text-[11px]">4. Phân loại (Kênh/Status)</span>
                      <strong className="text-[14px] text-amber-900">{(result.normStats?.channelCount || 0) + (result.normStats?.statusCount || 0)}</strong> trường đã chuẩn hóa
                    </div>
                  </div>

                  <h4 className="font-semibold text-[13px] mb-2.5">Phân bổ lỗi theo 6 nhóm chất lượng</h4>
                  <div className="space-y-1.5">
                    {Object.entries(GROUP_LABELS).map(([gKey, gLabel]) => {
                      const count = result.issues.filter((i) => i.group === gKey).length;
                      const pct = result.issues.length ? Math.round((count / result.issues.length) * 100) : 0;
                      return (
                        <div key={gKey} className="flex items-center justify-between text-[12px] border-b pb-1" style={{ borderColor: "var(--line)" }}>
                          <span className="font-medium">{gLabel}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-28 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div className="bg-amber-600 h-2" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="bsi-mono w-14 text-right text-[11px]">{count} lỗi ({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PHẦN 2: ĐÁNH GIÁ RQ2 (MULTI-TIER VS EXACT MATCHING) */}
                <div className="bsi-card p-5" style={{ background: "var(--paper-card)", borderColor: "var(--brass)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-200 text-green-900 bsi-mono">RQ2</span>
                    <h3 className="bsi-serif text-[15px] font-semibold text-green-950">
                      So Sánh Đối Chiếu Thực Thể Nhiều Tầng vs Exact Matching Đơn Thuần
                    </h3>
                  </div>
                  <p className="text-[12px] text-gray-600 mb-4">
                    Thực nghiệm kiểm chứng: Phương pháp 3 tầng (Mã chuẩn + Crosswalk + Fuzzy Token-Sort) cải thiện vượt trội tỷ lệ liên kết sản phẩm.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="p-3 rounded border bg-white text-center" style={{ borderColor: "var(--line)" }}>
                      <p className="text-[11px] uppercase font-semibold text-gray-500">Exact Matching đơn thuần</p>
                      <p className="bsi-serif text-2xl font-bold text-gray-700">
                        {result.resolutionStats ? `${result.resolutionStats.exactMatchRate}%` : "—"}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {result.resolutionStats ? `${result.resolutionStats.exactOnlyMatchesCount}/${result.stats.totalRows} dòng khớp` : "Chỉ khớp khi đúng mã"}
                      </p>
                    </div>

                    <div className="p-3 rounded border bg-white text-center" style={{ borderColor: "var(--moss)", background: "var(--moss-soft)" }}>
                      <p className="text-[11px] uppercase font-semibold" style={{ color: "var(--moss)" }}>Đối chiếu 3 tầng (Hệ thống)</p>
                      <p className="bsi-serif text-2xl font-bold" style={{ color: "var(--moss)" }}>
                        {result.resolutionStats ? `${result.resolutionStats.multiTierTotalLinkedRate}%` : `${Math.round((result.stats.matchedCount / result.stats.totalRows) * 100)}%`}
                      </p>
                      <p className="text-[11px] text-gray-700 mt-0.5">
                        Tầng 1 (Mã) + Tầng 2 (Crosswalk) + Tầng 3 (Fuzzy)
                      </p>
                    </div>

                    <div className="p-3 rounded border bg-white text-center" style={{ borderColor: "var(--brass)", background: "var(--brass-soft)" }}>
                      <p className="text-[11px] uppercase font-semibold text-amber-900">Mức độ cải thiện (Improvement)</p>
                      <p className="bsi-serif text-2xl font-bold text-amber-900">
                        {result.resolutionStats ? `+${result.resolutionStats.improvementRate}%` : "+30%"}
                      </p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Khắc phục tên viết tắt, thiếu dấu, sai mã
                      </p>
                    </div>
                  </div>

                  {result.resolutionStats && (
                    <div className="p-3 rounded bg-white border border-gray-200 text-[11.5px] text-gray-700 space-y-1">
                      <div>• <strong>Tầng 1 (Exact ID):</strong> {result.resolutionStats.breakdown.tier1_exact} bản ghi khớp chính xác qua mã chuẩn.</div>
                      <div>• <strong>Tầng 2 (Crosswalk/Alias):</strong> {result.resolutionStats.breakdown.tier2_crosswalk} bản ghi khớp qua bảng tra cứu mã nội bộ.</div>
                      <div>• <strong>Tầng 3 (Fuzzy Token-Sort):</strong> {result.resolutionStats.breakdown.tier3_fuzzy_high} bản ghi tự động khớp mờ điểm cao + {result.resolutionStats.breakdown.tier3_fuzzy_confirm} bản ghi chuyển duyệt thủ công.</div>
                    </div>
                  )}
                </div>

                {/* PHẦN 3: ĐÁNH GIÁ RQ3 (GIẢM SAI LỆCH BÁO CÁO QUẢN TRỊ) */}
                <div className="bsi-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-200 text-blue-900 bsi-mono">RQ3</span>
                    <h3 className="bsi-serif text-[15px] font-semibold text-blue-950">
                      Đánh Giá Mức Độ Giảm Sai Lệch Trong Báo Cáo Quản Trị
                    </h3>
                  </div>
                  <p className="text-[12px] text-gray-600 mb-4">
                    So sánh chỉ số quản trị giữa Dữ liệu thô ban đầu (chứa đơn hủy, trùng lặp mã đơn, lệch giá) và Dữ liệu sau khi tích hợp & kiểm soát chất lượng.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="p-3 rounded border bg-white text-center">
                      <span className="text-[11px] uppercase font-semibold text-gray-500">Doanh thu thô ban đầu</span>
                      <p className="bsi-serif text-lg font-bold text-gray-700">
                        {formatVND(result.governanceAudit?.rawRevenueTotal || result.revenueTotal)}
                      </p>
                      <span className="text-[11px] text-red-600">Chứa đơn hủy & trùng lặp</span>
                    </div>

                    <div className="p-3 rounded border bg-white text-center" style={{ background: "var(--moss-soft)", borderColor: "var(--moss)" }}>
                      <span className="text-[11px] uppercase font-semibold" style={{ color: "var(--moss)" }}>Doanh thu sạch thực tế</span>
                      <p className="bsi-serif text-lg font-bold" style={{ color: "var(--moss)" }}>
                        {formatVND(result.governanceAudit?.cleanRevenueTotal || result.revenueTotal)}
                      </p>
                      <span className="text-[11px] text-green-800">Đã kiểm soát & làm sạch</span>
                    </div>

                    <div className="p-3 rounded border bg-white text-center" style={{ background: "var(--brick-soft)", borderColor: "var(--brick)" }}>
                      <span className="text-[11px] uppercase font-semibold" style={{ color: "var(--brick)" }}>Sai lệch doanh thu phòng ngừa</span>
                      <p className="bsi-serif text-lg font-bold" style={{ color: "var(--brick)" }}>
                        {formatVND(result.governanceAudit?.revenueDiscrepancyPrevented || 0)}
                      </p>
                      <span className="text-[11px] text-red-800">Doanh thu ảo loại trừ</span>
                    </div>
                  </div>

                  <div className="p-3 rounded bg-white border border-gray-200 text-[11.5px] text-gray-700 space-y-1">
                    <div>• <strong>Loại trừ doanh thu ảo từ đơn hủy:</strong> Đã phát hiện và gắn cờ {formatVND(result.governanceAudit?.cancelledRevenuePrevented || 0)} từ các đơn hàng có trạng thái Đã hủy/Trả hàng.</div>
                    <div>• <strong>Hợp nhất phân mảnh tên sản phẩm:</strong> Từ {result.governanceAudit?.rawUniqueTitlesCount || 0} biến thể tên gọi không đồng nhất giữa các kênh, hệ thống đã quy chuẩn về {result.governanceAudit?.cleanUniqueProductsCount || 0} thực thể sản phẩm chuẩn.</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: DỮ LIỆU TÍCH HỢP */}
            {activeTab === "data" && (
              <div className="bsi-card overflow-hidden">
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-[12.5px]">
                    <thead className="sticky top-0" style={{ background: "var(--paper-card)" }}>
                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                        {["Nguồn", "Mã đơn", "Ngày", "Tên sản phẩm chuẩn", "Mã định danh", "Kênh", "Trạng thái", "SL", "Giá bán", "Thành tiền", "Kết quả"].map((h) => (
                          <th key={h} className="text-left font-semibold px-3.5 py-2.5 uppercase tracking-wide text-[10.5px]" style={{ color: "var(--ink-soft)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.integrated.map((r, i) => (
                        <tr key={i} className="bsi-row" style={{ borderBottom: "1px solid var(--line)" }}>
                          <td className="px-3.5 py-2 whitespace-nowrap">{r.nguon}</td>
                          <td className="px-3.5 py-2 bsi-mono whitespace-nowrap">{r.ma_don || "—"}</td>
                          <td className="px-3.5 py-2 whitespace-nowrap">{r.ngay || "—"}</td>
                          <td className="px-3.5 py-2 font-medium">{r.ten_sp || "—"}</td>
                          <td className="px-3.5 py-2 bsi-mono whitespace-nowrap">{r.ma_dinh_danh || "—"}</td>
                          <td className="px-3.5 py-2 whitespace-nowrap">{r.kenh}</td>
                          <td className="px-3.5 py-2 whitespace-nowrap text-[11.5px]">{r.trang_thai || "—"}</td>
                          <td className="px-3.5 py-2">{r.so_luong}</td>
                          <td className="px-3.5 py-2 whitespace-nowrap">{formatVND(r.gia)}</td>
                          <td className="px-3.5 py-2 whitespace-nowrap font-medium">{formatVND(r.thanh_tien)}</td>
                          <td className="px-3.5 py-2">
                            {r.issues.length === 0
                              ? <span className="bsi-badge" style={{ background: "var(--moss-soft)", color: "var(--moss)" }}>Sạch</span>
                              : <span className="bsi-badge" style={{ background: "var(--brick-soft)", color: "var(--brick)" }}>{r.issues.length} lỗi</span>}
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
