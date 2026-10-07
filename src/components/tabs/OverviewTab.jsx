import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, ShoppingBag } from "lucide-react";
import { formatVND } from "../dashboard/MetricStatCards";

export function OverviewTab({ revenueByChannel, topProducts }) {
  const PALETTE = ["#4F46E5", "#059669", "#D97706", "#2563EB", "#7C3AED", "#E11D48"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Doanh thu theo kênh */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Giá trị bán đủ điều kiện theo kênh
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Theo điều kiện ghi nhận</span>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={revenueByChannel} margin={{ left: 0, right: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="kenh"
              tick={{ fontSize: 12, fill: "#64748B" }}
              axisLine={{ stroke: "#E2E8F0" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000000).toFixed(1)}Tr`}
            />
            <Tooltip
              formatter={(v) => [formatVND(v), "Giá trị bán đủ điều kiện"]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #E2E8F0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            />
            <Legend
              formatter={() => "Giá trị đủ điều kiện (VNĐ)"}
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar dataKey="doanhThu" name="Doanh thu" radius={[6, 6, 0, 0]}>
              {revenueByChannel.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top sản phẩm bán chạy */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag size={15} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Top Sản Phẩm Bán Chạy Nhất (Đã Quy Chuẩn)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Số lượng bán</span>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="ten"
              width={140}
              tick={{ fontSize: 11, fill: "#334155" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v && v.length > 18 ? v.slice(0, 18) + "…" : v)}
            />
            <Tooltip
              formatter={(v) => [v, "Số lượng đã bán"]}
              labelFormatter={(label) => `Sản phẩm: ${label}`}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #E2E8F0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            />
            <Bar dataKey="soLuong" name="Số lượng" radius={[0, 6, 6, 0]} fill="#059669" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
