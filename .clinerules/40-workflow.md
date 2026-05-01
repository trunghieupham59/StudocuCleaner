# 🔄 Workflow tổng — chọn agent và pipeline

> File này định tuyến request của user vào đúng agent.

## Quyết định nhanh

```
User request
    │
    ├─ "fix bug" / "lỗi" / "không hoạt động"          ──► .clinerules/10-bugfix-agent.md
    │
    ├─ "viết docs" / "update README" / "cập nhật DESIGN" ──► .clinerules/20-docs-agent.md
    │
    ├─ "thêm tính năng" / "feat:" / "feature"          ──► quy trình feature (dưới)
    │
    └─ "release" / "bump version"                       ──► quy trình release (dưới)
```

## Quy trình feature

1. Đọc `00-project-context.md` + `DESIGN.md` để hiểu kiến trúc.
2. Hỏi user (qua `ask_followup_question`) nếu yêu cầu mơ hồ về scope.
3. Implement với constraint:
   - Không thêm runtime dependency.
   - Không thêm permission mới trừ khi feature bắt buộc.
   - i18n đầy đủ vi/en.
4. Update DESIGN.md cùng PR.
5. Update README "## 🚀 Usage" nếu feature có UI.
6. Bump version trong `manifest.json` + thêm Changelog.

## Quy trình release

1. Đảm bảo branch `develop` đã có hết commit cần release.
2. Bump `manifest.json#version` (PATCH cho fix, MINOR cho feat, MAJOR cho breaking).
3. Update `README.md` Changelog mới.
4. Commit: `chore: bump version to X.Y`.
5. Push `develop`, sau đó:
   ```bash
   git tag vX.Y && git push origin vX.Y
   ```
6. GitHub Actions (`.github/workflows/release.yml`) sẽ:
   - Verify tag = manifest version.
   - Merge `develop` → `main`.
   - Build ZIP và tạo Release.
7. Sau release, kiểm tra Actions log + tải ZIP về test load unpacked thực tế.

## Pipeline kiểm tra cục bộ

Trước khi push:

```bash
npm install              # cài devDependencies (eslint, web-ext)
npm run lint             # ESLint cho src/
npm run validate         # validate manifest.json + i18n parity
npm run web-ext:lint     # web-ext lint (Mozilla web-ext, kiểm tra MV3 issues)
```

Nếu bất kỳ bước nào fail → fix trước khi commit.

## Pipeline CI (chạy tự động)

`.github/workflows/ci.yml` chạy trên mỗi PR và push `develop`/`main`:

| Job | Nội dung |
|---|---|
| `lint` | ESLint cho toàn bộ `src/` |
| `validate-manifest` | jq check JSON + version semver + permissions whitelist |
| `validate-i18n` | Đảm bảo `vi` và `en` có cùng tập key (popup + viewer) |
| `validate-docs` | Đảm bảo DESIGN.md / README.md không tham chiếu file đã xóa |
| `web-ext-lint` | `web-ext lint` để bắt MV3 issue |

CI fail → block merge.
