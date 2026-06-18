/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  FileDown,
  Upload,
  Settings,
  AlertCircle,
  Filter,
  CheckCircle,
  TrendingUp,
  BarChart2,
  ChevronRight,
  Download,
  RefreshCw,
  FileSpreadsheet,
  SlidersHorizontal,
  Zap,
  BookOpen,
  Search,
  Check,
  ChevronDown,
  HelpCircle,
  Info
} from "lucide-react";

import { KeywordRule, ColumnSettings, ProcessedRow, FileData } from "./types";
import { loadRules, saveRules } from "./utils/rulesStore";
import {
  columnLetterToIndex,
  indexToColumnLetter,
  processBankStatement
} from "./utils/excelProcessor";
import { exportRowsWithTemplate } from "./utils/templateExcelExport";
import { RulesEditor } from "./components/RulesEditor";
import { DashboardCharts } from "./components/DashboardCharts";
import { InstructionGuide } from "./components/InstructionGuide";
import { GoogleSheetsSettings } from "./components/GoogleSheetsSettings";
import {
  loadSheetsConfig,
  isTokenValid,
  pullRulesFromGoogleSheet,
  pushRulesToGoogleSheet,
  writeActionLogToSheet,
  getPortalUserEmail
} from "./utils/googleSheetsSync";

const DEFAULT_TEMPLATE_SHEET = "Mã gd 3";
const ACCOUNTING_TEMPLATE_SHEETS = ["Mã gd 2", "Mã gd 1", "Mã gd 3", "Mã gd 9", "Sheet2", "Ghi chú"];
const DEBIT_TEMPLATE_SHEETS = ["Mã gd 2", "Mã gd 1", "Mã gd 3", "Mã gd 8", "Mã gd 9", "Sheet2", "Ghi chú"];

export default function App() {
  const [activeTab, setActiveTab] = useState<"processor" | "rules" | "googleSheets" | "analytics" | "guide">("processor");

  // State to hold active Google user's email
  const userEmailRef = useRef("Kế toán viên");
  // State to hold the email retrieved from portal for header display
  const [portalEmail, setPortalEmail] = useState<string | null>(null);

  // Helper to log user actions to Google Sheet
  const logUserActionOnSheets = async (actionName: string, actionDetails: string) => {
    const sheetCfg = loadSheetsConfig();
    if (sheetCfg.syncEnabled && sheetCfg.logsEnabled && sheetCfg.webAppUrl) {
      try {
        await writeActionLogToSheet(
          sheetCfg.webAppUrl,
          "",
          userEmailRef.current,
          actionName,
          actionDetails
        );
      } catch (err) {
        console.error("Lỗi ghi nhật ký lên Google Sheet:", err);
      }
    }
  };

  // Keyword mappings rules
  const [rules, setRules] = useState<KeywordRule[]>([]);

  // File state
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column specifications mapping
  const [columnSettings, setColumnSettings] = useState<ColumnSettings>({
    headerRow: 0,
    dateCol: "A",
    descCol: "C",
    amountCol: "D" // Default to Column D
  });

  // Voucher parameters settings
  const [voucherPrefix, setVoucherPrefix] = useState("BC");
  const [voucherSuffix, setVoucherSuffix] = useState(() => String(new Date().getFullYear()).slice(-2));
  const [voucherStartNumStr, setVoucherStartNumStr] = useState("0001");
  const [voucherIncrementType, setVoucherIncrementType] = useState<"prefix" | "suffix">("prefix");
  const [voucherFormat, setVoucherFormat] = useState<"YYYYMMDD" | "SEQUENTIAL">("SEQUENTIAL");

  // Excel Export Template Settings
  const [exportMaDvcs, setExportMaDvcs] = useState(() => localStorage.getItem("exportMaDvcs") || "");
  const [exportMaGd, setExportMaGd] = useState(() => localStorage.getItem("exportMaGd") || "3");
  const [exportMaKh, setExportMaKh] = useState(() => localStorage.getItem("exportMaKh") || "KH000134");
  const [exportTkNo, setExportTkNo] = useState(() => localStorage.getItem("exportTkNo") || "11215");
  const [exportTkCo, setExportTkCo] = useState(() => localStorage.getItem("exportTkCo") || "1311");
  const [exportFormatMode, setExportFormatMode] = useState<"accounting" | "debit" | "raw">("accounting");
  const [exportTemplateSheet, setExportTemplateSheet] = useState(() => localStorage.getItem("exportTemplateSheet") || DEFAULT_TEMPLATE_SHEET);

  // Manual overrides mapping index -> customer override
  const [manualOverrides, setManualOverrides] = useState<{ [index: number]: { code: string; name: string; keyword?: string } }>({});

  // Choose to assign manually by customer code or check keywords
  const [assignDropdownMode, setAssignDropdownMode] = useState<"code" | "keyword">("keyword");

  // Active dropdown state for customer/keyword assignment in preview table
  const [activeDropdown, setActiveDropdown] = useState<{ rowIndex: number; type: "code" | "keyword" } | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState("");

  const [activeSheet, setActiveSheet] = useState("");
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);

  // Filters for preview table
  const [previewSearch, setPreviewSearch] = useState("");
  const [previewFilterMatch, setPreviewFilterMatch] = useState<"all" | "matched" | "unmatched" | "overridden" | "low_confidence">("all");
  const [colFilters, setColFilters] = useState({
    date: "",
    datePreset: "all", // "all" | "latest7" | "thisMonth" | "valid" | "invalid"
    voucherNo: "",
    customerCodeOrKw: "",
    customerName: "",
    description: "",
    amount: "",
    amountMin: "",
    amountMax: "",
    accuracyRate: "all", // "all" | "low" | "high" | "exact"
    confidenceRate: "all", // "all" | "low" | "high" | "exact"
    matchType: "all", // "all" | "manual" | "system" | "unmatched"
  });

  // Excel-style multi-select filters
  const [excelFilters, setExcelFilters] = useState<Record<string, string[]>>({
    date: [],
    voucherNo: [],
    customerCodeOrKw: [],
    customerName: [],
    description: [],
    amount: [],
    accuracyRate: [],
    confidenceRate: [],
    matchType: [],
  });
  const [activeExcelFilterCol, setActiveExcelFilterCol] = useState<string | null>(null);
  const [activeExcelFilterRect, setActiveExcelFilterRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [excelFilterSearch, setExcelFilterSearch] = useState("");
  const [tempSelectedVals, setTempSelectedVals] = useState<string[]>([]);

  const [showConfigPanel, setShowConfigPanel] = useState(true);

  // Load rules on startup with Google Sheets auto-pull check
  useEffect(() => {
    const startupLoad = async () => {
      // 1. Load local rules first
      const local = loadRules();
      setRules(local);

      // 2. Retrieve portal email or fallback to google_sheets_user_name
      let currentEmail = "Kế toán viên";
      try {
        const portalMail = await getPortalUserEmail();
        if (portalMail) {
          currentEmail = portalMail;
          setPortalEmail(portalMail);
        } else {
          currentEmail = localStorage.getItem("google_sheets_user_name") || "Kế toán viên";
        }
      } catch (err) {
        console.error("Failed to retrieve user email from portal:", err);
        currentEmail = localStorage.getItem("google_sheets_user_name") || "Kế toán viên";
      }
      userEmailRef.current = currentEmail;

      // 3. Check Sheets Auto Pull
      const sheetCfg = loadSheetsConfig();

      if (sheetCfg.syncEnabled && sheetCfg.autoPull && sheetCfg.webAppUrl) {
        try {
          console.log("Auto-pulling rules from Google Sheets on start...");
          const gsRules = await pullRulesFromGoogleSheet(sheetCfg.webAppUrl, null);
          if (gsRules && gsRules.length > 0) {
            setRules(gsRules);
            saveRules(gsRules);
            console.log(`Auto-pull success! Pulled ${gsRules.length} rules.`);
          }
        } catch (err) {
          console.error("Auto pull failed on startup:", err);
        }
      }
    };
    startupLoad();
  }, []);

  // Save rules when changed
  const handleRulesChange = async (updatedRules: KeywordRule[]) => {
    setRules(updatedRules);
    saveRules(updatedRules);

    // Auto re-process if files loaded
    if (fileData) {
      triggerProcess(fileData.rawRows, columnSettings, updatedRules);
    }

    // Google Sheets Auto-Push & Logging
    const sheetCfg = loadSheetsConfig();
    if (sheetCfg.syncEnabled && sheetCfg.autoPush && sheetCfg.webAppUrl) {
      try {
        await pushRulesToGoogleSheet(updatedRules, sheetCfg.webAppUrl, "");
        if (sheetCfg.logsEnabled) {
          await writeActionLogToSheet(
            sheetCfg.webAppUrl,
            "",
            userEmailRef.current,
            "Cập nhật từ khóa",
            `Thành viên cập nhật bộ nguyên tắc đối chiếu (${updatedRules.length} từ khóa)`
          );
        }
      } catch (err) {
        console.error("Auto push failed on rules change:", err);
      }
    }
  };

  const handleResetDefaultRules = async () => {
    if (confirm("Bạn có chắc chắn muốn khôi phục danh sách từ khóa mặc định? Các từ khóa bạn thêm mới sẽ bị xóa.")) {
      localStorage.removeItem("bank_statement_keyword_rules");
      const defaults = loadRules();
      setRules(defaults);
      if (fileData) {
        triggerProcess(fileData.rawRows, columnSettings, defaults);
      }

      // Log action and check auto push
      logUserActionOnSheets("Khôi phục mặc định", `Đã khôi phục danh sách từ khóa mặc định (${defaults.length} quy tắc)`);

      const sheetCfg = loadSheetsConfig();
      if (sheetCfg.syncEnabled && sheetCfg.autoPush && sheetCfg.webAppUrl) {
        try {
          await pushRulesToGoogleSheet(defaults, sheetCfg.webAppUrl, "");
        } catch (err) {
          console.error("Auto push default rules error:", err);
        }
      }
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const detectSheetSettings = (raw: any[][]): ColumnSettings => {
    let detectedHeaderRow = 0;
    let detectedDateCol = "A";
    let detectedDescCol = "C";
    let detectedAmountCol = "D";

    for (let rIndex = 0; rIndex < Math.min(12, raw.length); rIndex++) {
      const row = raw[rIndex];
      if (!row || !Array.isArray(row)) continue;

      let hasDateKeyword = false;
      let hasDescKeyword = false;
      let hasAmountKeyword = false;

      row.forEach((cellVal, colIdx) => {
        const valStr = String(cellVal).toLowerCase();
        const colLetter = indexToColumnLetter(colIdx);

        if (valStr.includes("ngày") || valStr.includes("date") || valStr.includes("ngay gd")) {
          detectedDateCol = colLetter;
          hasDateKeyword = true;
        }
        if (valStr.includes("diễn giải") || valStr.includes("nội dung") || valStr.includes("mô tả") || valStr.includes("description") || valStr.includes("chi tiết")) {
          detectedDescCol = colLetter;
          hasDescKeyword = true;
        }
        if (valStr.includes("số tiền") || valStr.includes("phát sinh") || valStr.includes("sô tiên") || valStr.includes("amount") || valStr.includes("tiền")) {
          detectedAmountCol = colLetter;
          hasAmountKeyword = true;
        }
      });

      if (hasDateKeyword || hasDescKeyword || hasAmountKeyword) {
        detectedHeaderRow = rIndex;
        break;
      }
    }

    return {
      headerRow: detectedHeaderRow,
      dateCol: detectedDateCol,
      descCol: detectedDescCol,
      amountCol: detectedAmountCol,
    };
  };

  // Parse Excel
  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawSheets = workbook.SheetNames.reduce<Record<string, any[][]>>((acc, currentSheetName) => {
          const currentWorksheet = workbook.Sheets[currentSheetName];
          acc[currentSheetName] = XLSX.utils.sheet_to_json<any[][]>(currentWorksheet, { header: 1, defval: "" }) as unknown as any[][];
          return acc;
        }, {});

        // Use header: 1 to parse as 2D array, defval: "" to prevent missing indices
        const raw = rawSheets[sheetName] || XLSX.utils.sheet_to_json<any[][]>(worksheet, { header: 1, defval: "" });

        // Auto-detect header row and columns:
        // Scan first 10 rows for common bank headers
        let detectedHeaderRow = 0;
        let detectedDateCol = "A";
        let detectedDescCol = "C";
        let detectedAmountCol = "D";

        for (let rIndex = 0; rIndex < Math.min(12, raw.length); rIndex++) {
          const row = raw[rIndex];
          if (!row || !Array.isArray(row)) continue;

          let hasDateKeyword = false;
          let hasDescKeyword = false;
          let hasAmountKeyword = false;

          row.forEach((cellVal, colIdx) => {
            const valStr = String(cellVal).toLowerCase();
            const colLetter = indexToColumnLetter(colIdx);

            if (valStr.includes("ngày") || valStr.includes("date") || valStr.includes("ngay gd")) {
              detectedDateCol = colLetter;
              hasDateKeyword = true;
            }
            if (valStr.includes("diễn giải") || valStr.includes("nội dung") || valStr.includes("mô tả") || valStr.includes("description") || valStr.includes("chi tiết")) {
              detectedDescCol = colLetter;
              hasDescKeyword = true;
            }
            if (valStr.includes("số tiền") || valStr.includes("phát sinh") || valStr.includes("sô tiên") || valStr.includes("amount") || valStr.includes("tiền")) {
              detectedAmountCol = colLetter;
              hasAmountKeyword = true;
            }
          });

          // If we found at least 2 key columns, let's treat this row as the header candidate
          if (hasDateKeyword || hasDescKeyword || hasAmountKeyword) {
            detectedHeaderRow = rIndex;
            break;
          }
        }

        const initialSettings = detectSheetSettings(raw as unknown as any[][]);

        setColumnSettings(initialSettings);
        setManualOverrides({}); // clear overrides

        const fDetails: FileData = {
          fileName: file.name,
          sheetNames: workbook.SheetNames,
          selectedSheet: sheetName,
          rawRows: raw as unknown as any[][],
          rawSheets,
          headers: (raw[initialSettings.headerRow] || []).map((h, i) => String(h || `Cột ${indexToColumnLetter(i)}`)),
          headerRowIndex: initialSettings.headerRow
        };

        setFileData(fDetails);
        setActiveSheet(sheetName);
        triggerProcess(raw as unknown as any[][], initialSettings, rules);

        // Log action on Sheets
        logUserActionOnSheets("Tải file sổ phụ", `Tải thành công file sổ phụ "${file.name}" (${raw.length} dòng, trang "${sheetName}")`);
      } catch (err) {
        console.error("Lỗi đọc Excel:", err);
        alert("Đọc Excel thất bại! File có thể bị lỗi hoặc định dạng không đúng tiêu chuẩn.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // When sheet changes
  const handleSheetChange = (sheetName: string) => {
    if (!fileData) return;
    try {
      const raw = fileData.rawSheets[sheetName];
      if (!raw) return;
      const updatedSettings = detectSheetSettings(raw);
      const updatedDetails: FileData = {
        ...fileData,
        selectedSheet: sheetName,
        rawRows: raw,
        headers: (raw[updatedSettings.headerRow] || []).map((h, i) => String(h || `Cột ${indexToColumnLetter(i)}`)),
        headerRowIndex: updatedSettings.headerRow
      };
      setActiveSheet(sheetName);
      setColumnSettings(updatedSettings);
      setFileData(updatedDetails);
      setManualOverrides({});
      triggerProcess(raw, updatedSettings, rules);
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger processing
  const triggerProcess = (
    rawRows: any[][],
    settings: ColumnSettings,
    activeRules: KeywordRule[]
  ) => {
    const result = processBankStatement(
      rawRows,
      settings,
      activeRules,
      voucherPrefix,
      voucherFormat,
      voucherSuffix,
      voucherStartNumStr,
      voucherIncrementType
    );
    setProcessedRows(result.processedRows);
  };

  // Apply manual update to a specific row's customer gán
  const handleManualAssign = (rowIndexOnProcessed: number, code: string, name: string, keyword?: string) => {
    setManualOverrides(prev => ({
      ...prev,
      [rowIndexOnProcessed]: { code, name, keyword }
    }));

    // Find row detail and log
    const rowDetail = processedRows.find(r => r.originalIndex === rowIndexOnProcessed);
    const detailText = rowDetail
      ? `"${rowDetail.description.substring(0, 50)}..." (Số tiền: ${rowDetail.amount.toLocaleString()}đ)`
      : `dòng ${rowIndexOnProcessed}`;

    logUserActionOnSheets(
      "Gán tay khách hàng",
      `Kế toán gán tay giao dịch ${detailText} sang mã đối tượng: "${code}" (${name || "Khách Vãng Lai"})${keyword ? `, từ khóa khớp: "${keyword}"` : ""}`
    );
  };

  // Combine automatic matched rows with any user manual overrides
  const finalProcessedRows = useMemo(() => {
    return processedRows.map(row => {
      const override = manualOverrides[row.originalIndex];
      if (override) {
        return {
          ...row,
          customerCode: override.code,
          customerName: override.name,
          matchedKeyword: override.keyword || "Thay đổi thủ công",
          isOverridden: true
        };
      }
      return {
        ...row,
        isOverridden: false
      };
    });
  }, [processedRows, manualOverrides]);

  // Flatten keyword list for the keyword-assignment dropdown
  const allKeywordsList = useMemo(() => {
    const list: { keyword: string; rule: KeywordRule }[] = [];
    rules.forEach(rule => {
      if (rule.keywords && rule.keywords.length > 0) {
        rule.keywords.forEach(kw => {
          list.push({ keyword: kw, rule });
        });
      }
    });
    // Sort alphabetically by keyword
    return list.sort((a, b) => a.keyword.localeCompare(b.keyword));
  }, [rules]);

  // Helpers for Excel-style checkbox multi-select filtering
  const getRowValueForCol = useCallback((row: any, colKey: string): string => {
    switch (colKey) {
      case "date":
        return row.dateStr;
      case "voucherNo":
        return row.voucherNo;
      case "customerCodeOrKw":
        return assignDropdownMode === "code"
          ? (row.customerCode || "KH-VANGLAI")
          : (row.matchedKeyword || "Chưa đối chiếu");
      case "customerName":
        return row.customerName || "Vãng lai / Chưa đối chiếu";
      case "description":
        return row.description;
      case "amount":
        return row.amount.toString();
      case "accuracyRate":
        return (row.accuracyRate || 0).toString();
      case "confidenceRate": {
        const rate = row.isOverridden ? 100 : (row.confidenceRate || (() => {
          if (row.confidenceLevel?.includes("Nội tại")) return 99;
          if (row.confidenceLevel?.includes("Khá (Nội suy)")) return 75;
          if (row.confidenceLevel?.includes("Trùng mã khác") && row.confidenceLevel?.includes("Tuyệt đối")) return 85;
          if (row.confidenceLevel?.includes("Trùng mã khác") && row.confidenceLevel?.includes("Trung bình")) return 60;
          return 80;
        })());
        return rate.toString();
      }
      case "matchType":
        return row.isOverridden ? "manual" : (row.matchedKeyword ? "system" : "unmatched");
      default:
        return "";
    }
  }, [assignDropdownMode]);

  const getRowLabelForCol = useCallback((row: any, colKey: string): string => {
    switch (colKey) {
      case "date":
        return row.dateStr;
      case "voucherNo":
        return row.voucherNo;
      case "customerCodeOrKw":
        if (assignDropdownMode === "code") {
          return row.isOverridden
            ? `${row.customerCode} ✍️`
            : (row.customerCode || "KH-VANGLAI");
        } else {
          return row.isOverridden
            ? `${row.customerCode} ✍️`
            : (row.matchedKeyword || "(Chưa đối chiếu)");
        }
      case "customerName":
        return row.customerName || "(Vãng lai / Chưa đối chiếu)";
      case "description":
        return row.description;
      case "amount":
        return row.amount.toLocaleString("vi-VN") + " đ";
      case "accuracyRate":
        return `${row.accuracyRate || 0}%`;
      case "confidenceRate": {
        const rate = row.isOverridden ? 100 : (row.confidenceRate || (() => {
          if (row.confidenceLevel?.includes("Nội tại")) return 99;
          if (row.confidenceLevel?.includes("Khá (Nội suy)")) return 75;
          if (row.confidenceLevel?.includes("Trùng mã khác") && row.confidenceLevel?.includes("Tuyệt đối")) return 85;
          if (row.confidenceLevel?.includes("Trùng mã khác") && row.confidenceLevel?.includes("Trung bình")) return 60;
          return 80;
        })());
        return `${rate}%`;
      }
      case "matchType":
        return row.isOverridden ? "Sửa tay (✍️)" : (row.matchedKeyword ? "Hệ thống (🤖)" : "Vãng lai (⚠️)");
      default:
        return "";
    }
  }, [assignDropdownMode]);

  const getDistinctValues = useCallback((colKey: string) => {
    const valuesMap = new Map<string, { value: string; label: string }>();
    finalProcessedRows.forEach(row => {
      const val = getRowValueForCol(row, colKey);
      const lbl = getRowLabelForCol(row, colKey);
      if (!valuesMap.has(val)) {
        valuesMap.set(val, { value: val, label: lbl });
      }
    });
    return Array.from(valuesMap.values()).sort((a, b) => {
      const numA = parseFloat(a.value);
      const numB = parseFloat(b.value);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.label.localeCompare(b.label, "vi");
    });
  }, [finalProcessedRows, getRowValueForCol, getRowLabelForCol]);

  const openExcelFilterDropdown = (colKey: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveExcelFilterRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    const distinct = getDistinctValues(colKey).map(item => item.value);
    if (excelFilters[colKey] && excelFilters[colKey].length > 0) {
      setTempSelectedVals(excelFilters[colKey]);
    } else {
      setTempSelectedVals(distinct);
    }
    setExcelFilterSearch("");
    setActiveExcelFilterCol(colKey);
  };

  const renderExcelFilterDropdown = (colKey: string) => {
    if (!activeExcelFilterRect) return null;
    const distinctItems = getDistinctValues(colKey);
    const lowercaseSearch = excelFilterSearch.toLowerCase();

    // Filter checklist by the search query inside the dropdown
    const filteredItems = distinctItems.filter(item =>
      item.label.toLowerCase().includes(lowercaseSearch) ||
      item.value.toLowerCase().includes(lowercaseSearch)
    );

    const isAllChecked = tempSelectedVals.length === distinctItems.length;
    const isSomeChecked = tempSelectedVals.length > 0 && tempSelectedVals.length < distinctItems.length;

    // Is dropdown on the right side of the table?
    const isRightAligned = ["amount", "accuracyRate", "confidenceRate", "matchType"].includes(colKey);

    const dropdownWidth = 272; // w-68 is 272px
    let leftVal = activeExcelFilterRect.left;
    if (isRightAligned) {
      leftVal = (activeExcelFilterRect.left + activeExcelFilterRect.width) - dropdownWidth;
    }
    // Boundary checks
    if (leftVal < 10) leftVal = 10;
    if (leftVal + dropdownWidth > window.innerWidth - 10) {
      leftVal = window.innerWidth - dropdownWidth - 10;
    }

    let topVal = activeExcelFilterRect.top + activeExcelFilterRect.height + 6;
    // Estimate dropdown height is around 285px
    const dropdownHeightEst = 285;
    const goesBelowScreen = topVal + dropdownHeightEst > window.innerHeight;
    if (goesBelowScreen && activeExcelFilterRect.top - dropdownHeightEst - 6 > 10) {
      topVal = activeExcelFilterRect.top - dropdownHeightEst - 6;
    }

    return (
      <div
        style={{
          position: "fixed",
          top: `${topVal}px`,
          left: `${leftVal}px`,
          width: `${dropdownWidth}px`,
        }}
        className="bg-white border border-slate-200 rounded-xl shadow-2xl p-3 z-50 text-slate-800 font-normal text-left animate-in fade-in slide-in-from-top-1 duration-150"
      >
        {/* Header inside dropdown */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
            Lọc giá trị ({distinctItems.length})
          </span>
          {excelFilters[colKey].length > 0 && (
            <span className="text-[9px] bg-indigo-50 border border-indigo-150 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">
              Đang lọc
            </span>
          )}
        </div>

        {/* Search input in checklist */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm giá trị..."
            value={excelFilterSearch}
            onChange={e => setExcelFilterSearch(e.target.value)}
            className="w-full bg-slate-50 text-slate-800 font-medium pl-8 pr-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-400 text-[11px]"
          />
        </div>

        {/* Action buttons on top of the list so they never get clipped or hidden */}
        <div className="flex items-center justify-between gap-1.5 pb-2.5 mb-2 border-b border-slate-100 bg-white">
          {excelFilters[colKey].length > 0 ? (
            <button
              onClick={() => {
                setExcelFilters(prev => ({ ...prev, [colKey]: [] }));
                setActiveExcelFilterCol(null);
              }}
              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded cursor-pointer transition border border-rose-150 active:scale-95 text-center shrink-0"
              title="Xóa bộ lọc của cột này"
            >
              Xóa lọc
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveExcelFilterCol(null)}
              className="px-2.5 py-1 bg-slate-105 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded cursor-pointer transition active:scale-95 text-center border border-slate-200"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                if (tempSelectedVals.length === distinctItems.length) {
                  // If all selected, standard is to reset filter so it shows everything efficiently
                  setExcelFilters(prev => ({ ...prev, [colKey]: [] }));
                } else {
                  setExcelFilters(prev => ({ ...prev, [colKey]: tempSelectedVals }));
                }
                setActiveExcelFilterCol(null);
              }}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-750 text-white text-[10px] font-bold rounded cursor-pointer transition active:scale-95 shadow-sm text-center shrink-0"
            >
              Áp dụng
            </button>
          </div>
        </div>

        {/* "(Chọn tất cả)" Toggle Option */}
        <div className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-50 rounded transition mb-1 pointer-events-auto">
          <input
            id={`select-all-excel-${colKey}`}
            type="checkbox"
            checked={isAllChecked}
            ref={el => {
              if (el) {
                el.indeterminate = isSomeChecked;
              }
            }}
            onChange={() => {
              if (isAllChecked) {
                setTempSelectedVals([]);
              } else {
                setTempSelectedVals(distinctItems.map(item => item.value));
              }
            }}
            className="w-3.5 h-3.5 accent-indigo-600 rounded text-indigo-600 cursor-pointer"
          />
          <label htmlFor={`select-all-excel-${colKey}`} className="text-[11px] font-bold text-slate-700 cursor-pointer select-none">
            (Chọn tất cả)
          </label>
        </div>

        {/* Scrollable checklist body */}
        <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-lg p-1 space-y-0.5 bg-slate-50/50">
          {filteredItems.length === 0 ? (
            <div className="text-[10px] text-slate-400 text-center py-4 font-medium italic">
              Không tìm thấy giá trị phù hợp
            </div>
          ) : (
            filteredItems.map(item => {
              const isChecked = tempSelectedVals.includes(item.value);
              return (
                <div
                  key={item.value}
                  className="flex items-center gap-2.5 px-2 py-1 hover:bg-white rounded border border-transparent hover:border-slate-150 transition cursor-pointer"
                  onClick={() => {
                    if (isChecked) {
                      setTempSelectedVals(prev => prev.filter(v => v !== item.value));
                    } else {
                      setTempSelectedVals(prev => [...prev, item.value]);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => { }} // Controlled by wrapper div click
                    className="w-3.5 h-3.5 accent-indigo-650 rounded text-indigo-600 cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] font-medium text-slate-700 truncate select-none cursor-pointer" title={item.label}>
                    {item.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Find latest valid transaction date across all rows to use for relative filtering presets (last 7 days, this month, etc)
  const maxDateMs = useMemo(() => {
    let maxMs = 0;
    finalProcessedRows.forEach(row => {
      if (row.dateStr && row.dateStr.trim().length > 0) {
        const ms = Date.parse(row.dateStr);
        if (!isNaN(ms) && ms > maxMs) {
          maxMs = ms;
        }
      }
    });
    return maxMs > 0 ? maxMs : Date.now();
  }, [finalProcessedRows]);

  // Filter and search on final processed rows for the tables previews
  const previewDataFiltered = useMemo(() => {
    return finalProcessedRows.filter(row => {
      // Search
      const searchTermsLower = previewSearch.toLowerCase();
      const matchesSearch =
        row.description.toLowerCase().includes(searchTermsLower) ||
        row.customerName.toLowerCase().includes(searchTermsLower) ||
        row.customerCode.toLowerCase().includes(searchTermsLower) ||
        row.voucherNo.toLowerCase().includes(searchTermsLower) ||
        (row.matchedKeyword && row.matchedKeyword.toLowerCase().includes(searchTermsLower)) ||
        row.dateStr.includes(searchTermsLower);

      if (!matchesSearch) return false;

      // Match status filter
      if (previewFilterMatch === "matched") {
        if (row.matchedKeyword === null || !!row.isOverridden) return false;
      } else if (previewFilterMatch === "overridden") {
        if (!row.isOverridden) return false;
      } else if (previewFilterMatch === "unmatched") {
        if (row.matchedKeyword !== null || !!row.isOverridden) return false;
      } else if (previewFilterMatch === "low_confidence") {
        const isLow = row.matchedKeyword !== null && !row.isOverridden && ((row.accuracyRate || 0) < 90 || (row.confidenceRate || 0) < 90);
        if (!isLow) return false;
      }

      // Column-specific list filtering
      if (colFilters.date && !row.dateStr.toLowerCase().includes(colFilters.date.toLowerCase())) {
        return false;
      }

      // Date Preset filtering
      if (colFilters.datePreset && colFilters.datePreset !== "all") {
        const ms = Date.parse(row.dateStr);
        const isValidDate = !isNaN(ms) && row.dateStr && row.dateStr.trim().length > 0;

        if (colFilters.datePreset === "valid") {
          if (!isValidDate) return false;
        } else if (colFilters.datePreset === "invalid") {
          if (isValidDate) return false;
        } else if (colFilters.datePreset === "latest7") {
          if (!isValidDate) return false;
          const diffDays = (maxDateMs - ms) / (1000 * 60 * 60 * 24);
          if (diffDays < 0 || diffDays > 7) return false;
        } else if (colFilters.datePreset === "thisMonth") {
          if (!isValidDate) return false;
          const d1 = new Date(ms);
          const d2 = new Date(maxDateMs);
          if (d1.getFullYear() !== d2.getFullYear() || d1.getMonth() !== d2.getMonth()) {
            return false;
          }
        }
      }

      if (colFilters.voucherNo && !row.voucherNo.toLowerCase().includes(colFilters.voucherNo.toLowerCase())) {
        return false;
      }
      if (colFilters.customerCodeOrKw) {
        const filterVal = colFilters.customerCodeOrKw.toLowerCase();
        const codeMatch = row.customerCode.toLowerCase().includes(filterVal);
        const kwMatch = row.matchedKeyword ? row.matchedKeyword.toLowerCase().includes(filterVal) : false;
        if (!codeMatch && !kwMatch) return false;
      }
      if (colFilters.customerName && !row.customerName.toLowerCase().includes(colFilters.customerName.toLowerCase())) {
        return false;
      }
      if (colFilters.description && !row.description.toLowerCase().includes(colFilters.description.toLowerCase())) {
        return false;
      }
      if (colFilters.amount) {
        const amountStr = row.amount.toLocaleString("vi-VN") + " đ";
        if (!amountStr.toLowerCase().includes(colFilters.amount.toLowerCase()) && !row.amount.toString().includes(colFilters.amount)) {
          return false;
        }
      }

      // Range filtering for amount
      if (colFilters.amountMin) {
        const minVal = parseFloat(colFilters.amountMin.replace(/[^0-9.-]/g, ""));
        if (!isNaN(minVal) && row.amount < minVal) {
          return false;
        }
      }
      if (colFilters.amountMax) {
        const maxVal = parseFloat(colFilters.amountMax.replace(/[^0-9.-]/g, ""));
        if (!isNaN(maxVal) && row.amount > maxVal) {
          return false;
        }
      }

      // Accuracy filter
      if (colFilters.accuracyRate !== "all") {
        if (colFilters.accuracyRate === "low") {
          if ((row.accuracyRate || 0) >= 90) return false;
        } else if (colFilters.accuracyRate === "high") {
          if ((row.accuracyRate || 0) < 90 || (row.accuracyRate || 0) === 100) return false;
        } else if (colFilters.accuracyRate === "exact") {
          if ((row.accuracyRate || 0) !== 100) return false;
        }
      }

      // Code/Algorithm Confidence filter
      if (colFilters.confidenceRate !== "all") {
        const rate = row.isOverridden ? 100 : (row.confidenceRate || (() => {
          if (row.confidenceLevel?.includes("Nội tại")) return 99;
          if (row.confidenceLevel?.includes("Khá (Nội suy)")) return 75;
          if (row.confidenceLevel?.includes("Trùng mã khác") && row.confidenceLevel?.includes("Tuyệt đối")) return 85;
          if (row.confidenceLevel?.includes("Trùng mã khác") && row.confidenceLevel?.includes("Trung bình")) return 60;
          return 80;
        })());

        if (colFilters.confidenceRate === "low") {
          if (rate >= 90) return false;
        } else if (colFilters.confidenceRate === "high") {
          if (rate < 90 || rate === 100) return false;
        } else if (colFilters.confidenceRate === "exact") {
          if (rate !== 100) return false;
        }
      }

      // Match type / Sửa thủ công / Vãng lai / Hệ thống filter
      if (colFilters.matchType !== "all") {
        if (colFilters.matchType === "manual") {
          if (!row.isOverridden) return false;
        } else if (colFilters.matchType === "system") {
          if (row.matchedKeyword === null || !!row.isOverridden) return false;
        } else if (colFilters.matchType === "unmatched") {
          if (row.matchedKeyword !== null || !!row.isOverridden) return false;
        }
      }

      // Excel-style Multi-select Filtering
      for (const colKey in excelFilters) {
        const activeVals = excelFilters[colKey];
        if (activeVals && activeVals.length > 0) {
          const val = getRowValueForCol(row, colKey);
          if (!activeVals.includes(val)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [finalProcessedRows, previewSearch, previewFilterMatch, colFilters, excelFilters, getRowValueForCol, maxDateMs]);

  // Apply settings updates
  const handleSettingsUpdate = (updates: Partial<ColumnSettings>) => {
    const updated = { ...columnSettings, ...updates };
    setColumnSettings(updated);

    // If header row updated, rebuild headers representation
    if (fileData) {
      const raw = fileData.rawRows;
      const hRow = updated.headerRow;
      const newHeaders = (raw[hRow] || []).map((h: any, i: number) => String(h || `Cột ${indexToColumnLetter(i)}`));

      const newDetails = {
        ...fileData,
        headers: newHeaders,
        headerRowIndex: hRow
      };
      setFileData(newDetails);
      triggerProcess(raw, updated, rules);
    }
  };

  // Apply voucher updates
  useEffect(() => {
    if (fileData) {
      triggerProcess(fileData.rawRows, columnSettings, rules);
    }
  }, [voucherPrefix, voucherFormat, voucherSuffix, voucherStartNumStr, voucherIncrementType]);

  // Clear loaded file data to allow fresh import
  const handleClearExcel = () => {
    setFileData(null);
    setProcessedRows([]);
    setManualOverrides({});
    setPreviewSearch("");
  };

  // Finally export the filtered, aligned entries back to clean Excel!
  const handleExportFinished = async () => {
    if (finalProcessedRows.length === 0) return;

    if (exportFormatMode === "accounting" || exportFormatMode === "debit") {
      const cleanName = fileData?.fileName.replace(/\.[^/.]+$/, "") || "Phan_Tich_So_Phu";
      const suffix = exportFormatMode === "accounting" ? "hach_toan_bao_co" : "hach_toan_bao_no";
      const outFilename = `${cleanName}_${suffix}_${Date.now().toString().substring(8)}.xlsx`;

      try {
        await exportRowsWithTemplate({
          rows: finalProcessedRows,
          mode: exportFormatMode,
          sheetName: exportTemplateSheet || DEFAULT_TEMPLATE_SHEET,
          outputFileName: outFilename,
          exportMaDvcs,
          exportMaGd,
          exportMaKh,
          exportTkNo,
          exportTkCo,
        });

        logUserActionOnSheets(
          "Xuất file Excel",
          `Kế toán xuất thành công file báo cáo "${outFilename}" (${finalProcessedRows.length} dòng), định dạng mẫu: ${exportFormatMode === "accounting" ? "Nhập liệu Báo Có" : "Nhập liệu Báo Nợ"}, sheet: ${exportTemplateSheet}`
        );
      } catch (err) {
        console.error("Lỗi xuất Excel theo mẫu:", err);
        alert(err instanceof Error ? err.message : "Xuất Excel theo mẫu thất bại.");
      }
      return;
    }

    let worksheet;
    let sheetName = "Sổ Phụ Đã Phân Loại";

    const getFormattedDateInfo = (dateStr: string) => {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parts[0];
        const m = parts[1];
        const d = parts[2];
        return {
          dayMonth: `${d.padStart(2, '0')}/${m.padStart(2, '0')}`,
          mdy: `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
        };
      }
      const parts2 = dateStr.split('/');
      if (parts2.length === 3) {
        const d = parts2[0];
        const m = parts2[1];
        const y = parts2[2];
        return {
          dayMonth: `${d.padStart(2, '0')}/${m.padStart(2, '0')}`,
          mdy: `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
        };
      }
      return {
        dayMonth: "N/A",
        mdy: dateStr
      };
    };

    if (exportFormatMode === "accounting") {
      sheetName = "Kế toán Sổ Phụ";

      const headers1 = [
        "Mã ĐVCS", "Mã gd", "Mã khách", "Người nộp tiền", "Diễn giải chung",
        "Ngày c.từ:D", "Quyển c.từ", "Số c.từ", "Tk nợ", "Tk có", "Mã n.tệ",
        "TGGD:R", "Mã khách", "Ps có n.tệ:N1", "Ps có:N0", "Diễn giải chi tiết", "Mã dự án"
      ];
      const headers2 = [
        "(ma_dvcs)", "(ma_gd)", "(ma_kh)", "(ong_ba)", "(dien_giai)",
        "(ngay_ct)", "(ma_qs)", "(so_ct)", "(Tk)", "(Tk_i)", "(ma_nt)",
        "(ty_gia)", "(ma_kh_i)", "(tien_nt)", "(tien)", "(dien_giai_i)", "(ma_vv_i)"
      ];

      const headers = headers1.map((h, i) => `${h}\n${headers2[i]}`);
      const aoaData = [headers];

      finalProcessedRows.forEach((row) => {
        const dateInfo = getFormattedDateInfo(row.dateStr);
        const rowData = [
          exportMaDvcs,                                 // A: ma_dvcs
          exportMaGd,                                   // B: ma_gd
          exportMaKh,                                   // C: ma_kh
          "",                                           // D: ong_ba
          `nhập ngân hàng ngày ${dateInfo.dayMonth}`,   // E: dien_giai
          dateInfo.mdy,                                 // F: ngay_ct
          "",                                           // G: ma_qs
          row.voucherNo,                                // H: so_ct
          exportTkNo,                                   // I: Tk
          exportTkCo,                                   // J: Tk_i
          "",                                           // K: ma_nt
          "",                                           // L: ty_gia
          row.customerCode || "",                       // M: ma_kh_i
          "",                                           // N: tien_nt
          row.amount,                                   // O: tien
          row.description,                              // P: dien_giai_i
          ""                                            // Q: ma_vv_i
        ];
        aoaData.push(rowData);
      });

      worksheet = XLSX.utils.aoa_to_sheet(aoaData);

      // Set nice column widths for the template
      worksheet["!cols"] = [
        { wch: 10 },  // A: ma_dvcs
        { wch: 8 },   // B: ma_gd
        { wch: 14 },  // C: ma_kh
        { wch: 15 },  // D: ong_ba
        { wch: 28 },  // E: dien_giai
        { wch: 12 },  // F: ngay_ct
        { wch: 12 },  // G: ma_qs
        { wch: 15 },  // H: so_ct
        { wch: 10 },  // I: Tk
        { wch: 10 },  // J: Tk_i
        { wch: 10 },  // K: ma_nt
        { wch: 10 },  // L: ty_gia
        { wch: 15 },  // M: ma_kh_i
        { wch: 15 },  // N: tien_nt
        { wch: 15 },  // O: tien
        { wch: 45 },  // P: dien_giai_i
        { wch: 12 }   // Q: ma_vv_i
      ];
    } else if (exportFormatMode === "debit") {
      sheetName = "Kế toán Sổ Phụ";

      const headers1 = [
        "Mã ĐVCS", "Mã gd", "Mã ncc", "Người nhận tiền", "Diễn giải chung",
        "Ngày c.từ:D", "Quyển c.từ", "Số c.từ", "Tk có", "Tk nợ", "Mã n.tệ",
        "TGGS1:R", "Mã ncc", "Ps nợ n.tệ:N1", "Ps nợ:N0", "Diễn giải chi tiết", "Mã dự án"
      ];
      const headers2 = [
        "(ma_dvcs)", "(ma_gd)", "(ma_kh)", "(ong_ba)", "(dien_giai)",
        "(ngay_ct)", "(ma_qs)", "(so_ct)", "(Tk)", "(Tk_i)", "(ma_nt)",
        "(ty_gia)", "(ma_kh_i)", "(tien_nt)", "(tien)", "(dien_giaii)", "(ma_vv_i)"
      ];

      const headers = headers1.map((h, i) => `${h}\n${headers2[i]}`);
      const aoaData = [headers];

      finalProcessedRows.forEach((row) => {
        const dateInfo = getFormattedDateInfo(row.dateStr);
        const rowData = [
          exportMaDvcs,                                 // A: ma_dvcs
          exportMaGd,                                   // B: ma_gd
          exportMaKh,                                   // C: ma_kh
          "",                                           // D: ong_ba (Người nhận tiền)
          `nhập ngân hàng ngày ${dateInfo.dayMonth}`,   // E: dien_giai
          dateInfo.mdy,                                 // F: ngay_ct
          "",                                           // G: ma_qs
          row.voucherNo,                                // H: so_ct
          exportTkCo,                                   // I: Tk (Tk có)
          exportTkNo,                                   // J: Tk_i (Tk nợ)
          "",                                           // K: ma_nt
          "",                                           // L: ty_gia (TGGS1:R)
          row.customerCode || "",                       // M: ma_kh_i (Mã ncc)
          "",                                           // N: tien_nt (Ps nợ n.tệ:N1)
          row.amount,                                   // O: tien (Ps nợ:N0)
          row.description,                              // P: dien_giaii
          ""                                            // Q: ma_vv_i
        ];
        aoaData.push(rowData);
      });

      worksheet = XLSX.utils.aoa_to_sheet(aoaData);

      // Set nice column widths for the template
      worksheet["!cols"] = [
        { wch: 10 },  // A: ma_dvcs
        { wch: 8 },   // B: ma_gd
        { wch: 14 },  // C: ma_kh
        { wch: 15 },  // D: ong_ba
        { wch: 28 },  // E: dien_giai
        { wch: 12 },  // F: ngay_ct
        { wch: 12 },  // G: ma_qs
        { wch: 15 },  // H: so_ct
        { wch: 10 },  // I: Tk
        { wch: 10 },  // J: Tk_i
        { wch: 10 },  // K: ma_nt
        { wch: 10 },  // L: ty_gia
        { wch: 15 },  // M: ma_kh_i
        { wch: 15 },  // N: tien_nt
        { wch: 15 },  // O: tien
        { wch: 45 },  // P: dien_giaii
        { wch: 12 }   // Q: ma_vv_i
      ];
    } else {
      // Build standard layout
      const excelBody = finalProcessedRows.map((row) => ({
        "STT": row.index,
        "Ngày giao dịch": row.dateStr,
        "Số phiếu kế toán": row.voucherNo,
        "Mã đối tượng": row.customerCode,
        "Tên đối tượng có giao dịch": row.customerName,
        "Mô tả diễn giải ngân hàng": row.description,
        "Số tiền phát sinh": row.amount,
        "Từ khóa đối chiếu": row.matchedKeyword || "Khách vãng lai"
      }));

      worksheet = XLSX.utils.json_to_sheet(excelBody);

      worksheet["!cols"] = [
        { wch: 6 },   // STT
        { wch: 15 },  // Ngày giao dịch
        { wch: 18 },  // Số phiếu kế toán
        { wch: 15 },  // Mã đối tượng
        { wch: 32 },  // Tên đối tượng
        { wch: 45 },  // Diễn giải ngân hàng
        { wch: 22 },  // Số phát sinh Có
        { wch: 18 }   // Khớp từ khóa
      ];
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const cleanName = fileData?.fileName.replace(/\.[^/.]+$/, "") || "Phan_Tich_So_Phu";
    const suffix = exportFormatMode === "accounting"
      ? "hach_toan_bao_co"
      : exportFormatMode === "debit"
        ? "hach_toan_bao_no"
        : "da_xu_ly";
    const outFilename = `${cleanName}_${suffix}_${Date.now().toString().substring(8)}.xlsx`;

    XLSX.writeFile(workbook, outFilename);

    // Log export action to Google Sheets
    logUserActionOnSheets(
      "Xuất file Excel",
      `Kế toán xuất thành công file báo cáo "${outFilename}" (${finalProcessedRows.length} dòng), định dạng mẫu: ${exportFormatMode === "accounting"
        ? "Nhập liệu Báo Có"
        : exportFormatMode === "debit"
          ? "Nhập liệu Báo Nợ"
          : "Bảng phân tích đối chiếu"
      }`
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans tracking-tight flex flex-col selection:bg-indigo-100 selection:text-indigo-950">

      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-sm leading-none">T</div>
          <h1 className="text-lg font-semibold tracking-tight">TransAuto <span className="text-gray-400 font-normal">| Bank Processor</span></h1>
        </div>
        <div className="flex items-center gap-4">
          {portalEmail && (
            <span className="text-sm text-slate-600 font-medium" title={portalEmail}>
              {portalEmail}
            </span>
          )}
          {fileData ? (
            <>
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full text-ellipsis max-w-[240px] md:max-w-xs overflow-hidden whitespace-nowrap font-medium">
                {fileData.fileName}
              </div>
              <button
                onClick={handleClearExcel}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer transition"
              >
                Thay đổi File
              </button>
            </>
          ) : (
            <span className="text-xs text-gray-400 font-medium italic">Chưa tải tệp sổ phụ</span>
          )}
        </div>
      </header>

      {/* Progress Steps as Tab Navigation */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 shrink-0 select-none">
        <div className="flex justify-center items-center max-w-xl mx-auto gap-12">

          <button
            onClick={() => setActiveTab("processor")}
            className="flex items-center gap-3 focus:outline-none cursor-pointer group text-left"
          >
            <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold transition ${activeTab === "processor"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-slate-500 group-hover:bg-slate-200"
              }`}>1</span>
            <span className={`text-sm font-medium transition ${activeTab === "processor" ? "text-slate-900 font-semibold" : "text-gray-500 group-hover:text-slate-800"
              }`}>Bàn Làm Việc</span>
          </button>

          <div className="h-px w-12 bg-gray-200"></div>

          <button
            onClick={() => setActiveTab("rules")}
            className="flex items-center gap-3 focus:outline-none cursor-pointer group text-left"
          >
            <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold transition ${activeTab === "rules"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-slate-500 group-hover:bg-slate-200"
              }`}>2</span>
            <span className={`text-sm font-medium transition ${activeTab === "rules" ? "text-slate-900 font-semibold" : "text-gray-500 group-hover:text-slate-800"
              }`}>Cấu Hình Từ Khóa</span>
          </button>

        </div>
      </nav>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Dynamic Navigation Content Switch */}
        {activeTab === "googleSheets" && (
          <GoogleSheetsSettings
            rules={rules}
            onRulesSynced={(updatedRules, message) => {
              setRules(updatedRules);
              saveRules(updatedRules);
              if (fileData) {
                triggerProcess(fileData.rawRows, columnSettings, updatedRules);
              }
            }}
            userEmailStateRef={userEmailRef}
          />
        )}

        {activeTab === "rules" && (
          <RulesEditor
            rules={rules}
            onChange={handleRulesChange}
            onReset={handleResetDefaultRules}
            userEmailStateRef={userEmailRef}
          />
        )}

        {activeTab === "analytics" && (
          <DashboardCharts data={finalProcessedRows} />
        )}

        {activeTab === "guide" && (
          <InstructionGuide />
        )}

        {activeTab === "processor" && (
          <div className="space-y-6">

            {/* FILE DROPAREA / FILE DETAILS HEADER */}
            {!fileData ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition cursor-pointer flex flex-col items-center justify-center min-h-[340px] ${dragActive
                    ? "border-indigo-600 bg-indigo-50/40"
                    : "border-gray-200 bg-white hover:border-indigo-400 hover:bg-gray-50/50"
                  }`}
                onClick={() => fileInputRef.current?.click()}
                id="excel-drop-zone"
              >
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm border border-indigo-100/60">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Tải lên file Sổ phụ từ Ngân hàng</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto mt-2 leading-relaxed">
                  Kéo và thả file Excel <strong>.xlsx, .xls, .csv</strong> vào đây, hoặc click để duyệt từ máy tính của bạn.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                <div className="flex flex-wrap items-center justify-center gap-6 mt-8 border-t border-gray-100 pt-6 w-full text-gray-500 text-xs text-center font-medium pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 text-[10px] flex items-center justify-center font-bold">1</span>
                    Quản lý Từ khóa
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 text-[10px] flex items-center justify-center font-bold">2</span>
                    Gán Khách Hàng tự động
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 text-[10px] flex items-center justify-center font-bold">3</span>
                    Gom Phiếu theo Ngày
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 text-[10px] flex items-center justify-center font-bold">4</span>
                    Lọc số tiền &gt; 0
                  </span>
                </div>
              </div>
            ) : (
              // ACTIVE FILE COMPONENT VIEW
              <div className="space-y-6" id="dashboard-active-panel">

                {/* Active file status card bar */}
                <div className="bg-white rounded-xl px-6 py-5 text-slate-900 shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-slate-950 tracking-tight leading-tight">
                        Đang xem trước file: {fileData.fileName}
                      </h3>
                      <p className="text-gray-500 text-xs mt-1 select-none leading-none">
                        Tài liệu chứa {fileData.rawRows.length} dòng dữ liệu • Trang hoạt động: <strong className="text-indigo-600">{activeSheet}</strong>
                      </p>
                    </div>
                  </div>

                  {fileData.sheetNames.length > 1 && (
                    <select
                      value={activeSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-100 font-medium text-slate-800"
                    >
                      {fileData.sheetNames.map((sheetName) => (
                        <option key={sheetName} value={sheetName}>
                          {sheetName}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="flex items-center gap-2 select-none">
                    <button
                      onClick={() => setShowConfigPanel(!showConfigPanel)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition ${showConfigPanel
                          ? "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                          : "bg-white text-slate-700 border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      {showConfigPanel ? "Thu gọn Cài đặt" : "Cấu hình cột tiêu đề"}
                    </button>

                    <button
                      onClick={handleClearExcel}
                      className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-rose-600 text-xs font-semibold cursor-pointer transition flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
                      Thay đổi File
                    </button>
                  </div>
                </div>

                {/* TWO-COLUMN GRID: CONFIGURATION CONTROLS */}
                {showConfigPanel && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in" id="config-settings-panel">

                    {/* Panel 1: Map header rows & bind index columns */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-xs tracking-wider uppercase flex items-center gap-2">
                          <Settings className="w-4 h-4 text-indigo-600" />
                          1. Sơ đồ cột & dòng tiêu đề
                        </h4>
                        <p className="text-gray-500 text-xs mt-1">Xác định cấu trúc mẫu file của Ngân hàng đã tải lên</p>
                      </div>

                      <div className="space-y-4">

                        {/* Header Row Index selector */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                            DÒNG TIÊU ĐỀ (HEADER ROW)
                          </label>
                          <div className="flex items-center gap-2">
                            <select
                              value={columnSettings.headerRow}
                              onChange={(e) => handleSettingsUpdate({ headerRow: parseInt(e.target.value) })}
                              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 font-medium text-slate-800"
                            >
                              {Array.from({ length: Math.min(20, fileData.rawRows.length) }).map((_, idx) => (
                                <option key={idx} value={idx}>
                                  Dòng {idx + 1} (Xem thử: "{String(fileData.rawRows[idx]?.[0] || "").substring(0, 20)}...")
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Date Col */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">CỘT CHỨA NGÀY THÁNG</label>
                          <select
                            value={columnSettings.dateCol}
                            onChange={(e) => handleSettingsUpdate({ dateCol: e.target.value })}
                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 font-medium text-slate-800"
                          >
                            {Array.from({ length: Math.max(12, fileData.rawRows[columnSettings.headerRow]?.length || 0) }).map((_, i) => {
                              const letter = indexToColumnLetter(i);
                              const headerName = fileData.rawRows[columnSettings.headerRow]?.[i] || "";
                              return (
                                <option key={i} value={letter}>
                                  Cột {letter} {headerName ? `— (${headerName})` : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Description Col */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 font-sans">CỘT CHỨA NỘI DUNG DIỄN GIẢI</label>
                          <select
                            value={columnSettings.descCol}
                            onChange={(e) => handleSettingsUpdate({ descCol: e.target.value })}
                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 font-medium text-slate-800"
                          >
                            {Array.from({ length: Math.max(12, fileData.rawRows[columnSettings.headerRow]?.length || 0) }).map((_, i) => {
                              const letter = indexToColumnLetter(i);
                              const headerName = fileData.rawRows[columnSettings.headerRow]?.[i] || "";
                              return (
                                <option key={i} value={letter}>
                                  Cột {letter} {headerName ? `— (${headerName})` : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Amount Col */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">CỘT SỐ TIỀN THU (CỘT D / KHÁC)</label>
                          <select
                            value={columnSettings.amountCol}
                            onChange={(e) => handleSettingsUpdate({ amountCol: e.target.value })}
                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 font-medium text-slate-800"
                          >
                            {Array.from({ length: Math.max(12, fileData.rawRows[columnSettings.headerRow]?.length || 0) }).map((_, i) => {
                              const letter = indexToColumnLetter(i);
                              const headerName = fileData.rawRows[columnSettings.headerRow]?.[i] || "";
                              return (
                                <option key={i} value={letter}>
                                  Cột {letter} {headerName ? `— (${headerName})` : ""}
                                </option>
                              );
                            })}
                          </select>
                          <span className="text-[10px] text-indigo-600 block mt-1.5 font-medium leading-normal">
                            * Hệ thống tự động lọc loại trừ các dòng phát sinh số tiền &lt;= 0.
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Panel 2: Voucher Auto settings */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-xs tracking-wider uppercase flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                          <span>2. Cấu hình số phiếu tự động</span>
                          <div className="group relative inline-block normal-case">
                            <Info className="w-3.5 h-3.5 text-indigo-500 hover:text-indigo-700 transition-colors cursor-help" />
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-800 text-white text-[10px] font-normal leading-normal rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 text-center">
                              <strong>Quy Tắc Nhóm:</strong> Các dòng ngân hàng thỏa mã điều kiện và diễn ra cùng một ngày sẽ tự động mang mã phiếu giống nhau.
                              <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 absolute -bottom-0.75 left-1/2 -translate-x-1/2"></div>
                            </div>
                          </div>
                        </h4>
                        <p className="text-gray-500 text-xs mt-1">Nhóm giao dịch cùng ngày thành một phiếu duy nhất</p>
                      </div>

                      <div className="space-y-4">
                        {/* Prefix & Suffix in Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">TIỀN TỐ SỐ PHIẾU (PREFIX)</label>
                            <input
                              type="text"
                              placeholder="VD: PT, BC, PC"
                              value={voucherPrefix}
                              onChange={(e) => setVoucherPrefix(e.target.value.trim().toUpperCase())}
                              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 uppercase text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">HẬU TỐ SỐ PHIẾU (SUFFIX)</label>
                            <input
                              type="text"
                              placeholder="Mặc định: 26"
                              value={voucherSuffix}
                              onChange={(e) => setVoucherSuffix(e.target.value.trim().toUpperCase())}
                              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 uppercase text-slate-800 font-medium"
                            />
                          </div>
                        </div>

                        {/* Starting number & Position Settings */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                              <span>SỐ PHIẾU ĐẦU TIÊN</span>
                              <div className="group relative inline-block normal-case">
                                <HelpCircle className="w-3 h-3 text-slate-400 hover:text-indigo-600 transition-colors cursor-help" />
                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 p-1.5 bg-slate-800 text-white text-[10px] font-normal leading-normal rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 text-center">
                                  Độ dài số đầu tiên tự động đặt padding số 0 (ví dụ: "0001" thành 4 chữ số).
                                  <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 absolute -bottom-0.75 left-1/2 -translate-x-1/2"></div>
                                </div>
                              </div>
                            </label>
                            <input
                              type="text"
                              placeholder="VD: 0001, 01, 1"
                              value={voucherStartNumStr}
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                if (/^\d*$/.test(val)) {
                                  setVoucherStartNumStr(val || "1");
                                }
                              }}
                              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 text-slate-800 font-medium tracking-wide font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                              <span>NƠI TĂNG SỐ PHIẾU</span>
                              <div className="group relative inline-block normal-case">
                                <HelpCircle className="w-3 h-3 text-slate-400 hover:text-indigo-600 transition-colors cursor-help" />
                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 p-1.5 bg-slate-800 text-white text-[10px] font-normal leading-normal rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 text-center">
                                  Chọn ghép số thứ tự tăng dần dán với tiền tố hay hậu tố.
                                  <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 absolute -bottom-0.75 left-1/2 -translate-x-1/2"></div>
                                </div>
                              </div>
                            </label>
                            <select
                              value={voucherIncrementType}
                              onChange={(e) => setVoucherIncrementType(e.target.value as "prefix" | "suffix")}
                              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 font-semibold text-slate-800"
                            >
                              <option value="prefix">Tăng tiền tố (BC0001/26)</option>
                              <option value="suffix">Tăng hậu tố (BC-260001)</option>
                            </select>
                          </div>
                        </div>

                        {/* Format */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">ĐỊNH DẠNG ĐÁNH SỐ PHIẾU</label>
                          <div className="space-y-3 mt-2">
                            <label className="flex items-start gap-2.5 text-xs text-slate-750 cursor-pointer">
                              <input
                                type="radio"
                                checked={voucherFormat === "YYYYMMDD"}
                                onChange={() => setVoucherFormat("YYYYMMDD")}
                                className="accent-indigo-600 mt-0.5"
                              />
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold block text-slate-800 text-xs">Theo chuỗi ngày</span>
                                  <div className="group relative inline-block normal-case">
                                    <Info className="w-3 h-3 text-slate-400 hover:text-indigo-600 transition-colors cursor-help" />
                                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 p-1.5 bg-slate-800 text-white text-[10px] font-normal leading-normal rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 text-center">
                                      Các dòng ngân hàng diễn ra cùng ngày gom vào một số phiếu.
                                      <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 absolute -bottom-0.75 left-1/2 -translate-x-1/2"></div>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-normal text-gray-500 mt-0.5 leading-normal block">
                                  Ví dụ: <code className="text-indigo-600 font-bold bg-indigo-50/70 px-1 py-0.5 rounded text-xs font-mono">{voucherPrefix ? `${voucherPrefix}-` : ""}20260608{voucherSuffix ? `/${voucherSuffix}` : ""}</code>
                                </span>
                              </div>
                            </label>

                            <label className="flex items-start gap-2.5 text-xs text-slate-750 cursor-pointer">
                              <input
                                type="radio"
                                checked={voucherFormat === "SEQUENTIAL"}
                                onChange={() => setVoucherFormat("SEQUENTIAL")}
                                className="accent-indigo-600 mt-0.5"
                              />
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold block text-slate-800 text-xs">Theo số tăng dần</span>
                                  <div className="group relative inline-block normal-case">
                                    <Info className="w-3 h-3 text-slate-400 hover:text-indigo-600 transition-colors cursor-help" />
                                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 p-1.5 bg-slate-800 text-white text-[10px] font-normal leading-normal rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 text-center">
                                      Hệ thống đếm tăng dần cho các ngày phát sinh khác nhau.
                                      <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 absolute -bottom-0.75 left-1/2 -translate-x-1/2"></div>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-normal text-gray-500 mt-0.5 leading-normal block">
                                  Ví dụ: <code className="text-indigo-600 font-bold bg-indigo-50/70 px-1 py-0.5 rounded text-xs font-mono">
                                    {voucherIncrementType === "prefix"
                                      ? `${voucherPrefix}${voucherStartNumStr}${voucherSuffix ? `/${voucherSuffix}` : ""}`
                                      : `${voucherPrefix ? `${voucherPrefix}-` : ""}${voucherSuffix}${voucherStartNumStr}`}
                                  </code>
                                </span>
                              </div>
                            </label>
                          </div>
                        </div>


                      </div>
                    </div>

                    {/* Panel 3: Accounting Export Defaults Settings */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-slate-900 text-xs tracking-wider uppercase flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                            <span>3. Cấu hình Excel kế toán</span>
                            <div className="group relative inline-block normal-case">
                              <Info className="w-3.5 h-3.5 text-indigo-500 hover:text-indigo-700 transition-colors cursor-help" />
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2 bg-slate-800 text-white text-[10px] font-normal leading-normal rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 text-center">
                                Bạn có thể tự do chỉnh sửa lại các hằng số này. Giá trị sẽ được lưu tự động trên trình duyệt.
                                <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 absolute -bottom-0.75 left-1/2 -translate-x-1/2"></div>
                              </div>
                            </div>
                          </h4>
                          <p className="text-gray-500 text-xs mt-1">Cài đặt mã và tài khoản mặc định nhập liệu</p>
                        </div>

                        <div className="space-y-3.5">
                          {/* Ma GD & Ma DVCS in a Row */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1" title="ma_dvcs">MÃ ĐVCS</label>
                              <input
                                type="text"
                                placeholder="Để trống"
                                value={exportMaDvcs}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  setExportMaDvcs(val);
                                  localStorage.setItem("exportMaDvcs", val);
                                }}
                                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 text-slate-800 font-medium font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1" title="ma_gd">MÃ GD (CỘT B)</label>
                              <input
                                type="text"
                                placeholder="Mặc định: 3"
                                value={exportMaGd}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  setExportMaGd(val);
                                  localStorage.setItem("exportMaGd", val);
                                }}
                                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 text-slate-800 font-medium font-mono"
                              />
                            </div>
                          </div>

                          {/* Ma Khach default */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1" title="ma_kh">MÃ KH/NCC MẶC ĐỊNH (CỘT C)</label>
                            <input
                              type="text"
                              placeholder="Mặc định: KH000134"
                              value={exportMaKh}
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                setExportMaKh(val);
                                localStorage.setItem("exportMaKh", val);
                              }}
                              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 text-slate-800 font-medium tracking-wide font-mono"
                            />
                          </div>

                          {/* TK no & TK co in a Row */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1" title="Tk">TK NỢ</label>
                              <input
                                type="text"
                                placeholder="Mặc định: 11215"
                                value={exportTkNo}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  setExportTkNo(val);
                                  localStorage.setItem("exportTkNo", val);
                                }}
                                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 text-slate-800 font-medium font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1" title="Tk_i">TK CÓ</label>
                              <input
                                type="text"
                                placeholder="Mặc định: 1311"
                                value={exportTkCo}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  setExportTkCo(val);
                                  localStorage.setItem("exportTkCo", val);
                                }}
                                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 text-slate-800 font-medium font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>


                    </div>

                    {/* Panel 4: Stats Box & Action button */}
                    <div className="bg-indigo-50/50 rounded-xl p-6 border border-indigo-100/80 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-indigo-950 text-xs tracking-wider uppercase flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-indigo-600" />
                            4. Đúc tệp & tải về
                          </h4>
                          <p className="text-indigo-900/80 text-xs mt-1">Xác lập tự động theo các bước xử lý dữ liệu</p>
                        </div>

                        {/* Format selector */}
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-900/85 uppercase mb-1">Mẫu excel xuất</label>
                          <div className="grid grid-cols-3 gap-1.5 bg-indigo-100/30 p-1 rounded-lg border border-indigo-100/50">
                            <button
                              type="button"
                              onClick={() => {
                                setExportFormatMode("accounting");
                                if (!ACCOUNTING_TEMPLATE_SHEETS.includes(exportTemplateSheet)) {
                                  setExportTemplateSheet(DEFAULT_TEMPLATE_SHEET);
                                  localStorage.setItem("exportTemplateSheet", DEFAULT_TEMPLATE_SHEET);
                                }
                              }}
                              className={`px-2 py-1.5 text-[10px] sm:text-[11px] rounded font-bold cursor-pointer transition-all ${exportFormatMode === "accounting"
                                  ? "bg-white text-indigo-750 shadow-sm"
                                  : "text-indigo-900/60 hover:text-indigo-900"
                                }`}
                            >
                              Mẫu báo có
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setExportFormatMode("debit");
                                if (!DEBIT_TEMPLATE_SHEETS.includes(exportTemplateSheet)) {
                                  setExportTemplateSheet(DEFAULT_TEMPLATE_SHEET);
                                  localStorage.setItem("exportTemplateSheet", DEFAULT_TEMPLATE_SHEET);
                                }
                              }}
                              className={`px-2 py-1.5 text-[10px] sm:text-[11px] rounded font-bold cursor-pointer transition-all ${exportFormatMode === "debit"
                                  ? "bg-white text-indigo-750 shadow-sm"
                                  : "text-indigo-900/60 hover:text-indigo-900"
                                }`}
                            >
                              Mẫu báo nợ
                            </button>
                            <button
                              type="button"
                              onClick={() => setExportFormatMode("raw")}
                              className={`px-2 py-1.5 text-[10px] sm:text-[11px] rounded font-bold cursor-pointer transition-all ${exportFormatMode === "raw"
                                  ? "bg-white text-indigo-750 shadow-sm"
                                  : "text-indigo-900/60 hover:text-indigo-900"
                                }`}
                            >
                              Bảng Phân Tích
                            </button>
                          </div>
                        </div>

                        {exportFormatMode !== "raw" && (
                          <div>
                            <label className="block text-[10px] font-bold text-indigo-900/85 uppercase mb-1">Sheet xuất dữ liệu</label>
                            <select
                              value={exportTemplateSheet}
                              onChange={(e) => {
                                setExportTemplateSheet(e.target.value);
                                localStorage.setItem("exportTemplateSheet", e.target.value);
                              }}
                              className="w-full text-xs bg-white border border-indigo-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-100 font-medium text-slate-800"
                            >
                              {(exportFormatMode === "accounting" ? ACCOUNTING_TEMPLATE_SHEETS : DEBIT_TEMPLATE_SHEETS).map((sheetName) => (
                                <option key={sheetName} value={sheetName}>
                                  {sheetName}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="bg-white rounded-lg p-3.5 border border-indigo-100 space-y-2 text-[11px] shadow-[0_1px_3px_rgba(99,102,241,0.015)]">
                          <div className="flex justify-between items-center text-slate-650">
                            <span>Sổ phụ tổng số dòng:</span>
                            <span className="font-mono font-bold text-slate-800">{fileData.rawRows.length} dòng</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-650">
                            <span>Sản phẩm đầu ra:</span>
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded leading-none select-none">
                              {finalProcessedRows.length} dòng
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Giant trigger download */}
                      <button
                        onClick={handleExportFinished}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-2 text-sm mt-5 tracking-wide cursor-pointer text-center select-none active:scale-95 duration-100"
                      >
                        <FileDown className="w-5 h-5 text-indigo-100" />
                        {exportFormatMode === "accounting"
                          ? "XUẤT EXCEL BÁO CÓ"
                          : exportFormatMode === "debit"
                            ? "XUẤT EXCEL BÁO NỢ"
                            : "XUẤT BẢNG PHÂN TÍCH"}
                      </button>
                    </div>

                  </div>
                )}

                {/* FILTER CONTROLS FOR RESULTS */}
                <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-gray-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                      <Filter className="w-3.5 h-3.5 text-indigo-500" />
                      Lọc xem nhanh:
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-200">
                      <button
                        onClick={() => setPreviewFilterMatch("all")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-150 ${previewFilterMatch === "all"
                            ? "bg-white text-slate-800 shadow-sm font-bold border border-gray-200/85"
                            : "text-slate-600 hover:text-indigo-600 font-medium"
                          }`}
                      >
                        Tất cả ({finalProcessedRows.length})
                      </button>

                      <button
                        onClick={() => setPreviewFilterMatch("matched")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-150 ${previewFilterMatch === "matched"
                            ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-200 font-bold"
                            : "text-slate-600 hover:text-emerald-600 font-medium"
                          }`}
                      >
                        Khớp tự động ({finalProcessedRows.filter(r => r.matchedKeyword !== null && !r.isOverridden).length})
                      </button>

                      <button
                        onClick={() => setPreviewFilterMatch("overridden")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-150 ${previewFilterMatch === "overridden"
                            ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200 font-bold"
                            : "text-slate-600 hover:text-indigo-600 font-medium"
                          }`}
                      >
                        ✍️ Đã sửa thủ công ({finalProcessedRows.filter(r => r.isOverridden).length})
                      </button>

                      <button
                        onClick={() => setPreviewFilterMatch("unmatched")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-150 ${previewFilterMatch === "unmatched"
                            ? "bg-rose-50 text-rose-700 shadow-sm border border-rose-200 font-bold"
                            : "text-slate-600 hover:text-rose-605 font-medium"
                          }`}
                      >
                        ⚠️ Chưa đối chiếu ({finalProcessedRows.filter(r => r.matchedKeyword === null && !r.isOverridden).length})
                      </button>

                      <button
                        onClick={() => setPreviewFilterMatch("low_confidence")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-150 ${previewFilterMatch === "low_confidence"
                            ? "bg-amber-50 text-amber-700 shadow-sm border border-amber-200 font-bold"
                            : "text-slate-600 hover:text-amber-650 font-medium"
                          }`}
                        title="Dòng có tỷ lệ chính xác hoặc độ tự tin dưới 90% (do trùng từ khóa hoặc không có ranh giới từ sạch)"
                      >
                        ⚠️ Tự tin thấp ({finalProcessedRows.filter(r => r.matchedKeyword !== null && !r.isOverridden && ((r.accuracyRate || 0) < 90 || (r.confidenceRate || 0) < 90)).length})
                      </button>
                    </div>
                  </div>

                  {/* Search inner preview */}
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm nhanh trong bảng xem thử..."
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-100 focus:border-indigo-400 font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* RESULTS INTERACTIVE SPREADSHEET */}
                <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-150 bg-gray-50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                      Xem Trước Dữ Liệu Sau Khi Lọc &amp; Phân Nhóm (Hiển thị {previewDataFiltered.length} dòng)
                    </h3>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-medium text-slate-700 shadow-sm border border-slate-300">
                        <span className="px-2 text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                          Gán thủ công bằng:
                        </span>
                        <button
                          onClick={() => setAssignDropdownMode("code")}
                          className={`px-2.5 py-1 rounded-md cursor-pointer text-[11px] font-semibold transition-all ${assignDropdownMode === "code"
                              ? "bg-white text-indigo-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-indigo-100 font-bold"
                              : "hover:text-slate-900 text-slate-500"
                            }`}
                        >
                          Mã Khách Hàng
                        </button>
                        <button
                          onClick={() => setAssignDropdownMode("keyword")}
                          className={`px-2.5 py-1 rounded-md cursor-pointer text-[11px] font-semibold transition-all ${assignDropdownMode === "keyword"
                              ? "bg-white text-emerald-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-emerald-100 font-bold"
                              : "hover:text-slate-900 text-slate-500"
                            }`}
                        >
                          Từ khóa (Keywords)
                        </button>
                      </div>
                      <div className="text-slate-400 text-[10px] italic">
                        * Có thể thay đổi phương thức bất kỳ lúc nào
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto min-h-[420px] max-h-[550px] overflow-y-auto relative">
                    <table className="w-full text-left border-collapse text-xs select-text">
                      <thead className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200 shadow-sm">
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                          <th className="p-3 w-12 text-center select-none">STT</th>
                          <th className="p-3 w-28">Ngày giao dịch</th>
                          <th className="p-3 w-32">Số phiếu tự động</th>
                          <th className="p-3 w-32">
                            {assignDropdownMode === "code" ? "Mã Khách Hàng" : "Từ khóa khớp"}
                          </th>
                          <th className="p-3 w-48">Tên đối tượng có giao dịch</th>
                          <th className="p-3 min-w-[380px]">Diễn giải / Nội dung ngân hàng</th>
                          <th className="p-3 w-64 text-right">Số tiền (&gt; 0)</th>
                          <th className="p-3 w-24 text-center">Tỷ lệ %</th>
                          <th className="p-3 w-28 text-center">Tự tin %</th>
                          <th className="p-3 w-32 text-center text-[10px] tracking-wider uppercase">Cách đối chiếu</th>
                        </tr>
                        {/* Hàng bộ lọc ngay bên dưới tiêu đề cột */}
                        <tr className="bg-slate-100/70 border-b border-slate-200 shadow-inner">
                          <td className="p-2 text-center relative">
                            {activeExcelFilterCol && (
                              <div
                                className="fixed inset-0 z-40 bg-transparent cursor-default"
                                onClick={() => setActiveExcelFilterCol(null)}
                              />
                            )}
                            {Object.values(colFilters).some(v => v !== "" && v !== "all") || Object.keys(excelFilters).some(k => (excelFilters[k] || []).length > 0) ? (
                              <button
                                onClick={() => {
                                  setColFilters({
                                    date: "",
                                    datePreset: "all",
                                    voucherNo: "",
                                    customerCodeOrKw: "",
                                    customerName: "",
                                    description: "",
                                    amount: "",
                                    amountMin: "",
                                    amountMax: "",
                                    accuracyRate: "all",
                                    confidenceRate: "all",
                                    matchType: "all",
                                  });
                                  setExcelFilters({
                                    date: [],
                                    voucherNo: [],
                                    customerCodeOrKw: [],
                                    customerName: [],
                                    description: [],
                                    amount: [],
                                    accuracyRate: [],
                                    confidenceRate: [],
                                    matchType: [],
                                  });
                                }}
                                className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[9px] font-black border border-rose-200 cursor-pointer shadow-sm transition active:scale-95"
                                title="Xóa tất cả bộ lọc cột"
                              >
                                Xóa
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[9px] font-mono select-none">Lọc</span>
                            )}
                          </td>
                          <td className="p-1 px-1.5 relative">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={colFilters.date}
                                onChange={e => setColFilters(prev => ({ ...prev, date: e.target.value }))}
                                placeholder="Lọc ngày..."
                                className="w-full bg-white text-slate-700 text-[11px] font-medium border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-slate-400 min-w-0"
                              />
                              <button
                                onClick={(e) => openExcelFilterDropdown("date", e)}
                                className={`p-1 rounded border cursor-pointer transition shrink-0 ${excelFilters.date.length > 0
                                    ? "bg-indigo-50 border-indigo-300 text-indigo-600 hover:bg-indigo-100"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-150"
                                  }`}
                                title="Bộ lọc giá trị Excel"
                              >
                                <Filter className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-1 px-1.5 relative">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={colFilters.voucherNo}
                                onChange={e => setColFilters(prev => ({ ...prev, voucherNo: e.target.value }))}
                                placeholder="Lọc SHD..."
                                className="w-full bg-white text-slate-700 text-[11px] font-medium border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-slate-400 font-mono min-w-0"
                              />
                              <button
                                onClick={(e) => openExcelFilterDropdown("voucherNo", e)}
                                className={`p-1 rounded border cursor-pointer transition shrink-0 ${excelFilters.voucherNo.length > 0
                                    ? "bg-indigo-50 border-indigo-300 text-indigo-600 hover:bg-indigo-100"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-150"
                                  }`}
                                title="Bộ lọc giá trị Excel"
                              >
                                <Filter className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-1 px-1.5 relative">
                            <div className="flex items-center gap-1 font-mono">
                              <input
                                type="text"
                                value={colFilters.customerCodeOrKw}
                                onChange={e => setColFilters(prev => ({ ...prev, customerCodeOrKw: e.target.value }))}
                                placeholder={assignDropdownMode === "code" ? "Lọc mã..." : "Lọc từ khóa..."}
                                className="w-full bg-white text-slate-700 text-[11px] font-medium border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-slate-400 min-w-0"
                              />
                              <button
                                onClick={(e) => openExcelFilterDropdown("customerCodeOrKw", e)}
                                className={`p-1 rounded border cursor-pointer transition shrink-0 ${excelFilters.customerCodeOrKw.length > 0
                                    ? "bg-indigo-50 border-indigo-300 text-indigo-600 hover:bg-indigo-100"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-150"
                                  }`}
                                title="Bộ lọc giá trị Excel"
                              >
                                <Filter className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-1 px-1.5 relative">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={colFilters.customerName}
                                onChange={e => setColFilters(prev => ({ ...prev, customerName: e.target.value }))}
                                placeholder="Lọc tên KH..."
                                className="w-full bg-white text-slate-700 text-[11px] font-medium border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-slate-405 min-w-0"
                              />
                              <button
                                onClick={(e) => openExcelFilterDropdown("customerName", e)}
                                className={`p-1 rounded border cursor-pointer transition shrink-0 ${excelFilters.customerName.length > 0
                                    ? "bg-indigo-50 border-indigo-300 text-indigo-600 hover:bg-indigo-100"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-150"
                                  }`}
                                title="Bộ lọc giá trị Excel"
                              >
                                <Filter className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-1 px-1.5 relative min-w-[380px]">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={colFilters.description}
                                onChange={e => setColFilters(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Lọc nội dung..."
                                className="w-full bg-white text-slate-700 text-[11px] font-medium border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-slate-405 min-w-0"
                              />
                              <button
                                onClick={(e) => openExcelFilterDropdown("description", e)}
                                className={`p-1 rounded border cursor-pointer transition shrink-0 ${excelFilters.description.length > 0
                                    ? "bg-indigo-50 border-indigo-300 text-indigo-600 hover:bg-indigo-100"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-150"
                                  }`}
                                title="Bộ lọc giá trị Excel"
                              >
                                <Filter className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-1 px-1.5 relative">
                            <div className="flex flex-col gap-1 w-full font-mono">
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="text"
                                  value={colFilters.amountMin}
                                  onChange={e => setColFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                                  placeholder="Từ: Min"
                                  className="w-[49%] bg-white text-slate-700 text-[9px] font-medium border border-slate-200 rounded px-0.5 py-0.5 text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-slate-400 min-w-0"
                                />
                                <span className="text-[8px] text-slate-400 select-none">-</span>
                                <input
                                  type="text"
                                  value={colFilters.amountMax}
                                  onChange={e => setColFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                                  placeholder="Đến: Max"
                                  className="w-[49%] bg-white text-slate-700 text-[9px] font-medium border border-slate-200 rounded px-0.5 py-0.5 text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-slate-400 min-w-0"
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-1 px-1 relative text-center">
                            <button
                              onClick={(e) => openExcelFilterDropdown("accuracyRate", e)}
                              className={`p-1 rounded border cursor-pointer transition ${excelFilters.accuracyRate.length > 0
                                  ? "bg-indigo-50 border-indigo-300 text-indigo-600 hover:bg-indigo-100"
                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-150"
                                }`}
                              title="Bộ lọc giá trị Excel"
                            >
                              <Filter className="w-3 h-3 mx-auto" />
                            </button>
                          </td>
                          <td className="p-1 px-1 relative text-center">
                            <button
                              onClick={(e) => openExcelFilterDropdown("confidenceRate", e)}
                              className={`p-1 rounded border cursor-pointer transition ${excelFilters.confidenceRate.length > 0
                                  ? "bg-indigo-50 border-indigo-300 text-indigo-600 hover:bg-indigo-100"
                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-150"
                                }`}
                              title="Bộ lọc giá trị Excel"
                            >
                              <Filter className="w-3 h-3 mx-auto" />
                            </button>
                          </td>
                          <td className="p-1 px-1.5 relative text-center">
                            <button
                              onClick={(e) => openExcelFilterDropdown("matchType", e)}
                              className={`p-1 rounded border cursor-pointer transition ${excelFilters.matchType.length > 0
                                  ? "bg-indigo-50 border-indigo-300 text-indigo-600 hover:bg-indigo-100"
                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-150"
                                }`}
                              title="Bộ lọc giá trị Excel"
                            >
                              <Filter className="w-3 h-3 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      </thead>
                      <tbody>
                        {previewDataFiltered.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="p-12 text-center text-slate-400">
                              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              Không tìm thấy dòng giao dịch nào phù hợp với các tiêu chí lọc hiện tại.
                            </td>
                          </tr>
                        ) : (
                          previewDataFiltered.map((row) => (
                            <tr
                              key={row.originalIndex}
                              className={`border-b border-slate-100 transition duration-150 ${row.isOverridden
                                  ? "bg-indigo-50/15 hover:bg-indigo-50/25"
                                  : row.matchedKeyword === null
                                    ? "hover:bg-amber-50/30 bg-amber-50/5"
                                    : "hover:bg-sky-50/20"
                                }`}
                            >
                              {/* STT */}
                              <td className="p-3 font-mono text-center font-medium relative">
                                {row.isOverridden && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" title="Đã sửa thủ công" />
                                )}
                                <div className="flex items-center justify-center gap-1">
                                  {row.isOverridden ? (
                                    <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200" title="Đã sửa thủ công">
                                      {row.index} ✍️
                                    </span>
                                  ) : row.matchedKeyword === null ? (
                                    <span className="text-slate-400 font-semibold" title="Chưa khớp">
                                      {row.index}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">
                                      {row.index}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Date */}
                              <td className="p-3 font-mono font-medium text-slate-600 whitespace-nowrap">
                                {row.dateStr}
                              </td>

                              {/* Number Group voucher */}
                              <td className="p-3">
                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold text-[10px] tracking-wider border border-indigo-100">
                                  {row.voucherNo}
                                </span>
                              </td>

                              {/* Interactive customer picker */}
                              <td className="p-3 relative group">
                                <div className="flex items-center gap-1">
                                  {assignDropdownMode === "code" ? (
                                    <div className="relative inline-block text-left">
                                      <button
                                        onClick={() => {
                                          setActiveDropdown({ rowIndex: row.originalIndex, type: "code" });
                                          setDropdownSearch("");
                                        }}
                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer text-left w-[110px] flex items-center justify-between gap-1 transition"
                                      >
                                        <span className="truncate">{row.customerCode}</span>
                                        <ChevronDown className="w-3 h-3 text-indigo-400 shrink-0" />
                                      </button>

                                      {activeDropdown?.rowIndex === row.originalIndex && activeDropdown?.type === "code" && (
                                        <>
                                          {/* Backdrop to close list */}
                                          <div className="fixed inset-0 z-40 cursor-default" onClick={() => setActiveDropdown(null)} />

                                          {/* Custom Popover */}
                                          <div className="absolute left-0 mt-1 w-[260px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs flex flex-col gap-2 animate-in fade-in duration-100">
                                            {/* Quick Search Box */}
                                            <div className="relative flex items-center">
                                              <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                              <input
                                                type="text"
                                                autoFocus
                                                placeholder="Tìm mã, tên hoặc từ khóa..."
                                                value={dropdownSearch}
                                                onChange={e => setDropdownSearch(e.target.value)}
                                                className="w-full bg-slate-50 text-slate-800 font-medium pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-400 text-[11px]"
                                              />
                                              {dropdownSearch && (
                                                <button
                                                  onClick={() => setDropdownSearch("")}
                                                  className="absolute right-2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                                                >
                                                  Xóa
                                                </button>
                                              )}
                                            </div>

                                            {/* Results Scroll List */}
                                            <div className="max-h-[220px] overflow-y-auto flex flex-col gap-0.5 pr-1 text-slate-700">
                                              {/* Current Selected Header */}
                                              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1 bg-slate-50/50 rounded">
                                                Đang chọn
                                              </div>
                                              <button
                                                onClick={() => {
                                                  handleManualAssign(row.originalIndex, row.customerCode, row.customerName);
                                                  setActiveDropdown(null);
                                                }}
                                                className="w-full text-left px-2 py-1.5 rounded-lg bg-indigo-50 === row.customerCode ? 'bg-indigo-50' : '' hover:bg-indigo-50 text-indigo-900 font-bold font-mono text-[10px] flex flex-col transition"
                                              >
                                                <span>{row.customerCode}</span>
                                                <span className="text-[10px] text-slate-400 font-sans font-normal truncate">{row.customerName}</span>
                                              </button>

                                              {/* Matching Options */}
                                              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1 mt-1 border-t border-slate-100 pt-1">
                                                Danh sách mã khả dụng
                                              </div>

                                              {/* Vang lai */}
                                              {("KH-VANGLAI".toLowerCase().includes(dropdownSearch.toLowerCase()) || "vãng lai".includes(dropdownSearch.toLowerCase())) && (
                                                <button
                                                  onClick={() => {
                                                    handleManualAssign(row.originalIndex, "KH-VANGLAI", "Khách hàng vãng lai");
                                                    setActiveDropdown(null);
                                                  }}
                                                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 transition font-mono font-medium text-[10px] flex flex-col"
                                                >
                                                  <span className="text-rose-650 font-bold">KH-VANGLAI</span>
                                                  <span className="text-[9px] text-slate-400 font-sans">Khách hàng vãng lai</span>
                                                </button>
                                              )}

                                              {/* Filter rules */}
                                              {(() => {
                                                const searchLower = dropdownSearch.toLowerCase();
                                                const matches = rules.filter(rule =>
                                                  rule.customerCode.toLowerCase().includes(searchLower) ||
                                                  rule.customerName.toLowerCase().includes(searchLower) ||
                                                  (rule.keywords && rule.keywords.some(kw => kw.toLowerCase().includes(searchLower)))
                                                );

                                                if (matches.length === 0 && !("KH-VANGLAI".toLowerCase().includes(dropdownSearch.toLowerCase()) || "vãng lai".includes(dropdownSearch.toLowerCase()))) {
                                                  return <div className="text-center text-slate-400 py-4 text-[11px]">Không tìm thấy mã nào phù hợp</div>;
                                                }

                                                return matches.map(rule => (
                                                  <button
                                                    key={rule.id}
                                                    onClick={() => {
                                                      handleManualAssign(row.originalIndex, rule.customerCode, rule.customerName);
                                                      setActiveDropdown(null);
                                                    }}
                                                    className={`w-full text-left px-2 py-1.5 rounded-lg hover:bg-sky-50 transition border border-transparent font-mono text-[10px] flex flex-col ${row.customerCode === rule.customerCode
                                                        ? "bg-sky-50 text-indigo-900 font-bold border-sky-100"
                                                        : ""
                                                      }`}
                                                  >
                                                    <span className="text-slate-800 font-bold">{rule.customerCode}</span>
                                                    <span className="text-[9px] text-slate-400 font-sans font-medium truncate">{rule.customerName}</span>
                                                  </button>
                                                ));
                                              })()}
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    (() => {
                                      const descLower = row.description.toLowerCase();

                                      // Get parentRule / currently selected keyword
                                      const parentRule = rules.find(r => r.customerCode === row.customerCode);
                                      const currentKw = (() => {
                                        if (!parentRule) return "Vãng lai";
                                        if (row.matchedKeyword && parentRule.keywords.some(k => k.toLowerCase() === row.matchedKeyword?.toLowerCase())) {
                                          return parentRule.keywords.find(k => k.toLowerCase() === row.matchedKeyword?.toLowerCase()) || parentRule.keywords[0] || "";
                                        }
                                        return parentRule.keywords[0] || parentRule.customerCode;
                                      })();

                                      // List keywords containing in row.description (suggestions)
                                      // ALWAYS compute based on row.description so that even after manual override,
                                      // we can still detect matching terms in row.description and show them as "✨ Gợi ý"!
                                      const detectedKws = allKeywordsList.filter(item =>
                                        descLower.includes(item.keyword.toLowerCase())
                                      );

                                      const remainingKws = allKeywordsList.filter(item =>
                                        !descLower.includes(item.keyword.toLowerCase())
                                      );

                                      return (
                                        <div className="relative inline-block text-left">
                                          <button
                                            onClick={() => {
                                              setActiveDropdown({ rowIndex: row.originalIndex, type: "keyword" });
                                              setDropdownSearch("");
                                            }}
                                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer text-left w-[110px] flex items-center justify-between gap-1 transition"
                                          >
                                            <span className="truncate">{currentKw}</span>
                                            <ChevronDown className="w-3 h-3 text-emerald-400 shrink-0" />
                                          </button>

                                          {activeDropdown?.rowIndex === row.originalIndex && activeDropdown?.type === "keyword" && (
                                            <>
                                              {/* Backdrop to close list */}
                                              <div className="fixed inset-0 z-40 cursor-default" onClick={() => setActiveDropdown(null)} />

                                              {/* Custom Popover */}
                                              <div className="absolute left-0 mt-1 w-[280px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs flex flex-col gap-2 animate-in fade-in duration-100">
                                                {/* Search Box */}
                                                <div className="relative flex items-center">
                                                  <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                                  <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Tìm từ khóa, mã hoặc tên KH..."
                                                    value={dropdownSearch}
                                                    onChange={e => setDropdownSearch(e.target.value)}
                                                    className="w-full bg-slate-50 text-slate-800 font-medium pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-slate-400 text-[11px]"
                                                  />
                                                  {dropdownSearch && (
                                                    <button
                                                      onClick={() => setDropdownSearch("")}
                                                      className="absolute right-2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                                                    >
                                                      Xóa
                                                    </button>
                                                  )}
                                                </div>

                                                {/* Scrollable list */}
                                                <div className="max-h-[220px] overflow-y-auto flex flex-col gap-0.5 pr-1 text-slate-700">
                                                  {/* Current Choice */}
                                                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1 bg-slate-50/50 rounded">
                                                    Đang chọn
                                                  </div>
                                                  <button
                                                    onClick={() => {
                                                      setActiveDropdown(null);
                                                    }}
                                                    className="w-full text-left px-2 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-100 font-bold font-mono text-[10px] flex items-center justify-between"
                                                  >
                                                    <span className="truncate py-1">{currentKw}</span>
                                                    {parentRule && (
                                                      <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded mr-1">
                                                        {parentRule.customerCode}
                                                      </span>
                                                    )}
                                                  </button>

                                                  {/* GỢI Ý - SUGGESTIONS SEARCH OR NATURALLY PRESENT */}
                                                  {(() => {
                                                    const searchLower = dropdownSearch.toLowerCase();
                                                    const filteredSuggests = detectedKws.filter(item =>
                                                      item.keyword.toLowerCase().includes(searchLower) ||
                                                      item.rule.customerCode.toLowerCase().includes(searchLower) ||
                                                      item.rule.customerName.toLowerCase().includes(searchLower)
                                                    );

                                                    if (filteredSuggests.length > 0) {
                                                      return (
                                                        <>
                                                          <div className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-wider px-2 py-1 mt-1 border-t border-slate-100 pt-1 flex items-center gap-1">
                                                            <span>✨ Gợi ý (Tìm thấy trong diễn giải)</span>
                                                          </div>
                                                          {filteredSuggests.map((item, idx) => (
                                                            <button
                                                              key={`suggest-${idx}`}
                                                              onClick={() => {
                                                                handleManualAssign(row.originalIndex, item.rule.customerCode, item.rule.customerName, item.keyword);
                                                                setActiveDropdown(null);
                                                              }}
                                                              className="w-full text-left px-2 py-1.5 text-[10px] font-bold text-slate-800 hover:bg-emerald-50 rounded-lg transition font-mono flex items-center justify-between border border-transparent hover:border-emerald-100"
                                                            >
                                                              <div className="flex flex-col text-left truncate">
                                                                <span className="truncate font-bold">🔍 {item.keyword}</span>
                                                                {item.rule.customerName && (
                                                                  <span className="text-[8px] text-slate-400 font-sans font-normal truncate mt-0.5">{item.rule.customerName}</span>
                                                                )}
                                                              </div>
                                                              <span className="text-[8px] bg-slate-100 text-slate-500 px-1 rounded truncate shrink-0 ml-1 font-semibold">
                                                                {item.rule.customerCode}
                                                              </span>
                                                            </button>
                                                          ))}
                                                        </>
                                                      );
                                                    }
                                                    return null;
                                                  })()}

                                                  {/* ALL OTHER KEYWORDS SECTION */}
                                                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1 mt-1 border-t border-slate-100 pt-1">
                                                    Danh sách từ khóa khác
                                                  </div>

                                                  {/* Vanglai */}
                                                  {("KH-VANGLAI".toLowerCase().includes(dropdownSearch.toLowerCase()) || "vãng lai".includes(dropdownSearch.toLowerCase())) && (
                                                    <button
                                                      onClick={() => {
                                                        handleManualAssign(row.originalIndex, "KH-VANGLAI", "Khách hàng vãng lai", undefined);
                                                        setActiveDropdown(null);
                                                      }}
                                                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 transition font-mono font-medium text-[10px] flex flex-col"
                                                    >
                                                      <span className="text-rose-600 font-bold">Vãng lai (Không khớp)</span>
                                                    </button>
                                                  )}

                                                  {(() => {
                                                    const searchLower = dropdownSearch.toLowerCase();
                                                    const matches = remainingKws.filter(item =>
                                                      item.keyword.toLowerCase().includes(searchLower) ||
                                                      item.rule.customerCode.toLowerCase().includes(searchLower) ||
                                                      item.rule.customerName.toLowerCase().includes(searchLower)
                                                    );

                                                    if (matches.length === 0 && !("KH-VANGLAI".toLowerCase().includes(dropdownSearch.toLowerCase()) || "vãng lai".includes(dropdownSearch.toLowerCase()))) {
                                                      return <div className="text-center text-slate-400 py-4 text-[11px]">Không tìm thấy từ khóa nào phù hợp</div>;
                                                    }

                                                    return matches.map((item, idx) => (
                                                      <button
                                                        key={`all-${idx}`}
                                                        onClick={() => {
                                                          handleManualAssign(row.originalIndex, item.rule.customerCode, item.rule.customerName, item.keyword);
                                                          setActiveDropdown(null);
                                                        }}
                                                        className={`w-full text-left px-2 py-1 rounded-lg hover:bg-slate-50 border border-transparent transition font-mono text-[10px] flex items-center justify-between ${currentKw === item.keyword ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-600"
                                                          }`}
                                                      >
                                                        <span className="truncate">{item.keyword}</span>
                                                        <span className="text-[8px] bg-slate-100 text-slate-500 px-1 rounded truncate shrink-0 ml-1">
                                                          {item.rule.customerCode}
                                                        </span>
                                                      </button>
                                                    ));
                                                  })()}
                                                </div>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })()
                                  )}
                                </div>
                              </td>

                              {/* Customer name */}
                              <td className="p-3 font-semibold text-slate-800">
                                {row.customerName}
                              </td>

                              {/* Bank original description details with term highlight if matches! */}
                              <td className="p-3 text-slate-600 leading-normal min-w-[380px] break-words whitespace-normal">
                                {row.matchedKeyword && row.matchedKeyword !== "Thay đổi thủ công" ? (
                                  <div>
                                    {/* Bold matched keyword visually */}
                                    {(() => {
                                      const keyw = row.matchedKeyword;
                                      const idx = row.description.toLowerCase().indexOf(keyw.toLowerCase());
                                      if (idx >= 0) {
                                        const before = row.description.substring(0, idx);
                                        const matchTerm = row.description.substring(idx, idx + keyw.length);
                                        const after = row.description.substring(idx + keyw.length);
                                        return (
                                          <span>
                                            {before}
                                            <span className="bg-amber-100 text-amber-950 font-bold px-1 rounded border border-amber-200">
                                              {matchTerm}
                                            </span>
                                            {after}
                                          </span>
                                        );
                                      }
                                      return row.description;
                                    })()}

                                    {/* Multiple keyword warnings badge */}
                                    {row.allMatchedKeywords && row.allMatchedKeywords.length > 1 && (
                                      <div className="mt-1.5 flex items-center">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-850 text-[10px] font-bold leading-none animate-pulse">
                                          ⚠️ Phát hiện trùng {row.allMatchedKeywords.length} từ khóa: {row.allMatchedKeywords.map(k => `"${k}"`).join(", ")} (Đã gán theo từ khoá dài nhất)
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  row.description
                                )}
                              </td>

                              {/* Amount (Column D > 0) */}
                              <td className="p-3 font-mono font-bold text-emerald-600 text-right text-xs">
                                {row.amount.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                              </td>

                              {/* Accuracy percentage */}
                              <td className="p-3 text-center">
                                {row.isOverridden ? (
                                  <span className="text-indigo-650 font-mono font-extrabold bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">100%</span>
                                ) : row.matchedKeyword !== null ? (
                                  <span className={`font-mono font-bold ${(row.accuracyRate || 0) >= 90
                                      ? "text-emerald-600"
                                      : "text-amber-600"
                                    }`}>
                                    {row.accuracyRate}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-mono">0%</span>
                                )}
                              </td>

                              {/* Algorithm Confidence Status Level */}
                              <td className="p-3 text-center">
                                {row.isOverridden ? (
                                  <span className="text-indigo-650 font-mono font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-150" title="Đã gán thủ công">
                                    100%
                                  </span>
                                ) : row.matchedKeyword !== null ? (
                                  (() => {
                                    const rate = row.confidenceRate || (() => {
                                      if (row.confidenceLevel?.includes("Nội tại")) return 99;
                                      if (row.confidenceLevel?.includes("Khá (Nội suy)")) return 75;
                                      if (row.confidenceLevel?.includes("Trùng mã khác") && row.confidenceLevel?.includes("Tuyệt đối")) return 85;
                                      if (row.confidenceLevel?.includes("Trùng mã khác") && row.confidenceLevel?.includes("Trung bình")) return 60;
                                      return 80;
                                    })();
                                    return (
                                      <span className={`font-mono font-bold ${rate >= 90
                                          ? "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100"
                                          : "text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100"
                                        }`}>
                                        {rate}%
                                      </span>
                                    );
                                  })()
                                ) : (
                                  <span className="text-gray-400 font-mono">0%</span>
                                )}
                              </td>

                              {/* Status classification indicator */}
                              <td className="p-3 text-center whitespace-nowrap">
                                {row.isOverridden ? (
                                  <span className="bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-200">
                                    Sửa thủ công ✍️
                                  </span>
                                ) : row.matchedKeyword ? (
                                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-100">
                                    Mô tả chứa "{row.matchedKeyword}"
                                  </span>
                                ) : (
                                  <span className="bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-rose-250">
                                    Khớp Vãng lai ⚠️
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* Decorative minimalistic footer */}
      <footer className="bg-white text-gray-500 border-t border-gray-250 text-center py-6 text-xs mt-12 select-none">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Accounting Helper. Bộ công cụ tự động hóa kế toán thông minh.</p>
          <p className="mt-1 text-gray-400">
            Hệ thống xử lý hoàn toàn trực tuyến bảo mật, cam kết an toàn dữ liệu doanh nghiệp một cách tuyệt đối.
          </p>
        </div>
      </footer>

      {activeExcelFilterCol && (
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent cursor-default"
            onClick={() => setActiveExcelFilterCol(null)}
          />
          {renderExcelFilterDropdown(activeExcelFilterCol)}
        </>
      )}

    </div>
  );
}
