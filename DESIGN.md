# 📐 DESIGN.md — Studocu Tools (Chrome Extension MV3)

> Tài liệu này mô tả kiến trúc, luồng hoạt động và logic chi tiết của toàn bộ codebase.

---

## 🗂️ Tổng quan kiến trúc

Extension gồm **3 module runtime** + **1 lớp tooling** hoạt động phối hợp:

```
manifest.json    ──►  cấu hình & khai báo quyền
src/content/     ──►  chạy ngầm trên mọi trang Studocu (auto-inject)
src/popup/       ──►  giao diện popup khi nhấn icon extension
src/viewer/      ──►  inject vào trang khi cần xuất PDF

# Tooling (không vào ZIP release):
scripts/         ──►  validator local (manifest / i18n / docs)
eslint.config.mjs──►  flat config cho ESLint v9
.github/         ──►  CI (ci.yml) + Release (release.yml)
.clinerules/     ──►  hướng dẫn cho AI agent / Cline
docs/            ──►  troubleshooting, selectors-audit, release guide
```

---

## 1️⃣ `manifest.json` — Cấu hình Extension

| Trường | Ý nghĩa |
|---|---|
| `manifest_version: 3` | Dùng Manifest V3 (chuẩn mới nhất của Chrome) |
| `permissions: [cookies, scripting, activeTab]` | Đọc/xóa cookie, inject script/CSS, truy cập tab |
| `host_permissions` | Chỉ hoạt động trên `studocu.com` và `studocu.vn` |
| `content_scripts` | Tự inject `content.css` lúc `document_start` + `content.js` lúc `document_idle` |
| `web_accessible_resources` | Cho phép popup inject `viewer.css` và `viewer.js` vào trang |

---

## 2️⃣ `src/content/` — Tự động bypass khi tải trang

### `content.css` (inject ở `document_start` — chạy **trước** khi DOM render)

- **Ẩn ngay** tất cả overlay/paywall bằng `display:none !important` (CSS class, data-testid, ID)
- **Hiện** các element trang tài liệu (`.pf`, `.pc`, `[data-page-index]`, …) với `filter:none`, `opacity:1`
- **Xóa blur** trên mọi thẻ con trong `[class*="document"]`, `[class*="page"]` → chặn blur trước khi JS chạy

### `content.js` (inject ở `document_idle` — chạy **sau** khi DOM xây dựng xong)

Đây là file phức tạp nhất, gồm 6 hàm clean chạy tuần tự:

| Hàm | Nhiệm vụ |
|---|---|
| `removeOverlays()` | Xóa DOM node overlay/paywall theo CSS selector (có safety guard để không xóa nhầm content) |
| `unblurPages()` | Set `filter:none`, `opacity:1`, `visibility:visible` cho các trang tài liệu |
| `removeAllBlur()` | Duyệt **toàn bộ element** trên trang, lấy `computedStyle`, xóa bất kỳ `blur()` nào |
| `unblurImages()` | Thay URL `/pages/blurred/pageX.webp` → `/pages/pageX.webp` (ảnh gốc không blur) |
| `removePreviewBannerByText()` | Tìm div `position:fixed/absolute` chứa text paywall → xóa |
| `restoreBodyScroll()` | Khôi phục `overflow:auto`, gỡ lock scroll mà overlay đã áp |

### Cơ chế chống bypass ngược lại của Studocu (React re-render)

- **`MutationObserver` chính (debounce 150ms):** Theo dõi toàn bộ `document.body` — khi có node mới hay `style` thay đổi thì chạy lại `cleanPage()`.
- **`pageObserver` (không debounce):** Theo dõi riêng `.pf`, `.pc`, `[data-page-index]` — khi React tái inject `filter:blur` vào `style` attribute, lập tức override lại `filter:none` ngay lập tức.
- **`addObserver`:** Khi node mới được thêm vào DOM, tự attach `pageObserver` cho chúng và fix ngay URL ảnh blurred.

> **Vòng lặp vô hạn được chặn bởi:** flag `isCleanRunning` + `observer.disconnect()` trong lúc đang ghi style, sau đó `observeDOM()` lại khi xong.

---

## 3️⃣ `src/popup/` — Giao diện người dùng

### `index.html`

- Popup 360px, gồm: **Topbar** (logo + version), **Main** (2 nút hành động + language toggle + status bar), **Footer** (tác giả)
- Version được điền tự động từ `manifest.json` qua `chrome.runtime.getManifest()`

### `popup.css`

- Dark utility theme (`#101114`), system font stack, CSS variables gọn cho surface/text/accent/status
- Hiệu ứng hover: lift nhẹ (`translateY(-1px)`), border rõ hơn và icon điều hướng dịch nhẹ
- Status bar có 3 trạng thái:
  - `idle` / `done` → dot xanh (`--green`)
  - `processing` → dot vàng pulse (`--amber`)
  - `error` → dot đỏ (`--red`)

### `popup.js` + `modules/*.js`

Popup hiện được tách thành các module nhỏ trong `src/popup/modules/`:

| Module | Trách nhiệm |
|---|---|
| `i18n.js` | Dictionary `vi/en`, `t(key, values)`, `getLanguage`, `setLanguage`, `onLanguageChange`. Persist lựa chọn vào `localStorage`. |
| `status.js` | `createStatusController(rootEl, textEl)` → `set(message, state)`, `reset(message)` (state ∈ idle/processing/done/error). |
| `chrome-api.js` | Wrapper mỏng quanh `chrome.tabs`, `chrome.cookies`, `chrome.scripting`. Bao gồm `requireStudocuTab`, `clearStudocuCookies`, `clearStudocuStorageSafely`, `reloadTab`, `waitForTabLoaded`, `injectViewer`. |
| `actions.js` | `runBypass(ctx)` và `runPdf(ctx)` — high-level handler cho 2 nút trong popup. |

`popup.js` chỉ làm view layer: bind DOM ↔ module, render i18n theo `data-i18n`, đồng bộ ngôn ngữ
sang viewer thông qua `window.__SDC_LANGUAGE__`.

#### Nút "Bypass mờ & watermark" (`runBypass`)

```
Click
 │
 ├─ requireStudocuTab()   ─► throw nếu không phải studocu.com / studocu.vn
 │
 ├─ Promise.all([
 │     clearStudocuCookies(),         // chrome.cookies.getAll → filter studocu → remove
 │     clearStudocuStorageSafely(tab.id), // executeScript → wipe localStorage/sessionStorage
 │ ])
 │
 ├─ const loaded = waitForTabLoaded(tab.id)   // listener arm TRƯỚC reload (fix race)
 ├─ await reloadTab(tab.id)
 └─ await loaded                              // resolve khi tab status='complete' hoặc timeout 15s
        └─ Cập nhật status bar kết quả
```

#### Nút "Xuất file PDF"

```
Click
 │
 ├─ chrome.scripting.insertCSS  ← inject viewer.css (chỉ kích hoạt khi body có .sdc-viewer-active)
 ├─ chrome.scripting.executeScript ← set window.__SDC_LANGUAGE__
 └─ chrome.scripting.executeScript ← inject viewer.js (build container + print)
```

---

## 4️⃣ `src/viewer/` — Tạo PDF sạch

### `viewer.js` (chạy trong context của trang web)

#### Luồng hoạt động

```
1. Guard: nếu #clean-viewer-container đã tồn tại → return (tránh inject 2 lần)

2. Tìm tất cả div[data-page-index]
   └─ Nếu không có trang → showAlert() → return

3. showConfirm("Tìm thấy N trang") → người dùng bấm "Tạo PDF"

4. Khi user xác nhận, thêm `.sdc-viewer-active` vào body

5. Với mỗi trang:
   ├─ getPageDimensions() → lấy width/height từ .pc (fallback A4: 595×841)
   ├─ Tạo `.std-page` rộng 794px và `scaleWrap` để scale về A4 width
   ├─ buildImageLayer()  → clone img.bi làm nền
   └─ buildTextLayer()   → deepCloneWithStyles(.pc) làm lớp text
        └─ Xóa watermark selectors khỏi clone
        └─ Ẩn img trong text layer (đã có ở bg layer)

6. Append #clean-viewer-container vào document.body

7. waitForImagesToLoad(container, 1000) → đảm bảo <img> nền clone xong
8. window.print()
```

#### Hàm `waitForImagesToLoad(root, timeoutMs)`

Đợi tất cả `<img>` trong `root` resolve (load hoặc error) — fallback timeout `printDelay = 1000ms`
nếu CDN không trả lời. Resolve, không reject. Giải quyết bug PDF in ra trang trắng khi mạng chậm.

#### Hàm `deepCloneWithStyles(element)`

Clone đệ quy element kèm toàn bộ computed CSS — đảm bảo không mất style khi tách khỏi stylesheet gốc. Text giữ nguyên computed size, sau đó cả trang được scale bằng `scaleWrap` về A4 width:

| Điều kiện | Scale áp dụng |
|---|---|
| Element có class `.t` (text span) | Giữ `font-size`, `line-height`, `height` theo computed style |
| Element có class `._` (underscore span) | Giữ `width` theo computed style |
| Element `._` có class dạng `_123px` | Giữ margin theo computed style |
| Element `.pc` | Reset `transform: none`, xóa `max-width/height` |
| Mọi element | `filter:none`, `opacity:1`, `visibility:visible`, reset `letter-spacing` |

#### `viewer.css`

- `body.sdc-viewer-active > *:not(#clean-viewer-container):not(#sdc-overlay) { display:none }` — chỉ ẩn trang gốc sau khi user xác nhận tạo PDF
- `.std-page::before/after` — dải trắng cao 10px / 36px che watermark đầu/cuối mỗi trang
- `@media print`:
  - `@page { margin: 0; size: auto }`
  - `page-break-after: always` cho từng `.std-page` (trang in riêng biệt)
  - `.std-page:last-child` → `page-break-after: avoid`

---

## 🔄 Luồng tổng thể

```
Mở trang Studocu
      │
      ├─► content.css (document_start)
      │     └─ CSS ẩn overlay ngay lập tức (trước khi JS chạy)
      │
      └─► content.js  (document_idle)
            ├─ cleanPage() lần đầu
            ├─ observeDOM() → MutationObserver (debounce 150ms)
            └─ observePageElements() → pageObserver (immediate) + addObserver


Nhấn icon extension
      └─► popup.html + popup.js

            ├─► [Bypass mờ & watermark]
            │     ├─ Xóa cookie Studocu
            │     ├─ Xóa localStorage/sessionStorage
            │     └─ Reload tab → đợi load xong → cập nhật status

            └─► [Xuất file PDF]
                  ├─ Inject viewer.css  (ẩn trang gốc)
                  └─ Inject viewer.js
                        ├─ showConfirm modal
                        ├─ Clone từng trang (image layer + text layer)
                        ├─ Append #clean-viewer-container
                        └─ window.print() sau 1 giây
```

---

## 🔒 Quyền hạn & Bảo mật

| Quyền | Lý do sử dụng |
|---|---|
| `cookies` | `clearStudocuCookies()` trong `modules/chrome-api.js` |
| `scripting` | Inject `viewer.css`, `viewer.js`, và func `clearStudocuStorage` |
| `activeTab` | Lấy tabId của tab đang mở để thao tác |
| `tabs` | `chrome.tabs.onUpdated` listener đợi tab reload xong |

Extension **chỉ hoạt động** trên `studocu.com` và `studocu.vn`. Không gửi dữ liệu ra ngoài.

## 🧪 Tooling & CI

| Công cụ | Vai trò |
|---|---|
| ESLint v9 (flat config) | Lint `src/**/*.js`. Popup dùng `sourceType: 'module'`, content/viewer dùng `sourceType: 'script'` + chặn `import/export` qua `no-restricted-syntax`. |
| `scripts/validate-manifest.mjs` | jq-style check JSON, version semver, permissions whitelist, host_permissions thuộc Studocu, file referenced tồn tại. |
| `scripts/validate-i18n.mjs` | Bảo đảm `vi` ↔ `en` cùng tập key, cùng tập placeholder `{name}`, cho cả popup `i18n.js` và `viewer.js`. |
| `scripts/validate-docs.mjs` | Quét backtick code reference trong README/DESIGN, fail nếu chỉ tới file không tồn tại. |
| `web-ext lint` | Mozilla web-ext kiểm tra MV3 issues (manifest, permissions, deprecated API). |
| `.github/workflows/ci.yml` | Chạy 5 job trên mỗi PR + push `develop`/`main`: lint, validate-manifest, validate-i18n, validate-docs, web-ext-lint. |
| `.github/workflows/release.yml` | Trigger trên tag `v*` — verify version, merge develop→main, build ZIP, tạo GitHub Release. |

Trước khi commit, chạy:

```bash
npm run check          # lint + validate
npm run web-ext:lint   # MV3 sanity
```

---

## 📁 Cấu trúc file

```
StudocuCleaner/
├── manifest.json              # Cấu hình extension (Manifest v3)
├── DESIGN.md                  # Tài liệu thiết kế (file này)
├── README.md                  # Hướng dẫn cài đặt & sử dụng
├── package.json               # devDependencies (eslint, web-ext) — không bundle vào release
├── eslint.config.mjs          # Flat config ESLint v9
├── .gitignore
├── .clinerules/               # Hướng dẫn cho AI agent / Cline
│   ├── 00-project-context.md
│   ├── 10-bugfix-agent.md
│   ├── 20-docs-agent.md
│   ├── 30-review-checklist.md
│   ├── 40-workflow.md
│   └── README.md
├── .github/workflows/
│   ├── ci.yml                 # Lint + validate manifest/i18n/docs + web-ext lint
│   └── release.yml            # Build ZIP + GitHub Release khi push tag v*
├── docs/
│   ├── troubleshooting.md
│   ├── selectors-audit.md
│   └── release.md
├── scripts/
│   ├── validate-manifest.mjs
│   ├── validate-i18n.mjs
│   └── validate-docs.mjs
├── icons/                     # Icon extension (16/32/48/128px)
└── src/
    ├── content/
    │   ├── content.css        # CSS inject tại document_start — ẩn overlay sớm nhất
    │   └── content.js         # JS inject tại document_idle — clean + MutationObserver
    ├── popup/
    │   ├── index.html         # Giao diện popup
    │   ├── popup.css          # Dark theme, animation, status states
    │   ├── popup.js           # View layer — wire DOM ↔ modules
    │   └── modules/
    │       ├── i18n.js        # Dictionary vi/en, t(), getLanguage, setLanguage
    │       ├── status.js      # Status bar controller
    │       ├── chrome-api.js  # Wrapper chrome.tabs/cookies/scripting
    │       └── actions.js     # runBypass / runPdf
    └── viewer/
        ├── viewer.css         # Print styles — ẩn trang gốc, layout trang in
        └── viewer.js          # Build clean viewer container → waitForImagesToLoad → window.print()
```
