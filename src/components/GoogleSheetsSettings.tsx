import React, { useState, useEffect } from "react";
import { 
  RefreshCw, 
  ExternalLink,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { KeywordRule } from "../types";
import { 
  SheetsConfig, 
  loadSheetsConfig, 
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
  const [config] = useState<SheetsConfig>(loadSheetsConfig());
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4 animate-fade-in">
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
