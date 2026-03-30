# Studocu Cleaner

<p align="center">
  <img src="icons/icon128.png" width="80" alt="Studocu Cleaner logo">
</p>

<p align="center">
  Chrome extension giúp bypass watermark, xóa blur và tạo PDF từ tài liệu <a href="https://www.studocu.com">Studocu</a>.
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
| 📄 **Tạo file PDF** | Clone toàn bộ nội dung tài liệu, loại bỏ watermark rồi mở hộp thoại in để lưu PDF |
| 🧹 **Bypass blur & watermark** | Xóa cookie Studocu và tải lại trang — hữu ích khi tài liệu bị làm mờ sau khi đọc quá giới hạn |

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

### Tạo file PDF

1. Mở tài liệu trên Studocu
2. **Cuộn xuống hết trang** để web tải đủ nội dung
3. Bấm icon extension → **Tạo file PDF**
4. Xác nhận trong hộp thoại → trình duyệt sẽ mở hộp thoại in
5. Chọn **Save as PDF** (hoặc máy in) → Lưu

### Bypass blur & watermark

1. Khi tài liệu bị blur hoặc yêu cầu đăng nhập/nâng cấp
2. Bấm icon extension → **Bypass mờ & watermark**
3. Trang tự động tải lại, cookie đã được xóa

---

## 📁 Cấu trúc

```
StudocuCleaner/
├── manifest.json        # Cấu hình extension (Manifest v3)
├── popup.html           # Giao diện popup
├── popup.css            # Style popup
├── popup.js             # Logic popup (Chrome APIs)
├── viewer.js            # Script inject vào trang để build PDF
├── viewer_styles.css    # CSS inject khi tạo PDF
├── custom_style.css     # Content script CSS (auto-inject)
└── icons/               # Icon extension các kích thước
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 🔒 Quyền hạn

Extension yêu cầu các quyền sau:

| Quyền | Lý do |
|---|---|
| `cookies` | Đọc và xóa cookie Studocu để bypass blur |
| `scripting` | Inject CSS và JS vào trang Studocu |
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
- Refactor toàn bộ codebase — tách `viewer.js` riêng biệt
- Thay `alert/confirm` của browser bằng custom modal đẹp
- Thêm icon chính thức logo Studocu
- Cải thiện `custom_style.css` với nhiều selectors hơn
- Sửa lỗi modal bị ẩn bởi `viewer_styles.css`

### v1.0
- Phát hành lần đầu

---

## 👤 Tác giả

**lelotus** — [github.com/lelotus](https://github.com/lelotus)

---

## ⚠️ Disclaimer

Extension này được tạo cho mục đích học tập cá nhân. Vui lòng tôn trọng bản quyền tác giả của tài liệu.
