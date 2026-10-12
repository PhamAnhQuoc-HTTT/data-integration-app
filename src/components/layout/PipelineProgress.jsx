import React from 'react';
import { Loader2 } from 'lucide-react';

export function PipelineProgress() {
  const stages = [
    ['RQ1', 'Tiền xử lý & chuẩn hóa', 'Ánh xạ cột, xử lý bảng ngang và chuẩn hóa định dạng.'],
    ['RQ2', 'Đối chiếu sản phẩm sách', 'Liên kết theo mã, Crosswalk và tên; giữ riêng trường hợp chưa xác định.'],
    ['RQ3', 'Kiểm soát chất lượng', 'Phát hiện vấn đề theo sáu nhóm quy tắc.'],
    ['GOV', 'Tổng hợp kết quả', 'Xét điều kiện ghi nhận giá trị bán và tạo dữ liệu tích hợp.'],
  ];
  return (
    <section aria-busy="true" className="max-w-2xl mx-auto my-8 p-5 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="text-center">
        <Loader2 size={28} aria-hidden="true" className="animate-spin mx-auto text-indigo-600 mb-4" />
        <h2 role="status" className="text-lg font-bold text-slate-900">Đang xử lý dữ liệu</h2>
        <p className="text-xs text-slate-500 mt-2">Vui lòng chờ hệ thống hoàn tất. Các công đoạn của pipeline:</p>
      </div>
      <ol className="space-y-3 mt-6">
        {stages.map(([code, title, description]) => (
          <li key={code} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">{code}</span>
              <span className="text-xs font-semibold text-slate-800">{title}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
