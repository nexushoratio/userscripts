// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @version     0.10
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

  kbService.register('/', () => {
    gotoSearch();
  }, navOption);
  kbService.register('g h', () => {
    gotoNavLink('feed');
  }, navOption);
  kbService.register('g m', () => {
    gotoNavLink('mynetwork');
  }, navOption);
  kbService.register('g j', () => {
    gotoNavLink('jobs');
  }, navOption);
  kbService.register('g g', () => {
    gotoNavLink('messaging');
  }, navOption);
  kbService.register('g n', () => {
    gotoNavLink('notifications');
  }, navOption);
  kbService.register('g p', () => {
    gotoNavButton('Me');
  }, navOption);
  kbService.register('g b', () => {
    gotoNavButton('Business');
  }, navOption);
  kbService.register('g l', () => {
    gotoNavLink('learning');
  }, navOption);
  kbService.register('j', () => {
    scrollBy(1);
  }, navOption);
  kbService.register('k', () => {
    scrollBy(-1);
  }, navOption);
  kbService.register('s-j', () => {
    togglePost();
    scrollBy(1);
  }, navOption);
  kbService.register('s-k', () => {
    togglePost();
    scrollBy(-1);
  }, navOption);
  kbService.register('s-x', () => {
    togglePost();
  }, navOption);
  kbService.register('c', () => {
    showComments();
  }, navOption);
  kbService.register('m', () => {
    seeMore();
  }, navOption);
  kbService.register('l', () => {
    loadNewPosts();
  }, navOption);

  function isInput(element) {
    return (element.isContentEditable || element.tagName === 'INPUT');
  }

  function getRelatives() {
    return document.querySelectorAll('#voyager-feed div[data-id]');
  }

  function gotoSearch() {
    document.querySelector('#global-nav-search input').focus();
  }

  function gotoNavLink(item) {
    const el = document.querySelector(`#global-nav a[href*="/${item}"`);
    el.click();
  }

  function gotoNavButton(item) {
    const buttons = document.querySelectorAll('#global-nav button');
    for (const el of buttons) {
      if (el.textContent.includes(item)) {
	el.click();
	break;
      }
    }
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

  function showComments() {
    const post = getRelatives()[current];
    if (post) {
      const comments = post.querySelector('button[aria-label*="comment"]');
      if (comments) {
	comments.click();
      }
    }
  }

  function seeMore() {
    const post = getRelatives()[current];
    if (post) {
      const see_more = post.querySelector('button[aria-label^="see more"]');
      if (see_more) {
	see_more.click();
      }
    }
  }

  function loadNewPosts() {
    const posts = getRelatives();
    const first_post = posts[0].querySelector('div.feed-new-update-pill button');
    if (first_post) {
      first_post.click();
      current = -1;
    } else {
      const show_more = document.querySelector('#voyager-feed button.scaffold-finite-scroll__load-button');
      if (show_more) {
	show_more.click();
	posts[current].focus();
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
