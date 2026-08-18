import React, { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  UploadCloud, Layers, Package, CheckCircle2, AlertTriangle,
  RotateCcw, Download, BarChart3, Table2, ListChecks, Loader2, ArrowRight, Trash2,
  Settings, ShieldCheck, Check, X, Sliders, FileText, Sparkles, Database, BookmarkCheck
} from "lucide-react";
import { detectFields, FIELD_LABELS } from "./logic/fieldMapping";
import { runPipeline } from "./logic/pipeline";
import { SEVERITY_LABELS, GROUP_LABELS } from "./logic/qualityRules";
import {
  saveProgressiveCrosswalkPair,
  getProgressiveCrosswalk,
  clearProgressiveCrosswalk,
} from "./logic/bipartiteMatching";

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
  "Đang đọc và chuẩn hóa dữ liệu từ các tệp đơn hàng (Mã đơn, Kênh, Trạng thái, Thương hiệu, Ngày)...",
  "Đang kích hoạt Cơ chế Ghép cặp tối ưu toàn cục (Bipartite Matching) & Đối chiếu Crosswalk...",
  "Đang kiểm tra chất lượng dữ liệu 6 nhóm lỗi (Schema, Entity, Value, Temporal, Semantic, Technical)...",
  "Đang tổng hợp dữ liệu tích hợp và báo cáo chất lượng quản trị...",
];

const MAX_ORDER_FILES = 4;

/* ============================== UI SUBCOMPONENTS ============================== */
function OrdersDropzone({ files, onAddFile, onRemoveFile, maxFiles, dragKey, dragOverKey, setDragOverKey }) {
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
        Kéo thả 2 hoặc nhiều tệp đơn hàng từ POS tại quầy và các sàn TMĐT (Shopee, Lazada, TikTok Shop).
      </p>
      {!full && (
        <>
          <label htmlFor={inputId}
            className={`bsi-dropzone ${dragOverKey === dragKey ? "drag" : ""} flex flex-col items-center justify-center gap-1.5 rounded py-6 px-3 cursor-pointer text-center`}
            onDragOver={(e) => { e.preventDefault(); setDragOverKey(dragKey); }}
            onDragLeave={() => setDragOverKey(null)} onDrop={handleDrop}>
            <UploadCloud size={20} style={{ color: "var(--ink-soft)" }} />
            <span className="text-[12.5px] font-medium">Kéo thả hoặc bấm để chọn tệp</span>
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
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(fileState.mapping).filter(([, idx]) => idx >= 0).map(([f]) => (
                  <span key={f} className="bsi-badge" style={{ background: "var(--paper)", color: "var(--ink-soft)" }}>{FIELD_LABELS[f]}</span>
                ))}
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
        <span className="bsi-badge" style={{ background: "var(--brass-soft)", color: "#7A5A15" }}>Tùy chọn</span>
      </div>
      <p className="text-[12.5px] mb-3" style={{ color: "var(--ink-soft)" }}>{hint}</p>
      
      {!fileState ? (
        <>
          <label htmlFor={inputId}
            className={`bsi-dropzone ${dragOverKey === dragKey ? "drag" : ""} flex flex-col items-center justify-center gap-1.5 rounded py-6 px-3 cursor-pointer text-center`}
            onDragOver={(e) => { e.preventDefault(); setDragOverKey(dragKey); }}
            onDragLeave={() => setDragOverKey(null)} onDrop={handleDrop}>
            <UploadCloud size={20} style={{ color: "var(--ink-soft)" }} />
            <span className="text-[12.5px] font-medium">Kéo thả nếu có (Không bắt buộc)</span>
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
              <span className="text-[11px] bsi-mono" style={{ color: "var(--ink-soft)" }}>{fileState.dataRows.length} dòng</span>
              <button onClick={onRemove} aria-label="Xóa tệp"><Trash2 size={13} style={{ color: "var(--brick)" }} /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(fileState.mapping).filter(([, i]) => i >= 0).map(([f]) => (
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

  // Cơ chế chọn khi không có file chuẩn: 'bipartite' (Cơ chế 3 & 4 - Mặc định) | 'master_source' (Cơ chế 1)
  const [noCatalogMode, setNoCatalogMode] = useState("bipartite");
  const [selectedMasterSourceIdx, setSelectedMasterSourceIdx] = useState(0);

  // Progressive Crosswalk & Manual Confirmations
  const [manualConfirmations, setManualConfirmations] = useState(new Map());
  const [crosswalkCount, setCrosswalkCount] = useState(0);

  // Configuration settings (Mở rộng 3)
  const [config, setConfig] = useState({
    fuzzyConfirmThreshold: 70,
    fuzzyHighThreshold: 90,
    priceDeviationThreshold: 30,
    autoNormalizeChannels: true,
    autoNormalizeStatus: true,
  });

  useEffect(() => {
    setCrosswalkCount(getProgressiveCrosswalk().length);
  }, []);

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

  // Sẵn sàng xử lý nếu có ít nhất 1 file đơn hàng
  const readyToProcess = orderFiles.length > 0 && orderFiles.every((f) => f.dataRows.length > 0);

  const processAll = async () => {
    setStep("processing"); setProcIdx(0);
    await delay(400); setProcIdx(1);
    await delay(500); setProcIdx(2);
    await delay(500);

    const pipelineOptions = {
      fuzzyHighThreshold: config.fuzzyHighThreshold,
      fuzzyConfirmThreshold: config.fuzzyConfirmThreshold,
      masterSourceIndex: !catalogFile && noCatalogMode === "master_source" ? selectedMasterSourceIdx : null,
    };

    const { integrated, issues, issuesSummary, stats, integrationMode, bipartiteStats, synthesizedCatalog } = runPipeline(
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
      bipartiteStats,
      synthesizedCatalog,
      fileBreakdown: orderFiles.map((f) => `${f.fileName} (${f.dataRows.length})`).join(" · "),
    });
    setStep("results");
  };

  // Mở rộng 1 + Cơ chế 4: Xác nhận thủ công & Lưu vào Progressive Crosswalk
  const handleManualDecision = (rowIndex, decision, item) => {
    setManualConfirmations((prev) => {
      const next = new Map(prev);
      next.set(rowIndex, { decision, item });
      return next;
    });

    if (decision === "ACCEPT" && item.matched) {
      saveProgressiveCrosswalkPair(item.ten_sp, item.matched.ten_sp, item.matched);
      setCrosswalkCount(getProgressiveCrosswalk().length);
    }
  };

  const handleClearCrosswalk = () => {
    if (window.confirm("Bạn có chắc muốn xóa toàn bộ bộ nhớ Progressive Crosswalk tích lũy?")) {
      clearProgressiveCrosswalk();
      setCrosswalkCount(0);
    }
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
    a.href = url; a.download = "du-lieu-tich-hop-tong-hop.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const CHART_COLORS = ["#A97B25", "#4C7458", "#9C4A3B", "#2C3E4A", "#7A8B76", "#C9A45C"];

  return (
    <div className="bsi-root w-full">
      <Tokens />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--brass)" }}>
              Hệ thống nội bộ · Quản trị dữ liệu bán hàng đa ngành hàng
            </p>
            <h1 className="bsi-serif text-[26px] font-semibold leading-tight">Sổ Tích Hợp Dữ Liệu Bán Hàng</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowConfigModal(true)} className="bsi-btn-secondary flex items-center gap-1.5 text-[13px] px-3.5 py-2">
              <Sliders size={14} /> Cấu hình xử lý
            </button>
            {step === "results" && (
              <>
                <button onClick={exportSummaryFile} className="bsi-btn-primary flex items-center gap-1.5 text-[13px] px-3.5 py-2">
                  <Download size={14} /> Xuất file tổng hợp
                </button>
                <button onClick={reset} className="bsi-btn-secondary flex items-center gap-1.5 text-[13px] px-3.5 py-2">
                  <RotateCcw size={14} /> Xử lý tệp khác
                </button>
              </>
            )}
          </div>
        </div>

        {/* Modal Cấu hình xử lý (Mở rộng 3) */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bsi-card max-w-lg w-full p-6 shadow-xl relative" style={{ background: "var(--paper-card)" }}>
              <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-2">
                  <Sliders size={18} style={{ color: "var(--brass)" }} />
                  <h3 className="bsi-serif text-lg font-semibold">Cấu Hình Xử Lý Dữ Liệu</h3>
                </div>
                <button onClick={() => setShowConfigModal(false)} aria-label="Đóng"><X size={18} /></button>
              </div>
              <div className="space-y-4 text-[13px]">
                <div>
                  <label className="font-semibold block mb-1">Ngưỡng đối chiếu mờ (Fuzzy Confirm Threshold): {config.fuzzyConfirmThreshold}%</label>
                  <input type="range" min="50" max="90" value={config.fuzzyConfirmThreshold}
                    onChange={(e) => setConfig({ ...config, fuzzyConfirmThreshold: Number(e.target.value) })} className="w-full" />
                  <span className="text-[11.5px]" style={{ color: "var(--ink-soft)" }}>Điểm tương đồng từ {config.fuzzyConfirmThreshold}% sẽ được chuyển sang danh sách Cần xác nhận.</span>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Ngưỡng lệch giá cảnh báo: {config.priceDeviationThreshold}%</label>
                  <input type="range" min="10" max="50" value={config.priceDeviationThreshold}
                    onChange={(e) => setConfig({ ...config, priceDeviationThreshold: Number(e.target.value) })} className="w-full" />
                  <span className="text-[11.5px]" style={{ color: "var(--ink-soft)" }}>Cảnh báo khi giá bán chênh quá {config.priceDeviationThreshold}% so với giá chuẩn catalog.</span>
                </div>
                
                <div className="p-3 rounded border" style={{ borderColor: "var(--line)", background: "var(--paper)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold flex items-center gap-1.5"><BookmarkCheck size={15} style={{ color: "var(--moss)" }} /> Progressive Crosswalk (Cơ chế 4)</p>
                      <p className="text-[11.5px]" style={{ color: "var(--ink-soft)" }}>Đã tích lũy <strong>{crosswalkCount}</strong> cặp liên kết từ người dùng.</p>
                    </div>
                    {crosswalkCount > 0 && (
                      <button onClick={handleClearCrosswalk} className="text-[11.5px] text-red-700 underline">Xóa bộ nhớ</button>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setShowConfigModal(false)} className="bsi-btn-primary px-4 py-1.5 text-[13px]">Lưu cấu hình</button>
              </div>
            </div>
          </div>
        )}

        {step === "upload" && (
          <>
            <p className="text-[13.5px] mb-5 max-w-2xl" style={{ color: "var(--ink-soft)" }}>
              Hỗ trợ tích hợp đa nguồn: Có sẵn file danh mục chuẩn <strong>HOẶC</strong> tự động đối chiếu chéo giữa các kênh với <strong>Ghép cặp tối ưu toàn cục (Bipartite Matching)</strong>.
            </p>
            {parseError && (
              <div className="bsi-card p-3 mb-4 flex items-center gap-2" style={{ borderColor: "var(--brick)", background: "var(--brick-soft)" }}>
                <AlertTriangle size={15} style={{ color: "var(--brick)" }} />
                <span className="text-[12.5px]" style={{ color: "var(--brick)" }}>{parseError}</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <OrdersDropzone files={orderFiles} onAddFile={addOrderFile} onRemoveFile={removeOrderFile}
                maxFiles={MAX_ORDER_FILES} dragKey="orders" dragOverKey={dragOverKey} setDragOverKey={setDragOverKey} />
              <UploadCard tag="Ô 2 (Tùy chọn)" icon={Package} title="Danh mục sản phẩm chuẩn"
                hint="Nếu có file Master Catalog, hệ thống sẽ đối chiếu theo file này. Nếu không có, hệ thống tự động ghép cặp tối ưu giữa các tệp đơn hàng."
                fileState={catalogFile} onFile={setCatalog} onRemove={() => setCatalogFile(null)}
                dragKey="catalog" dragOverKey={dragOverKey} setDragOverKey={setDragOverKey} />
            </div>

            {/* Lựa chọn cơ chế khi không có File Danh mục chuẩn */}
            {!catalogFile && orderFiles.length >= 2 && (
              <div className="bsi-card p-4 mb-6 border" style={{ borderColor: "var(--brass)", background: "var(--paper-card)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} style={{ color: "var(--brass)" }} />
                  <h4 className="bsi-serif text-[14px] font-semibold">Phương thức đối chiếu khi không có File Chuẩn</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px] mt-2">
                  <label className={`p-3 rounded border cursor-pointer transition flex items-start gap-2.5 ${noCatalogMode === "bipartite" ? "border-amber-700 bg-amber-50/50" : "border-gray-200"}`}>
                    <input type="radio" name="noCatMode" checked={noCatalogMode === "bipartite"} onChange={() => setNoCatalogMode("bipartite")} className="mt-0.5" />
                    <div>
                      <span className="font-semibold block text-[13px] text-amber-900">🌟 Ghép cặp tối ưu toàn cục (Bipartite Matching)</span>
                      <span className="text-[11.5px] text-gray-600 block mt-0.5">Khuyên dùng (Cơ chế 3 & 4): Tránh tranh chấp khớp, tự động tổng hợp danh mục và ghi nhớ qua Progressive Crosswalk.</span>
                    </div>
                  </label>
                  <label className={`p-3 rounded border cursor-pointer transition flex items-start gap-2.5 ${noCatalogMode === "master_source" ? "border-amber-700 bg-amber-50/50" : "border-gray-200"}`}>
                    <input type="radio" name="noCatMode" checked={noCatalogMode === "master_source"} onChange={() => setNoCatalogMode("master_source")} className="mt-0.5" />
                    <div>
                      <span className="font-semibold block text-[13px]">📁 Chọn 1 tệp làm nguồn chuẩn (Cơ chế 1)</span>
                      <select value={selectedMasterSourceIdx} onChange={(e) => setSelectedMasterSourceIdx(Number(e.target.value))}
                        disabled={noCatalogMode !== "master_source"} className="mt-1 text-[11.5px] p-1 border rounded w-full bg-white">
                        {orderFiles.map((f, idx) => (
                          <option key={idx} value={idx}>Chuẩn: {f.fileName}</option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end flex-wrap gap-3">
              <button onClick={processAll} disabled={!readyToProcess} className="bsi-btn-primary flex items-center gap-2 text-[14px] px-5 py-2.5">
                Bắt đầu tích hợp <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="bsi-card p-10 flex flex-col items-center text-center">
            <Loader2 size={30} className="bsi-spin mb-4" style={{ color: "var(--brass)" }} />
            <h2 className="bsi-serif text-lg font-semibold mb-5">Đang xử lý dữ liệu…</h2>
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
                <span className="bsi-stamp">✓ ĐÃ ĐỐI CHIẾU</span>
                <span className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                  {result.stats.totalRows} giao dịch từ {orderFiles.length} tệp đơn hàng · {result.stats.catalogSize} sản phẩm trong danh mục
                </span>
              </div>
              <span className="bsi-badge" style={{ background: "var(--navy)", color: "#fff" }}>
                {result.integrationMode === "MASTER_CATALOG" ? "Chế độ: Có Master Catalog"
                  : result.integrationMode === "BIPARTITE_MATCHING" ? "Cơ chế: Ghép cặp tối ưu (Bipartite + Crosswalk)"
                  : "Cơ chế: Nguồn chuẩn chỉ định"}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Tổng giao dịch" value={result.stats.totalRows} sub={result.fileBreakdown} />
              <StatCard label="Tỷ lệ khớp thực thể" value={`${result.stats.totalRows ? ((result.stats.matchedCount / result.stats.totalRows) * 100).toFixed(0) : 0}%`}
                sub={`${result.stats.matchedCount}/${result.stats.totalRows} dòng`} tone="moss" />
              <StatCard label="Số lỗi phát hiện (6 nhóm)" value={result.issues.length} sub="xem chi tiết ở tab Vấn đề" tone="brick" />
              <StatCard label="Doanh thu tổng hợp" value={formatVND(result.revenueTotal)} sub={`đã gộp ${orderFiles.length} tệp`} tone="brass" />
            </div>

            <div className="flex items-center gap-6 border-b mb-5 overflow-x-auto" style={{ borderColor: "var(--line)" }}>
              {[
                { key: "overview", label: "Tổng quan", icon: BarChart3 },
                { key: "issues", label: `Vấn đề dữ liệu (${result.issues.length})`, icon: ListChecks },
                { key: "manual_confirm", label: `Xác nhận thủ công (${result.pendingConfirmations.length})`, icon: ShieldCheck },
                { key: "quality_report", label: "Báo cáo chất lượng", icon: FileText },
                { key: "data", label: "Dữ liệu tích hợp", icon: Table2 },
              ].map((t) => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} className={`bsi-tab-btn flex items-center gap-1.5 whitespace-nowrap ${activeTab === t.key ? "active" : ""}`}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bsi-card p-4">
                  <h3 className="bsi-serif text-[14.5px] font-semibold mb-3">Doanh thu theo kênh bán</h3>
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
                  <h3 className="bsi-serif text-[14.5px] font-semibold mb-3">Top sản phẩm bán chạy (theo số lượng)</h3>
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
                          {["Nguồn", "Mã đơn", "Tên sản phẩm", "Nhóm lỗi", "Vấn đề phát hiện"].map((h) => (
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

            {/* Mở rộng 1: UI Xác nhận thủ công các trường hợp Entity Resolution không chắc chắn */}
            {activeTab === "manual_confirm" && (
              <div className="bsi-card p-5">
                <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="bsi-serif text-[15px] font-semibold mb-1">Xác Nhận Thủ Công & Học Tích Lũy (Progressive Crosswalk)</h3>
                    <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                      Khi bạn bấm <strong>Chấp nhận</strong>, hệ thống sẽ tự động ghi nhớ liên kết này vào bộ nhớ để các lần tích hợp sau chính xác 100%.
                    </p>
                  </div>
                  <span className="text-[12px] bsi-mono px-2 py-1 bg-amber-100 text-amber-800 rounded">
                    Bộ nhớ tích lũy: {crosswalkCount} cặp
                  </span>
                </div>
                {result.pendingConfirmations.length === 0 ? (
                  <p className="p-6 text-center text-[13px]" style={{ color: "var(--moss)" }}>
                    ✓ Tất cả sản phẩm đều đã đối chiếu chính xác tuyệt đối! Không có bản ghi nào cần xác nhận thủ công.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {result.pendingConfirmations.map((item, idx) => {
                      const manual = manualConfirmations.get(idx);
                      return (
                        <div key={idx} className="border rounded p-3 text-[12.5px]" style={{ borderColor: "var(--line)", background: manual ? "var(--moss-soft)" : "var(--paper)" }}>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div>
                              <span className="font-semibold">{item.ten_sp}</span>
                              <span className="ml-2 text-[11px] bsi-mono" style={{ color: "var(--ink-soft)" }}>[{item.nguon} | {item.ma_don}]</span>
                            </div>
                            <SeverityBadge severity={item.matchStatus} />
                          </div>
                          {item.matched && (
                            <p className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>
                              Đề xuất ghép: <strong>{item.matched.ten_sp}</strong> (Mã: {item.matched.ma_dinh_danh}) — Độ tương đồng: <strong>{item.matchScore}%</strong>
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
                            <button
                              onClick={() => handleManualDecision(idx, "ACCEPT", item)}
                              className={`px-3 py-1 text-[11.5px] font-medium rounded flex items-center gap-1 ${manual?.decision === "ACCEPT" ? "bsi-btn-primary" : "bsi-btn-secondary"}`}
                            >
                              <Check size={13} /> Chấp nhận đề xuất (Lưu Crosswalk)
                            </button>
                            <button
                              onClick={() => handleManualDecision(idx, "REJECT", item)}
                              className={`px-3 py-1 text-[11.5px] font-medium rounded flex items-center gap-1 ${manual?.decision === "REJECT" ? "bg-red-800 text-white" : "bsi-btn-secondary"}`}
                            >
                              <X size={13} /> Từ chối (Không cùng sản phẩm)
                            </button>
                            {manual && (
                              <span className="text-[11.5px] font-medium self-center ml-auto" style={{ color: "var(--moss)" }}>
                                ✓ Đã ghi nhận: {manual.decision === "ACCEPT" ? "Đã lưu vào bộ nhớ Crosswalk" : "Đã từ chối khớp"}
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

            {/* Mở rộng 2: Báo cáo chất lượng dữ liệu trước và sau xử lý */}
            {activeTab === "quality_report" && (
              <div className="space-y-4">
                <div className="bsi-card p-5">
                  <h3 className="bsi-serif text-[15px] font-semibold mb-2">Báo Cáo Chất Lượng Dữ Liệu (Mở Rộng #2)</h3>
                  <p className="text-[12.5px] mb-4" style={{ color: "var(--ink-soft)" }}>
                    Thống kê chi tiết chất lượng dữ liệu trước và sau khi đi qua pipeline xử lý & đối chiếu.
                  </p>
                  
                  {result.bipartiteStats && (
                    <div className="mb-5 p-3.5 rounded border" style={{ borderColor: "var(--brass)", background: "var(--paper)" }}>
                      <h4 className="text-[13px] font-semibold mb-2 text-amber-900 flex items-center gap-1.5">
                        <Sparkles size={15} /> Thống Kê Ghép Cặp Tối Ưu Toàn Cục (Bipartite Matching)
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
                        <div>Sản phẩm duy nhất Nguồn 1: <strong>{result.bipartiteStats.totalUniqueSource1}</strong></div>
                        <div>Sản phẩm duy nhất Nguồn 2: <strong>{result.bipartiteStats.totalUniqueSource2}</strong></div>
                        <div>Cặp ghép tối ưu thành công: <strong className="text-green-700">{result.bipartiteStats.matchedPairsCount}</strong></div>
                        <div>Sản phẩm riêng lẻ không ghép: <strong>{result.bipartiteStats.unmatchedSource1Count + result.bipartiteStats.unmatchedSource2Count}</strong></div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    <div className="border rounded p-3 text-center" style={{ borderColor: "var(--line)" }}>
                      <p className="text-[11px] uppercase font-semibold text-gray-500">Tỷ lệ dữ liệu sạch ban đầu</p>
                      <p className="bsi-serif text-2xl font-bold text-amber-700">
                        {((1 - result.issues.length / (result.stats.totalRows * 5)) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="border rounded p-3 text-center" style={{ borderColor: "var(--line)" }}>
                      <p className="text-[11px] uppercase font-semibold text-gray-500">Lỗi đã được Tự động sửa (AUTO_FIXED)</p>
                      <p className="bsi-serif text-2xl font-bold" style={{ color: "var(--moss)" }}>
                        {result.issues.filter((i) => i.severity === "AUTO_FIXED").length}
                      </p>
                    </div>
                    <div className="border rounded p-3 text-center" style={{ borderColor: "var(--line)" }}>
                      <p className="text-[11px] uppercase font-semibold text-gray-500">Tỷ lệ khớp thực thể cuối cùng</p>
                      <p className="bsi-serif text-2xl font-bold" style={{ color: "var(--moss)" }}>
                        {((result.stats.matchedCount / result.stats.totalRows) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <h4 className="font-semibold text-[13.5px] mb-3">Phân bổ lỗi theo 6 nhóm chuẩn hóa & chất lượng</h4>
                  <div className="space-y-2">
                    {Object.entries(GROUP_LABELS).map(([gKey, gLabel]) => {
                      const count = result.issues.filter((i) => i.group === gKey).length;
                      const pct = result.issues.length ? Math.round((count / result.issues.length) * 100) : 0;
                      return (
                        <div key={gKey} className="flex items-center justify-between text-[12px] border-b pb-1.5" style={{ borderColor: "var(--line)" }}>
                          <span className="font-medium">{gLabel}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div className="bg-amber-600 h-2" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="bsi-mono w-12 text-right">{count} lỗi ({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "data" && (
              <div className="bsi-card overflow-hidden">
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-[12.5px]">
                    <thead className="sticky top-0" style={{ background: "var(--paper-card)" }}>
                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                        {["Nguồn", "Mã đơn", "Ngày", "Tên sản phẩm", "Mã định danh", "Kênh", "Trạng thái", "SL", "Giá bán", "Thành tiền", "Kết quả"].map((h) => (
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
