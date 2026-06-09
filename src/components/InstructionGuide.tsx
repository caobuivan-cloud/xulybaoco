/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { CheckCircle2, ChevronRight, HelpCircle, FileSpreadsheet, Settings2, Sparkles, Filter } from "lucide-react";

export const InstructionGuide: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6" id="usage-guide-panel">
      <div>
        <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sky-500" />
          Hướng Dẫn Quy Trình Xử Lý Sổ Phụ
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Hệ thống được thiết kế hoàn toàn tự động hóa quy trình rà soát sổ phụ ngân hàng truyền thống của kế toán công ty.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Step 1 card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs mb-3 font-mono">
              01
            </div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-sky-500" />
              Đọc & Cấu hình File
            </h3>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Tải file Excel sổ phụ của bất kỳ ngân hàng nào lên. Do các ngân hàng có cấu trúc dòng tiêu đề khác nhau, bạn có thể dễ dàng chọn dòng bắt đầu tiêu đề dữ liệu (Header Row) và gán cột tương ứng cho: <strong>Ngày</strong>, <strong>Diễn giải</strong>, và <strong>Số tiền (Mặc định Cột D)</strong>.
            </p>
          </div>
          <div className="text-[10px] text-sky-600 font-semibold bg-sky-50 border border-sky-100 mt-4 px-2 py-1 rounded inline-block text-center select-none">
            Auto-detect cấu trúc Excel
          </div>
        </div>

        {/* Step 2 card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs mb-3 font-mono">
              02
            </div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-500" />
              Rà soát Từ khóa
            </h3>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Bạn truy cập Tab <strong>"Quản lý Từ hóa & Khách hàng"</strong> để cập nhật danh sách quy tắc của công ty. Chương trình sẽ dò sâu chuỗi ký tự trong cột <strong>Mô tả/Diễn giải</strong> để tự động điền <strong>Tên Khách Hàng</strong> & <strong>Mã Khách Hàng</strong> phù hợp.
            </p>
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 mt-4 px-2 py-1 rounded inline-block text-center select-none">
            Áp dụng khớp tham lam (Greedy)
          </div>
        </div>

        {/* Step 3 card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs mb-3 font-mono">
              03
            </div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-sky-500" />
              Gom Nhóm Số Phiếu
            </h3>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Thuật toán nhóm tất cả các giao dịch phát sinh trong cùng một ngày đưa vào chung **1 số phiếu duy nhất**. Bạn có thể tùy chọn tiền tố của số phiếu (ví dụ: <code>VOUCHER</code>, <code>PT-</code>, <code>SP-</code>) và cách đánh số theo định dạng ngày hoặc số thứ tự tăng dần.
            </p>
          </div>
          <div className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 border border-indigo-100 mt-4 px-2 py-1 rounded inline-block text-center select-none">
            Tự động đánh phiếu theo ngày
          </div>
        </div>

        {/* Step 4 card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs mb-3 font-mono">
              04
            </div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-sky-500" />
              Lọc & Xuất File Excel
            </h3>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Bộ lọc nâng cao tự động **loại bỏ các dòng có số tiền &lt;= 0** (Chỉ giữ lại các dòng thu thực tế &gt; 0 tại Cột D). Đồng thời tạo tiêu đề cột mới tinh gọn bao gồm các trường chuẩn hóa để bạn tải xuống dưới dạng file Excel sẵn sàng nộp báo cáo hoặc nhập liệu vào phần mềm Misa/ERP.
            </p>
          </div>
          <div className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-100 mt-4 px-2 py-1 rounded inline-block text-center select-none">
            Chỉ xuất dòng tiền dương &gt; 0
          </div>
        </div>
      </div>

      <div className="bg-sky-50/50 rounded-xl p-5 border border-sky-100">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-sky-600" />
          Tiêu chuẩn định dạng dữ liệu đầu vào:
        </h4>
        <ul className="text-xs text-sky-900/80 space-y-2 pl-1 select-text">
          <li className="flex items-center gap-2">
            <ChevronRight className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            Có thể nạp tệp định dạng <strong>.xlsx, .xls, .xlsm, .csv</strong>.
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            Cột Ngày: chấp nhận định dạng Excel Date Serial gốc hoặc các định dạng ngày viết tay trực tiếng Việt như <code>dd/mm/yyyy</code>, <code>yyyy-mm-dd</code>.
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            Cột Số Tiền (Cột D): chấp nhận số thô hoặc số đã định dạng tiền tệ chuyên sâu có chứa phân tách phần nghìn dấu chấm (kiểu Việt Nam) hoặc dấu phẩy (kiểu Mỹ).
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            Không giới hạn số lượng dòng giao dịch. Chương trình xử lý cục bộ ngay trên trình duyệt nên tuyệt đối bảo mật thông tin tài chính của đơn vị.
          </li>
        </ul>
      </div>
    </div>
  );
};
