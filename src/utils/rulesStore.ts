/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KeywordRule } from "../types";

// Khởi tạo danh sách từ khóa mặc định chất lượng cao, nhắm đúng đối tượng người dùng VCCorp và các từ khóa ngân hàng hay gặp
const DEFAULT_RULES: KeywordRule[] = [
  { id: "1", customerCode: "KH-VCCORP", customerName: "Công ty Cổ phần VCCorp", keywords: ["VCCORP", "VCC CORP", "VC-CORP"], note: "Thanh toán dịch vụ văn phòng VCCorp" },
  { id: "2", customerCode: "KH-ADMICRO", customerName: "Khối Admicro - VCCorp", keywords: ["ADMICRO", "AD MICRO", "AD-MICRO"], note: "Doanh thu quảng cáo Admicro" },
  { id: "3", customerCode: "KH-K14", customerName: "Kênh 14 Media & Events", keywords: ["KENH14", "KENH 14", "K14"], note: "Hợp đồng tài trợ thương hiệu" },
  { id: "4", customerCode: "KH-SOCOLA", customerName: "Phân ban công nghệ Sữa Đá", keywords: ["SOCOLA", "SUA DA", "SUADA"], note: "Thanh toán server nội bộ" },
  { id: "5", customerCode: "KH-GENK", customerName: "Trang tin tức GenK", keywords: ["GENK", "GEN-K"], note: "Quảng cáo chuyên trang công nghệ" },
  { id: "6", customerCode: "NV-CBV", customerName: "Cao Bùi Văn (Tạm ứng)", keywords: ["CAO BUI VAN", "CAO BUIVAN", "CBV"], note: "Hoàn ứng công tác phí" },
  { id: "7", customerCode: "KH-SHOPEE", customerName: "Công ty TNHH Shopee Việt Nam", keywords: ["SHOPEE", "SHOPEE-VN"], note: "Hoa hồng tiếp thị liên kết" },
  { id: "8", customerCode: "KH-TIENMAT", customerName: "Khách nộp tiền mặt tại quầy", keywords: ["TIEN MAT", "TIENMAT", "NOP TIEN"], note: "Nộp tiền mặt doanh số ngày" },
  { id: "9", customerCode: "DT-TAICHINH", customerName: "Lãi tiền gửi không kỳ hạn", keywords: ["LAI TIEN GỬI", "LAI TIEN GUI", "KẾT CHUYỂN LÃI"], note: "Ngân hàng kết chuyển lãi định kỳ" },
  { id: "10", customerCode: "CP-LUONG", customerName: "Ủy nhiệm chi trả lương nhân sự", keywords: ["TIEN LUONG", "CHUYEN LUONG", "LUONG THANG"], note: "Bảo mật hạch toán nhân sự" }
];

const LOCAL_STORAGE_KEY = "bank_statement_keyword_rules";

export function loadRules(): KeywordRule[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Safe migration for older single-keyword storage versions
        return parsed.map((item, idx) => {
          const keywords: string[] = [];
          if (Array.isArray(item.keywords)) {
            keywords.push(...item.keywords);
          } else if (typeof item.keyword === "string" && item.keyword.trim()) {
            keywords.push(item.keyword.trim());
          }
          
          return {
            id: item.id || `migrated-${idx}-${Date.now()}`,
            customerCode: (item.customerCode || item.id || "KH-MOI").toUpperCase().trim(),
            customerName: String(item.customerName || "Khách hàng").trim(),
            keywords: keywords.filter((k, i, self) => k && self.indexOf(k) === i), // unique non-empty
            note: item.note ? String(item.note).trim() : undefined
          };
        });
      }
    }
  } catch (error) {
    console.error("Lỗi khi đọc danh sách keyword từ localStorage:", error);
  }
  return DEFAULT_RULES;
}

export function saveRules(rules: KeywordRule[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rules));
  } catch (error) {
    console.error("Lỗi khi lưu danh sách keyword vào localStorage:", error);
  }
}
