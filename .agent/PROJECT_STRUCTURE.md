# Project Structure - XuLyBaoCo

> Tạo ngày: 2026-06-15
> Cập nhật gần nhất: 2026-06-15
> Mục đích: Lưu snapshot cấu trúc codebase để AI có thể onboard và resume nhanh.

---

## 1. Snapshot cây thư mục

```text
XuLyBaoCo/
|-- .agent/
|   |-- skills/
|   |   |-- ...
|   |-- CONTEXT.md
|   |-- KNOWLEDGE_BASE.md
|   |-- PROJECT_STRUCTURE.md
|-- public/
|   |-- templates/
|   |   |-- chi_tien_nh.xlsx           # Tệp mẫu hạch toán Báo Nợ (chi tiền ngân hàng)
|   |   |-- thu_tien_nh.xlsx           # Tệp mẫu hạch toán Báo Có (thu tiền ngân hàng)
|-- src/
|   |-- components/
|   |   |-- DashboardCharts.tsx        # Biểu đồ thống kê số tiền hạch toán, số dòng khớp/không khớp
|   |   |-- GoogleSheetsSettings.tsx    # Giao diện cấu hình Web App URL kết nối Google Sheets
|   |   |-- InstructionGuide.tsx        # Hướng dẫn sử dụng cho kế toán viên trên UI
|   |   |-- RulesEditor.tsx             # Trình quản lý quy tắc từ khóa (Keyword Rules)
|   |-- types/
|   |   |-- xlsx-populate.d.ts         # Khai báo kiểu TypeScript cho thư viện xlsx-populate
|   |-- utils/
|   |   |-- excelProcessor.ts           # Xử lý và làm sạch dữ liệu, nhận diện từ khóa, sinh số phiếu
|   |   |-- excelTemplatesBase64.ts     # Dữ liệu mã hóa Base64 nhúng của các tệp mẫu Excel
|   |   |-- googleSheetsSync.ts         # Đồng bộ quy tắc và nhật ký hạch toán với Google Sheets
|   |   |-- rulesStore.ts               # Tải/Lưu quy tắc từ khóa local (LocalStorage)
|   |   |-- templateExcelExport.ts      # Xuất dữ liệu hạch toán theo tệp Excel mẫu bằng xlsx-populate
|   |-- App.tsx                         # Component giao diện chính kiểm soát luồng nghiệp vụ
|   |-- index.css                       # CSS toàn cục, tích hợp font chữ và Tailwind CSS v4
|   |-- main.tsx                        # Entry point của ứng dụng React
|   |-- types.ts                        # Định nghĩa kiểu dữ liệu dùng chung
|-- .env.example                        # Mẫu cấu hình môi trường
|-- index.html                          # Trang HTML chính của Single Page App
|-- package.json                        # Khai báo dependencies (react, xlsx-populate, v.v.), devDependencies và scripts
|-- tsconfig.json                       # Cấu hình compiler TypeScript
|-- vite.config.ts                      # Cấu hình bundler Vite và alias `@`
```

---

## 2. Entry Points

| Loại | File/Path | Vai trò | Ghi chú |
|------|-----------|---------|---------|
| Frontend | `src/main.tsx` | Khởi chạy và render ứng dụng React lên DOM | Cổng vào chính |
| Router / App | `src/App.tsx` | Điều phối toàn bộ component, state quản lý file Excel, luật hạch toán | Single Page App |

---

## 3. Services / Modules chính

| Module/Service | Path | Trách nhiệm | Phụ thuộc chính |
|----------------|------|-------------|------------------|
| Excel Parser & Mapping | `src/utils/excelProcessor.ts` | Làm sạch số tiền, tách ngày, so khớp từ khóa và sinh mã phiếu hạch toán nhóm theo ngày | Sử dụng thư viện `xlsx` và thuật toán sắp xếp độ dài keyword |
| Template Excel Export Utility | `src/utils/templateExcelExport.ts` | Tải file mẫu tĩnh và ghi đè dữ liệu hạch toán báo nợ/có bảo toàn định dạng cũ | Thư viện `xlsx-populate` và `src/types.ts` |
| Google Sheets Connector | `src/utils/googleSheetsSync.ts` | Gửi/nhận danh sách luật keyword và log hoạt động của kế toán viên qua Web App API | Google Apps Script (Web App URL) |
| Local Rules Storage | `src/utils/rulesStore.ts` | Đọc/ghi và migrate danh sách từ khóa cục bộ | LocalStorage |

---

## 4. Config / Infra quan trọng

| File | Nhóm | Ý nghĩa | Lưu ý khi chỉnh sửa |
|------|------|---------|---------------------|
| `package.json` | Build/Deps | Định nghĩa thư viện (React 19, Tailwind CSS v4, Lucide, Recharts, xlsx-populate) và scripts chạy dự án | Cần chú ý độ tương thích khi nâng cấp thư viện |
| `vite.config.ts` | Build Config | Cấu hình plugin React, Tailwind CSS v4, tắt HMR hoặc watch khi môi trường yêu cầu tiết kiệm tài nguyên | Lưu ý config HMR phụ thuộc biến `DISABLE_HMR` |
| `src/index.css` | Styling | Nhập font chữ Google (Inter, JetBrains Mono, Space Grotesk) và khởi động Tailwind v4 | Cấu hình `@theme` nằm trực tiếp trong file này |

---

## 5. Commands

| Mục đích | Lệnh | Điều kiện | Ghi chú |
|----------|------|-----------|---------|
| Chạy local | `npm run dev` | Không yêu cầu đặc biệt | Khởi động server local tại port 3000 |
| Build | `npm run build` | Không có lỗi TypeScript | Output nằm trong thư mục `dist/` |
| Lint / Check Type | `npm run lint` | Đã cài đặt npm packages | Chạy lệnh `tsc --noEmit` kiểm tra kiểu |
| Clean | `npm run clean` | Hỗ trợ lệnh rm (Unix hoặc Git Bash) | Xóa thư mục `dist` và file `server.js` |

---

## 6. Luồng đọc nhanh cho AI

- **Khi sửa giao diện hoặc bố cục chức năng**: Đọc [App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx) trước để định vị component con tương ứng trong [src/components/](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/components/).
- **Khi sửa logic lọc dòng Excel hoặc thuật toán đối chiếu**: Đọc [excelProcessor.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/excelProcessor.ts) và các định nghĩa kiểu trong [types.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/types.ts).
- **Khi cần thay đổi cơ chế sync với Google Sheets**: Đọc [googleSheetsSync.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/googleSheetsSync.ts).
- **Khi cần thay đổi giá trị từ khóa mặc định hoặc di trú dữ liệu cũ**: Đọc [rulesStore.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/rulesStore.ts).

---

## 7. Ghi chú từ lần quét đầu

- **Package manager**: `npm`
- **Kiểu repo**: Single SPA (Vite + React)
- **Điểm dễ nhầm**:
  - Khi khớp từ khóa đối chiếu, danh sách từ khóa được sắp xếp giảm dần theo chiều dài kí tự để tránh trường hợp từ khóa ngắn tranh chấp và khớp đè lên từ khóa dài chứa nó (ví dụ: từ khóa `"VCCORP"` dài hơn sẽ được ưu tiên khớp trước `"VC"`).
  - Số tiền (amount) phải luôn > 0 mới được đưa vào danh sách hạch toán.
  - Số phiếu (`voucherNo`) gom nhóm các dòng giao dịch có cùng ngày hạch toán thành một số phiếu duy nhất để phục vụ mục tiêu hạch toán tập trung.
