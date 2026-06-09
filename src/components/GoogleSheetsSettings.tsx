import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Sparkles
} from "lucide-react";
import { KeywordRule } from "../types";
import { 
  SheetsConfig, 
  loadSheetsConfig, 
  saveSheetsConfig, 
  pullRulesFromGoogleSheet, 
  pushRulesToGoogleSheet, 
  writeActionLogToSheet
} from "../utils/googleSheetsSync";

interface GoogleSheetsSettingsProps {
  rules: KeywordRule[];
  onRulesSynced: (updatedRules: KeywordRule[], message: string) => void;
  userEmailStateRef: React.MutableRefObject<string>;
}

export const GoogleSheetsSettings: React.FC<GoogleSheetsSettingsProps> = ({ 
  rules, 
  onRulesSynced,
  userEmailStateRef
}) => {
  const [config, setConfig] = useState<SheetsConfig>(loadSheetsConfig());
  const [urlInput, setUrlInput] = useState(config.webAppUrl);
  const [nameInput, setNameInput] = useState(config.userName);
  const [isSyncing, setIsSyncing] = useState(false);
  const [noti, setNoti] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  const showNotification = (type: "success" | "error" | "info", msg: string) => {
    setNoti({ type, msg });
    setTimeout(() => setNoti(null), 6000);
  };

  useEffect(() => {
    if (config.userName) {
      userEmailStateRef.current = config.userName;
    } else {
      userEmailStateRef.current = "Kế toán viên (Chưa đặt tên)";
    }
  }, [config.userName]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.trim();
    setUrlInput(input);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setNameInput(input);
  };

  const handleSaveConfig = () => {
    if (!urlInput.startsWith("https://script.google.com/macros/s/")) {
      showNotification("error", "URL Web App không hợp lệ! Vui lòng nhập đúng đường dẫn Google Apps Script.");
      return;
    }
    const newConfig = { ...config, webAppUrl: urlInput, userName: nameInput };
    setConfig(newConfig);
    saveSheetsConfig(newConfig);
    showNotification("success", "Lưu cấu hình Web App thành công!");
    
    if (newConfig.logsEnabled) {
      writeActionLogToSheet(newConfig.webAppUrl, "", newConfig.userName, "Kết nối", "Đã lưu cấu hình Google Apps Script Web App");
    }
  };

  const toggleSyncEnabled = (checked: boolean) => {
    setConfig(prev => {
      const u = { ...prev, syncEnabled: checked };
      saveSheetsConfig({ syncEnabled: checked });
      return u;
    });
  };

  const togglePullEnabled = (checked: boolean) => {
    setConfig(prev => {
      const u = { ...prev, autoPull: checked };
      saveSheetsConfig({ autoPull: checked });
      return u;
    });
  };

  const togglePushEnabled = (checked: boolean) => {
    setConfig(prev => {
      const u = { ...prev, autoPush: checked };
      saveSheetsConfig({ autoPush: checked });
      return u;
    });
  };

  const toggleLogsEnabled = (checked: boolean) => {
    setConfig(prev => {
      const u = { ...prev, logsEnabled: checked };
      saveSheetsConfig({ logsEnabled: checked });
      return u;
    });
  };

  const handleManualPull = async () => {
    if (!config.webAppUrl) {
      showNotification("error", "Chưa cấu hình URL Web App!");
      return;
    }
    
    setIsSyncing(true);
    showNotification("info", "Đang tải cấu hình từ Google Sheets...");
    try {
      const pulledRules = await pullRulesFromGoogleSheet(config.webAppUrl);
      onRulesSynced(pulledRules, `Đã đồng bộ thành công ${pulledRules.length} từ khóa từ Google Sheets!`);
      showNotification("success", `Tải cấu hình thành công! Đã áp dụng ${pulledRules.length} quy tắc lọc.`);
      
      if (config.logsEnabled) {
        await writeActionLogToSheet(
          config.webAppUrl,
          "",
          config.userName,
          "Tải cấu hình về",
          `Đã ghi đè thủ công ${pulledRules.length} từ khóa gán vào bộ nhớ tạm`
        );
      }
    } catch (err: any) {
      showNotification("error", `Lỗi: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualPush = async () => {
    if (!config.webAppUrl) {
      showNotification("error", "Chưa cấu hình URL Web App!");
      return;
    }

    const confirmPush = window.confirm(`Bạn có chắc chắn muốn GHI ĐÈ toàn bộ ${rules.length} từ khóa hiện tại lên Google Sheets?`);
    if (!confirmPush) return;

    setIsSyncing(true);
    showNotification("info", "Đang tải dữ liệu cấu hình lên Google Sheet...");
    try {
      await pushRulesToGoogleSheet(rules, config.webAppUrl, "");
      showNotification("success", `Đã lưu đè thành công ${rules.length} từ khóa lên Google Sheets!`);
      
      if (config.logsEnabled) {
        await writeActionLogToSheet(
          config.webAppUrl,
          "",
          config.userName,
          "Ghi cấu hình lên",
          `Đã ghi đè thủ công ${rules.length} từ khóa lên bảng KeywordRules`
        );
      }
    } catch (err: any) {
      showNotification("error", `Lưu file thất bại: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6 animate-fade-in" id="google-sheets-sync-wrapper">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5.5 h-5.5 text-emerald-600" />
            Đồng Bộ Google Sheets (Private Web App)
            <span className="text-xs bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Tự động hóa
            </span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Kết nối thông qua Google Apps Script Web App để không cần đăng nhập tài khoản.
          </p>
        </div>
      </div>

      {noti && (
        <div className={`flex items-start gap-3 px-4.5 py-3.5 rounded-xl text-xs font-semibold animate-fade-in ${
          noti.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-100" :
          noti.type === "info" ? "bg-sky-50 text-sky-800 border-sky-100" :
          "bg-rose-50 text-rose-800 border-rose-100"
        } border`}>
          {noti.type === "success" ? <CheckCircle className="w-4.5 h-4.5 text-emerald-600 mt-0.5" /> : <AlertCircle className="w-4.5 h-4.5 mt-0.5" />}
          <span>{noti.msg}</span>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6 space-y-4">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tên của bạn (Để lưu log):</label>
            <input
              type="text"
              value={nameInput}
              onChange={handleNameChange}
              placeholder="VD: Kế toán A"
              className="w-full bg-white border border-slate-250 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg focus:outline-hidden focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Web App URL (Google Apps Script):</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={handleUrlChange}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-white border border-slate-250 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleSaveConfig}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-col md:flex-row md:items-center gap-4.5 text-xs font-semibold text-slate-600">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.autoPull} onChange={(e) => togglePullEnabled(e.target.checked)} className="accent-emerald-600 w-4 h-4" />
            <span>Tự động tải cấu hình khi mở app</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.autoPush} onChange={(e) => togglePushEnabled(e.target.checked)} className="accent-emerald-600 w-4 h-4" />
            <span>Tự động đẩy cấu hình lên khi có thay đổi</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.logsEnabled} onChange={(e) => toggleLogsEnabled(e.target.checked)} className="accent-emerald-600 w-4 h-4" />
            <span>Lưu nhật ký thao tác nhóm lên cloud</span>
          </label>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-5 border border-slate-150 flex flex-col justify-between">
        <h3 className="font-bold text-xs uppercase text-slate-500 mb-3 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Tác vụ đồng bộ dữ liệu thủ công
        </h3>
        <div className="grid grid-cols-2 gap-3.5 mt-2">
          <button
            type="button"
            onClick={handleManualPull}
            disabled={!config.webAppUrl || isSyncing}
            className="bg-white hover:bg-emerald-50 border border-emerald-250 text-emerald-800 font-bold py-2.5 px-3 rounded-lg shadow-2xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs"
          >
            Kéo Từ Khóa Về
          </button>
          <button
            type="button"
            onClick={handleManualPush}
            disabled={!config.webAppUrl || isSyncing}
            className="bg-white hover:bg-indigo-50 border border-indigo-250 text-indigo-900 font-bold py-2.5 px-3 rounded-lg shadow-2xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
            Ghi Từ Khóa Lên
          </button>
        </div>
      </div>
    </div>
  );
};
