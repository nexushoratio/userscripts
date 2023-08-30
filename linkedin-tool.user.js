// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @noframes
// @version     2.15.1
// @author      Mike Castle
// @description Minor enhancements to LinkedIn. Mostly just hotkeys.
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// @downloadURL https://github.com/nexushoratio/userscripts/raw/main/linkedin-tool.user.js
// @supportURL  https://github.com/nexushoratio/userscripts/blob/main/linkedin-tool.md
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @grant       window.onurlchange
// ==/UserScript==

/* global GM, VM */

// eslint-disable-next-line max-lines-per-function
(() => {
  'use strict';

  const NOT_FOUND = -1;

  let navBarHeightPixels = 0;
  let navBarHeightCss = '0';
  // I'm lazy.  The version of emacs I'm using does not support
  // #private variables out of the box, so using underscores until I
  // get a working configuration.

  /**
   * Fancy-ish debug messages.
   * Console message groups can be started and ended using magic
   * keywords in messages.
   * - 'Entered' - Starts new group named with the rest of the string.
   * - 'Starting' - Starts a new collapsed group (useful for loops).
   * - 'Leaving' and 'Finished' - Both end the most recent group,
   *    with Leaving for the function, and Finished for the loop
   *    (though not enforced).
   * @example
   * foo(x) {
   *  log.log('Entered foo', x);
   *  ... do stuff ...
   *  log.log('Starting loop');
   *  for (const item in items) {
   *    log.log(`Processing ${item}`);
   *    ...
   *  }
   *  log.log('Finished loop');
   *  log.log('Leaving foo with', y);
   *  return y;
   * }
   */
  class Logger {

    /**
     * @param {string} name - Name for this logger.
     * @param {boolean} enabled - Initial enabled state of the logger.
     * @param {boolean} trace - Initial state of including stack traces.
     */
    constructor(name, enabled = false, trace = false) {
      this._name = name;
      this._enabled = enabled;
      this.trace = trace;
    }

    /**
     * @returns {string} - Name for this logger.
     */
    get name() {
      return this._name;
    }

    /**
     * Whether logging is currently enabled.
     * @type {boolean}
     */
    get enabled() {
      return this._enabled;
    }

    /**
     * Indicates whether messages include a stack trace.
     * @type {boolean}
     */
    get trace() {
      return this._trace;
    }

    /**
     * @param {boolean} val - Set inclusion of stack traces.
     */
    set trace(val) {
      this._trace = Boolean(val);
    }

    /**
     * Enable this logger.
     */
    enable() {
      this._enabled = true;
    }

    /**
     * Disable this logger.
     */
    disable() {
      this._enabled = false;
    }

    /**
     * Log a specific message.
     * @param {string} msg - Debug message to send to console.debug.
     * @param {*} ...rest - Arbitrary arguments to also pass to console.debug.
     */
    log(msg, ...rest) {
      /* eslint-disable no-console */
      if (this.enabled) {
        if (this.trace) {
          console.groupCollapsed(`${this.name} call stack`);
          console.trace();
          console.groupEnd();
        }
        if (typeof msg === 'string' && msg.startsWith('Entered')) {
          console.group(`${this.name}: ${msg.substr(msg.indexOf(' ') + 1)}`);
        } else if (typeof msg === 'string' && msg.startsWith('Starting')) {
          console.groupCollapsed(`${this.name}: ${msg.substr(msg.indexOf(' ') + 1)} (collapsed)`);
        }
        console.debug(`${this.name}: ${msg}`, ...rest);
        if (typeof msg === 'string' && (/^(Leaving|Finished)/).test(msg)) {
          console.groupEnd();
        }
      }
      /* eslint-enable */
    }

  }

  const log = new Logger('Default', true, false);

  /**
   * Java's hashCode:  s[0]*31(n-1) + s[1]*31(n-2) + ... + s[n-1]
   * @param {string} s - String to hash.
   * @returns {string} - Hash value.
   */
  function strHash(s) {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      // eslint-disable-next-line no-magic-numbers
      hash = (hash * 31) + s.charCodeAt(i) | 0;
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
   */
  function focusOnElement(element) {
    if (element) {
      const magicTabIndex = -1;
      const tabIndex = element.getAttribute('tabindex');
      element.setAttribute('tabindex', magicTabIndex);
      element.focus();
      if (tabIndex) {
        element.setAttribute('tabindex', tabIndex);
      } else {
        element.removeAttribute('tabindex');
      }
    }
  }

  /**
   * Scroll LinkedIn's common sidebar into view and moves focus to it.
   */
  function focusOnSidebar() {
    const sidebar = document.querySelector('div.scaffold-layout__sidebar');
    if (sidebar) {
      sidebar.style.scrollMarginTop = navBarHeightCss;
      sidebar.scrollIntoView();
      focusOnElement(sidebar);
    }
  }

  /**
   * Scroll LinkedIn's common aside (right-hand sidebar) into view.
   */
  function focusOnAside() {
    const aside = document.querySelector('aside.scaffold-layout__aside');
    if (aside) {
      aside.style.scrollMarginTop = navBarHeightCss;
      aside.scrollIntoView();
      focusOnElement(aside);
    }
  }

  /**
   * Simple function that takes no parameters and returns nothing.
   * @callback SimpleFunction
   */

  /**
   * @typedef {object} OtrotWhat
   * @property {string} name - The name for this observer.
   * @property {Element} base - Element to observe.
   */

  /**
   * @typedef {object} OtrotHow
   * @property {SimpleFunction} [trigger] - Function to call that
   * triggers observable events.
   * @property {number} timeout - Time to wait for completion in
   * milliseconds.
   */

  /**
   * One time resize observer with timeout.  Will resolve
   * automatically upon first resize change.
   * @param {OtrotWhat} what - What to observe.
   * @param {OtrotHow} how - How to observe.
   * @returns {Promise<OtrotWhat>} - Will resolve with the what parameter.
   */
  function otrot(what, how) {
    const prom = new Promise((resolve, reject) => {
      const {
        name,
        base,
      } = what;
      const {
        trigger = () => {},  // eslint-disable-line no-empty-function
        timeout,
      } = how;
      let timeoutID = null;
      const initialHeight = base.clientHeight;
      const initialWidth = base.clientWidth;
      const observer = new ResizeObserver(() => {
        if (base.clientHeight !== initialHeight || base.clientWidth !== initialWidth) {
          observer.disconnect();
          clearTimeout(timeoutID);
          resolve(what);
        }
      });
      timeoutID = setTimeout(() => {
        observer.disconnect();
        reject(`otrot ${name} timed out`);
      }, timeout);
      observer.observe(base);
      trigger();
    });
    return prom;
  }

  /**
   * @typedef {object} Otrot2How
   * @property {SimpleFunction} [trigger] - Function to call that
   * triggers observable events.
   * @property {SimpleFunction} action - Function to call upon each
   * event observed and also at the end of duration.
   * @property {number} duration - Time to run in milliseconds.
   */

  /**
   * One time resize observer with action callback and duration.
   * Will resolve upon duration expiration.
   * Uses the same what parameter as {@link otrot}.
   * @param {OtrotWhat} what - What to observe.
   * @param {Otrow2How} how - How to observe.
   * @returns {Promise} - Will resolve after duration expires.
   */
  function otrot2(what, how) {
    const prom = new Promise((resolve) => {
      const {
        name,
        base,
      } = what;
      const {
        trigger = () => {},  // eslint-disable-line no-empty-function
        action,
        duration,
      } = how;
      const observer = new ResizeObserver(() => {
        action();
      });
      setTimeout(() => {
        observer.disconnect();
        action();
        resolve(`otrot2 ${name} finished`);
      }, duration);
      observer.observe(base);
      trigger();
    });
    return prom;
  }

  /**
   * @typedef {object} Continuation
   * @property {boolean} done - Indicate whether the monitor is done processing.
   * @property {object} [results] - Optional results object.
   */

  /**
   * @callback Monitor
   * @param {MutationRecord[]} records - Standard mutation records.
   * @returns {Continuation} - Indicate whether done monitoring.
   */

  /**
   * @typedef {object} OtmotWhat
   * @property {string} name - The name for this observer.
   * @property {Element} base - Element to observe.
   */

  /**
   * @typedef {object} OtmotHow
   * @property {object} observeOptions - MutationObserver().observe()
   * options.
   * @property {SimpleFunction} [trigger] - Function to call that
   * triggers observable results.
   * @property {Monitor} monitor - Callback used to process
   * MutationObserver records.
   * @property {number} [timeout] - Time to wait for completion in
   * milliseconds, default of 0 disables.
   * @property {boolen} [debug] - Enable debugging.
   */

  /**
   * One time mutation observer with timeout.
   * @param {OtmotWhat} what - What to observe.
   * @param {OtmotHow} how - How to observe.
   * @returns {Promise<Continuation.results>} - Will resolve with the
   * results from monitor when done is true.
   */
  function otmot(what, how) {
    const prom = new Promise((resolve, reject) => {
      const {
        name,
        base,
      } = what;
      const {
        observeOptions,
        trigger = () => {},  // eslint-disable-line no-empty-function
        monitor,
        timeout = 0,
        debug = false,
      } = how;
      const log = new Logger(`otmot ${name}`, debug, false);
      let timeoutID = null;
      const observer = new MutationObserver((records) => {
        const {done, results} = monitor(records);
        log.log('monitor:', done, results);
        if (done) {
          observer.disconnect();
          clearTimeout(timeoutID);
          log.log('resolving with', results);
          resolve(results);
          log.log('resolved');
        }
      });
      if (timeout) {
        timeoutID = setTimeout(() => {
          observer.disconnect();
          log.log('rejecting after timeout');
          reject(`otmot ${name} timed out`);
        }, timeout);
      }
      observer.observe(base, observeOptions);
      log.log('Calling trigger');
      trigger();
      log.log('Trigger called');
    });
    return prom;
  }

  /**
   * Simple dispatcher.  It takes a fixed list of event types upon
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
     */
    on(eventType, func) {
      const handlers = this._getHandlers(eventType);
      handlers.push(func);
    }

    /**
     * Remove all instances of a function registered to an eventType.
     * @param {string} eventType - Event type to disconnect from.
     * @param {function} func - Function to remove.
     */
    off(eventType, func) {
      const handlers = this._getHandlers(eventType)
      let index = 0;
      while ((index = handlers.indexOf(func)) !== NOT_FOUND) {
        handlers.splice(index, 1);
      }
    }

    /**
     * Calls all registered functions for the given eventType.
     * @param {string} eventType - Event type to use.
     * @param {object} data - Data to pass to each function.
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
     * Function that generates a, preferably, reproducible unique
     * identifier for an Element.
     * @callback uidCallback
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */

    /**
     * @typedef {object} What
     * @property {string} name - Name for this scroller, simply used
     * for debugging.
     * @property {Element} base - The container to use as a base for
     * selecting elements.
     * @property {string[]} selectors - Array of CSS selectors to find
     * elements to collect, calling base.querySelectorAll().
     */

    /**
     * @typedef {object} How
     * @property {uidCallback} uidCallback - Callback to generate a
     * uid.
     * @property {string[]} classes - Array of CSS classes to
     * add/remove from an element as it becomes current.
     * @property {boolean} snapToTop - Whether items should snap to
     * the top of the window when coming into view.
     * @property {boolean} [debug=false] - Enable debug messages.
     * @property {boolean} [stackTrace=false] - Include stack traces
     * in debug messages.
     */

    /**
     * @param {What} what - What we want to scroll.
     * @param {How} how - How we want to scroll.
     * @throws {TypeError} - When base is not an Element.
     */
    constructor(what, how) {
      this._destroyed = false;
      ({
        name: this._name = 'Unamed scroller',
        base: this._base,
        selectors: this._selectors,
      } = what);
      if (!(this._base instanceof Element)) {
        throw new TypeError(`Invalid base ${this._base} given for ${this._name}`);
      }
      ({
        uidCallback: this._uidCallback,
        classes: this._classes,
        snapToTop: this._snapToTop,
        debug: this._debug = false,
        stackTrace: this._stackTrace = false,
      } = how);

      this._logger = new Logger(this._name, this._debug, this._stackTrace);
      this._msg('Scroller constructed', this);
    }

    /**
      * @param {string} msg - Debug message to send to the logger.
      * @param {*} ...rest - Arbitrary arguments to also pass to the
      * logger.
      */
    _msg(msg, ...rest) {
      this._logger.log(msg, ...rest);
    }

    /** @type {Dispatcher} */
    get dispatcher() {
      return this._dispatcher;
    }

    /**
     * Represents the current item.
     * @type {Element}
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

    /**
     * @param {Element} val - Update the current item with val.
     */
    set item(val) {
      this._msg('Entered set item with', val);
      this.dull();
      this._bottomHalf(val);
      this._msg('Leaving set item');
    }

    /**
     * Since the getter will try to validate the current item (since
     * it could have changed out from under us), it too can update
     * information.
     * @param {Element} val - Element to make current.
     */
    _bottomHalf(val) {
      this._msg('Entered bottomHalf with', val);
      this._currentItemId = this._uid(val);
      const idx = this._getItems().indexOf(val);
      this._historicalIdToIndex.set(this._currentItemId, idx);
      this.shine();
      this._scrollToCurrentItem();
      this.dispatcher.fire('change', {});
      this._msg('Leaving bottomHalf');
    }

    /**
     * Determines if the item can be viewed.  Usually this means the
     * content is being loaded lazily and is not ready yet.
     * @param {Element} item - The item to inspect.
     * @returns {boolean} - Whether the item has viewable content.
     */
    static _isItemViewable(item) {
      return item.clientHeight && item.innerText.length;
    }

    /**
     * Builds the list of elements using the registered CSS selectors.
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
        if (!element.dataset.spaId) {
          element.dataset.spaId = this._uidCallback(element);
        }
        uid = element.dataset.spaId;
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
     */
    _scrollToCurrentItem() {
      this._msg('Entered scrollToCurrentItem with', this._snapToTop);
      const item = this.item;
      if (item) {
        item.style.scrollMarginTop = navBarHeightCss;
        if (this._snapToTop) {
          this._msg('snapping to top');
          item.scrollIntoView(true);
        } else {
          item.style.scrollMarginBottom = '3em';
          const rect = item.getBoundingClientRect();
          // If both scrolling happens, it means the item is too tall to
          // fit on the page, so the top is preferred.
          if (rect.bottom > document.documentElement.clientHeight) {
            this._msg('scrolling up onto page');
            item.scrollIntoView(false);
          }
          if (rect.top < navBarHeightPixels) {
            this._msg('scrolling down onto page');
            item.scrollIntoView(true);
          }
        }
      }
      this._msg('Leaving scrollToCurrentItem');
    }

    /**
     * Jump an item on the end of the collection.
     * @param {boolean} first - If true, the first item in the
     * collection, else, the last.
     */
    _jumpToEndItem(first) {
      this._msg(`Entered _jumpToEndItem with first=${first}`);
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
          while (!Scroller._isItemViewable(item)) {
            this._msg('skipping item', item);
            idx--;
            item = items[idx];
          }
        }
        this.item = item;
      }
      this._msg('Leaving _jumpToEndItem');
    }

    /**
     * Move forward or backwards in the collection by at least n.
     * @param {number} n - How many items to move and the intended direction.
     * @fires 'out-of-range'
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
        if (idx < NOT_FOUND) {
          idx = items.length - 1;
        }
        if (idx === NOT_FOUND || idx >= items.length) {
          this.item = null;
          this.dispatcher.fire('out-of-range', null);
        } else {
          // Skip over empty items
          let item = items[idx];
          while (!Scroller._isItemViewable(item)) {
            this._msg('skipping item', item);
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
     */
    next() {
      this._scrollBy(1);
    }

    /**
     * Move to the previous item in the collection.
     */
    prev() {
      this._scrollBy(-1);
    }

    /**
     * Jump to the first item in the collection.
     */
    first() {
      this._jumpToEndItem(true);
    }

    /**
     * Jump to last item in the collection.
     */
    last() {
      this._jumpToEndItem(false);
    }

    /**
     * Adds the registered CSS classes to the current element.
     */
    shine() {
      this.item?.classList.add(...this._classes);
    }

    /**
     * Removes the registered CSS classes from the current element.
     */
    dull() {
      this.item?.classList.remove(...this._classes);
    }

    /**
     * Bring current item back into view.
     */
    show() {
      this._scrollToCurrentItem();
    }

    /**
     * Mark instance as inactive and do any internal cleanup.
     */
    destroy() {
      this._msg('Entered destroy');
      this.item = null;
      this._destroyed = true;
      this._msg('Leaving destroy');
    }
  }

  /**
   * Base class for handling various views of a single-page
   * application.
   *
   * Generally, new classes should subclass this, override a few
   * properties and methods, and then register themselves with an
   * instance of the {@link SPA} class.
   */
  class Page {
    // The immediate following can be set in subclasses.

    /**
     * What pathname part of the URL this page should handle.  The
     * special case of null is used by the {@link SPA} class to
     * represent global keys.
     * @type {string}
     */
    _pathname;

    /**
     * CSS selector for capturing clicks on this page.  If overridden,
     * then the class should also provide a _onClick() method.
     * @type {string}
     */
    _onClickSelector = null;


    /**
     * Definition for keyboard shortcuts.
     * @typedef {object} Shortcut
     * @property {string} seq - Key sequence to activate.
     * @property {string} desc - Description that goes into the online help.
     * @property {SimpleFunction} func - Function to call, usually in the
     * form of `this.methodName`.
     */

    /**
     * List of {@link Shortcut}s to register automatically.  The
     * function is bound to `this` before registering it with
     * VM.shortcut.
     * @type {Shortcut[]}
     */
    _autoRegisteredKeys = [];

    // Private members.

    /**
     * @type {KeyboardService}
     */
    _keyboard = new VM.shortcut.KeyboardService();

    /**
     * Tracks which HTMLElement holds the `onclick` function.
     * @type {Element}
     */
    _onClickElement = null;

    /**
     * Magic for VM.shortcut.  This disables keys when focus is on an
     * input type field or when viewing the help.
     * @type {IShortcutOptions}
     */
    static _navOption = {
      caseSensitive: true,
      condition: '!inputFocus && !inDialog',
    };

    /** Create a Page. */
    constructor() {
      this._boundOnClick = this._onClick.bind(this);
    }

    /**
     * Called when registered via {@link SPA}.
     * @param {SPA} spa - SPA instance that manages this Page.
     */
    start(spa) {
      this._spa = spa;
      this._log = new Logger(this.constructor.name, false, false);
      for (const {seq, func} of this._autoRegisteredKeys) {
        this._addKey(seq, func.bind(this));
      }
    }

    /** @type {string} */
    get pathname() {
      return this._pathname;
    }

    /** @type {KeyboardService} */
    get keyboard() {
      return this._keyboard;
    }

    /**
     * Turns on this Page's features.  Called by {@link SPA} when
     * this becomes the current view.
     */
    activate() {
      this._keyboard.enable();
      this._enableOnClick();
    }

    /**
     * Turns off this Page's features.  Called by {@link SPA} when
     * this is no longer the current view.
     */
    deactivate() {
      this._keyboard.disable();
      this._disableOnClick();
    }

    /**
     * Describes what the header should be.
     * @type {string}
     */
    get helpHeader() {
      return this.constructor.name;
    }

    /**
     * The `key` and `desc` properties are important here.
     * @type {Shortcut[]}
     */
    get helpContent() {
      return this._autoRegisteredKeys;
    }

    /**
     * Registers a specific key sequence with a function with VM.shortcut.
     * @param {string} seq - Key sequence.
     * @param {SimpleFunction} func - Function to call.
     */
    _addKey(seq, func) {
      this._keyboard.register(seq, func, Page._navOption);
    }

    /**
     * Enables the 'click' handler for this view.
     */
    _enableOnClick() {
      if (this._onClickSelector) {
        // Page is dynamically building, so keep watching it until the
        // element shows up.
        VM.observe(document.body, () => {
          const element = document.querySelector(this._onClickSelector);
          if (element) {
            this._onClickElement = element;
            this._onClickElement.addEventListener('click', this._boundOnClick);
            // TODO(#46): Find a better place for this.
            this._refresh();
            // Turns off VM.observe once selector found.
            return true;
          }
          return false;
        });
      }
    }

    /**
     * Disables the 'click' handler for this view.
     */
    _disableOnClick() {
      this._onClickElement?.removeEventListener('click', this._boundOnClick);
      this._onClickElement = null;
    }

    /**
     * Override this function in subclasses that want to react to
     * random clicks on a page, say to update current element in
     * focus.
     * https://github.com/eslint/eslint/issues/17467
     * @abstract
     * @param {Event} evt - Standard 'click' event.
     */
    _onClick(evt) {  // eslint-disable-line no-unused-vars
      const msg = `Found a bug! ${this.constructor.name} wants to handle clicks, but forgot to create a handler.`;
      this._spa.addError(msg);
      this._spa.addErrorMarker();
    }

    /**
     * Override this function in subclasses to take action upon
     * becoming the current view again.
     */
    _refresh() {
      this;
    }

  }

  /**
   * Class for handling aspects common across LinkedIn.
   * This includs things like the global nav bar, help screen, etc.
   */
  class Global extends Page {
    _pathname = null;
    _autoRegisteredKeys = [
      {seq: '?', desc: 'Show this help screen', func: Global._help},
      {seq: '/', desc: 'Go to Search box', func: Global._gotoSearch},
      {seq: 'g h', desc: 'Go Home (aka, Feed)', func: Global._goHome},
      {seq: 'g m', desc: 'Go to My Network', func: Global._gotoMyNetwork},
      {seq: 'g j', desc: 'Go to Jobs', func: Global._gotoJobs},
      {seq: 'g g', desc: 'Go to Messaging', func: Global._gotoMessaging},
      {seq: 'g n', desc: 'Go to Notifications', func: Global._gotoNotifications},
      {seq: 'g p', desc: 'Go to Profile (aka, Me)', func: Global._gotoProfile},
      {seq: 'g b', desc: 'Go to Business', func: Global._gotoBusiness},
      {seq: 'g l', desc: 'Go to Learning', func: Global._gotoLearning},
      {seq: ',', desc: 'Focus on the left/top sidebar (not always present)', func: focusOnSidebar},
      {seq: '.', desc: 'Focus on the right/bottom sidebar (not always present)', func: focusOnAside},
    ];

    /**
     * Click on the requested link in the global nav bar.
     * @param {string} item - Portion of the link to match.
     */
    static _gotoNavLink(item) {
      clickElement(document, [`#global-nav a[href*="/${item}"`]);
    }

    /**
     * Click on the requested button in the global nav bar.
     * @param {string} item - Text on the button to look for.
     */
    static _gotoNavButton(item) {
      const buttons = Array.from(document.querySelectorAll('#global-nav button'));
      const button = buttons.find(el => el.textContent.includes(item));
      button?.click();
    }

    /**
     * Open the help pop-up.
     */
    static _help() {
      Global._gotoNavButton('Tool');
    }

    /**
     * Navigate to the search bar.
     */
    static _gotoSearch() {
      clickElement(document, ['#global-nav-search button']);
    }

    /**
     * Activate the Home (feed) link.
     */
    static _goHome() {
      Global._gotoNavLink('feed');
    }

    /**
     * Activate the My Network link.
     */
    static _gotoMyNetwork() {
      Global._gotoNavLink('mynetwork');
    }

    /**
     * Activate the Jobs link.
     */
    static _gotoJobs() {
      Global._gotoNavLink('jobs');
    }

    /**
     * Activate the Messaging link.
     */
    static _gotoMessaging() {
      Global._gotoNavLink('messaging');
    }

    /**
     * Activate the Notifications link.
     */
    static _gotoNotifications() {
      Global._gotoNavLink('notifications');
    }

    /**
     * Click on the Me button, opening that menu.
     */
    static _gotoProfile() {
      Global._gotoNavButton('Me');
    }

    /**
     * Click on the For Business button, opening that menu.
     */
    static _gotoBusiness() {
      Global._gotoNavButton('Business');
    }

    /**
     * Activate the Learning link.
     */
    static _gotoLearning() {
      Global._gotoNavLink('learning');
    }

  }

  /** Class for handling the Posts feed. */
  class Feed extends Page {
    _pathname = '/feed/';
    _onClickSelector = 'main';
    _autoRegisteredKeys = [
      {seq: 'j', desc: 'Next post', func: this._nextPost},
      {seq: 'k', desc: 'Previous post', func: this._prevPost},
      {seq: 'n', desc: 'Next comment', func: this._nextComment},
      {seq: 'p', desc: 'Previous comment', func: this._prevComment},
      {seq: '<', desc: 'Go to first post or comment', func: this._firstPostOrComment},
      {seq: '>', desc: 'Go to last post or comment currently loaded', func: this._lastPostOrComment},
      {seq: 'f', desc: 'Change browser focus to current post or comment', func: this._focusBrowser},
      {seq: 'c', desc: 'Show comments', func: this._showComments},
      {seq: 'm', desc: 'Show more of the post or comment', func: this._seeMore},
      {seq: 'l', desc: 'Load more posts (if the <button>New Posts</button> button is available, load those)', func: Feed._loadMorePosts},
      {seq: 'v p', desc: 'View the post directly', func: this._viewPost},
      {seq: 'v r', desc: 'View reactions on current post or comment', func: this._viewReactions},
      {seq: '=', desc: 'Open the closest <button class="spa-meatball">⋯</button> menu', func: this._openMeatballMenu},
      {seq: 'X', desc: 'Toggle hiding current post', func: this._togglePost},
      {seq: 'J', desc: 'Toggle hiding then next post', func: this._nextPostPlus},
      {seq: 'K', desc: 'Toggle hiding then previous post', func: this._prevPostPlus},
      {seq: 'L', desc: 'Like post or comment', func: this._likePostOrComment},
      {seq: 'P', desc: 'Go to the share box to start a post or <kbd>TAB</kbd> to the other creator options', func: Feed._gotoShare},
    ];

    _postScroller = null;
    _commentScroller = null;

    /** @type {Scroller~What} */
    static _postsWhat = {
      name: 'Feed posts',
      base: document.body,
      selectors: ['main div[data-id]'],
    };

    /** @type {Scroller~How} */
    static _postsHow = {
      uidCallback: Feed._uniqueIdentifier,
      classes: ['tom'],
      snapToTop: true,
      debug: false,
      stackTrace: false,
    };

    /** @type {Scroller~What} */
    static _commentsWhat = {
      name: 'Feed comments',
      selectors: ['article.comments-comment-item'],
    };

    /** @type {Scroller~How} */
    static _commentsHow = {
      uidCallback: Feed._uniqueIdentifier,
      classes: ['dick'],
      snapToTop: false,
    };

    /**
     * Create the Feed; includes instantiating the posts {@link Scroller}.
     */
    constructor() {
      super();
      this._postScroller = new Scroller(Feed._postsWhat, Feed._postsHow);
      this._postScroller.dispatcher.on('out-of-range', focusOnSidebar);
      this._postScroller.dispatcher.on('change', this._changedPost.bind(this));
    }

    /** @inheritdoc */
    _onClick(evt) {
      const post = evt.target.closest('div[data-id]');
      if (post && post !== this._posts.item) {
        this._posts.item = post;
      }
    }

    /** @inheritdoc */
    _refresh() {

      /**
       * Wait for the post to be reloaded.
       * @implements {Monitor}
       * @param {MutationRecord[]} records - Standard mutation records.
       * @returns {Continuation} - Indicate whether done monitoring.
       */
      function monitor(records) {
        for (const record of records) {
          if (record.oldValue.includes('has-occluded-height')) {
            return {done: true};
          }
        }
        return {done: false};
      }
      if (this._posts.item) {
        const what = {
          name: 'onClick',
          base: this._posts.item,
        };
        const how = {
          observeOptions: {attributeFilter: ['class'], attributes: true, attributeOldValue: true},
          monitor: monitor,
          timeout: 5000,
        };
        otmot(what, how).finally(() => {
          this._posts.shine();
          this._posts.show();
        });
      }
    }

    /** @type {Scroller} */
    get _posts() {
      return this._postScroller;
    }

    /** @type {Scroller} */
    get _comments() {
      if (!this._commentScroller && this._posts.item) {
        this._commentScroller = new Scroller({base: this._posts.item, ...Feed._commentsWhat}, Feed._commentsHow);
        this._commentScroller.dispatcher.on('out-of-range', this._returnToPost.bind(this));
      }
      return this._commentScroller;
    }

    /**
     * @param {null} val - Hack; should only be used to reset the
     * {@link Scroller}.
     */
    set _comments(val) {
      if (this._commentScroller) {
        this._commentScroller.destroy();
        this._commentScroller = null;
      }
    }

    /** @type {boolean} */
    get _hasActiveComment() {
      return Boolean(this._comments?.item);
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static _uniqueIdentifier(element) {
      if (element) {
        return element.dataset.id;
      }
      return null;
    }

    /**
     * Reselects current post, triggering same actions as initial
     * selection.
     */
    _returnToPost() {
      this._posts.item = this._posts.item;
    }

    /**
     * Removes the comments {@link Scroller}.
     */
    _changedPost() {
      this._comments = null;
    }

    /**
     * Select the next post.
     */
    _nextPost() {
      this._posts.next();
    }

    /**
     * Toggle hiding current post then select the next.
     */
    _nextPostPlus() {

      /**
       * Trigger function for {@link otrot}.
       */
      function trigger() {
        this._togglePost();
        this._nextPost();
      }
      // XXX Need to remove the highlights before otrot sees it because
      // it affects the .clientHeight.
      this._posts.dull();
      this._comments?.dull();
      if (this._posts.item) {
        const what = {
          name: 'nextPostPlus',
          base: this._posts.item,
        };
        const how = {
          trigger: trigger.bind(this),
          timeout: 3000,
        };
        otrot(what, how).then(() => {
          this._posts.show();
        });
      } else {
        trigger.bind(this)();
      }
    }

    /**
     * Select the previous post.
     */
    _prevPost() {
      this._posts.prev();
    }

    /**
     * Toggle hiding the current post then select the previous.
     */
    _prevPostPlus() {
      this._togglePost();
      this._prevPost();
    }

    /**
     * Select the next comment.
     */
    _nextComment() {
      this._comments.next();
    }

    /**
     * Select the previous comment.
     */
    _prevComment() {
      this._comments.prev();
    }

    /**
     * Toggles hiding the current post.
     */
    _togglePost() {
      clickElement(this._posts.item, ['button[aria-label^="Dismiss post"]', 'button[aria-label^="Undo and show"]']);
    }

    /**
     * Show more comments on the current post.
     */
    _showComments() {
      if (!clickElement(this._comments.item, ['button.show-prev-replies'])) {
        clickElement(this._posts.item, ['button[aria-label*="comment"]']);
      }
    }

    /**
     * Show more content of the current post or comment.
     */
    _seeMore() {
      const el = this._comments.item ?? this._posts.item;
      clickElement(el, ['button[aria-label^="see more"]']);
    }

    /**
     * Like the current post or comment via reactions menu.
     */
    _likePostOrComment() {
      const el = this._comments.item ?? this._posts.item;
      clickElement(el, ['button[aria-label^="Open reactions menu"]']);
    }

    /**
     * Select the first post or comment.
     */
    _firstPostOrComment() {
      if (this._hasActiveComment) {
        this._comments.first();
      } else {
        this._posts.first();
      }
    }

    /**
     * Select the last post or comment.
     */
    _lastPostOrComment() {
      if (this._hasActiveComment) {
        this._comments.last();
      } else {
        this._posts.last();
      }
    }

    /**
     * Load more posts.
     */
    static _loadMorePosts() {
      const savedScrollTop = document.documentElement.scrollTop;
      let first = false;
      const posts = this._posts;

      /**
       * Trigger function for {@link otrot2}.
       */
      function trigger() {
        if (clickElement(document, ['main div.feed-new-update-pill button'])) {
          first = true;
        } else {
          clickElement(document, ['main button.scaffold-finite-scroll__load-button']);
        }
      }

      /**
       * Action function for {@link otrot2}.
       */
      function action() {
        if (first) {
          if (posts.item) {
            posts.first();
          }
        } else {
          document.documentElement.scrollTop = savedScrollTop;
        }
      }

      const what = {
        name: 'loadMorePosts',
        base: document.querySelector('div.scaffold-finite-scroll__content'),
      };
      const how = {
        trigger: trigger,
        action: action,
        duration: 2000,
      };
      otrot2(what, how);
    }

    /**
     * Move browser focus to the share box.
     */
    static _gotoShare() {
      const share = document.querySelector('div.share-box-feed-entry__top-bar').parentElement;
      share.style.scrollMarginTop = navBarHeightCss;
      share.scrollIntoView();
      share.querySelector('button').focus();
    }

    /**
     * Open the (⋯) menu for the current item.
     */
    _openMeatballMenu() {
      // XXX In this case, the identifier is on an svg element, not
      // the button, so use the parentElement.  When Firefox [fully
      // supports](https://bugzilla.mozilla.org/show_bug.cgi?id=418039)
      // the `:has()` pseudo-selector, we can probably use that and
      // use `clickElement()`.
      const el = this._comments.item ?? this._posts.item;
      const button = el.querySelector('[aria-label^="Open options"],[a11y-text^="Open control menu"],[aria-label^="Open control menu"]').parentElement;
      button?.click();
    }

    /**
     * Change browser focus to the current post or comment.
     */
    _focusBrowser() {
      const el = this._comments.item ?? this._posts.item;
      this._posts.show();
      this._comments?.show();
      focusOnElement(el);
    }

    /**
     * Navigate the the standalone page for the current post.
     */
    _viewPost() {
      const post = this._posts.item;
      if (post) {
        const urn = post.dataset.id;
        const id = `lt-${urn.replaceAll(':', '-')}`;
        let a = post.querySelector(`#${id}`);
        if (!a) {
          a = document.createElement('a');
          a.href = `/feed/update/${urn}/`;
          a.id = id;
          post.append(a);
        }
        a.click();
      }
    }

    /**
     * Open the Reactions summary pop-up.
     */
    _viewReactions() {
      const el = this._comments.item ?? this._posts.item;
      clickElement(el, ['button.comments-comment-social-bar__reactions-count,button.feed-shared-social-action-bar-counts,button.social-details-social-counts__count-value']);
    }

  }

  /**
   * Class for handling the base Jobs page.
   *
   * This particular page requires a lot of careful monitoring.
   * Unlike other pages, this one will destroy and recreate HTML
   * elements, often with the exact same content, every time something
   * interesting happens.  Like loading more sections or jobs, or
   * toggling state of a job.
   */
  class Jobs extends Page {
    _pathname = '/jobs/';
    _onClickSelector = 'main';
    _autoRegisteredKeys = [
      {seq: 'j', desc: 'Next section', func: this._nextSection},
      {seq: 'k', desc: 'Previous section', func: this._prevSection},
      {seq: 'n', desc: 'Next job', func: this._nextJob},
      {seq: 'p', desc: 'Previous job', func: this._prevJob},
      {seq: '<', desc: 'Go to to first section or job', func: this._firstSectionOrJob},
      {seq: '>', desc: 'Go to last section or job currently loaded', func: this._lastSectionOrJob},
      {seq: 'f', desc: 'Change browser focus to current section or job', func: this._focusBrowser},
      {seq: 'Enter', desc: 'Activate the current job (click on it)', func: this._activateJob},
      {seq: 'l', desc: 'Load more sections (or More jobs for you items)', func: this._loadMoreSections},
      {seq: 'S', desc: 'Toggle saving job', func: this._toggleSaveJob},
      {seq: 'X', desc: 'Toggle dismissing job', func: this._toggleDismissJob},
    ];

    _sectionScroller = null;
    _sectionsMO = null;
    _sectionWatchText = '';
    _jobScroller = null;

    /** @type{Scroller~What} */
    static _sectionsWhat = {
      name: 'Jobs sections',
      base: document.body,
      selectors: ['main section'],
    };

    /** @type{Scroller~How} */
    static _sectionsHow = {
      uidCallback: Jobs._uniqueIdentifier,
      classes: ['tom'],
      snapToTop: true,
    };

    /** @type{Scroller~What} */
    static _jobsWhat = {
      name: 'Job entries',
      selectors: [':scope > ul > li', 'div.jobs-home-recent-searches__list-toggle', 'div.discovery-templates-vertical-list__footer'],
    };

    /** @type{Scroller~How} */
    static _jobsHow = {
      uidCallback: Jobs._uniqueJobIdentifier,
      classes: ['dick'],
      snapToTop: false,
    };

    /**
     * Create the Jobs; includes instantiating the sections {@link Scroller}.
     */
    constructor() {
      super();
      this._sectionScroller = new Scroller(Jobs._sectionsWhat, Jobs._sectionsHow);
      this._sectionScroller.dispatcher.on('out-of-range', focusOnSidebar);
      this._sectionScroller.dispatcher.on('change', this._onChange.bind(this));
      this._sectionsMO1 = new MutationObserver(this._mutationHandler.bind(this));
      this._sectionsMO2 = new MutationObserver(this._mutationHandler.bind(this));
    }

    /** @inheritdoc */
    _onClick(evt) {
      const section = evt.target.closest('section');
      if (section) {
        this._sections.item = section;
      }
    }

    /** @inheritdoc */
    _refresh() {
      this._log.disable();
      this._sections.show();
      // The div does get recreated, so setting the observers again is
      // appropriate.
      const el = document.querySelector('div.scaffold-finite-scroll__content');
      this._sectionsMO1.observe(el, {childList: true});
      this._sectionsMO2.observe(el, {attributes: true, attributeOldValue: true, attributeFilter: ['class'], subtree: true});
    }

    /** @type {Scroller} */
    get _sections() {
      return this._sectionScroller;
    }

    /** @type {Scroller} */
    get _jobs() {
      if (!this._jobScroller && this._sections.item) {
        this._jobScroller = new Scroller({base: this._sections.item, ...Jobs._jobsWhat}, Jobs._jobsHow);
        this._jobScroller.dispatcher.on('out-of-range', this._returnToSection.bind(this));
      }
      return this._jobScroller;
    }

    /**
     * @param {null} val - Hack; should only be used to reset the
     * {@link Scroller}.
     */
    set _jobs(val) {
      if (this._jobScroller) {
        this._jobScroller.destroy();
        this._jobScroller = null;
      }
    }

    /** @type {boolean} */
    get _hasActiveJob() {
      return Boolean(this._jobs?.item);
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static _uniqueIdentifier(element) {
      const h2 = element.querySelector('h2');
      let content = element.innerText;
      if (h2?.innerText) {
        content = h2.innerText;
      }
      return strHash(content);
    }

    /**
     * Complicated because there are so many variations.
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static _uniqueJobIdentifier(element) {
      const ONE_ITEM = 1;
      let content = element.innerText;
      let options = element.querySelectorAll('a[data-control-id]');
      if (options.length === ONE_ITEM) {
        content = options[0].dataset.controlId;
      } else {
        options = element.querySelectorAll('a[id]');
        if (options.length === ONE_ITEM) {
          content = options[0].id;
        } else {
          let s = '';
          for (const img of element.querySelectorAll('img[alt]')) {
            s += img.alt;
          }
          if (s) {
            content = s;
          } else {
            options = element.querySelectorAll('.jobs-home-upsell-card__container');
            if (options.length === ONE_ITEM) {
              content = options[0].className;
            }
          }
        }
      }
      return strHash(content);
    }

    /**
     * Reselects current section, triggering same actions as initial
     * selection.
     */
    _returnToSection() {
      this._sections.item = this._sections.item;
    }

    /**
     * Updates {@link Jobs} specific watcher text and removes the jobs
     * {@link Scroller}.
     */
    _onChange() {
      this._sectionWatchText = this._sections.item?.innerText.trim().split('\n')[0];
      this._jobs = null;
    }

    /**
     * Recover scroll position after elements were recreated.
     * @param {number} topScroll - Where to scroll to.
     */
    _resetScroll(topScroll) {
      this._log.log('Entered resetScroll', topScroll);
      // Explicitly setting jobs.item below will cause it to
      // scroll to that item.  We do not want to do that if
      // the user is manually scrolling.
      const job = this._jobs.item;
      this._sections.shine();
      // Section was probably rebuilt, assume jobs scroller is invalid.
      this._jobs = null;
      this._jobs.item = job;
      document.documentElement.scrollTop = topScroll;
      this._log.log('Leaving resetScroll');
    }

    /**
     * Overly complicated.  The job sections get recreated in toto
     * every time new sections are loaded, whether manually or
     * automatically triggered while scrolling.  When this happens, we
     * lose track of it.  So we track the likely text from the current
     * section, and if we see that show up again, we put the shine
     * back on.  We could simplify {@link _loadMoreSections} by
     * calling {@link show} here as well, but if the user is scrolling
     * for a reason, it seems rude to pop them back to the section
     * again.
     * @param {MutationRecord[]} records - Standard mutation records.
     */
    _mutationHandler(records) {
      this._log.log('Entered mutationHandler', `records: ${records.length} type: ${records[0].type}, and ${this._sectionWatchText}`);
      for (const record of records) {
        if (record.type === 'childList') {
          for (const node of record.addedNodes) {
            const newText = node.innerText?.trim().split('\n')[0];
            if (newText && newText === this._sectionWatchText) {
              this._log.log('via childList');
              this._resetScroll(document.documentElement.scrollTop);
            }
          }
        } else if (record.type === 'attributes') {
          const newText = record.target.innerText?.trim().split('\n')[0];
          if (newText && newText === this._sectionWatchText) {
            const attr = record.attributeName;
            const oldValue = record.oldValue;
            const newValue = record.target.attributes[attr].value;
            const same = oldValue === newValue;
            if (!same) {
              this._log.log('via attributes');
              this._resetScroll(document.documentElement.scrollTop);
            }
          }
        }
      }
      this._log.log('Leaving mutationHandler');
    }

    /**
     * Select the next section.
     */
    _nextSection() {
      this._sections.next();
    }

    /**
     * Select the previous section.
     */
    _prevSection() {
      this._sections.prev();
    }

    /**
     * Select the next job.
     */
    _nextJob() {
      this._jobs.next();
    }

    /**
     * Select the previous job.
     */
    _prevJob() {
      this._jobs.prev();
    }

    /**
     * Select the first section or job.
     */
    _firstSectionOrJob() {
      if (this._hasActiveJob) {
        this._jobs.first();
      } else {
        this._sections.first();
      }
    }

    /**
     * Select the last section or job.
     */
    _lastSectionOrJob() {
      if (this._hasActiveJob) {
        this._jobs.last();
      } else {
        this._sections.last();
      }
    }

    /**
     * Change browser focus to the current section or job.
     */
    _focusBrowser() {
      const el = this._jobs.item ?? this._sections.item;
      this._sections.show();
      this._jobs?.show();
      focusOnElement(el);
    }

    /**
     * Load more sections (or jobs in some cases).
     */
    _loadMoreSections() {
      const savedScrollTop = document.documentElement.scrollTop;

      /**
       * Trigger function for {@link otrot}.
       */
      function trigger() {
        clickElement(document, ['main button.scaffold-finite-scroll__load-button']);
      }
      const what = {
        name: 'loadMoreSections',
        base: document.querySelector('div.scaffold-finite-scroll__content'),
      };
      const how = {
        trigger: trigger,
        timeout: 3000,
      };
      otrot(what, how).then(() => {
        this._resetScroll(savedScrollTop);
      });
    }

    /**
     * Activate the current job.
     */
    _activateJob() {
      const job = this._jobs?.item;
      if (job) {
        if (!clickElement(job, ['div[data-view-name]', 'a', 'button'])) {
          this._spa.dumpInfoAboutElement(job, 'job')
        }
      } else {
        // Again, because we use Enter as the hotkey for this action.
        document.activeElement.click();
      }
    }

    /**
     * Toggles saving the current job.
     */
    _toggleSaveJob() {
      const savedJob = this._jobs?.item;

      /**
       * Trigger function for {@link otrot}.  Because, of course jobs
       * needs it.
       */
      function trigger() {
        clickElement(savedJob, ['button[aria-label^="Save job"]', 'button[aria-label^="Unsave job"]']);
      }
      if (savedJob) {
        const what = {
          name: 'toggleSaveJob',
          base: savedJob,
        };
        const how = {
          trigger: trigger,
          timeot: 3000,
        };
        otrot(what, how).then(() => {
          this._jobs.item = savedJob;
        });
      }
    }

    /**
     * Toggles dismissing the current job.
     */
    _toggleDismissJob() {
      const savedJob = this._jobs.item;

      /**
       * Trigger function for {@link otrot}.  Because, of course jobs
       * needs it.
       */
      function trigger() {
        clickElement(savedJob, ['button[aria-label^="Dismiss job"]:not([disabled])', 'button[aria-label$=" Undo"]']);
      }
      if (savedJob) {
        const what = {
          name: 'toggleDismissJob',
          base: savedJob,
        };
        const how = {
          trigger: trigger,
          timeout: 3000,
        };
        otrot(what, how).then(() => {
          this._jobs.item = savedJob;
        });
      }
    }

  }

  /** Class for handling Job collections. */
  class JobsCollections extends Page {
    _pathname = '/jobs/collections/';
  }

  /** Class for handling the Notifications page. */
  class Notifications extends Page {
    _pathname = '/notifications/';
    _onClickSelector = 'main section div.nt-card-list';
    _autoRegisteredKeys = [
      {seq: 'j', desc: 'Next notification', func: this._nextNotification},
      {seq: 'k', desc: 'Previous notification', func: this._prevNotification},
      {seq: '<', desc: 'Go to first notification', func: this._firstNotification},
      {seq: '>', desc: 'Go to last notification', func: this._lastNotification},
      {seq: 'f', desc: 'Change browser focus to current notification', func: this._focusBrowser},
      {seq: 'Enter', desc: 'Activate the current notification (click on it)', func: this._activateNotification},
      {seq: 'l', desc: 'Load more notifications', func: Notifications._loadMoreNotifications},
      {seq: '=', desc: 'Open the <button class="spa-meatball">⋯</button> menu', func: this._openMeatballMenu},
      {seq: 'X', desc: 'Toggle current notification deletion', func: this._deleteNotification},
    ];

    _notificationScroller = null;

    /** @type {Scroller~What} */
    static _notificationsWhat = {
      name: 'Notification cards',
      base: document.body,
      selectors: ['main section div.nt-card-list article'],
    };

    /** @type {Scroller-How} */
    static _notificationsHow = {
      uidCallback: Notifications._uniqueIdentifier,
      classes: ['tom'],
      snapToTop: false,
    };

    /**
     * Create the Notifications view; includes instantiating the
     * notifications {@link Scroller}.
     */
    constructor() {
      super();
      this._notificationScroller = new Scroller(Notifications._notificationsWhat, Notifications._notificationsHow);
      this._notificationScroller.dispatcher.on('out-of-range', focusOnSidebar);
    }

    /** @inheritdoc */
    _onClick(evt) {
      const notification = evt.target.closest('div.nt-card-list article');
      if (notification) {
        this._notifications.item = notification;
      }
    }

    /** @inheritdoc */
    _refresh() {
      this._notifications.shine();
      this._notifications.show();
    }

    /** @type {Scroller} */
    get _notifications() {
      return this._notificationScroller;
    }

    /**
     * Complicated because there are so many variations in
     * notification cards.  We do not want to use reaction counts
     * because they can change too quickly.
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static _uniqueIdentifier(element) {
      // All known <articles> have three children: icon/presence
      // indicator, content, and menu/timestamp.
      const MAGIC_COUNT = 3;
      const CONTENT_INDEX = 1;
      let content = element.innerText;
      if (element.childElementCount === MAGIC_COUNT) {
        let content = element.children[CONTENT_INDEX].innerText;
        if (content.includes('Reactions')) {
          for (const el of element.children[CONTENT_INDEX].querySelectorAll('*')) {
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
      return strHash(content);
    }

    /**
     * Select the next notification.
     */
    _nextNotification() {
      this._notifications.next();
    }

    /**
     * Select the previous notification.
     */
    _prevNotification() {
      this._notifications.prev();
    }

    /**
     * Change browser focus to the current notification.
     */
    _focusBrowser() {
      this._notifications.show();
      focusOnElement(this._notifications.item);
    }

    /**
     * Select the first notification.
     */
    _firstNotification() {
      this._notifications.first();
    }

    /**
     * Select the last notification.
     */
    _lastNotification() {
      this._notifications.last();
    }

    /**
     * Open the (⋯) menu for the current notification.
     */
    _openMeatballMenu() {
      clickElement(this._notifications.item, ['button[aria-label^="Settings menu"]']);
    }

    /**
     * Activate the current notification.
     */
    _activateNotification() {
      const ONE_ITEM = 1;
      const notification = this._notifications.item;
      if (notification) {
        // Because we are using Enter as the hotkey here, if the
        // active element is inside the current card, we want that to
        // take precedence.
        if (document.activeElement.closest('article') === notification) {
          return;
        }

        const elements = notification.querySelectorAll('.nt-card__headline');
        if (elements.length === ONE_ITEM) {
          elements[0].click();
        } else {
          const ba = notification.querySelectorAll('button,a');
          if (ba.length === ONE_ITEM) {
            ba[0].click();
          } else {
            this._spa.dumpInfoAboutElement(notification, 'notification');
          }
        }
      } else {
        // Again, because we use Enter as the hotkey for this action.
        document.activeElement.click();
      }
    }

    /**
     * Toggles deletion of the current notification.
     */
    _deleteNotification() {
      const notification = this._notifications.item;

      /**
       * Trigger function for {@link otrot}.
       */
      function trigger() {
        // Hah.  Unlike in other places, these buttons already exist,
        // just hidden under the menu.
        const buttons = Array.from(notification.querySelectorAll('button'));
        const button = buttons.find(el => el.textContent.includes('Delete this notification'));
        if (button) {
          button.click();
        } else {
          clickElement(notification, ['button[aria-label^="Undo notification deletion"]']);
        }
      }
      if (notification) {
        const what = {
          name: 'deleteNotification',
          base: document.querySelector('div.scaffold-finite-scroll__content'),
        };
        const how = {
          trigger: trigger,
          timeout: 3000,
        };
        otrot(what, how).then(() => {
          this._notifications.shine();
        });
      }
    }

    /**
     * Load more notifications.
     */
    static _loadMoreNotifications() {
      const savedScrollTop = document.documentElement.scrollTop;
      let first = false;
      const notifications = this._notifications;

      /**
       * Trigger function for {@link otrot2}.
       */
      function trigger () {
        if (clickElement(document, ['button[aria-label^="Load new notifications"]'])) {
          first = true;
        } else {
          clickElement(document, ['main button.scaffold-finite-scroll__load-button']);
        }
      }

      /**
       * Action function for {@link otrot2}.
       */
      const action = () => {
        if (first) {
          if (notifications.item) {
            notifications.first();
          }
        } else {
          document.documentElement.scrollTop = savedScrollTop;
          this._notifications.shine();
        }
      }

      const what = {
        name: 'loadMoreNotifications',
        base: document.querySelector('div.scaffold-finite-scroll__content'),
      };
      const how = {
        trigger: trigger,
        action: action,
        duration: 2000,
      };
      otrot2(what, how);
    }

  }

  /** Base class for SPA instance details. */
  class SPADetails {

    /** Create a SPADetails instance. */
    constructor() {
      this._log = new Logger(this.constructor.name, false, false);
      this.dispatcher = new Dispatcher('errors', 'news');
      this.dispatcher.on('errors', this._errors.bind(this));
      this.dispatcher.on('news', this._news.bind(this));
    }

    /**
     * Handles notifications about changes to the {@link SPA} Errors
     * tab content.
     * @param {number} count - Number of errors currently logged.
     */
    _errors(count) {
      this._log.log('errors:', count);
    }

    /**
     * Handles notifications about activity on the {@link SPA} News tab.
     * @param {object} data - Undefined at this time.
     */
    _news(data) {
      this._log.log('news', data);
    }

    /**
     * @implements {SPA~HelpTabGenerator}
     * @returns {SPA~HelpTab} - Where to find documentation and file bugs.
     */
    infoHelp() {
      this._log.log('infoHelp is not implemented');
      throw new Error('Not implemented.');
      return {  // eslint-disable-line no-unreachable
        name: 'Not implemented.',
        content: 'Not implemented.',
      };
    }
  }

  /** LinkedIn specific information. */
  class LinkedIn extends SPADetails {

    static _icon =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">' +
      '<defs>' +
      '<mask id="a" maskContentUnits="objectBoundingBox">' +
      '<path fill="#fff" d="M0 0h1v1H0z"/>' +
      '<circle cx=".5" cy=".5" r=".25"/>' +
      '</mask>' +
      '<mask id="b" maskContentUnits="objectBoundingBox">' +
      '<path fill="#fff" mask="url(#a)" d="M0 0h1v1H0z"/>' +
      '<rect x="0.375" y="-0.05" height="0.35" width="0.25" transform="rotate(30 0.5 0.5)"/>' +
  '</mask>' +
      '</defs>' +
      '<rect x="9.5" y="7" width="5" height="10" transform="rotate(45 12 12)"/>' +
      '<circle cx="6" cy="18" r="5" mask="url(#a)"/>' +
      '<circle cx="18" cy="6" r="5" mask="url(#b)"/>' +
      '</svg>';

    /** Create a LinkedIn instance. */
    constructor() {
      super();
      this.ready = this._waitUntilPageLoadedEnough();
    }

    /**
     * The element.id used to identify the help pop-up.
     * @type {string}
     */
    get helpId() {
      return this._helpId;
    }

    /**
     * @param {string} val - Set the value of the help element.id.
     */
    set helpId(val) {
      this._helpId = val;
    }

    /** Hang out until enough HTML has been built to be useful. */
    async _waitUntilPageLoadedEnough() {
      this._log.log('Entered waitOnPageLoadedEnough');

      /**
       * Monitor for waiting for the navbar to show up.
       * @implements {Monitor}
       * @returns {Continuation} - Indicate whether done monitoring.
       */
      function navBarMonitor() {
        const navbar = document.querySelector('#global-nav');
        if (navbar) {
          return {done: true, results: navbar};
        }
        return {done: false};
      }

      // In this case, the trigger was the page load.  It already happened
      // by the time we got here.
      const navWhat = {
        name: 'navBarObserver',
        base: document.body,
      };
      const navHow = {
        observeOptions: {childList: true, subtree: true},
        monitor: navBarMonitor,
      };

      this._navbar = await otmot(navWhat, navHow);
      this._finishConstruction();

      this._log.log('Leaving waitOnPageLoadedEnough');
    }

    /** Do the bits that were waiting on the page. */
    _finishConstruction() {
      this._log.log('Entered finishConstruction');

      LinkedIn._addLitStyle();
      this._addToolMenuItem();
      this._setNavBarInfo();

      this._log.log('Leaving finishConstruction');
    }

    /**
     * Create CSS styles for stuff specific to LinkedIn Tool.
     */
    static _addLitStyle() {
      const style = document.createElement('style');
      style.textContent += '.lit-news { position: absolute; bottom: 14px; right: -5px; width: 16px; height: 16px; border-radius: 50%; border: 5px solid green; }';
      document.head.append(style);
    }

    /** Add a menu item to the global nav bar. */
    _addToolMenuItem() {
      this._log.log('Entered addToolMenuItem');

      const ul = document.querySelector('ul.global-nav__primary-items');
      const li = document.createElement('li');
      li.classList.add('global-nav__primary-item');
      li.innerHTML =
        '<button id="lit-nav-button" class="global-nav__primary-link">' +
        '  <div class="global-nav__primary-link-notif artdeco-notification-badge">' +
        '    <div class="notification-badge">' +
        '      <span class="notification-badge__count"></span>' +
        '    </div>' +
        `    <div>${LinkedIn._icon}</div>` +
        '    <span class="lit-news_">TBD</span>' +
        '    <span class="t-12 global-nav__primary-link-text">Tool</span>' +
        '  </div>' +
        '</button>';
      ul.append(li);
      const button = li.querySelector('button');
      button.addEventListener('click', () => {
        const help = document.querySelector(`#${this.helpId}`);
        help.showModal();
        help.dispatchEvent(new Event('open'));
      });
      this._log.log('Leaving addToolMenuItem');
    }

    /** Set some useful global variables. */
    _setNavBarInfo() {
      const fudgeFactor = 4;
      navBarHeightPixels = this._navbar.clientHeight + fudgeFactor;
      navBarHeightCss = `${navBarHeightPixels}px`;
    }

    /** @inheritdoc */
    _errors(count) {
      this._log.log('Entered errors with', count);
      const button = document.querySelector('#lit-nav-button');
      const toggle = button.querySelector('.notification-badge');
      const badge = button.querySelector('.notification-badge__count');
      badge.innerText = `${count}`;
      if (count) {
        toggle.classList.add('notification-badge--show');
      } else {
        toggle.classList.remove('notification-badge--show');
      }
      this._log.log('Leaving errors');
    }

    /** @inheritdoc */
    infoHelp() {
      this._log.log('Entered infoHelp');
      const baseGhUrl = 'https://github.com/nexushoratio/userscripts';
      const baseGfUrl = 'https://greasyfork.org/en/scripts/472097-linkedin-tool';
      const issuesLink = `${baseGhUrl}/labels/linkedin-tool`;
      const newIssueLink = `${baseGhUrl}/issues/new/choose`;
      const newGfIssueLink = `${baseGfUrl}/feedback`;
      const releaseNotesLink = `${baseGfUrl}/versions`;
      const helpTab = {
        name: 'Information',
        content: `<p>This is help for the <b>${GM.info.script.name}</b> userscript, a type of add-on.  It is not associated with LinkedIn Corporation in any way.</p>` +
          `<p>Documentation can be found on <a href="${GM.info.script.supportURL}">GitHub</a>.  Release notes are automatically generated on <a href="${releaseNotesLink}">Greasy Fork</a>.</p>` +
          `<p>Existing issues are also on GitHub <a href="${issuesLink}">here</a>.</p>` +
          `<p>New issues or feature requests can be filed on GitHub (account required) <a href="${newIssueLink}">here</a>.  Then select the appropriate issue template to get started.  Or, on Greasy Fork (account required) <a href="${newGfIssueLink}">here</a>.  Review the <b>Errors</b> tab for any useful information.</p>`
      }
      this._log.log('Leaving infoHelp with', helpTab);
      return helpTab;
    }
  }

  /**
   * A driver for working with a single-page application.
   *
   * Generally, a single instance of this class is created, and all
   * instances of {Page} are registered to it.  As the user navigates
   * through the single-page application, this will react to it and
   * enable and disable view specific handling as appropriate.
   */
  class SPA {
    static _errorMarker = '---';

    /**
     * A special {Page} that handles global keys.
     * @type {Page}
     */
    _global = null;

    /**
     * Current {Page}.
     * @type {Page}
     */
    _page = null;

    /**
     * Collect of {Page} mapped by the pathname they support.
     * @type {Page}
     */
    _pages = new Map();

    /**
     * The most recent element to receive focus.
     * @type {Element}
     */
    _lastInputElement = null;

    /**
     * @type {KeyboardService}
     */
    _helpKeyboard = null;

    /**
     * Create a SPA.
     * @param {SPADetails} details - Implementation specific details.
     */
    constructor(details) {
      this._log = new Logger(this.constructor.name, true, false);
      this._details = details;
      this._id = crypto.randomUUID();
      SPA._installNavStyle();
      this._initializeHelpView();
      document.addEventListener('focus', this._onFocus.bind(this), true);
      document.addEventListener('urlchange', this._onUrlChange.bind(this), true);
    }

    /**
     * Set the context (used by VM.shortcut) to a specific value.
     * @param {string} context - The name of the context.
     * @param {object} state - What the value should be.
     */
    _setKeyboardContext(context, state) {
      const pages = Array.from(this._pages.values());
      pages.push(this._global);
      for (const page of pages) {
        // Just in case no global was set up, use optional chaining.
        page?.keyboard.setContext(context, state);
      }
    }

    /**
     * Handle focus events to track whether we have gone into or left
     * an area where we want to disable hotkeys.
     * @param {Event} evt - Standard 'focus' event.
     */
    _onFocus(evt) {
      if (this._lastInputElement && evt.target !== this._lastInputElement) {
        this._lastInputElement = null
        this._setKeyboardContext('inputFocus', false);
      }
      if (isInput(evt.target)) {
        this._setKeyboardContext('inputFocus', true);
        this._lastInputElement = evt.target;
      }
    }

    /**
     * Handle urlchange events that indicate a switch to a new page.
     * @param {CustomEvent} evt - Custom 'urlchange' event.
     */
    _onUrlChange(evt) {
      this.activate(evt.detail.url.pathname);
    }

    /**
     * Configure handlers for the help view.
     */
    _addHelpViewHandlers() {
      const errors = document.querySelector(`#${this._helpId} [data-spa-id="errors"]`);
      errors.addEventListener('change', (evt) => {
        const count = evt.target.value.split('\n').filter(x => x === SPA._errorMarker).length;
        this._details.dispatcher.fire('errors', count);
        this._updateHelpErrorsLabel(count);
      });
    }

    /**
     * Create the CSS styles used for indicating the current items.
     */
    static _installNavStyle() {
      const style = document.createElement('style');
      style.textContent += '.tom { border-color: orange !important; border-style: solid !important; border-width: medium !important; }';
      style.textContent += '.dick { border-color: red !important; border-style: solid !important; border-width: thin !important; }';
      document.head.append(style);
    }

    /**
     * Create and configure a separate {@link KeyboardService} for the
     * help view.
     */
    _initializeHelpKeyboard() {
      this._helpKeyboard = new VM.shortcut.KeyboardService();
      this._helpKeyboard.register('c-right', this._switchHelpTab.bind(this, 1));
      this._helpKeyboard.register('c-left', this._switchHelpTab.bind(this, -1));
    }

    /**
     * @typedef {object} HelpTab
     * @property {string} name - Tab name
     * @property {string} content - HTML to be used as initial content.
     */

    /**
     * @callback HelpTabGenerator
     * @returns {HelpTab}
     */

    /**
     * Add CSS styling for use with the help view.
     * @param {HelpTab[]} tabs - Array defining the help tabs.
     */
    _addHelpStyle(tabs) {
      const style = document.createElement('style');
      style.textContent += `#${this._helpId} { height: 100%; width: 65rem; } `;
      style.textContent += `#${this._helpId} input { display: none; } `;
      style.textContent += `#${this._helpId} label { padding: unset; display: inline; color: unset !important; } `;
      style.textContent += `#${this._helpId} label::before { all: unset; } `;
      style.textContent += `#${this._helpId} label::after { all: unset; } `;
      style.textContent += `#${this._helpId} input:checked + label { font-weight: bold; } `;
      style.textContent += `#${this._helpId} .spa-panel { display: none; } `;
      for (const idx of tabs.keys()) {
        style.textContent += `#${this._helpId} div.spa-tabber > input:nth-of-type(${idx + 1}):checked ~ div.spa-panels > div.spa-panel:nth-of-type(${idx + 1}) { display: block }`;
      }
      style.textContent += `#${this._helpId} .spa-danger { background-color: red; }`;
      style.textContent += `#${this._helpId} kbd { font-size: 0.85em; padding: 0.07em; border-width: 1px; border-style: solid; }`;
      style.textContent += `#${this._helpId} p { margin-bottom: 1em; }`;
      style.textContent += `#${this._helpId} th { padding-top: 1em; text-align: left; }`;
      style.textContent += `#${this._helpId} td:first-child { white-space: nowrap; text-align: right; padding-right: 0.5em; }`;
      // The color: unset address dimming while disabled.
      style.textContent += `#${this._helpId} button { border-width: 1px; border-style: solid; border-radius: 1em; color: unset; padding: 3px; }`;
      style.textContent += `#${this._helpId} button.spa-meatball { border-radius: 50%; }`;
      document.head.prepend(style);
    }

    /**
     * Add basic dialog with an embedded tabs for the help view.  The
     * zeroth tab always defaults to `checked`.
     * @param {HelpTab[]} tabs - Array defining the help tabs.
     */
    _addHelpDialog(tabs) {
      const dialog = document.createElement('dialog');
      dialog.id = this._helpId;
      let tabber = '';
      let panels = '';
      for (const idx of tabs.keys()) {
        const checked = idx ? '' : 'checked';
        const {name, content} = tabs[idx];
        tabber += `<input data-spa-id="spa-input-${name}" id="spa-input-${name}" name="spa-help-tabber" type="radio" ${checked}>`;
        tabber += `<label data-spa-id="spa-label-${name}" for="spa-input-${name}">[${name}]</label>`;
        panels += `<div data-spa-id="spa-panel-${name}" class="spa-panel">${content}</div>`;
      }
      dialog.innerHTML =
        `<div><b>${GM.info.script.name}</b> - v${GM.info.script.version}</div>` +
        '<div>' +
        '  <span>Use <kbd>Ctrl</kbd>+<kbd>←</kbd> and <kbd>Ctrl</kbd>+<kbd>→</kbd> keys or click to select tab</span>' +
        '  <span style="float: right">Hit <kbd>ESC</kbd> to close</span>' +
        '</div><hr>' +
        `<div class="spa-tabber">${tabber}` +
        `    <div class="spa-panels">${panels}</div>` +
        '  </div>' +
        '</div>';
      document.body.prepend(dialog);

      // Dialogs do not have a real open event.  We will fake it.
      dialog.addEventListener('open', () => {
        this._setKeyboardContext('inDialog', true);
        this._helpKeyboard.enable();
        if (this._page) {
          const pageId = this._pageHelpId(this._page);
          const tr = document.querySelector(`#${pageId}`);
          tr.style.scrollMarginTop = navBarHeightCss;
          tr.scrollIntoView(true);
        } else {
          const dialog = document.querySelector(`#${this._helpId}`);
          // 0, 0 is good enough
          dialog.scrollTo(0, 0);
        }
      });
      dialog.addEventListener('close', () => {
        this._setKeyboardContext('inDialog', false);
        this._helpKeyboard.disable();
      });
    }

    /**
     * @implements {HelpTabGenerator}
     * @returns {HelpTab} - Initial table for the keyboard shortcuts.
     */
    static _keyboardHelp() {
      return {
        name: 'Keyboard shortcuts',
        content: '<table data-spa-id="shortcuts"><tbody></tbody></table>',
      }
    }

    /**
     * Generate information about the current environment useful in
     * bug reports.
     * @returns {string} - Text with some wrapped in a `pre` element.
     */
    static _errorPlatformInfo() {
      const gm = GM.info;
      const header = 'Please consider including some of the following information in any bug report:';
      const msgs = [
        `${gm.script.name}: ${gm.script.version}`,
        `Userscript manager: ${gm.scriptHandler} ${gm.version}`,
      ];

      // Violentmonkey
      if (gm.platform) {
        msgs.push(`Platform: ${gm.platform.browserName} ${gm.platform.browserVersion} ${gm.platform.os} ${gm.platform.arch}`);
      }

      // Tampermonkey
      if (gm.userAgentData) {
        let msg = 'Platform: ';
        for (const brand of gm.userAgentData.brands.values()) {
          msg += `${brand.brand} ${brand.version} `;
        }
        msg += `${gm.userAgentData?.platform} `;
        msg += `${gm.userAgentData?.architecture}-${gm.userAgentData?.bitness}`;
        msgs.push(msg);
      }

      return `${header}<pre>${msgs.join('\n')}</pre>`;
    }

    /**
     * @implements {HelpTabGenerator}
     * @returns {HelpTab} - Initial placeholder for error logging.
     */
    static _errorHelp() {
      return {
        name: 'Errors',
        content: [
          '<div>',
          '  <p>Any information in the text box below could be helpful in fixing a bug.</p>',
          `  <p>The content can be edited and then included in a bug report.  Different errors should be separated by "${SPA._errorMarker}".</p>`,
          '<p><b>Please remove any identifying information before including it in a bug report!</b></p>',
          SPA._errorPlatformInfo(),
          '</div>',
          '<textarea rows=20 data-spa-id="errors" spellcheck="off" placeholder="No errors logged yet."></textarea>',
        ].join(''),
      }
    }

    /**
     * Set up everything necessary to get the help view going.
     */
    _initializeHelpView() {
      this._helpId = `help-${this._id}`;
      this._details.helpId = this._helpId;
      this._initializeHelpKeyboard();

      const helpGenerators = [
        SPA._keyboardHelp(),
        this._details.infoHelp(),
        SPA._errorHelp(),
      ];

      this._addHelpStyle(helpGenerators);
      this._addHelpDialog(helpGenerators);
      this._addHelpViewHandlers();
    }

    /**
     * Function registered to implement navigation between tabs in the
     * help view.
     * @param {number} direction - Either 1 or -1.
     */
    _switchHelpTab(direction) {
      const panels = Array.from(document.querySelectorAll(`#${this._helpId} .spa-tabber > input`));
      let idx = panels.findIndex((panel) => panel.checked);
      idx = (idx + direction + panels.length) % panels.length;
      panels[idx].checked = true;
    }

    /**
     * Convert a string in CamelCase to separate words, like Camel Case.
     * @param {string} text - Text to parse.
     * @returns {string} - Parsed text.
     */
    static _parseHeader(text) {
      return text.replace(/([A-Z])/g, ' $1').trim();
    }

    /**
     * Parse a {@link Shortcut.seq} and wrap it in HTML.
     * @example
     * 'a b' -> '<kbd>a</kbd> then <kbd>b</kbd>'
     * @param {Shortcut.seq} seq - Keystroke sequence.
     * @returns {string} - Appropriately wrapped HTML.
     */
    static _parseSeq(seq) {
      const letters = seq.split(' ').map(w => `<kbd>${w}</kbd>`);
      const s = letters.join(' then ');
      return s;
    }

    /**
     * Generate a unique id for page views.
     * @param {Page} page - An instance of the Page class.
     * @returns {string} - Unique identifier.
     */
    _pageHelpId(page) {
      return `${this._helpId}-${page.helpHeader}`;
    }

    /**
     * Add help from the page to the help view.
     * @param {Page} page - An instance of the Page class.
     */
    _addHelp(page) {
      const help = document.querySelector(`#${this._helpId} tbody`);
      const section = SPA._parseHeader(page.helpHeader);
      const pageId = this._pageHelpId(page);
      let s = `<tr id="${pageId}"><th></th><th>${section}</th></tr>`;
      for (const {seq, desc} of page.helpContent) {
        const keys = SPA._parseSeq(seq);
        s += `<tr><td>${keys}:</td><td>${desc}</td></tr>`;
      }
      // Don't include works in progress that have no keys yet.
      if (page.helpContent.length) {
        help.innerHTML += s;
        for (const button of help.querySelectorAll('button')) {
          button.disabled = true;
        }
      }
    }

    /**
     * Update Errors tab label based upon value.
     * @param {number} count - Number of errors currently logged.
     */
    _updateHelpErrorsLabel(count) {
      this._log.log('Entered updateHelpErrorsLabel', count);
      const label = document.querySelector(`#${this._helpId} [data-spa-id="spa-label-Errors"]`);
      if (count) {
        label.click();
        label.classList.add('spa-danger');
      } else {
        label.classList.remove('spa-danger')
      }
      this._log.log('Leaving updateHelpErrorsLabel');
    }

    /**
     * Add content to the Errors tab so the user can use it to file feedback.
     * @param {string} content - Information to add.
     */
    addError(content) {
      const errors = document.querySelector(`#${this._helpId} [data-spa-id="errors"]`);
      errors.value += `${content}\n`;

      if (content === SPA._errorMarker) {
        const event = new Event('change');
        errors.dispatchEvent(event);
      }
    }

    /**
     * Add a marker to the Errors tab so the user can see where
     * different issues happened.
     */
    addErrorMarker() {
      this.addError(SPA._errorMarker);
    }

    /**
     * Add a new page to those supported by this instance.
     * @param {Page} page - An instance of the Page class.
     */
    register(page) {
      page.start(this);
      this._addHelp(page);
      if (page.pathname === null) {
        this._global = page;
        this._global.activate();
      } else {
        this._pages.set(page.pathname, page);
      }
    }

    /**
     * Dump a bunch of information about an element.  Currently this
     * goes to the console and then alerts the user to file a bug.
     * @param {Element} element - Element to get information about.
     * @param {string} name - What area this information came from.
     */
    dumpInfoAboutElement(element, name) {
      const msg = `An unsupported unsupported ${name} element was discovered:`;
      this.addError(msg);
      this.addError(element.outerHTML);
      this.addErrorMarker();
    }

    /**
     * Determine which page can handle this portion of the URL.
     * @param {string} pathname - A {URL.pathname}.
     * @returns {Page} - The page to use.
     */
    _findPage(pathname) {
      const pathnames = Array.from(this._pages.keys());
      const candidates = pathnames.filter(p => pathname.startsWith(p));
      const candidate = candidates.reduce((a, b) => (a.length > b.length ? a : b), '');
      return this._pages.get(candidate) || null;
    }

    /**
     * Handle switching from the old page (if any) to the new one.
     * @param {string} pathname - A {URL.pathname}.
     */
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

  const linkedIn = new LinkedIn();
  linkedIn.ready.then(() => {
    log.log('proceeding...');
    const spa = new SPA(linkedIn);
    spa.register(new Global());
    spa.register(new Feed());
    spa.register(new Jobs());
    spa.register(new JobsCollections());
    spa.register(new Notifications());
    spa.activate(window.location.pathname);
  });

  if (window.onurlchange === null) {
    // We are likely running on Tampermonkey, so use native support.
    log.log('Using window.onurlchange for monitoring URL updates.');
    window.addEventListener('urlchange', (info) => {
      // The info that TM gives is not really an event.  So we turn it
      // into one and throw it again, this time onto `document` where
      // `spa` is listening for it.
      const newUrl = new URL(info.url);
      const evt = new CustomEvent('urlchange', {detail: {url: newUrl}});
      document.dispatchEvent(evt);
    });
  } else {
    log.log('Using MutationObserver for monitoring URL updates.');

    let oldUrl = new URL(window.location);

    /**
     * Constantly watch the web page.  Whenever anything changes,
     * compare the current URL to the previous one, and if change,
     * send out an event.
     * @param {Element} element - Element to observe, ideally the
     * smallest thing that stays consistent throughout the lifetime of
     * the app.
     */
    function createUrlObserver(element) {  // eslint-disable-line no-inner-declarations
      const observer = new MutationObserver(() => {
        const newUrl = new URL(window.location);
        if (oldUrl.href !== newUrl.href) {
          const evt = new CustomEvent('urlchange', {detail: {url: newUrl}});
          oldUrl = newUrl;
          document.dispatchEvent(evt);
        }
      });
      observer.observe(element, {childList: true, subtree: true});
    }

    /**
     * Watch for the intial `authentication-outlet` to show up, then
     * attach the URL observer to it.
     * @implements {Monitor}
     * @returns {Continuation} - Indicate whether done monitoring.
     */
    function authenticationOutletMonitor() {  // eslint-disable-line no-inner-declarations
      const div = document.body.querySelector('div.authentication-outlet');
      if (div) {
        return {done: true, results: div};
      }
      return {done: false, results: null};
    }

    const authOutletWhat = {
      name: 'authOutletMonitor',
      base: document.body,
    };
    const autoOutletHow = {
      observeOptions: {childList: true, subtree: true},
      monitor: authenticationOutletMonitor,
    };
    otmot(authOutletWhat, autoOutletHow).then((el) => createUrlObserver(el));
  }

  log.log('Initialization successful.');

})();
