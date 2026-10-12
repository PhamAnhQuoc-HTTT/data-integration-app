import React, { useState } from 'react';
import { useDialogFocus } from './useDialogFocus';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X, Check, ChevronDown, Cpu } from 'lucide-react';
import { PRESETS, PresetSelector } from '../upload/PresetSelector';
import { createConfigDraft, STRATEGY_LABELS, validateUiConfig } from '../../logic/uiConfig';

export function AdvancedConfigModal({
  onClose, onApply, activePresetId, config, selectedStrategy, masterSourceIndex,
  orderFiles, hasCatalog = false, crosswalkCount = 0, isResults = false, manualDecisionCount = 0,
}) {
  const [draft, setDraft] = useState(() => createConfigDraft({ activePresetId, config, selectedStrategy, masterSourceIndex }));
  const [acknowledgedReset, setAcknowledgedReset] = useState(false);
  const dialogRef = useDialogFocus(onClose);
  const validationError = validateUiConfig(draft, { hasCatalog, orderFiles, crosswalkCount });
  const needsResetAcknowledgement = isResults && manualDecisionCount > 0;
  const canApply = !validationError && (!needsResetAcknowledgement || acknowledgedReset);

  const selectPreset = key => setDraft(previous => ({ ...previous, activePresetId: key, config: { ...PRESETS[key].config } }));
  const changeParam = (field, value) => setDraft(previous => ({ ...previous, activePresetId: 'custom', config: { ...previous.config, [field]: value } }));
  const parameters = [
    { field: 'fuzzyConfirmThreshold', label: 'Ngưỡng đưa vào duyệt thủ công', min: 40, max: 90,
      help: 'Ứng viên đạt ngưỡng này nhưng chưa đủ điều kiện tự động ghép sẽ cần người dùng duyệt.' },
    { field: 'fuzzyHighThreshold', label: 'Ngưỡng tự động ghép theo tên', min: 75, max: 99,
      help: 'Chỉ tự động ghép khi đạt ngưỡng, không xung đột ấn bản/biến thể và ứng viên thứ hai kém hơn trên 5 điểm. Điểm tương đồng không phải độ chính xác.' },
    { field: 'priceDeviationThreshold', label: 'Ngưỡng cảnh báo lệch giá', min: 10, max: 60,
      help: 'So sánh với giá tham chiếu từ danh mục hoặc nguồn đối chiếu; đây là cảnh báo cần kiểm tra, không tự sửa giá bán.' },
  ];

  const modal = (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="config-title" aria-describedby="config-description"
        tabIndex={-1} className="bg-white rounded-2xl max-w-3xl w-full max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl border border-slate-200 outline-none">
        <div className="flex items-start justify-between gap-3 p-4 sm:p-6 border-b border-slate-200 shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <SlidersHorizontal size={20} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 id="config-title" className="text-base font-bold text-slate-900">Cấu hình tích hợp & kiểm toán</h2>
              <p id="config-description" className="text-xs text-slate-500 mt-1">Chọn gói cấu hình hoặc tùy chỉnh. Thay đổi chỉ được lưu khi nhấn Áp dụng.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Hủy và đóng cấu hình" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0"><X size={18} /></button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto min-h-0">
          <section aria-labelledby="preset-title">
            <h3 id="preset-title" className="text-xs font-bold text-slate-700 mb-2">Gói cấu hình nghiệp vụ</h3>
            <PresetSelector activePresetId={draft.activePresetId} onSelectPreset={selectPreset} />
            {draft.activePresetId === 'custom' && <p className="text-xs text-indigo-700 mt-2">Đang chọn: Tùy chỉnh tham số riêng.</p>}
          </section>

          <details className="group border border-slate-200 rounded-xl">
            <summary className="p-3.5 cursor-pointer text-xs font-bold text-slate-800 flex items-center gap-2 rounded-xl bg-slate-50">
              <Cpu size={15} className="text-indigo-600 shrink-0" />Tùy chỉnh tham số kỹ thuật<ChevronDown size={15} className="ml-auto shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="p-4 space-y-4 border-t border-slate-200">
              {parameters.map(parameter => (
                <div key={parameter.field}>
                  <div className="flex justify-between items-start gap-2 text-xs mb-2">
                    <label htmlFor={parameter.field} className="font-semibold text-slate-800">{parameter.label}</label>
                    <output htmlFor={parameter.field} className="font-mono text-indigo-700 font-bold">{draft.config[parameter.field]}%</output>
                  </div>
                  <input id={parameter.field} type="range" min={parameter.min} max={parameter.max} value={draft.config[parameter.field]}
                    aria-describedby={parameter.field + '-help'} onChange={event => changeParam(parameter.field, Number(event.target.value))} className="w-full accent-indigo-600" />
                  <p id={parameter.field + '-help'} className="text-[11px] text-slate-500 mt-1">{parameter.help}</p>
                </div>
              ))}
            </div>
          </details>

          <section aria-labelledby="strategy-title" className="space-y-2">
            <h3 id="strategy-title" className="text-xs font-bold text-slate-800">Chiến lược khi không có danh mục chuẩn</h3>
            {hasCatalog ? <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-3">Đã nạp danh mục: sử dụng đối chiếu 3 tầng Mã → Crosswalk → Tên. Các lựa chọn bên dưới chỉ có hiệu lực khi bỏ danh mục.</p>
              : <p className="text-xs text-slate-500">Chọn cách đối chiếu giữa các tệp đơn hàng. Gói nghiệp vụ chỉ điều chỉnh ngưỡng, không tự đổi chiến lược.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="group" aria-labelledby="strategy-title">
              {Object.entries(STRATEGY_LABELS).map(([id, label]) => (
                <button key={id} type="button" disabled={hasCatalog} aria-pressed={draft.selectedStrategy === id}
                  onClick={() => setDraft(previous => ({ ...previous, selectedStrategy: id }))}
                  className={['p-3 rounded-lg text-left border text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed', draft.selectedStrategy === id ? 'bg-indigo-50 text-indigo-800 border-indigo-500' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'].join(' ')}>{label}</button>
              ))}
            </div>
            {!hasCatalog && draft.selectedStrategy === 'MASTER_SOURCE' && (orderFiles.length > 0 ? (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center pt-2">
                <label htmlFor="master-source" className="text-xs font-semibold text-slate-700">Tệp nguồn chuẩn:</label>
                <select id="master-source" value={draft.masterSourceIndex} onChange={event => setDraft(previous => ({ ...previous, masterSourceIndex: Number(event.target.value) }))}
                  className="min-w-0 flex-1 text-xs p-2 border border-slate-300 rounded-lg bg-white">
                  {orderFiles.map((file, index) => <option key={index} value={index}>{file.fileName}</option>)}
                </select>
              </div>
            ) : <p className="text-xs text-amber-700">Sau khi nạp đơn hàng, mở lại cấu hình để chọn tệp nguồn chuẩn.</p>)}
          </section>
          {validationError && <p role="alert" className="text-xs text-rose-800 bg-rose-50 border border-rose-200 p-3 rounded-lg">{validationError}</p>}
          {isResults && <div className="text-xs p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
            <p>Áp dụng sẽ chạy lại dữ liệu. Đóng hoặc Hủy giữ nguyên kết quả hiện tại.</p>
            {needsResetAcknowledgement && <label className="flex items-start gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={acknowledgedReset} onChange={event => setAcknowledgedReset(event.target.checked)} className="mt-0.5 accent-indigo-600" />
              <span>Tôi đồng ý xóa {manualDecisionCount} quyết định HITL của lần chạy hiện tại để duyệt lại.</span>
            </label>}
          </div>}
        </div>

        <div className="p-4 sm:px-6 border-t border-slate-200 flex flex-wrap justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Hủy</button>
          <button type="button" disabled={!canApply} onClick={() => { if (canApply) onApply(draft); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed">
            <Check size={14} />{isResults ? 'Áp dụng và chạy lại' : 'Áp dụng cấu hình'}
          </button>
        </div>
      </section>
    </div>
  );
  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}
