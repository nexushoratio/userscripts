// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @version     0.14
// @author      Mike Castle
// @description Add some stuff to LinkedIn.  So far, just keystrokes.
// @downloadURL https://github.com/nexushoratio/userscripts/raw/main/linkedin-tool.user.js
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// ==/UserScript==

(function () {
  'use strict';

  console.debug('Parsing successful.');

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

    get helpHeader() {
      return this.constructor.name;
    }

    get helpContent() {
      return this._auto_keys;
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
      {seq: '?', desc: 'Show keyboard help', func: this._help},
      {seq: '/', desc: 'Go to Search box', func: this._gotoSearch},
      {seq: 'g h', desc: 'Go Home (aka, Feed)', func: this._goHome},
      {seq: 'g m', desc: 'Go to My Network', func: this._gotoMyNetwork},
      {seq: 'g j', desc: 'Go to Jobs', func: this._gotoJobs},
      {seq: 'g g', desc: 'Go to Messaging', func: this._gotoMessaging},
      {seq: 'g n', desc: 'Go to Notifications', func: this._gotoNotifications},
      {seq: 'g p', desc: 'Go to Profile (aka, Me)', func: this._gotoProfile},
      {seq: 'g b', desc: 'Go to Business', func: this._gotoBusiness},
      {seq: 'g l', desc: 'Go to Learning', func: this._gotoLearning},
    ];

    get helpId() {
      return this._helpId;
    }

    set helpId(val) {
      this._helpId = val;
    }

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
      const help = document.querySelector(`#${this.helpId}`);
      help.showModal();
      help.focus();
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
      {seq: 'X', desc: 'Toggle hiding current post', func: this._togglePost},
      {seq: 'j', desc: 'Next post', func: this._nextPost},
      {seq: 'J', desc: 'Toggle hiding then next post', func: this._nextPostPlus},
      {seq: 'k', desc: 'Previous post', func: this._prevPost},
      {seq: 'K', desc: 'Toggle hiding then previous post', func: this._prevPostPlus},
      {seq: 'c', desc: 'Show comments', func: this._showComments},
      {seq: 'm', desc: 'Show more of the post', func: this._seeMore},
      {seq: 'l', desc: 'Load more posts (if the <button>New Posts</button> button is available, load those)', func: this._loadMorePosts},
      {seq: 'L', desc: 'Like post', func: this._likePost},
    ];

    _currentPostElement = null;

    _clickHandler(evt) {
      const post = evt.target.closest('div[data-id]');
      if (post) {
        this._post = post;
      }
    }

    get _post() {
      return this._currentPostElement;
    }

    set _post(val) {
      this._currentPostElement = val;
      this._currentPostId = this._currentPostElement.dataset.id;
      this._scrollToCurrentPost();
    }

    get _postId() {
      return this._currentPostId;
    }

    _getPosts() {
      return document.querySelectorAll('main div[data-id]');
    }

    _scrollToCurrentPost() {
      this._post.scrollIntoView();
      // TODO(https://github.com/nexushoratio/userscripts/issues/9)
      this._post.setAttribute('tabindex', 0);
      this._post.focus();
    }

    _scrollBy(n) {
      console.debug('scrolling by', n);
      const posts = this._getPosts();
      console.debug(posts.length);
      if (posts.length) {
        let idx = Array.prototype.findIndex.call(posts, el => el === this._post);
        let post = null;
        // Some posts are hidden (ads, suggestions).  Skip over thoses.
        do {
          idx = Math.max(Math.min(idx + n, posts.length), 0);
          console.debug(idx);
          post = posts[idx];
        } while (!post.clientHeight);
        this._post = post;
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
      if (this._post) {
        const dismiss = this._post.querySelector('button[aria-label^="Dismiss post"]');
        if (dismiss) {
          dismiss.click();
        } else {
          const undo = this._post.querySelector('button[aria-label^="Undo and show"]');
          if (undo) {
            undo.click();
          }
        }
      }
    }

    _showComments() {
      if (this._post) {
        const comments = this._post.querySelector('button[aria-label*="comment"]');
        if (comments) {
          comments.click();
        }
      }
    }

    _seeMore() {
      if (this._post) {
        const see_more = this._post.querySelector('button[aria-label^="see more"]');
        if (see_more) {
          see_more.click();
        }
      }
    }

    _likePost() {
      if (this._post) {
        const like_button = this._post.querySelector('button[aria-label^="Open reactions menu"]');
        like_button.click();
      }
    }

    _loadMorePosts() {
      const posts = this._getPosts();
      const new_updates = posts[0].querySelector('div.feed-new-update-pill button');
      if (new_updates) {
        new_updates.click();
        this._postIndex = 0;
        this._scrollToCurrentPost();
      } else {
        const show_more = document.querySelector('main button.scaffold-finite-scroll__load-button');
        if (show_more) {
          show_more.click();
          this._scrollToCurrentPost();
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
      this._id = crypto.randomUUID();
      this._initializeHelpMenu();
      document.addEventListener('focus', this._onFocus.bind(this), true);
      document.addEventListener('blur', this._onBlur.bind(this), true);
      document.addEventListener('href', this._onHref.bind(this), true);
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

    _onHref(evt) {
      this.activate(evt.detail.url.pathname);
    }

    _initializeHelpMenu() {
      this._helpId = `help-${this._id}`;
      const dialog = document.createElement('dialog');
      dialog.id = this._helpId
      dialog.innerHTML = '<table><caption>' +
        '<span style="float: left">Keyboard shortcuts</span>' +
        '<span style="float: right">Hit <kbd>ESC</kbd> to close</span>' +
        '</caption><tbody></tbody></table>';
      document.body.prepend(dialog);
    }

    // ThisPage -> This Page
    _parseHeader(text) {
      return text.replace(/([A-Z])/g, ' $1').trim();
    }

    // 'a b' -> '<kbd>a</kbd> then <kbd>b</kbd>'
    _parseSeq(seq) {
      const letters = seq.split(' ').map(w => `<kbd>${w}</kbd>`);
      const s = letters.join(' then ');
      return s;
    }

    _addHelp(page) {
      const help = document.querySelector(`#${this._helpId} tbody`);
      const section = this._parseHeader(page.helpHeader);
      let s = `<tr><th></th><th style="float: left">${section}</th></tr>`;
      for (const {seq, desc} of page.helpContent) {
        const keys = this._parseSeq(seq);
        s += `<tr><td style="white-space: nowrap;">${keys}:</td><td>${desc}</td></tr>`;
      }
      // Don't include works in progress that have no keys yet.
      if (page.helpContent.length) {
        help.innerHTML += s;
      }
    }

    register(page) {
      page.start();
      this._addHelp(page);
      if (page.pathname === null) {
        page.helpId = this._helpId
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

  function isInput(element) {
    return (element.isContentEditable || element.tagName === 'INPUT');
  }

  VM.observe(document.body, () => {
    const navbar = document.querySelector('#global-nav');

    if (navbar) {
      // TODO(https://github.com/nexushoratio/userscripts/issues/4)
      const style = document.createElement('style');
      style.textContent = `div { scroll-margin-top: ${navbar.clientHeight + 4}px }`;
      document.head.prepend(style);

      return true;
    }
  });

  let oldUrl = new URL(window.location);
  VM.observe(document.body, () => {
    const newUrl = new URL(window.location);
    if (oldUrl.href !== newUrl.href) {
      const evt = new CustomEvent('href', {detail: {url: newUrl}})
      oldUrl = newUrl;
      document.dispatchEvent(evt);
    }
  });

})();
