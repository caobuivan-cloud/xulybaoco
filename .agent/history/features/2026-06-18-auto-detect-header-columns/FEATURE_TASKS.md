# Feature Tasks: Tự động dò tìm dòng tiêu đề và ánh xạ cột

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-18

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Logic auto-detect dòng tiêu đề và dọn dẹp code thừa

**Mục tiêu:** Cập nhật logic dò tìm dòng tiêu đề thông minh và dọn dẹp code trùng lặp.

- [x] Task 1.1: Sửa đổi hàm `detectSheetSettings` trong [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx) áp dụng thuật toán tính điểm dòng tiêu đề dựa trên từ khóa kế toán (strong/normal) và ánh xạ cột tự động tương ứng.
- [x] Task 1.2: Xóa khối code dò tìm tiêu đề bị trùng lặp từ dòng 351 đến 390 trong hàm `processFile` của [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx).
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Chạy ứng dụng, upload thử file sổ phụ và đảm bảo hệ thống tự động gán chính xác dòng tiêu đề cùng cột mặc định).

## Phase 2: Logic tự động đổi cột khi đổi dòng tiêu đề trên giao diện

**Mục tiêu:** Tự động cập nhật cột Ngày tháng, Diễn giải, Số tiền tương ứng khi người dùng đổi dòng tiêu đề trên UI dropdown.

- [x] Task 2.1: Cập nhật hàm `handleSettingsUpdate` trong [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx) để thực hiện quét lại dòng tiêu đề mới và gán lại `dateCol`, `descCol`, `amountCol` tương ứng khi `updates` chứa `headerRow`.
- [x] Task 2.2: Chạy kiểm tra kiểu tĩnh của TypeScript (`npm run lint`) để đảm bảo không phát sinh lỗi compiler.
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Kiểm tra đầy đủ luồng: thay đổi dòng tiêu đề kéo theo cập nhật cột tự động; và việc tự chọn cột thủ công vẫn hoạt động bình thường).

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-18 16:42 | Phase 1 | Task 1.1-1.2 | Bắt đầu viết logic auto-detect dòng tiêu đề và clean-up code thừa | start | |
| 2026-06-18 16:43 | Phase 1 | Task 1.1-1.2 | Hoàn thành code logic auto-detect và dọn dẹp khối code thừa trong processFile | done | |
| 2026-06-18 16:44 | Phase 1 | Task 1.Final | Bắt đầu chạy test kiểm thử cho Phase 1 | start | |
| 2026-06-18 16:45 | Phase 1 | Task 1.Final | Bỏ qua test thủ công độc lập theo yêu cầu của User (chuyển sang gộp test ở Phase 2) | done | |
| 2026-06-18 16:46 | Phase 2 | Task 2.1 | Bắt đầu viết logic tự động đổi cột khi thay đổi dòng tiêu đề trong handleSettingsUpdate | start | |
| 2026-06-18 16:47 | Phase 2 | Task 2.1 | Hoàn thành code logic tự động đổi cột khi thay đổi dòng tiêu đề | done | |
| 2026-06-18 16:48 | Phase 2 | Task 2.2 | Chạy kiểm tra lint của TypeScript thành công | done | |
| 2026-06-18 16:49 | Phase 2 | Task 2.Final | Bắt đầu kiểm tra thủ công toàn bộ luồng tích hợp và chờ User xác nhận | start | |
| 2026-06-18 16:50 | Phase 2 | Task 2.Final | User xác nhận hoạt động OK hoàn thành toàn bộ tính năng | done | |
