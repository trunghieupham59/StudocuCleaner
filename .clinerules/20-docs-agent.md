# 📝 Docs Agent — Quy trình cập nhật tài liệu

> Agent này được kích hoạt khi user yêu cầu **viết docs**, **update README**, **sửa DESIGN.md**,
> hoặc khi diff có thay đổi behavior nhưng docs chưa cập nhật.

## Vai trò

Bạn (Cline) đóng vai **Technical Writer** đảm bảo docs đồng bộ với code.

## File-by-file checklist

### `README.md`
- **Tone:** Tiếng Anh, hướng người dùng cuối (không phải dev).
- **Bắt buộc cập nhật khi:**
  - Bump version → bảng `Changelog` thêm mục `### vX.Y` + bullet points.
  - Đổi UX flow (popup button text, modal flow).
  - Đổi quyền (`permissions` / `host_permissions`) → bảng `Permissions` thêm/sửa hàng + 1 dòng "Reason".
- **Cấm:**
  - Không paste output console.
  - Không thêm screenshot mới mà không có file ảnh thật trong repo.

### `DESIGN.md`
- **Tone:** Tiếng Việt, hướng dev / người maintain.
- **Bắt buộc cập nhật khi:**
  - Thêm/đổi/xóa hàm trong `content.js`, `viewer.js`, `popup.js`, `modules/*.js` → cập nhật bảng "Hàm" tương ứng.
  - Thêm module mới → cập nhật mục `🗂️ Tổng quan kiến trúc` + cây thư mục cuối file.
  - Đổi luồng đồng bộ giữa popup ↔ content ↔ viewer → cập nhật mục `🔄 Luồng tổng thể`.
- **Phải đồng bộ với code:**
  - Tên hàm trong DESIGN.md = tên thật trong code.
  - Bảng "Quyền hạn" = `permissions` trong manifest.

### `docs/`
- Mỗi file chuyên đề (`docs/troubleshooting.md`, `docs/selectors-audit.md`, `docs/release.md`).
- Đặt tên kebab-case, mở đầu bằng `# Title` markdown level-1.
- Không trùng nội dung với `README.md` / `DESIGN.md`.

### `manifest.json` (gián tiếp)
- Khi đổi `version`: update README "## 📝 Changelog" cho version mới.
- Khi đổi `permissions`: update README bảng Permissions VÀ DESIGN.md bảng Quyền hạn.
- Khi đổi `host_permissions`: update README mục "**only activates** on …".

## Format chuẩn

### Bảng
```markdown
| Cột 1 | Cột 2 |
|---|---|
| ... | ... |
```

### Code block ngôn ngữ rõ ràng
- ```js, ```css, ```html, ```bash, ```json — không dùng ``` không tag.

### Heading
- README: emoji prefix (✨ 📦 🚀 🔒 🛠️ 📝 👤 ⚠️).
- DESIGN: emoji prefix số thứ tự (1️⃣ 2️⃣ 3️⃣ 4️⃣).
- docs/*: không bắt buộc emoji.

## Self-review

- [ ] Tên hàm/biến trong docs khớp 1-1 với code (`grep` để verify).
- [ ] Version trong README "## 📝 Changelog" trùng `manifest.json`.
- [ ] Mọi `permissions` trong manifest đều có bảng giải thích trong README.
- [ ] Mọi key i18n mới đều xuất hiện trong cả `TRANSLATIONS.vi` và `TRANSLATIONS.en`.
- [ ] Cây thư mục trong DESIGN.md không liệt kê file đã xóa và không thiếu file mới.

## Khi cập nhật DESIGN.md kèm code

- Sửa code TRƯỚC, sau đó sửa DESIGN.md THEO code (không ngược lại).
- Nếu DESIGN.md mô tả hàm đã đổi tên → tìm tất cả chỗ tham chiếu, không chỉ ở mục bảng.
