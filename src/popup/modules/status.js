/**
 * status.js — Status bar controller.
 */

'use strict';

const STATES = ['idle', 'processing', 'done', 'error'];

export function createStatusController(rootEl, textEl) {
  function set(message, state = 'idle') {
    if (!rootEl || !textEl) return;
    textEl.textContent = message;
    STATES.forEach(name => {
      rootEl.classList.toggle(`is-${name}`, name === state);
    });
  }

  function reset(message) {
    set(message, 'idle');
  }

  return { set, reset };
}
