# 📐 DESIGN.md — Studocu Tools (Chrome Extension MV3)

> Tài liệu này mô tả kiến trúc, luồng hoạt động và logic chi tiết của toàn bộ codebase.

---

## 🗂️ Tổng quan kiến trúc

Extension gồm **3 module chính** hoạt động phối hợp:

```
manifest.json  ──►  cấu hình & khai báo quyền
src/content/   ──►  chạy ngầm trên mọi trang Studocu (auto-inject)
src/popup/     ──►  giao diện popup khi nhấn icon extension
src/viewer/    ──►  inject vào trang khi cần xuất PDF
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

- Popup 340px, gồm: **Header** (logo + version), **Main** (2 nút hành động + status bar), **Footer** (tác giả)
- Version được điền tự động từ `manifest.json` qua `chrome.runtime.getManifest()`

### `popup.css`

- Dark theme (`#0f0f13`), font Inter, CSS variables đầy đủ (màu, border-radius, shadow, animation)
- Hiệu ứng hover: card lift (`translateY(-1px)`) + icon rotate + shimmer line
- Status bar có 3 trạng thái:
  - `idle` → dot xanh (`--accent-emerald`)
  - `processing` → dot vàng pulse (`--accent-amber`)
  - `error` → dot đỏ (`--accent-rose`)

### `popup.js`

#### Nút "Bypass mờ & watermark"

```
Click
 │
 ├─ clearStudocuCookies()
 │    └─ chrome.cookies.getAll({})
 │    └─ filter domain includes 'studocu'
 │    └─ chrome.cookies.remove() từng cái
 │
 ├─ clearStudocuStorage(tabId)  [chạy song song với trên]
 │    └─ chrome.scripting.executeScript → inject func vào trang
 │    └─ Xóa localStorage + sessionStorage key (view-limit, paywall, preview, …)
 │
 ├─ chrome.tabs.reload(tab.id)
 │
 └─ onTabLoaded(tabId, callback)
      └─ Lắng nghe tabs.onUpdated status='complete'
      └─ Timeout 15s nếu tab không bao giờ complete
      └─ Cập nhật status bar kết quả
```

#### Nút "Xuất file PDF"

```
Click
 │
 ├─ chrome.scripting.insertCSS  ← inject viewer.css (ẩn mọi thứ ngoài viewer)
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

4. Với mỗi trang:
   ├─ getPageDimensions() → lấy width/height từ .pc (fallback A4: 595×841)
   ├─ buildImageLayer()  → clone img.bi làm nền
   └─ buildTextLayer()   → deepCloneWithStyles(.pc) làm lớp text
        └─ Xóa watermark selectors khỏi clone
        └─ Ẩn img trong text layer (đã có ở bg layer)

5. Append #clean-viewer-container vào document.body

6. setTimeout(window.print, 1000)
```

#### Hàm `deepCloneWithStyles(element)`

Clone đệ quy element kèm toàn bộ computed CSS — đảm bảo không mất style khi tách khỏi stylesheet gốc. Logic scale:

| Điều kiện | Scale áp dụng |
|---|---|
| Element có class `.t` (text span) | Scale `font-size`, `line-height`, `height` ÷ 4 |
| Element có class `._` (underscore span) | Scale `width` ÷ 4 |
| Element `._` có class dạng `_123px` | Scale cả `margin` ÷ 4 |
| Element `.pc` | Reset `transform: none`, xóa `max-width/height` |
| Mọi element | `filter:none`, `opacity:1`, `visibility:visible` |

#### `viewer.css`

- `body > *:not(#clean-viewer-container):not(#sdc-overlay) { display:none }` — ẩn toàn bộ trang gốc
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
| `cookies` | `clearStudocuCookies()` trong popup.js |
| `scripting` | Inject `viewer.css`, `viewer.js`, và `clearStudocuStorage` func |
| `activeTab` | Lấy tabId của tab đang mở để thao tác |

Extension **chỉ hoạt động** trên `studocu.com` và `studocu.vn`. Không gửi dữ liệu ra ngoài.

---

## 📁 Cấu trúc file

```
StudocuTool/
├── manifest.json            # Cấu hình extension (Manifest v3)
├── DESIGN.md                # Tài liệu thiết kế (file này)
├── README.md                # Hướng dẫn cài đặt & sử dụng
├── icons/                   # Icon extension (16/32/48/128px)
└── src/
    ├── content/
    │   ├── content.css      # CSS inject tại document_start — ẩn overlay sớm nhất
    │   └── content.js       # JS inject tại document_idle — clean + MutationObserver
    ├── popup/
    │   ├── index.html       # Giao diện popup
    │   ├── popup.css        # Dark theme, animation, status states
    │   └── popup.js         # Logic: bypass cookie/storage & trigger PDF
    └── viewer/
        ├── viewer.css       # Print styles — ẩn trang gốc, layout trang in
        └── viewer.js        # Build clean viewer container → window.print()
```
