import { KeywordRule } from "../types";

export const STORAGE_KEYS = {
  WEB_APP_URL: "google_sheets_web_app_url",
  USER_NAME: "google_sheets_user_name",
  SYNC_ENABLED: "google_sheets_sync_enabled",
  AUTO_PULL: "google_sheets_sync_auto_pull",
  AUTO_PUSH: "google_sheets_sync_auto_push",
  LOGS_ENABLED: "google_sheets_sync_logs",
};

export interface SheetsConfig {
  webAppUrl: string;
  userName: string;
  syncEnabled: boolean;
  autoPull: boolean;
  autoPush: boolean;
  logsEnabled: boolean;
}

export function loadSheetsConfig(): SheetsConfig {
  return {
    webAppUrl: localStorage.getItem(STORAGE_KEYS.WEB_APP_URL) || "https://script.google.com/macros/s/AKfycbwxoHW4gM5bCPR_KeSys3iegI64PpuzRMHGstK6HjEKSz8UVjkUCdahe52pWN1_dFYd/exec",
    userName: localStorage.getItem(STORAGE_KEYS.USER_NAME) || "Kế toán viên",
    syncEnabled: localStorage.getItem(STORAGE_KEYS.SYNC_ENABLED) !== "false",
    autoPull: localStorage.getItem(STORAGE_KEYS.AUTO_PULL) !== "false",
    autoPush: localStorage.getItem(STORAGE_KEYS.AUTO_PUSH) !== "false",
    logsEnabled: localStorage.getItem(STORAGE_KEYS.LOGS_ENABLED) !== "false",
  };
}

export function saveSheetsConfig(config: Partial<SheetsConfig>): void {
  if (config.webAppUrl !== undefined) localStorage.setItem(STORAGE_KEYS.WEB_APP_URL, config.webAppUrl.trim());
  if (config.userName !== undefined) localStorage.setItem(STORAGE_KEYS.USER_NAME, config.userName.trim());
  if (config.syncEnabled !== undefined) localStorage.setItem(STORAGE_KEYS.SYNC_ENABLED, String(config.syncEnabled));
  if (config.autoPull !== undefined) localStorage.setItem(STORAGE_KEYS.AUTO_PULL, String(config.autoPull));
  if (config.autoPush !== undefined) localStorage.setItem(STORAGE_KEYS.AUTO_PUSH, String(config.autoPush));
  if (config.logsEnabled !== undefined) localStorage.setItem(STORAGE_KEYS.LOGS_ENABLED, String(config.logsEnabled));
}

// Dummy functions to satisfy old imports in App.tsx without breaking
export function isTokenValid(): boolean { return true; }
export function initiateGoogleLogin(): void {}
export async function fetchUserProfile(): Promise<any> { return {}; }
export async function createNewSpreadsheet(): Promise<string> { return ""; }
export async function createRequiredSheets(): Promise<void> {}
export async function pullRulesFromGoogleSheetPublic(): Promise<KeywordRule[]> { return []; }

export async function writeActionLogToSheet(
  webAppUrl: string,
  _token: string, // Kept for compatibility, ignored
  userStr: string,
  actionName: string,
  actionDetails: string
): Promise<void> {
  if (!webAppUrl) return;
  try {
    const browserDetails = `Kiểu: ${navigator.userAgent.substring(0, 75)}...`;
    
    await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "log",
        user: userStr,
        actionName,
        actionDetails,
        browserDetails
      })
    });
  } catch (err) {
    console.error("Failed to append activity logs:", err);
  }
}

export async function pullRulesFromGoogleSheet(webAppUrl: string, _token?: string | null): Promise<KeywordRule[]> {
  if (!webAppUrl) return [];
  try {
    const response = await fetch(`${webAppUrl}?action=get_rules`);
    if (response.ok) {
      const result = await response.json();
      if (result.status === "success" && result.data) {
        return parseKeywordRulesRows(result.data);
      }
    }
  } catch (err) {
    console.error("Lỗi khi tải từ khóa từ Web App:", err);
  }
  return [];
}

function parseKeywordRulesRows(rows: any[][]): KeywordRule[] {
  const rulesMap: Record<string, KeywordRule> = {};
  
  rows.forEach((row: any, idx: number) => {
    const keyword = String(row[0] || "").trim();
    const customerCode = String(row[1] || "").toUpperCase().trim();
    const customerName = String(row[2] || "").trim();
    const note = row[3] ? String(row[3]).trim() : undefined;
    
    if (!customerCode || !keyword) return;
    
    if (!rulesMap[customerCode]) {
      rulesMap[customerCode] = {
        id: `gs-${customerCode}-${idx}`,
        customerCode,
        customerName: customerName || customerCode,
        keywords: [keyword],
        note
      };
    } else {
      if (!rulesMap[customerCode].keywords.map(k => k.toLowerCase()).includes(keyword.toLowerCase())) {
        rulesMap[customerCode].keywords.push(keyword);
      }
      if (note && !rulesMap[customerCode].note) {
        rulesMap[customerCode].note = note;
      }
    }
  });
  
  return Object.values(rulesMap);
}

export async function pushRulesToGoogleSheet(rules: KeywordRule[], webAppUrl: string, _token: string): Promise<void> {
  if (!webAppUrl || rules.length === 0) return;
  
  const values: any[][] = [];
  rules.forEach(r => {
    r.keywords.forEach(kw => {
      values.push([kw, r.customerCode, r.customerName, r.note || ""]);
    });
  });

  try {
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "overwrite_rules",
        rules: values
      })
    });
    
    if (!response.ok) {
      throw new Error(`Web App returned error: ${response.statusText}`);
    }
  } catch(err) {
    console.error("Failed to push rules", err);
    throw err;
  }
}
