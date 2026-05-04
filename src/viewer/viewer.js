/**
 * viewer.js — PDF viewer injected into the Studocu page.
 * Runs in the web page context (not the extension context).
 */
(() => {
  const TRANSLATIONS = {
    vi: {
      noPages: '⚠️ Không tìm thấy trang nào.\n(Hãy cuộn chuột xuống cuối tài liệu để web tải hết nội dung trước!)',
      confirmPages: 'Tìm thấy {count} trang.\nBấm OK để xử lý và tạo PDF...',
    },
    en: {
      noPages: '⚠️ No pages found.\n(Scroll to the bottom of the document first so the page can load all content.)',
      confirmPages: 'Found {count} pages.\nClick OK to process and create a PDF...',
    },
  };

  const viewerLanguage = normalizeLanguage(
    window.__SDC_LANGUAGE__ || document.documentElement.getAttribute('data-sdc-language')
  );

  function normalizeLanguage(language) {
    return language === 'en' || language === 'vi' ? language : 'vi';
  }

  function t(key, values = {}) {
    const dict = TRANSLATIONS[viewerLanguage] || TRANSLATIONS.vi;
    const template = dict[key] || TRANSLATIONS.vi[key] || key;

    return template.replace(/\{(\w+)\}/g, (_, name) => {
      return values[name] == null ? '' : String(values[name]);
    });
  }

  const pages = document.querySelectorAll('div[data-page-index]');
  if (pages.length === 0) {
    alert(t('noPages'));
    return;
  }

  if (!confirm(t('confirmPages', { count: pages.length }))) return;

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
      // Preserve transforms on subscript/superscript spans (v1, v3, v4... classes)
      // .pc elements override this with 'none' right after copyComputedStyle
      'transform', 'vertical-align'
    ];

    // font-size / line-height are already at the correct display value -> no scaling needed
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
        if (!Number.isNaN(numValue) && numValue > 0) {
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
        if (!Number.isNaN(numValue) && numValue > 0) {
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
        if (!Number.isNaN(numValue)) {
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
        if (!Number.isNaN(numValue) && numValue !== 0) {
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

    const transformOrigin = computedStyle.getPropertyValue('transform-origin');
    if (transformOrigin) {
      styleString += `transform-origin: ${transformOrigin} !important; -webkit-transform-origin: ${transformOrigin} !important; `;
    }

    styleString += 'overflow: visible !important; max-width: none !important; max-height: none !important; clip: auto !important; clip-path: none !important; ';
    target.style.cssText += styleString;
  }

  function deepCloneWithStyles(element, scaleFactor, heightScaleDivisor) {
    const clone = element.cloneNode(false);
    const hasTextClass = element.classList?.contains('t');
    const hasUnderscoreClass = element.classList?.contains('_');

    const shouldScaleMargin = element.tagName === 'SPAN' &&
      element.classList?.contains('_') &&
      Array.from(element.classList).some(cls => /^_(?:\d+[a-z]*|[a-z]+\d*)$/i.test(cls));

    copyComputedStyle(element, clone, scaleFactor, hasTextClass, hasUnderscoreClass, heightScaleDivisor, scaleFactor, shouldScaleMargin, scaleFactor);

    if (element.classList?.contains('pc')) {
      clone.style.setProperty('transform', 'none', 'important');
      clone.style.setProperty('-webkit-transform', 'none', 'important');
      clone.style.setProperty('overflow', 'visible', 'important');
      clone.style.setProperty('max-width', 'none', 'important');
      clone.style.setProperty('max-height', 'none', 'important');
    }

    if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
      clone.textContent = element.textContent;
    } else {
      element.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          clone.appendChild(deepCloneWithStyles(child, scaleFactor, heightScaleDivisor));
        } else if (child.nodeType === Node.TEXT_NODE) {
          clone.appendChild(child.cloneNode(true));
        }
      });
    }
    return clone;
  }

  // Build
  const viewerContainer = document.createElement('div');
  viewerContainer.id = 'clean-viewer-container';

  pages.forEach((page, index) => {
    const pc = page.querySelector('.pc');
    let width = 595.3; // Fallback A4
    let height = 841.9;

    if (pc) {
      const pcStyle = window.getComputedStyle(pc);
      const pcWidth = parseFloat(pcStyle.width);
      const pcHeight = parseFloat(pcStyle.height);

      if (!Number.isNaN(pcWidth) && pcWidth > 0 && !Number.isNaN(pcHeight) && pcHeight > 0) {
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

    // Auto-scale to A4 width (210 mm @ 96 dpi ~= 794 px)
    const A4_W = 794;
    const printScale = A4_W / width;
    const printHeight = Math.round(height * printScale);

    const newPage = document.createElement('div');
    newPage.className = 'std-page';
    newPage.id = `page-${index + 1}`;
    newPage.setAttribute('data-page-number', index + 1);

    // Outer container is A4-sized; overflow hidden so nothing bleeds out
    newPage.style.width = `${A4_W}px`;
    newPage.style.height = `${printHeight}px`;
    newPage.style.overflow = 'hidden';

    // Inner wrapper holds the content at its native resolution and applies
    // a CSS scale transform to bring it down to A4 width
    const scaleWrap = document.createElement('div');
    scaleWrap.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      `width:${width}px`,
      `height:${height}px`,
      `transform:scale(${printScale})`,
      'transform-origin:top left',
    ].join(';');

    // Layer image
    const originalImg = page.querySelector('img.bi') || page.querySelector('img');
    if (originalImg) {
      const bgLayer = document.createElement('div');
      bgLayer.className = 'layer-bg';
      const imgClone = originalImg.cloneNode(true);
      imgClone.style.cssText = 'width: 100%; height: 100%; object-fit: cover; object-position: top center';
      bgLayer.appendChild(imgClone);
      scaleWrap.appendChild(bgLayer);
    }

    // Layer text
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
  });

  document.body.appendChild(viewerContainer);

  setTimeout(() => {
    window.print();
  }, 1000);
})();
