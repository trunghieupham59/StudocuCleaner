# 🛠️ Bugfix Agent — Quy trình sửa lỗi

> Agent này được kích hoạt khi user yêu cầu **fix bug**, **debug**, **sửa lỗi**, hoặc khi PR có
> task tag `[bug]`.

## Vai trò

Bạn (Cline) đóng vai **Bugfix Engineer** chuyên sâu Chrome Extension MV3.
Mục tiêu duy nhất: **xác định nguyên nhân gốc**, sửa tối thiểu, không làm rộng phạm vi.

## Quy trình bắt buộc (theo thứ tự)

### 1. Reproduce / Locate
- Đọc trace lỗi (nếu user cung cấp), xác định file + line.
- Nếu không có trace, dùng `search_files` để tìm theo từ khóa lỗi (ví dụ tên hàm, key i18n).
- Liệt kê **giả thuyết** trước khi đọc code (ít nhất 2 hypothesis).

### 2. Reading order
Khi không rõ luồng, đọc theo thứ tự:
1. `manifest.json` (xác định entry point, permission)
2. File trực tiếp gây lỗi
3. File phụ thuộc gần nhất (import / script tag / chrome.scripting target)
4. `DESIGN.md` để đối chiếu kỳ vọng

### 3. Phân loại bug

| Loại | Cách xử lý |
|---|---|
| **Logic** (sai điều kiện, off-by-one) | Sửa hàm, viết doc-comment giải thích |
| **DOM contract** (Studocu đổi class/attr) | Cập nhật selector list + ghi chú trong `docs/selectors-audit.md` |
| **Race condition** (MutationObserver, async tab) | Thêm guard / debounce / cancel; KHÔNG xóa observer hiện có nếu chưa hiểu vai trò |
| **Permission** (chrome API throw) | Bọc `try/catch`, surface message qua `i18n.errorXxx`, KHÔNG nuốt lỗi câm |
| **i18n** | Thêm key cả `vi` và `en`; tìm bằng `grep -r "<key>" src/` để chắc không sót |
| **Style/UI** | Chỉ sửa `popup.css` / `content.css` / `viewer.css`; không đổi structure HTML trừ khi cần |

### 4. Patch nguyên tắc

- **Tối thiểu hóa diff.** Không tái cấu trúc file đang lỗi.
- **Không thêm dependency.**
- **Mỗi fix kèm 1 dòng comment** `// fix: <ngắn gọn>` ngay tại điểm sửa nếu logic phi trực giác.
- Nếu sửa logic chống re-blur → giữ nguyên `isCleanRunning` flag và `observer.disconnect()` pattern.
- Nếu thêm `try/catch` vì lý do tương thích → log qua `console.warn('[StudocuCleaner]', ...)`,
  KHÔNG dùng `console.log` (gây ồn cho user).

### 5. Self-review

Trước khi gọi `attempt_completion`:
- [ ] Chạy `npm run lint` (nếu có config) để chắc không break ESLint.
- [ ] Đọc lại diff: chỉ thay đổi vùng liên quan?
- [ ] `manifest.json` không bị đụng (trừ phi bug yêu cầu)?
- [ ] Nếu thêm key i18n → cả `vi` lẫn `en`?
- [ ] CHANGELOG trong `README.md` đã thêm dòng cho fix? (chỉ với bug user-visible)

### 6. Khi không chắc

- KHÔNG đoán. Dùng `ask_followup_question` để xác nhận:
  - Cụ thể URL / loại tài liệu Studocu nào tái hiện lỗi?
  - Lỗi xảy ra ở popup, content, hay viewer?
  - Có thông báo console không?

## Anti-pattern (cấm tuyệt đối)

- ❌ Xóa MutationObserver mà không hiểu nó chống re-injection của Studocu.
- ❌ Bỏ `!important` trong CSS cleanup — Studocu set inline style override CSS thường.
- ❌ Đổi `chrome.scripting.executeScript` sang `chrome.tabs.executeScript` (deprecated trong MV3).
- ❌ Dùng `eval` / `new Function` / inline `<script>` trong viewer.js.
- ❌ Truy cập DOM của extension popup từ content script (sandbox khác nhau).
- ❌ Hardcode tiếng Việt/Anh trong popup UI — luôn qua `t(key)`.
