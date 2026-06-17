/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface KeywordRule {
  id: string;
  customerCode: string;  // Mã khách hàng cần gán (Key đối chiếu duy nhất)
  customerName: string;  // Tên khách hàng tương ứng cần gán
  keywords: string[];    // Danh sách các từ khóa nhận diện cho key này (không phân biệt chữ hoa thường)
  note?: string;         // Ghi chú thêm
}

export interface ColumnSettings {
  headerRow: number;      // Chỉ số dòng tiêu đề (0-indexed)
  dateCol: string;        // Tên cột hoặc ký tự cột (A, B, C, D...) cho Ngày giao dịch
  descCol: string;        // Tên cột hoặc ký tự cột cho Mô tả / Diễn giải
  amountCol: string;      // Tên cột hoặc ký tự cột cho Số tiền (Mặc định cột D)
}

export interface ProcessedRow {
  index: number;
  originalIndex: number;
  dateStr: string;        // Ngày định dạng chuẩn yyyy-mm-dd hoặc text gốc
  description: string;    // Diễn giải gốc
  amount: number;         // Số tiền > 0
  matchedKeyword: string | null;
  customerName: string;   // Tên khách hàng tìm được hoặc "Không xác định / Vãng lai"
  customerCode: string;   // Mã khách hàng tương ứng
  voucherNo: string;      // Số phiếu tự động gán dựa trên ngày
  allMatchedKeywords?: string[]; // Tất cả từ khóa phát hiện được (để đưa ra cảnh báo nếu trùng lặp)
  accuracyRate?: number;         // Tỷ lệ chính xác trùng khớp (%)
  confidenceLevel?: string;      // Mức độ tự tin nhận diện của AI (Rất cao, Cao, Khá, Thấp...)
  confidenceRate?: number;       // Độ tự tin của thuật toán (%)
  isOverridden?: boolean;        // Người dùng gán thủ công lại
}

export interface FileData {
  fileName: string;
  sheetNames: string[];
  selectedSheet: string;
  rawRows: any[][];
  rawSheets: Record<string, any[][]>;
  headers: string[];
  headerRowIndex: number;
}
