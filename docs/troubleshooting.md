# Troubleshooting

> Các sự cố hay gặp khi dùng / phát triển Studocu Cleaner và cách xử lý nhanh.

## 1. Bypass blur không có hiệu lực sau khi nhấn nút

**Triệu chứng:** Status bar báo "Đã xoá X cookie" nhưng trang vẫn còn mờ.

**Nguyên nhân thường gặp:**

- Studocu đẩy paywall qua một class CSS mới chưa có trong `REMOVE_SELECTORS`.
- React đã re-render và áp `filter: blur()` ngược lại sau khi extension đã clean.

**Cách kiểm tra:**

1. Mở DevTools → Console, xem có log `[StudocuCleaner]` nào không.
2. Inspect node mờ → xem `style="filter: blur(...)` hay class wrapper.
3. So sánh class với `REMOVE_SELECTORS` / `UNBLUR_SELECTORS` trong `src/content/content.js`.

**Cách fix:**

- Nếu là class mới → thêm vào `REMOVE_SELECTORS` (dạng `[class*="..."]`) hoặc `UNBLUR_SELECTORS`.
- Cập nhật `docs/selectors-audit.md` với ngày phát hiện + URL ví dụ.

## 2. Xuất PDF ra trang trắng / mất nền ảnh

**Triệu chứng:** PDF có khung trang nhưng không có ảnh nền, chỉ có text.
Một biến thể khác là viewer tìm đúng N trang nhưng print preview sinh 2N trang.

**Nguyên nhân thường gặp:**

- Chưa cuộn xuống cuối tài liệu nên Studocu chưa lazy-load đủ ảnh trang.
- Refactor inject `viewer.css` trước khi `viewer.js` clone DOM. CSS viewer ẩn DOM gốc, làm
  `getComputedStyle()` của text layer sai và khiến chữ bị phóng/chồng.
- Chiều cao `.std-page` tính bằng px bị Chrome quy đổi hơi vượt quá A4, khiến mỗi trang tràn
  sang một trang in phụ.

**Cách fix:**

- Giữ exporter theo luồng develop: clone ảnh nền + text layer, scale bằng wrapper A4, rồi gọi
  `window.print()` sau 1 giây.
- Nếu tách viewer thành file riêng, chạy `viewer.js` trước để clone layout gốc, sau đó mới inject
  `viewer.css`.
- Trong `@media print`, ép `.std-page` về `210mm × 297mm` và đặt `break-inside: avoid-page`.

**Nếu vẫn lỗi:**

- Cuộn xuống cuối tài liệu trước khi nhấn Export PDF — Studocu lazy-load ảnh.
- Kiểm tra DevTools → Network: nếu thấy 403 trên `pages/page-X.webp` thì đó là vấn đề CDN, không
  liên quan extension.

## 3. Popup hiển thị "Hãy mở một trang Studocu rồi thử lại"

**Triệu chứng:** Đã ở studocu.com nhưng popup vẫn báo lỗi.

**Nguyên nhân:**

- `chrome.tabs.query({ active: true, currentWindow: true })` chỉ thấy tab thực sự đang focus.
- Subdomain lạ (e.g. `static.studocu.com`) có thể không được nhận diện.

**Cách kiểm tra:**

- Trong DevTools popup (right-click → Inspect popup), chạy:

  ```js
  chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => console.log(t.url))
  ```

- So sánh với regex `STUDOCU_HOST_RE = /(^|\.)studocu\.(com|vn)$/i` trong
  `src/popup/modules/chrome-api.js`.

## 4. Bypass "Đang tải lại tab..." treo > 15s

**Triệu chứng:** Status bar mãi ở trạng thái reloading, không bao giờ chuyển sang done.

**Nguyên nhân (đã fix):**

- v1.4.1: listener `chrome.tabs.onUpdated` được đăng ký SAU khi `chrome.tabs.reload` chạy →
  với cached page, `complete` event có thể đã bắn trước khi listener kịp gắn.

**Workaround (trên version cũ):**

- Đợi 15s — popup sẽ tự fall through và update status (timeout fallback luôn có).

## 5. Hộp thoại "Tìm thấy N trang" không hiện

**Nguyên nhân thường gặp:**

- `viewer.css` đã inject nhưng `viewer.js` không chạy được do lỗi JavaScript.
- Trang hiện tại không có `div[data-page-index]`, thường do chưa mở đúng trang tài liệu hoặc tài liệu chưa load.

**Cách kiểm tra:**

- Mở DevTools của tab Studocu và xem Console.
- Chạy `document.querySelectorAll('div[data-page-index]').length` để kiểm tra số trang đã render.

## 6. ESLint / web-ext lint fail trên CI mà local pass

**Nguyên nhân:**

- Bạn đang chạy Node < 18 → ESLint 9 yêu cầu Node ≥ 18.
- `package-lock.json` không được commit → `npm ci` skip, fallback `npm install` có thể cài
  version khác.

**Fix:**

```bash
node -v          # phải ≥ 18
rm -rf node_modules package-lock.json && npm install
npm run check
```
