/**
 * content.js — Injected into every Studocu page at document_idle.
 * Removes dynamically-rendered overlays, paywalls, and blur effects.
 */
(function () {
  'use strict';

  // ─── Selectors for elements to remove ────────────────────────────────────

  const REMOVE_SELECTORS = [
    // data-testid overlays
    '[data-testid="document-preview-overlay"]',
    '[data-testid="paywall"]',
    '[data-testid="preview-overlay"]',
    '[data-testid="blur-overlay"]',
    '[data-testid="upgrade-banner"]',
    '[data-testid="out-of-focus-overlay"]',
    // Class-based overlays (substring match)
    '[class*="PreviewOverlay"]',
    '[class*="preview-overlay"]',
    '[class*="PaywallOverlay"]',
    '[class*="paywall-overlay"]',
    '[class*="BlurOverlay"]',
    '[class*="blur-overlay"]',
    '[class*="OutOfFocus"]',
    '[class*="out-of-focus"]',
    '[class*="FocusOverlay"]',
    '[class*="focus-overlay"]',
    '[class*="DocumentPaywall"]',
    '[class*="document-paywall"]',
    '[class*="UpgradeModal"]',
    '[class*="upgrade-modal"]',
    '[class*="PremiumOverlay"]',
    '[class*="premium-overlay"]',
    '[class*="LimitOverlay"]',
    '[class*="limit-overlay"]',
    '[class*="DocumentPreviewBanner"]',
    '[class*="document-preview-banner"]',
    '[class*="Overlay_overlay"]',
    '[class*="overlay_overlay"]',
    // ID-based
    '#upgrade-overlay',
    '#paywall-overlay',
    '#preview-overlay',
  ];

  // ─── Selectors for elements to un-blur ───────────────────────────────────

  const UNBLUR_SELECTORS = [
    '.pf',
    '.pc',
    '[data-page-index]',
    '[class*="document-page"]',
    '#document-wrapper',
    '[class*="DocumentPage"]',
    '[class*="Page_page"]',
    '[class*="document-content"]',
    '[class*="DocumentContent"]',
  ];

  // ─── Paywall text keywords ────────────────────────────────────────────────

  const PAYWALL_KEYWORDS = [
    'This is a preview',
    'Go Premium',
    'unlock all',
    'Free Trial',
    'Upload to unlock',
    'Share your documents',
    'Why is this page out of focus',
    'out of focus',
    'Become Premium',
    'Unlock this document',
    'Read without Ads',
    'Get Unlimited Downloads',
  ];

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Remove overlay/paywall elements.
   * Skips any element that contains real document content as a safety guard.
   */
  function removeOverlays() {
    for (const sel of REMOVE_SELECTORS) {
      document.querySelectorAll(sel).forEach(el => {
        if (el.querySelector('.pf, .pc, [data-page-index]')) return;
        el.remove();
      });
    }
  }

  /**
   * Strip blur / hidden styles from document page elements.
   * Uses inline !important to override injected inline styles.
   */
  function unblurPages() {
    for (const sel of UNBLUR_SELECTORS) {
      document.querySelectorAll(sel).forEach(el => {
        el.style.setProperty('filter',         'none',    'important');
        el.style.setProperty('opacity',        '1',       'important');
        el.style.setProperty('visibility',     'visible', 'important');
        el.style.setProperty('display',        'block',   'important');
        el.style.setProperty('overflow',       'visible', 'important');
        el.style.setProperty('max-height',     'none',    'important');
        el.style.setProperty('pointer-events', 'auto',    'important');
      });
    }
  }

  /**
   * Aggressively scan ALL elements with a computed or inline blur filter and remove it.
   * Studocu sometimes applies blur to arbitrary wrapper divs that don't have
   * a distinctive class name.
   */
  function removeAllBlur() {
    const all = document.querySelectorAll('*');
    for (const el of all) {
      // Skip our own viewer container
      if (el.id === 'clean-viewer-container') continue;
      if (el.closest('#clean-viewer-container')) continue;

      // Check inline style first (fast path)
      const inlineFilter = el.style.filter;
      if (inlineFilter && inlineFilter.includes('blur')) {
        el.style.setProperty('filter', 'none', 'important');
      }

      // Also check computed style (catches CSS-class-based blur)
      const cs = window.getComputedStyle(el);
      const computedFilter = cs.getPropertyValue('filter');
      if (computedFilter && computedFilter.includes('blur')) {
        el.style.setProperty('filter', 'none', 'important');
      }

      // Remove pointer-events blocking and opacity dimming
      const computedOpacity = cs.getPropertyValue('opacity');
      if (computedOpacity && parseFloat(computedOpacity) < 0.9) {
        // Only reset opacity if the element looks like a content block (has children)
        if (el.children.length > 0 && !el.classList.toString().match(/btn|button|icon|nav|header|footer/i)) {
          el.style.setProperty('opacity', '1', 'important');
        }
      }
    }
  }

  /**
   * Remove generic fixed/absolute divs that contain paywall text.
   * Uses getComputedStyle so it catches both inline and CSS-class-based positioning.
   * Studocu sometimes uses elements with no distinctive class or data attribute.
   */
  function removePreviewBannerByText() {
    // Check both inline-style and computed-style positioned elements
    const candidates = document.querySelectorAll('div, section, aside');
    for (const el of candidates) {
      // Skip real document containers
      if (el.querySelector('.pf, .pc, [data-page-index]')) continue;
      if (el.id === 'clean-viewer-container') continue;

      const cs = window.getComputedStyle(el);
      const pos = cs.getPropertyValue('position');
      if (pos !== 'fixed' && pos !== 'absolute') continue;

      // Skip very small elements (not a full overlay)
      const rect = el.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 50) continue;

      const text = el.innerText || '';
      const isPaywall = PAYWALL_KEYWORDS.some(kw => text.includes(kw));
      if (isPaywall) el.remove();
    }
  }

  /** Restore body scroll that may have been locked by an overlay. */
  function restoreBodyScroll() {
    document.documentElement.style.setProperty('overflow', 'auto', 'important');
    document.body.style.setProperty('overflow', 'auto',   'important');
    document.body.style.setProperty('height',   'auto',   'important');
    document.body.style.removeProperty('pointer-events');
  }

  // ─── Main clean routine ───────────────────────────────────────────────────

  /**
   * Run all cleaning steps.
   * The observer is temporarily disconnected to prevent an infinite loop
   * caused by our own style mutations re-triggering the callback.
   */
  function cleanPage() {
    isCleanRunning = true;
    observer.disconnect();
    try {
      removeOverlays();
      unblurPages();
      removeAllBlur();
      removePreviewBannerByText();
      restoreBodyScroll();
    } finally {
      isCleanRunning = false;
      observeDOM();
    }
  }

  // ─── Debounce helper ─────────────────────────────────────────────────────

  let debounceTimer = null;

  function scheduledClean() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(cleanPage, 150);
  }

  // ─── MutationObserver ────────────────────────────────────────────────────

  // Track whether we are currently writing styles to avoid self-triggering
  let isCleanRunning = false;

  const observer = new MutationObserver(mutations => {
    if (isCleanRunning) return;

    const shouldClean = mutations.some(m => {
      // New nodes added (overlay injected)
      if (m.addedNodes.length > 0) return true;
      // Attribute change on style (blur set via JS after render)
      if (m.type === 'attributes' && m.attributeName === 'style') return true;
      return false;
    });

    if (shouldClean) scheduledClean();
  });

  function observeDOM() {
    if (!document.body) return;
    observer.observe(document.body, {
      childList:      true,
      subtree:        true,
      attributes:     true,
      attributeFilter: ['style', 'class'],
    });
  }

  // ─── Initialise ──────────────────────────────────────────────────────────

  cleanPage();
  observeDOM();

}());
