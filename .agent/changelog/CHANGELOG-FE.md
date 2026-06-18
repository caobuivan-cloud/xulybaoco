# Changelog FE - XuLyBaoCo

> Phạm vi: Frontend, UI, UX, state client, routing, hiển thị, validation phía client
> Format: [Conventional Commits](https://www.conventionalcommits.org/)
> Ngôn ngữ: Tiếng Việt

---

## 2026-06-17

### feat: hỗ trợ tải và ghi đè dữ liệu lên file Excel mẫu báo có/báo nợ (xlsx-populate) và hỗ trợ đa sheet
- Thêm giao diện chọn sheet khi tải lên tệp Excel có nhiều sheet.
- Bổ sung bảng cấu hình tham số xuất hạch toán báo có/báo nợ (mã DVCS, mã GD, mã KH, TK Nợ, TK Có) trực tiếp trên giao diện xuất dữ liệu.
- Tích hợp tính năng tự động ghi dữ liệu vào các tệp Excel mẫu tĩnh `thu_tien_nh.xlsx` và `chi_tien_nh.xlsx` thông qua thư viện `xlsx-populate` ở client-side, bảo toàn đầy đủ các công thức và style của mẫu kế toán.
- Ghi log hành động cụ thể khi người dùng thực hiện xuất file mẫu thành công.
- Files:
  - [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx)
  - [src/types.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/types.ts)
  - [src/utils/templateExcelExport.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/templateExcelExport.ts)
  - [src/types/xlsx-populate.d.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/types/xlsx-populate.d.ts)
  - [package.json](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/package.json)

---

## 2026-06-18

### fix: xử lý chuyển đổi nạp file mẫu Excel từ fetch tĩnh sang Base64 nhúng để vượt qua sandbox iframe/GAS
- Nhúng toàn bộ file Excel mẫu tĩnh `thu_tien_nh.xlsx` và `chi_tien_nh.xlsx` thành mã hóa Base64 trong mã nguồn tại `src/utils/excelTemplatesBase64.ts`.
- Chuyển logic xuất tệp mẫu Excel sử dụng trực tiếp ArrayBuffer từ giải mã Base64 thay vì fetch đường dẫn tĩnh. Điều này ngăn chặn lỗi Zip parsing (`Can't find end of central directory : is this a zip file ?`) trong môi trường sandbox của iframe / Google Apps Script Web App.
- Thêm thuộc tính `mode: "no-cors"` vào các yêu cầu POST tới Google Apps Script Web App trong `googleSheetsSync.ts` (`writeActionLogToSheet` và `pushRulesToGoogleSheet`) để tránh bị chặn bởi CORS khi hoạt động trong môi trường sandbox/iframe.
- Files:
  - [src/utils/excelTemplatesBase64.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/excelTemplatesBase64.ts)
  - [src/utils/templateExcelExport.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/templateExcelExport.ts)
  - [src/utils/googleSheetsSync.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/googleSheetsSync.ts)

---

*Cập nhật tự động bởi update-docs*
