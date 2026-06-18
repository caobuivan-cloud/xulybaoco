# Feature Plan: Tự động dò tìm dòng tiêu đề và ánh xạ cột

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã thông qua review hội đồng kỹ thuật
> **Feature slug**: auto-detect-header-columns
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-18

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Khi kế toán viên tải lên tệp Excel sổ phụ từ các ngân hàng khác nhau, cấu trúc tệp (vị trí dòng tiêu đề, vị trí các cột Ngày tháng, Diễn giải, Số tiền) thường không cố định ở dòng 1 hay cột A, B, C. Hiện tại, người dùng phải tự chọn lại dòng tiêu đề và các cột tương ứng một cách thủ công, gây tốn thời gian.
- **Vấn đề cần giải quyết:** 
  1. Dòng tiêu đề không được định vị tự động một cách chính xác dựa trên mật độ từ khóa kế toán.
  2. Các cột Ngày tháng, Diễn giải, Số tiền chưa tự động thay đổi theo từ khóa của dòng tiêu đề khi dòng tiêu đề được thay đổi hoặc khi file được tải lên lần đầu.
- **Mục tiêu:**
  1. Tự động chấm điểm (scoring) các dòng trong file Excel để tìm ra dòng tiêu đề mặc định tối ưu nhất dựa trên từ khóa phổ biến (Ngày giao dịch, Số tiền, Mô tả...).
  2. Tự động ánh xạ cột Ngày tháng, Diễn giải và Số tiền theo dòng tiêu đề được phát hiện hoặc dòng tiêu đề do người dùng tự chọn lại.
- **Kết quả mong đợi:** Người dùng tải file lên là hệ thống tự khớp dòng tiêu đề và các cột chính xác 90% trường hợp, người dùng chỉ cần chọn lại nếu file mẫu quá dị biệt.

## 2. Phạm vi

### In scope
- Sửa đổi hàm `detectSheetSettings` trong [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx) để thực hiện tính điểm dòng tiêu đề dựa trên từ khóa và ánh xạ các cột Ngày tháng, Diễn giải, Số tiền theo dòng tiêu đề đó.
- Sửa đổi hàm `handleSettingsUpdate` trong [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx) để tự động cập nhật các cột Ngày tháng, Diễn giải, Số tiền khi người dùng chọn một dòng tiêu đề khác trên giao diện.
- Sửa đổi hàm `processFile` trong [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx) để dọn dẹp các đoạn code tự dò tìm bị trùng lặp/thừa.

### Out of scope
- Thay đổi logic xử lý dữ liệu lõi của `excelProcessor.ts`.
- Thay đổi logic gán mã đối tượng hay xuất file theo mẫu hạch toán.

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:**
  - Giữ nguyên cơ chế lưu trữ Column Settings local và cập nhật tự động khi thay đổi.
- **"Cấm kỵ" cần tránh:**
  - Không được làm mất khả năng tự chọn lại dòng/cột thủ công của người dùng (vẫn phải cho chọn lại bình thường).
- **Ràng buộc kiến trúc liên quan:**
  - Đảm bảo toàn bộ logic phân tích và ánh xạ chạy offline hoàn toàn ở client.

## 4. Giả định và câu hỏi mở

### Giả định
- Các file Excel sổ phụ của ngân hàng luôn chứa ít nhất 1-2 từ khóa thông dụng của kế toán (Ngày, Số tiền, Mô tả...) ở dòng tiêu đề của bảng dữ liệu.
- Việc tự động thay đổi cột khi đổi dòng tiêu đề là hành vi được mong đợi và không gây phiền toái cho người dùng nếu họ muốn tinh chỉnh.

### Câu hỏi mở
- Không có.

## 5. Acceptance Criteria

- [ ] Khi tải một file Excel sổ phụ lên, dòng tiêu đề tự động được chọn đúng dòng chứa các từ khóa cột (ví dụ: dòng 11 của VCB, dòng 1 của Techcombank...).
- [ ] Các dropdown Cột chứa ngày tháng, Cột chứa nội dung diễn giải, Cột số tiền thu tự động được gán đúng cột tương ứng (Ví dụ: Cột A cho Ngày, Cột E cho Mô tả, Cột D cho Số tiền).
- [ ] Khi thay đổi Dòng tiêu đề ở dropdown sang một dòng khác, các dropdown cột Ngày tháng, Diễn giải, Số tiền tự động quét lại dòng tiêu đề mới và cập nhật giá trị cột tương ứng (nếu tìm thấy từ khóa cột ở dòng mới đó).
- [ ] Người dùng vẫn có thể click vào các dropdown để tự chọn lại cột thủ công theo ý muốn sau khi hệ thống đã tự động gán.
- [ ] Ứng dụng chạy dev và build không lỗi TypeScript.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx) | Sửa | Cập nhật logic dò tìm dòng/cột trong `detectSheetSettings`, dọn dẹp `processFile` và thêm trigger tự động cập nhật cột trong `handleSettingsUpdate`. | 🟡 Trung bình (Chạm vào UI Flow) | Chưa |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** 
  - Đảm bảo việc tự động cập nhật cột khi đổi dòng tiêu đề không ghi đè đè lên lựa chọn thủ công của người dùng nếu họ đang thao tác sửa cột. (Chỉ kích hoạt tự động cập nhật cột khi người dùng đổi **dòng tiêu đề**, còn khi đổi **từng cột riêng lẻ** thì giữ nguyên lựa chọn của cột đó).
- **Review focus areas:** 
  - Tính chính xác của hệ thống chấm điểm dòng tiêu đề (`scoring`) đối với các file Excel ngân hàng thực tế.
  - Đảm bảo trigger đổi dòng tiêu đề chạy đúng và mượt mà trên UI.

## 8. Chiến lược triển khai

- **Phase strategy:** Triển khai qua 2 phase:
  - Phase 1: Cập nhật hàm `detectSheetSettings` và làm sạch `processFile`.
  - Phase 2: Cập nhật `handleSettingsUpdate` để tự động đổi cột theo tiêu đề mới.
- **Thứ tự triển khai:**
  1. Cập nhật `detectSheetSettings` với thuật toán scoring dòng tiêu đề và dò tìm cột thông minh.
  2. Làm sạch mã nguồn thừa trong `processFile`.
  3. Cập nhật `handleSettingsUpdate`.
  4. Thực hiện lint, build và chạy thử nghiệm.

## 9. Test Strategy

- **Automated tests:** Không có.
- **Manual verification:**
  - Tải lên 2-3 file sổ phụ mẫu của các ngân hàng khác nhau (VCB, TCB, BIDV...) để xác nhận dòng tiêu đề và các cột được nhận diện chính xác 100% khi vừa tải lên.
  - Thay đổi dòng tiêu đề bằng dropdown trên giao diện và quan sát các dropdown cột có tự động nhảy sang cột tương ứng ở dòng tiêu đề mới đó không.
  - Thử chọn cột thủ công để đảm bảo tính năng chọn lại thủ công hoạt động tốt.

## 10. Rollback Plan

- Revert tệp [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx) về commit sạch gần nhất.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`
