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

### fix: định dạng ngày chứng từ thành Date Value và chuyển ô trống thành null
- Thay đổi `getFormattedDateInfo` để trả về đối tượng `Date` thực sự thay vì chuỗi văn bản cho cột Ngày chứng từ.
- Cấu hình thuộc tính `numberFormat` là `"dd/mm/yyyy"` trong `xlsx-populate` cho cột Ngày chứng từ để đảm bảo Excel nhận diện chính xác kiểu Date.
- Cập nhật logic ghi dữ liệu ô trống từ chuỗi rỗng `""` thành `null` để tạo ô blank thực tế, tương thích tốt với phần mềm kế toán.
- Files:
  - [src/utils/templateExcelExport.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/templateExcelExport.ts)

### feat: tự động dò tìm dòng tiêu đề và ánh xạ cột khi upload hoặc đổi tiêu đề
- Áp dụng thuật toán tính điểm dòng tiêu đề dựa trên từ khóa kế toán trong `detectSheetSettings` để tự động dò tìm dòng tiêu đề tối ưu nhất (Header Row) khi upload file.
- Hỗ trợ tự động ánh xạ cột Ngày tháng, Diễn giải, Số tiền theo dòng tiêu đề được phát hiện.
- Cập nhật `handleSettingsUpdate` để tự động quét lại dòng tiêu đề mới và cập nhật lại các cột tương ứng khi dòng tiêu đề thay đổi qua dropdown.
- Dọn dẹp khối code tự dò tìm bị trùng lặp/thừa trong `processFile`.
- Files:
  - [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx)

---

*Cập nhật tự động bởi update-docs*
