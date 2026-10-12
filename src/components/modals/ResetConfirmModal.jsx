import React from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from './useDialogFocus';

export function ResetConfirmModal({ onClose, onConfirm, decisionCount }) {
  const ref = useDialogFocus(onClose);
  return createPortal(<div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
    <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description"
      className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl outline-none">
      <h2 id="reset-title" className="font-bold text-slate-900">Đổi bộ dữ liệu?</h2>
      <p id="reset-description" className="text-sm text-slate-600 mt-3">Thao tác này xóa các tệp đã nạp và kết quả hiện tại{decisionCount > 0 ? ', cùng ' + decisionCount + ' quyết định HITL' : ''}. Hãy xuất kết quả cần giữ trước khi tiếp tục.</p>
      <div className="flex justify-end gap-2 mt-5">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700">Giữ kết quả</button>
        <button type="button" onClick={onConfirm} className="rounded-lg px-4 py-2 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700">Xóa và đổi file</button>
      </div>
    </section>
  </div>, document.body);
}
