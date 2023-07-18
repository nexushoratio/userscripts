// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @version     0.02.1
// @author      Mike Castle
// @description Add some stuff to LinkedIn.  So far, just keystrokes.
// @grant       GM_addStyle
// @downloadURL https://github.com/nexushoratio/userscripts/raw/main/linkedin-tool.user.js
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// ==/UserScript==

(function () {
  'use strict';

  const navbar = document.querySelector('#global-nav');
  // TODO(https://github.com/nexushoratio/userscripts/issues/4)
  GM_addStyle(`div { scroll-margin-top: 56px }`);

  let current = -1;

  function scrollBy(index, recursed = false) {
    console.debug('scrolling by %d', index);
    const relatives = document.querySelectorAll('#voyager-feed div[data-id]');
    current = Math.max(Math.min(current + index, relatives.length), 0);
    console.debug('current: %d of %d', current, relatives.length);
    const el = relatives[current];
    console.debug(el);
    console.debug(el.clientHeight);
    // Some posts are hidden.  So far, seems like just ads.
    if (el.clientHeight === 0 && !recursed) {
      console.debug('Skipping...');
      scrollBy(index, true);
    } else {
      el.scrollIntoView();
      // TODO(https://github.com/nexushoratio/userscripts/issues/9)
      el.setAttribute('tabindex', 0);
      el.focus();
    }
  }

  VM.shortcut.register('j', () => {
    scrollBy(1);
  });
  VM.shortcut.register('k', () => {
    scrollBy(-1);
  });
  VM.shortcut.register('g n', () => {alert('Pressed <g><n>.  Someday it might do something.');});
})();
