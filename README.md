# Studocu Tools

<p align="center">
  <img src="icons/icon128.png" width="80" alt="Studocu Tools logo">
</p>

<p align="center">
  Chrome extension giúp bypass watermark, xóa blur và xuất PDF từ tài liệu <a href="https://www.studocu.com">Studocu</a>.
</p>

<p align="center">
  <a href="https://github.com/trunghieupham59/StudocuCleaner/releases/latest">
    <img src="https://img.shields.io/github/v/release/trunghieupham59/StudocuCleaner?style=flat-square&color=f97316" alt="Latest Release">
  </a>
  <img src="https://img.shields.io/badge/Manifest-v3-blue?style=flat-square" alt="Manifest v3">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License">
</p>

---

## ✨ Tính năng

| Tính năng | Mô tả |
|---|---|
| 📄 **Xuất file PDF** | Inject script vào trang, hiện modal xác nhận → tự động mở hộp thoại in để lưu PDF không có watermark |
| 🧹 **Bypass mờ & watermark** | Xóa toàn bộ cookie Studocu và tải lại trang — hữu ích khi tài liệu bị làm mờ sau khi đọc quá giới hạn |

---

## 📦 Cài đặt

### Cách 1 — Tải bản Release (khuyên dùng)

1. Vào trang [**Releases**](https://github.com/trunghieupham59/StudocuCleaner/releases/latest)
2. Tải file **`studocu-cleaner-vX.X.zip`**
3. Giải nén ra một thư mục
4. Mở Chrome → vào `chrome://extensions/`
5. Bật **Developer mode** (góc trên phải)
6. Kéo thả thư mục vừa giải nén vào trang, hoặc bấm **Load unpacked** và chọn thư mục

### Cách 2 — Clone source

```bash
git clone https://github.com/trunghieupham59/StudocuCleaner.git
```

Sau đó load thư mục `StudocuCleaner` theo bước 4–6 ở trên.

---

## 🚀 Sử dụng

### Xuất file PDF

1. Mở tài liệu trên Studocu
2. **Cuộn xuống hết trang** để web tải đủ nội dung
3. Bấm icon extension → **Xuất file PDF**
4. Một modal xác nhận sẽ hiện ra trên trang — bấm **Tạo PDF**
5. Hộp thoại in mở tự động → chọn **Save as PDF** → Lưu

> Nếu hộp thoại in không tự mở, nhấn **Ctrl+P** (hoặc **⌘+P** trên macOS).

### Bypass mờ & watermark

1. Khi tài liệu bị blur hoặc yêu cầu đăng nhập / nâng cấp tài khoản
2. Bấm icon extension → **Bypass mờ & watermark**
3. Extension xóa toàn bộ cookie Studocu rồi tự động tải lại trang

---

## 📁 Cấu trúc

```
StudocuCleaner/
├── manifest.json            # Cấu hình extension (Manifest v3)
├── icons/                   # Icon extension các kích thước
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── popup/
    │   ├── index.html       # Giao diện popup
    │   ├── popup.css        # Style popup
    │   └── popup.js         # Logic popup (Chrome APIs)
    ├── viewer/
    │   ├── viewer.js        # Script inject vào trang để build & in PDF
    │   └── viewer.css       # CSS inject khi ở chế độ in PDF
    └── content/
        └── content.css      # Content script CSS (auto-inject khi mở trang)
```

---

## 🔒 Quyền hạn

Extension yêu cầu các quyền sau:

| Quyền | Lý do |
|---|---|
| `cookies` | Đọc và xóa cookie Studocu để bypass blur |
| `scripting` | Inject CSS (`viewer.css`) và JS (`viewer.js`) vào trang Studocu |
| `activeTab` | Truy cập tab đang mở |

Extension **chỉ hoạt động** trên `studocu.com` và `studocu.vn`. Không thu thập bất kỳ dữ liệu nào.

---

## 🛠️ Phát triển

```bash
# Clone repo
git clone https://github.com/trunghieupham59/StudocuCleaner.git
cd StudocuCleaner

# Load vào Chrome để test
# chrome://extensions/ → Load unpacked → chọn thư mục này
```

Sau khi sửa code, nhấn nút ↺ **Reload** trên trang `chrome://extensions/` để áp dụng thay đổi.

---

## 📝 Changelog

### v1.1
- Đổi tên extension thành **Studocu Tools**
- Tái cấu trúc toàn bộ dự án — chuyển source vào thư mục `src/` (popup, viewer, content)
- Popup mới: thiết kế lại giao diện, thêm status bar phản hồi trạng thái realtime
- Thay `alert/confirm` của browser bằng **custom modal** (animate, có backdrop blur)
- `viewer.js` inject trực tiếp vào trang qua `chrome.scripting`, tự động gọi `window.print()`
- `content.css` auto-inject ở `document_start` cho mọi trang Studocu

### v1.0
- Phát hành lần đầu

---

## 👤 Tác giả

**trunghieupham59** — [github.com/trunghieupham59](https://github.com/trunghieupham59)

---

## ⚠️ Disclaimer

Extension này được tạo cho mục đích học tập cá nhân. Vui lòng tôn trọng bản quyền tác giả của tài liệu.
