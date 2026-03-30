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
    // Class-based overlays (substring match)
    '[class*="PreviewOverlay"]',
    '[class*="preview-overlay"]',
    '[class*="PaywallOverlay"]',
    '[class*="paywall-overlay"]',
    '[class*="BlurOverlay"]',
    '[class*="blur-overlay"]',
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
  ];

  // ─── Paywall text keywords ────────────────────────────────────────────────

  const PAYWALL_KEYWORDS = [
    'This is a preview',
    'Go Premium',
    'unlock all',
    'Free Trial',
    'Upload to unlock',
    'Share your documents',
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
    observer.disconnect();
    try {
      removeOverlays();
      unblurPages();
      removePreviewBannerByText();
      restoreBodyScroll();
    } finally {
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

  const observer = new MutationObserver(mutations => {
    // Only react to newly added nodes (not attribute changes we wrote ourselves)
    const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasNewNodes) scheduledClean();
  });

  function observeDOM() {
    if (!document.body) return;
    observer.observe(document.body, {
      childList: true,
      subtree:   true,
      // Intentionally NOT observing attributes to avoid self-triggering loops
    });
  }

  // ─── Initialise ──────────────────────────────────────────────────────────

  cleanPage();
  observeDOM();

}());
