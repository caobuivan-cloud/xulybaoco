/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColumnSettings, KeywordRule, ProcessedRow } from "../types";

// Convert Excel column letters like A, B, C to index indices: 0, 1, 2
export function columnLetterToIndex(letter: string): number {
  const clean = letter.trim().toUpperCase();
  if (!clean) return 0;
  let index = 0;
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    if (charCode >= 65 && charCode <= 90) { // A-Z
      index = index * 26 + (charCode - 64);
    }
  }
  return index > 0 ? index - 1 : 0;
}

// Convert numbers back to column letters: 0 -> A, 1 -> B, 3 -> D
export function indexToColumnLetter(index: number): string {
  let letter = "";
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Resilient parsing for numeric amounts, handles Vietnamese formatted dots/commas & currency
export function cleanNumericAmount(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  
  let str = String(val).trim();
  if (!str) return 0;
  
  // Remove currency signs & common words
  str = str.replace(/[VND|đ|Đ|VND|\s]/g, "");
  
  // Detect Vietnamese numbering (e.g., 1.500.000,50 or 1.500.000)
  const hasMultipleDots = (str.match(/\./g) || []).length > 1;
  const hasComma = str.includes(",");
  const hasSingleDot = (str.match(/\./g) || []).length === 1;
  
  if (hasMultipleDots || (hasComma && hasSingleDot && str.indexOf(".") < str.indexOf(","))) {
    // Format: 1.500.000,50 -> strip dots, replace decimal comma with dot
    str = str.replace(/\./g, "").replace(/,/g, ".");
  } else if (!hasMultipleDots && hasComma && !str.includes(".")) {
    // Format: 1500000,50 -> replace decimal comma with dot
    str = str.replace(/,/g, ".");
  } else {
    // Format: 1,500,000.50 -> strip commas
    str = str.replace(/,/g, "");
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Resilient parsing of dates (handles string formats & Excel serial values)
export function parseDateToString(val: any): string {
  if (val === null || val === undefined) return "N/A";
  
  // Handle JS Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "N/A";
    const dd = String(val.getDate()).padStart(2, "0");
    const mm = String(val.getMonth() + 1).padStart(2, "0");
    const yyyy = val.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }
  
  // If it's a numeric serial from Excel (e.g. 45000)
  if (typeof val === "number") {
    if (isNaN(val)) return "N/A";
    // Avoid small values triggering odd dates
    if (val < 20000) return String(val);
    try {
      const utcDays = Math.floor(val - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      if (isNaN(dateInfo.getTime())) return "N/A";
      
      const dd = String(dateInfo.getDate()).padStart(2, "0");
      const mm = String(dateInfo.getMonth() + 1).padStart(2, "0");
      const yyyy = dateInfo.getFullYear();
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return String(val);
    }
  }
  
  const str = String(val).trim();
  if (!str) return "N/A";
  
  // Try matching general date patterns (e.g. DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
  const datePartsRegex = /^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})/;
  const match = str.match(datePartsRegex);
  if (match) {
    const p1 = parseInt(match[1], 10);
    const p2 = parseInt(match[2], 10);
    const p3 = parseInt(match[3], 10);
    
    // Check if it's YYYY-MM-DD
    if (p1 > 1000 && p2 <= 12 && p3 <= 31) {
      return `${p1}-${String(p2).padStart(2, "0")}-${String(p3).padStart(2, "0")}`;
    }
    
    // Check if it's DD/MM/YYYY or MM/DD/YYYY (year is at the end)
    if (p3 > 1000) {
      const year = p3;
      let day = p1;
      let month = p2;
      
      // Intelligent detection:
      // If p1 > 12 and p2 <= 12: it must be DD/MM/YYYY (e.g., 29/05/2026)
      if (p1 > 12 && p2 <= 12) {
        day = p1;
        month = p2;
      }
      // If p2 > 12 and p1 <= 12: it must be MM/DD/YYYY (e.g., 05/29/2026)
      else if (p2 > 12 && p1 <= 12) {
        day = p2;
        month = p1;
      }
      // Default to DD/MM/YYYY for standard Vietnamese format
      else {
        day = p1;
        month = p2;
      }
      
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Fallback to native Date parsing if possible
  const parsedMs = Date.parse(str);
  if (!isNaN(parsedMs)) {
    const d = new Date(parsedMs);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }
  
  return str;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Step 1 & 2 & 3 & 4 combined processing
export function processBankStatement(
  rawRows: any[][],
  settings: ColumnSettings,
  rules: KeywordRule[],
  voucherPrefix: string,
  voucherFormat: "YYYYMMDD" | "SEQUENTIAL",
  voucherSuffix: string = "",
  voucherStartNumStr: string = "0001",
  voucherIncrementType: "prefix" | "suffix" = "prefix"
): { processedRows: ProcessedRow[]; errors: string[] } {
  const errors: string[] = [];
  const processedRows: ProcessedRow[] = [];
  
  // Find column indices
  const dateIdx = columnLetterToIndex(settings.dateCol);
  const descIdx = columnLetterToIndex(settings.descCol);
  const amountIdx = columnLetterToIndex(settings.amountCol);
  const startRow = settings.headerRow + 1; // Content starts below the header row
  
  if (startRow >= rawRows.length) {
    errors.push("Chỉ số dòng tiêu đề lớn hơn hoặc bằng tổng số dòng hiện có.");
    return { processedRows, errors };
  }
  
  // Flatten keyword rules into a list of individual keyword matchers mapped to their rule
  const candidates: Array<{ keyword: string; rule: KeywordRule }> = [];
  for (const rule of rules) {
    const kws = rule.keywords && rule.keywords.length > 0 
      ? rule.keywords 
      : (rule as any).keyword 
        ? [ (rule as any).keyword ] 
        : [];
    
    for (const kw of kws) {
      if (kw && kw.trim()) {
        candidates.push({
          keyword: kw.trim(),
          rule
        });
      }
    }
  }

  // Sort candidates by keyword length descending to match the longest keyword first!
  const sortedCandidates = [...candidates].sort((a, b) => b.keyword.length - a.keyword.length);

  // Pass 1: Parse and filter out records
  const preliminaryRecords: Array<{
    originalIndex: number;
    dateStr: string;
    description: string;
    amount: number;
    matchedKeyword: string | null;
    customerName: string;
    customerCode: string;
    allMatchedKeywords?: string[];
    accuracyRate?: number;
    confidenceLevel?: string;
    confidenceRate?: number;
  }> = [];
  
  for (let i = startRow; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;
    
    // Parse quantity
    const rawVal = row[amountIdx];
    const amount = cleanNumericAmount(rawVal);
    
    // STEP 4 RULE: "Chỉ lấy các dòng mà cột D có số tiền >0"
    if (amount <= 0) continue;
    
    // Extract raw values
    const rawDate = row[dateIdx];
    const rawDesc = row[descIdx] || "";
    
    const dateStr = parseDateToString(rawDate);
    const description = String(rawDesc).trim();
    
    // STEP 1 & 2: Search keywords in description col & assign customers
    let matchedKeyword: string | null = null;
    let customerName = "Khách hàng vãng lai";
    let customerCode = "KH-VANGLAI";
    let allMatchedKeywords: string[] = [];
    let accuracyRate = 0;
    let confidenceLevel = "--";
    let confidenceRate = 0;
    
    const lowercaseDesc = description.toLowerCase();
    
    // Find ALL matches to raise alerts if there are overlaps
    const matches: Array<{ keyword: string; rule: KeywordRule; index: number }> = [];
    for (const cand of sortedCandidates) {
      const kwLower = cand.keyword.toLowerCase();
      const matchIndex = lowercaseDesc.indexOf(kwLower);
      if (matchIndex !== -1) {
        if (!matches.some(m => m.keyword.toLowerCase() === kwLower)) {
          matches.push({ keyword: cand.keyword, rule: cand.rule, index: matchIndex });
        }
      }
    }

    if (matches.length > 0) {
      allMatchedKeywords = matches.map(m => m.keyword);
      
      // Select the longest keyword match as our primary
      const primaryMatch = matches.reduce((prev, current) => {
        return (current.keyword.length > prev.keyword.length) ? current : prev;
      });

      matchedKeyword = primaryMatch.keyword;
      customerName = primaryMatch.rule.customerName;
      customerCode = primaryMatch.rule.customerCode;

      // Evaluate accuracy & confidence using string boundaries
      const escapedKw = escapeRegExp(matchedKeyword.toLowerCase());
      const regexStr = "(?:^|[^a-zA-Z0-9áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđĐ])" + 
                       escapedKw + 
                       "(?:$|[^a-zA-Z0-9áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđĐ])";
      
      const isCleanBoundary = new RegExp(regexStr).test(lowercaseDesc);
      
      // Check if matches belong to DIFFERENT customer codes
      const uniqueMatchedCodes = Array.from(new Set(matches.map(m => m.rule.customerCode)));
      const hasCrossCustomerOverlaps = uniqueMatchedCodes.length > 1;
      
      if (isCleanBoundary) {
        accuracyRate = hasCrossCustomerOverlaps ? 88 : 98;
        confidenceLevel = hasCrossCustomerOverlaps ? "Tuyệt đối (Trùng mã khác)" : "Tuyệt đối (Nội tại)";
        confidenceRate = hasCrossCustomerOverlaps ? 85 : 99;
      } else {
        accuracyRate = hasCrossCustomerOverlaps ? 74 : 85;
        confidenceLevel = hasCrossCustomerOverlaps ? "Trung bình (Trùng mã khác)" : "Khá (Nội suy)";
        confidenceRate = hasCrossCustomerOverlaps ? 60 : 75;
      }
    } else {
      // Inactive or vãng lai
      accuracyRate = 0;
      confidenceLevel = "--";
      confidenceRate = 0;
    }
    
    preliminaryRecords.push({
      originalIndex: i,
      dateStr,
      description,
      amount,
      matchedKeyword,
      customerName,
      customerCode,
      allMatchedKeywords,
      accuracyRate,
      confidenceLevel,
      confidenceRate
    });
  }
  
  // STEP 3 RULE: "lấy thông tin của các dòng có cùng ngày đưa vào 1 số phiếu"
  // Grouping by Date
  const uniqueDates = Array.from(new Set(preliminaryRecords.map(r => r.dateStr))).sort();
  
  // Maps: Date -> Voucher Number
  const dateToVoucherMap: { [date: string]: string } = {};
  
  uniqueDates.forEach((date, i) => {
    // Generate voucher formatting
    if (voucherFormat === "YYYYMMDD") {
      // Re-format date to YYYYMMDD without dashes
      const cleanDate = date.replace(/[^0-9]/g, "");
      let datePart = "";
      if (cleanDate.length === 8) {
        datePart = cleanDate;
      } else {
        // Fallback
        datePart = `D${String(i + 1).padStart(3, "0")}`;
      }
      const suffixPart = voucherSuffix ? `/${voucherSuffix}` : "";
      dateToVoucherMap[date] = `${voucherPrefix}-${datePart}${suffixPart}`;
    } else {
      // Sequential index
      const startStr = voucherStartNumStr || "0001";
      const startInt = parseInt(startStr, 10) || 1;
      const padLen = startStr.length;
      const currentSeqNum = startInt + i;
      const counterStr = String(currentSeqNum).padStart(padLen, "0");

      let finalVoucher = "";
      if (voucherIncrementType === "prefix") {
        const suffixPart = voucherSuffix ? `/${voucherSuffix}` : "";
        finalVoucher = `${voucherPrefix}${counterStr}${suffixPart}`;
      } else {
        const prePart = voucherPrefix ? `${voucherPrefix}-` : "";
        finalVoucher = `${prePart}${voucherSuffix}${counterStr}`;
      }
      dateToVoucherMap[date] = finalVoucher;
    }
  });
  
  // Map back to final objects
  preliminaryRecords.forEach((record, index) => {
    const voucherNo = dateToVoucherMap[record.dateStr] || `${voucherPrefix}-OTHER`;
    processedRows.push({
      index: index + 1,
      originalIndex: record.originalIndex,
      dateStr: record.dateStr,
      description: record.description,
      amount: record.amount,
      matchedKeyword: record.matchedKeyword,
      customerName: record.customerName,
      customerCode: record.customerCode,
      voucherNo,
      allMatchedKeywords: record.allMatchedKeywords,
      accuracyRate: record.accuracyRate,
      confidenceLevel: record.confidenceLevel,
      confidenceRate: record.confidenceRate
    });
  });
  
  return { processedRows, errors };
}
