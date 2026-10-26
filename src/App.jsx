import React, { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  ArrowRight,
  AlertTriangle,
  BarChart3,
  ListChecks,
  Sparkles,
  FileText,
  Table2,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";
import { detectFields } from "./logic/fieldMapping";
import { runPipeline, applyManualDecisions } from "./logic/pipeline";
import { parseCrosswalk } from './logic/crosswalk';
import { reconciliationCounts } from './logic/reconciliation';
import { getExportData, csvCell } from "./logic/exportData";
import { getReportTables } from './logic/reportExport';
import { STRATEGY_LABELS, sourceIndexAfterRemoval, validateUiConfig } from "./logic/uiConfig";

// Components
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Header } from "./components/layout/Header";
import { PipelineProgress } from "./components/layout/PipelineProgress";
import { OrdersDropzone } from "./components/upload/OrdersDropzone";
import { CatalogDropzone } from "./components/upload/CatalogDropzone";
import { PRESETS } from "./components/upload/PresetSelector";
import { InventoryTab } from "./components/tabs/InventoryTab";
import { ResetConfirmModal } from "./components/modals/ResetConfirmModal";
import { AdvancedConfigModal } from "./components/modals/AdvancedConfigModal";
import { MetricStatCards } from "./components/dashboard/MetricStatCards";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { IssuesTab } from "./components/tabs/IssuesTab";
import { HitlWorkbenchTab } from "./components/tabs/HitlWorkbenchTab";
import { ScientificReportTab } from "./components/tabs/ScientificReportTab";
import { MasterDataGridTab } from "./components/tabs/MasterDataGridTab";

const MAX_ORDER_FILES = 10;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export default function App() {
  const [step, setStep] = useState("upload"); // "upload" | "processing" | "results"
  const [orderFiles, setOrderFiles] = useState([]);
  const [catalogFile, setCatalogFile] = useState(null);
  const [crosswalk, setCrosswalk] = useState([]);
  const [crosswalkFileName, setCrosswalkFileName] = useState("");
  const [pendingUploads, setPendingUploads] = useState(0);
  const [dragOverKey, setDragOverKey] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [parseError, setParseError] = useState("");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");
  const orderUploadBusy = useRef(false);
  const closeReset = useCallback(() => setShowResetModal(false), []);

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

  const closeConfig = useCallback(() => setShowConfigModal(false), []);
  const currentConfig = { activePresetId, config, selectedStrategy, masterSourceIndex };
  const configurationError = validateUiConfig(currentConfig, {
    hasCatalog: !!catalogFile, orderFiles, crosswalkCount: crosswalk.length,
  });

  const parseToFileState = async (file) => {
    const buf = await file.arrayBuffer();
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error("Định dạng tệp không hỗ trợ.");
    const isCsv = /\.csv$/i.test(file.name);
    const wb = isCsv
      ? XLSX.read(new TextDecoder("utf-8", { fatal: true }).decode(buf), { type: "string", raw: true, cellDates: true })
      : XLSX.read(buf, { type: "array", cellDates: true });
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

  const addOrderFiles = async (files) => {
    if (!files.length) return;
    if (orderUploadBusy.current || pendingUploads > 0) {
      setUploadNotice("Đang đọc tệp. Vui lòng chờ rồi chọn lại các tệp bổ sung.");
      return;
    }
    orderUploadBusy.current = true;
    setParseError("");
    setPendingUploads(count => count + 1);
    const parsed = [], feedback = [];
    const names = new Set(orderFiles.map(file => file.fileName.normalize('NFC').toLowerCase()));
    try {
      // Sequential parsing preserves the user's source order, including Master Source.
      for (const file of files) {
        const name = file.name.normalize('NFC').toLowerCase();
        if (names.has(name)) { feedback.push('Bỏ qua tệp trùng tên: ' + file.name); continue; }
        if (orderFiles.length + parsed.length >= MAX_ORDER_FILES) {
          feedback.push('Chưa nạp do giới hạn ' + MAX_ORDER_FILES + ' tệp: ' + file.name); continue;
        }
        try {
          const fs = await parseToFileState(file);
          fs.channelLabel = detectChannelFromFilename(file.name);
          parsed.push(fs); names.add(name);
        } catch {
          feedback.push('Không đọc được: ' + file.name + ' (.xlsx/.xls hoặc CSV UTF-8).');
        }
      }
      setOrderFiles(previous => [...previous, ...parsed]);
      setUploadNotice('Đã nạp thêm ' + parsed.length + ' tệp.' + (feedback.length ? ' ' + feedback.join(' · ') : ''));
    } finally {
      orderUploadBusy.current = false;
      setPendingUploads(count => count - 1);
    }
  };

  const removeOrderFile = (idx) => {
    setOrderFiles((prev) => prev.filter((_, i) => i !== idx));
    setMasterSourceIndex(previous => sourceIndexAfterRemoval(previous, idx));
  };

  const updateChannelLabel = (idx, label) => {
    setOrderFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, channelLabel: label } : f)));
  };

  const setCatalog = async (file) => {
    setParseError("");
    setPendingUploads(count => count + 1);
    try {
      setCatalogFile(await parseToFileState(file));
    } catch {
      setParseError(`Không đọc được file "${file.name}". Hãy kiểm tra định dạng (.csv/.xlsx/.xls).`);
    } finally { setPendingUploads(count => count - 1); }
  };

  const reset = () => {
    setOrderFiles([]);
    setCatalogFile(null);
    setCrosswalk([]);
    setCrosswalkFileName("");
    setMasterSourceIndex(0);
    setResult(null);
    setStep("upload");
    setActiveTab("overview");
    setParseError("");
    setManualConfirmations(new Map());
    setIssueGroupFilter("ALL");
    setUploadNotice("");
    setShowResetModal(false);
  };

  const requestReset = () => { if (result) setShowResetModal(true); else reset(); };
  const reRunConfig = () => setShowConfigModal(true);

  const readyToProcess = pendingUploads === 0 && !configurationError
    && orderFiles.length > 0 && orderFiles.every((f) => f.dataRows.length > 0)
    && (!catalogFile || catalogFile.dataRows.length > 0);

  const processAll = async (selection = currentConfig) => {
    const error = validateUiConfig(selection, { hasCatalog: !!catalogFile, orderFiles, crosswalkCount: crosswalk.length });
    if (error) { setParseError(error); return; }
    setParseError("");
    setStep("processing");
    // Let the browser paint once; do not display invented per-stage progress.
    await delay(0);

    const pipelineOptions = {
      resolutionStrategy: catalogFile ? "CATALOG" : selection.selectedStrategy,
      masterSourceIndex: selection.masterSourceIndex,
      fuzzyHighThreshold: selection.config.fuzzyHighThreshold,
      fuzzyConfirmThreshold: selection.config.fuzzyConfirmThreshold,
      priceDeviationThreshold: selection.config.priceDeviationThreshold,
      crosswalk,
    };

    try {
      const pipelineResult = runPipeline(orderFiles, catalogFile, pipelineOptions);
      setManualConfirmations(new Map());
      setResult({
        ...pipelineResult,
        activePreset: selection.activePresetId !== "custom" ? PRESETS[selection.activePresetId].name : "Tùy chỉnh riêng",
        fileBreakdown: orderFiles.map(f => `${f.fileName} (${f.dataRows.length})`).join(" · "),
      });
    } catch (error) {
      setParseError(error.message || "Không thể xử lý dữ liệu.");
      setStep(result ? "results" : "upload");
      return;
    }

    setActiveTab("overview");
    setIssueGroupFilter("ALL");
    setStep("results");
    return true;
  };

  const applyConfig = async (draft) => {
    if (validateUiConfig(draft, { hasCatalog: !!catalogFile, orderFiles, crosswalkCount: crosswalk.length })) return;
    closeConfig();
    if (step === "results") {
      // Commit only after success so a failed rerun keeps both the previous result and config.
      const succeeded = await processAll(draft);
      if (!succeeded) return;
    }
    setActivePresetId(draft.activePresetId);
    setConfig({ ...draft.config });
    setSelectedStrategy(draft.selectedStrategy);
    setMasterSourceIndex(draft.masterSourceIndex);
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
    for (const table of getReportTables(result)) {
      const reportSheet = XLSX.utils.aoa_to_sheet([table.headers, ...table.rows]);
      reportSheet['!cols'] = table.headers.map((h, i) => ({ wch: Math.min(65, Math.max(16, h.length + 2, ...table.rows.map(r => String(r[i] ?? '').length + 2))) }));
      XLSX.utils.book_append_sheet(wb, reportSheet, table.name);
    }
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
    <div className="min-h-screen bg-slate-50 flex flex-col" inert={showConfigModal || showResetModal ? true : undefined}>
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
        onReset={requestReset}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {parseError && (
          <div role="alert" className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs">
            <AlertTriangle size={18} className="shrink-0" />
            <div><strong>Không thể hoàn tất thao tác: </strong>{parseError}{result && <p className="mt-1">Kết quả và quyết định duyệt của lần chạy trước vẫn được giữ nguyên.</p>}</div>
          </div>
        )}
        {/* ============================== SCREEN 1: UPLOAD ============================== */}
        {step === "upload" && (
          <div className="space-y-6">
            {/* Dual Dropzones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <OrdersDropzone
                files={orderFiles}
                onAddFiles={addOrderFiles}
                busy={pendingUploads > 0}
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
                busy={pendingUploads > 0}
                onError={setParseError}
                onRemove={() => setCatalogFile(null)}
                dragKey="catalog"
                dragOverKey={dragOverKey}
                setDragOverKey={setDragOverKey}
              />
            </div>

            {uploadNotice && <p role="status" className="text-xs text-slate-700 p-3 bg-blue-50 border border-blue-100 rounded-lg break-words">{uploadNotice}</p>}
            {/* Action Button & Status Help */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-2">
              <label className="block font-semibold rounded-lg focus-within:ring-2 focus-within:ring-indigo-500">Crosswalk mã sách (tùy chọn, dùng với danh mục hoặc nguồn chuẩn)
                <span className="block mt-2"><span className="inline-flex px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer">{crosswalkFileName ? 'Chọn tệp Crosswalk khác' : 'Chọn tệp Crosswalk'}</span></span>
                <input type="file" accept=".csv,.xlsx,.xls" disabled={pendingUploads > 0} className="sr-only" onChange={async e => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  setPendingUploads(count => count + 1);
                  try {
                    const parsed = await parseToFileState(f);
                    setCrosswalk(parseCrosswalk(parsed.headers, parsed.dataRows));
                    setCrosswalkFileName(f.name);
                    setParseError('');
                  } catch (error) { setParseError(error.message); }
                  finally { setPendingUploads(count => count - 1); }
                }} />
              </label>
              <p>Cột internal_code và standard_code; thêm source (tên tệp đơn hàng) nếu mã nội bộ khác nhau giữa các nguồn. Trong mỗi nguồn, một mã chỉ được trỏ đến một mã chuẩn đã có trong danh mục.</p>
              {crosswalkFileName && <p className="break-words text-indigo-700">Đã nạp: {crosswalkFileName} · {crosswalk.length} ánh xạ. <button type="button" disabled={pendingUploads > 0} onClick={() => { setCrosswalk([]); setCrosswalkFileName(''); }} className="text-rose-700 underline disabled:opacity-50 disabled:cursor-not-allowed">Xóa Crosswalk</button></p>}
              {configurationError && <div role="alert" className="text-amber-800 bg-amber-50 rounded-lg p-3">
                {configurationError} <button type="button" onClick={() => setShowConfigModal(true)} className="underline font-semibold">Mở cấu hình</button>
              </div>}
              <p className="text-slate-600">Giá bìa không thay thế giá bán. Giá trị báo cáo chưa trừ phí sàn và phí vận chuyển.</p>
              <details className="text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-700">Lưu ý về dữ liệu và cách tính</summary>
                <div className="mt-2 space-y-2">
                  <p>Bảng ngang theo chi nhánh được giữ để đối soát, không tính doanh thu khi chưa xác định nghiệp vụ.</p>
                  <p>Shopee dùng giá ưu đãi theo đơn vị; Lazada/TikTok dùng tổng tiền sản phẩm sau giảm giá khi có cột này. Trạng thái hoàn tiền được xét cùng trạng thái giao hàng.</p>
                </div>
              </details>
            </div>
            <div className="pt-4 flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={() => { if (readyToProcess) processAll(); }}
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
                {pendingUploads > 0 ? (
                  <span role="status">Đang đọc tệp, vui lòng chờ trước khi khởi chạy.</span>
                ) : orderFiles.length === 0 && !catalogFile ? (
                  <span>Vui lòng tải lên ít nhất 1 tệp đơn hàng để kích hoạt xử lý.</span>
                ) : orderFiles.length === 0 ? (
                  <span className="text-amber-600 font-medium">
                    ⚠️ Vui lòng tải thêm ít nhất 1 tệp đơn hàng.
                  </span>
                ) : catalogFile && catalogFile.dataRows.length === 0 ? (
                  <span className="text-amber-700">Danh mục đang rỗng. Hãy thay tệp hoặc bỏ danh mục.</span>
                ) : orderFiles.some(file => file.dataRows.length === 0) ? (
                  <span className="text-amber-700">Có tệp đơn hàng rỗng. Hãy thay hoặc xóa tệp đó.</span>
                ) : !catalogFile ? (
                  <span className="text-slate-500">
                    Chưa có danh mục: dùng <strong>{STRATEGY_LABELS[selectedStrategy]}</strong>. Có thể đổi trong Gói cấu hình.
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
        {step === "processing" && <PipelineProgress />}

        {/* ============================== SCREEN 3: RESULTS ============================== */}
        {step === "results" && result && (
          <div className="space-y-6">
            {/* Status Summary Banner */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-start gap-3 min-w-0 max-w-full">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900">
                      Tích Hợp Hoàn Tất: {result.stats.totalRows.toLocaleString()} dòng dữ liệu
                    </h2>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                      {result.strategyLabel}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Gói: {result.activePreset}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 break-words">
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
                { key: "inventory", label: "Tồn kho master", icon: Table2 },
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
                    aria-pressed={isActive}
                    className={`inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
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

              {activeTab === "inventory" && <InventoryTab result={result} catalogFile={catalogFile} />}
              {activeTab === "master_data" && (
                <MasterDataGridTab
                  integratedRows={result.integrated}
                  onExportCsv={exportSummaryCsv}
                  onExportExcel={exportSummaryExcel}
                />
              )}
            </ErrorBoundary>
          </div>
        )}
      </main>

      {showResetModal && <ResetConfirmModal onClose={closeReset} onConfirm={reset} decisionCount={manualConfirmations.size} />}
      {/* Advanced Configuration Modal */}
      {showConfigModal && <AdvancedConfigModal
        onClose={closeConfig}
        onApply={applyConfig}
        activePresetId={activePresetId}
        config={config}
        selectedStrategy={selectedStrategy}
        masterSourceIndex={masterSourceIndex}
        orderFiles={orderFiles}
        hasCatalog={!!catalogFile}
        crosswalkCount={crosswalk.length}
        isResults={step === "results"}
        manualDecisionCount={manualConfirmations.size}
      />}
    </div>
  );
}
