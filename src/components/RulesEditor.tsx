/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { KeywordRule } from "../types";
import { Plus, Trash2, Search, RotateCcw, Info, Download, Upload, Check, AlertTriangle, FileJson, FileSpreadsheet, Cloud } from "lucide-react";
import { GoogleSheetsSettings } from "./GoogleSheetsSettings";

interface RulesEditorProps {
  rules: KeywordRule[];
  onChange: (updated: KeywordRule[]) => void;
  onReset: () => void;
  userEmailStateRef: React.MutableRefObject<string>;
}

export const RulesEditor: React.FC<RulesEditorProps> = ({ rules, onChange, onReset, userEmailStateRef }) => {
  const [showSheetsConfig, setShowSheetsConfig] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newCustName, setNewCustName] = useState("");
  const [newCustCode, setNewCustCode] = useState("");
  const [newNote, setNewNote] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeyword, setEditKeyword] = useState("");
  const [editCustName, setEditCustName] = useState("");
  const [editCustCode, setEditCustCode] = useState("");
  const [editNote, setEditNote] = useState("");
  
  const [noti, setNoti] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showNotification = (type: "success" | "error", msg: string) => {
    setNoti({ type, msg });
    setTimeout(() => setNoti(null), 3000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newCustName.trim() || !newCustCode.trim()) {
      showNotification("error", "Vùi lòng nhập đầy đủ Từ khóa nhận diện, Tên khách hàng và Mã!");
      return;
    }

    const parsedKeywords = newKeyword.split(",").map(k => k.trim()).filter(Boolean);
    if (parsedKeywords.length === 0) {
      showNotification("error", "Vùi lòng cung cấp ít nhất một từ khóa nhận diện hợp lệ!");
      return;
    }

    // Check overlap of keywords across all rules
    const duplicateKw = rules.find(r => 
      r.keywords.some(k => parsedKeywords.map(pk => pk.toLowerCase()).includes(k.toLowerCase()))
    );

    if (duplicateKw) {
      showNotification("error", `Từ khóa này đã tồn tại trong quy tắc của mã: ${duplicateKw.customerCode}!`);
      return;
    }

    const newRule: KeywordRule = {
      id: String(Date.now()),
      customerCode: newCustCode.trim().toUpperCase(),
      customerName: newCustName.trim(),
      keywords: parsedKeywords,
      note: newNote.trim() || undefined
    };

    onChange([newRule, ...rules]);
    setNewKeyword("");
    setNewCustName("");
    setNewCustCode("");
    setNewNote("");
    showNotification("success", "Đã thêm quy tắc ánh xạ và từ khóa mới thành công.");
  };

  const handleDelete = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    onChange(updated);
    showNotification("success", "Đã xóa quy tắc và từ khóa thành công khỏi danh sách.");
  };

  const startEdit = (rule: KeywordRule) => {
    setEditingId(rule.id);
    setEditKeyword((rule.keywords || []).join(", "));
    setEditCustName(rule.customerName);
    setEditCustCode(rule.customerCode);
    setEditNote(rule.note || "");
  };

  const saveEdit = (id: string) => {
    const parsedEditKeywords = editKeyword.split(",").map(k => k.trim()).filter(Boolean);
    if (parsedEditKeywords.length === 0 || !editCustName.trim() || !editCustCode.trim()) {
      showNotification("error", "Dữ liệu chỉnh sửa không được bỏ trống các trường cốt lõi!");
      return;
    }

    onChange(
      rules.map(r => {
        if (r.id === id) {
          return {
            ...r,
            customerCode: editCustCode.trim().toUpperCase(),
            customerName: editCustName.trim(),
            keywords: parsedEditKeywords,
            note: editNote.trim() || undefined
          };
        }
        return r;
      })
    );
    setEditingId(null);
    showNotification("success", "Cập nhật mã và từ khóa đối chiếu thành công.");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // Export rules to JSON
  const handleExportJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rules, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `mẫu_từ_khóa_khách_hàng_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showNotification("success", "Export file cấu hình JSON thành công!");
    } catch {
      showNotification("error", "Lỗi lập cấu hình xuất file.");
    }
  };

  // Import rules from JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          // validate some fields
          const validated: KeywordRule[] = json.map((item, idx) => {
            const keywords: string[] = [];
            if (Array.isArray(item.keywords)) {
              keywords.push(...item.keywords);
            } else if (typeof item.keyword === "string" && item.keyword.trim()) {
              keywords.push(item.keyword.trim());
            } else if (typeof item.keywords === "string" && item.keywords.trim()) {
              keywords.push(...item.keywords.split(",").map((k: string) => k.trim()).filter(Boolean));
            }

            return {
              id: item.id || `imported-${idx}-${Date.now()}`,
              customerCode: String(item.customerCode || "KH-NHẬP").toUpperCase().trim(),
              customerName: String(item.customerName || "Khách hàng nhập").trim(),
              keywords: keywords.filter((k, i, self) => k && self.indexOf(k) === i),
              note: item.note ? String(item.note).trim() : undefined
            };
          }).filter(item => item.keywords.length > 0);

          if (validated.length === 0) {
            showNotification("error", "File JSON không hợp lệ hoặc không chứa bất kỳ từ khóa hợp lệ nào!");
            return;
          }

          // merge by customerCode
          const merged = [...validated];
          rules.forEach(r => {
            if (!merged.some(m => m.customerCode.toLowerCase() === r.customerCode.toLowerCase())) {
              merged.push(r);
            }
          });

          onChange(merged);
          showNotification("success", `Đã import và đồng bộ thành công ${validated.length} quy tắc Khách hàng!`);
        } else {
          showNotification("error", "Định dạng file cấu hình JSON không phù hợp (Phải là dạng danh sách).");
        }
      } catch {
        showNotification("error", "Quá trình đọc file JSON bị lỗi. Vui lòng thử lại!");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset inputs
  };

  // Import rules from Excel or CSV
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawJson = XLSX.utils.sheet_to_json<any[]>(worksheet);
        
        if (rawJson.length === 0) {
          showNotification("error", "File Excel không có dữ liệu để nhập!");
          return;
        }

        const firstRow = rawJson[0];
        const keys = Object.keys(firstRow);
        
        let keywordKey = "";
        let custCodeKey = "";
        let custNameKey = "";
        let noteKey = "";

        keys.forEach(k => {
          const norm = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          
          // Improved robust header recognition
          const isKw = ["tu khoa", "keyword", "tu_khoa", "tu-khoa", "tu khoa nhan dien", "tu_khoa_nhan_dien", "tu khoa nhan dang"].includes(norm) || norm.startsWith("tu khoa");
          const isCode = ["ma kh", "ma khach hang", "ma khach hang (key)", "ma doi tuong", "customer code", "customer_code", "customer-code", "key", "key doi chieu", "key_doi_chieu"].includes(norm) || norm.startsWith("ma khach hang") || norm.startsWith("ma kh") || norm.endsWith("(key)");
          const isName = ["ten kh", "ten khach hang", "ten doi tuong", "customer name", "customer_name", "ten khach hang tuong ung"].includes(norm) || norm.startsWith("ten khach hang") || norm.startsWith("ten kh");
          const isNote = ["note", "ghi chu", "ghi_chu", "dien giai", "dien_giai"].includes(norm) || norm.startsWith("ghi chu") || norm.startsWith("dien giai");

          if (isKw) {
            keywordKey = k;
          } else if (isCode) {
            custCodeKey = k;
          } else if (isName) {
            custNameKey = k;
          } else if (isNote) {
            noteKey = k;
          }
        });

        // Fallbacks
        if (!keywordKey && keys.length > 0) keywordKey = keys[0];
        if (!custCodeKey && keys.length > 1) custCodeKey = keys[1];
        if (!custNameKey && keys.length > 2) custNameKey = keys[2];
        if (!noteKey && keys.length > 3) noteKey = keys[3];

        if (!keywordKey || !custCodeKey || !custNameKey) {
          showNotification("error", "Không tự động nhận dạng được cấu trúc cột của file Excel!");
          return;
        }

        // Group rows by customerCode durring import to support multiple keyword rows
        const importedMap: Record<string, KeywordRule> = {};
        rawJson.forEach((row, idx) => {
          const kwVal = String(row[keywordKey] || "").trim();
          const code = String(row[custCodeKey] || "").toUpperCase().trim();
          const name = String(row[custNameKey] || "").trim();
          const noteStr = noteKey ? String(row[noteKey] || "").trim() : "";
          
          if (!code || !kwVal) return;
          
          // Split by comma if they loaded a multi-keyword row format
          const kwArr = kwVal.split(",").map(k => k.trim()).filter(Boolean);
          
          if (!importedMap[code]) {
            importedMap[code] = {
              id: `imported-xls-${idx}-${Date.now()}`,
              customerCode: code,
              customerName: name || code,
              keywords: kwArr,
              note: noteStr || undefined
            };
          } else {
            kwArr.forEach(kw => {
              if (!importedMap[code].keywords.map(k => k.toLowerCase()).includes(kw.toLowerCase())) {
                importedMap[code].keywords.push(kw);
              }
            });
            if (noteStr && !importedMap[code].note) {
              importedMap[code].note = noteStr;
            }
          }
        });

        const validated = Object.values(importedMap);

        if (validated.length === 0) {
          showNotification("error", "Không tìm thấy dòng dữ liệu từ khóa nào hợp lệ!");
          return;
        }

        // Merge keeping imported rules as high priority (matching duplicate customerCode override)
        const merged = [...validated];
        rules.forEach(r => {
          if (!merged.some(m => m.customerCode.toLowerCase() === r.customerCode.toLowerCase())) {
            merged.push(r);
          }
        });

        onChange(merged);
        showNotification("success", `Đã nhập và đồng bộ thành công ${validated.length} quy tắc từ file Excel/CSV!`);
      } catch (err) {
        console.error(err);
        showNotification("error", "Lỗi đọc file Excel/CSV, vui lòng thử lại!");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Export current rules to Excel/CSV with clean template form representing user format
  const handleExportExcel = () => {
    try {
      const excelBody: any[] = [];
      let index = 1;
      rules.forEach(r => {
        r.keywords.forEach(kw => {
          excelBody.push({
            "STT": index++,
            "Từ khóa": kw,
            "Mã khách hàng (Key)": r.customerCode,
            "Tên khách hàng tương ứng": r.customerName,
            "Ghi chú": r.note || ""
          });
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(excelBody);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 20 },
        { wch: 32 },
        { wch: 30 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Từ Khóa");
      XLSX.writeFile(workbook, `danh_sách_quy_tắc_đối_chiếu_${Date.now().toString().substring(8)}.xlsx`);
      showNotification("success", "Xuất file cấu hình Excel thành công!");
    } catch (err) {
      console.error(err);
      showNotification("error", "Không thể xuất file Excel.");
    }
  };

  const filteredRules = rules.filter(r => 
    r.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.note && r.note.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6" id="rules-editor-wrapper">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2" id="rules-title">
            Danh Sách Từ Khóa Ánh Xạ Khách Hàng
            <span className="text-xs bg-sky-50 text-sky-600 font-medium px-2 py-0.5 rounded-full">
              {rules.length} từ khóa
            </span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Gán khách hàng tự động dựa vào việc kiểm tra sự tồn tại của từ khóa trong cột nội dung giao dịch.
          </p>
        </div>

        {/* Action Controls for Reset & Export / Import */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-750 cursor-pointer text-xs font-semibold rounded-lg transition shadow-sm">
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            Nhập Excel/CSV
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} className="hidden" />
          </label>
          
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-750 text-xs font-semibold rounded-lg transition shadow-sm cursor-pointer"
            title="Tải về file Excel chứa danh sách từ khóa hiện có làm mẫu"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            Xuất Excel mẫu
          </button>

          <button
            onClick={() => setShowSheetsConfig(!showSheetsConfig)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded-lg transition cursor-pointer ${
              showSheetsConfig 
                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700" 
                : "bg-emerald-50 border-emerald-150 text-emerald-700 hover:bg-emerald-100"
            }`}
            title="Thiết lập đồng bộ đám mây trực tuyến với Google Sheets"
          >
            <Cloud className="w-3.5 h-3.5" />
            Đồng bộ Cloud Sheet
          </button>
        </div>
      </div>

      {showSheetsConfig && (
        <div className="mb-6 p-4 bg-emerald-50/10 border border-emerald-200/50 rounded-xl animate-fade-in">
          <GoogleSheetsSettings
            rules={rules}
            onRulesSynced={(updatedRules, message) => {
              onChange(updatedRules);
            }}
            userEmailStateRef={userEmailStateRef}
          />
        </div>
      )}

      {noti && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-5 text-sm font-semibold animate-fade-in ${
            noti.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
          }`}
        >
          {noti.type === "success" ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {noti.msg}
        </div>
      )}

      {/* Grid container for Adding form and Search Rules table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form add new */}
        <div className="lg:col-span-1 bg-slate-50 rounded-xl p-5 border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-4 text-sm tracking-wide uppercase flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-sky-500" />
            Thêm Ánh Xạ Mới
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">CÁC TỪ KHÓA NHẬN DIỆN <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Phân tách bởi dấu phẩy, VD: VCCORP, VCC CORP, VC CORP"
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
                required
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Một mã đối chiếu có thể có một hoặc nhiều từ khóa nhận dạng</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">MÃ ĐỐI CHIẾU (KEY) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="VD: KH-VCCORP"
                  value={newCustCode}
                  onChange={e => setNewCustCode(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 uppercase font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 font-sans">TÊN KHÁCH HÀNG <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="VD: Công ty CP VCCorp"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">GHI CHÚ / DIỄN GIẢI</label>
              <input
                type="text"
                placeholder="Nhập ghi chú thêm cho bộ phận kế toán"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition shadow-sm mt-2 button-submit"
            >
              <Plus className="w-4 h-4" />
              Thêm Quy Tắc Đối Chiếu
            </button>
          </form>

          <div className="mt-6 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-[11px] text-blue-800/80 leading-relaxed flex gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <strong>Cấu trúc thiết lập:</strong> Mỗi <strong>Mã đối chiếu / Khách hàng</strong> là duy nhất (Key) dùng để tra cứu thông tin. Mỗi Key này có thể tương ứng với một danh sách các từ khóa nhận dạng khác nhau, giúp tự động ghi nhận nghiệp vụ chính xác nhất.
            </div>
          </div>
        </div>

        {/* Search and Table rules */}
        <div className="lg:col-span-2">
          {/* Search box */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm từ khóa, mã đối chiếu, tên khách hàng..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-sm bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[365px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs select-text">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold tracking-wider">
                  <th className="p-3 w-1/3">Từ khóa nhận diện (Keywords)</th>
                  <th className="p-3">Mã khách hàng (Key)</th>
                  <th className="p-3">Tên khách hàng tương ứng</th>
                  <th className="p-3">Ghi chú</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Không tìm thấy quy tắc đối chiếu nào phù hợp với "{searchTerm}".
                    </td>
                  </tr>
                ) : (
                  filteredRules.map(rule => {
                    const isEditing = editingId === rule.id;
                    return (
                      <tr key={rule.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                        {isEditing ? (
                          <>
                            <td className="p-2">
                              <input
                                type="text"
                                value={editKeyword}
                                onChange={e => setEditKeyword(e.target.value)}
                                className="w-full p-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                                placeholder="Phân tách bởi dấu phẩy"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={editCustCode}
                                onChange={e => setEditCustCode(e.target.value)}
                                className="w-full p-1 bg-white border border-slate-300 rounded text-xs uppercase font-bold text-sky-700"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={editCustName}
                                onChange={e => setEditCustName(e.target.value)}
                                className="w-full p-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={editNote}
                                onChange={e => setEditNote(e.target.value)}
                                className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                              />
                            </td>
                            <td className="p-2 text-right space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => saveEdit(rule.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-[10px]"
                              >
                                Lưu
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-2 py-1 bg-slate-250 hover:bg-slate-300 text-slate-600 rounded font-medium text-[10px]"
                              >
                                Hủy
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {(rule.keywords || []).map((kw, idx) => (
                                  <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-semibold text-[10px]">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 font-bold">
                              <span className="bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded text-[10px]">
                                {rule.customerCode}
                              </span>
                            </td>
                            <td className="p-3 font-medium text-slate-800">{rule.customerName}</td>
                            <td className="p-3 text-slate-500 italic">{rule.note || "-"}</td>
                            <td className="p-3 text-right space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => startEdit(rule)}
                                className="text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDelete(rule.id)}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer animate-pulse-hover"
                                title="Xóa quy tắc đối chiếu"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
