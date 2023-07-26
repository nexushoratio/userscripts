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
    // The immediate following can be set if derived classes

    // What pathname part of the URL this page should handle.  The
    // special case of null is used by the Pages class to represent
    // global keys.
    _pathname;

    // CSS selector for capturing clicks on this page.  If overridden,
    // then the class should also provide a _clickHandler() method.
    _click_handler_selector = null;

    // List of keystrokes to register automatically.  They are objects
    // with keys of `seq`, `desc`, and `func`.  The `seq` is used to
    // define they keystroke sequence to trigger the function.  The
    // `desc` is used to create the help screen.  The `func` is a
    // function, usually in the form of `this.methodName`.  The
    // function is bound to `this` before registering it with
    // VM.shortcut.
    _auto_keys = [];

    // Private members.

    _keyboard = new VM.shortcut.KeyboardService();

    // Tracks which HTMLElement holds the `onclick` function.
    _click_handler_element = null;

    // Magic for VM.shortcut.  This disables keys when focus is on an
    // input type field.
    static _navOption = {
      caseSensitive: true,
      condition: '!inputFocus',
    };

    constructor() {
      this._boundClickHandler = this._clickHandler.bind(this);
    }

    start() {
      for (const {seq, func} of this._auto_keys) {
	this._addKey(seq, func.bind(this));
      }
    }

    get pathname() {
      return this._pathname;
    }

    get keyboard() {
      return this._keyboard;
    }

    activate() {
      this._keyboard.enable();
      this._enableClickHandler();
    }

    deactivate() {
      this._keyboard.disable();
      this._disableClickHandler();
    }

    _addKey(seq, func) {
      this._keyboard.register(seq, func, Page._navOption);
    }

    _enableClickHandler() {
      if (this._click_handler_selector) {
	// Page is dynamically building, so keep watching it until the
	// element shows up.
	VM.observe(document.body, () => {
	  const element = document.querySelector(this._click_handler_selector);
	  if (element) {
	    this._click_handler_element = element;
	    this._click_handler_element.addEventListener('click', this._boundClickHandler, true);

	    return true;
	  }
	});
      }
    }

    _disableClickHandler() {
      if (this._click_handler_element) {
	this._click_handler_element.removeEventListener('click', this._boundClickHandler, true);
	this._click_handler_element = null
      }
    }

    // Override this function in derived classes that want to react to
    // random clicks on a page, say to update current element in
    // focus.
    _clickHandler(evt) {
      alert(`Found a bug! ${this.constructor.name} wants to handle clicks, but forgot to create a handler.`);
    }

  }

  class Global extends Page {
    _pathname = null;
    _auto_keys = [
      {seq: '?', desc: 'Help', func: this._help},
      {seq: '/', desc: 'Search', func: this._gotoSearch},
      {seq: 'g h', desc: 'Go Home (aka, Feed)', func: this._goHome},
      {seq: 'g m', desc: 'Go to My Network', func: this._gotoMyNetwork},
      {seq: 'g j', desc: 'Go to Jobs', func: this._gotoJobs},
      {seq: 'g g', desc: 'Go to Messaging', func: this._gotoMessaging},
      {seq: 'g n', desc: 'Go to Notifications', func: this._gotoNotifications},
      {seq: 'g p', desc: 'Go to Profile (aka, Me)', func: this._gotoProfile},
      {seq: 'g b', desc: 'Go to Business', func: this._gotoBusiness},
      {seq: 'g l', desc: 'Go to Learning', func: this._gotoLearning},
    ];

    _gotoNavLink(item) {
      document.querySelector(`#global-nav a[href*="/${item}"`).click();
    }

    _gotoNavButton(item) {
      const buttons = document.querySelectorAll('#global-nav button');
      for (const el of buttons) {
	if (el.textContent.includes(item)) {
	  el.click();
	  break;
	}
      }
    }

    _help() {
      alert('The help is in another castle.');
    }

    _gotoSearch() {
      document.querySelector('#global-nav-search input').focus();
    }

    _goHome() {
      this._gotoNavLink('feed');
    }

    _gotoMyNetwork() {
      this._gotoNavLink('mynetwork');
    }

    _gotoJobs() {
      this._gotoNavLink('jobs');
    }

    _gotoMessaging() {
      this._gotoNavLink('messaging');
    }

    _gotoNotifications() {
      this._gotoNavLink('notifications');
    }

    _gotoProfile() {
      this._gotoNavButton('Me');
    }

    _gotoBusiness() {
      this._gotoNavButton('Business');
    }

    _gotoLearning() {
      this._gotoNavLink('learning');
    }

  }

  class Feed extends Page {
    _pathname = '/feed/';
    _click_handler_selector = 'main';
    _auto_keys = [
      {seq: 'j', desc: 'Next post', func: this._nextPost},
      {seq: 'J', desc: 'Toggle hiding then next post', func: this._nextPostPlus},
      {seq: 'k', desc: 'Previous post', func: this._prevPost},
      {seq: 'K', desc: 'Toggle hiding then previous post', func: this._prevPostPlus},
      {seq: 'X', desc: 'Toggle hiding post', func: this._togglePost},
      {seq: 'c', desc: 'Show comments', func: this._showComments},
      {seq: 'm', desc: 'Show more of the post', func: this._seeMore},
      {seq: 'l', desc: 'Load more posts (if [New Posts] button is available, load those)', func: this._loadMorePosts},
      {seq: 'L', desc: 'Like post', func: this._likePost},
    ];

    _postIndex = -1;
    _postId = null;

    _clickHandler(evt) {
      const post = evt.target.closest('div[data-id]');
      if (post) {
	const n = Array.prototype.findIndex.call(this._getPosts(),
						 el => el === post);
	this._postIndex = n;
	this._scrollToPost(post);
      }
    }

    _getPosts() {
      return document.querySelectorAll('main div[data-id]');
    }

    _scrollToPost(post) {
      post.scrollIntoView();
      // TODO(https://github.com/nexushoratio/userscripts/issues/9)
      post.setAttribute('tabindex', 0);
      post.focus();
      this._postId = post.dataset.id;
    }

    _scrollBy(n, recursed = false) {
      const posts = this._getPosts();
      this._postIndex = Math.max(Math.min(this._postIndex +n, posts.length), 0);
      const post = posts[this._postIndex];
      // Some posts are hidden, (ads, suggestions).  Skip over at least one.
      if (post.clientHeight === 0 && !recursed) {
	this._scrollBy(n, true);
      } else {
	this._scrollToPost(post);
      }
    }

    _nextPost() {
      this._scrollBy(1);
    }

    _nextPostPlus() {
      this._togglePost();
      this._nextPost();
    }

    _prevPost() {
      this._scrollBy(-1);
    }

    _prevPostPlus() {
      this._togglePost();
      this._prevPost();
    }

    _togglePost() {
      const post = this._getPosts()[this._postIndex];
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

    _showComments() {
      const post = this._getPosts()[this._postIndex];
      if (post) {
	const comments = post.querySelector('button[aria-label*="comment"]');
	if (comments) {
	  comments.click();
	}
      }
    }

    _seeMore() {
      const post = this._getPosts()[this._postIndex];
      if (post) {
	const see_more = post.querySelector('button[aria-label^="see more"]');
	if (see_more) {
	  see_more.click();
	}
      }
    }

    _likePost() {
      const post = this._getPosts()[this._postIndex];
      if (post) {
	const like_button = post.querySelector('button[aria-label^="Open reactions menu"]');
	like_button.click();
      }
    }

    _loadMorePosts() {
      const posts = this._getPosts();
      const new_updates = posts[0].querySelector('div.feed-new-update-pill button');
      if (new_updates) {
	new_updates.click();
	this._postIndex = -1;
      } else {
	const show_more = document.querySelector('main button.scaffold-finite-scroll__load-button');
	if (show_more) {
	  show_more.click();
	  posts[this._postIndex].focus();
	}
      }
    }

  }

  class Jobs extends Page {
    _pathname = '/jobs/';
  }

  class JobsCollections extends Page {
    _pathname = '/jobs/collections/';
  }

  class Pages {
    _global = null;
    _page = null;
    _pages = new Map();

    constructor() {
      document.addEventListener('focus', this._onFocus.bind(this), true);
      document.addEventListener('blur', this._onBlur.bind(this), true);
    }

    _setInputFocus(state) {
      const pages = Array.from(this._pages.values());
      pages.push(this._global);
      for (const page of pages) {
	if (page) {
	  page.keyboard.setContext('inputFocus', state);
	}
      }
    }

    _onFocus(evt) {
      if (isInput(evt.target)) {
	this._setInputFocus(true);
      }
    }

    _onBlur(evt) {
      if (isInput(evt.target)) {
	this._setInputFocus(false);
      }
    }

    register(page) {
      page.start();
      if (page.pathname === null) {
	this._global = page;
	this._global.activate();
      } else {
	this._pages.set(page.pathname, page);
      }
    }

    _findPage(pathname) {
      const pathnames = Array.from(this._pages.keys());
      const candidates = pathnames.filter(p => pathname.startsWith(p));
      const candidate = candidates.reduce((a, b) => {
	  return a.length > b.length ? a : b;
      }, '');
      return this._pages.get(pathname) || null;
    }

    activate(pathname) {
      if (this._page) {
	this._page.deactivate();
      }
      const page = this._findPage(pathname);
      this._page = page;
      if (page) {
	page.activate();
      }
    }
  }

  const pages = new Pages();
  pages.register(new Global());
  pages.register(new Feed());
  pages.register(new Jobs());
  pages.register(new JobsCollections());
  pages.activate(window.location.pathname);

  // TODO: Likely move into Pages.
  // const current = {
  //   _post: -1,
  //   get post() {
  //     const post = document.activeElement.closest('div[data-id]');
  //     if (post && post !== document.activeElement) {
  // 	const relatives = getRelatives();
  // 	const n = Array.prototype.findIndex.call(relatives, element => element === post);
  // 	this._post = n;
  //     }
  //     return this._post;
  //   },
  //   set post(v) {
  //     this._post = v;
  //   }
  // };

  function isInput(element) {
    return (element.isContentEditable || element.tagName === 'INPUT');
  }

  VM.observe(document.body, () => {
    const navbar = document.querySelector('#global-nav');

    if (navbar) {
      // TODO(https://github.com/nexushoratio/userscripts/issues/4)
      GM_addStyle(`div { scroll-margin-top: ${navbar.clientHeight + 4}px }`);

      return true;
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

  document.addEventListener('href', (e) => {
    pages.activate(e.detail.new.pathname);
  }, true);

})();
