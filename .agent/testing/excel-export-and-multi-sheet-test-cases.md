# Test Cases - Hỗ trợ đa sheet và Xuất Excel theo mẫu hạch toán

> Tạo ngày: 2026-06-17
> Liên kết feature: `excel-export-and-multi-sheet`
> Phạm vi: Feature

---

## 1. Mục tiêu kiểm thử

- Đảm bảo khi tải lên một tệp Excel có nhiều sheet, hệ thống nhận diện và cho phép chuyển đổi giữa các sheet chính xác.
- Đảm bảo thuật toán tự động nhận diện dòng tiêu đề (headerRow) hoạt động độc lập trên từng sheet.
- Đảm bảo khi xuất hạch toán báo có / báo nợ theo mẫu (Sử dụng `xlsx-populate`), hệ thống ghi đúng vị trí cột, đúng định dạng ngày tháng và làm sạch các ô trống phía dưới.
- Đảm bảo log hoạt động được ghi lại chính xác lên hệ thống lưu trữ log từ xa.

## 2. Tiền điều kiện

- Ứng dụng đã được chạy local (qua `npm run dev`).
- Có sẵn file Excel test chứa tối thiểu 2 sheet chứa dữ liệu giao dịch ngân hàng.
- Web App URL kết nối Google Sheets được cấu hình hoạt động bình thường.

## 3. Happy Path

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| HP-01 | Kéo thả tệp Excel chứa 2 sheet ("SheetA", "SheetB") vào vùng import | Tệp được tải thành công, xuất hiện một thẻ dropdown lựa chọn danh sách sheet với các tùy chọn tương ứng. Mặc định hiển thị dữ liệu của sheet đầu tiên. |
| HP-02 | Chuyển đổi sheet đang hoạt động sang "SheetB" qua dropdown | Dữ liệu bảng phía dưới lập tức thay đổi tương ứng với dữ liệu của "SheetB". Các cấu hình cột (cột ngày, cột số tiền, cột diễn giải) tự động nhận diện lại theo cấu trúc của "SheetB". |
| HP-03 | Chọn định dạng xuất là "Báo có (accounting)" hoặc "Báo nợ (debit)" | Xuất hiện thêm phần cấu hình tham số hạch toán (Mã DVCS, mã GD, mã KH, TK Nợ, TK Có) và phần chọn sheet xuất trong file mẫu. |
| HP-04 | Điền đầy đủ tham số hạch toán và nhấn nút Xuất Excel | Tệp Excel mới được tải xuống, có tên dạng `{Tên_File_Gốc}_{hach_toan_bao_co/no}_{timestamp}.xlsx`. Khi mở file ra, dữ liệu được ghi đúng vào sheet mẫu đã chọn từ dòng thứ 2, bảo toàn các styles (bold, border, font) từ dòng mẫu. |

## 4. Edge / Regression

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| RG-01 | Tải tệp Excel chỉ có 1 sheet | Hệ thống hoạt động bình thường, không hiển thị thẻ dropdown chọn sheet. |
| RG-02 | Chuyển đổi qua lại nhiều lần giữa các sheet | Trạng thái ghi đè thủ công (manual overrides) của người dùng được reset sạch sẽ khi đổi sheet để tránh nhầm dữ liệu. |
| RG-03 | File mẫu Excel tải từ server tĩnh bị lỗi 404 hoặc không tải được | Hiển thị thông báo alert lỗi trực quan cho người dùng: "Không tải được file mẫu: /templates/...". |

## 5. Negative Cases

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| NG-01 | Nhấn nút xuất Excel khi chưa có dòng dữ liệu nào được phân loại | Nút xuất Excel bị disable hoặc không thực hiện hành động xuất nào. |
| NG-02 | Điền thông tin ngày tháng sai định dạng đầu vào | Hàm định dạng ngày trong `templateExcelExport.ts` trả về chuỗi gốc hoặc "N/A" ở cột diễn giải để tránh crash ứng dụng. |

## 6. Security / Permission

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| SC-01 | Thực hiện xuất file hạch toán theo mẫu thành công | Có một API request log gửi lên Google Sheets Web App ghi nhận email người thực hiện, thời gian, tên file xuất ra, và số dòng dữ liệu. |

## 7. Ghi chú regression

- Cần kiểm tra kỹ định dạng ngày tháng trên các phiên bản phần mềm Excel khác nhau để đảm bảo ngày chứng từ được chuyển sang dạng giá trị Date Value thực tế được định dạng hiển thị `dd/mm/yyyy`.
- Đảm bảo các ô trống không chứa chuỗi rỗng `""` mà là ô trống (blank/null) thực sự trong file XML của Excel.
