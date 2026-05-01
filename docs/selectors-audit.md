# Selectors Audit — Studocu DOM contract

> Mỗi khi Studocu update front-end (đổi class name, đổi paywall flow, v.v.), ghi nhận vào file
> này. Mục tiêu: track lịch sử để khi rollback / debug có manh mối.

## 📋 Danh sách selector hiện tại

### Trong `src/content/content.js`

| Hằng số | Vai trò | Số lượng |
| --- | --- | --- |
| `REMOVE_SELECTORS` | Overlay/paywall cần xóa khỏi DOM | ~30 |
| `UNBLUR_SELECTORS` | Element cần force `filter:none, opacity:1` | ~12 |
| `PAYWALL_KEYWORDS` | Substring nhận diện banner paywall theo text | ~12 |

### Trong `src/viewer/viewer.js`

| Hằng số | Vai trò |
| --- | --- |
| `WATERMARK_SELECTORS` | Selector watermark/overlay cần xóa khỏi clone trước khi in |

### Trong `src/content/content.css`

CSS rule áp `display:none !important` cho overlay sớm nhất (chạy trước JS).

## 🕐 Lịch sử cập nhật

### 2025-05 — Khởi đầu audit

- Selector và keyword được trích xuất từ codebase v1.4.
- Chưa có thay đổi DOM nào được ghi nhận.

## 🧪 Cách test selector mới

1. Mở trang Studocu thật trên Chrome incognito (không có cookie cũ).
2. Inspect overlay/paywall → copy selector duy nhất.
3. Thử `document.querySelectorAll('SELECTOR_MOI').length` trong Console.
4. Nếu match đúng node muốn xóa và KHÔNG match `.pf, .pc, [data-page-index]` → an toàn.
5. Add vào hằng số tương ứng trong `content.js` HOẶC `viewer.js`.
6. Cập nhật cột "Số lượng" và thêm dòng vào "Lịch sử cập nhật" với ngày + URL test.

## ⚠️ Anti-pattern khi viết selector

- ❌ `[class*="overlay"]` quá broad mà không có safety guard `.querySelector('.pf, .pc, ...')`.
- ❌ Selector match trúng `.pc` hoặc child của `.pc` — sẽ xóa nhầm content thật.
- ❌ Dựa vào style inline (`[style*="blur"]`) thay vì class — Studocu đổi style runtime liên tục.
