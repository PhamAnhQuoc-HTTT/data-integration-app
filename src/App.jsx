import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  ListChecks,
  Sparkles,
  FileText,
  Table2,
  SlidersHorizontal,
  CheckCircle2,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { detectFields } from "./logic/fieldMapping";
import { runPipeline, applyManualDecisions } from "./logic/pipeline";
import { parseCrosswalk } from './logic/crosswalk';
import { reconciliationCounts } from './logic/reconciliation';
import { getExportData, csvCell } from "./logic/exportData";

// Components
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Header } from "./components/layout/Header";
import { PipelineProgress } from "./components/layout/PipelineProgress";
import { OrdersDropzone } from "./components/upload/OrdersDropzone";
import { CatalogDropzone } from "./components/upload/CatalogDropzone";
import { PRESETS, PresetSelector } from "./components/upload/PresetSelector";
import { AdvancedConfigModal } from "./components/modals/AdvancedConfigModal";
import { MetricStatCards } from "./components/dashboard/MetricStatCards";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { IssuesTab } from "./components/tabs/IssuesTab";
import { HitlWorkbenchTab } from "./components/tabs/HitlWorkbenchTab";
import { ScientificReportTab } from "./components/tabs/ScientificReportTab";
import { MasterDataGridTab } from "./components/tabs/MasterDataGridTab";

const MAX_ORDER_FILES = 4;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export default function App() {
  const [step, setStep] = useState("upload"); // "upload" | "processing" | "results"
  const [orderFiles, setOrderFiles] = useState([]);
  const [catalogFile, setCatalogFile] = useState(null);
  const [crosswalk, setCrosswalk] = useState([]);
  const [dragOverKey, setDragOverKey] = useState(null);
  const [procIdx, setProcIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [parseError, setParseError] = useState("");
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Manual Confirmations (HITL)
  const [manualConfirmations, setManualConfirmations] = useState(new Map());

  // Filter & Search states
  const [issueGroupFilter, setIssueGroupFilter] = useState("ALL");

  // Strategy selection states (Cơ chế 1, 2, 3)
  const [selectedStrategy, setSelectedStrategy] = useState("BIPARTITE");
  const [masterSourceIndex, setMasterSourceIndex] = useState(0);

  // Presets & Parameters
  const [activePresetId, setActivePresetId] = useState("balanced");
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
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const headers = (rows[0] || []).map((h) => String(h));
    // Preserve blank row positions so exported source row numbers remain accurate.
    const dataRows = rows.slice(1);
    const mapping = detectFields(headers);
    return { fileName: file.name, headers, dataRows, mapping };
  };

  const detectChannelFromFilename = (filename) => {
    const n = (filename || "").toLowerCase().replace(/[_\-.]+/g, " ");
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
    setOrderFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, channelLabel: label } : f)));
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
    setOrderFiles([]);
    setCatalogFile(null);
    setCrosswalk([]);
    setResult(null);
    setStep("upload");
    setActiveTab("overview");
    setParseError("");
    setManualConfirmations(new Map());
    setIssueGroupFilter("ALL");
  };

  const reRunConfig = () => {
    setResult(null);
    setStep("upload");
    setActiveTab("overview");
    setParseError("");
    setManualConfirmations(new Map());
    setIssueGroupFilter("ALL");
    setShowConfigModal(true);
  };

  const readyToProcess = orderFiles.length > 0 && orderFiles.every((f) => f.dataRows.length > 0);

  const processAll = async () => {
    setStep("processing");
    setProcIdx(0);
    await delay(350);
    setProcIdx(1);
    await delay(450);
    setProcIdx(2);
    await delay(450);

    const pipelineOptions = {
      resolutionStrategy: catalogFile ? "CATALOG" : selectedStrategy,
      masterSourceIndex,
      fuzzyHighThreshold: config.fuzzyHighThreshold,
      fuzzyConfirmThreshold: config.fuzzyConfirmThreshold,
      priceDeviationThreshold: config.priceDeviationThreshold,
      crosswalk,
    };

    try {
      const pipelineResult = runPipeline(orderFiles, catalogFile, pipelineOptions);
      setManualConfirmations(new Map());
      setResult({
        ...pipelineResult,
        activePreset: activePresetId !== "custom" ? PRESETS[activePresetId].name : "Tùy chỉnh riêng",
        fileBreakdown: orderFiles.map(f => `${f.fileName} (${f.dataRows.length})`).join(" · "),
      });
    } catch (error) {
      setParseError(error.message || "Không thể xử lý dữ liệu.");
      setStep("upload");
      return;
    }

    setStep("results");
  };

  const handleManualDecision = (rowIndex, decision, item) => {
    const next = new Map(manualConfirmations);
    next.set(rowIndex, { decision, item });
    setManualConfirmations(next);
    setResult(prev => applyManualDecisions(prev, next));
  };

  const exportSummaryCsv = () => {
    if (!result) return;
    const { headers, rows } = getExportData(result);
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map(csvCell).join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "du-lieu-tich-hop-ban-hang.csv");
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    // Chromium cần thời gian khởi tạo download stream trước khi thu hồi URL
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 3000);
  };

  const exportSummaryExcel = () => {
    if (!result) return;
    const { headers, rows } = getExportData(result);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.slice(0, 80).map((r) => String(r[i] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ket_Qua_Tich_Hop");
    XLSX.writeFile(wb, "du-lieu-tich-hop-ban-hang.xlsx");
  };

  // Tính tỷ lệ khớp động khi người dùng duyệt tay
  const acceptedManualCount = [...manualConfirmations.values()].filter(
    (m) => m.decision === "ACCEPT"
  ).length;
  const liveMatchedCount = result
    ? (result.stats?.matchedCount || 0)
    : 0;
  const liveMatchRate = result
    ? result.stats?.totalRows
      ? Math.min(100, Math.round((liveMatchedCount / result.stats.totalRows) * 100))
      : 0
    : 0;

  const reviewCounts = reconciliationCounts(result?.pendingConfirmations || [], manualConfirmations);
  const unreviewedConfirmationsCount = reviewCounts.pending;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Navigation */}
      <Header
        step={step}
        activePreset={
          activePresetId !== "custom"
            ? PRESETS[activePresetId].name.split("(")[0].trim()
            : "Tùy chỉnh"
        }
        onOpenConfig={() => setShowConfigModal(true)}
        onExportCsv={exportSummaryCsv}
        onExportExcel={exportSummaryExcel}
        onReset={reset}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ============================== SCREEN 1: UPLOAD ============================== */}
        {step === "upload" && (
          <div className="space-y-6">
            {/* Quick Introduction Banner */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers size={17} className="text-indigo-600" />
                    Không Gian Tải Dữ Liệu & Khởi Chạy Tích Hợp
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hỗ trợ đồng bộ đa kênh (Shopee, TikTok Shop, POS, Lazada) và đối soát danh mục chuẩn
                  </p>
                </div>
              </div>

              {/* Quick Preset Selector */}
              <div className="pt-2">
                <PresetSelector
                  activePresetId={activePresetId}
                  onSelectPreset={handleSelectPreset}
                />
              </div>
            </div>

            {/* Error Banner */}
            {parseError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs">
                <AlertTriangle size={18} className="text-rose-600 flex-shrink-0" />
                <div>
                  <strong className="font-bold">Lỗi tệp dữ liệu: </strong>
                  <span>{parseError}</span>
                </div>
              </div>
            )}

            {/* Dual Dropzones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <OrdersDropzone
                files={orderFiles}
                onAddFile={addOrderFile}
                onRemoveFile={removeOrderFile}
                onUpdateChannelLabel={updateChannelLabel}
                maxFiles={MAX_ORDER_FILES}
                dragKey="orders"
                dragOverKey={dragOverKey}
                setDragOverKey={setDragOverKey}
              />

              <CatalogDropzone
                fileState={catalogFile}
                onFile={setCatalog}
                onRemove={() => setCatalogFile(null)}
                dragKey="catalog"
                dragOverKey={dragOverKey}
                setDragOverKey={setDragOverKey}
              />
            </div>

            {/* Action Button & Status Help */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-2">
              <label className="block font-semibold">Crosswalk mã sách (tùy chọn, dùng với Catalog hoặc Master Source)
                <input type="file" accept=".csv,.xlsx,.xls" className="block mt-2" onChange={async e => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try {
                    const parsed = await parseToFileState(f);
                    setCrosswalk(parseCrosswalk(parsed.headers, parsed.dataRows));
                    setParseError('');
                  } catch (error) { setParseError(error.message); }
                }} />
              </label>
              <p>Cột internal_code và standard_code; thêm source (tên tệp đơn hàng) nếu mã nội bộ khác nhau giữa các nguồn. Trong mỗi nguồn, một mã chỉ được trỏ đến một mã chuẩn đã có trong danh mục.</p>
              {crosswalk.length > 0 && <p>Đã nạp {crosswalk.length} ánh xạ. <button type="button" onClick={() => setCrosswalk([])} className="text-rose-700 underline">Xóa Crosswalk</button></p>}
              <p>Bảng ngang theo chi nhánh được giữ để đối soát, không tính doanh thu khi chưa xác định nghiệp vụ. Giá bìa không thay thế giá bán.</p>
            </div>
            <div className="pt-4 flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={readyToProcess ? processAll : undefined}
                disabled={!readyToProcess}
                className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold transition shadow-sm cursor-pointer ${
                  readyToProcess
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <span>Khởi Chạy Pipeline Tích Hợp & Kiểm Toán</span>
                <ArrowRight size={17} />
              </button>

              <div className="text-xs text-center text-slate-500">
                {orderFiles.length === 0 && !catalogFile ? (
                  <span>Vui lòng tải lên ít nhất 1 tệp đơn hàng để kích hoạt xử lý.</span>
                ) : orderFiles.length === 0 ? (
                  <span className="text-amber-600 font-medium">
                    ⚠️ Vui lòng tải thêm ít nhất 1 tệp đơn hàng.
                  </span>
                ) : !catalogFile ? (
                  <span className="text-slate-500">
                    ℹ️ Chưa có catalog: Hệ thống sẽ tự động kích hoạt <strong>Strategy {selectedStrategy}</strong> để phân giải thực thể.
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 justify-center">
                    <CheckCircle2 size={13} />
                    Sẵn sàng xử lý: {orderFiles.length} tệp đơn hàng & danh mục gốc {catalogFile.dataRows.length} sản phẩm.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================== SCREEN 2: PROCESSING ============================== */}
        {step === "processing" && <PipelineProgress procIdx={procIdx} />}

        {/* ============================== SCREEN 3: RESULTS ============================== */}
        {step === "results" && result && (
          <div className="space-y-6">
            {/* Status Summary Banner */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900">
                      Tích Hợp Hoàn Tất: {result.stats.totalRows.toLocaleString()} đơn hàng
                    </h2>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                      {result.strategyLabel}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Gói: {result.activePreset}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Nguồn nạp: {result.fileBreakdown}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={reRunConfig}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
              >
                <SlidersHorizontal size={13} className="text-slate-500" />
                <span>Chạy lại với tham số khác</span>
              </button>
            </div>

            {/* KPI Metric Stat Cards */}
            <MetricStatCards
              result={result}
              liveMatchRate={liveMatchRate}
              liveMatchedCount={liveMatchedCount}
              acceptedManualCount={acceptedManualCount}
              orderFilesCount={orderFiles.length}
              onNavigateTab={setActiveTab}
            />

            {/* Tab Navigation */}
            <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto pb-px">
              {[
                { key: "overview", label: "Tổng Quan Phân Tích", icon: BarChart3 },
                {
                  key: "issues",
                  label: `Kiểm Soát Chất Lượng (${result.issues.length})`,
                  icon: ListChecks,
                  badge: result.issues.length > 0 ? "warning" : "ok",
                },
                {
                  key: "hitl",
                  label: `HITL (${reviewCounts.pending} cần duyệt · ${reviewCounts.unlinked} chưa liên kết)`,
                  icon: Sparkles,
                  badge: unreviewedConfirmationsCount > 0 ? "attention" : null,
                },
                {
                  key: "scientific_report",
                  label: "Báo Cáo Học Thuật [RQ1-RQ2-RQ3]",
                  icon: FileText,
                },
                {
                  key: "master_data",
                  label: `Bảng Dữ Liệu Tích Hợp (${result.integrated.length})`,
                  icon: Table2,
                },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.key;

                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "border-indigo-600 text-indigo-600 bg-white"
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <Icon size={15} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <ErrorBoundary>
              {activeTab === "overview" && (
                <OverviewTab
                  revenueByChannel={result.revenueByChannel}
                  topProducts={result.topProducts}
                />
              )}

              {activeTab === "issues" && (
                <IssuesTab
                  integratedRows={result.integrated}
                  issueGroupFilter={issueGroupFilter}
                  setIssueGroupFilter={setIssueGroupFilter}
                />
              )}

              {activeTab === "hitl" && (
                <HitlWorkbenchTab
                  pendingConfirmations={result.pendingConfirmations}
                  manualConfirmations={manualConfirmations}
                  onManualDecision={handleManualDecision}
                  config={result.runConfig}
                />
              )}

              {activeTab === "scientific_report" && (
                <ScientificReportTab
                  result={result}
                  config={result.runConfig}
                  liveMatchRate={liveMatchRate}
                />
              )}

              {activeTab === "master_data" && (
                <MasterDataGridTab
                  integratedRows={result.integrated}
                  manualConfirmations={manualConfirmations}
                  onExportCsv={exportSummaryCsv}
                  onExportExcel={exportSummaryExcel}
                />
              )}
            </ErrorBoundary>
          </div>
        )}
      </main>

      {/* Advanced Configuration Modal */}
      <AdvancedConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        activePresetId={activePresetId}
        config={config}
        onSelectPreset={handleSelectPreset}
        onCustomParamChange={handleCustomParamChange}
        selectedStrategy={selectedStrategy}
        setSelectedStrategy={setSelectedStrategy}
        masterSourceIndex={masterSourceIndex}
        setMasterSourceIndex={setMasterSourceIndex}
        orderFiles={orderFiles}
      />
    </div>
  );
}
