# Feature Plan: Hỗ trợ xuất mẫu hạch toán Báo Nợ (Debit Note)

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Khuyến nghị gọi `feature-review` để duyệt thiết kế và cấu trúc file xuất
> **Feature slug**: debit-note-export
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-15

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Ứng dụng hiện chỉ hỗ trợ hạch toán và xuất file Excel theo định dạng Báo Có (Credit Note).
- **Vấn đề cần giải quyết:** Kế toán cần xử lý thêm cả các giao dịch Báo Nợ (Debit Note) từ sổ phụ ngân hàng, với các đặc điểm:
  - Cột tài khoản Nợ và Có tráo đổi vị trí cho nhau.
  - Các nhãn trên file Excel được đổi tên tương ứng (ví dụ: "Người nộp tiền" thành "Người nhận tiền", "Mã khách" thành "Mã ncc", v.v.).
  - Tiền tố số phiếu mặc định đổi từ "PT" sang "BC".
  - Các nhãn hiển thị cấu hình tài khoản trên giao diện cần thu gọn (bỏ hậu tố chỉ định cột I/J).
- **Mục tiêu:** Cung cấp tính năng xuất file Excel Báo Nợ song song với Báo Có và Bảng Phân Tích, đồng thời tối ưu hóa giao diện cấu hình.
- **Kết quả mong đợi:** Người dùng có thể chuyển đổi linh hoạt giữa 3 mẫu xuất trên UI, và nhận được file Excel hạch toán Báo Nợ hoàn chỉnh, chính xác.

## 2. Phạm vi

### In scope
- Thay đổi mặc định của state `voucherPrefix` từ `"PT"` thành `"BC"`.
- Đổi nhãn `"TK NỢ (CỘT I)"` thành `"TK NỢ"`.
- Đổi nhãn `"TK CÓ (CỘT J)"` thành `"TK CÓ"`.
- Đổi nhãn `"KIỂU EXCEL XUẤT BAN"` thành `"Mẫu excel xuất"`.
- Thêm lựa chọn `"Mẫu báo nợ"` bên cạnh `"Mẫu báo có"` và `"Bảng Phân Tích"`. Khi chuyển mẫu xuất, code chỉ thay đổi `exportFormatMode`. Không được tự động sửa `voucherPrefix`, `voucherSuffix`, `voucherStartNumStr`, `voucherFormat`, tài khoản, mã KH/NCC hoặc bất kỳ cấu hình nào khác. Export luôn dùng đúng giá trị hiện đang hiển thị trên UI.
- Đổi nhãn `"MÃ KHÁCH MẶC ĐỊNH (CỘT C)"` thành `"MÃ KH/NCC MẶC ĐỊNH (CỘT C)"` để phù hợp với cả Báo Có và Báo Nợ.
- Cập nhật wording trong `src/components/InstructionGuide.tsx` để nêu rõ điều kiện dữ liệu của Báo Nợ.
- Đổi label của Bảng Phân Tích từ `"Số phát sinh tiền Có"` thành `"Số tiền phát sinh"` cho trung tính.
- Cập nhật logic `handleExportFinished` để tạo dữ liệu Excel hạch toán Báo Nợ với các thay đổi:
  - Swap vị trí gán tài khoản: Cột I (Tk) nhận tài khoản Có, Cột J (Tk_i) nhận tài khoản Nợ.
  - Cập nhật nhánh điều kiện trong logic export thành 3 nhánh rẽ nhánh riêng biệt (accounting, debit, raw) để đảm bảo nhánh accounting và raw cũ không bị phá vỡ.
  - Đảm bảo tên nút export, hậu tố file Excel và tên hành động lưu log lên Google Sheets tương ứng với Báo Nợ.
  - Đổi các cột tiêu đề (xuất thành 1 dòng header có ngắt dòng `\n`):
    - Cột C: `Mã ncc` / `(ma_kh)`
    - Cột D: `Người nhận tiền` / `(ong_ba)`
    - Cột I: `Tk có` / `(Tk)`
    - Cột J: `Tk nợ` / `(Tk_i)`
    - Cột L: `TGGS1:R` / `(ty_gia)`
    - Cột M: `Mã ncc` / `(ma_kh_i)`
    - Cột N: `Ps nợ n.tệ:N1` / `(tien_nt)`
    - Cột O: `Ps nợ:N0` / `(tien)`
    - Cột P: `Diễn giải chi tiết` / `(dien_giaii)` (key là `dien_giaii` thay vì `dien_giai_i`)

### Out of scope
- Các thay đổi cấu trúc dữ liệu không liên quan đến Báo Nợ.

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Xử lý offline hoàn toàn ở Client để bảo mật dữ liệu nhạy cảm.
- **"Cấm kỵ" cần tránh:** Tránh sửa đổi làm hỏng logic xuất file Báo Có hiện tại hoặc phá vỡ cấu trúc gom nhóm số phiếu theo ngày.
- **Ràng buộc kiến trúc liên quan:** Đảm bảo sử dụng thư viện `xlsx` để sinh file, giữ nguyên các cột định dạng rộng (!cols) phù hợp.

## 4. Giả định và câu hỏi mở

### Giả định
- Định dạng xuất Báo Nợ sử dụng cùng các trường cấu hình tài khoản `exportTkNo` và `exportTkCo` nhưng ánh xạ đảo ngược.
- Tiền tố số phiếu do người dùng tự quyết định hoàn toàn. BC chỉ là giá trị khởi tạo ban đầu của input prefix; sau khi UI hiển thị, mọi thao tác export dùng nguyên giá trị người dùng đang giữ trên input.

### Câu hỏi mở
- **Đã được giải đáp (nghiệp vụ Báo Nợ):** 
  - Về việc lấy dữ liệu `amount`: Theo yêu cầu gốc từ User, "Cách lấy dữ liệu thì gần giống mẫu báo có hiện tại". Kế toán sẽ chịu trách nhiệm chỉ định đúng "Cột Số Tiền" (Thu/Chi) trên UI lúc parse file. Code vẫn tiếp tục filter `amount > 0`.
  - Về các trường `ma_gd`, `ong_ba`, `ma_dvcs`, quyển/số chứng từ: Đã được User chỉ định là "Giống báo có", chỉ thay đổi nhãn cột (ví dụ: "Người nộp tiền" đổi thành "Người nhận tiền"). Sheet name xuất ra mặc định không đổi hoặc giữ "Kế toán Sổ Phụ".

## 5. Acceptance Criteria

- [ ] Nhãn UI "TK NỢ (CỘT I)" đổi thành "TK NỢ".
- [ ] Nhãn UI "TK CÓ (CỘT J)" đổi thành "TK CÓ".
- [ ] Nhãn UI "KIỂU EXCEL XUẤT BAN" đổi thành "Mẫu excel xuất".
- [ ] Mặc định khi tải trang tiền tố số phiếu là "BC".
- [ ] Bổ sung tuỳ chọn "Mẫu báo nợ" trên thanh chọn định dạng xuất.
- [ ] Khi chuyển mẫu xuất, code chỉ thay đổi `exportFormatMode`. Không được tự động sửa `voucherPrefix`, `voucherSuffix`, `voucherStartNumStr`, `voucherFormat`, tài khoản, mã KH/NCC hoặc bất kỳ cấu hình nào khác. Export luôn dùng đúng giá trị hiện đang hiển thị trên UI.
- [ ] Logic xuất Excel tách bạch 3 nhánh rành mạch `accounting`, `debit`, và `raw` (Trong đó `raw` giữ nguyên logic xuất cột, chỉ đổi label cột tiền trung tính hơn).
- [ ] Nút xuất Excel hiển thị đúng text, file Excel xuất ra có hậu tố riêng biệt cho Báo Nợ, và log ghi nhận Google Sheets ghi đúng loại "Báo Nợ".
- [ ] File Excel Báo Nợ xuất ra chứa 17 cột, với tiêu đề gồm một dòng duy nhất (chứa dấu ngắt dòng `\n` chia label và key) khớp đúng cấu trúc yêu cầu:
  - Cột C: Mã ncc (ma_kh)
  - Cột D: Người nhận tiền (ong_ba)
  - Cột I: Tk có (Tk) -> nhận giá trị tài khoản Có cấu hình trên UI.
  - Cột J: Tk nợ (Tk_i) -> nhận giá trị tài khoản Nợ cấu hình trên UI.
  - Cột L: TGGS1:R (ty_gia)
  - Cột M: Mã ncc (ma_kh_i)
  - Cột N: Ps nợ n.tệ:N1 (tien_nt)
  - Cột O: Ps nợ:N0 (tien) -> nhận số tiền giao dịch.
  - Cột P: Diễn giải chi tiết (dien_giaii)
- [ ] File Excel Báo Có xuất ra vẫn giữ đúng cấu trúc cũ:
  - Cột C: Mã khách (ma_kh)
  - Cột D: Người nộp tiền (ong_ba)
  - Cột I: Tk nợ (Tk) -> nhận giá trị tài khoản Nợ cấu hình trên UI.
  - Cột J: Tk có (Tk_i) -> nhận giá trị tài khoản Có cấu hình trên UI.
  - Cột L: TGGD:R (ty_gia)
  - Cột M: Mã khách (ma_kh_i)
  - Cột N: Ps có n.tệ:N1 (tien_nt)
  - Cột O: Ps có:N0 (tien)
  - Cột P: Diễn giải chi tiết (dien_giai_i)

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/App.tsx` | Sửa | Cập nhật UI và logic export excel | 🟢 | Không |
| `src/components/InstructionGuide.tsx` | Sửa | Cập nhật tài liệu hướng dẫn trên UI tránh hiểu lầm Báo Nợ | 🟢 | Không |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** Đảm bảo việc đảo ngược cột tài khoản trong mẫu Báo Nợ được gán đúng trị số và không gây lỗi cú pháp hoặc làm hỏng mẫu Báo Có.
- **Review focus areas:** Kiểm tra logic export và cấu hình UI.

## 8. Chiến lược triển khai

- **Phase strategy:** Chia làm 2 phase thực thi:
  - Phase 1: Cấu hình State, UI labels, và tuỳ chọn "Mẫu báo nợ".
  - Phase 2: Cập nhật logic `handleExportFinished` cho Báo Nợ.
- **Thứ tự triển khai:** UI trước, Logic Export sau.

## 9. Test Strategy

- **Manual verification:**
  - Tải file Excel sổ phụ lên.
  - Kiểm tra tiền tố mặc định ban đầu là "BC".
  - Người dùng gõ một prefix tùy ý (ví dụ: "ABC").
  - Chọn "Mẫu báo nợ" và xem tiền tố có giữ nguyên là "ABC" không (pass nếu không bị đổi thành "BN").
  - Xuất Excel và mở file kiểm tra tiêu đề, vị trí các cột tài khoản, tên các trường.
  - Chọn lại "Mẫu báo có" và đảm bảo tiền tố vẫn giữ nguyên, xuất Excel kiểm tra lại tính chính xác của file Báo Có.
  - Sử dụng ma trận đối chiếu manual (Manual Matrix) kiểm tra độc lập 17 cột, đặc biệt là cell I/J/N/O/P. Kiểm tra file Suffix, log label và đảm bảo format raw/accounting gốc không bị side-effect.

## 10. Rollback Plan

- Rollback thông qua việc "revert phần diff của feature" (sử dụng lệnh `git restore src/App.tsx src/components/InstructionGuide.tsx` hoặc checkout từ một commit cũ ổn định), tránh dùng checkout bừa bãi làm mất các untracked files hoặc dirty state khác trong quá trình dev.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

## Review Notes

- **2026-06-15 (Review hoàn tất):** Hội đồng đã nhất trí thông qua kế hoạch thiết kế. Các điểm lưu ý quan trọng đã được đồng bộ:
  - Tuyệt đối không can thiệp tự động thay đổi `voucherPrefix` hay các state UI khác khi người dùng chuyển đổi mẫu xuất trên dropdown.
  - Phân tách logic xuất thành 3 nhánh độc lập (`accounting`, `debit`, `raw`) để đảm bảo không phá vỡ logic cũ và dễ bảo trì.
  - Hướng tiếp theo: chuyển sang sử dụng skill `feature-coordinator` để triển khai Phase 1 và Phase 2.
