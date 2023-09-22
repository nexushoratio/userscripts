// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @noframes
// @version     3.1.0
// @author      Mike Castle
// @description Minor enhancements to LinkedIn. Mostly just hotkeys.
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @downloadURL https://github.com/nexushoratio/userscripts/raw/main/linkedin-tool.user.js
// @supportURL  https://github.com/nexushoratio/userscripts/blob/main/linkedin-tool.md
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// @grant       window.onurlchange
// ==/UserScript==

/* global VM */

// eslint-disable-next-line max-lines-per-function
(() => {
  'use strict';

  const testing = {
    enabled: false,
    funcs: [],
  };

  const NOT_FOUND = -1;

  // TODO(#141): Currently replacing underscores with #private
  // properties.

  /**
   * Fancy-ish debug messages.
   * Console message groups can be started and ended using special
   * methods.
   * @example
   * const log = new Logger('Bob', true);
   * foo(x) {
   *  const me = 'foo';
   *  log.entered(me, x);
   *  ... do stuff ...
   *  log.starting('loop');
   *  for (const item in items) {
   *    log.log(`Processing ${item}`);
   *    ...
   *  }
   *  log.finished('loop');
   *  log.leaving(me, y);
   *  return y;
   * }
   */
  class Logger {

    #name
    #enabled
    #trace

    #opened = [];
    #closed = [];

    /**
     * @param {string} name - Name for this logger.
     * @param {boolean} enabled - Initial enabled state of the logger.
     * @param {boolean} trace - Initial state of including stack traces.
     */
    constructor(name, enabled = false, trace = false) {
      this.#name = name;
      this.#enabled = enabled;
      this.trace = trace;
    }

    /** @type {string} - Name for this logger. */
    get name() {
      return this.#name;
    }

    /** @type {boolean} - Whether logging is currently enabled. */
    get enabled() {
      return this.#enabled;
    }

    /** @type {boolean} - Indicates whether messages include a stack trace. */
    get trace() {
      return this.#trace;
    }

    /** @param {boolean} val - Set inclusion of stack traces. */
    set trace(val) {
      this.#trace = Boolean(val);
    }

    /**
     * Enable this logger.
     */
    enable() {
      this.#enabled = true;
    }

    /**
     * Disable this logger.
     */
    disable() {
      this.#enabled = false;
    }

    /* eslint-disable no-console */
    /**
     * Entered a specific group.
     * @param {string} group - Group that was entered.
     * @param {*} ...rest - Arbitrary items to pass to console.debug.
     */
    entered(group, ...rest) {
      this.#opened.push(group);
      if (this.enabled) {
        console.group(`${this.name}: ${group}`);
        if (rest.length) {
          const msg = `Entered ${group} with`;
          this.log(msg, ...rest);
        }
      }
    }

    /**
     * Leaving a specific group.
     * @param {string} group - Group leaving.
     * @param {*} ...rest - Arbitrary items to pass to console.debug.
     */
    leaving(group, ...rest) {
      const lastGroup = this.#opened.pop();
      if (group !== lastGroup) {
        console.error(`${this.name}: Group mismatch!  Passed "${group}", expected to see "${lastGroup}"`);
      }
      if (this.enabled) {
        let msg = `Leaving ${group}`;
        if (rest.length) {
          msg += ' with:';
        }
        this.log(msg, ...rest);
        console.groupEnd();
      }
    }

    /**
     * Starting a specific collapsed group.
     * @param {string} group - Group that is being started.
     * @param {*} ...rest - Arbitrary items to pass to console.debug.
     */
    starting(group, ...rest) {
      this.#closed.push(group);
      if (this.enabled) {
        console.groupCollapsed(`${this.name}: ${group} (collapsed)`);
        if (rest.length) {
          const msg = `Starting ${group} with:`;
          this.log(msg, ...rest);
        }
      }
    }

    /**
     * Finished a specific collapsed group.
     * @param {string} group - Group that was entered.
     * @param {*} ...rest - Arbitrary items to pass to console.debug.
     */
    finished(group, ...rest) {
      const lastGroup = this.#closed.pop();
      if (group !== lastGroup) {
        console.error(`${this.name}: Group mismatch!  Passed "${group}", expected to see "${lastGroup}"`);
      }
      if (this.enabled) {
        let msg = `Finished ${group}`;
        if (rest.length) {
          msg += ' with:';
        }
        this.log(msg, ...rest);
        console.groupEnd();
      }
    }

    /**
     * Log a specific message.
     * @param {string} msg - Debug message to send to console.debug.
     * @param {*} ...rest - Arbitrary arguments to also pass to console.debug.
     */
    log(msg, ...rest) {
      if (this.enabled) {
        if (this.trace) {
          console.groupCollapsed(`${this.name} call stack`);
          console.trace();
          console.groupEnd();
        }
        console.debug(`${this.name}: ${msg}`, ...rest);
      }
    }
    /* eslint-enable */

  }

  const log = new Logger('Default', true, false);


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
   * Bring the Browser's focus onto element.
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
   * Determines if the element accepts keyboard input.
   * @param {Element} element - HTML Element to examine.
   * @returns {boolean} - Indicating whether the element accepts
   * keyboard input.
   */
  function isInput(element) {
    let tagName = '';
    if ('tagName' in element) {
      tagName = element.tagName.toLowerCase();
    }
    // eslint-disable-next-line no-extra-parens
    return (element.isContentEditable || ['input', 'textarea'].includes(tagName));
  }


  /**
   * @typedef {object} Continuation
   * @property {boolean} done - Indicate whether the monitor is done
   * processing.
   * @property {object} [results] - Optional results object.
   */

  /**
   * @callback Monitor
   * @param {MutationRecord[]} records - Standard mutation records.
   * @returns {Continuation} - Indicate whether done monitoring.
   */

  /**
   * Simple function that takes no parameters and returns nothing.
   * @callback SimpleFunction
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
   * @property {boolean} [debug] - Enable debugging.
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
      const logger = new Logger(`otmot ${name}`, debug, false);
      let timeoutID = null;
      const observer = new MutationObserver((records) => {
        const {done, results} = monitor(records);
        logger.log('monitor:', done, results);
        if (done) {
          observer.disconnect();
          clearTimeout(timeoutID);
          logger.log('resolving', results);
          resolve(results);
          logger.log('resolved');
        }
      });
      if (timeout) {
        timeoutID = setTimeout(() => {
          observer.disconnect();
          logger.log('rejecting after timeout');
          reject(new Error(`otmot ${name} timed out`));
        }, timeout);
      }
      observer.observe(base, observeOptions);
      logger.log('Calling trigger');
      trigger();
      logger.log('Trigger called');
    });
    return prom;
  }

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
   * @property {boolean} [debug] - Enable debugging.
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
        debug = false,
      } = how;
      let timeoutID = null;
      const logger = new Logger(`otrot ${name}`, debug, false);
      const {
        clientHeight: initialHeight,
        clientWidth: initialWidth,
      } = base;
      logger.log('initial dimensions:', initialWidth, initialHeight);
      const observer = new ResizeObserver(() => {
        logger.log('observed dimensions:', base.clientWidth, base.clientHeight);
        if (base.clientHeight !== initialHeight || base.clientWidth !== initialWidth) {
          observer.disconnect();
          clearTimeout(timeoutID);
          logger.log('resolving', what);
          resolve(what);
          logger.log('resolved');
        }
      });
      timeoutID = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`otrot ${name} timed out`));
      }, timeout);
      observer.observe(base);
      logger.log('Calling trigger');
      trigger();
      logger.log('Trigger called');
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
   * @returns {Promise<string>} - Will resolve after duration expires.
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
   * Normalizes a string to be safe to use as an HTML element id.
   * @param {string} input - The string to normalize.
   * @returns {string} - Normlized string.
   */
  function safeId(input) {
    let result = input
      .replaceAll(' ', '-')
      .replaceAll('.', '_')
      .replaceAll(',', '__comma__')
      .replaceAll(':', '__colon__');
    if (!(/^[a-z_]/iu).test(result)) {
      result = `a${result}`;
    }
    return result;
  }

  /** Test case. */
  function testSafeId() {
    const tests = [
      {test: 'Tabby Cat', expected: 'Tabby-Cat'},
      {test: '_', expected: '_'},
      {test: '', expected: 'a'},
      {test: '0', expected: 'a0'},
      {test: 'a.b.c', expected: 'a_b_c'},
      {test: 'a,b,c', expected: 'a__comma__b__comma__c'},
      {test: 'a:b::c', expected: 'a__colon__b__colon____colon__c'},
    ];

    for (const {test, expected} of tests) {
      const actual = safeId(test);
      const passed = actual === expected;
      const msg = `${test} ${expected} ${actual}, ${passed}`;
      log.log(msg);
      if (!passed) {
        throw new Error(msg);
      }
    }
  }

  testing.funcs.push(testSafeId);

  /**
   * Java's hashCode:  s[0]*31(n-1) + s[1]*31(n-2) + ... + s[n-1]
   * @param {string} s - String to hash.
   * @returns {string} - Hash value.
   */
  function strHash(s) {
    let hash = 0;
    for (let i = 0; i < s.length; i += 1) {
      // eslint-disable-next-line no-magic-numbers
      hash = (hash * 31) + s.charCodeAt(i) | 0;
    }
    return `${hash}`;
  }

  /**
   * Implement HTML for a tabbed user interface.
   *
   * This version uses radio button/label pairs to select the active
   * panel.
   *
   * @example
   * const tabby = new TabbedUI('Tabby Cat');
   * document.body.append(tabby.container);
   * tabby.addTab(helpTabDefinition);
   * tabby.addTab(docTabDefinition);
   * tabby.addTab(contactTabDefinition);
   * tabby.goto(helpTabDefinition.name);  // Initial
   * tabby.next();
   * const entry = tabby.tabs.get(contactTabDefinition);
   * entry.classList.add('random-css');
   * entry.innerHTML += '<p>More contact info.</p>';
   */
  class TabbedUI {

    #container
    #id
    #idName
    #log
    #name
    #nav
    #navSpacer
    #nextButton
    #prevButton
    #style

    /**
     * @typedef {object} TabDefinition
     * @property {string} name - Tab name.
     * @property {string} content - HTML to be used as initial
     * content.
     */

    /**
     * @typedef {object} TabEntry
     * @property {string} name - Tab name.
     * @property {Element} label - Tab label, so CSS can be applied.
     * @property {Element} panel - Tab panel, so content can be
     * updated.
     */

    /**
     * Create a TabbedUI.
     * @param {string} name - Used to distinguish HTML elements and
     * @param {boolean} [debug] - Enable debug logging.
     * CSS classes.
     */
    constructor(name, debug = false) {
      this.#log = new Logger(`TabbedUI ${name}`, debug, false);
      this.#name = name;
      this.#idName = safeId(name);
      this.#id = `${this.#idName}-${crypto.randomUUID()}`;
      this.#container = document.createElement('section');
      this.#container.id = `${this.#id}-container`;
      this.#installControls();
      this.#container.append(this.#nav);
      this.#installStyle();
      this.#log.log(`${this.#name} constructed`);
    }

    /** Installs navigational control elements. */
    #installControls = () => {
      this.#nav = document.createElement('nav');
      this.#nav.id = `${this.#id}-controls`;
      this.#navSpacer = document.createElement('span');
      this.#navSpacer.classList.add('spacer');
      this.#prevButton = document.createElement('button');
      this.#nextButton = document.createElement('button');
      this.#prevButton.innerText = '←';
      this.#nextButton.innerText = '→';
      this.#prevButton.dataset.name = 'prev';
      this.#nextButton.dataset.name = 'next';
      this.#prevButton.addEventListener('click', () => this.prev());
      this.#nextButton.addEventListener('click', () => this.next());
      // XXX: Cannot get 'button' elements to style nicely, so
      // cheating by wrapping them in a label.
      const prevLabel = document.createElement('label');
      const nextLabel = document.createElement('label');
      prevLabel.append(this.#prevButton);
      nextLabel.append(this.#nextButton);
      this.#nav.append(this.#navSpacer, prevLabel, nextLabel);
    }

    /** @type {Element} */
    get container() {
      return this.#container;
    }

    /** @type {Map<string,TabEntry>} */
    get tabs() {
      const entries = new Map();
      for (const label of this.#nav.querySelectorAll(':scope > label[data-tabbed-name]')) {
        entries.set(label.dataset.tabbedName, {label: label});
      }
      for (const panel of this.container.querySelectorAll(`:scope > .${this.#idName}-panel`)) {
        entries.get(panel.dataset.tabbedName).panel = panel;
      }
      return entries;
    }

    /**
     * Installs basic CSS styles for the UI.
     */
    #installStyle = () => {
      this.#style = document.createElement('style');
      this.#style.id = `${this.#id}-style`;
      const styles = [
        `#${this.container.id} { flex-grow: 1; overflow-y: hidden; display: flex; flex-direction: column; }`,
        `#${this.container.id} > input { display: none; }`,
        `#${this.container.id} > nav { display: flex; flex-direction: row; }`,
        `#${this.container.id} > nav button { border-radius: 50%; }`,
        `#${this.container.id} > nav > label { cursor: pointer; margin-top: 1ex; margin-left: 1px; margin-right: 1px; padding: unset; color: unset !important; }`,
        `#${this.container.id} > nav > .spacer { margin-left: auto; margin-right: auto; border-right: 1px solid black; }`,
        `#${this.container.id} label::before { all: unset; }`,
        `#${this.container.id} label::after { all: unset; }`,
        // Panels are both flex items AND flex containers.
        `#${this.container.id} .${this.#idName}-panel { display: none; overflow-y: auto; flex-grow: 1; flex-direction: column; }`,
        '',
      ];
      this.#style.textContent = styles.join('\n');
      document.head.prepend(this.#style);
    }

    /**
     * Get the tab controls currently in the container.
     * @returns {Element[]} - Control elements for the tabs.
     */
    #getTabControls = () => {
      const controls = Array.from(this.container.querySelectorAll(':scope > input'));
      return controls;
    }

    /**
     * Switch to an adjacent tab.
     * @param {number} direction - Either 1 or -1.
     * @fires Event#change
     */
    #switchTab = (direction) => {
      const me = 'switchTab';
      this.#log.entered(me, direction);
      const controls = this.#getTabControls();
      this.#log.log('controls:', controls);
      let idx = controls.findIndex(item => item.checked);
      if (idx === NOT_FOUND) {
        idx = 0;
      } else {
        idx = (idx + direction + controls.length) % controls.length;
      }
      controls[idx].click();
      this.#log.leaving(me);
    }

    /**
     * @param {string} name - Human readable name for tab.
     * @param {string} idName - Normalized to be CSS class friendly.
     * @returns {Element} - Input portion of the tab.
     */
    #createInput = (name, idName) => {
      const me = 'createInput';
      this.#log.entered(me);
      const input = document.createElement('input');
      input.id = `${this.#idName}-input-${idName}`;
      input.name = `${this.#idName}`;
      input.dataset.tabbedId = `${this.#idName}-input-${idName}`;
      input.dataset.tabbedName = name;
      input.type = 'radio';
      this.#log.leaving(me, input);
      return input;
    }

    /**
     * @param {string} name - Human readable name for tab.
     * @param {Element} input - Input element associated with this label.
     * @param {string} idName - Normalized to be CSS class friendly.
     * @returns {Element} - Label portion of the tab.
     */
    #createLabel = (name, input, idName) => {
      const me = 'createLabel';
      this.#log.entered(me);
      const label = document.createElement('label');
      label.dataset.tabbedId = `${this.#idName}-label-${idName}`;
      label.dataset.tabbedName = name;
      label.htmlFor = input.id;
      label.innerText = `[${name}]`;
      this.#log.leaving(me, label);
      return label;
    }

    /**
     * @param {string} name - Human readable name for tab.
     * @param {string} idName - Normalized to be CSS class friendly.
     * @param {string} content - Raw HTML content to put into the
     * panel.
     * @returns {Element} - Panel portion of the tab.
     */
    #createPanel = (name, idName, content) => {
      const me = 'createPanel';
      this.#log.entered(me);
      const panel = document.createElement('div');
      panel.dataset.tabbedId = `${this.#idName}-panel-${idName}`;
      panel.dataset.tabbedName = name;
      panel.classList.add(`${this.#idName}-panel`);
      panel.innerHTML = content;
      this.#log.leaving(me, panel);
      return panel;
    }

    /**
     * Event handler for change events.  When the active tab changes,
     * this will resend an 'expose' event to the associated panel.
     * @param {Element} panel - The panel associated with this tab.
     * @param {Event} evt - The original change event.
     * @fires Event#expose
     */
    #onChange = (panel, evt) => {
      const me = 'onChange';
      this.#log.entered(me, evt, panel);
      panel.dispatchEvent(new Event('expose'));
      this.#log.leaving(me);
    }

    /**
     * Add a new tab to the UI.
     * @param {TabDefinition} tab - The new tab.
     */
    addTab(tab) {
      const me = 'addTab';
      this.#log.entered(me, tab);
      const {
        name,
        content,
      } = tab;
      const idName = safeId(name);
      const input = this.#createInput(name, idName);
      const label = this.#createLabel(name, input, idName);
      const panel = this.#createPanel(name, idName, content);
      input.addEventListener('change', this.#onChange.bind(this, panel));
      this.#nav.before(input);
      this.#navSpacer.before(label);
      this.container.append(panel);
      this.#style.textContent += `#${this.container.id} > input[data-tabbed-name="${name}"]:checked ~ nav > [data-tabbed-name="${name}"] { border-bottom: 3px solid black; }\n`;
      this.#style.textContent += `#${this.container.id} > input[data-tabbed-name="${name}"]:checked ~ div[data-tabbed-name="${name}"] { display: flex; }\n`;
      this.#log.leaving(me);
    }

    /**
     * Activate the next tab.
     */
    next() {
      const me = 'next';
      this.#log.entered(me);
      this.#switchTab(1);
      this.#log.leaving(me);
    }

    /**
     * Activate the previous tab.
     */
    prev() {
      const me = 'prev';
      this.#log.entered(me);
      this.#switchTab(-1);
      this.#log.leaving(me);
    }

    /**
     * Go to a tab by name.
     * @param {string} name - Name of the tab.
     */
    goto(name) {
      const me = 'goto';
      this.#log.entered(me, name);
      const controls = this.#getTabControls();
      const control = controls.find(item => item.dataset.tabbedName === name);
      control.click();
      this.#log.leaving(me);
    }

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
      const handlers = this._getHandlers(eventType);
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
     * @property {number} [topMarginPixels=0] - Used to determine if
     * scrolling should happen when {snapToTop} is false.
     * @property {number} [bottomMarginPixels=0] - Used to determin if
     * scrolling should happen when {snapToTop} is false.
     * @property {string} [topMarginCss='0'] - CSS applied to
     * `scrollMarginTop`.
     * @property {string} [bottomMarginCss='0'] - CSS applied to
     * `scrollMarginBottom`.
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
        name: this._name = 'Unnamed scroller',
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
        topMarginPixels: this._topMarginPixels = 0,
        bottomMarginPixels: this._bottomMarginPixels = 0,
        topMarginCss: this._topMarginCss = '0',
        bottomMarginCss: this._bottomMarginCss = '0',
        debug: this._debug = false,
        stackTrace: this._stackTrace = false,
      } = how);

      this._log = new Logger(`{${this._name}}`, this._debug, this._stackTrace);
      this._log.log('Scroller constructed', this);
    }

    /** @type {Dispatcher} */
    get dispatcher() {
      return this._dispatcher;
    }

    /** @type {Element} - Represents the current item. */
    get item() {
      const me = 'get item';
      this._log.entered(me);
      if (this._destroyed) {
        const msg = `Tried to work with destroyed ${this.constructor.name} on ${this._base}`;
        this._log.log(msg);
        throw new Error(msg);
      }
      const items = this._getItems();
      let item = items.find(this._matchItem);
      if (!item) {
        // We couldn't find the old id, so maybe it was rebuilt.  Make
        // a guess by trying the old index.
        const idx = this._historicalIdToIndex.get(this._currentItemId);
        if (typeof idx === 'number' && (0 <= idx && idx < items.length)) {
          item = items[idx];
          this._bottomHalf(item);
        }
      }
      this._log.leaving(me, item);
      return item;
    }

    /** @param {Element} val - Set the current item. */
    set item(val) {
      const me = 'set item';
      this._log.entered(me, val);
      this.dull();
      this._bottomHalf(val);
      this._log.leaving(me);
    }

    /**
     * Since the getter will try to validate the current item (since
     * it could have changed out from under us), it too can update
     * information.
     * @param {Element} val - Element to make current.
     */
    _bottomHalf(val) {
      const me = 'bottomHalf';
      this._log.entered(me, val);
      this._currentItemId = this._uid(val);
      const idx = this._getItems().indexOf(val);
      this._historicalIdToIndex.set(this._currentItemId, idx);
      this.shine();
      this._scrollToCurrentItem();
      this.dispatcher.fire('change', {});
      this._log.leaving(me);
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
      const me = 'getItems';
      this._log.entered(me);
      const items = [];
      for (const selector of this._selectors) {
        this._log.log(`considering ${selector}`);
        items.push(...this._base.querySelectorAll(selector));
      }
      if (this._debug) {
        this._log.starting('items');
        for (const item of items) {
          this._log.log(item);
        }
        this._log.finished('items');
      }
      this._log.leaving(me, `${items.length} items`);
      return items;
    }

    /**
     * Returns the uid for the current element.  Will use the
     * registered uidCallback function for this.
     * @param {Element} element - Element to identify.
     * @returns {string} - Computed uid for element.
     */
    _uid(element) {
      const me = 'uid';
      this._log.entered(me, element);
      let uid = null;
      if (element) {
        if (!element.dataset.spaId) {
          element.dataset.spaId = this._uidCallback(element);
        }
        uid = element.dataset.spaId;
      }
      this._log.leaving(me, uid);
      return uid;
    }

    /**
     * Checks if the element is the current one.  Useful as a callback
     * to Array.find.
     * @param {Element} element - Element to check.
     * @returns {boolean} - Whether or not element is the current one.
     */
    _matchItem = (element) => {
      const me = 'matchItem';
      this._log.entered(me);
      const res = this._currentItemId === this._uid(element);
      this._log.leaving(me, res);
      return res;
    }

    /**
     * Scroll the current item into the view port.  Depending on the
     * instance configuration, this could snap to the top, snap to the
     * bottom, or be a no-op.
     */
    _scrollToCurrentItem() {
      const me = 'scrollToCurrentItem';
      this._log.entered(me, this._snapToTop);
      const {item} = this;
      if (item) {
        item.style.scrollMarginTop = this._topMarginCss;
        if (this._snapToTop) {
          this._log.log('snapping to top');
          item.scrollIntoView(true);
        } else {
          item.style.scrollMarginBottom = this._bottomMarginCss;
          const rect = item.getBoundingClientRect();
          // If both scrolling happens, it means the item is too tall to
          // fit on the page, so the top is preferred.
          if (rect.bottom > (document.documentElement.clientHeight - this._bottomMarginPixels)) {
            this._log.log('scrolling up onto page');
            item.scrollIntoView(false);
          }
          if (rect.top < this._topMarginPixels) {
            this._log.log('scrolling down onto page');
            item.scrollIntoView(true);
          }
          // XXX: The following was added to support horizontal
          // scrolling in carousels.  Nothing seemed to break.
          // TODO(#132): Did find a side effect though: it can cause
          // an item being *left* to shift up if the
          // scrollMarginBottom has been set.
          item.scrollIntoView({block: 'nearest', inline: 'nearest'});
        }
      }
      this._log.leaving(me);
    }

    /**
     * Jump an item on the end of the collection.
     * @param {boolean} first - If true, the first item in the
     * collection, else, the last.
     */
    _jumpToEndItem(first) {
      const me = 'jumpToEndItem';
      this._log.entered(me, `first=${first}`);
      // Reset in case item was heavily modified
      this.item = this.item;

      const items = this._getItems();
      if (items.length) {
        // eslint-disable-next-line no-extra-parens
        let idx = first ? 0 : (items.length - 1);
        let item = items[idx];

        // Content of items is sometimes loaded lazily and can be
        // detected by having no innerText yet.  So start at the end
        // and work our way up to the last one loaded.
        if (!first) {
          while (!Scroller._isItemViewable(item)) {
            this._log.log('skipping item', item);
            idx -= 1;
            item = items[idx];
          }
        }
        this.item = item;
      }
      this._log.leaving(me);
    }

    /**
     * Move forward or backwards in the collection by at least n.
     * @param {number} n - How many items to move and the intended direction.
     * @fires 'out-of-range'
     */
    _scrollBy(n) {  // eslint-disable-line max-statements
      const me = 'scrollBy';
      this._log.entered(me, n);
      // Reset in case item was heavily modified
      this.item = this.item;

      const items = this._getItems();
      if (items.length) {
        let idx = items.findIndex(this._matchItem);
        this._log.log('initial idx', idx);
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
            this._log.log('skipping item', item);
            idx += n;
            item = items[idx];
          }
          this._log.log('final idx', idx);
          this.item = item;
        }
      }
      this._log.leaving(me);
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
      const me = 'destroy';
      this._log.entered(me);
      this.item = null;
      this._destroyed = true;
      this._log.leaving(me);
    }

  }

  /**
   * This class exists solely to avoid some `no-use-before-define`
   * linter issues.
   */
  class LinkedInGlobals {

    _navBarHeightPixels = 0;

    /** @type{number} - The height of the navbar in pixels. */
    get navBarHeightPixels() {
      return this._navBarHeightPixels;
    }

    /** @param {number} val - Set height of the navbar in pixels. */
    set navBarHeightPixels(val) {
      this._navBarHeightPixels = val;
    }

    /** @type {string} - The height of the navbar as CSS string. */
    get navBarHeightCss() {
      return `${this._navBarHeightPixels}px`;
    }

    /**
     * Scroll common sidebar into view and move focus to it.
     */
    focusOnSidebar = () => {
      const sidebar = document.querySelector('div.scaffold-layout__sidebar');
      if (sidebar) {
        sidebar.style.scrollMarginTop = this.navBarHeightCss;
        sidebar.scrollIntoView();
        focusOnElement(sidebar);
      }
    }

    /**
     * Scroll common aside (right-hand sidebar) into view and move
     * focus to it.
     */
    focusOnAside = () => {
      const aside = document.querySelector('aside.scaffold-layout__aside');
      if (aside) {
        aside.style.scrollMarginTop = this.navBarHeightCss;
        aside.scrollIntoView();
        focusOnElement(aside);
      }
    }

  }

  const linkedInGlobals = new LinkedInGlobals();

  /**
   * Self-decorating class useful for integrating with a hotkey service.
   *
   * @example
   * // Wrap an arrow function:
   * #foo = new Shortcut('c-c', 'Clear the console.', () => {
   *   console.clear();
   *   console.log('I did it!', this);
   * });
   *
   * // Search for instances:
   * const keys = [];
   * for (const prop of Object.values(this)) {
   *   if (prop instanceof Shortcut) {
   *     keys.push({seq: prop.seq, desc: prop.seq, func: prop});
   *   }
   * }
   * ... Send keys off to service ...
   */
  class Shortcut extends Function {

    /**
     * Wrap a function.
     * @param {string} seq - Key sequence to activate this function.
     * @param {string} desc - Human readable documenation about this
     * function.
     * @param {SimpleFunction} func - Function to wrap, usually in the
     * form of an arrow function.  Keep JS `this` magic in mind!
     */
    constructor(seq, desc, func) {
      super('return this.func();');
      const self = this.bind(this);
      self.seq = seq;
      self.desc = desc;
      this.func = func;
      return self;
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
     * @type {string} - What pathname part of the URL this page should
     * handle.  The special case of null is used by the {@link SPA}
     * class to represent global keys.
     */
    _pathname;

    /**
     * @type {string} - CSS selector for capturing clicks on this
     * page.  If overridden, then the class should also provide a
     * _onClick() method.
     */
    _onClickSelector = null;


    /**
     * Definition for keyboard shortcuts.
     * @typedef {object} Shortcut
     * @property {string} seq - Key sequence to activate.
     * @property {string} desc - Description that goes into the online help.
     * @property {SimpleFunction} func - Function to call, usually in the
     * form of `this.callback`.  Keep JS `this` magic in mind!
     */

    /** @type {Shortcut[]} - List of {@link Shortcut}s to register automatically. */
    get _autoRegisteredKeys() {  // eslint-disable-line class-methods-use-this
      return [];
    }

    // Private members.

    /** @type {KeyboardService} */
    _keyboard = new VM.shortcut.KeyboardService();

    /**
     * @type {Element} - Tracks which HTMLElement holds the `onclick`
     * function.
     */
    _onClickElement = null;

    /**
     * @type {IShortcutOptions} - Disables keys when focus is on an
     * element or info view.
     */
    static _navOption = {
      caseSensitive: true,
      condition: '!inputFocus && !inDialog',
    };

    /** Creata a Page instance. */
    constructor() {
      if (new.target === Page) {
        throw new TypeError('Abstract class; do not instantiate directly.');
      }
    }

    /**
     * Called when registered via {@link SPA}.
     * @param {SPA} spa - SPA instance that manages this Page.
     */
    start(spa) {
      this._spa = spa;
      this._log = new Logger(this.constructor.name, false, false);
      for (const {seq, func} of this.allShortcuts) {
        this._addKey(seq, func);
      }
    }

    /** @type {Shortcut[]} - List of {@link Shortcut}s to register. */
    get allShortcuts() {
      const shortcuts = [];
      for (const prop of Object.values(this)) {
        if (prop instanceof Shortcut) {
          shortcuts.push({seq: prop.seq, desc: prop.desc, func: prop});
          Object.defineProperty(prop, 'name', {value: name});
        }
      }
      return this._autoRegisteredKeys.concat(shortcuts);
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

    /** @type {string} - Describes what the header should be. */
    get infoHeader() {
      return this.constructor.name;
    }

    /**
     * @type {Shortcut[]} - The `key` and `desc` properties are
     * important here.
     */
    get keysDescriptions() {
      return this.allShortcuts;
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
    async _enableOnClick() {
      if (this._onClickSelector) {

        /**
         * Page is dynamically building, so keep watching it until the
         * element shows up.
         * @implements{Monitor}
         * @returns {Continuation} - Indicate whether done monitoring.
         */
        const monitor = () => {
          const element = document.querySelector(this._onClickSelector);
          if (element) {
            return {done: true, results: element};
          }
          return {done: false};
        };
        const what = {
          name: 'OnClick',
          base: document.body,
        };
        const how = {
          observeOptions: {childList: true, subtree: true},
          monitor: monitor,
        };
        const element = await otmot(what, how);
        this._onClickElement = element;
        this._onClickElement.addEventListener('click', this._onClick);
        // TODO(#46, #130): Find a better place for this.
        this._refresh();
      }
    }

    /**
     * Disables the 'click' handler for this view.
     */
    _disableOnClick() {
      this._onClickElement?.removeEventListener('click', this._onClick);
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
    _onClick = (evt) => {  // eslint-disable-line no-unused-vars
      const msg = `Found a bug! ${this.constructor.name} wants to handle clicks, but forgot to create a handler.`;
      this._spa.addError(msg);
      this._spa.addErrorMarker();
    }

    /**
     * Override this function in subclasses to take action upon
     * becoming the current view again.
     */
    _refresh() {
      this._log.log('In base refresh.');
    }

  }

  /**
   * Class for handling aspects common across LinkedIn.
   * This includes things like the global nav bar, information view,
   * etc.
   */
  class Global extends Page {

    _pathname = null;

    /** @inheritdoc */
    get _autoRegisteredKeys() {  // eslint-disable-line class-methods-use-this
      return [
        {seq: '?', desc: 'Show this information view', func: Global._help},
        {seq: '/', desc: 'Go to Search box', func: Global._gotoSearch},
        {seq: 'g h', desc: 'Go Home (aka, Feed)', func: Global._goHome},
        {seq: 'g m', desc: 'Go to My Network', func: Global._gotoMyNetwork},
        {seq: 'g j', desc: 'Go to Jobs', func: Global._gotoJobs},
        {seq: 'g g', desc: 'Go to Messaging', func: Global._gotoMessaging},
        {seq: 'g n', desc: 'Go to Notifications', func: Global._gotoNotifications},
        {seq: 'g p', desc: 'Go to Profile (aka, Me)', func: Global._gotoProfile},
        {seq: 'g b', desc: 'Go to Business', func: Global._gotoBusiness},
        {seq: 'g l', desc: 'Go to Learning', func: Global._gotoLearning},
        {seq: ',', desc: 'Focus on the left/top sidebar (not always present)', func: linkedInGlobals.focusOnSidebar},
        {seq: '.', desc: 'Focus on the right/bottom sidebar (not always present)', func: linkedInGlobals.focusOnAside},
      ];
    }

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

    /** @inheritdoc */
    get _autoRegisteredKeys() {
      return [
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
        {seq: 'v R', desc: 'View reposts of the current post', func: this._viewReposts},
        {seq: '=', desc: 'Open the closest <button class="spa-meatball">⋯</button> menu', func: this._openMeatballMenu},
        {seq: 'L', desc: 'Like post or comment', func: this._likePostOrComment},
        {seq: 'C', desc: 'Comment on current post or comment', func: this._commentOnPostOrComment},
        {seq: 'R', desc: 'Repost current post', func: this._repost},
        {seq: 'S', desc: 'Send the post privately', func: this._sendPost},
        {seq: 'P', desc: 'Go to the share box to start a post or <kbd>TAB</kbd> to the other creator options', func: Feed._gotoShare},
        {seq: 'X', desc: 'Toggle hiding current post', func: this._togglePost},
        {seq: 'J', desc: 'Toggle hiding then next post', func: this._nextPostPlus},
        {seq: 'K', desc: 'Toggle hiding then previous post', func: this._prevPostPlus},
      ];
    }

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
      this._postScroller.dispatcher.on('out-of-range', linkedInGlobals.focusOnSidebar);
      this._postScroller.dispatcher.on('change', this._onPostChange);
    }

    /** @inheritdoc */
    _onClick = (evt) => {
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
        this._commentScroller.dispatcher.on('out-of-range', this._returnToPost);
      }
      return this._commentScroller;
    }

    /**
     * Reset the comment scroller.
     */
    _clearComments() {
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
    _returnToPost = () => {
      this._posts.item = this._posts.item;
    }

    /**
     * Removes the comments {@link Scroller}.
     */
    _onPostChange = () => {
      this._clearComments();
    }

    /**
     * Select the next post.
     */
    _nextPost = () => {
      this._posts.next();
    }

    /**
     * Toggle hiding current post then select the next.
     */
    _nextPostPlus = async () => {

      /**
       * Trigger function for {@link otrot}.
       */
      const trigger = () => {
        this._togglePost();
        this._nextPost();
      };
      // XXX: Need to remove the highlights before otrot sees it
      // because it affects the .clientHeight.
      this._posts.dull();
      this._comments?.dull();
      if (this._posts.item) {
        const what = {
          name: 'nextPostPlus',
          base: this._posts.item,
        };
        const how = {
          trigger: trigger,
          timeout: 3000,
        };
        await otrot(what, how);
        this._posts.show();
      } else {
        trigger();
      }
    }

    /**
     * Select the previous post.
     */
    _prevPost = () => {
      this._posts.prev();
    }

    /**
     * Toggle hiding the current post then select the previous.
     */
    _prevPostPlus = () => {
      this._togglePost();
      this._prevPost();
    }

    /**
     * Select the next comment.
     */
    _nextComment = () => {
      this._comments.next();
    }

    /**
     * Select the previous comment.
     */
    _prevComment = () => {
      this._comments.prev();
    }

    /**
     * Toggles hiding the current post.
     */
    _togglePost = () => {
      clickElement(this._posts.item, ['button[aria-label^="Dismiss post"]', 'button[aria-label^="Undo and show"]']);
    }

    /**
     * Show more comments on the current post.
     */
    _showComments = () => {
      if (!clickElement(this._comments.item, ['button.show-prev-replies'])) {
        clickElement(this._posts.item, ['button[aria-label*="comment"]']);
      }
    }

    /**
     * Show more content of the current post or comment.
     */
    _seeMore = () => {
      const el = this._comments.item ?? this._posts.item;
      clickElement(el, ['button[aria-label^="see more"]']);
    }

    /**
     * Like the current post or comment via social action menu.
     */
    _likePostOrComment = () => {
      const el = this._comments.item ?? this._posts.item;
      clickElement(el, ['button[aria-label^="Open reactions menu"]']);
    }

    /**
     * Comment on current post or comment via social action menu.
     */
    _commentOnPostOrComment = () => {
      const el = this._comments.item ?? this._posts.item;
      clickElement(el, ['button[aria-label^="Comment"]', 'button[aria-label^="Reply"]']);
    }

    /**
     * Repost current post via social action menu.
     */
    _repost = () => {
      const el = this._posts.item;
      clickElement(el, ['button.social-reshare-button']);
    }

    /**
     * Send current post privately via social action menu.
     */
    _sendPost = () => {
      const el = this._posts.item;
      clickElement(el, ['button.send-privately-button']);
    }

    /**
     * Select the first post or comment.
     */
    _firstPostOrComment = () => {
      if (this._hasActiveComment) {
        this._comments.first();
      } else {
        this._posts.first();
      }
    }

    /**
     * Select the last post or comment.
     */
    _lastPostOrComment = () => {
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
      share.style.scrollMarginTop = linkedInGlobals.navBarHeightCss;
      share.scrollIntoView();
      share.querySelector('button').focus();
    }

    /**
     * Open the (⋯) menu for the current item.
     */
    _openMeatballMenu = () => {
      // XXX: In this case, the identifier is on an svg element, not
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
    _focusBrowser = () => {
      const el = this._comments.item ?? this._posts.item;
      this._posts.show();
      this._comments?.show();
      focusOnElement(el);
    }

    /**
     * Navigate the the stand-alone page for the current post.
     */
    _viewPost = () => {
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
    _viewReactions = () => {
      const el = this._comments.item ?? this._posts.item;
      clickElement(el, ['button.comments-comment-social-bar__reactions-count,button.feed-shared-social-action-bar-counts,button.social-details-social-counts__count-value']);
    }

    /**
     * Open the Reposts summary pop-up.
     */
    _viewReposts = () => {
      clickElement(this._posts.item, ['button[aria-label*="repost"]']);
    }

  }

  /**
   * Class for handling the base MyNetwork page.
   *
   * TODO(#142): WIP
   *
   * This page takes 3-4 seconds to load every time.  Revisits are
   * likely to take a while.
   */
  class MyNetwork extends Page {

    _pathname = '/mynetwork/';

    #sectionsScroller

    /** @type{Scroller~What} */
    static #sectionsWhat = {
      name: 'MyNetwork sections',
      base: document.body,
      // See https://stackoverflow.com/questions/77146570
      selectors: ['main > ul > li, main > :where(section, div)'],
    };

    /** @type{Scroller~How} */
    static _sectionsHow = {
      uidCallback: MyNetwork._uniqueIdentifier,
      classes: ['tom'],
      snapToTop: true,
    };

    /** Create MyNetwork controller. */
    constructor() {
      super();
      this.#sectionsScroller = new Scroller(MyNetwork.#sectionsWhat, MyNetwork._sectionsHow);
      this.#sectionsScroller.dispatcher.on('out-of-range', linkedInGlobals.focusOnSidebar);
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

    /** @type {Scroller} */
    get _sections() {
      return this.#sectionsScroller;
    }

    nextSection = new Shortcut('j', 'Next section', () => {
      this._sections.next();
    });

    prevSection = new Shortcut('k', 'Previous section', () => {
      this._sections.prev();
    });

    firstSection = new Shortcut('<', 'Go to the first section', () => {
      this._sections.first();
    });

    lastSection = new Shortcut('>', 'Go to the last section', () => {
      this._sections.last();
    });

    focusBrowser = new Shortcut('f', 'Change browser focus to current section', () => {
      focusOnElement(this._sections.item);
    });

    activateItem = new Shortcut('Enter', 'Activate the current item (e.g., <i>See all</i>)', () => {
      const item = this._sections.item;
      clickElement(item, ['[aria-label^="See all"]']);
    });

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

    /** @inheritdoc */
    get _autoRegisteredKeys() {
      return [
        {seq: 'j', desc: 'Next section', func: this._nextSection},
        {seq: 'k', desc: 'Previous section', func: this._prevSection},
        {seq: 'n', desc: 'Next job', func: this._nextJob},
        {seq: 'p', desc: 'Previous job', func: this._prevJob},
        {seq: '<', desc: 'Go to to first section or job', func: this._firstSectionOrJob},
        {seq: '>', desc: 'Go to last section or job currently loaded', func: this._lastSectionOrJob},
        {seq: 'f', desc: 'Change browser focus to current section or job', func: this._focusBrowser},
        {seq: 'Enter', desc: 'Activate the current job (click on it)', func: this._activateJob},
        {seq: 'l', desc: 'Load more sections (or <i>More jobs for you</i> items)', func: this._loadMoreSections},
        {seq: 'S', desc: 'Toggle saving job', func: this._toggleSaveJob},
        {seq: 'X', desc: 'Toggle dismissing job', func: this._toggleDismissJob},
      ];
    }

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
      selectors: [':scope > ul > li', ':scope > div > ul > li', 'div.jobs-home-recent-searches__list-toggle', 'div.discovery-templates-vertical-list__footer'],
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
      this._sectionScroller.dispatcher.on('out-of-range', linkedInGlobals.focusOnSidebar);
      this._sectionScroller.dispatcher.on('change', this._onChange);
      this._sectionsMO1 = new MutationObserver(this._mutationHandler);
      this._sectionsMO2 = new MutationObserver(this._mutationHandler);
    }

    /** @inheritdoc */
    _onClick = (evt) => {
      const section = evt.target.closest('section');
      if (section && section !== this._sections.item) {
        this._sections.item = section;
      }
    }

    /** @inheritdoc */
    _refresh() {
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
      const me = 'get jobs';
      this._log.entered(me, this._jobScroller);
      if (!this._jobScroller && this._sections.item) {
        this._jobScroller = new Scroller({base: this._sections.item, ...Jobs._jobsWhat}, Jobs._jobsHow);
        this._jobScroller.dispatcher.on('out-of-range', this._returnToSection);
      }
      this._log.leaving(me, this._jobScroller);
      return this._jobScroller;
    }

    /**
     * Reset the jobs scroller.
     */
    _clearJobs() {
      const me = 'clearJobs';
      this._log.entered(me, this._jobScroller);
      if (this._jobScroller) {
        this._jobScroller.destroy();
        this._jobScroller = null;
      }
      this._log.leaving(me);
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
    _returnToSection = () => {
      this._sections.item = this._sections.item;
    }

    /**
     * Updates {@link Jobs} specific watcher text and removes the jobs
     * {@link Scroller}.
     */
    _onChange = () => {
      this._sectionWatchText = this._sections.item?.innerText.trim().split('\n')[0];
      this._clearJobs();
    }

    /**
     * Recover scroll position after elements were recreated.
     * @param {number} topScroll - Where to scroll to.
     */
    _resetScroll(topScroll) {
      const me = 'resetScroll';
      this._log.entered(me, topScroll);
      // Explicitly setting jobs.item below will cause it to
      // scroll to that item.  We do not want to do that if
      // the user is manually scrolling.
      const savedJob = this._jobs?.item;
      this._sections.shine();
      // Section was probably rebuilt, assume jobs scroller is invalid.
      this._clearJobs();
      if (savedJob) {
        this._jobs.item = savedJob;
      }
      document.documentElement.scrollTop = topScroll;
      this._log.leaving(me);
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
    _mutationHandler = (records) => {
      const me = 'mutationHandler';
      this._log.entered(me, `records: ${records.length} type: ${records[0].type} match-text: ${this._sectionWatchText}`);
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
            const {oldValue} = record;
            const newValue = record.target.attributes[attr].value;
            const same = oldValue === newValue;
            if (!same) {
              this._log.log('via attributes', record.target, `\nold: ${oldValue}\nnew:${newValue}`);
              this._resetScroll(document.documentElement.scrollTop);
            }
          }
        }
      }
      this._log.leaving(me);
    }

    /**
     * Select the next section.
     */
    _nextSection = () => {
      this._sections.next();
    }

    /**
     * Select the previous section.
     */
    _prevSection = () => {
      this._sections.prev();
    }

    /**
     * Select the next job.
     */
    _nextJob = () => {
      this._jobs.next();
    }

    /**
     * Select the previous job.
     */
    _prevJob = () => {
      this._jobs.prev();
    }

    /**
     * Select the first section or job.
     */
    _firstSectionOrJob = () => {
      if (this._hasActiveJob) {
        this._jobs.first();
      } else {
        this._sections.first();
      }
    }

    /**
     * Select the last section or job.
     */
    _lastSectionOrJob = () => {
      if (this._hasActiveJob) {
        this._jobs.last();
      } else {
        this._sections.last();
      }
    }

    /**
     * Change browser focus to the current section or job.
     */
    _focusBrowser = () => {
      const el = this._jobs.item ?? this._sections.item;
      this._sections.show();
      this._jobs?.show();
      focusOnElement(el);
    }

    /**
     * Load more sections (or jobs in some cases).
     */
    _loadMoreSections = async () => {
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
      await otrot(what, how);
      this._resetScroll(savedScrollTop);
    }

    /**
     * Activate the current job.
     */
    _activateJob = () => {
      const job = this._jobs?.item;
      if (job) {
        if (!clickElement(job, ['div[data-view-name]', 'a', 'button'])) {
          this._spa.dumpInfoAboutElement(job, 'job');
        }
      } else {
        // Again, because we use Enter as the hotkey for this action.
        document.activeElement.click();
      }
    }

    /**
     * Toggles saving the current job.
     */
    _toggleSaveJob = () => {
      clickElement(this._jobs?.item, ['button[aria-label^="Save job"]', 'button[aria-label^="Unsave job"]']);
    }

    /**
     * Toggles dismissing the current job.
     */
    _toggleDismissJob = async () => {
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
        await otrot(what, how);
        this._jobs.item = savedJob;
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

    /** @inheritdoc */
    get _autoRegisteredKeys() {
      return [
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
    }

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
      this._notificationScroller.dispatcher.on('out-of-range', linkedInGlobals.focusOnSidebar);
    }

    /** @inheritdoc */
    _onClick = (evt) => {
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
        content = element.children[CONTENT_INDEX].innerText;
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
    _nextNotification = () => {
      this._notifications.next();
    }

    /**
     * Select the previous notification.
     */
    _prevNotification = () => {
      this._notifications.prev();
    }

    /**
     * Change browser focus to the current notification.
     */
    _focusBrowser = () => {
      this._notifications.show();
      focusOnElement(this._notifications.item);
    }

    /**
     * Select the first notification.
     */
    _firstNotification = () => {
      this._notifications.first();
    }

    /**
     * Select the last notification.
     */
    _lastNotification = () => {
      this._notifications.last();
    }

    /**
     * Open the (⋯) menu for the current notification.
     */
    _openMeatballMenu = () => {
      clickElement(this._notifications.item, ['button[aria-label^="Settings menu"]']);
    }

    /**
     * Activate the current notification.
     */
    _activateNotification = () => {
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
    _deleteNotification = async () => {
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
        await otrot(what, how);
        this._notifications.shine();
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
      function trigger() {
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
      };

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

  /** Base class for {@link SPA} instance details. */
  class SPADetails {

    /**
     * An issue that happened during construction.  SPA will ask for
     * them and add them to the Errors tab.
     * @typedef {object} SetupIssue
     * @property {string[]} messages - What to pass to {@link SPA.addError}.
     */

    /** @type {SetupIssue[]} */
    _setupIssues = [];

    /**
     * @type {string} - CSS selector to monitor if self-managing URL
     * changes.  The selector must resolve to an element that, once it
     * exists, will continue to exist for the lifetime of the SPA.
     */
    urlChangeMonitorSelector = 'body';

    /** @type {TabbedUI} */
    _ui = null;

    /** Create a SPADetails instance. */
    constructor() {
      if (new.target === SPADetails) {
        throw new TypeError('Abstract class; do not instantiate directly.');
      }

      this._log = new Logger(this.constructor.name, false, false);
      this._id = safeId(`${this.constructor.name}-${crypto.randomUUID()}`);
      this.dispatcher = new Dispatcher('errors', 'news');
    }

    /**
     * Called by SPA instance during its construction to allow post
     * instantiation stuff to happen.  If overridden in a subclass,
     * this should definitely be called via super.
     */
    init() {
      this.dispatcher.on('errors', this._errors);
      this.dispatcher.on('news', this._news);
    }

    /**
     * Called by SPA instance when initialization is done.  Subclasses
     * should call via super.
     */
    done() {
      const me = 'done';
      this._log.entered(me);
      this._log.leaving(me);
    }

    /** @type {TabbedUI} */
    get ui() {
      return this._ui;
    }

    /** @param {TabbedUI} val - UI instance. */
    set ui(val) {
      this._ui = val;
    }

    /**
     * Handles notifications about changes to the {@link SPA} Errors
     * tab content.
     * @param {number} count - Number of errors currently logged.
     */
    _errors = (count) => {
      this._log.log('errors:', count);
    }

    /**
     * Handles notifications about activity on the {@link SPA} News tab.
     * @param {object} data - Undefined at this time.
     */
    _news = (data) => {
      this._log.log('news', data);
    }

    /** @type {SetupIssue[]} */
    get setupIssues() {
      return this._setupIssues;
    }

    /**
     * Collects {SetupIssue}s for reporting.
     * @param {string} ...msgs - Text to report.
     */
    addSetupIssue(...msgs) {
      for (const msg of msgs) {
        this._log.log('Setup issue:', msg);
      }
      this._setupIssues.push(msgs);
    }

    /**
     * @implements {SPA~TabGenerator}
     * @returns {TabbedUI~TabDefinition} - Where to find documentation
     * and file bugs.
     */
    docTab() {
      this._log.log('docTab is not implemented');
      throw new Error('Not implemented.');
      return {  // eslint-disable-line no-unreachable
        name: 'Not implemented.',
        content: 'Not implemented.',
      };
    }

    /**
     * @implements {SPA~TabGenerator}
     * @returns {TabbedUI~TabDefinition} - License information.
     */
    licenseTab() {
      this._log.log('licenseTab is not implemented');
      throw new Error('Not implemented.');
      return {  // eslint-disable-line no-unreachable
        name: 'Not implemented.',
        content: 'Not implemented.',
      };
    }

  }

  /** LinkedIn specific information. */
  class LinkedIn extends SPADetails {

    urlChangeMonitorSelector = 'div.authentication-outlet';

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

    _navBarScrollerFixups = [
      Feed._postsHow,
      Feed._commentsHow,
      MyNetwork._sectionsHow,
      Jobs._sectionsHow,
      Jobs._jobsHow,
      Notifications._notificationsHow,
    ];

    /**
     * Create a LinkedIn instance.
     * @param {LinkedInGlobals} globals - Instance of a helper class to avoid
     * circular dependencies.
     */
    constructor(globals) {
      super();
      this._globals = globals;
      this.ready = this._waitUntilPageLoadedEnough();
    }

    /** @inheritdoc */
    done() {
      super.done();
      const me = 'done';
      this._log.entered(me);
      const licenseEntry = this.ui.tabs.get('License');
      licenseEntry.panel.addEventListener('expose', this._licenseHandler);
      this._log.leaving(me);
    }

    /**
     * @type {string} - The element.id used to identify the help
     * pop-up.
     */
    get helpId() {
      return this._infoId;
    }

    /** @param {string} val - Set the value of the help element.id. */
    set helpId(val) {
      this._infoId = val;
    }

    /**
     * @typedef {object} LicenseData
     * @property {string} name - Name of the license.
     * @property {string} url - License URL.
     */

    /** @type{LicenseData} */
    get licenseData() {
      const me = 'licenseData';
      this._log.entered(me);

      if (!this._licenseData) {
        // Different userscript managers do this differently.
        let license = GM.info.script.license;
        if (!license) {
          const magic = '// @license ';

          // Try Tampermonkey's way.
          const header = GM.info.script.header;
          if (header) {
            const line = header.split('\n').find(l => l.startsWith(magic));
            if (line) {
              license = line.slice(magic.length).trim();
            }
          }
        }

        if (!license) {
          // eslint-disable-next-line no-magic-numbers
          this.addSetupIssue('Unable to extract license information from the userscript.', JSON.stringify(GM.info.script, null, 2));
          license = 'Unable to extract: Please file a bug;';
        }

        const [name, url] = license.split(';');
        this._licenseData = {
          name: name.trim(),
          url: url.trim(),
        };
      }

      this._log.leaving(me, this._licenseData);
      return this._licenseData;
    }

    /** Hang out until enough HTML has been built to be useful. */
    async _waitUntilPageLoadedEnough() {
      const me = 'waitOnPageLoadedEnough';
      this._log.entered(me);

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

      this._log.leaving(me);
    }

    /** Do the bits that were waiting on the page. */
    _finishConstruction() {
      const me = 'finishConstruction';
      this._log.entered(me);

      this._addLitStyle();
      this._addToolMenuItem();
      this._setNavBarInfo();

      this._log.leaving(me);
    }

    /**
     * Lazily load license text when exposed.
     * @param {Event} evt - The 'expose' event.
     */
    _licenseHandler = async (evt) => {
      const me = 'licenseHandler';
      this._log.entered(me, evt.target);

      // Probably should debounce this.  If the user visits this tab
      // twice fast enough, they end up with two copies loaded.
      // Amusing, but probably should be resilient.
      if (!this._licenseLoaded) {
        const info = document.createElement('p');
        info.innerHTML = '<i>Loading license...</i>';
        evt.target.append(info);
        const {name, url} = this.licenseData;

        const response = await fetch(url);
        if (response.ok) {
          const license = document.createElement('iframe');
          license.style.flexGrow = 1;
          license.title = name;
          license.sandbox = '';
          license.srcdoc = await response.text();
          info.replaceWith(license);
          this._licenseLoaded = true;
        }
      }

      this._log.leaving(me);
    }

    /**
     * Create CSS styles for stuff specific to LinkedIn Tool.
     */
    _addLitStyle() {
      const style = document.createElement('style');
      style.id = `${this._id}-style`;
      style.textContent += '.lit-news { position: absolute; bottom: 14px; right: -5px; width: 16px; height: 16px; border-radius: 50%; border: 5px solid green; }\n';
      document.head.prepend(style);
    }

    /** Add a menu item to the global nav bar. */
    _addToolMenuItem() {
      const me = 'addToolMenuItem';
      this._log.entered(me);

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
      const navMe = ul.querySelector('li .global-nav__me').closest('li');
      if (navMe) {
        navMe.after(li);
      } else {
        // If the site changed and we cannot insert ourself after the
        // Me menu item, then go first.
        ul.prepend(li);
        this.addSetupIssue('Unable to find the Profile navbar item.', 'LIT menu installed in non-standard location.');
      }
      const button = li.querySelector('button');
      button.addEventListener('click', () => {
        const help = document.querySelector(`#${this.helpId}`);
        help.showModal();
        help.dispatchEvent(new Event('open'));
      });
      this._log.leaving(me);
    }

    /** Set some useful global variables. */
    _setNavBarInfo() {
      const fudgeFactor = 4;

      this._globals.navBarHeightPixels = this._navbar.clientHeight + fudgeFactor;
      // XXX: These {Scroller~How} items are static, so they need to
      // be configured after we figure out what the values should be.
      for (const how of this._navBarScrollerFixups) {
        how.topMarginPixels = this._globals.navBarHeightPixels;
        how.topMarginCss = this._globals.navBarHeightCss;
        how.bottomMarginCss = '3em';
      }
    }

    /** @inheritdoc */
    _errors = (count) => {
      const me = 'errors';
      this._log.entered(me, count);
      const button = document.querySelector('#lit-nav-button');
      const toggle = button.querySelector('.notification-badge');
      const badge = button.querySelector('.notification-badge__count');
      badge.innerText = `${count}`;
      if (count) {
        toggle.classList.add('notification-badge--show');
      } else {
        toggle.classList.remove('notification-badge--show');
      }
      this._log.leaving(me);
    }

    /** @inheritdoc */
    docTab() {
      const me = 'docTab';
      this._log.entered(me);
      const baseGhUrl = 'https://github.com/nexushoratio/userscripts';
      const baseGfUrl = 'https://greasyfork.org/en/scripts/472097-linkedin-tool';
      const issuesLink = `${baseGhUrl}/labels/linkedin-tool`;
      const newIssueLink = `${baseGhUrl}/issues/new/choose`;
      const newGfIssueLink = `${baseGfUrl}/feedback`;
      const releaseNotesLink = `${baseGfUrl}/versions`;
      const content = [
        `<p>This is help for the <b>${GM.info.script.name}</b> userscript, a type of add-on.  It is not associated with LinkedIn Corporation in any way.</p>`,
        `<p>Documentation can be found on <a href="${GM.info.script.supportURL}">GitHub</a>.  Release notes are automatically generated on <a href="${releaseNotesLink}">Greasy Fork</a>.</p>`,
        `<p>Existing issues are also on GitHub <a href="${issuesLink}">here</a>.</p>`,
        `<p>New issues or feature requests can be filed on GitHub (account required) <a href="${newIssueLink}">here</a>.  Then select the appropriate issue template to get started.  Or, on Greasy Fork (account required) <a href="${newGfIssueLink}">here</a>.  Review the <b>Errors</b> tab for any useful information.</p>`,
        '',
      ];
      const tab = {
        name: 'Information',
        content: content.join('\n'),
      };
      this._log.leaving(me, tab);
      return tab;
    }

    /** @inheritdoc */
    licenseTab() {
      const me = 'licenseTab';
      this._log.entered(me);

      const {name, url} = this.licenseData;
      const tab = {
        name: 'License',
        content: `<p><a href="${url}">${name}</a></p>`,
      };

      this._log.leaving(me, tab);
      return tab;
    }

  }

  /**
   * A userscript driver for working with a single-page application.
   *
   * Generally, a single instance of this class is created, and all
   * instances of {Page} are registered to it.  As the user navigates
   * through the single-page application, this will react to it and
   * enable and disable view specific handling as appropriate.
   */
  class SPA {

    static _errorMarker = '---';

    /** @type {Page} - A special {Page} that handles global keys. */
    _global = null;

    /** @type {Page} - Current {Page}. */
    _page = null;

    /**
     * @type {Map<string,Page>} - {Page}s mapped by the pathname they
     * support.
     */
    _pages = new Map();

    /** @type {Element} - The most recent element to receive focus. */
    _lastInputElement = null;

    /** @type {KeyboardService} */
    _helpKeyboard = null;

    /**
     * Create a SPA.
     * @param {SPADetails} details - Implementation specific details.
     */
    constructor(details) {
      this._name = `${this.constructor.name}: ${details.constructor.name}`;
      this._id = safeId(`${this._name}-${crypto.randomUUID()}`);
      this._log = new Logger(this._name, false, false);
      this._details = details;
      this._details.init(this);
      this._installNavStyle();
      this._initializeHelpView();
      for (const issue of details.setupIssues) {
        this._log.log('issue:', issue);
        for (const error of issue) {
          this.addError(error);
        }
        this.addErrorMarker();
      }
      document.addEventListener('focus', this._onFocus, true);
      document.addEventListener('urlchange', this._onUrlChange, true);
      this._startUrlMonitor();
      this._details.done();
    }

    /**
     * Tampermonkey was the first(?) userscript manager to provide
     * events about URLs changing.  Hence the need for `@grant
     * window.onurlchange` in the UserScript header.
     * @fires Event#urlchange
     */
    _startUserscriptManagerUrlMonitor() {
      this._log.log('Using Userscript Manager provided URL monitor.');
      window.addEventListener('urlchange', (info) => {
        // The info that TM gives is not really an event.  So we turn
        // it into one and throw it again, this time onto `document`
        // where something is listening for it.
        const newUrl = new URL(info.url);
        const evt = new CustomEvent('urlchange', {detail: {url: newUrl}});
        document.dispatchEvent(evt);
      });
    }

    /**
     * Install a long lived MutationObserver that watches
     * {SPADetails.urlChangeMonitorSelector}.  Whenever it is
     * triggered, it will check to see if the current URL has changed,
     * and if so, send an appropriate event.
     * @fires Event#urlchange
     */
    async _startMutationObserverUrlMonitor() {
      this._log.log('Using MutationObserver for monitoring URL changes.');

      const observeOptions = {childList: true, subtree: true};

      /**
       * Watch for the initial {SPADetails.urlChangeMonitorSelector}
       * to show up.
       * @implements {Monitor}
       * @returns {Continuation} - Indicate whether done monitoring.
       */
      const monitor = () => {
        // The default selector is 'body', so we need to query
        // 'document', not 'document.body'.
        const element = document.querySelector(this._details.urlChangeMonitorSelector);
        if (element) {
          return {done: true, results: element};
        }
        return {done: false};
      };
      const what = {
        name: 'SPA URL initializer observer',
        base: document.body,
      };
      const how = {
        observeOptions: observeOptions,
        monitor: monitor,
      };
      const element = await otmot(what, how);
      this._log.log('element exists:', element);

      this._oldUrl = new URL(window.location);
      new MutationObserver(() => {
        const newUrl = new URL(window.location);
        if (this._oldUrl.href !== newUrl.href) {
          const evt = new CustomEvent('urlchange', {detail: {url: newUrl}});
          this._oldUrl = newUrl;
          document.dispatchEvent(evt);
        }
      }).observe(element, observeOptions);
    }

    /**
     * Select which way to monitor the URL for changes and start it.
     */
    _startUrlMonitor() {
      if (window.onurlchange === null) {
        this._startUserscriptManagerUrlMonitor();
      } else {
        this._startMutationObserverUrlMonitor();
      }
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
    _onFocus = (evt) => {
      if (this._lastInputElement && evt.target !== this._lastInputElement) {
        this._lastInputElement = null;
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
    _onUrlChange = (evt) => {
      this.activate(evt.detail.url.pathname);
    }

    /**
     * Configure handlers for the help view.
     */
    _addInfoViewHandlers() {
      const errors = document.querySelector(`#${this._infoId} [data-spa-id="errors"]`);
      errors.addEventListener('change', (evt) => {
        const count = evt.target.value.split('\n').filter(x => x === SPA._errorMarker).length;
        this._details.dispatcher.fire('errors', count);
        this._updateInfoErrorsLabel(count);
      });
    }

    /**
     * Create the CSS styles used for indicating the current items.
     */
    _installNavStyle() {
      const style = document.createElement('style');
      style.id = safeId(`${this._id}-nav-style`);
      const styles = [
        '.tom { border-color: orange !important; border-style: solid !important; border-width: medium !important; }',
        '.dick { border-color: red !important; border-style: solid !important; border-width: thin !important; }',
        '',
      ];
      style.textContent = styles.join('\n');
      document.head.append(style);
    }

    /**
     * Create and configure a separate {@link KeyboardService} for the
     * help view.
     */
    _initializeHelpKeyboard() {
      this._helpKeyboard = new VM.shortcut.KeyboardService();
      this._helpKeyboard.register('c-right', this._nextTab);
      this._helpKeyboard.register('c-left', this._prevTab);
    }

    /**
     * @callback TabGenerator
     * @returns {TabbedUI~TabDefinition}
     */

    /**
     * Add CSS styling for use with the help view.
     */
    _addInfoStyle() {
      const style = document.createElement('style');
      style.id = safeId(`${this._id}-info-style`);
      const styles = [
        `#${this._infoId}:modal { height: 100%; width: 65rem; display: flex; flex-direction: column; }`,
        `#${this._infoId} .left { text-align: left; }`,
        `#${this._infoId} .right { text-align: right; }`,
        `#${this._infoId} .spa-instructions { display: flex; flex-direction: row; padding-bottom: 1ex; border-bottom: 1px solid black; margin-bottom: 5px; }`,
        `#${this._infoId} .spa-instructions > span { flex-grow: 1; }`,
        `#${this._infoId} textarea[data-spa-id="errors"] { flex-grow: 1; resize: none; }`,
        `#${this._infoId} .spa-danger { background-color: red; }`,
        `#${this._infoId} .spa-current-page { background-color: lightgray; }`,
        `#${this._infoId} kbd { font-size: 0.85em; padding: 0.07em; border-width: 1px; border-style: solid; }`,
        `#${this._infoId} p { margin-bottom: 1em; }`,
        `#${this._infoId} th { padding-top: 1em; text-align: left; }`,
        `#${this._infoId} td:first-child { white-space: nowrap; text-align: right; padding-right: 0.5em; }`,
        // The "color: unset" addresses dimming because these
        // display-only buttons are disabled.
        `#${this._infoId} button { border-width: 1px; border-style: solid; border-radius: 1em; color: unset; padding: 3px; }`,
        `#${this._infoId} button.spa-meatball { border-radius: 50%; }`,
        '',
      ];
      style.textContent = styles.join('\n');
      document.head.prepend(style);
    }

    /**
     * Create the Info dialog and add some static information.
     * @returns {Element} - Initialized dialog.
     */
    _initializeInfoDialog() {
      const dialog = document.createElement('dialog');
      dialog.id = this._infoId;
      const name = document.createElement('div');
      name.innerHTML = `<b>${GM.info.script.name}</b> - v${GM.info.script.version}`;
      const instructions = document.createElement('div');
      instructions.classList.add('spa-instructions');
      instructions.innerHTML =
        '<span class="left">Use <kbd>Ctrl</kbd>+<kbd>←</kbd> and <kbd>Ctrl</kbd>+<kbd>→</kbd> keys or click to select tab</span>' +
        '<span class="right">Hit <kbd>ESC</kbd> to close</span>';
      dialog.append(name, instructions);
      return dialog;
    }

    /**
     * Add basic dialog with an embedded tabbbed ui for the help view.
     * @param {TabbedUI~TabDefinition[]} tabs - Array defining the
     * help tabs.
     */
    _addInfoDialog(tabs) {
      const dialog = this._initializeInfoDialog();

      this._info = new TabbedUI(`${this._name} Info`);
      for (const tab of tabs) {
        this._info.addTab(tab);
      }
      // Switches to the first tab.
      this._info.goto(tabs[0].name);

      dialog.append(this._info.container);
      document.body.prepend(dialog);

      // Dialogs do not have a real open event.  We will fake it.
      dialog.addEventListener('open', () => {
        this._setKeyboardContext('inDialog', true);
        this._helpKeyboard.enable();
        for (const {panel} of this._info.tabs.values()) {
          // 0, 0 is good enough
          panel.scrollTo(0, 0);
        }
      });
      dialog.addEventListener('close', () => {
        this._setKeyboardContext('inDialog', false);
        this._helpKeyboard.disable();
      });
    }

    /**
     * @implements {TabGenerator}
     * @returns {TabbedUI~TabDefinition} - Initial table for the
     * keyboard shortcuts.
     */
    static _shortcutsTab() {
      return {
        name: 'Keyboard shortcuts',
        content: '<table data-spa-id="shortcuts"><tbody></tbody></table>',
      };
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

      if (gm.injectInto) {
        msgs.push(`  injected into "${gm.injectInto}"`);
      }

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
     * @implements {TabGenerator}
     * @returns {TabbedUI~TabDefinition} - Initial placeholder for
     * error logging.
     */
    static _errorTab() {
      return {
        name: 'Errors',
        content: [
          '<p>Any information in the text box below could be helpful in fixing a bug.</p>',
          `<p>The content can be edited and then included in a bug report.  Different errors should be separated by "${SPA._errorMarker}".</p>`,
          '<p><b>Please remove any identifying information before including it in a bug report!</b></p>',
          SPA._errorPlatformInfo(),
          '<textarea data-spa-id="errors" spellcheck="false" placeholder="No errors logged yet."></textarea>',
        ].join(''),
      };
    }

    /**
     * Set up everything necessary to get the help view going.
     */
    _initializeHelpView() {
      this._infoId = `help-${this._id}`;
      this._details.helpId = this._infoId;
      this._initializeHelpKeyboard();

      const tabGenerators = [
        SPA._shortcutsTab(),
        this._details.docTab(),
        SPA._errorTab(),
        this._details.licenseTab(),
      ];

      this._addInfoStyle();
      this._addInfoDialog(tabGenerators);
      this._details.ui = this._info;
      this._addInfoViewHandlers();
    }

    _nextTab = () => {
      this._info.next();
    }

    _prevTab = () => {
      this._info.prev();
    }

    /**
     * Convert a string in CamelCase to separate words, like Camel Case.
     * @param {string} text - Text to parse.
     * @returns {string} - Parsed text.
     */
    static _parseHeader(text) {
      // Word Up!
      return text.replace(/(?<cameo>[A-Z])/gu, ' $<cameo>').trim();
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

    static keyMap = new Map([
      ['LEFT', '←'],
      ['UP', '↑'],
      ['RIGHT', '→'],
      ['DOWN', '↓'],
    ]);


    /**
     * TODO(#110): Test in UI and tweak the CSS.
     *
     * Parse a {@link Shortcut.seq} and wrap it in HTML.
     * @example
     * 'a c-b' ->
     *   '<kbd><kbd>a</kbd> then <kbd>Ctrl</kbd> + <kbd>b</kbd></kbd>'
     * @param {Shortcut.seq} seq - Keystroke sequence.
     * @returns {string} - Appropriately wrapped HTML.
     */
    static _parseSeq2(seq) {

      /**
       * Convert a VM.shortcut style into an HTML snippet.
       * @param {IShortcutKey} key - A particular key press.
       * @returns {string} - HTML snippet.
       */
      function reprKey(key) {
        if (key.base.length === 1) {
          if ((/\p{Uppercase_Letter}/u).test(key.base)) {
            key.base = key.base.toLowerCase();
            key.modifierState.s = true;
          }
        } else {
          key.base = key.base.toUpperCase();
          const mapped = SPA.keyMap.get(key.base);
          if (mapped) {
            key.base = mapped;
          }
        }
        const sequence = [];
        if (key.modifierState.c) {
          sequence.push('Ctrl');
        }
        if (key.modifierState.a) {
          sequence.push('Alt');
        }
        if (key.modifierState.s) {
          sequence.push('Shift');
        }
        sequence.push(key.base);
        return sequence.map(c => `<kbd>${c}</kbd>`).join(' + ');
      }
      const res = VM.shortcut.normalizeSequence(seq, true)
        .map(key => reprKey(key))
        .join(' then ');
      return `<kbd>${res}</kbd>`;
    }

    /**
     * Generate a unique id for page views.
     * @param {Page} page - An instance of the Page class.
     * @returns {string} - Unique identifier.
     */
    _pageInfoId(page) {
      return `${this._infoId}-${page.infoHeader}`;
    }

    /**
     * Add shortcut descriptions from the page to the shortcut tab.
     * @param {Page} page - An instance of the Page class.
     */
    _addInfo(page) {
      const shortcuts = document.querySelector(`#${this._infoId} tbody`);
      const section = SPA._parseHeader(page.infoHeader);
      const pageId = this._pageInfoId(page);
      let s = `<tr id="${pageId}"><th></th><th>${section}</th></tr>`;
      for (const {seq, desc} of page.keysDescriptions) {
        const keys = SPA._parseSeq(seq);
        s += `<tr><td>${keys}:</td><td>${desc}</td></tr>`;
      }
      // Don't include works in progress that have no keys yet.
      if (page.keysDescriptions.length) {
        shortcuts.innerHTML += s;
        for (const button of shortcuts.querySelectorAll('button')) {
          button.disabled = true;
        }
      }
    }

    /**
     * Update Errors tab label based upon value.
     * @param {number} count - Number of errors currently logged.
     */
    _updateInfoErrorsLabel(count) {
      const me = 'updateInfoErrorsLabel';
      this._log.entered(me, count);
      const label = this._info.tabs.get('Errors').label;
      if (count) {
        this._info.goto('Errors');
        label.classList.add('spa-danger');
      } else {
        label.classList.remove('spa-danger');
      }
      this._log.leaving(me);
    }

    /**
     * Get the hot keys tab header element for this page.
     * @param {Page} page - Page to find.
     * @returns {?Element} - Element that acts as the header.
     */
    _pageHeader(page) {
      const me = 'pageHeader';
      this._log.entered(me, page);
      let element = null;
      if (page) {
        const pageId = this._pageInfoId(page);
        this._log.log('pageId:', pageId);
        element = document.querySelector(`#${pageId}`);
      }
      this._log.leaving(me, element);
      return element;
    }

    /**
     * Highlight information about the page in the hot keys tab.
     * @param {Page} page - Page to shine.
     */
    _shine(page) {
      const me = 'shine';
      this._log.entered(me, page);
      const element = this._pageHeader(page);
      element?.classList.add('spa-current-page');
      this._log.leaving(me);
    }

    /**
     * Remove highlights from this page in the hot keys tab.
     * @param {Page} page - Page to dull.
     */
    _dull(page) {
      const me = 'dull';
      this._log.entered(me, page);
      const element = this._pageHeader(page);
      element?.classList.remove('spa-current-page');
      this._log.leaving(me);
    }

    /**
     * Add content to the Errors tab so the user can use it to file feedback.
     * @param {string} content - Information to add.
     */
    addError(content) {
      const errors = document.querySelector(`#${this._infoId} [data-spa-id="errors"]`);
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
      this._addInfo(page);
      if (page.pathname === null) {
        this._global = page;
        this._global.activate();
      } else {
        this._pages.set(page.pathname, page);
      }
    }

    /**
     * Dump a bunch of information about an HTML element.
     * @param {Element} element - Element to get information about.
     * @param {string} name - What area this information came from.
     */
    dumpInfoAboutElement(element, name) {
      const msg = `An unsupported ${name} element was discovered:`;
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
      const pages = Array.from(this._pages.values());
      return pages.find(p => p.pathname === pathname);
    }

    /**
     * Handle switching from the old page (if any) to the new one.
     * @param {string} pathname - A {URL.pathname}.
     */
    activate(pathname) {
      if (this._page) {
        this._page.deactivate();
        this._dull(this._page);
      }
      const page = this._findPage(pathname);
      this._page = page;
      if (page) {
        page.activate();
        this._shine(this._page);
      }
    }

  }

  /** Test case. */
  function testParseSeq() {
    const tests = [
      {test: 'q', expected: '<kbd><kbd>q</kbd></kbd>'},
      {test: 's-q', expected: '<kbd><kbd>Shift</kbd> + <kbd>q</kbd></kbd>'},
      {test: 'Q', expected: '<kbd><kbd>Shift</kbd> + <kbd>q</kbd></kbd>'},
      {test: 'a b', expected: '<kbd><kbd>a</kbd> then <kbd>b</kbd></kbd>'},
      {test: '<', expected: '<kbd><kbd><</kbd></kbd>'},
      {test: 'C-q', expected: '<kbd><kbd>Ctrl</kbd> + <kbd>q</kbd></kbd>'},
      {test: 'c-q', expected: '<kbd><kbd>Ctrl</kbd> + <kbd>q</kbd></kbd>'},
      {test: 'c-a-t', expected: '<kbd><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>t</kbd></kbd>'},
      {test: 'a-c-T', expected: '<kbd><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>t</kbd></kbd>'},
      {test: 'c-down esc', expected: '<kbd><kbd>Ctrl</kbd> + <kbd>↓</kbd> then <kbd>ESC</kbd></kbd>'},
      {test: 'alt-up tab', expected: '<kbd><kbd>Alt</kbd> + <kbd>↑</kbd> then <kbd>TAB</kbd></kbd>'},
      {test: 'shift-X control-alt-del', expected: '<kbd><kbd>Shift</kbd> + <kbd>x</kbd> then <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>DEL</kbd></kbd>'},
      {test: 'c-x c-v',
        expected:
       '<kbd><kbd>Ctrl</kbd> + <kbd>x</kbd> then <kbd>Ctrl</kbd> + <kbd>v</kbd></kbd>'},
      {test: 'a-x enter', expected: '<kbd><kbd>Alt</kbd> + <kbd>x</kbd> then <kbd>ENTER</kbd></kbd>'},
      {test: 'up up down down left right left right b shift-a enter', expected: '<kbd><kbd>↑</kbd> then <kbd>↑</kbd> then <kbd>↓</kbd> then <kbd>↓</kbd> then <kbd>←</kbd> then <kbd>→</kbd> then <kbd>←</kbd> then <kbd>→</kbd> then <kbd>b</kbd> then <kbd>Shift</kbd> + <kbd>a</kbd> then <kbd>ENTER</kbd></kbd>'},
    ];

    for (const {test, expected} of tests) {
      const actual = SPA._parseSeq2(test);
      const passed = actual === expected;
      const msg = `t:${test} e:${expected} a:${actual}, p:${passed}`;
      log.log(msg);
      if (!passed) {
        throw new Error(msg);
      }
    }
  }

  testing.funcs.push(testParseSeq);

  const linkedIn = new LinkedIn(linkedInGlobals);

  // Inject some test errors
  if (testing.enabled) {
    linkedIn.addSetupIssue('This is a dummy test issue.', 'It was added because testing is enabled.');
    linkedIn.addSetupIssue('This is a second issue.', 'We just want to make sure things count properly.');
  }
  linkedIn.ready.then(() => {
    log.log('proceeding...');
    const spa = new SPA(linkedIn);
    spa.register(new Global());
    spa.register(new Feed());
    spa.register(new MyNetwork());
    spa.register(new Jobs());
    spa.register(new JobsCollections());
    spa.register(new Notifications());
    spa.activate(window.location.pathname);
  });

  if (testing.enabled) {
    log.enable();
    for (const test of testing.funcs) {
      test();
    }
    log.log('All tests passed.');
  }

  log.log('Initialization successful.');

})();
