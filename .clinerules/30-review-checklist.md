# ✅ Review Checklist — chạy trước khi `attempt_completion`

> Mọi thay đổi (dù chỉ 1 dòng) PHẢI đi qua checklist này.

## 1. Manifest & permissions

- [ ] `manifest.json` JSON hợp lệ (`jq . manifest.json` không lỗi).
- [ ] `manifest_version` vẫn là `3`.
- [ ] Không thêm `permissions` mà không cập nhật README bảng Permissions.
- [ ] `host_permissions` chỉ chứa `studocu.com` / `studocu.vn` (apex + subdomain).
- [ ] `content_scripts.matches` đồng bộ với `host_permissions`.
- [ ] `web_accessible_resources` chỉ chứa file mà page thực sự fetch (KHÔNG cần liệt kê file
      được inject qua `chrome.scripting`).

## 2. JavaScript (không build, không transpile)

- [ ] Không dùng syntax cần build step (TypeScript, JSX, decorator…).
- [ ] Popup dùng ES modules (`<script type="module">`); content/viewer dùng IIFE classic script.
- [ ] Không dùng `import`/`export` trong `content.js` hoặc `viewer.js`.
- [ ] Mọi `chrome.*` API call có `await` hoặc `.then` xử lý lỗi.
- [ ] Không có `console.log` còn lại — chỉ `console.warn`/`console.error` với prefix
      `[StudocuCleaner]`.
- [ ] ESLint pass: `npm run lint` không lỗi (warning OK).

## 3. i18n

- [ ] Mọi text user-visible đi qua `t(key)` (popup) hoặc `TRANSLATIONS[lang]` (viewer).
- [ ] Key mới có cả `vi` và `en`; placeholder `{name}` đồng bộ giữa 2 ngôn ngữ.
- [ ] Không hardcode tiếng Việt/Anh trong `index.html` (dùng `data-i18n="key"`).

## 4. Selectors & DOM contract

- [ ] Selector mới đã được kiểm tra trên trang Studocu thật (manual test).
- [ ] Nếu thêm vào `REMOVE_SELECTORS` → có safety guard (`querySelector('.pf, .pc, [data-page-index]')`).
- [ ] Nếu thêm vào `WATERMARK_SELECTORS` → không match trúng `.pc` hay text node thật.

## 5. CSS

- [ ] `content.css` chỉ ảnh hưởng overlay/blur, không đổi typography của trang.
- [ ] `viewer.css` rule `body.sdc-viewer-active > *:not(...)` còn loại trừ `#clean-viewer-container`
      và `#sdc-overlay`.
- [ ] `@media print` còn `@page { size: A4 portrait }` và `page-break-after: always`.

## 6. Docs

- [ ] `DESIGN.md` cập nhật nếu có hàm/module thay đổi.
- [ ] `README.md` Changelog cập nhật nếu version bump.
- [ ] Không tài liệu nào tham chiếu file/hàm đã xóa.

## 7. Release

- [ ] `manifest.json#version` không tăng nếu chưa muốn release ngay.
- [ ] Nếu tăng version → tag git phải khớp (`vX.Y`) và push từ `develop`.

## 8. Final sanity

- [ ] `git status` chỉ liệt kê file đã được cố ý sửa.
- [ ] Không commit `.DS_Store`, `.vscode/`, `node_modules/`, `*.zip`.
- [ ] Diff đọc lại: không có comment "TODO" tạm bỏ quên.
