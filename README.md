# Studocu Tools

<p align="center">
  <img src="icons/icon128.png" width="80" alt="Studocu Tools logo">
</p>

<p align="center">
  A Chrome extension that bypasses watermarks, removes blur overlays, and exports clean PDFs from <a href="https://www.studocu.com">Studocu</a> documents.
</p>

<p align="center">
  <a href="https://github.com/trunghieupham59/StudocuCleaner/releases/latest">
    <img src="https://img.shields.io/github/v/release/trunghieupham59/StudocuCleaner?style=flat-square&color=f97316" alt="Latest Release">
  </a>
  <img src="https://img.shields.io/badge/Manifest-v3-blue?style=flat-square" alt="Manifest v3">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License">
</p>

---

## ✨ Features

| Feature | Description |
|---|---|
| 📄 **Export PDF** | Injects a viewer into the page that clones all document pages, auto-scales them to A4 size, and opens the browser print dialog to save a clean PDF |
| 🧹 **Bypass blur & watermark** | Deletes all Studocu cookies and reloads the page — resets the view limit that causes documents to blur after reading too many pages |
| 🛡️ **Auto content cleaning** | Content script runs on every Studocu page at load time: removes paywall overlays, strips blur filters, replaces blurred image URLs, and watches for React re-injection via MutationObserver |

---

## 📦 Installation

### Option 1 — Download the Release (recommended)

1. Go to [**Releases**](https://github.com/trunghieupham59/StudocuCleaner/releases/latest)
2. Download **`studocu-tools-vX.X.zip`**
3. Unzip to a folder
4. Open Chrome → navigate to `chrome://extensions/`
5. Enable **Developer mode** (top-right toggle)
6. Click **Load unpacked** and select the unzipped folder

### Option 2 — Clone the source

```bash
git clone https://github.com/trunghieupham59/StudocuCleaner.git
```

Then load the `StudocuCleaner` folder using steps 4–6 above.

---

## 🚀 Usage

### Export PDF

1. Open a document on Studocu
2. **Scroll to the bottom** so all pages are fully loaded
3. Click the extension icon → **Export PDF**
4. A confirmation dialog appears — click **OK**
5. The browser print dialog opens automatically → select **Save as PDF** → Save

> If the print dialog doesn't open automatically, press **Ctrl+P** (**⌘+P** on macOS).

### Bypass blur & watermark

1. When a document is blurred or prompts you to log in / upgrade
2. Click the extension icon → **Bypass blur & watermark**
3. The extension deletes all Studocu cookies and automatically reloads the page

---

## 📁 Project Structure

```
StudocuCleaner/
├── manifest.json              # Extension config (Manifest v3)
├── icons/                     # Extension icons (16, 32, 48, 128 px)
└── src/
    ├── popup/
    │   ├── index.html         # Popup UI
    │   ├── popup.css          # Popup styles (dark theme)
    │   └── popup.js           # Popup logic — cookie clearing, PDF viewer launch
    ├── viewer/
    │   ├── viewer.css         # CSS injected when entering PDF mode (hides page UI, A4 print rules)
    │   └── viewer.js          # (unused in current build — viewer logic lives in popup.js)
    └── content/
        ├── content.css        # Auto-injected at document_start — hides overlays, removes blur via CSS
        └── content.js         # Auto-injected at document_idle — removes overlays, unblurs images,
                               # replaces blurred image URLs, MutationObserver anti-re-blur
```

---

## 🔒 Permissions

| Permission | Reason |
|---|---|
| `cookies` | Read and delete Studocu cookies to reset the view counter |
| `scripting` | Inject `viewer.css` and the PDF viewer function into the active Studocu tab |
| `activeTab` | Access the currently open tab when the user clicks the extension |
| `tabs` | Listen for tab reload completion after cookie clearing |

The extension **only activates** on `studocu.com` and `studocu.vn`. No data is collected or transmitted.

---

## 🛠️ Development

```bash
# Clone the repo
git clone https://github.com/trunghieupham59/StudocuCleaner.git
cd StudocuCleaner

# Load into Chrome for testing
# chrome://extensions/ → Load unpacked → select this folder
```

After editing any file, click the **↺ Reload** button on `chrome://extensions/` to apply changes.

### Release workflow

Releases are automated via GitHub Actions (`.github/workflows/release.yml`):

```bash
# 1. Bump version in manifest.json (e.g. "1.5")
# 2. Commit and push to develop
git add manifest.json && git commit -m "chore: bump version to 1.5" && git push origin develop

# 3. Tag and push — this triggers the workflow
git tag v1.5 && git push origin v1.5
```

The workflow will:
- Verify that `manifest.json` version matches the tag
- Merge `develop` → `main`
- Build a ZIP containing `manifest.json`, `icons/`, and `src/`
- Create a GitHub Release with the ZIP attached

---

## 📝 Changelog

### v1.4
- Use `RELEASE_PAT` secret in release workflow to allow merging into protected `main` branch
- Auto-scale document pages to A4 width when building the PDF viewer (via CSS transform + `scaleWrap`)
- Print CSS updated to `@page { size: A4 portrait }` for consistent output
- Reset `letter-spacing` and `word-spacing` to `0` — Studocu's internal px values caused overflowing text
- Fix `viewer.css`: only reset `transform: none` on `.pc`, not on child subscript/superscript spans

### v1.3
- Fix PDF viewer rendering: `SCALE_FACTOR` changed from `4` to `1` — text sizes are now preserved at their computed display values instead of being divided by 4 before browser print scaling
- Add `transform` and `vertical-align` to copied CSS props for correct subscript/superscript positioning

### v1.2
- Add `"tabs"` permission to manifest — required for `chrome.tabs.onUpdated` listener
- Fix **Bypass** button: `clearStudocuStorage()` failure (on non-Studocu tabs) no longer blocks cookie clearing and page reload
- Port exact bypass logic from v1.0 sample: sequential cookie loop, `setTimeout(1000)` reload
- Port exact PDF viewer logic from v1.0 sample: `func: runCleanViewer` injection, `alert/confirm` dialogs

### v1.1
- Renamed extension to **Studocu Tools**
- Restructured project — source moved to `src/` (popup, viewer, content)
- New popup UI: redesigned with status bar and real-time feedback
- `viewer.js` injected directly into the page via `chrome.scripting`
- `content.css` auto-injected at `document_start` on all Studocu pages
- Added `content.js`: MutationObserver-based dynamic overlay removal, blurred image URL replacement, React re-injection defense

### v1.0
- Initial release

---

## 👤 Author

**trunghieupham59** — [github.com/trunghieupham59](https://github.com/trunghieupham59)

---

## ⚠️ Disclaimer

This extension is created for personal study purposes only. Please respect the copyright of document authors.
