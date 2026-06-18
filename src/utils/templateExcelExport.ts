/**
 * @file-level-contract src/utils/templateExcelExport.ts
 *
 * - **Trách nhiệm chính**: Sử dụng tệp Excel mẫu (template) đã nhúng dưới dạng Base64, chèn dữ liệu hạch toán báo nợ/có đã xử lý vào đúng dòng dữ liệu quy định, bảo toàn style định dạng mẫu gốc và kích hoạt tải xuống cho người dùng.
 * - **Không chịu trách nhiệm**: Phân tích cú pháp tệp Excel đầu vào, quản lý trạng thái UI hoặc cập nhật cấu hình quy tắc đối chiếu từ khóa (Rules).
 * - **Ràng buộc nghiệp vụ (Invariants & Guards)**:
 *   - Dòng dữ liệu bắt đầu ghi đè từ dòng thứ 2 (`TEMPLATE_DATA_START_ROW = 2`).
 *   - Số lượng cột xuất mặc định cố định ở 17 cột (`OUTPUT_COLUMN_COUNT = 17`).
 *   - Định dạng ngày xuất: Chuyển đổi chuỗi ngày nhận được thành 2 định dạng: ngày/tháng (ví dụ: `17/06` cho diễn giải) và m/d/yyyy (cho cột ngày chứng từ).
 *   - Phải dọn sạch (set value = `null`) các ô dữ liệu trống phía dưới danh sách dòng được ghi đè để đảm bảo không bị lẫn dữ liệu cũ của file mẫu gốc.
 * - **Dependencies chính**: `xlsx-populate/browser/xlsx-populate`, `src/types.ts`, `src/utils/excelTemplatesBase64.ts`.
 */
import XlsxPopulate from "xlsx-populate/browser/xlsx-populate";
import { ProcessedRow } from "../types";
import { THU_TIEN_NH_BASE64, CHI_TIEN_NH_BASE64 } from "./excelTemplatesBase64";

export type TemplateExportMode = "accounting" | "debit";

interface TemplateExportOptions {
  rows: ProcessedRow[];
  mode: TemplateExportMode;
  sheetName: string;
  outputFileName: string;
  exportMaDvcs: string;
  exportMaGd: string;
  exportMaKh: string;
  exportTkNo: string;
  exportTkCo: string;
}

const TEMPLATE_PATHS: Record<TemplateExportMode, string> = {
  accounting: "/templates/thu_tien_nh.xlsx",
  debit: "/templates/chi_tien_nh.xlsx",
};

const OUTPUT_COLUMN_COUNT = 17;
const TEMPLATE_DATA_START_ROW = 2;
const STYLE_NAMES = [
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "fontSize",
  "fontFamily",
  "fontColor",
  "horizontalAlignment",
  "verticalAlignment",
  "wrapText",
  "shrinkToFit",
  "fill",
  "border",
  "borderColor",
  "borderStyle",
  "numberFormat",
];

function columnLetterFromIndex(index: number): string {
  let letter = "";
  let current = index;
  while (current > 0) {
    const mod = (current - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    current = Math.floor((current - mod) / 26);
  }
  return letter;
}

function getFormattedDateInfo(dateStr: string) {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return {
      dayMonth: `${d}/${m}`,
      mdy: `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`,
    };
  }

  const parts2 = dateStr.split("/");
  if (parts2.length === 3) {
    const [d, m, y] = parts2;
    return {
      dayMonth: `${d.padStart(2, "0")}/${m.padStart(2, "0")}`,
      mdy: `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`,
    };
  }

  return {
    dayMonth: "N/A",
    mdy: dateStr,
  };
}

function buildAccountingRow(row: ProcessedRow, options: TemplateExportOptions) {
  const dateInfo = getFormattedDateInfo(row.dateStr);
  return [
    options.exportMaDvcs,
    options.exportMaGd,
    options.exportMaKh,
    "",
    `nhập ngân hàng ngày ${dateInfo.dayMonth}`,
    dateInfo.mdy,
    "",
    row.voucherNo,
    options.exportTkNo,
    options.exportTkCo,
    "",
    "",
    row.customerCode || "",
    "",
    row.amount,
    row.description,
    "",
  ];
}

function buildDebitRow(row: ProcessedRow, options: TemplateExportOptions) {
  const dateInfo = getFormattedDateInfo(row.dateStr);
  return [
    options.exportMaDvcs,
    options.exportMaGd,
    options.exportMaKh,
    "",
    `Thanh toán bk ${dateInfo.dayMonth}`,
    dateInfo.mdy,
    "",
    row.voucherNo,
    options.exportTkCo,
    options.exportTkNo,
    "",
    "",
    row.customerCode || "",
    "",
    row.amount,
    row.description,
    "",
  ];
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function exportRowsWithTemplate(options: TemplateExportOptions) {
  const base64Data = options.mode === "accounting" ? THU_TIEN_NH_BASE64 : CHI_TIEN_NH_BASE64;
  const arrayBuffer = base64ToArrayBuffer(base64Data);
  const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer);

  const sheet = workbook.sheet(options.sheetName);
  if (!sheet) {
    throw new Error(`Không tìm thấy sheet "${options.sheetName}" trong file mẫu.`);
  }

  const rows = options.rows.map((row) =>
    options.mode === "accounting"
      ? buildAccountingRow(row, options)
      : buildDebitRow(row, options)
  );

  const endColumn = columnLetterFromIndex(OUTPUT_COLUMN_COUNT);
  const usedRange = sheet.usedRange();
  const usedEndRow = usedRange ? usedRange.endCell().rowNumber() : TEMPLATE_DATA_START_ROW;
  const finalEndRow = Math.max(usedEndRow, TEMPLATE_DATA_START_ROW + rows.length + 20);

  for (let rowNumber = TEMPLATE_DATA_START_ROW; rowNumber <= finalEndRow; rowNumber++) {
    for (let colNumber = 1; colNumber <= OUTPUT_COLUMN_COUNT; colNumber++) {
      sheet.cell(rowNumber, colNumber).value(null);
    }
  }

  const styleSourceRow = TEMPLATE_DATA_START_ROW;
  rows.forEach((rowValues, rowIndex) => {
    const targetRow = TEMPLATE_DATA_START_ROW + rowIndex;
    for (let colNumber = 1; colNumber <= OUTPUT_COLUMN_COUNT; colNumber++) {
      const sourceCell = sheet.cell(styleSourceRow, colNumber);
      const targetCell = sheet.cell(targetRow, colNumber);
      targetCell.style(sourceCell.style(STYLE_NAMES));
      targetCell.value(rowValues[colNumber - 1] ?? "");
    }
  });

  if (rows.length > 0) {
    sheet.range(`A${TEMPLATE_DATA_START_ROW}:${endColumn}${TEMPLATE_DATA_START_ROW + rows.length - 1}`);
  }

  const blob = await workbook.outputAsync({ type: "blob" });
  downloadBlob(blob, options.outputFileName);
}
