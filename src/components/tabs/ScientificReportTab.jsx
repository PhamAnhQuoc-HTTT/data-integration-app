import React from "react";
import {
  FileText,
  BarChart3,
  GitMerge,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
} from "lucide-react";
import { AcademicBadge } from "../common/Badge";
import { formatVND } from "../dashboard/MetricStatCards";

export function ScientificReportTab({ result, config, liveMatchRate }) {
  const norm = result.normStats || {};
  const res = result.resolutionStats || null;
  const gov = result.governanceAudit || {};

  return (
    <div className="space-y-6">
      {/* ==================== PHẦN 1: RQ1 ==================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              01
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Chuẩn Hóa Đa Nguồn & Khắc Phục Xung Đột Định Dạng
              </h3>
              <p className="text-xs text-slate-500">
                Xử lý tính không đồng nhất về cấu trúc, định dạng và mã hóa dữ liệu đa kênh
              </p>
            </div>
          </div>
          <AcademicBadge code="RQ1" label="Preprocessing Pipeline" />
        </div>

        {/* 4 Cards Thống kê trường chuẩn hóa */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-0.5">
              Mã Định Danh (SKU)
            </span>
            <span className="text-xl font-bold font-mono text-indigo-700">
              {norm.idCount || 0}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">trường đã làm sạch</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-0.5">
              Tên & Thương Hiệu
            </span>
            <span className="text-xl font-bold font-mono text-indigo-700">
              {norm.textCount || 0}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">chuỗi đã chuẩn hóa</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-0.5">
              Thời Gian (ISO Date)
            </span>
            <span className="text-xl font-bold font-mono text-indigo-700">
              {norm.dateCount || 0}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">ngày tháng đồng bộ</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-0.5">
              Kênh & Trạng Thái
            </span>
            <span className="text-xl font-bold font-mono text-indigo-700">
              {(norm.channelCount || 0) + (norm.statusCount || 0)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">danh mục quy chuẩn</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
          <strong className="text-slate-900">Quy chuẩn học thuật:</strong> Pipeline xử lý theo 7 nhóm chuẩn hóa cốt lõi:
          (1) Mã SKU/Barcode định dạng chuẩn, (2) Chuẩn hóa Unicode NFC & loại bỏ khoảng trắng dư, (3) Định dạng số học tiền tệ loại bỏ ký hiệu tiền và phân tách hàng nghìn, (4) Đồng bộ ngày tháng đa chuẩn về ISO 8601 (hỗ trợ cả Excel serial date), (5) Ánh xạ danh mục kênh & trạng thái về tập từ vựng chuẩn, (6) Unpivot đa chi nhánh về dạng bảng quan hệ phẳng, (7) Mã hóa UTF-8 an toàn.
        </div>
      </div>

      {/* ==================== PHẦN 2: RQ2 ==================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              02
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Đánh Giá Thực Nghiệm Đối Chiếu Thực Thể (Entity Resolution Benchmark)
              </h3>
              <p className="text-xs text-slate-500">
                So sánh hiệu quả phương pháp Multi-tier Matching (3 tầng) so với Exact Matching đơn thuần
              </p>
            </div>
          </div>
          <AcademicBadge code="RQ2" label="Multi-tier vs Exact" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Card 1: Exact Only */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-center">
            <span className="text-[11px] uppercase font-bold text-slate-500 block mb-1">
              Exact Matching Đơn Thuần
            </span>
            <div className="text-3xl font-black font-mono text-slate-600 mt-2">
              {res ? `${res.exactMatchRate}%` : "—"}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {res ? `${res.exactOnlyMatchesCount}/${result.stats.totalRows} đơn được định danh` : "Không có catalog đối chiếu"}
            </span>
          </div>

          {/* Card 2: Multi-tier Engine */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 text-center">
            <span className="text-[11px] uppercase font-bold text-indigo-800 block mb-1">
              Multi-tier Matching Đề Xuất
            </span>
            <div className="text-3xl font-black font-mono text-indigo-700 mt-2">
              {res ? `${res.multiTierTotalLinkedRate}%` : `${liveMatchRate}%`}
            </div>
            <span className="text-[11px] text-indigo-600 mt-1 block font-medium">
              {res ? "Tầng 1 (Mã) + Tầng 2 (Crosswalk) + Tầng 3 (Fuzzy)" : (result.strategyLabel || "Tự động phân giải thực thể")}
            </span>
          </div>

          {/* Card 3: Improvement Delta */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 text-center">
            <span className="text-[11px] uppercase font-bold text-emerald-800 block mb-1">
              Mức Độ Cải Thiện (Delta)
            </span>
            <div className="text-3xl font-black font-mono text-emerald-600 mt-2">
              {res ? `+${res.improvementRate}%` : (liveMatchRate > 0 ? `+${liveMatchRate}%` : "—")}
            </div>
            <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
              Nhận diện biến thể tên, thiếu dấu, sai mã SKU
            </span>
          </div>
        </div>

        {res?.breakdown && (
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
            <div className="font-semibold text-slate-800 mb-1">
              Phân rã số liệu các tầng đối chiếu thực thể:
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10.5px] bg-indigo-100 text-indigo-800">
                Tầng 1 (Exact ID):
              </span>
              <span><strong>{res.breakdown.tier1_exact}</strong> đơn hàng khớp tuyệt đối theo mã SKU/Barcode gốc.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10.5px] bg-blue-100 text-blue-800">
                Tầng 2 (Crosswalk):
              </span>
              <span><strong>{res.breakdown.tier2_crosswalk}</strong> đơn hàng khớp qua bảng tra cứu mã tương đương nội bộ.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10.5px] bg-teal-100 text-teal-800">
                Tầng 3 (Fuzzy Token):
              </span>
              <span>
                <strong>{res.breakdown.tier3_fuzzy_high}</strong> tự động ghép chắc chắn +{" "}
                <strong>{res.breakdown.tier3_fuzzy_confirm}</strong> chuyển phân hệ xác nhận có giám sát (HITL).
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ==================== PHẦN 3: RQ3 ==================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs">
              03
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Kiểm Toán Quản Trị & Đảm Bảo Doanh Thu Thực (Revenue Assurance)
              </h3>
              <p className="text-xs text-slate-500">
                Đánh giá tác động của kiểm soát chất lượng dữ liệu đối với độ tin cậy của báo cáo doanh thu
              </p>
            </div>
          </div>
          <AcademicBadge code="RQ3" label="Governance & Audit" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-center">
            <span className="text-[11px] uppercase font-bold text-slate-500 block mb-1">
              Doanh Thu Thô Ban Đầu
            </span>
            <div className="text-xl font-black font-mono text-slate-700 mt-2">
              {formatVND(gov.rawRevenueTotal || result.revenueTotal)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Bao gồm cả đơn hủy & hoàn</span>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 text-center">
            <span className="text-[11px] uppercase font-bold text-emerald-800 block mb-1">
              Doanh Thu Thực Tế (Sạch)
            </span>
            <div className="text-xl font-black font-mono text-emerald-700 mt-2">
              {formatVND(gov.cleanRevenueTotal || result.revenueTotal)}
            </div>
            <span className="text-[11px] text-emerald-600 mt-1 block font-medium">
              Đã loại bỏ sai lệch và đơn hủy
            </span>
          </div>

          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 text-center">
            <span className="text-[11px] uppercase font-bold text-rose-800 block mb-1">
              Doanh Thu Ảo Loại Trừ
            </span>
            <div className="text-xl font-black font-mono text-rose-600 mt-2">
              {formatVND(gov.revenueDiscrepancyPrevented || 0)}
            </div>
            <span className="text-[11px] text-rose-600 mt-1 block font-medium">
              Tránh sai lệch trong báo cáo tài chính
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Hợp nhất phân mảnh tên sản phẩm:</strong> Từ{" "}
              <span className="font-mono font-bold text-slate-900">{gov.rawUniqueTitlesCount || 0}</span> biến thể
              tên thô rải rác giữa các sàn TMĐT được quy tụ về{" "}
              <span className="font-mono font-bold text-emerald-700">{gov.cleanUniqueProductsCount || 0}</span> thực thể
              chuẩn duy nhất.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Ngăn chặn ghi nhận doanh thu ảo:</strong> Hệ thống gắn cờ và trừ bỏ{" "}
              <span className="font-mono font-bold text-rose-700">{formatVND(gov.cancelledRevenuePrevented || 0)}</span> từ
              các đơn hàng có trạng thái Đã hủy hoặc Trả hàng, đảm bảo tính chuẩn xác cho báo cáo quản trị.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
