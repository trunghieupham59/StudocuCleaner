# 📂 .clinerules — Hướng dẫn cho Cline / AI agent

Mỗi file là 1 rule chuyên trách. Cline đọc tất cả file trong thư mục này theo thứ tự alphabet.

| File | Mục đích |
|---|---|
| `00-project-context.md` | Context tổng — phải đọc đầu tiên |
| `10-bugfix-agent.md` | Quy trình khi user yêu cầu fix bug |
| `20-docs-agent.md` | Quy trình khi user yêu cầu cập nhật docs |
| `30-review-checklist.md` | Checklist bắt buộc trước khi `attempt_completion` |
| `40-workflow.md` | Định tuyến request → agent + pipeline release |

## Cập nhật rules

- Khi thêm rule mới: đặt tên `NN-<role>.md` với prefix số 2 chữ số để giữ thứ tự.
- Khi sửa rule cũ: ghi chú trong commit message lý do thay đổi.
- KHÔNG xóa rule cũ mà không có thảo luận với maintainer.
