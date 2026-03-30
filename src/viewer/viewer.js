/**
 * viewer.js — PDF viewer injected into the Studocu page.
 * Runs in the web page context (not the extension context).
 */
(function () {
  'use strict';

  // Guard: prevent re-running if already injected
  if (document.getElementById('clean-viewer-container')) return;

  // ─── Config ─────────────────────────────────────────────────────────────────

  const CONFIG = {
    scaleFactor:        4,
    heightScaleDivisor: 4,
    widthScaleDivisor:  4,
    marginDivisor:      4,
    a4:                 { width: 595.3, height: 841.9 },
    printDelay:         1000,
  };

  const SKIP_VALUES = new Set(['none', 'auto', 'normal']);

  const NORMAL_PROPS = [
    'position', 'left', 'top', 'bottom', 'right',
    'font-family', 'font-weight', 'font-style',
    'color', 'background-color',
    'text-align', 'white-space',
    'display', 'visibility', 'opacity', 'z-index',
    'text-shadow', 'unicode-bidi', 'font-feature-settings', 'padding',
  ];

  const SCALE_PROPS  = ['font-size', 'line-height'];
  const MARGIN_PROPS = ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'];

  // ─── Modal styles ────────────────────────────────────────────────────────────

  const MODAL_CSS = `
    #sdc-overlay {
      position: fixed;
      inset: 0;
      background: rgb(0 0 0 / 45%);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: sdcFadeIn 0.15s ease;
    }
    @keyframes sdcFadeIn { from { opacity: 0 } to { opacity: 1 } }

    #sdc-modal {
      background: #fff;
      border-radius: 16px;
      padding: 28px 28px 22px;
      max-width: 380px;
      width: calc(100% - 48px);
      box-shadow: 0 20px 60px rgb(0 0 0 / 25%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: sdcSlideUp 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes sdcSlideUp {
      from { transform: translateY(12px); opacity: 0 }
      to   { transform: translateY(0);    opacity: 1 }
    }

    #sdc-modal .sdc-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f97316, #e8380d);
      margin-bottom: 16px;
      color: #fff;
    }
    #sdc-modal h3 {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
    }
    #sdc-modal p {
      margin: 0 0 22px;
      font-size: 13px;
      color: #64748b;
      line-height: 1.6;
    }
    #sdc-modal .sdc-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    #sdc-modal button {
      padding: 9px 20px;
      border-radius: 8px;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    #sdc-modal .sdc-btn-cancel {
      background: #f1f5f9;
      color: #475569;
    }
    #sdc-modal .sdc-btn-cancel:hover { background: #e2e8f0; }
    #sdc-modal .sdc-btn-ok {
      background: linear-gradient(135deg, #f97316, #e8380d);
      color: #fff;
      box-shadow: 0 4px 12px rgb(232 56 13 / 30%);
    }
    #sdc-modal .sdc-btn-ok:hover { filter: brightness(1.08); }
  `;

  function injectModalStyles() {
    if (document.getElementById('sdc-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'sdc-modal-styles';
    style.textContent = MODAL_CSS;
    document.head.appendChild(style);
  }

  // ─── Modal helpers ───────────────────────────────────────────────────────────

  /** Show a simple alert modal. @returns {Promise<void>} */
  function showAlert(title, message) {
    injectModalStyles();
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.id = 'sdc-overlay';
      overlay.innerHTML = `
        <div id="sdc-modal">
          <div class="sdc-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="sdc-actions">
            <button class="sdc-btn-ok">OK</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('.sdc-btn-ok').addEventListener('click', () => {
        overlay.remove();
        resolve();
      });
    });
  }

  /** Show a confirm modal. @returns {Promise<boolean>} */
  function showConfirm(title, message) {
    injectModalStyles();
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.id = 'sdc-overlay';
      overlay.innerHTML = `
        <div id="sdc-modal">
          <div class="sdc-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="sdc-actions">
            <button class="sdc-btn-cancel">Huỷ</button>
            <button class="sdc-btn-ok">Tạo PDF</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('.sdc-btn-cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });
      overlay.querySelector('.sdc-btn-ok').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });
    });
  }

  // ─── Style helpers ───────────────────────────────────────────────────────────

  /** Divide a CSS value (with unit) by a divisor. */
  function scaleValue(value, divisor) {
    const num = parseFloat(value);
    if (Number.isNaN(num) || num === 0) return value;
    const unit = value.slice(num.toString().length);
    return `${num / divisor}${unit}`;
  }

  /**
   * Build an inline style string from the computed style of a source element.
   * @param {Element} source
   * @param {{ scaleFont?: boolean, scaleHeight?: boolean, scaleWidth?: boolean, scaleMargin?: boolean }} opts
   */
  function buildStyleString(source, opts = {}) {
    const cs = window.getComputedStyle(source);
    const {
      scaleFont   = false,
      scaleHeight = false,
      scaleWidth  = false,
      scaleMargin = false,
    } = opts;

    let style = '';

    for (const prop of NORMAL_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (val && !SKIP_VALUES.has(val)) style += `${prop}:${val}!important;`;
    }

    // Width
    const wVal = cs.getPropertyValue('width');
    if (wVal && !SKIP_VALUES.has(wVal)) {
      style += `width:${scaleWidth ? scaleValue(wVal, CONFIG.widthScaleDivisor) : wVal}!important;`;
    }

    // Height
    const hVal = cs.getPropertyValue('height');
    if (hVal && !SKIP_VALUES.has(hVal)) {
      style += `height:${scaleHeight ? scaleValue(hVal, CONFIG.heightScaleDivisor) : hVal}!important;`;
    }

    // Margins
    for (const prop of MARGIN_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (val && val !== 'auto') {
        style += `${prop}:${scaleMargin ? scaleValue(val, CONFIG.marginDivisor) : val}!important;`;
      }
    }

    // Font-size & line-height
    for (const prop of SCALE_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (val && !SKIP_VALUES.has(val)) {
        style += `${prop}:${scaleFont ? scaleValue(val, CONFIG.scaleFactor) : val}!important;`;
      }
    }

    // Transform-origin
    const origin = cs.getPropertyValue('transform-origin');
    if (origin) {
      style += `transform-origin:${origin}!important;-webkit-transform-origin:${origin}!important;`;
    }

    // Always reset overflow / clip
    style += 'overflow:visible!important;max-width:none!important;max-height:none!important;clip:auto!important;clip-path:none!important;';

    return style;
  }

  // ─── Deep clone with computed styles ─────────────────────────────────────────

  function deepCloneWithStyles(element) {
    const clone     = element.cloneNode(false);
    const classList = element.classList;

    const isTextSpan           = classList?.contains('t');
    const isUnderscoreSpan     = classList?.contains('_');
    const isScalableUnderscore = isUnderscoreSpan &&
      Array.from(classList).some(c => /^_(?:\d+[a-z]*|[a-z]+\d*)$/i.test(c));

    clone.style.cssText += buildStyleString(element, {
      scaleFont:   true,
      scaleHeight: isTextSpan,
      scaleWidth:  isUnderscoreSpan,
      scaleMargin: isScalableUnderscore,
    });

    if (classList?.contains('pc')) {
      clone.style.setProperty('transform',         'none',    'important');
      clone.style.setProperty('-webkit-transform', 'none',    'important');
      clone.style.setProperty('overflow',          'visible', 'important');
      clone.style.setProperty('max-width',         'none',    'important');
      clone.style.setProperty('max-height',        'none',    'important');
    }

    const children = element.childNodes;
    if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
      clone.textContent = element.textContent;
    } else {
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          clone.appendChild(deepCloneWithStyles(child));
        } else if (child.nodeType === Node.TEXT_NODE) {
          clone.appendChild(child.cloneNode(true));
        }
      }
    }

    return clone;
  }

  // ─── Page dimension helper ───────────────────────────────────────────────────

  function getPageDimensions(page) {
    const pc = page.querySelector('.pc');
    if (!pc) return CONFIG.a4;

    const cs = window.getComputedStyle(pc);
    const w  = parseFloat(cs.width);
    const h  = parseFloat(cs.height);
    if (!Number.isNaN(w) && w > 0 && !Number.isNaN(h) && h > 0) return { width: w, height: h };

    const rect = pc.getBoundingClientRect();
    if (rect.width > 10 && rect.height > 10) return { width: rect.width, height: rect.height };

    return CONFIG.a4;
  }

  // ─── Layer builders ──────────────────────────────────────────────────────────

  function buildImageLayer(page) {
    const img = page.querySelector('img.bi') ?? page.querySelector('img');
    if (!img) return null;

    const layer     = document.createElement('div');
    layer.className = 'layer-bg';

    const imgClone = img.cloneNode(true);
    imgClone.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:top center;';
    layer.appendChild(imgClone);
    return layer;
  }

  function buildTextLayer(page) {
    const pc = page.querySelector('.pc');
    if (!pc) return null;

    const layer     = document.createElement('div');
    layer.className = 'layer-text';

    const pcClone = deepCloneWithStyles(pc);
    pcClone.querySelectorAll('img').forEach(img => { img.style.display = 'none'; });
    layer.appendChild(pcClone);
    return layer;
  }

  // ─── Main ────────────────────────────────────────────────────────────────────

  (async () => {
    const pages = document.querySelectorAll('div[data-page-index]');

    if (pages.length === 0) {
      await showAlert(
        'Không tìm thấy trang nào',
        'Hãy cuộn xuống cuối tài liệu để tải hết nội dung, sau đó thử lại.'
      );
      return;
    }

    const confirmed = await showConfirm(
      `Tìm thấy ${pages.length} trang`,
      `Nhấn <strong>Tạo PDF</strong> để xử lý và mở hộp thoại in.`
    );
    if (!confirmed) return;

    const container = document.createElement('div');
    container.id = 'clean-viewer-container';

    pages.forEach((page, index) => {
      const { width, height } = getPageDimensions(page);

      const pageEl              = document.createElement('div');
      pageEl.className          = 'std-page';
      pageEl.id                 = `page-${index + 1}`;
      pageEl.dataset.pageNumber = String(index + 1);
      pageEl.style.width        = `${width}px`;
      pageEl.style.height       = `${height}px`;

      const imgLayer = buildImageLayer(page);
      if (imgLayer) pageEl.appendChild(imgLayer);

      const textLayer = buildTextLayer(page);
      if (textLayer) pageEl.appendChild(textLayer);

      container.appendChild(pageEl);
    });

    document.body.appendChild(container);
    setTimeout(() => window.print(), CONFIG.printDelay);
  })();
}());
