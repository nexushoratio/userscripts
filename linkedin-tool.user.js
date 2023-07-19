// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @version     0.03
// @author      Mike Castle
// @description Add some stuff to LinkedIn.  So far, just keystrokes.
// @grant       GM_addStyle
// @downloadURL https://github.com/nexushoratio/userscripts/raw/main/linkedin-tool.user.js
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// ==/UserScript==

(function () {
  'use strict';

  const kbService = new VM.shortcut.KeyboardService();
  const navOption = {condition: '!inputFocus'};
  kbService.enable();

  let current = -1;

  kbService.register('j', () => {
    scrollBy(1);
  }, navOption);
  kbService.register('k', () => {
    scrollBy(-1);
  }, navOption);
  kbService.register('x', () => {
    togglePost();
  }, navOption);
  kbService.register('g n', () => {alert('Pressed <g><n>.  Someday it might do something.');}, navOption);

  function isInput(element) {
    return (element.isContentEditable || element.tagName === 'INPUT');
  }

  function getRelatives() {
    return document.querySelectorAll('#voyager-feed div[data-id]');
  }

  function scrollBy(index, recursed = false) {
    console.debug('scrolling by %d', index);
    const relatives = getRelatives();
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

  function togglePost() {
    const post = getRelatives()[current];
    if (post) {
      const dismiss = post.querySelector('button[aria-label^="Dismiss post"]');
      if (dismiss) {
	dismiss.click();
      } else {
	const undo = post.querySelector('button[aria-label^="Undo and show"]');
	if (undo) {
	  undo.click();
	}
      }
    }
  }

  VM.observe(document.body, () => {
    const navbar = document.querySelector('#global-nav');

    if (navbar) {
      // TODO(https://github.com/nexushoratio/userscripts/issues/4)
      GM_addStyle(`div { scroll-margin-top: ${navbar.clientHeight + 4}px }`);

      return true;
    }
  });
  document.addEventListener('focus', (e) => {
    if (isInput(e.target)) {
      console.debug(VM);
      kbService.setContext('inputFocus', true);
    }
  }, true);
  document.addEventListener('blur', (e) => {
    if (isInput(e.target)) {
      kbService.setContext('inputFocus', false);
    }
  }, true);
})();
