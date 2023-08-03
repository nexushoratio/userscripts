// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @version     1.1.0
// @author      Mike Castle
// @description Minor enhancements to LinkedIn. Mostly just hotkeys.
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// @downloadURL https://github.com/nexushoratio/userscripts/raw/main/linkedin-tool.user.js
// @supportURL  https://github.com/nexushoratio/userscripts/blob/main/linkedin-tool.md
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// ==/UserScript==

/* global VM */

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
            this._click_handler_element.addEventListener('click', this._boundClickHandler);

            return true;
          }
        });
      }
    }

    _disableClickHandler() {
      if (this._click_handler_element) {
        this._click_handler_element.removeEventListener('click', this._boundClickHandler);
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
      clickElement(document, [`#global-nav a[href*="/${item}"`]);
    }

    _gotoNavButton(item) {
      const buttons = Array.from(document.querySelectorAll('#global-nav button'));
      const button = buttons.find(el => el.textContent.includes(item));
      if (button) {
        button.click();
      }
    }

    _help() {
      const help = document.querySelector(`#${this.helpId}`);
      help.showModal();
      help.focus();
    }

    _gotoSearch() {
      clickElement(document, ['#global-nav-search button']);
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
      {seq: 'm', desc: 'Show more of the post or comment', func: this._seeMore},
      {seq: 'c', desc: 'Show comments', func: this._showComments},
      {seq: 'n', desc: 'Next comment', func: this._nextComment},
      {seq: 'p', desc: 'Previous comment', func: this._prevComment},
      {seq: 'l', desc: 'Load more posts (if the <button>New Posts</button> button is available, load those)', func: this._loadMorePosts},
      {seq: 'L', desc: 'Like post or comment', func: this._likePostOrComment},
      {seq: 'f', desc: 'Focus on current post or comment (causes browser to change focus)', func: this._focusBrowser},
      {seq: 'v p', desc: 'View the post directly', func: this._viewPost},
      {seq: '=', desc: 'Open the (⋯) menu', func: this._openMeatballMenu},
    ];

    _currentPostElement = null;
    _currentCommentElement = null;

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
      if (val === this._currentPostElement) {
        return;
      }
      if (this._currentPostElement) {
        this._currentPostElement.classList.remove('tom');
      }
      this._currentPostElement = val;
      this._comment = null;
      if (val) {
        val.classList.add('tom');
        this._scrollToCurrentPost();
      }
    }

    get _comment() {
      return this._currentCommentElement;
    }

    set _comment(val) {
      if (this._currentCommentElement) {
        this._currentCommentElement.classList.remove('dick');
      }
      this._currentCommentElement = val;
      if (val) {
        val.classList.add('dick');
        this._scrollToCurrentComment();
      }
    }

    _getPosts() {
      return Array.from(document.querySelectorAll('main div[data-id]'));
    }

    _getComments() {
      if (this._post) {
        return Array.from(this._post.querySelectorAll('article.comments-comment-item'));
      } else {
        return [];
      }
    }

    _scrollToCurrentPost() {
      this._post.style.scrollMarginTop = navBarHeightCss;
      this._post.scrollIntoView();
    }

    _scrollToCurrentComment() {
      const rect = this._comment.getBoundingClientRect();
      this._comment.style.scrollMarginTop = navBarHeightCss;
      this._comment.style.scrollMarginBottom = '3em';
      // If both scrolling happens, that means the comment is too long
      // to fit on the page, so the top is preferred.
      if (rect.bottom > document.documentElement.clientHeight) {
        this._comment.scrollIntoView(false);
      }
      if (rect.top < navBarHeightPixels) {
        this._comment.scrollIntoView();
      }
    }

    _scrollBy(n) {
      const posts = this._getPosts();
      if (posts.length) {
        let idx = posts.indexOf(this._post);
        let post = null;
        // Some posts are hidden (ads, suggestions).  Skip over thoses.
        do {
          idx = Math.max(Math.min(idx + n, posts.length - 1), 0);
          post = posts[idx];
        } while (!post.clientHeight);
        this._post = post;
      }
    }

    _scrollCommentsBy(n) {
      const comments = this._getComments();
      if (comments.length) {
        let idx = comments.indexOf(this._comment);
        idx = Math.min(idx + n, comments.length - 1);
        if (idx < 0) {
          // focus back to post
          this._comment = null;
          this._post = this._post;
        } else {
          this._comment = comments[idx];
        }
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

    _nextComment() {
      this._scrollCommentsBy(1);
    }

    _prevComment() {
      this._scrollCommentsBy(-1);
    }

    _togglePost() {
      clickElement(this._post, ['button[aria-label^="Dismiss post"]', 'button[aria-label^="Undo and show"]']);
    }

    _showComments() {
      clickElement(this._post, ['button[aria-label*="comment"]']);
    }

    _seeMore() {
      const el = this._comment ? this._comment : this._post;
      clickElement(el, ['button[aria-label^="see more"]']);
    }

    _likePostOrComment() {
      const el = this._comment ? this._comment : this._post;
      clickElement(el, ['button[aria-label^="Open reactions menu"]']);
    }

    _loadMorePosts() {
      const posts = this._getPosts();
      if (clickElement(posts[0], ['div.feed-new-update-pill button'])) {
        this._post = posts[0];
      } else {
        clickElement(document, ['main button.scaffold-finite-scroll__load-button']);
      }
      this._scrollToCurrentPost();
    }

    _openMeatballMenu() {
      if (this._comment) {
        // XXX In this case, the aria-label is on the svg element, not
        // the button, so use the parentElement.
        const button = this._comment.querySelector('[aria-label^="Open options"]').parentElement;
        button.click();
      } else if (this._post) {
        // Yeah, I don't get it.  This one isn't the button either,
        // but the click works.
        clickElement(this._post, ['[aria-label^="Open control menu"]']);
      }
    }

    _focusBrowser() {
      const el = this._comment ? this._comment : this._post;
      if (el) {
        const tabIndex = el.getAttribute('tabindex');
        el.setAttribute('tabindex', 0);
        el.focus();
        if (tabIndex) {
          el.setAttribute('tabindex', tabIndex);
        } else {
          el.removeAttribute('tabindex');
        }
      }
    }

    _viewPost() {
      if (this._post) {
        const urn = this._post.dataset.id;
        const id = `lt-${urn.replaceAll(':', '-')}`;
        let a = this._post.querySelector(`#${id}`);
        console.debug('queried a', a);
        if (!a) {
          a = document.createElement('a');
          a.href = `/feed/update/${urn}/`;
          a.id = id;
          this._post.append(a);
        }
        a.click();
      }
    }

  }

  class Jobs extends Page {
    _pathname = '/jobs/';
  }

  class JobsCollections extends Page {
    _pathname = '/jobs/collections/';
  }

  class Notifications extends Page {
    _pathname = '/notifications/';
    _auto_keys = [
      {seq: 'j', desc: 'Next notification', func: this._nextNotification},
      {seq: 'k', desc: 'Previous notification', func: this._prevNotification},
      {seq: 'a', desc: 'Activate the notification (click on it)', func: this._activateNotification},
      {seq: '=', desc: 'Open the (⋯) menu', func: this._openMeatballMenu},
    ];

    // Ugh.  When notifications are deleted, the entire element, and
    // parent elements, are deleted and replaced by new elements.  So
    // the only way to track them is by array position.
    _currentNotificationIndex = -1;

    get _notification() {
      if (this._currentNotificationIndex >= 0) {
        return this._getNotifications()[this._currentNotificationIndex];
      } else {
        return null;
      }
    }

    set _notification(val) {
      if (this._notification) {
        this._notification.classList.remove('tom');
      }
      if (val) {
        const notifications = this._getNotifications();
        this._currentNotificationIndex = notifications.indexOf(val);
        val.classList.add('tom');
        this._scrollToCurrentNotification();
      }
    }

    _getNotifications() {
      return Array.from(document.querySelectorAll('main section div.nt-card-list article'));
    }

    _scrollToCurrentNotification() {
      const rect = this._notification.getBoundingClientRect();
      this._notification.style.scrollMarginTop = navBarHeightCss;
      this._notification.style.scrollMarginBottom = '3em';
      if (rect.bottom > document.documentElement.clientHeight) {
        this._notification.scrollIntoView(false);
      }
      if (rect.top < navBarHeightPixels) {
        this._notification.scrollIntoView();
      }
    }

    _scrollBy(n) {
      const notifications = this._getNotifications();
      if (notifications.length) {
        const idx = Math.max(Math.min(this._currentNotificationIndex + n, notifications.length - 1), 0);
        this._notification = notifications[idx];
      }
    }

    _nextNotification() {
      this._scrollBy(1);
    }

    _prevNotification() {
      this._scrollBy(-1);
    }

    _openMeatballMenu() {
      clickElement(this._notification, ['button[aria-label^="Settings menu"]', 'button[aria-label^="Undo notification deletion"]']);
    }

    _activateNotification() {
      if (this._notification) {
        // Every notification is different.
        function matchesKnownText(el) {
          if (el.innerText === 'Apply early') return true;
          if (el.innerText.match(/View \d+ Job/)) return true;
          return false;
        }

        if (!clickElement(this._notification, ['button.message-anywhere-button'])) {
          const buttons = Array.from(this._notification.querySelectorAll('button'));
          const button = buttons.find(matchesKnownText);
          if (button) {
            button.click();
          } else {
            const links = this._notification.querySelectorAll('a');
            if (links.length === 1) {
              links[0].click();
            } else {
              console.debug(this._notification);
              console.debug(this._notification.querySelectorAll('*'));
              const msg = [
                'You tried to activate an unsupported notification',
                'element.  Please file a bug.  If you are comfortable',
                'with using the browser\'s Developer Tools (often the',
                'F12 key), consider sharing the information just logged',
                'in the console / debug view.',
              ];
              alert(msg.join(' '));
            }
          }
        }
      }
    }

  }

  class Pages {
    _global = null;
    _page = null;
    _pages = new Map();

    _lastInputElement = null;

    constructor() {
      this._id = crypto.randomUUID();
      this._installNavStyle();
      this._initializeHelpMenu();
      document.addEventListener('focus', this._onFocus.bind(this), true);
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
      if (this._lastInputElement && evt.target !== this._lastInputElement) {
        this._lastInputElement = null
        this._setInputFocus(false);
      }
      if (isInput(evt.target)) {
        this._setInputFocus(true);
        this._lastInputElement = evt.target;
      }
    }

    _onHref(evt) {
      this.activate(evt.detail.url.pathname);
    }

    _installNavStyle() {
      const style = document.createElement('style');
      style.textContent += '.tom { border-color: orange !important; border-style: solid !important; border-width: medium !important; }';
      style.textContent += '.dick { border-color: red !important; border-style: solid !important; border-width: thin !important; }';
      document.head.append(style);
    }

    _initializeHelpMenu() {
      this._helpId = `help-${this._id}`;
      const style = document.createElement('style');
      style.textContent += `#${this._helpId} kbd {font-size: 0.85em; padding: 0.07em; border-width: 1px; border-style: solid; }`;
      style.textContent += `#${this._helpId} th { padding-top: 1em; text-align: left; }`;
      style.textContent += `#${this._helpId} td:first-child { white-space: nowrap; text-align: right; padding-right: 0.5em; }`;
      style.textContent += `#${this._helpId} button { border-width: 1px; border-style: solid; border-radius: 0.25em; }`;
      document.head.prepend(style);
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
      let s = `<tr><th></th><th>${section}</th></tr>`;
      for (const {seq, desc} of page.helpContent) {
        const keys = this._parseSeq(seq);
        s += `<tr><td>${keys}:</td><td>${desc}</td></tr>`;
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
  pages.register(new Notifications());
  pages.activate(window.location.pathname);

  function isInput(element) {
    let tagName = '';
    if ('tagName' in element) {
      tagName = element.tagName.toLowerCase();
    }
    return (element.isContentEditable || ['input', 'textarea'].includes(tagName));
  }

  // Run querySelector to get an element, then click it.
  function clickElement(base, selectorArray) {
    if (base) {
      for (const selector of selectorArray) {
        const el = base.querySelector(selector);
        if (el) {
          el.click();
          return true;
        }
      }
    }
    return false;
  }

  let navBarHeightPixels = 0;
  let navBarHeightCss = '0';
  VM.observe(document.body, () => {
    const navbar = document.querySelector('#global-nav');

    if (navbar) {
      navBarHeightPixels = navbar.clientHeight + 4;
      navBarHeightCss = `${navBarHeightPixels}px`;

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
