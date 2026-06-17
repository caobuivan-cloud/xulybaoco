# XuLyBaoCo - Context for AI Assistants

---

## 1. Project Overview

- **Tên dự án**: XuLyBaoCo (Hệ thống Xử lý và Hạch toán Báo có ngân hàng)
- **Repo**: https://github.com/caobuivan-cloud/xulybaoco.git
- **Trạng thái**: Development / Active (Đầy đủ tính năng phân tích file Excel báo có ngân hàng, gán mã khách hàng theo từ khóa và sinh số phiếu hạch toán theo ngày).

### Tech Stack
- **Frontend**: React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4, Recharts (Biểu đồ thống kê), `xlsx` (Đọc Excel), `xlsx-populate` (Ghi và định dạng Excel theo mẫu phức tạp), Lucide React (Icons), Motion (Hiệu ứng động).
- **Backend**: Serverless (Sử dụng Google Apps Script Web App URL làm API trung gian kết nối Google Sheets).
- **Database**: LocalStorage (Lưu trữ cục bộ các quy tắc đối chiếu từ khóa và cấu hình cột), Google Sheets (Lưu trữ từ xa các quy tắc và nhật ký hoạt động).
- **Auth**: Lấy thông tin tài khoản Portal VCCorp thông qua IndexedDB (`firebaseLocalStorageDb`).
- **Infrastructure**: Static Web App, deploy local/production qua Vite dev server hoặc tĩnh hóa `dist/`.

---

## 2. `.agent/` Directory Navigation

### Core Maps
| File | Mô tả |
|------|------|
| [CONTEXT.md](./CONTEXT.md) | Bản đồ nhanh để onboard và resume |
| [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) | Quyết định kiến trúc và lý do chiến lược |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Snapshot cấu trúc thư mục, entry points, services và commands |

### Architecture
| File | Mô tả |
|------|------|
| [architecture/MASTER.md](./architecture/MASTER.md) | Kiến trúc tổng thể và các boundary chính (Chưa khởi tạo) |

### Changelog
| File | Mô tả |
|------|------|
| [changelog/CHANGELOG-FE.md](./changelog/CHANGELOG-FE.md) | Thay đổi frontend, UI, UX, client-side flow |

### Agent Skills
| Skill | Mô tả |
|------|------|
| [skills/README.md](./skills/README.md) | Tổng quan skill pack và flow chuẩn |
| [skills/project-init/SKILL.md](./skills/project-init/SKILL.md) | Chuẩn hóa, bổ sung, hoặc audit bộ `.agent/` |
| [skills/feature-plan/SKILL.md](./skills/feature-plan/SKILL.md) | Lập kế hoạch cho feature mới |
| [skills/feature-review/SKILL.md](./skills/feature-review/SKILL.md) | Review plan về kiến trúc, bảo mật, logic và rollout |
| [skills/feature-coordinator/SKILL.md](./skills/feature-coordinator/SKILL.md) | Triển khai feature theo phase và checklist |
| [skills/update-docs/SKILL.md](./skills/update-docs/SKILL.md) | Cập nhật docs sau khi code thay đổi |
| [skills/check-issue/SKILL.md](./skills/check-issue/SKILL.md) | Điều tra root cause của bug hoặc sự cố |
| [skills/docs-hygiene/SKILL.md](./skills/docs-hygiene/SKILL.md) | Rà soát sức khỏe hệ thống tài liệu và read-path |
| [skills/git-sync/SKILL.md](./skills/git-sync/SKILL.md) | Đồng bộ Git sau khi đã chốt docs và commit message |

---

## 3. Critical Files

| File | Mức độ | Ghi chú |
|------|------|---------|
| [src/App.tsx](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/App.tsx) | CRITICAL | Entry point hiển thị toàn bộ giao diện, điều phối luồng import, cấu hình, xử lý và sync dữ liệu. |
| [src/utils/excelProcessor.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/excelProcessor.ts) | CRITICAL | Logic cốt lõi: Làm sạch số tiền, chuẩn hóa ngày tháng, khớp từ khóa (ưu tiên từ khóa dài nhất) và gom nhóm số phiếu theo ngày giao dịch. |
| [src/utils/googleSheetsSync.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/googleSheetsSync.ts) | IMPORTANT | Đồng bộ hai chiều các quy tắc đối chiếu từ khóa và ghi logs kế toán viên lên Google Sheets thông qua Web App URL. |
| [src/utils/templateExcelExport.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/utils/templateExcelExport.ts) | IMPORTANT | Tiện ích xuất dữ liệu hạch toán báo nợ/có theo tệp Excel mẫu dùng xlsx-populate. |
| [src/types.ts](file:///d:/Project_VCC/KeToanVCC/Ducuments/HachToanBaoCo/XuLyBaoCo/src/types.ts) | IMPORTANT | Định nghĩa kiểu dữ liệu thống nhất: cấu hình cột Excel, dòng xử lý, quy tắc từ khóa. |

---

## 4. Quick Commands

```powershell
# Khởi động môi trường phát triển local (Port: 3000)
npm run dev

# Kiểm tra kiểu TypeScript (Linting)
npm run lint

# Build ứng dụng cho môi trường production
npm run build

# Preview build cục bộ
npm run preview

# Dọn dẹp thư mục build cũ
npm run clean
```

---

*Last updated: 2026-06-15 | v1.0.0*
