# .agent/KNOWLEDGE_BASE.md - Bộ não của dự án XuLyBaoCo

Lưu trữ những **quyết định kiến trúc** quan trọng và **lý do chiến lược** của dự án.

> ⚠️ **QUY TẮC GHI:**
> - Chỉ ghi quyết định kiến trúc và lý do chiến lược (high-level decisions)
> - Tuyệt đối tránh liệt kê tính năng, changelog chi tiết, hoặc mô tả cấu hình thuần túy
> - Mỗi dòng phải trả lời được câu hỏi: "Tại sao chúng ta quyết định làm vậy?"

---

## Initial Decisions From Repo Scan

- 2026-06-15 **Xử lý dữ liệu Excel offline hoàn toàn ở Client**. Why: Đảm bảo bảo mật tối đa cho dữ liệu tài chính nhạy cảm (nội dung giao dịch, số tiền, tài khoản ngân hàng) của doanh nghiệp bằng cách không truyền tệp tin lên máy chủ trung gian.
- 2026-06-15 **Sử dụng Google Apps Script Web App làm API kết nối Google Sheets**. Why: Giảm thiểu chi phí hạ tầng cơ sở dữ liệu và vận hành hệ thống, tận dụng Google Sheets để kế toán viên và quản lý cập nhật luật từ khóa trực quan trên bảng tính quen thuộc.
- 2026-06-15 **Thuật toán so khớp từ khóa ưu tiên độ dài ký tự giảm dần (Longest Match First)**. Why: Tránh tranh chấp từ khóa khi một diễn giải chứa nhiều cụm từ khóa có mức độ bao phủ khác nhau (ví dụ: từ khóa `"VCCORP"` dài hơn sẽ được ưu tiên khớp trước `"VC"` để tránh gán nhầm sang mã khách hàng khác).
- 2026-06-15 **Tự động gom nhóm giao dịch có cùng ngày vào một Số phiếu hạch toán (`voucherNo`)**. Why: Giúp tối ưu hóa nghiệp vụ hạch toán, kế toán viên có thể dễ dàng đối chiếu số tổng phát sinh theo ngày và kết xuất dữ liệu đồng bộ vào phần mềm kế toán tổng hợp mà không bị phân mảnh số phiếu.
- 2026-06-15 **Tích hợp cơ chế tự động đọc tài khoản Email từ IndexedDB của VCCorp Portal**. Why: Đảm bảo ghi nhận vết người dùng (audit logs) chính xác khi đồng bộ dữ liệu lên Google Sheets mà không bắt buộc người dùng phải đăng nhập lại lần hai.

---

## Ongoing Decisions

- 2026-06-15 **Lựa chọn Tailwind CSS v4 và React 19 để tối ưu hiệu năng render**. Why: Đáp ứng yêu cầu xử lý các bảng dữ liệu Excel lớn (lên tới hàng ngàn dòng) mượt mà mà không gây giật lag UI nhờ cơ chế render nhanh của React 19 và compile-time engine của Tailwind CSS v4.
- 2026-06-17 **Sử dụng xlsx-populate để ghi dữ liệu vào các file Excel mẫu sẵn (templates)**. Why: Giữ nguyên cấu trúc định dạng phức tạp, các styles và formulas của file mẫu hạch toán kế toán mà thư viện `xlsx` bản Community không hỗ trợ ghi đè giữ style.
- 2026-06-17 **Xử lý đa sheet (Multi-sheet) trong file Excel báo có**. Why: Giúp kế toán viên làm việc linh hoạt trên một workbook duy nhất có nhiều sheet dữ liệu của các ngân hàng hoặc tài khoản khác nhau mà không cần tách file thủ công.
