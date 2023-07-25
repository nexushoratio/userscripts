// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @version     0.12
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

  // I'm lazy.  The version of emacs I'm using does not support
  // #private variables out of the box, so using underscores until I
  // get a working configuration.
  class Page {
    _pathname;
    _keyboard;

    constructor(pathname) {
      this._pathname = pathname;
      this._keyboard = new VM.shortcut.KeyboardService();
    }

    get pathname() {
      return this._pathname;
    }

    activate() {
      this._keyboard.enable();
    }
  }

  class Pages {
    _pages = [];

    constructor() {
      this.register('/');
    }

    register(pathname) {
      const page = new Page(pathname);
      this._pages.push(page);
    }

    activate(pathname) {
      const candidates = this._pages.filter(page => pathname.startsWith(page.pathname));
      const page = candidates.reduce((a, b) => {
	  return a.length > b.length ? a : b;
	}
      );
      console.log(page);
    }
  }

  const pages = new Pages();
  pages.register('/feed/');
  pages.register('/jobs/');
  pages.register('/jobs/collections/');
  pages.activate(window.location.pathname);

  const kbService = new VM.shortcut.KeyboardService();
  const navOption = {condition: '!inputFocus'};
  kbService.enable();

  const current = {
    _post: -1,
    get post() {
      const post = document.activeElement.closest('div[data-id]');
      if (post && post !== document.activeElement) {
	const relatives = getRelatives();
	const n = Array.prototype.findIndex.call(relatives, element => element === post);
	this._post = n;
      }
      return this._post;
    },
    set post(v) {
      this._post = v;
    }
  };

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
  kbService.register('s-l', () => {
    likeElement();
  }, navOption);

  function isInput(element) {
    return (element.isContentEditable || element.tagName === 'INPUT');
  }

  function getRelatives() {
    return document.querySelectorAll('main div[data-id]');
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

  function scrollToCurrent(relatives) {
    const el = relatives[current.post];
    el.scrollIntoView();
    // TODO(https://github.com/nexushoratio/userscripts/issues/9)
    el.setAttribute('tabindex', 0);
    el.focus();
  }

  function scrollBy(index, recursed = false) {
    console.debug('scrolling by %d', index);
    const relatives = getRelatives();
    current.post = Math.max(Math.min(current.post + index, relatives.length), 0);
    const el = relatives[current.post];
    // Some posts are hidden.  So far, seems like just ads.
    if (el.clientHeight === 0 && !recursed) {
      console.debug('Skipping...', el);
      scrollBy(index, true);
    } else {
      scrollToCurrent(relatives);
    }
  }

  function togglePost() {
    const post = getRelatives()[current.post];
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
    const post = getRelatives()[current.post];
    if (post) {
      const comments = post.querySelector('button[aria-label*="comment"]');
      if (comments) {
	comments.click();
      }
    }
  }

  function seeMore() {
    const post = getRelatives()[current.post];
    if (post) {
      const see_more = post.querySelector('button[aria-label^="see more"]');
      if (see_more) {
	see_more.click();
      }
    }
  }

  function likeElement() {
    const post = getRelatives()[current.post];
    console.debug(post);
    if (post) {
      const like_button = post.querySelector('button[aria-label^="Open reactions menu"]');
      like_button.click();
    }
  }

  function loadNewPosts() {
    const posts = getRelatives();
    const first_post = posts[0].querySelector('div.feed-new-update-pill button');
    if (first_post) {
      first_post.click();
      current.post = -1;
    } else {
      const show_more = document.querySelector('#voyager-feed button.scaffold-finite-scroll__load-button');
      if (show_more) {
	show_more.click();
	posts[current.post].focus();
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

  VM.observe(document.body, () => {
    console.debug('observer for main');
    const main = document.querySelector('main');
    if (main) {
      // TODO: factor this into standalone function.
      main.addEventListener('click', (e) => {
	const post = e.target.closest('div[data-id]');
	if (post) {
	  const relatives = getRelatives();
	  const n = Array.prototype.findIndex.call(relatives, element => element === post);
	  current.post = n;
	  scrollToCurrent(relatives);
	}
      });

      return true
    }
  });

  let oldUrl = new URL(window.location);
  VM.observe(document.body, () => {
    const newUrl = new URL(window.location);
    if (oldUrl.href !== newUrl.href) {
      const evt = new CustomEvent('href', {detail: {old: oldUrl, new: newUrl}})
      oldUrl = newUrl;
      document.dispatchEvent(evt);
    }
  });

  document.addEventListener('focus', (e) => {
    if (isInput(e.target)) {
      kbService.setContext('inputFocus', true);
    }
  }, true);
  document.addEventListener('blur', (e) => {
    if (isInput(e.target)) {
      kbService.setContext('inputFocus', false);
    }
  }, true);
  document.addEventListener('href', (e) => {
    pages.activate(e.detail.new.pathname);
  }, true);

})();
