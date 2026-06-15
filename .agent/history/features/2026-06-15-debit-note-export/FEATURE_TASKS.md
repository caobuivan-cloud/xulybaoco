# Feature Tasks: Hỗ trợ xuất mẫu hạch toán Báo Nợ (Debit Note)

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-15

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Cấu hình State & UI Labels

**Mục tiêu:** Cập nhật các nhãn UI và state cấu hình mặc định để hỗ trợ 3 mẫu xuất và tài khoản thu gọn.

- [x] Task 1.1: Cập nhật mặc định `voucherPrefix` thành `"BC"` trong `src/App.tsx`.
- [x] Task 1.2: Đổi tên nhãn cấu hình tài khoản từ `"TK NỢ (CỘT I)"` thành `"TK NỢ"`, `"TK CÓ (CỘT J)"` thành `"TK CÓ"`, và `"MÃ KHÁCH MẶC ĐỊNH"` thành `"MÃ KH/NCC MẶC ĐỊNH"`.
- [x] Task 1.3: Cập nhật nhãn `"KIỂU EXCEL XUẤT BAN"` thành `"Mẫu excel xuất"`, đổi kiểu của `exportFormatMode` thành `"accounting" | "debit" | "raw"`.
- [x] Task 1.4: Thêm tuỳ chọn `"Mẫu báo nợ"` trên UI (Lưu ý: Không can thiệp, không tự sinh, không thay đổi tiền tố số phiếu khi user đổi mẫu xuất).
- [x] Task 1.5: Cập nhật wording trong `src/components/InstructionGuide.tsx` để giải thích cách chọn dữ liệu/cột số tiền khi làm Báo Nợ.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Kiểm tra UI hiển thị đúng nhãn mới, mặc định "BC". Đảm bảo prefix KHÔNG BỊ reset hay tự đổi khi user thao tác chọn qua lại các mẫu).

## Phase 2: Cập nhật logic Excel Export cho Báo Nợ

**Mục tiêu:** Thực hiện tạo file Excel Báo Nợ với cấu trúc tiêu đề và ánh xạ dữ liệu đúng yêu cầu.

- [x] Task 2.1: Cập nhật cấu trúc điều kiện trong `handleExportFinished` thành 3 nhánh riêng biệt: `accounting` (giữ nguyên), `debit` (cho Báo Nợ), và nhánh `raw` (giữ nguyên logic xuất cột, chỉ điều chỉnh label cột tiền).
- [x] Task 2.2: Thiết lập cấu trúc tiêu đề (1 dòng chứa dấu ngắt dòng `\n`) cho Báo Nợ với các thay đổi:
  - Cột C: `Mã ncc\n(ma_kh)`
  - Cột D: `Người nhận tiền\n(ong_ba)`
  - Cột I: `Tk có\n(Tk)`
  - Cột J: `Tk nợ\n(Tk_i)`
  - Cột L: `TGGS1:R\n(ty_gia)`
  - Cột M: `Mã ncc\n(ma_kh_i)`
  - Cột N: `Ps nợ n.tệ:N1\n(tien_nt)`
  - Cột O: `Ps nợ:N0\n(tien)`
  - Cột P: `Diễn giải chi tiết\n(dien_giaii)`
- [x] Task 2.3: Thiết lập ánh xạ dữ liệu dòng cho Báo Nợ:
  - Cột I (Tk có) -> nhận `exportTkCo`.
  - Cột J (Tk nợ) -> nhận `exportTkNo`.
  - Các cột còn lại khớp theo quy định của Báo Nợ.
- [x] Task 2.4: Đảm bảo tên file xuất cho Báo Nợ sử dụng hậu tố phù hợp (`nhap_lieu_bao_no`), nút export hiển thị label đúng, và nhật ký gửi lên Google Sheets ghi nhận nhãn thao tác chính xác.
- [x] Task 2.5: Đổi label nhánh phân tích raw từ "Số phát sinh tiền Có" thành "Số tiền phát sinh".
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Chạy `npm run lint`, chạy ứng dụng xuất thử Báo Có, Báo Nợ và Bảng Phân Tích. Áp dụng Manual Matrix kiểm tra chi tiết 17 cột Báo Nợ, kiểm tra header I/J/N/O/P, và cấu trúc nhánh accounting/raw cũ không đổi).

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-15 12:40 | Phase 1 | Khởi tạo | Tạo kế hoạch thực thi | done | |
| 2026-06-15 13:48 | Phase 1 | Task 1.1 | Cập nhật mặc định voucherPrefix thành "BC" | done | |
| 2026-06-15 13:49 | Phase 1 | Task 1.2 | Đổi tên nhãn cấu hình tài khoản và mã đối tượng trên UI | done | |
| 2026-06-15 13:50 | Phase 1 | Task 1.3 | Đổi tên nhãn kiểu xuất và cập nhật kiểu exportFormatMode | done | |
| 2026-06-15 13:51 | Phase 1 | Task 1.4 | Thêm tùy chọn Mẫu báo nợ trên UI | done | |
| 2026-06-15 13:52 | Phase 1 | Task 1.5 | Cập nhật hướng dẫn InstructionGuide.tsx cho Báo Nợ | done | |
| 2026-06-15 13:53 | Phase 1 | Task 1.Final | Thực hiện self-test & verify Phase 1 (UI, default prefix, preservation) | done | |
| 2026-06-15 13:54 | Phase 2 | Task 2.1 | Rẽ nhánh logic handleExportFinished thành 3 phần riêng biệt | done | |
| 2026-06-15 13:55 | Phase 2 | Task 2.2-2.5 | Cấu hình headers, data mapping, suffix, label cho Báo Nợ và raw | done | |
| 2026-06-15 13:56 | Phase 2 | Task 2.Final | Thực hiện self-test & verify Phase 2 (Excel export, lint) | done | |
| 2026-06-15 14:02 | Phase 2 | Chốt | Kiểm thử đạt yêu cầu và hoàn tất triển khai feature | done | |
