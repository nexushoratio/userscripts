// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @version     2.4.7
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

  let navBarHeightPixels = 0;
  let navBarHeightCss = '0';

  /**
   * Java's hashCode:  s[0]*31(n-1) + s[1]*31(n-2) + ... + s[n-1]
   * @param {string} s - String to hash.
   * @returns {string} - Hash value.
   */
  function strHash(s) {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i) | 0;
    }
    return `${hash}`;
  }

  /**
   * Run querySelector to get an element, then click it.
   * @param {Element} base - Where to start looking.
   * @param {string[]} selectorArray - CSS selectors to use to find an
   * element.
   * @returns {boolean} - Whether an element could be found.
   */
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

  /**
   * Determines if the element accepts keyboard input.
   * @param {Element} element - HTML Element to examine.
   * @returns {boolean} - Indicating whether the element accepts keyboard input.
   */
  function isInput(element) {
    let tagName = '';
    if ('tagName' in element) {
      tagName = element.tagName.toLowerCase();
    }
    return (element.isContentEditable || ['input', 'textarea'].includes(tagName));
  }

  /**
   * Bring the Brower's focus onto element.
   * @param {Element} element - HTML Element to focus on.
   * @returns {void}
   */
  function focusOnElement(element) {
    if (element) {
      const tabIndex = element.getAttribute('tabindex');
      element.setAttribute('tabindex', 0);
      element.focus();
      if (tabIndex) {
        element.setAttribute('tabindex', tabIndex);
      } else {
        element.removeAttribute('tabindex');
      }
    }
  }

  /**
   * Scroll's LinkedIn common sidebar into view and moves focus to it.
   * @returns {void}
   */
  function focusOnSidebar() {
    const sidebar = document.querySelector('div.scaffold-layout__sidebar');
    sidebar.style.scrollMarginTop = navBarHeightCss;
    sidebar.scrollIntoView();
    sidebar.focus();
  }

  // One time resize observer with timeout
  // Will resolve automatically upon resize change.
  // base - element to observe
  // trigger - function to call that triggers observable events, can be null
  // timeout - time to wait for completion in milliseconds, 0 disables
  // Returns promise that will resolve with the results from monitor.
  function otrot(base, trigger, timeout) {
    const prom = new Promise((resolve, reject) => {
      let timeoutID = null;
      const initialHeight = base.clientHeight;
      const initialWidth = base.clientWidth;
      trigger = trigger || function () {};
      const observer = new ResizeObserver(() => {
        if (base.clientHeight !== initialHeight || base.clientWidth !== initialWidth) {
          observer.disconnect();
          clearTimeout(timeoutID);
          resolve(base);
        }
      });
      if (timeout) {
        timeoutID = setTimeout(() => {
          observer.disconnect();
          reject('timed out');
        }, timeout);
      }
      observer.observe(base);
      trigger();
    });
    return prom;
  }

  // One time mutation observer with timeout
  // base - element to observe
  // options - MutationObserver().observe options
  // monitor - function that takes [MutationRecord] and returns a {done, results} object
  // trigger - function to call that triggers observable results, can be null
  // timeout - time to wait for completion in milliseconds, 0 disables
  // Returns promise that will resolve with the results from monitor.
  function otmot(base, options, monitor, trigger, timeout) {
    const prom = new Promise((resolve, reject) => {
      let timeoutID = null;
      trigger = trigger || function () {};
      const observer = new MutationObserver((records) => {
        const {done, results} = monitor(records);
        if (done) {
          observer.disconnect();
          clearTimeout(timeoutID);
          resolve(results);
        }
      });
      if (timeout) {
        timeoutID = setTimeout(() => {
          observer.disconnect();
          reject('timed out');
        }, timeout);
      }
      observer.observe(base, options);
      trigger();
    });
    return prom;
  }

  // I'm lazy.  The version of emacs I'm using does not support
  // #private variables out of the box, so using underscores until I
  // get a working configuration.

  /** Simple dispatcher.  It takes a fixed list of event types upon
   * construction and attempts to use an unknown event will throw an
   * error.
   */
  class Dispatcher {
    _handlers = new Map();

    /**
     * @param{...string} eventTypes - Event types this instance can handle.
     */
    constructor(...eventTypes) {
      for (const eventType of eventTypes) {
        this._handlers.set(eventType, []);
      }
    }

    /**
     * Look up array of handlers by event type.
     * @param {string} eventType - Event type to look up.
     * @throws {Error} - When eventType was not registered during instantiation.
     * @returns {function[]} - Handlers currently registered for this eventType.
     */
    _getHandlers(eventType) {
      const handlers = this._handlers.get(eventType);
      if (!handlers) {
        throw new Error(`Unknown event type: ${eventType}`);
      }
      return handlers;
    }

    /**
     * Attach a function to an eventType.
     * @param {string} eventType - Event type to connect with.
     * @param {function} func - Single argument function to call.
     * @returns {void}
     */
    on(eventType, func) {
      const handlers = this._getHandlers(eventType);
      handlers.push(func);
    }

    /**
     * Remove all instances of a function registered to an eventType.
     * @param {string} eventType - Event type to disconnect from.
     * @param {function} func - Function to remove.
     * @returns {void}
     */
    off(eventType, func) {
      const handlers = this._getHandlers(eventType)
      let index = 0;
      while ((index = handlers.indexOf(func)) !== -1) {
        handlers.splice(index, 1);
      }
    }

    /**
     * Calls all registered functions for the given eventType.
     * @param {string} eventType - Event type to use.
     * @param {object} data - Data to pass to each function.
     * @returns {void}
     */
    fire(eventType, data) {
      const handlers = this._getHandlers(eventType);
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  /**
   * An ordered collection of HTMLElements for a user to scroll through.
   *
   * The dispatcher can be used the handle the following events:
   * - 'out-of-range' - Scrolling went past one end of the collection.
   * - 'change' - The value of item has changed.
   * This is NOT an error condition, but rather a design feature.
   */
  class Scroller {
    _dispatcher = new Dispatcher('change', 'out-of-range');
    _currentItemId = null;
    _historicalIdToIndex = new Map();

    /**
     * @param {Element} base - The container element.
     * @param {string[]} selectors - Array of CSS selectors to find
     * elements to collect, calling base.querySelectorAll().
     * @param {function(Element): string} uidCallback - Function that,
     * given an element, returns a unique identifier for it.
     * @param {string[]} classes - Array of CSS classes to add/remove
     * from an element as it becomes current.
     * @param {boolean} snapToTop - Whether items should snap to the
     * top of the window when coming into view.
     * @param {object} [debug={}] - Debug options
     * @param {boolean} [debug.enabled=false] - Enable messages.
     * @param {boolean} [debug.stackTrace=false] - Include stack traces.
     */
    constructor(base, selectors, uidCallback, classes, snapToTop, debug) {
      if (!(base instanceof Element)) {
        throw new TypeError(`Invalid base: ${base}`);
      }
      this._destroyed = false;
      this._base = base;
      this._selectors = selectors;
      this._uidCallback = uidCallback;
      this._classes = classes;
      this._snapToTop = snapToTop;
      this._debug = debug ?? {};
      this._debug.enabled ??= false;
      this._debug.stackTrace ??= false;
      this._msg('Scroller constructed', this);
    }

    /**
     * @param {string} msg - Debug message to send to the console.
     * @returns {void}
     */
    _msg(msg, ...rest) {
      /* eslint-disable no-console */
      if (this._debug.enabled) {
        if (this._debug.stackTrace) {
          console.groupCollapsed('call stack');
          console.trace();
          console.groupEnd();
        }
        if (typeof msg === 'string' && msg.startsWith('Entered')) {
          console.group(msg.substr(msg.indexOf(' ') + 1));
        } else if (typeof msg === 'string' && msg.startsWith('Starting')) {
          console.groupCollapsed(`${msg.substr(msg.indexOf(' ') + 1)} (collapsed)`);
        }
        console.debug(msg, ...rest);
        if (typeof msg === 'string' && (/^(Leaving|Finished)/).test(msg)) {
          console.groupEnd();
        }
      }
      /* eslint-enable */
    }

    /**
     * @type {Dispatcher} - Accessor for dipatcher.
     */
    get dispatcher() {
      return this._dispatcher;
    }

    /**
     * @type {Element} - Represents the current item.
     */
    get item() {
      this._msg('Entered get item');
      if (this._destroyed) {
        const msg = `Tried to work with destroyed ${this.constructor.name} on ${this._base}`;
        this._msg(msg);
        throw new Error(msg);
      }
      const items = this._getItems();
      let item = items.find(this._matchItem.bind(this));
      if (!item) {
        // We couldn't find the old id, so maybe it was rebuilt.  Make
        // a guess by trying the old index.
        const idx = this._historicalIdToIndex.get(this._currentItemId);
        if (typeof idx === 'number' && 0 <= idx && idx < items.length) {
          item = items[idx];
          this._bottomHalf(item);
        }
      }
      this._msg('Leaving get item with', item);
      return item;
    }

    set item(val) {
      this._msg('Entered set item with', val);
      if (this.item) {
        this.item.classList.remove(...this._classes);
      }
      this._bottomHalf(val);
      this._msg('Leaving set item');
    }

    /**
     * Since the getter will try to validate the current item (since
     * it could have changed out from under us), it too can update
     * information.
     * @param {Element} val - Element to make current.
     * @returns {void}
     */
    _bottomHalf(val) {
      this._msg('Entered bottomHalf with', val);
      this._currentItemId = this._uid(val);
      const idx = this._getItems().indexOf(val);
      this._historicalIdToIndex.set(this._currentItemId, idx);
      if (val) {
        val.classList.add(...this._classes);
        this._scrollToCurrentItem();
      }
      this.dispatcher.fire('change', {});
      this._msg('Leaving bottomHalf');
    }

    /**
     * Builds the list of using the registered CSS selectors.
     * @returns {Elements[]} - Items to scroll through.
     */
    _getItems() {
      this._msg('Entered getItems');
      const items = [];
      for (const selector of this._selectors) {
        this._msg(`considering ${selector}`);
        items.push(...this._base.querySelectorAll(selector));
      }
      if (this._debug) {
        this._msg('Starting items');
        for (const item of items) {
          this._msg(item);
        }
        this._msg('Finished items');
      }
      this._msg(`Leaving getItems with ${items.length} items`);
      return items;
    }

    /**
     * Returns the uid for the current element.  Will use the
     * registered uidCallback function for this.
     * @param {Element} element - Element to identify.
     * @returns {string} - Computed uid for element.
     */
    _uid(element) {
      this._msg('Entered uid with', element);
      let uid = null;
      if (element) {
        if (!element.dataset.litId) {
          element.dataset.litId = this._uidCallback(element);
        }
        uid = element.dataset.litId;
      }
      this._msg('Leaving uid with', uid);
      return uid;
    }

    /**
     * Checks if the element is the current one.  Useful as a callback
     * to Array.find.
     * @param {Element} element - Element to check.
     * @returns {boolean} - Whether or not element is the current one.
     */
    _matchItem(element) {
      this._msg('Entered matchItem');
      const res = this._currentItemId === this._uid(element);
      this._msg('Leaving matchItem with', res);
      return res;
    }

    /**
     * Scroll the current item into the view port.  Depending on the
     * instance configuration, this could snap to the top, snap to the
     * bottom, or be a no-op.
     * @returns {void}
     */
    _scrollToCurrentItem() {
      const item = this.item;
      this._msg('Entered scrollToCurrentItem with', this._snapToTop);
      item.style.scrollMarginTop = navBarHeightCss;
      if (this._snapToTop) {
        item.scrollIntoView();
      } else {
        item.style.scrollMarginBottom = '3em';
        const rect = item.getBoundingClientRect();
        // If both scrolling happens, it means the item is too tall to
        // fit on the page, so the top is preferred.
        if (rect.bottom > document.documentElement.clientHeight) {
          item.scrollIntoView(false);
        }
        if (rect.top < navBarHeightPixels) {
          item.scrollIntoView(true);
        }
      }
      this._msg('Leaving scrollToCurrentItem');
    }

    /**
     * Jump an item on the end of the collection.
     * @param {boolean} first - If true, the first item in the
     * collection, else, the last.
     * @returns {void}
     */
    _jumpToEndItem(first) {
      // Reset in case item was heavily modified
      this.item;

      const items = this._getItems();
      if (items.length) {
        let idx = first ? 0 : (items.length - 1);
        let item = items[idx];

        // Content of items is sometimes loaded lazily and can be
        // detected by having no innerText yet.  So start at the end
        // and work our way up to the last one loaded.
        if (!first) {
          while (!item.innerText.length) {
            idx--;
            item = items[idx];
          }
        }
        this.item = item;
      }
    }

    /**
     * Move forward or backwards in the collection by at least n.
     * @param {number} n - How many items to move and the intended direction.
     * @fires 'out-of-range'
     * @returns {void}
     */
    _scrollBy(n) {
      this._msg('Entered scrollBy', n);
      // Reset in case item was heavily modified
      this.item;

      const items = this._getItems();
      if (items.length) {
        let idx = items.findIndex(this._matchItem.bind(this));
        this._msg('starting idx', idx);
        idx += n;
        if (idx < -1) {
          idx = items.length - 1;
        }
        if (idx === -1 || idx >= items.length) {
          this._msg('left the container');
          this.item = null;
          this.dispatcher.fire('out-of-range', null);
        } else {
          // Skip over empty items
          let item = items[idx];
          while (!item.clientHeight) {
            this._msg('skipping empty item', item);
            idx += n;
            item = items[idx];
          }
          this._msg('final idx', idx);
          this.item = item;
        }
      }
      this._msg('Leaving scrollBy');
    }

    /**
     * Move to the next item in the collection.
     * @returns {void}
     */
    next() {
      this._scrollBy(1);
    }

    /**
     * Move to the previous item in the collection.
     * @returns {void}
     */
    prev() {
      this._scrollBy(-1);
    }

    /**
     * Jump to the first item in the collection.
     * @returns {void}
     */
    first() {
      this._jumpToEndItem(true);
    }

    /**
     * Jump to last item in the collection.
     * @returns {void}
     */
    last() {
      this._jumpToEndItem(false);
    }

    /**
     * Mark instance as inactive and do any internal cleanup.
     * @returns {void}
     */
    destroy() {
      this._msg('Entered destroy');
      this.item = null;
      this._destroyed = true;
      this._msg('Leaving destroy');
    }
  }

  class Page {
    // The immediate following can be set if derived classes

    // What pathname part of the URL this page should handle.  The
    // special case of null is used by the Pages class to represent
    // global keys.
    _pathname;

    // CSS selector for capturing clicks on this page.  If overridden,
    // then the class should also provide a _onClick() method.
    _on_click_selector = null;

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
    _on_click_element = null;

    // Magic for VM.shortcut.  This disables keys when focus is on an
    // input type field.
    static _navOption = {
      caseSensitive: true,
      condition: '!inputFocus',
    };

    constructor() {
      this._boundOnClick = this._onClick.bind(this);
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
      this._enableOnClick();
    }

    deactivate() {
      this._keyboard.disable();
      this._disableOnClick();
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

    _enableOnClick() {
      if (this._on_click_selector) {
        // Page is dynamically building, so keep watching it until the
        // element shows up.
        VM.observe(document.body, () => {
          const element = document.querySelector(this._on_click_selector);
          if (element) {
            this._on_click_element = element;
            this._on_click_element.addEventListener('click', this._boundOnClick);

            return true;
          }
        });
      }
    }

    _disableOnClick() {
      if (this._on_click_element) {
        this._on_click_element.removeEventListener('click', this._boundOnClick);
        this._on_click_element = null;
      }
    }

    // Override this function in derived classes that want to react to
    // random clicks on a page, say to update current element in
    // focus.
    _onClick(evt) {  // eslint-disable-line no-unused-vars
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
    _on_click_selector = 'main';
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
      {seq: '<', desc: 'Go to first post or comment', func: this._firstPostOrComment},
      {seq: '>', desc: 'Go to last post or comment currently loaded', func: this._lastPostOrComment},
      {seq: 'f', desc: 'Change browser focus to current post or comment', func: this._focusBrowser},
      {seq: 'v p', desc: 'View the post directly', func: this._viewPost},
      {seq: 'v r', desc: 'View reactions on current post or comment', func: this._viewReactions},
      {seq: 'P', desc: 'Go to the share box to start a post or <kbd>TAB</kbd> to the other creator options', func: this._gotoShare},
      {seq: '=', desc: 'Open the (⋯) menu', func: this._openMeatballMenu},
    ];

    _currentPostId = null;
    _postScroller = null;
    _commentScroller = null;

    constructor() {
      super();
      this._postScroller = new Scroller(document.body, ['main div[data-id]'], this._uniqueIdentifier, ['tom'], true, {enabled: true, stackTrace: true});
      this._postScroller.dispatcher.on('out-of-range', focusOnSidebar);
    }

    _onClick(evt) {
      const post = evt.target.closest('div[data-id]');
      if (post) {
        this._post = post;
      }
    }

    get _post() {
      return this._getPosts().find(this._matchPost.bind(this));
    }

    set _post(val) {
      if (val === this._post && this._hasActiveComment) {
        return;
      }
      if (this._post) {
        this._post.classList.remove('tom');
      }
      this._currentPostId = this._uniqueIdentifier(val);
      this._comments = null;
      if (val) {
        val.classList.add('tom');
        this._scrollToCurrentPost();
      }
    }

    get _comments() {
      if (!this._commentScroller && this._post) {
        this._commentScroller = new Scroller(this._post, ['article.comments-comment-item'], this._uniqueIdentifier, ['dick'], false);
        this._commentScroller.dispatcher.on('out-of-range', this._returnToPost.bind(this));
      }
      return this._commentScroller;
    }

    set _comments(val) {
      if (this._commentScroller) {
        this._commentScroller.destroy();
        this._commentScroller = null;
      }
    }

    get _hasActiveComment() {
      return this._comments && this._comments.item;
    }

    _getPosts() {
      return Array.from(document.querySelectorAll('main div[data-id]'));
    }

    _uniqueIdentifier(element) {
      if (element) {
        return element.dataset.id;
      } else {
        return null;
      }
    }

    _matchPost(el) {
      return this._currentPostId === this._uniqueIdentifier(el);
    }

    _scrollToCurrentPost() {
      if (this._post) {
        this._post.style.scrollMarginTop = navBarHeightCss;
        this._post.scrollIntoView();
      }
    }

    _scrollBy(n) {
      const posts = this._getPosts();
      if (posts.length) {
        let post = null;
        let idx = posts.findIndex(this._matchPost.bind(this)) + n;
        if (idx < -1) {
          idx = posts.length - 1;
        }
        if (idx === -1 || idx >= posts.length) {
          focusOnSidebar();
        } else {
          // Some posts are hidden (ads, suggestions).  Skip over thoses.
          post = posts[idx];
          while (!post.clientHeight) {
            idx += n;
            post = posts[idx];
          }
        }
        this._post = post;
      }
    }

    _returnToPost() {
      this._post = this._post;
    }

    _nextPost() {
      this._scrollBy(1);
    }

    _nextPostPlus() {
      function f() {
        this._togglePost();
        this._nextPost();
      }
      // XXX Need to remove the highlight before otrot sees it because
      // it affects the .clientHeight.
      this._post.classList.remove('tom');
      otrot(this._post, f.bind(this), 3000).then(() => {
        this._scrollToCurrentPost();
      }).catch(e => console.error(e));  // eslint-disable-line no-console
    }

    _prevPost() {
      this._scrollBy(-1);
    }

    _prevPostPlus() {
      this._togglePost();
      this._prevPost();
    }

    _nextComment() {
      this._comments.next();
    }

    _prevComment() {
      this._comments.prev();
    }

    _togglePost() {
      clickElement(this._post, ['button[aria-label^="Dismiss post"]', 'button[aria-label^="Undo and show"]']);
    }

    _showComments() {
      function tryComment(comment) {
        if (comment) {
          const buttons = Array.from(comment.querySelectorAll('button'));
          const button = buttons.find(el => el.textContent.includes('Load previous replies'));
          if (button) {
            button.click();
            return true;
          }
        }
        return false;
      }

      if (!tryComment(this._comments.item)) {
        clickElement(this._post, ['button[aria-label*="comment"]']);
      }
    }

    _seeMore() {
      const el = this._comments.item ?? this._post;
      clickElement(el, ['button[aria-label^="see more"]']);
    }

    _likePostOrComment() {
      const el = this._comments.item ?? this._post;
      clickElement(el, ['button[aria-label^="Open reactions menu"]']);
    }

    _jumpToPost(first) {
      const posts = this._getPosts();
      if (posts.length) {
        let idx = first ? 0 : (posts.length - 1);
        let post = posts[idx];
        // Post content can be loaded lazily and can be detected by
        // having no innerText yet.  So go to the last one that is
        // loaded.  By the time we scroll to it, the next posts may
        // have content, but it will close.
        if (!first) {
          while (!post.innerText.length) {
            idx--;
            post = posts[idx];
          }
        }
        this._post = post;
      }
    }

    _firstPostOrComment() {
      if (this._hasActiveComment) {
        this._comments.first();
      } else {
        this._jumpToPost(true);
      }
    }

    _lastPostOrComment() {
      if (this._hasActiveComment) {
        this._comments.last();
      } else {
        this._jumpToPost(false);
      }
    }

    _loadMorePosts() {
      const container = document.querySelector('div.scaffold-finite-scroll__content');
      function f() {
        const posts = this._getPosts();
        if (clickElement(posts[0], ['div.feed-new-update-pill button'])) {
          this._post = posts[0];
        } else {
          clickElement(document, ['main button.scaffold-finite-scroll__load-button']);
        }
      }
      otrot(container, f.bind(this), 3000).then(() => {
        this._scrollToCurrentPost();
      });
    }

    _gotoShare() {
      const share = document.querySelector('div.share-box-feed-entry__top-bar').parentElement;
      share.style.scrollMarginTop = navBarHeightCss;
      share.scrollIntoView();
      share.querySelector('button').focus();
    }

    _openMeatballMenu() {
      // XXX In this case, the identifier is on an svg element, not
      // the button, so use the parentElement.  When Firefox [fully
      // supports](https://bugzilla.mozilla.org/show_bug.cgi?id=418039)
      // the `:has()` pseudo-selector, we can probably use that and
      // use `clickElement()`.
      if (this._comments.item) {
        const button = this._comments.item.querySelector('[aria-label^="Open options"]').parentElement;
        button.click();
      } else if (this._post) {
        const button = this._post.querySelector('[a11y-text^="Open control menu"]').parentElement;
        button.click();
      }
    }

    _focusBrowser() {
      const el = this._comments.item ?? this._post;
      focusOnElement(el);
    }

    _viewPost() {
      if (this._post) {
        const urn = this._post.dataset.id;
        const id = `lt-${urn.replaceAll(':', '-')}`;
        let a = this._post.querySelector(`#${id}`);
        if (!a) {
          a = document.createElement('a');
          a.href = `/feed/update/${urn}/`;
          a.id = id;
          this._post.append(a);
        }
        a.click();
      }
    }

    _viewReactions() {
      // Bah!  The queries are annoyingly different.
      if (this._comments.item) {
        clickElement(this._comments.item, ['button.comments-comment-social-bar__reactions-count']);
      } else if (this._post) {
        clickElement(this._post, ['button.social-details-social-counts__count-value']);
      }
    }

  }

  class Jobs extends Page {
    _pathname = '/jobs/';
    _auto_keys = [
      {seq: 'j', desc: 'Next section', func: this._nextSection},
      {seq: 'k', desc: 'Previous section', func: this._prevSection},
      {seq: '<', desc: 'Go to to first section', func: this._firstSection},
      {seq: '>', desc: 'Go to last section currently loaded', func: this._lastSection},
      {seq: 'f', desc: 'Change browser focus to current section', func: this._focusBrowser},
      {seq: 'l', desc: 'Load more sections', func: this._loadMoreSections},
    ];

    _currentSectionId = null;

    get _section() {
      return this._getSections().find(this._match.bind(this));
    }

    set _section(val) {
      if (this._section) {
        this._section.classList.remove('tom');
      }
      this._currentSectionId = this._uniqueIdentifier(val);
      if (val) {
        val.classList.add('tom');
        this._scrollToCurrentSection();
      }
    }

    _getSections() {
      return Array.from(document.querySelectorAll('main section'));
    }

    _uniqueIdentifier(element) {
      if (element) {
        const h2 = element.querySelector('h2');
        if (h2) {
          return h2.innerText;
        } else {
          return element.innerText;
        }
      } else {
        return null;
      }
    }

    _match(el) {
      return this._currentSectionId === this._uniqueIdentifier(el);
    }

    _scrollToCurrentSection() {
      if (this._section) {
        this._section.style.scrollMarginTop = navBarHeightCss;
        this._section.scrollIntoView();
      }
    }

    _scrollBy(n) {
      const sections = this._getSections();
      if (sections.length) {
        let idx = sections.findIndex(this._match.bind(this)) + n;
        if (idx < -1) {
          idx = sections.length - 1;
        }
        if (idx === -1 || idx >= sections.length) {
          focusOnSidebar();
          this._section = null;
        } else {
          this._section = sections[idx];
        }
      }
    }

    _nextSection() {
      this._scrollBy(1);
    }

    _prevSection() {
      this._scrollBy(-1);
    }

    _jumpToSection(first) {
      const sections = this._getSections();
      if (sections.length) {
        const idx = first ? 0 : (sections.length - 1);
        this._section = sections[idx];
      }
    }

    _firstSection() {
      this._jumpToSection(true);
    }

    _lastSection() {
      this._jumpToSection(false);
    }

    _focusBrowser() {
      focusOnElement(this._section);
    }

    _loadMoreSections() {
      const container = document.querySelector('div.scaffold-finite-scroll__content');
      function f() {
        clickElement(document, ['main button.scaffold-finite-scroll__load-button']);
      }
      otrot(container, f.bind(this), 3000).then(() => {
        // This forces a scrolling and highlighting because the
        // elements were remade.
        this._section = this._section;
      });
    }
  }

  class JobsCollections extends Page {
    _pathname = '/jobs/collections/';
  }

  class Notifications extends Page {
    _pathname = '/notifications/';
    _on_click_selector = 'main';
    _auto_keys = [
      {seq: 'j', desc: 'Next notification', func: this._nextNotification},
      {seq: 'k', desc: 'Previous notification', func: this._prevNotification},
      {seq: 'Enter', desc: 'Activate the notification (click on it)', func: this._activateNotification},
      {seq: 'X', desc: 'Toggle current notification deletion', func: this._deleteNotification},
      {seq: 'l', desc: 'Load more notifications', func: this._loadMoreNotifications},
      {seq: 'f', desc: 'Change browser focus to current notification', func: this._focusBrowser},
      {seq: '<', desc: 'Go to first notification', func: this._firstNotification},
      {seq: '>', desc: 'Go to last notification', func: this._lastNotification},
      {seq: '=', desc: 'Open the (⋯) menu', func: this._openMeatballMenu},
    ];

    // Ugh.  When notification cards are deleted or restored, the
    // entire element, and parent elements, are deleted and replaced
    // by new elements.  And the deleted versions have nothing in
    // common with the original ones.  Since we can't detect when a
    // card is deleted, we need to track where it was so maybe we can
    // refind it again later.
    _currentNotificationId = null;
    _historicalNotificationIdToIndex = new Map();

    _onClick(evt) {
      const notification = evt.target.closest('div.nt-card-list article');
      if (notification) {
        this._notification = notification;
      }
    }

    get _notification() {
      const notifications = this._getNotifications();
      let notification = notifications.find(this._match.bind(this));
      if (!notification) {
        // Couldn't find the old id.  Maybe the card was modified, so
        // try the old index.
        const idx = this._historicalNotificationIdToIndex.get(this._currentNotificationId);
        if (typeof idx === 'number' && 0 <= idx && idx < notifications.length) {
          notification = notifications[idx];
          this._setBottomHalf(notification);
        }
      }
      return notification;
    }

    set _notification(val) {
      if (this._notification) {
        this._notification.classList.remove('tom');
      }
      this._setBottomHalf(val);
    }

    _setBottomHalf(val) {
      this._currentNotificationId = this._uniqueIdentifier(val);
      const idx = this._getNotifications().indexOf(val);
      this._historicalNotificationIdToIndex.set(this._currentNotificationId, idx);
      if (val) {
        val.classList.add('tom');
        this._scrollToCurrentNotification();
      }
    }

    _getNotifications() {
      return Array.from(document.querySelectorAll('main section div.nt-card-list article'));
    }

    // Complicated because there are so many variations in
    // notification cards.  We do not want to use reaction counts
    // because they can change too quickly.
    _uniqueIdentifier(element) {
      if (element) {
        if (!element.dataset.litId) {
          let content = element.innerText;
          if (element.childElementCount === 3) {
            let content = element.children[1].innerText;
            if (content.includes('Reactions')) {
              for (const el of element.children[1].querySelectorAll('*')) {
                if (el.innerText) {
                  content = el.innerText;
                  break;
                }
              }
            }
          }
          if (content.startsWith('Notification deleted.')) {
            // Mix in something unique from the parent.
            content += element.parentElement.dataset.finiteScrollHotkeyItem;
          }
          element.dataset.litId = strHash(content);
        }
        return element.dataset.litId;
      } else {
        return null;
      }
    }

    _match(el) {
      return this._currentNotificationId === this._uniqueIdentifier(el);
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
      // XXX This standalone line invokes the magic code in the
      // getter.  Necessary when scrolling is the first thing after
      // deleting a card.
      this._notification;
      const notifications = this._getNotifications();
      if (notifications.length) {
        let idx = notifications.findIndex(this._match.bind(this)) + n;
        if (idx < -1) {
          idx = notifications.length - 1;
        }
        if (idx === -1 || idx >= notifications.length) {
          focusOnSidebar();
          this._notification = null;
        } else {
          this._notification = notifications[idx];
        }
      }
    }

    _nextNotification() {
      this._scrollBy(1);
    }

    _prevNotification() {
      this._scrollBy(-1);
    }

    _jumpToNotification(first) {
      const notifications = this._getNotifications();
      if (notifications.length) {
        const idx = first ? 0 : (notifications.length - 1);
        this._notification = notifications[idx];
      }
    }

    _focusBrowser() {
      focusOnElement(this._notification);
    }

    _firstNotification() {
      this._jumpToNotification(true);
    }

    _lastNotification() {
      this._jumpToNotification(false);
    }

    _openMeatballMenu() {
      clickElement(this._notification, ['button[aria-label^="Settings menu"]']);
    }

    _activateNotification() {
      if (this._notification) {
        // Because we are using Enter as the hotkey here, if the
        // active element is inside the current card, we want that to
        // take precedence.
        if (document.activeElement.closest('article') === this._notification) {
          return;
        }
        // Every notification is different.
        // It may be that notifications are settling on 'a.nt-card__headline'.
        function matchesKnownText(el) { // eslint-disable-line no-inner-declarations
          if (el.innerText === 'Apply early') return true;
          return false;
        }

        // Debugging code.
        if (this._notification.querySelectorAll('a.nt-card__headline').length === 1 && this._notification.querySelector('button.message-anywhere-button')) {
          console.debug(this._notification);  // eslint-disable-line no-console
          alert('Yes, can be simplified');
        }

        if (!clickElement(this._notification, ['button.message-anywhere-button'])) {
          const buttons = Array.from(this._notification.querySelectorAll('button'));
          const button = buttons.find(matchesKnownText);
          if (button) {
            button.click();
          } else {
            const links = this._notification.querySelectorAll('a.nt-card__headline');
            if (links.length === 1) {
              links[0].click();
            } else {
              console.debug(this._notification);  // eslint-disable-line no-console
              for (const el of this._notification.querySelectorAll('*')) {
                console.debug(el);  // eslint-disable-line no-console
              }
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
      } else {
        // Again, because we use Enter as the hotkey for this action.
        document.activeElement.click();
      }
    }

    _deleteNotification() {
      if (this._notification) {
        // Hah.  Unlike in other places, these buttons already exist,
        // just hidden under the menu.
        const buttons = Array.from(this._notification.querySelectorAll('button'));
        const button = buttons.find(el => el.textContent.includes('Delete this notification'));
        if (button) {
          button.click();
        } else {
          clickElement(this._notification, ['button[aria-label^="Undo notification deletion"]']);
        }
      }
    }

    _loadMoreNotifications() {
      const buttons = Array.from(document.querySelectorAll('main section button'));
      const button = buttons.find(el => el.textContent.includes('Show more results'));
      if (button) {
        button.click();
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
      const candidate = candidates.reduce((a, b) => (a.length > b.length ? a : b), '');
      return this._pages.get(candidate) || null;
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


  function navBarMonitor() {
    const navbar = document.querySelector('#global-nav');
    if (navbar) {
      return {done: true, results: navbar};
    }
    return {done: false, results: null};
  }

  // In this case, the trigger was the page load.  It already happened
  // by the time we got here.
  otmot(document.body, {childList: true, subtree: true}, navBarMonitor,
        null, 0)
    .then((el) => {
      navBarHeightPixels = el.clientHeight + 4;
      navBarHeightCss = `${navBarHeightPixels}px`;
    });

  let oldUrl = new URL(window.location);
  function registerUrlMonitor(element) {
    const observer = new MutationObserver(() => {
      const newUrl = new URL(window.location);
      if (oldUrl.href !== newUrl.href) {
        const evt = new CustomEvent('href', {detail: {url: newUrl}})
        oldUrl = newUrl;
        document.dispatchEvent(evt);
      }
    });
    observer.observe(element, {childList: true, subtree: true});
  }

  function authenticationOutletMonitor() {
    const div = document.body.querySelector('div.authentication-outlet');
    if (div) {
      return {done: true, results: div};
    }
    return {done: false, results: null};
  }

  otmot(document.body, {childList: true, subtree: true}, authenticationOutletMonitor, null, 0)
    .then((el) => registerUrlMonitor(el));

  console.debug('Initialization successful.');  // eslint-disable-line no-console

})();
