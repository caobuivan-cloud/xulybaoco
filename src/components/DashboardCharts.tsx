/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { ProcessedRow } from "../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { TrendingUp, Users, FileSpreadsheet, ShieldAlert } from "lucide-react";

interface DashboardChartsProps {
  data: ProcessedRow[];
}

const COLORS = ["#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd", "#e0f2fe"];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ data }) => {
  
  // Format Currency VND helper
  const formatVND = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(value);
  };

  const stats = useMemo(() => {
    if (data.length === 0) return null;

    let totalAmount = 0;
    let matchedCount = 0;
    const customerMap: { [code: string]: { name: string; amount: number; count: number } } = {};
    const dateMap: { [date: string]: { amount: number; count: number } } = {};

    data.forEach(row => {
      totalAmount += row.amount;
      if (row.matchedKeyword !== null) {
        matchedCount++;
      }

      // Group by Customer code
      const cCode = row.customerCode;
      if (!customerMap[cCode]) {
        customerMap[cCode] = { name: row.customerName, amount: 0, count: 0 };
      }
      customerMap[cCode].amount += row.amount;
      customerMap[cCode].count += 1;

      // Group by date
      const dStr = row.dateStr;
      if (!dateMap[dStr]) {
        dateMap[dStr] = { amount: 0, count: 0 };
      }
      dateMap[dStr].amount += row.amount;
      dateMap[dStr].count += 1;
    });

    const matchRate = Math.round((matchedCount / data.length) * 100);

    // Prepare customer chart data
    const customerChartData = Object.keys(customerMap).map(code => ({
      code,
      name: customerMap[code].name,
      amount: customerMap[code].amount,
      count: customerMap[code].count
    })).sort((a, b) => b.amount - a.amount).slice(0, 5); // top 5 customers

    // Prepare date chart data (sorted ascending)
    const dateChartData = Object.keys(dateMap).map(date => ({
      date,
      amount: dateMap[date].amount,
      count: dateMap[date].count
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Match / Unmatched pie data
    const matchPieData = [
      { name: "Khách khớp mã", value: matchedCount, count: matchedCount },
      { name: "Khách vãng lai", value: data.length - matchedCount, count: data.length - matchedCount }
    ];

    return {
      totalAmount,
      matchedCount,
      unmatchedCount: data.length - matchedCount,
      matchRate,
      customerChartData,
      dateChartData,
      matchPieData
    };
  }, [data]);

  if (!stats) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center" id="no-charts-data">
        <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-700">Chưa có số liệu phân tích</h3>
        <p className="text-slate-400 text-sm mt-1">Vui lòng tải lên file Excel nội dung bank và tiến hành xử lý để hiển thị biểu đồ.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="dashboard-graphics">
      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Total Money */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Tổng Dòng Tiền Thu (&gt;0)</span>
            <span className="text-lg font-bold font-mono text-slate-800 block mt-0.5">{formatVND(stats.totalAmount)}</span>
            <span className="text-slate-500 text-xs block">Trên {data.length} dòng giao dịch</span>
          </div>
        </div>

        {/* Card Top Customers */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Khớp Tự Động</span>
            <span className="text-lg font-bold text-slate-800 block mt-0.5">{stats.matchedCount} giao dịch</span>
            <span className="text-emerald-600 text-xs font-medium block">Tỷ lệ chính xác: {stats.matchRate}%</span>
          </div>
        </div>

        {/* Card Dates */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Tổng số phiếu</span>
            <span className="text-lg font-bold text-slate-800 block mt-0.5">{stats.dateChartData.length} số phiếu</span>
            <span className="text-slate-500 text-xs block">Theo số ngày có phát sinh</span>
          </div>
        </div>

        {/* Unmatched / General */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Khách Vãng Lai</span>
            <span className="text-lg font-bold text-slate-800 block mt-0.5">{stats.unmatchedCount} giao dịch</span>
            <span className="text-slate-500 text-xs block">Không khớp keyword mô tả</span>
          </div>
        </div>
      </div>

      {/* Recharts Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Dynamic Top Customer Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-slate-800 mb-4 text-xs tracking-wider uppercase">Top 5 Khách Hàng Có Phát Sinh Giao Dịch Nhiều Nhất (VND)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.customerChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                <Tooltip
                  formatter={(v: any) => [formatVND(v as number), "Doanh số dòng"]}
                  labelFormatter={(idx, list) => {
                    const found = stats.customerChartData.find(item => item.code === idx);
                    return found ? `${found.code} - ${found.name}` : String(idx);
                  }}
                  contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="amount" fill="#0284c7" radius={[4, 4, 0, 0]}>
                  {stats.customerChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Match allocation Pie Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-1">
          <h3 className="font-bold text-slate-800 mb-4 text-xs tracking-wider uppercase">Phân Bổ Định Danh</h3>
          <div className="h-64 flex flex-col justify-between">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.matchPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="#0284c7" />
                    <Cell fill="#cbd5e1" />
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} giao dịch`]} contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Pie Legend styling */}
            <div className="text-xs space-y-2 border-t border-slate-50 pt-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 block"></span>
                  Khớp Mã Định Danh:
                </span>
                <span className="font-semibold text-slate-800">{stats.matchedCount} ({stats.matchRate}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 block"></span>
                  Khách vãng lại (Không khớp):
                </span>
                <span className="font-semibold text-slate-800">{stats.unmatchedCount} ({100 - stats.matchRate}%)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Chart 3: Chronological Dates Line Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm w-full">
        <h3 className="font-bold text-slate-800 mb-4 text-xs tracking-wider uppercase">Dòng Tiền Chi Tiết Theo Các Ngày Phát Sinh (Giao Dịch Có Số Tiền &gt; 0)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.dateChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
              <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
              <Tooltip
                formatter={(v: any) => [formatVND(v as number), "Dòng tiền"]}
                contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Line
                type="monotone"
                dataKey="amount"
                name="Tổng tiền đã nhận (VND)"
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
