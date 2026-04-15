/**
 * popup.js — Extension popup entry point.
 * Runs in the extension popup context (MV3).
 */

'use strict';

// ─── Selectors ────────────────────────────────────────────────────────────────

const statusBar     = document.getElementById('status');
const statusText    = document.getElementById('status-text');
const btnPdf        = document.getElementById('btn-pdf');
const btnBypass     = document.getElementById('btn-bypass');
const versionBadge  = document.getElementById('version-badge');

// ─── Auto-fill version from manifest ─────────────────────────────────────────

if (versionBadge) {
  const { version } = chrome.runtime.getManifest();
  versionBadge.textContent = `v${version}`;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

/**
 * Update the status bar message and visual state.
 * @param {string} msg
 * @param {'idle'|'processing'|'done'|'error'} [state='idle']
 */
function setStatus(msg, state = 'idle') {
  if (!statusText || !statusBar) return;
  statusText.textContent = msg;
  statusBar.classList.toggle('is-processing', state === 'processing');
  statusBar.classList.toggle('is-error',      state === 'error');
}

/** Enable or disable all action buttons. */
function setButtonsDisabled(disabled) {
  document.querySelectorAll('.action-item').forEach(btn => {
    btn.disabled = disabled;
  });
}

// ─── Cookie cleaner ───────────────────────────────────────────────────────────

/**
 * Remove all cookies belonging to Studocu domains.
 * Returns the number of cookies successfully removed.
 */
async function clearStudocuCookies() {
  const all     = await chrome.cookies.getAll({});
  const targets = all.filter(c => c.domain.includes('studocu'));

  let removed = 0;

  await Promise.all(targets.map(async cookie => {
    const domain   = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
    const protocol = cookie.secure ? 'https' : 'http';
    const url      = `${protocol}://${domain}${cookie.path}`;

    // Build removal details — omit storeId if undefined to avoid silent failure
    const details = { url, name: cookie.name };
    if (cookie.storeId != null) details.storeId = cookie.storeId;

    const result = await chrome.cookies.remove(details);
    if (result !== null) removed++;
  }));

  return removed;
}

/**
 * Inject a script into the active tab that clears Studocu-related
 * localStorage and sessionStorage keys (view counters, paywall flags, etc.)
 * @param {number} tabId
 * @returns {Promise<number>} number of storage keys cleared
 */
async function clearStudocuStorage(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const STUDOCU_KEYS = [
        // Common view-limit / paywall keys used by Studocu
        'documentsViewed', 'documentViewCount', 'viewCount',
        'freeViewsUsed', 'freeViews', 'pageViewCount',
        'previewCount', 'previewsUsed', 'trialViews',
        'sdcViewCount', 'sdc_view_count',
        'userDocumentViewCount', 'guestViewCount',
        'limit', 'viewLimit', 'docLimit',
      ];

      let cleared = 0;

      // Remove exact key matches and any key that contains 'studocu', 'view', 'paywall', 'preview', 'limit'
      const checkKey = k =>
        STUDOCU_KEYS.includes(k) ||
        /studocu|viewcount|paywall|preview|guestview|doclimit|freelimit/i.test(k);

      for (const storage of [localStorage, sessionStorage]) {
        const toDelete = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && checkKey(key)) toDelete.push(key);
        }
        for (const key of toDelete) {
          storage.removeItem(key);
          cleared++;
        }
      }

      return cleared;
    },
  });
  return result ?? 0;
}

/**
 * Reload the active tab and return its tabId.
 * @returns {Promise<number|null>}
 */
async function reloadActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return null;
  chrome.tabs.reload(tab.id);
  return tab.id;
}

/**
 * Wait for a tab to finish loading, then run a callback.
 * Auto-cleans up the listener after first completion or timeout.
 * @param {number} tabId
 * @param {() => void} onComplete
 */
function onTabLoaded(tabId, onComplete) {
  const TIMEOUT_MS = 15_000;

  let timer = null;

  function cleanup() {
    clearTimeout(timer);
    chrome.tabs.onUpdated.removeListener(listener);
  }

  function listener(id, info) {
    if (id !== tabId || info.status !== 'complete') return;
    cleanup();
    onComplete();
  }

  chrome.tabs.onUpdated.addListener(listener);

  // Safety timeout — if tab never fires 'complete', reset UI anyway
  timer = setTimeout(() => {
    cleanup();
    onComplete();
  }, TIMEOUT_MS);
}

// ─── Bypass button ────────────────────────────────────────────────────────────

btnBypass?.addEventListener('click', async () => {
  setStatus('Đang quét và xóa cookie…', 'processing');

  try {
    const allCookies = await chrome.cookies.getAll({});
    let count = 0;

    for (const cookie of allCookies) {
      if (cookie.domain.includes('studocu')) {
        const cleanDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
        const protocol = cookie.secure ? 'https:' : 'http:';
        const url = `${protocol}//${cleanDomain}${cookie.path}`;
        await chrome.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId });
        count++;
      }
    }

    setStatus(`Đã xóa ${count} cookies! Đang tải lại…`);

    setTimeout(() => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]) chrome.tabs.reload(tabs[0].id);
      });
    }, 1000);

  } catch (err) {
    setStatus(`Lỗi: ${err.message}`, 'error');
  }
});

// ─── PDF viewer ───────────────────────────────────────────────────────────────

btnPdf?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Inject viewer styles
  chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ['src/viewer/viewer.css']
  });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: runCleanViewer
  });
});

function runCleanViewer() {
  const pages = document.querySelectorAll('div[data-page-index]');
  if (pages.length === 0) {
    alert('⚠️ Không tìm thấy trang nào.\n(Hãy cuộn chuột xuống cuối tài liệu để web tải hết nội dung trước!)');
    return;
  }

  if (!confirm(`Tìm thấy ${pages.length} trang.\nBấm OK để xử lý và tạo PDF...`)) return;

  // Studocu renders .pc at its CSS layout size; CSS transform (if any) is removed below.
  // Setting SCALE_FACTOR=1 preserves all computed values as-is — the browser's
  // print scaling proportionally shrinks everything to fit the paper size.
  const SCALE_FACTOR = 1;
  const HEIGHT_SCALE_DIVISOR = 1;

  function copyComputedStyle(source, target, scaleFactor, shouldScaleHeight = false, shouldScaleWidth = false, heightScaleDivisor = 4, widthScaleDivisor = 4, shouldScaleMargin = false, marginScaleDivisor = 4) {
    const computedStyle = window.getComputedStyle(source);

    const normalProps = [
      'position', 'left', 'top', 'bottom', 'right',
      'font-family', 'font-weight', 'font-style',
      'color', 'background-color',
      'text-align', 'white-space',
      'display', 'visibility', 'opacity', 'z-index',
      'text-shadow', 'unicode-bidi', 'font-feature-settings', 'padding',
      // Preserve transforms on subscript/superscript spans (v1, v3, v4… classes)
      // .pc elements override this with 'none' right after copyComputedStyle
      'transform', 'vertical-align'
    ];

    // font-size / line-height are already at the correct display value → no scaling needed
    const scaleProps = ['font-size', 'line-height'];
    let styleString = '';

    normalProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'auto' && value !== 'normal') {
        styleString += `${prop}: ${value} !important; `;
      }
    });

    const widthValue = computedStyle.getPropertyValue('width');
    if (widthValue && widthValue !== 'none' && widthValue !== 'auto') {
      if (shouldScaleWidth) {
        const numValue = parseFloat(widthValue);
        if (!isNaN(numValue) && numValue > 0) {
          const unit = widthValue.replace(numValue.toString(), '');
          styleString += `width: ${numValue / widthScaleDivisor}${unit} !important; `;
        } else {
          styleString += `width: ${widthValue} !important; `;
        }
      } else {
        styleString += `width: ${widthValue} !important; `;
      }
    }

    const heightValue = computedStyle.getPropertyValue('height');
    if (heightValue && heightValue !== 'none' && heightValue !== 'auto') {
      if (shouldScaleHeight) {
        const numValue = parseFloat(heightValue);
        if (!isNaN(numValue) && numValue > 0) {
          const unit = heightValue.replace(numValue.toString(), '');
          styleString += `height: ${numValue / heightScaleDivisor}${unit} !important; `;
        } else {
          styleString += `height: ${heightValue} !important; `;
        }
      } else {
        styleString += `height: ${heightValue} !important; `;
      }
    }

    ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'].forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'auto') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          if (shouldScaleMargin && numValue !== 0) {
            const unit = value.replace(numValue.toString(), '');
            styleString += `${prop}: ${numValue / marginScaleDivisor}${unit} !important; `;
          } else {
            styleString += `${prop}: ${value} !important; `;
          }
        }
      }
    });

    scaleProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'auto' && value !== 'normal') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue !== 0) {
          const unit = value.replace(numValue.toString(), '');
          styleString += `${prop}: ${numValue / scaleFactor}${unit} !important; `;
        } else {
          styleString += `${prop}: ${value} !important; `;
        }
      }
    });

    // Studocu's letter-spacing / word-spacing use internal px values that don't
    // translate outside their renderer — reset to 0 so text fits its bounding box.
    styleString += 'letter-spacing: 0px !important; word-spacing: normal !important; ';

    let transformOrigin = computedStyle.getPropertyValue('transform-origin');
    if (transformOrigin) {
      styleString += `transform-origin: ${transformOrigin} !important; -webkit-transform-origin: ${transformOrigin} !important; `;
    }

    styleString += 'overflow: visible !important; max-width: none !important; max-height: none !important; clip: auto !important; clip-path: none !important; ';
    target.style.cssText += styleString;
  }

  function deepCloneWithStyles(element, scaleFactor, heightScaleDivisor, depth = 0) {
    const clone = element.cloneNode(false);
    const hasTextClass = element.classList && element.classList.contains('t');
    const hasUnderscoreClass = element.classList && element.classList.contains('_');

    const shouldScaleMargin = element.tagName === 'SPAN' &&
      element.classList &&
      element.classList.contains('_') &&
      Array.from(element.classList).some(cls => /^_(?:\d+[a-z]*|[a-z]+\d*)$/i.test(cls));

    copyComputedStyle(element, clone, scaleFactor, hasTextClass, hasUnderscoreClass, heightScaleDivisor, scaleFactor, shouldScaleMargin, scaleFactor);

    if (element.classList && element.classList.contains('pc')) {
      clone.style.setProperty('transform', 'none', 'important');
      clone.style.setProperty('-webkit-transform', 'none', 'important');
      clone.style.setProperty('overflow', 'visible', 'important');
      clone.style.setProperty('max-width', 'none', 'important');
      clone.style.setProperty('max-height', 'none', 'important');
    }

    if (element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
      clone.textContent = element.textContent;
    } else {
      element.childNodes.forEach(child => {
        if (child.nodeType === 1) {
          clone.appendChild(deepCloneWithStyles(child, scaleFactor, heightScaleDivisor, depth + 1));
        } else if (child.nodeType === 3) {
          clone.appendChild(child.cloneNode(true));
        }
      });
    }
    return clone;
  }

  // Build
  const viewerContainer = document.createElement('div');
  viewerContainer.id = 'clean-viewer-container';

  let successCount = 0;

  pages.forEach((page, index) => {
    const pc = page.querySelector('.pc');
    let width = 595.3; // Fallback A4
    let height = 841.9;

    if (pc) {
      const pcStyle = window.getComputedStyle(pc);
      const pcWidth = parseFloat(pcStyle.width);
      const pcHeight = parseFloat(pcStyle.height);

      if (!isNaN(pcWidth) && pcWidth > 0 && !isNaN(pcHeight) && pcHeight > 0) {
        width = pcWidth;
        height = pcHeight;
      } else {
        const rect = pc.getBoundingClientRect();
        if (rect.width > 10 && rect.height > 10) {
          width = rect.width;
          height = rect.height;
        }
      }
    }

    // Auto-scale to A4 width (210 mm @ 96 dpi ≈ 794 px)
    const A4_W = 794;
    const printScale = A4_W / width;
    const printHeight = Math.round(height * printScale);

    const newPage = document.createElement('div');
    newPage.className = 'std-page';
    newPage.id = `page-${index + 1}`;
    newPage.setAttribute('data-page-number', index + 1);

    // Outer container is A4-sized; overflow hidden so nothing bleeds out
    newPage.style.width = A4_W + 'px';
    newPage.style.height = printHeight + 'px';
    newPage.style.overflow = 'hidden';

    // Inner wrapper holds the content at its native resolution and applies
    // a CSS scale transform to bring it down to A4 width
    const scaleWrap = document.createElement('div');
    scaleWrap.style.cssText =
      'position:absolute;top:0;left:0;' +
      'width:' + width + 'px;height:' + height + 'px;' +
      'transform:scale(' + printScale + ');transform-origin:top left;';

    // Layer ảnh
    const originalImg = page.querySelector('img.bi') || page.querySelector('img');
    if (originalImg) {
      const bgLayer = document.createElement('div');
      bgLayer.className = 'layer-bg';
      const imgClone = originalImg.cloneNode(true);
      imgClone.style.cssText = 'width: 100%; height: 100%; object-fit: cover; object-position: top center';
      bgLayer.appendChild(imgClone);
      scaleWrap.appendChild(bgLayer);
    }

    // Layer Text
    const originalPc = page.querySelector('.pc');
    if (originalPc) {
      const textLayer = document.createElement('div');
      textLayer.className = 'layer-text';
      const pcClone = deepCloneWithStyles(originalPc, SCALE_FACTOR, HEIGHT_SCALE_DIVISOR);

      pcClone.querySelectorAll('img').forEach(img => { img.style.display = 'none'; });
      textLayer.appendChild(pcClone);
      scaleWrap.appendChild(textLayer);
    }

    newPage.appendChild(scaleWrap);

    viewerContainer.appendChild(newPage);
    successCount++;
  });

  document.body.appendChild(viewerContainer);

  setTimeout(() => {
    window.print();
  }, 1000);
}
