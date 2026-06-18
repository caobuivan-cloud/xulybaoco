# Feature Plan: Định dạng cột ngày chứng từ xuất ra dd/MM/yyyy

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã thông qua review hội đồng ngày 2026-06-18
> **Feature slug**: export-voucher-date-format-ddmmyyyy
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-18

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Hiện tại, khi xuất tệp hạch toán Báo Có / Báo Nợ (cả hai chế độ: sử dụng tệp mẫu Excel `xlsx-populate` và tạo file mới qua `xlsx`), cột ngày chứng từ (cột F - `ngay_ct`) đang được định dạng theo kiểu `m/d/yyyy` (ví dụ: `5/29/2026`).
- **Vấn đề cần giải quyết:** Định dạng ngày `m/d/yyyy` gây khó khăn cho việc import vào phần mềm kế toán hoặc theo dõi của bộ phận kế toán vốn quen thuộc với chuẩn Việt Nam `dd/MM/yyyy`. Do đó, cần bắt buộc định dạng của cột này khi xuất file Excel là `dd/MM/yyyy`.
- **Mục tiêu:** Đồng bộ định dạng cột "Ngày chứng từ" (`ngay_ct`) thành `dd/MM/yyyy` ở tất cả các luồng xuất file Excel.
- **Kết quả mong đợi:** Tất cả các bản xuất Excel của "Báo Có" và "Báo Nợ" đều ghi nhận ngày hạch toán ở định dạng `dd/MM/yyyy` (ví dụ: `29/05/2026`).

## 2. Phạm vi

### In scope
- Cập nhật hàm `getFormattedDateInfo` trong [templateExcelExport.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/templateExcelExport.ts) để trả về định dạng `dd/MM/yyyy` cho thuộc tính `mdy`.
- Cập nhật hàm `getFormattedDateInfo` trong [App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx) (phần xử lý xuất file chuẩn) để tương tự trả về định dạng `dd/MM/yyyy` cho thuộc tính `mdy`.

### Out of scope
- Thay đổi logic phân tích/chuẩn hóa ngày gốc trong `excelProcessor.ts` (logic này vẫn giữ nguyên định dạng lưu trữ nội bộ `YYYY-MM-DD` để phục vụ so sánh, gom nhóm và sắp xếp).

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** 
  - Đảm bảo giữ nguyên thư viện `xlsx-populate` để ghi đè giữ nguyên định dạng style phức tạp của template Excel.
- **"Cấm kỵ" cần tránh:** 
  - Không phá vỡ định dạng ngày tháng hiển thị trên giao diện làm việc (chỉ thay đổi định dạng ngày xuất file).
- **Ràng buộc kiến trúc liên quan:**
  - Logic xuất file Excel theo mẫu template Base64 và logic sinh file Excel trực tiếp phải khớp định dạng ngày với nhau.

## 4. Giả định và câu hỏi mở

### Giả định
- Thuộc tính `mdy` trong hàm `getFormattedDateInfo` được đặt tên từ ban đầu viết tắt cho "month-day-year". Chúng ta giữ nguyên tên thuộc tính này trong object trả về để tránh phải đổi tên biến ở các dòng tham chiếu phía dưới, chỉ thay đổi định dạng chuỗi sinh ra thành `dd/MM/yyyy`.

### Câu hỏi mở
- Không có câu hỏi mở chặn (non-blocking).

## 5. Acceptance Criteria

- [ ] Khi xuất file Excel Báo Có/Báo Nợ sử dụng template (xlsx-populate), cột F (Ngày chứng từ) hiển thị đúng định dạng `dd/MM/yyyy` (ví dụ: `29/05/2026`).
- [ ] Khi xuất file Excel Báo Có/Báo Nợ không sử dụng template (phương thức sinh file chuẩn bằng `xlsx`), cột F (Ngày chứng từ) hiển thị đúng định dạng `dd/MM/yyyy`.
- [ ] Các ngày có ngày/tháng nhỏ hơn 10 phải được đệm số 0 ở đầu (ví dụ: ngày 9 tháng 5 năm 2026 hiển thị là `09/05/2026` chứ không phải `9/5/2026`).

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| [templateExcelExport.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/templateExcelExport.ts) | Sửa | Hàm `getFormattedDateInfo` định dạng ngày xuất Excel mẫu | 🟢 Thấp | Có |
| [App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx) | Sửa | Hàm `getFormattedDateInfo` định dạng ngày xuất Excel chuẩn | 🟢 Thấp | Không |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** Không có risk hotspot đặc biệt vì thay đổi chỉ nằm ở tầng định dạng chuỗi xuất Excel.
- **Review focus areas:** Đảm bảo hàm định dạng hoạt động tốt với cả chuỗi ngày phân tách bằng dấu gạch ngang `-` (định dạng nội bộ `YYYY-MM-DD`) và dấu gạch chéo `/` (nếu người dùng sửa thủ công hoặc dữ liệu gốc chưa chuẩn hóa).
- **Known pitfalls / historical issues:** Định dạng ngày bị lệch giữa môi trường Excel trên các hệ điều hành khác nhau có cấu hình vùng (Region Locale) khác nhau. Định dạng cứng chuỗi text `dd/MM/yyyy` sẽ giảm thiểu rủi ro tự động parse sai của Excel.

## 8. Chiến lược triển khai

- **Phase strategy:** Triển khai một phase duy nhất vì chỉnh sửa cực kỳ nhỏ và tập trung.
- **Thứ tự triển khai:**
  1. Cập nhật `getFormattedDateInfo` trong `templateExcelExport.ts`.
  2. Cập nhật `getFormattedDateInfo` trong `App.tsx`.
  3. Kiểm tra kết xuất thủ công/tự động.
- **Yêu cầu migration / config / deploy:** Không có.

## 9. Test Strategy

- **Manual verification:**
  1. Thực hiện import một file sổ phụ ngân hàng bất kỳ.
  2. Bấm xuất file Báo Có / Báo Nợ ở cả 2 định dạng (theo mẫu Excel và file chuẩn).
  3. Mở file Excel xuất ra, kiểm tra cột `Ngày c.từ:D (ngay_ct)` có hiển thị đúng định dạng `dd/MM/yyyy` đệm số 0 đầy đủ không.

## 10. Rollback Plan

- Hoàn tác mã nguồn về commit trước đó bằng `git checkout`.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

## 12. Review Notes

### Ghi chú từ Hội đồng Review (2026-06-18):
- **FR-01 (Kiến trúc):** Đảm bảo đệm đầy đủ số 0 (sử dụng `.padStart(2, "0")`) cho cả ngày và tháng trong tất cả các định dạng xuất (`dayMonth` và `mdy`).
- **FR-02 (QA):** Kiểm thử cả hai loại nghiệp vụ hạch toán Báo Có (Thu tiền ngân hàng) và Báo Nợ (Chi tiền ngân hàng) ở cả 2 định dạng (theo mẫu và chuẩn).
