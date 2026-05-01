# Release Process

> Hướng dẫn chi tiết quy trình phát hành. Tóm tắt nhanh xem `.clinerules/40-workflow.md`.

## 1. Tiêu chí ready-to-release

- [ ] Tất cả CI job trên branch `develop` đều xanh (`lint`, `validate-manifest`,
      `validate-i18n`, `validate-docs`, `web-ext-lint`).
- [ ] `README.md` có mục Changelog cho version sắp release.
- [ ] `DESIGN.md` đã được update nếu có hàm/module thay đổi.
- [ ] `manifest.json#version` khớp với version sắp tag.
- [ ] Đã test load unpacked thực tế trên Chrome ổn định mới nhất.

## 2. Bước thực hiện

```bash
# 1. Trên branch develop, đảm bảo working tree sạch
git checkout develop
git pull

# 2. Bump version
#    PATCH (1.4 → 1.4.1) cho bug fix
#    MINOR (1.4 → 1.5)   cho feature mới
#    MAJOR (1.x → 2.0)   khi breaking change
$EDITOR manifest.json
$EDITOR README.md       # thêm "### vX.Y(.Z)" trong Changelog

# 3. Verify trước khi commit
npm run check
npm run web-ext:lint

# 4. Commit & push
git add manifest.json README.md
git commit -m "chore: bump version to X.Y(.Z)"
git push origin develop

# 5. Tag và push tag
git tag vX.Y(.Z)
git push origin vX.Y(.Z)
```

## 3. Sau khi push tag

GitHub Actions (`.github/workflows/release.yml`) sẽ tự động:

1. **Verify tag = manifest version** — nếu lệch sẽ fail và không build.
2. **Merge `develop` → `main`** — dùng `RELEASE_PAT` để bypass branch protection trên `main`.
3. **Build ZIP** — gồm `manifest.json`, `icons/`, `src/` (loại trừ `.DS_Store`).
4. **Tạo GitHub Release** — đính kèm ZIP file.

Theo dõi run tại tab **Actions** trên GitHub.

## 4. Smoke-test sau release

1. Tải ZIP từ Release.
2. Extract → `chrome://extensions/` → bật Developer mode → Load unpacked.
3. Mở `https://www.studocu.com/...` document.
4. Test 2 nút trong popup:
   - **Bypass blur & watermark** → trang reload, blur biến mất.
   - **Export PDF** → modal hiện "Found X pages" → Create PDF → print dialog mở.

## 5. Khi cần rollback

```bash
# Xóa tag local + remote
git tag -d vX.Y
git push origin :refs/tags/vX.Y

# Xóa Release trên GitHub UI
# main vẫn giữ commit merge — nếu cần revert, dùng `git revert -m 1 <merge-sha>`
```
