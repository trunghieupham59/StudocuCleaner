# 📚 Project Context — Studocu Cleaner

> Bối cảnh chung cho mọi agent / phiên Cline làm việc trên repo này.
> Đọc file này TRƯỚC TIÊN trước khi đọc bất kỳ rule nào khác.

## TL;DR

Chrome Extension MV3 — bypass watermark, xóa blur, xuất PDF từ tài liệu Studocu.
- **Ngôn ngữ:** vanilla JavaScript (ES modules cho popup), không build step, không framework.
- **Manifest:** v3, không dùng background service worker (mọi logic chạy trong popup hoặc content script).
- **Hỗ trợ domain:** `studocu.com`, `studocu.vn` (cả apex và subdomain).

## Cấu trúc bắt buộc

```
manifest.json                  # MV3 config — version phải khớp tag git khi release
icons/                         # 16, 32, 48, 128 px (PNG only)
src/
  content/{content.css,content.js}   # auto-inject vào trang Studocu
  popup/                              # popup UI (ES modules)
    index.html, popup.css, popup.js
    modules/{i18n,status,actions,chrome-api}.js
  viewer/{viewer.css,viewer.js}       # inject vào trang khi xuất PDF
docs/                                  # tài liệu phụ trợ (audit, troubleshooting)
scripts/                               # validator local (manifest/i18n/docs) — KHÔNG vào ZIP
.github/workflows/                     # ci.yml + release.yml
.clinerules/                           # rule cho AI agent (file này)
eslint.config.mjs, package.json        # tooling — KHÔNG vào ZIP
DESIGN.md                              # kiến trúc tổng — phải đồng bộ với code
README.md                              # hướng dẫn user
```

## Nguyên tắc bất biến

1. **Không thêm dependency runtime.** Extension chạy thuần vanilla. Chỉ cho phép devDependency
   (ESLint, web-ext, jsonlint…).
2. **Không động đến `manifest.json` permissions** trừ khi bug-fix yêu cầu rõ ràng và đã ghi vào
   CHANGELOG. Mỗi permission phải kèm 1 dòng "Reason" trong README.
3. **Không inline build step.** Người dùng load unpacked thẳng từ thư mục — mọi file phải chạy
   được không qua bundler.
4. **i18n vi/en luôn song song.** Mọi key thêm vào `popup/modules/i18n.js` phải có cả 2 ngôn ngữ.
   Nếu thêm key trong `viewer.js` thì cũng phải thêm vào `TRANSLATIONS.vi` và `TRANSLATIONS.en`
   trong file đó.
5. **Selector & keyword cleanup-list** (REMOVE_SELECTORS, UNBLUR_SELECTORS, PAYWALL_KEYWORDS,
   WATERMARK_SELECTORS) là HỢP ĐỒNG với DOM của Studocu — khi sửa cần test lại trên trang thật.

## Quy ước commit

- `fix:` bug fix
- `feat:` tính năng mới
- `docs:` chỉ thay đổi tài liệu
- `chore:` build/CI/version bump
- `refactor:` không đổi behavior
- Khi bump version trong `manifest.json`: dùng `chore: bump version to X.Y`

## Khi review thay đổi

Luôn kiểm tra checklist sau (xem `.clinerules/30-review-checklist.md`).
