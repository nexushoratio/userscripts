// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @noframes
// @version     4.1.2
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

  // TODO(#141): Currently replacing underscores with #private properties.

  /**
   * Subclass of {Map} similar to Python's defaultdict.
   *
   * First argument is a factory function that will create a new default value
   * for the key if not already present in the container.
   */
  class DefaultMap extends Map {

    #factory

    /**
     * @param {Function} factory - Function that creates a new default value
     * if a requested key is not present.
     */
    constructor(factory, ...rest) {
      if (!(factory instanceof Function)) {
        throw new TypeError('The factory argument MUST be of ' +
                            `type Function, not ${typeof factory}.`);
      }
      super(...rest);

      this.#factory = factory;
    }

    /** @inheritdoc */
    get(key) {
      if (!this.has(key)) {
        this.set(key, this.#factory());
      }

      return super.get(key);
    }

  }

  /* eslint-disable max-lines-per-function */
  /* eslint-disable no-magic-numbers */
  /* eslint-disable no-unused-vars */
  /* eslint-disable require-jsdoc */
  function testDefaultMap() {

    const noFactory = () => {
      try {
        const dummy = new DefaultMap();
      } catch (e) {
        if (e instanceof TypeError) {
          return 'caught';
        }
      }
      return 'oops';
    };

    const badFactory = () => {
      try {
        const dummy = new DefaultMap('a');
      } catch (e) {
        if (e instanceof TypeError) {
          return 'caught';
        }
      }
      return 'oops';
    };

    const asMap = () => {
      const dummy = new DefaultMap(Number, [[1, 'one'], [2, 'two']]);
      dummy.set(3, ['a', 'b']);
      dummy.get(4);
      return JSON.stringify(Array.from(dummy.entries()));
    };

    const counter = () => {
      const dummy = new DefaultMap(Number);
      dummy.get('a');
      dummy.set('b', dummy.get('b') + 1);
      dummy.set('b', dummy.get('b') + 1);
      dummy.get('c');
      return JSON.stringify(Array.from(dummy.entries()));
    };

    const array = () => {
      const dummy = new DefaultMap(Array);
      dummy.get('a').push(1, 2, 3);
      dummy.get('b').push(4, 5, 6);
      dummy.get('a').push('one', 'two', 'three');
      return JSON.stringify(Array.from(dummy.entries()));
    };

    const tests = [
      {name: 'noFactory', test: noFactory, expected: 'caught'},
      {name: 'badFactory', test: badFactory, expected: 'caught'},
      {name: 'asMap',
        test: asMap,
        expected: '[[1,"one"],[2,"two"],[3,["a","b"]],[4,0]]'},
      {name: 'counter', test: counter, expected: '[["a",0],["b",2],["c",0]]'},
      {name: 'array',
        test: array,
        expected: '[["a",[1,2,3,"one","two","three"]],["b",[4,5,6]]]'},
    ];

    for (const {name, test, expected} of tests) {
      const actual = test();
      const passed = actual === expected;
      const msg = `t:${name} e:${expected} a:${actual} p:${passed}`;
      testing.log.log(msg);
      if (!passed) {
        throw new Error(msg);
      }
    }
  }
  /* eslint-enable */

  testing.funcs.push(testDefaultMap);

  /** Enum/helper for Logger groups. */
  class GroupMode {

    #name
    #greeting
    #farewell
    #func

    static Silenced = new GroupMode('silenced');
    static Opened = new GroupMode('opened', 'Entered', 'Leaving', 'group');
    static Closed = new GroupMode(
      'closed', 'Starting', 'Finished', 'groupCollapsed'
    );

    /** @type {string} - Mode name. */
    get name() {
      return this.#name;
    }

    /** @type {string} - Greeting when opening group. */
    get greeting() {
      return this.#greeting;
    }

    /** @type {string} - Farewell when closing group. */
    get farewell() {
      return this.#farewell;
    }

    /** @type {string} - console.func to use for opening group. */
    get func() {
      return this.#func;
    }

    /**
     * @param {string} name - Mode name.
     * @param {string} [greeting] - Greeting when opening group.
     * @param {string} [farewell] - Salutation when closing group.
     * @param {string} [func] - console.func to use for opening group.
     */
    constructor(name, greeting, farewell, func) {  // eslint-disable-line max-params
      this.#name = name;
      this.#greeting = greeting;
      this.#farewell = farewell;
      this.#func = func;
    }

  }

  Object.freeze(GroupMode);

  /**
   * Fancy-ish log messages.
   *
   * Console message groups can be started and ended using special methods.
   *
   * @example
   * const log = new Logger('Bob');
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
   *
   * Logger.config('Bob').enabled = true;
   */
  class Logger {

    #name
    #config

    #groupStack = [];

    static Config = class {

      #enabled = false;
      #trace = false;
      #groups = new Map();

      /** @type {boolean} - Whether logging is currently enabled. */
      get enabled() {
        return this.#enabled;
      }

      /** @param {boolean} val - Set whether logging is currently enabled. */
      set enabled(val) {
        this.#enabled = Boolean(val);
      }

      /** @type {boolean} - Whether messages include a stack trace. */
      get trace() {
        return this.#trace;
      }

      /** @param {boolean} val - Set inclusion of stack traces. */
      set trace(val) {
        this.#trace = Boolean(val);
      }

      /**
       * @param {string} name - Name of the group to get.
       * @param {GroupMode} mode - Default mode if not seen before.
       * @returns {GroupMode} - Mode for this group.
       */
      groupMode(name, mode) {
        if (!this.#groups.has(name)) {
          this.#groups.set(name, mode);
        }
        return this.#groups.get(name);
      }

      /** @type {Map<string,GroupMode>} - Per group settings. */
      get groups() {
        return new Map(this.#groups);
      }

    }

    static #loggers = new DefaultMap(Array);
    static #configs = new DefaultMap(() => new Logger.Config());

    /**
     * @param {string} name - Name for this logger.
     */
    constructor(name) {
      this.#name = name;
      this.#config = Logger.config(name);
      Logger.#loggers.get(this.#name).push(new WeakRef(this));
    }

    /** @type {string[]} - Known loggers. */
    static get loggers() {
      return Array.from(this.#loggers.keys());
    }

    /** @type {Map<string,Map>} - Logger configurations. */
    static get configs() {
      return new Map(this.#configs);
    }

    /**
     * @param {string} name - Logger configuration to get.
     * @returns {Logger.Config} - Current config for that Logger.
     */
    static config(name) {
      return this.#configs.get(name);
    }

    /** @type {string} - Name for this logger. */
    get name() {
      return this.#name;
    }

    /** @type {boolean} - Whether logging is currently enabled. */
    get enabled() {
      return this.#config.enabled;
    }

    /** @type {boolean} - Indicates whether messages include a stack trace. */
    get trace() {
      return this.#config.trace;
    }

    /* eslint-disable no-console */

    /**
     * Introduces a specific group.
     * @param {string} group - Group being created.
     * @param {GroupMode} defaultMode - Mode to use if new.
     * @param {*} ...rest - Arbitrary items to pass to console.debug.
     */
    #intro = (group, defaultMode, ...rest) => {
      this.#groupStack.push(group);
      const mode = this.#config.groupMode(group, defaultMode);
      if (this.enabled) {
        console[mode.func](`${this.name}: ${group}`);
        if (rest.length) {
          const msg = `${mode.greeting} ${group} with`;
          this.log(msg, ...rest);
        }
      }
    }

    /**
     * Concludes a specific group.
     * @param {string} group - Group leaving.
     * @param {*} ...rest - Arbitrary items to pass to console.debug.
     */
    #outro = (group, ...rest) => {
      const lastGroup = this.#groupStack.pop();
      if (group !== lastGroup) {
        console.error(`${this.name}: Group mismatch!  Passed ` +
                      `"${group}", expected to see "${lastGroup}"`);
      }
      const mode = this.#config.groupMode(group);
      if (this.enabled) {
        let msg = `${mode.farewell} ${group}`;
        if (rest.length) {
          msg += ' with:';
        }
        this.log(msg, ...rest);
        console.groupEnd();
      }
    }

    /**
     * Log a specific message.
     * @param {string} msg - Message to send to console.debug.
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

    /**
     * Entered a specific group.
     * @param {string} group - Group that was entered.
     * @param {*} ...rest - Arbitrary items to pass to console.debug.
     */
    entered(group, ...rest) {
      this.#intro(group, GroupMode.Opened, ...rest);
    }

    /**
     * Leaving a specific group.
     * @param {string} group - Group leaving.
     * @param {*} ...rest - Arbitrary items to pass to console.debug.
     */
    leaving(group, ...rest) {
      this.#outro(group, ...rest);
    }

    /**
     * Starting a specific collapsed group.
     * @param {string} group - Group that is being started.
     * @param {*} ...rest - Arbitrary items to pass to console.debug.
     */
    starting(group, ...rest) {
      this.#intro(group, GroupMode.Closed, ...rest);
    }

    /**
     * Finished a specific collapsed group.
     * @param {string} group - Group that was entered.
     * @param {*} ...rest - Arbitrary items to pass to console.debug.
     */
    finished(group, ...rest) {
      this.#outro(group, ...rest);
    }

  }

  const log = new Logger('Default');
  testing.log = new Logger('Testing');

  Logger.config('Default').enabled = true;
  Logger.config('Testing').enabled = true;

  /**
   * Run querySelector to get an element, then click it.
   * @param {Element} base - Where to start looking.
   * @param {string[]} selectorArray - CSS selectors to use to find an
   * element.
   * @param {boolean} [matchSelf=false] - If a CSS selector would match base,
   * then use it.
   * @returns {boolean} - Whether an element could be found.
   */
  function clickElement(base, selectorArray, matchSelf = false) {
    if (base) {
      for (const selector of selectorArray) {
        let el = null;
        if (matchSelf && base.matches(selector)) {
          el = base;
        } else {
          el = base.querySelector(selector);
        }
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
   * @returns {boolean} - Indicating whether the element accepts keyboard
   * input.
   */
  function isInput(element) {
    let tagName = '';
    if ('tagName' in element) {
      tagName = element.tagName.toLowerCase();
    }
    // eslint-disable-next-line no-extra-parens
    return (element.isContentEditable ||
            ['input', 'textarea'].includes(tagName));
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
   * @property {object} observeOptions - MutationObserver().observe() options.
   * @property {SimpleFunction} [trigger] - Function to call that triggers
   * observable results.
   * @property {Monitor} monitor - Callback used to process MutationObserver
   * records.
   * @property {number} [timeout] - Time to wait for completion in
   * milliseconds, default of 0 disables.
   */

  /**
   * One time mutation observer with timeout.
   * @param {OtmotWhat} what - What to observe.
   * @param {OtmotHow} how - How to observe.
   * @returns {Promise<Continuation.results>} - Will resolve with the results
   * from monitor when done is true.
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
      } = how;
      const logger = new Logger(`otmot ${name}`);
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
   * @property {SimpleFunction} [trigger] - Function to call that triggers
   * observable events.
   * @property {number} timeout - Time to wait for completion in milliseconds.
   */

  /**
   * One time resize observer with timeout.  Will resolve automatically upon
   * first resize change.
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
      const logger = new Logger(`otrot ${name}`);
      const {
        clientHeight: initialHeight,
        clientWidth: initialWidth,
      } = base;
      logger.log('initial dimensions:', initialWidth, initialHeight);
      const observer = new ResizeObserver(() => {
        logger.log(
          'observed dimensions:', base.clientWidth, base.clientHeight
        );
        if (base.clientHeight !== initialHeight ||
            base.clientWidth !== initialWidth) {
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
   * @property {SimpleFunction} [trigger] - Function to call that triggers
   * observable events.
   * @property {SimpleFunction} action - Function to call upon each event
   * observed and also at the end of duration.
   * @property {number} duration - Time to run in milliseconds.
   */

  /**
   * One time resize observer with action callback and duration.  Will resolve
   * upon duration expiration.  Uses the same what parameter as {@link otrot}.
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
      testing.log.log(msg);
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
   * This version uses radio button/label pairs to select the active panel.
   *
   * @example
   * const tabby = new TabbedUI('Tabby Cat');
   * document.body.append(tabby.container);
   * tabby.addTab(helpTabDefinition);
   * tabby.addTab(docTabDefinition);
   * tabby.addTab(contactTabDefinition);
   * tabby.goto(helpTabDefinition.name);  // Set initial tab
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
     * @property {string} content - HTML to be used as initial content.
     */

    /**
     * @typedef {object} TabEntry
     * @property {string} name - Tab name.
     * @property {Element} label - Tab label, so CSS can be applied.
     * @property {Element} panel - Tab panel, so content can be updated.
     */

    /**
     * Create a TabbedUI.
     * @param {string} name - Used to distinguish HTML elements and CSS
     * classes.
     */
    constructor(name) {
      this.#log = new Logger(`TabbedUI ${name}`);
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
      // XXX: Cannot get 'button' elements to style nicely, so cheating by
      // wrapping them in a label.
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
      for (const label of this.#nav.querySelectorAll(
        ':scope > label[data-tabbed-name]'
      )) {
        entries.set(label.dataset.tabbedName, {label: label});
      }
      for (const panel of this.container.querySelectorAll(
        `:scope > .${this.#idName}-panel`
      )) {
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
        `#${this.container.id} {` +
          ' flex-grow: 1; overflow-y: hidden; display: flex;' +
          ' flex-direction: column;' +
          '}',
        `#${this.container.id} > input { display: none; }`,
        `#${this.container.id} > nav { display: flex; flex-direction: row; }`,
        `#${this.container.id} > nav button { border-radius: 50%; }`,
        `#${this.container.id} > nav > label {` +
          ' cursor: pointer;' +
          ' margin-top: 1ex; margin-left: 1px; margin-right: 1px;' +
          ' padding: unset; color: unset !important;' +
          '}',
        `#${this.container.id} > nav > .spacer {` +
          ' margin-left: auto; margin-right: auto;' +
          ' border-right: 1px solid black;' +
          '}',
        `#${this.container.id} label::before { all: unset; }`,
        `#${this.container.id} label::after { all: unset; }`,
        // Panels are both flex items AND flex containers.
        `#${this.container.id} .${this.#idName}-panel {` +
          ' display: none; overflow-y: auto; flex-grow: 1;' +
          ' flex-direction: column;' +
          '}',
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
      const controls = Array.from(this.container.querySelectorAll(
        ':scope > input'
      ));
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
     * @param {string} content - Raw HTML content to put into the panel.
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
     * Event handler for change events.  When the active tab changes, this
     * will resend an 'expose' event to the associated panel.
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

      const inputChecked =
            `#${this.container.id} > ` +
            `input[data-tabbed-name="${name}"]:checked`;
      this.#style.textContent +=
        `${inputChecked} ~ nav > [data-tabbed-name="${name}"] {` +
        ' border-bottom: 3px solid black;' +
        '}\n';
      this.#style.textContent +=
        `${inputChecked} ~ div[data-tabbed-name="${name}"] {` +
        ' display: flex;' +
        '}\n';

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
   * construction and attempts to use an unknown event will throw an error.
   */
  class Dispatcher {

    #handlers = new Map();

    /**
     * @param{...string} eventTypes - Event types this instance can handle.
     */
    constructor(...eventTypes) {
      for (const eventType of eventTypes) {
        this.#handlers.set(eventType, []);
      }
    }

    /**
     * Look up array of handlers by event type.
     * @param {string} eventType - Event type to look up.
     * @throws {Error} - When eventType was not registered during
     * instantiation.
     * @returns {function[]} - Handlers currently registered for this
     * eventType.
     */
    #getHandlers = (eventType) => {
      const handlers = this.#handlers.get(eventType);
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
      const handlers = this.#getHandlers(eventType);
      handlers.push(func);
    }

    /**
     * Remove all instances of a function registered to an eventType.
     * @param {string} eventType - Event type to disconnect from.
     * @param {function} func - Function to remove.
     */
    off(eventType, func) {
      const handlers = this.#getHandlers(eventType);
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
      const handlers = this.#getHandlers(eventType);
      for (const handler of handlers) {
        handler(data);
      }
    }

  }

  /**
   * An ordered collection of HTMLElements for a user to continuously scroll
   * through.
   *
   * The dispatcher can be used the handle the following events:
   * - 'out-of-range' - Scrolling went past one end of the collection.
   * - 'change' - The value of item has changed.
   * This is NOT an error condition, but rather a design feature.
   */
  class Scroller {

    #destroyed = false;
    #dispatcher = new Dispatcher('change', 'out-of-range');
    #currentItemId = null;
    #historicalIdToIndex = new Map();

    #base
    #bottomMarginCss
    #bottomMarginPixels
    #classes
    #log
    #name
    #selectors
    #snapToTop
    #stackTrace
    #topMarginCss
    #topMarginPixels
    #uidCallback

    /**
     * Function that generates a, preferably, reproducible unique identifier
     * for an Element.
     * @callback uidCallback
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */

    /**
     * @typedef {object} What
     * @property {string} name - Name for this scroller, used for logging.
     * @property {Element} base - The container to use as a base for selecting
     * elements.
     * @property {string[]} selectors - Array of CSS selectors to find
     * elements to collect, calling base.querySelectorAll().
     */

    /**
     * @typedef {object} How
     * @property {uidCallback} uidCallback - Callback to generate a uid.
     * @property {string[]} classes - Array of CSS classes to add/remove from
     * an element as it becomes current.
     * @property {boolean} snapToTop - Whether items should snap to the top of
     * the window when coming into view.
     * @property {number} [topMarginPixels=0] - Used to determine if scrolling
     * should happen when {snapToTop} is false.
     * @property {number} [bottomMarginPixels=0] - Used to determin if
     * scrolling should happen when {snapToTop} is false.
     * @property {string} [topMarginCss='0'] - CSS applied to
     * `scrollMarginTop`.
     * @property {string} [bottomMarginCss='0'] - CSS applied to
     * `scrollMarginBottom`.
     */

    /**
     * @param {What} what - What we want to scroll.
     * @param {How} how - How we want to scroll.
     * @throws {TypeError} - When base is not an Element.
     */
    constructor(what, how) {
      ({
        name: this.#name = 'Unnamed scroller',
        base: this.#base,
        selectors: this.#selectors,
      } = what);
      if (!(this.#base instanceof Element)) {
        throw new TypeError(
          `Invalid base ${this.#base} given for ${this.#name}`
        );
      }
      ({
        uidCallback: this.#uidCallback,
        classes: this.#classes,
        snapToTop: this.#snapToTop,
        topMarginPixels: this.#topMarginPixels = 0,
        bottomMarginPixels: this.#bottomMarginPixels = 0,
        topMarginCss: this.#topMarginCss = '0',
        bottomMarginCss: this.#bottomMarginCss = '0',
      } = how);

      this.#log = new Logger(`{${this.#name}}`);
      this.#log.log('Scroller constructed', this);
    }

    /** @type {Dispatcher} */
    get dispatcher() {
      return this.#dispatcher;
    }

    /** @type {Element} - Represents the current item. */
    get item() {
      const me = 'get item';
      this.#log.entered(me);
      if (this.#destroyed) {
        const msg = `Tried to work with destroyed ${Scroller.name} ` +
              `on ${this.#base}`;
        this.#log.log(msg);
        throw new Error(msg);
      }
      const items = this.#getItems();
      let item = items.find(this.#matchItem);
      if (!item) {
        // We couldn't find the old id, so maybe it was rebuilt.  Make a guess
        // by trying the old index.
        const idx = this.#historicalIdToIndex.get(this.#currentItemId);
        if (typeof idx === 'number' && (0 <= idx && idx < items.length)) {
          item = items[idx];
          this.#bottomHalf(item);
        }
      }
      this.#log.leaving(me, item);
      return item;
    }

    /** @param {Element} val - Set the current item. */
    set item(val) {
      const me = 'set item';
      this.#log.entered(me, val);
      this.dull();
      this.#bottomHalf(val);
      this.#log.leaving(me);
    }

    /**
     * Since the getter will try to validate the current item (since it could
     * have changed out from under us), it too can update information.
     * @param {Element} val - Element to make current.
     */
    #bottomHalf = (val) => {
      const me = 'bottomHalf';
      this.#log.entered(me, val);
      this.#currentItemId = this.#uid(val);
      const idx = this.#getItems().indexOf(val);
      this.#historicalIdToIndex.set(this.#currentItemId, idx);
      this.shine();
      this.#scrollToCurrentItem();
      this.dispatcher.fire('change', {});
      this.#log.leaving(me);
    }

    /**
     * Determines if the item can be viewed.  Usually this means the content
     * is being loaded lazily and is not ready yet.
     * @param {Element} item - The item to inspect.
     * @returns {boolean} - Whether the item has viewable content.
     */
    static #isItemViewable(item) {
      return item.clientHeight && item.innerText.length;
    }

    /**
     * Builds the list of elements using the registered CSS selectors.
     * @returns {Elements[]} - Items to scroll through.
     */
    #getItems = () => {
      const me = 'getItems';
      this.#log.entered(me);
      const items = [];
      for (const selector of this.#selectors) {
        this.#log.log(`considering ${selector}`);
        items.push(...this.#base.querySelectorAll(selector));
      }
      this.#log.starting('items');
      for (const item of items) {
        this.#log.log('item:', item);
      }
      this.#log.finished('items');

      this.#log.leaving(me, `${items.length} items`);
      return items;
    }

    /**
     * Returns the uid for the current element.  Will use the registered
     * uidCallback function for this.
     * @param {Element} element - Element to identify.
     * @returns {string} - Computed uid for element.
     */
    #uid = (element) => {
      const me = 'uid';
      this.#log.entered(me, element);
      let uid = null;
      if (element) {
        if (!element.dataset.spaId) {
          element.dataset.spaId = this.#uidCallback(element);
        }
        uid = element.dataset.spaId;
      }
      this.#log.leaving(me, uid);
      return uid;
    }

    /**
     * Checks if the element is the current one.  Useful as a callback to
     * Array.find.
     * @param {Element} element - Element to check.
     * @returns {boolean} - Whether or not element is the current one.
     */
    #matchItem = (element) => {
      const me = 'matchItem';
      this.#log.entered(me);
      const res = this.#currentItemId === this.#uid(element);
      this.#log.leaving(me, res);
      return res;
    }

    /**
     * Scroll the current item into the view port.  Depending on the instance
     * configuration, this could snap to the top, snap to the bottom, or be a
     * no-op.
     */
    #scrollToCurrentItem = () => {
      const me = 'scrollToCurrentItem';
      this.#log.entered(me, this.#snapToTop);
      const {item} = this;
      if (item) {
        item.style.scrollMarginTop = this.#topMarginCss;
        if (this.#snapToTop) {
          this.#log.log('snapping to top');
          item.scrollIntoView(true);
        } else {
          item.style.scrollMarginBottom = this.#bottomMarginCss;
          const rect = item.getBoundingClientRect();
          // If both scrolling happens, it means the item is too tall to fit
          // on the page, so the top is preferred.
          const allowedBottom = document.documentElement.clientHeight -
                this.#bottomMarginPixels;
          if (rect.bottom > allowedBottom) {
            this.#log.log('scrolling up onto page');
            item.scrollIntoView(false);
          }
          if (rect.top < this.#topMarginPixels) {
            this.#log.log('scrolling down onto page');
            item.scrollIntoView(true);
          }
          // XXX: The following was added to support horizontal scrolling in
          // carousels.  Nothing seemed to break.  TODO(#132): Did find a side
          // effect though: it can cause an item being *left* to shift up if
          // the scrollMarginBottom has been set.
          item.scrollIntoView({block: 'nearest', inline: 'nearest'});
        }
      }
      this.#log.leaving(me);
    }

    /**
     * Jump an item on the end of the collection.
     * @param {boolean} first - If true, the first item in the collection,
     * else, the last.
     */
    #jumpToEndItem = (first) => {
      const me = 'jumpToEndItem';
      this.#log.entered(me, `first=${first}`);
      // Reset in case item was heavily modified
      this.item = this.item;

      const items = this.#getItems();
      if (items.length) {
        // eslint-disable-next-line no-extra-parens
        let idx = first ? 0 : (items.length - 1);
        let item = items[idx];

        // Content of items is sometimes loaded lazily and can be detected by
        // having no innerText yet.  So start at the end and work our way up
        // to the last one loaded.
        if (!first) {
          while (!Scroller.#isItemViewable(item)) {
            this.#log.log('skipping item', item);
            idx -= 1;
            item = items[idx];
          }
        }
        this.item = item;
      }
      this.#log.leaving(me);
    }

    /**
     * Move forward or backwards in the collection by at least n.
     * @param {number} n - How many items to move and the intended direction.
     * @fires 'out-of-range'
     */
    #scrollBy = (n) => {  // eslint-disable-line max-statements
      const me = 'scrollBy';
      this.#log.entered(me, n);
      // Reset in case item was heavily modified
      this.item = this.item;

      const items = this.#getItems();
      if (items.length) {
        let idx = items.findIndex(this.#matchItem);
        this.#log.log('initial idx', idx);
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
          while (!Scroller.#isItemViewable(item)) {
            this.#log.log('skipping item', item);
            idx += n;
            item = items[idx];
          }
          this.#log.log('final idx', idx);
          this.item = item;
        }
      }
      this.#log.leaving(me);
    }

    /**
     * Move to the next item in the collection.
     */
    next() {
      this.#scrollBy(1);
    }

    /**
     * Move to the previous item in the collection.
     */
    prev() {
      this.#scrollBy(-1);
    }

    /**
     * Jump to the first item in the collection.
     */
    first() {
      this.#jumpToEndItem(true);
    }

    /**
     * Jump to last item in the collection.
     */
    last() {
      this.#jumpToEndItem(false);
    }

    /**
     * Adds the registered CSS classes to the current element.
     */
    shine() {
      this.item?.classList.add(...this.#classes);
    }

    /**
     * Removes the registered CSS classes from the current element.
     */
    dull() {
      this.item?.classList.remove(...this.#classes);
    }

    /**
     * Bring current item back into view.
     */
    show() {
      this.#scrollToCurrentItem();
    }

    /**
     * Mark instance as inactive and do any internal cleanup.
     */
    destroy() {
      const me = 'destroy';
      this.#log.entered(me);
      this.item = null;
      this.#destroyed = true;
      this.#log.leaving(me);
    }

  }

  /**
   * This class exists solely to avoid some `no-use-before-define` linter
   * issues.
   */
  class LinkedInGlobals {

    #navBarHeightPixels = 0;

    /** @type {number} - The height of the navbar in pixels. */
    get navBarHeightPixels() {
      return this.#navBarHeightPixels;
    }

    /** @param {number} val - Set height of the navbar in pixels. */
    set navBarHeightPixels(val) {
      this.#navBarHeightPixels = val;
    }

    /** @type {string} - The height of the navbar as CSS string. */
    get navBarHeightCss() {
      return `${this.#navBarHeightPixels}px`;
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
   * foo = new Shortcut('c-c', 'Clear the console.', () => {
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
     * @param {string} desc - Human readable documenation about this function.
     * @param {SimpleFunction} func - Function to wrap, usually in the form of
     * an arrow function.  Keep JS `this` magic in mind!
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
   * Base class for handling various views of a single-page application.
   *
   * Generally, new classes should subclass this, override a few properties
   * and methods, and then register themselves with an instance of the {@link
   * SPA} class.
   */
  class Page {

    // The immediate following can be set in subclasses.

    /**
     * @type {string|RegExp} - What pathname part of the URL this page should
     * handle.  The special case of null is used by the {@link SPA} class to
     * represent global keys.
     */
    _pathname;

    /**
     * @type {string} - CSS selector for capturing clicks on this page.  If
     * overridden, then the class should also provide a _onClick() method.
     */
    _onClickSelector = null;


    /**
     * Definition for keyboard shortcuts.
     * @typedef {object} Shortcut
     * @property {string} seq - Key sequence to activate.
     * @property {string} desc - Description that goes into the online list of
     * keys.
     * @property {SimpleFunction} func - Function to call, usually in the form
     * of `this.callback`.  Keep JS `this` magic in mind!
     */

    /**
     * @type {Shortcut[]} - List of {@link Shortcut}s to register
     * automatically.
     */
    get _autoRegisteredKeys() {  // eslint-disable-line class-methods-use-this
      return [];
    }

    // Private members.

    /** @type {SPA} - SPA instance managing this instance. */
    #spa;

    /** @type {Logger} - Logger instance. */
    #logger;

    /** @type {RegExp} - Computed RegExp version of _pathname. */
    #pathnameRE;

    /** @type {KeyboardService} */
    #keyboard = new VM.shortcut.KeyboardService();

    /**
     * @type {Element} - Tracks which HTMLElement holds the `onclick`
     * function.
     */
    _onClickElement = null;

    /**
     * @type {IShortcutOptions} - Disables keys when focus is on an element or
     * info view.
     */
    static #navOption = {
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
      this.#spa = spa;
      this.#logger = new Logger(this.constructor.name);
      for (const {seq, func} of this.allShortcuts) {
        this.#addKey(seq, func);
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

    /** @type {RegExp} */
    get pathname() {
      if (!this.#pathnameRE) {
        if (this._pathname instanceof RegExp) {
          this.#pathnameRE = this._pathname;
        } else if (this._pathname) {
          this.#pathnameRE = RegExp(`^${this._pathname}$`, 'u');
        } else {
          // New global
          this.#pathnameRE = /.*/u;
        }
      }
      return this.#pathnameRE;
    }

    /** @type {SPA} */
    get spa() {
      return this.#spa;
    }

    /** @type {Logger} */
    get logger() {
      return this.#logger;
    }

    /** @type {KeyboardService} */
    get keyboard() {
      return this.#keyboard;
    }

    /**
     * Turns on this Page's features.  Called by {@link SPA} when this becomes
     * the current view.
     */
    activate() {
      this.#keyboard.enable();
      this.#enableOnClick();
    }

    /**
     * Turns off this Page's features.  Called by {@link SPA} when this is no
     * longer the current view.
     */
    deactivate() {
      this.#keyboard.disable();
      this.#disableOnClick();
    }

    /** @type {string} - Describes what the header should be. */
    get infoHeader() {
      return this.constructor.name;
    }

    /**
     * @type {Shortcut[]} - The `key` and `desc` properties are important
     * here.
     */
    get keysDescriptions() {
      return this.allShortcuts;
    }

    /**
     * Registers a specific key sequence with a function with VM.shortcut.
     * @param {string} seq - Key sequence.
     * @param {SimpleFunction} func - Function to call.
     */
    #addKey(seq, func) {
      this.#keyboard.register(seq, func, Page.#navOption);
    }

    /**
     * Enables the 'click' handler for this view.
     */
    #enableOnClick = async () => {
      if (this._onClickSelector) {

        /**
         * Page is dynamically building, so keep watching it until the element
         * shows up.
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
    #disableOnClick = () => {
      this._onClickElement?.removeEventListener('click', this._onClick);
      this._onClickElement = null;
    }

    /**
     * Override this function in subclasses that want to react to random
     * clicks on a page, say to update current element in focus.
     * https://github.com/eslint/eslint/issues/17467
     * @abstract
     * @param {Event} evt - Standard 'click' event.
     */
    _onClick = (evt) => {  // eslint-disable-line no-unused-vars
      const msg = `Found a bug! ${this.constructor.name} wants ` +
            'to handle clicks, but forgot to create a handler.';
      this.spa.addError(msg);
      this.spa.addErrorMarker();
    }

    /**
     * Override this function in subclasses to take action upon becoming the
     * current view again.
     */
    _refresh() {
      this.logger.log('In base refresh.');
    }

  }

  /**
   * Class for handling aspects common across LinkedIn.
   *
   * This includes things like the global nav bar, information view, etc.
   */
  class Global extends Page {

    _pathname = null;

    /**
     * Click on the requested link in the global nav bar.
     * @param {string} item - Portion of the link to match.
     */
    static #gotoNavLink = (item) => {
      clickElement(document, [`#global-nav a[href*="/${item}"`]);
    }

    /**
     * Click on the requested button in the global nav bar.
     * @param {string} item - Text on the button to look for.
     */
    static #gotoNavButton = (item) => {
      const buttons = Array.from(
        document.querySelectorAll('#global-nav button')
      );
      const button = buttons.find(el => el.textContent.includes(item));
      button?.click();
    }

    info = new Shortcut('?', 'Show this information view', () => {
      Global.#gotoNavButton('Tool');
    });

    gotoSearch = new Shortcut('/', 'Go to Search box', () => {
      clickElement(document, ['#global-nav-search button']);
    });

    goHome = new Shortcut('g h', 'Go Home (aka, Feed)', () => {
      Global.#gotoNavLink('feed');
    });

    gotoMyNetwork = new Shortcut('g m', 'Go to My Network', () => {
      Global.#gotoNavLink('mynetwork');
    });

    gotoJobs = new Shortcut('g j', 'Go to Jobs', () => {
      Global.#gotoNavLink('jobs');
    });

    gotoMessaging = new Shortcut('g g', 'Go to Messaging', () => {
      Global.#gotoNavLink('messaging');
    });

    gotoNotifications = new Shortcut('g n', 'Go to Notifications', () => {
      Global.#gotoNavLink('notifications');
    });

    gotoProfile = new Shortcut('g p', 'Go to Profile (aka, Me)', () => {
      Global.#gotoNavButton('Me');
    });

    gotoBusiness = new Shortcut('g b', 'Go to Business', () => {
      Global.#gotoNavButton('Business');
    });

    gotoLearning = new Shortcut('g l', 'Go to Learning', () => {
      Global.#gotoNavLink('learning');
    });

    focusOnSidebar = new Shortcut(
      ',', 'Focus on the left/top sidebar (not always present)', () => {
        linkedInGlobals.focusOnSidebar();
      }
    );

    focusOnAside = new Shortcut(
      '.', 'Focus on the right/bottom sidebar (not always present)', () => {
        linkedInGlobals.focusOnAside();
      }
    );

  }

  /** Class for handling the Posts feed. */
  class Feed extends Page {

    _pathname = '/feed/';
    _onClickSelector = 'main';

    #tabSnippet = SPA._parseSeq2('tab');  // eslint-disable-line no-use-before-define

    #postScroller = null;
    #commentsScroller = null;

    /** @type {Scroller~What} */
    static #postsWhat = {
      name: 'Feed posts',
      base: document.body,
      selectors: ['main div[data-id]'],
    };

    /** @type {Scroller~How} */
    static _postsHow = {
      uidCallback: Feed._uniqueIdentifier,
      classes: ['tom'],
      snapToTop: true,
    };

    /** @type {Scroller~What} */
    static #commentsWhat = {
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
      this.#postScroller = new Scroller(Feed.#postsWhat, Feed._postsHow);
      this.#postScroller.dispatcher.on('out-of-range', linkedInGlobals.focusOnSidebar);
      this.#postScroller.dispatcher.on('change', this.#onPostChange);
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
          name: 'Feed._refresh',
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
      return this.#postScroller;
    }

    /** @type {Scroller} */
    get _comments() {
      if (!this.#commentsScroller && this._posts.item) {
        this.#commentsScroller = new Scroller({base: this._posts.item, ...Feed.#commentsWhat}, Feed._commentsHow);
        this.#commentsScroller.dispatcher.on('out-of-range', this.#returnToPost);
      }
      return this.#commentsScroller;
    }

    /**
     * Reset the comment scroller.
     */
    #clearComments() {
      if (this.#commentsScroller) {
        this.#commentsScroller.destroy();
        this.#commentsScroller = null;
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
     * Reselects current post, triggering same actions as initial selection.
     */
    #returnToPost = () => {
      this._posts.item = this._posts.item;
    }

    /**
     * Removes the comments {@link Scroller}.
     */
    #onPostChange = () => {
      this.#clearComments();
    }

    _nextPost = new Shortcut('j', 'Next post', () => {
      this._posts.next();
    });

    _prevPost = new Shortcut('k', 'Previous post', () => {
      this._posts.prev();
    });

    _nextComment = new Shortcut('n', 'Next comment', () => {
      this._comments.next();
    });

    _prevComment = new Shortcut('p', 'Previous comment', () => {
      this._comments.prev();
    });

    _firstItem = new Shortcut('<', 'Go to first post or comment', () => {
      if (this._hasActiveComment) {
        this._comments.first();
      } else {
        this._posts.first();
      }
    });

    _lastItem = new Shortcut(
      '>', 'Go to last post or comment currently loaded', () => {
        if (this._hasActiveComment) {
          this._comments.last();
        } else {
          this._posts.last();
        }
      }
    );

    _focusBrowser = new Shortcut(
      'f', 'Change browser focus to current item', () => {
        const el = this._comments.item ?? this._posts.item;
        this._posts.show();
        this._comments?.show();
        focusOnElement(el);
      }
    );

    _showComments = new Shortcut('c', 'Show comments', () => {
      if (!clickElement(this._comments.item, ['button.show-prev-replies'])) {
        clickElement(this._posts.item, ['button[aria-label*="comment"]']);
      }
    });

    _seeMore = new Shortcut(
      'm', 'Show more of current post or comment', () => {
        const el = this._comments.item ?? this._posts.item;
        clickElement(el, ['button[aria-label^="see more"]']);
      }
    );

    _loadMorePosts = new Shortcut('l', 'Load more posts (if the <button>New Posts</button> button is available, load those)', () => {
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
    });

    _viewPost = new Shortcut('v p', 'View current post directly', () => {
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
    });

    _viewReactions = new Shortcut(
      'v r', 'View reactions on current post or comment', () => {
        const el = this._comments.item ?? this._posts.item;
        clickElement(el, ['button.comments-comment-social-bar__reactions-count,button.feed-shared-social-action-bar-counts,button.social-details-social-counts__count-value']);
      }
    );

    _viewReposts = new Shortcut(
      'v R', 'View reposts of current post', () => {
        clickElement(this._posts.item, ['button[aria-label*="repost"]']);
      }
    );

    _openMeatballMenu = new Shortcut(
      '=', 'Open closest <button class="spa-meatball">⋯</button> menu', () => {
        // XXX: In this case, the identifier is on an svg element, not the
        // button, so use the parentElement.  When Firefox [fully
        // supports](https://bugzilla.mozilla.org/show_bug.cgi?id=418039) the
        // `:has()` pseudo-selector, we can probably use that and use
        // `clickElement()`.
        const el = this._comments.item ?? this._posts.item;
        const button = el.querySelector('[aria-label^="Open options"],[a11y-text^="Open control menu"],[aria-label^="Open control menu"]').parentElement;
        button?.click();
      }
    );

    _likeItem = new Shortcut('L', 'Like current post or comment', () => {
      const el = this._comments.item ?? this._posts.item;
      clickElement(el, ['button[aria-label^="Open reactions menu"]']);
    });

    _commentOnItem = new Shortcut(
      'C', 'Comment on current post or comment', () => {
        const el = this._comments.item ?? this._posts.item;
        clickElement(el, ['button[aria-label^="Comment"]', 'button[aria-label^="Reply"]']);
      }
    );

    _repost = new Shortcut('R', 'Repost current post', () => {
      const el = this._posts.item;
      clickElement(el, ['button.social-reshare-button']);
    });

    _sendPost = new Shortcut('S', 'Send current post privately', () => {
      const el = this._posts.item;
      clickElement(el, ['button.send-privately-button']);
    });

    _gotoShare = new Shortcut('P', `Go to the share box to start a post or ${this.#tabSnippet} to the other creator options`, () => {
      const share = document.querySelector('div.share-box-feed-entry__top-bar').parentElement;
      share.style.scrollMarginTop = linkedInGlobals.navBarHeightCss;
      share.scrollIntoView();
      share.querySelector('button').focus();
    });

    _togglePost = new Shortcut('X', 'Toggle hiding current post', () => {
      clickElement(this._posts.item, ['button[aria-label^="Dismiss post"]', 'button[aria-label^="Undo and show"]']);
    });

    _nextPostPlus = new Shortcut(
      'J', 'Toggle hiding then next post', async () => {

        /**
         * Trigger function for {@link otrot}.
         */
        const trigger = () => {
          this._togglePost();
          this._nextPost();
        };
        // XXX: Need to remove the highlights before otrot sees it because it
        // affects the .clientHeight.
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
    );

    _prevPostPlus = new Shortcut(
      'K', 'Toggle hiding then previous post', () => {
        this._togglePost();
        this._prevPost();
      }
    );

  }

  /**
   * Class for handling the base MyNetwork page.
   *
   * This page takes 3-4 seconds to load every time.  Revisits are
   * likely to take a while.
   */
  class MyNetwork extends Page {

    _pathname = '/mynetwork/';
    _onClickSelector = 'main';

    #sectionsScroller
    #cardsScroller
    #currentSectionText

    /** @type {Scroller~What} */
    static #sectionsWhat = {
      name: 'MyNetwork sections',
      base: document.body,
      // See https://stackoverflow.com/questions/77146570
      selectors: [
        [
          // Invintations
          'main > section',
          // Most sections
          'main > ul > li',
          // More suggestions for you section
          'main > div > section',
        ].join(','),
      ],
    };

    /** @type {Scroller~How} */
    static _sectionsHow = {
      uidCallback: MyNetwork._uniqueIdentifier,
      classes: ['tom'],
      snapToTop: true,
    };

    /** @type {Scroller~What} */
    static #cardsWhat = {
      name: 'MyNetwork cards',
      selectors: [
        [
          // Invitations -> See all
          ':scope > header > a',
          // Other sections -> See all
          ':scope > div > button',
          // Most cards
          ':scope > ul > li',
          // More suggestions for you cards
          ':scope > section ul > li section',
        ].join(','),
      ],
    };

    /** @type {Scroller~How} */
    static _cardsHow = {
      uidCallback: MyNetwork._uniqueCardsIdentifier,
      classes: ['dick'],
      snapToTop: false,
    };

    /** Create MyNetwork controller. */
    constructor() {
      super();
      this.#sectionsScroller = new Scroller(MyNetwork.#sectionsWhat, MyNetwork._sectionsHow);
      this.#sectionsScroller.dispatcher.on('out-of-range', linkedInGlobals.focusOnSidebar);
      this.#sectionsScroller.dispatcher.on('change', this.#onChange);
    }

    /** @inheritdoc */
    _onClick = (evt) => {
      const section = evt.target.closest('main > ul > li, main > :where(section, div)');
      if (section && section !== this._sections.item) {
        this._sections.item = section;
      }
    }

    /** @inheritdoc */
    async _refresh() {

      /**
       * Wait for sections to eventually show up to see if our current one
       * comes back.  It may not.
       * @implements{Monitor}
       * @param {MutationRecord[]} records - Standard mutation records.
       * @returns {Continuation} - Indicate whether done monitoring.
       */
      const monitor = (records) => {
        for (const record of records) {
          if (record.type === 'childList') {
            for (const node of record.addedNodes) {
              const newText = node.innerText?.trim().split('\n')[0];
              if (newText && newText === this.#currentSectionText) {
                return {done: true};
              }
            }
          }
        }
        return {done: false};
      };
      const what = {
        name: 'MyNetwork._refresh',
        base: document.body.querySelector('main'),
      };
      const how = {
        observeOptions: {childList: true, subtree: true},
        monitor: monitor,
        timeout: 10000,
      };

      if (this.#currentSectionText) {
        await otmot(what, how);
        this._sections.shine();
        this._sections.show();
        this.#clearCards();
      }
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
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static _uniqueCardsIdentifier(element) {
      const content = element.innerText;
      return strHash(content);
    }

    /** @type {Scroller} */
    get _sections() {
      return this.#sectionsScroller;
    }

    /** @type {Scroller} */
    get _cards() {
      if (!this.#cardsScroller && this._sections.item) {
        this.#cardsScroller = new Scroller({base: this._sections.item, ...MyNetwork.#cardsWhat}, MyNetwork._cardsHow);
        this.#cardsScroller.dispatcher.on('out-of-range', this.#returnToSection);
      }
      return this.#cardsScroller;
    }

    /** @type {boolean} */
    get _hasActiveCard() {
      return Boolean(this._cards?.item);
    }

    #clearCards = () => {
      if (this.#cardsScroller) {
        this.#cardsScroller.destroy();
        this.#cardsScroller = null;
      }
    }

    #onChange = () => {
      this.#currentSectionText = this._sections.item?.innerText
        .trim().split('\n')[0];
      this.#clearCards();
    }

    #returnToSection = () => {
      this._sections.item = this._sections.item;
    }

    nextSection = new Shortcut('j', 'Next section', () => {
      this._sections.next();
    });

    prevSection = new Shortcut('k', 'Previous section', () => {
      this._sections.prev();
    });

    nextCard = new Shortcut('n', 'Next card in section', () => {
      this._cards.next();
    });

    prevCard = new Shortcut('p', 'Previous card in section', () => {
      this._cards.prev();
    });

    firstItem = new Shortcut('<', 'Go to the first section or card', () => {
      if (this._hasActiveCard) {
        this._cards.first();
      } else {
        this._sections.first();
      }
    });

    lastItem = new Shortcut('>', 'Go to the last section or card', () => {
      if (this._hasActiveCard) {
        this._cards.last();
      } else {
        this._sections.last();
      }
    });

    focusBrowser = new Shortcut('f', 'Change browser focus to current item', () => {
      const item = this._cards.item ?? this._sections.item;
      focusOnElement(item);
    });

    viewItem = new Shortcut('v', 'View the current item', () => {
      const card = this._cards?.item;
      if (card) {
        if (!clickElement(card, ['a', 'button'], true)) {
          this.spa.dumpInfoAboutElement(card, 'network card');
        }
      } else {
        document.activeElement.click();
      }
    });

    enagageCard = new Shortcut(
      'E', 'Engage the card (Connect, Follow, Join, etc)', () => {
        clickElement(this._cards?.item, ['footer > button']);
      }
    );

    dismissCard = new Shortcut('X', 'Dismiss current card', () => {
      clickElement(this._cards?.item, ['button.artdeco-card__dismiss']);
    });

  }

  Logger.config('InvitationManager').enabled = true;

  /**
   * Class for handling the Invitation manager page.
   */
  class InvitationManager extends Page {

    _pathname = '/mynetwork/invitation-manager/';
    _onClickSelector = 'main';

    #invitesScroller

    /** @type {Scroller~What} */
    static #invitesWhat = {
      name: 'Invititation cards',
      base: document.body,
      selectors: [
        [
          // Actual invites
          'main > section section > ul > li',
        ].join(','),
      ],
    };

    static _invitesHow = {
      uidCallback: InvitationManager._uniqueIdentifier,
      classes: ['tom'],
    };

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static _uniqueIdentifier(element) {
      let content = element.innerText;
      const anchor = element.querySelector('a');
      if (anchor?.href) {
        content = anchor.href;
      }
      return strHash(content);
    }

    /** @type {Scroller} */
    get _invites() {
      return this.#invitesScroller;
    }

    /** Create InvitationManager. */
    constructor() {
      super();
      this.#invitesScroller = new Scroller(
        InvitationManager.#invitesWhat, InvitationManager._invitesHow
      );
    }

    /** @inheritdoc */
    _onClick = (evt) => {
      const me = 'onClick';
      this.logger.entered(me, evt);
      const invite = evt.target.closest('section > ul > li');
      this.logger.log('invite:', invite);
      if (invite && invite !== this._invites.item) {
        this._invites.item = invite;
      }
      this.logger.leaving(me);
    }

    /** @inheritdoc */
    _refresh() {
      const me = 'refresh';
      this.logger.entered(me);
      this.logger.leaving(me);
    }

    nextInvite = new Shortcut('j', 'Next invitation', () => {
      this._invites.next();
    });

    prevInvite = new Shortcut('k', 'Previous invitation', () => {
      this._invites.prev();
    });

    firstInvite = new Shortcut('<', 'Go to the first invitation', () => {
      this._invites.first();
    });

    lastInvite = new Shortcut('>', 'Go to the last invitation', () => {
      this._invites.last();
    });

    focusBrowser = new Shortcut(
      'f', 'Change browser focus to current item', () => {
        const item = this._invites.item;
        focusOnElement(item);
      }
    );

    seeMore = new Shortcut(
      'm', 'Toggle seeing more of current invite', () => {
        clickElement(
          this._invites?.item,
          ['a.lt-line-clamp__more, a.lt-line-clamp__less']
        );
      }
    );

    viewInviter = new Shortcut('i', 'View inviter', () => {
      clickElement(this._invites?.item,
        ['a.app-aware-link:not(.invitation-card__picture)']);
    });

    viewTarget = new Shortcut(
      't',
      'View invitation target ' +
        '(may not be the same as inviter, e.g., Newsletter)',
      () => {
        clickElement(this._invites?.item, ['a.invitation-card__picture']);
      }
    );

    openMeatballMenu = new Shortcut(
      '=', 'Open <button class="spa-meatball">⋯</button> menu', () => {
        this._invites?.item
          .querySelector('svg[aria-label^="Report message"]')
          ?.closest('button')
          ?.click();
      }
    );

    acceptInvite = new Shortcut('A', 'Accept invite', () => {
      clickElement(this._invites?.item, ['button[aria-label^="Accept"]']);
    });

    ignoreInvite = new Shortcut('I', 'Ignore invite', () => {
      clickElement(this._invites?.item, ['button[aria-label^="Ignore"]']);
    });

    messageInviter = new Shortcut('M', 'Message inviter', () => {
      clickElement(this._invites?.item, ['button[aria-label*=" message"]']);
    });

  }

  /**
   * Class for handling the base Jobs page.
   *
   * This particular page requires a lot of careful monitoring.  Unlike other
   * pages, this one will destroy and recreate HTML elements, often with the
   * exact same content, every time something interesting happens.  Like
   * loading more sections or jobs, or toggling state of a job.
   */
  class Jobs extends Page {

    _pathname = '/jobs/';
    _onClickSelector = 'main';

    _sectionScroller = null;
    _sectionsMO = null;
    _sectionWatchText = '';
    _jobScroller = null;

    /** @type {Scroller~What} */
    static _sectionsWhat = {
      name: 'Jobs sections',
      base: document.body,
      selectors: ['main section'],
    };

    /** @type {Scroller~How} */
    static _sectionsHow = {
      uidCallback: Jobs._uniqueIdentifier,
      classes: ['tom'],
      snapToTop: true,
    };

    /** @type {Scroller~What} */
    static _jobsWhat = {
      name: 'Job entries',
      selectors: [':scope > ul > li', ':scope > div > ul > li', 'div.jobs-home-recent-searches__list-toggle', 'div.discovery-templates-vertical-list__footer'],
    };

    /** @type {Scroller~How} */
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
      this.logger.entered(me, this._jobScroller);
      if (!this._jobScroller && this._sections.item) {
        this._jobScroller = new Scroller({base: this._sections.item, ...Jobs._jobsWhat}, Jobs._jobsHow);
        this._jobScroller.dispatcher.on('out-of-range', this._returnToSection);
      }
      this.logger.leaving(me, this._jobScroller);
      return this._jobScroller;
    }

    /**
     * Reset the jobs scroller.
     */
    _clearJobs() {
      const me = 'clearJobs';
      this.logger.entered(me, this._jobScroller);
      if (this._jobScroller) {
        this._jobScroller.destroy();
        this._jobScroller = null;
      }
      this.logger.leaving(me);
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
      this.logger.entered(me, topScroll);
      // Explicitly setting jobs.item below will cause it to scroll to that
      // item.  We do not want to do that if the user is manually scrolling.
      const savedJob = this._jobs?.item;
      this._sections.shine();
      // Section was probably rebuilt, assume jobs scroller is invalid.
      this._clearJobs();
      if (savedJob) {
        this._jobs.item = savedJob;
      }
      document.documentElement.scrollTop = topScroll;
      this.logger.leaving(me);
    }

    /**
     * Overly complicated.  The job sections get recreated in toto every time
     * new sections are loaded, whether manually or automatically triggered
     * while scrolling.  When this happens, we lose track of it.  So we track
     * the likely text from the current section, and if we see that show up
     * again, we put the shine back on.  We could simplify {@link
     * _loadMoreSections} by calling {@link show} here as well, but if the
     * user is scrolling for a reason, it seems rude to pop them back to the
     * section again.
     * @param {MutationRecord[]} records - Standard mutation records.
     */
    _mutationHandler = (records) => {
      const me = 'mutationHandler';
      this.logger.entered(me, `records: ${records.length} type: ${records[0].type} match-text: ${this._sectionWatchText}`);
      for (const record of records) {
        if (record.type === 'childList') {
          for (const node of record.addedNodes) {
            const newText = node.innerText?.trim().split('\n')[0];
            if (newText && newText === this._sectionWatchText) {
              this.logger.log('via childList');
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
              this.logger.log('via attributes', record.target, `\nold: ${oldValue}\nnew:${newValue}`);
              this._resetScroll(document.documentElement.scrollTop);
            }
          }
        }
      }
      this.logger.leaving(me);
    }

    _nextSection = new Shortcut('j', 'Next section', () => {
      this._sections.next();
    });

    _prevSection = new Shortcut('k', 'Previous section', () => {
      this._sections.prev();
    });

    _nextJob = new Shortcut('n', 'Next job', () => {
      this._jobs.next();
    });

    _prevJob = new Shortcut('p', 'Previous job', () => {
      this._jobs.prev();
    });

    _firstSectionOrJob = new Shortcut('<', 'Go to to first section or job', () => {
      if (this._hasActiveJob) {
        this._jobs.first();
      } else {
        this._sections.first();
      }
    });

    _lastSectionOrJob = new Shortcut('>', 'Go to last section or job currently loaded', () => {
      if (this._hasActiveJob) {
        this._jobs.last();
      } else {
        this._sections.last();
      }
    });

    _focusBrowser = new Shortcut('f', 'Change browser focus to current section or job', () => {
      const el = this._jobs.item ?? this._sections.item;
      this._sections.show();
      this._jobs?.show();
      focusOnElement(el);
    });

    _activateJob = new Shortcut('Enter', 'Activate the current job (click on it)', () => {
      const job = this._jobs?.item;
      if (job) {
        if (!clickElement(job, ['div[data-view-name]', 'a', 'button'])) {
          this.spa.dumpInfoAboutElement(job, 'job');
        }
      } else {
        // Again, because we use Enter as the hotkey for this action.
        document.activeElement.click();
      }
    });

    _loadMoreSections = new Shortcut('l', 'Load more sections (or <i>More jobs for you</i> items)', async () => {
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
    });

    _toggleSaveJob = new Shortcut('S', 'Toggle saving job', () => {
      clickElement(this._jobs?.item, ['button[aria-label^="Save job"]', 'button[aria-label^="Unsave job"]']);
    });

    _toggleDismissJob = new Shortcut('X', 'Toggle dismissing job', async () => {
      const savedJob = this._jobs.item;

      /**
       * Trigger function for {@link otrot}.  Because, of course jobs needs
       * it.
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
    });

  }

  /** Class for handling Job collections. */
  class JobsCollections extends Page {

    // eslint-disable-next-line prefer-regex-literals
    _pathname = RegExp('^/jobs/(?:collections|search)/.*', 'u');

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
     * Create the Notifications view; includes instantiating the notifications
     * {@link Scroller}.
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
     * Complicated because there are so many variations in notification cards.
     * We do not want to use reaction counts because they can change too
     * quickly.
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static _uniqueIdentifier(element) {
      // All known <articles> have three children: icon/presence indicator,
      // content, and menu/timestamp.
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
     * Change browser focus to the current notification.
     */
    _focusBrowser = () => {
      this._notifications.show();
      focusOnElement(this._notifications.item);
    }

    /**
     * Activate the current notification.
     */
    _activateNotification = () => {
      const ONE_ITEM = 1;
      const notification = this._notifications.item;
      if (notification) {
        // Because we are using Enter as the hotkey here, if the active
        // element is inside the current card, we want that to take
        // precedence.
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
            this.spa.dumpInfoAboutElement(notification, 'notification');
          }
        }
      } else {
        // Again, because we use Enter as the hotkey for this action.
        document.activeElement.click();
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

    /**
     * Open the (⋯) menu for the current notification.
     */
    _openMeatballMenu = () => {
      clickElement(this._notifications.item, ['button[aria-label^="Settings menu"]']);
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
        // Hah.  Unlike in other places, these buttons already exist, just
        // hidden under the menu.
        const buttons = Array.from(notification.querySelectorAll('button'));
        const button = buttons
          .find(el => (/Delete .*notification/u).test(el.textContent));
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

  }

  /** Base class for {@link SPA} instance details. */
  class SPADetails {

    /**
     * An issue that happened during construction.  SPA will ask for them and
     * add them to the Errors tab.
     * @typedef {object} SetupIssue
     * @property {string[]} messages - What to pass to {@link SPA.addError}.
     */

    /** @type {SetupIssue[]} */
    _setupIssues = [];

    /**
     * @type {string} - CSS selector to monitor if self-managing URL changes.
     * The selector must resolve to an element that, once it exists, will
     * continue to exist for the lifetime of the SPA.
     */
    urlChangeMonitorSelector = 'body';

    /** @type {TabbedUI} */
    _ui = null;

    /** Create a SPADetails instance. */
    constructor() {
      if (new.target === SPADetails) {
        throw new TypeError('Abstract class; do not instantiate directly.');
      }

      this._log = new Logger(this.constructor.name);
      this._id = safeId(`${this.constructor.name}-${crypto.randomUUID()}`);
      this.dispatcher = new Dispatcher('errors', 'news');
    }

    /**
     * Called by SPA instance during its construction to allow post
     * instantiation stuff to happen.  If overridden in a subclass, this
     * should definitely be called via super.
     */
    init() {
      this.dispatcher.on('errors', this._errors);
      this.dispatcher.on('news', this._news);
    }

    /**
     * Called by SPA instance when initialization is done.  Subclasses should
     * call via super.
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
     * Handles notifications about changes to the {@link SPA} Errors tab
     * content.
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
      MyNetwork._cardsHow,
      InvitationManager._invitesHow,
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

    /** @type {string} - The element.id used to identify the info pop-up. */
    get infoId() {
      return this._infoId;
    }

    /** @param {string} val - Set the value of the info element.id. */
    set infoId(val) {
      this._infoId = val;
    }

    /**
     * @typedef {object} LicenseData
     * @property {string} name - Name of the license.
     * @property {string} url - License URL.
     */

    /** @type {LicenseData} */
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

      // In this case, the trigger was the page load.  It already happened by
      // the time we got here.
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

      // Probably should debounce this.  If the user visits this tab twice
      // fast enough, they end up with two copies loaded.  Amusing, but
      // probably should be resilient.
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

    /** Create CSS styles for stuff specific to LinkedIn Tool. */
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
        // If the site changed and we cannot insert ourself after the Me menu
        // item, then go first.
        ul.prepend(li);
        this.addSetupIssue('Unable to find the Profile navbar item.', 'LIT menu installed in non-standard location.');
      }
      const button = li.querySelector('button');
      button.addEventListener('click', () => {
        const info = document.querySelector(`#${this.infoId}`);
        info.showModal();
        info.dispatchEvent(new Event('open'));
      });
      this._log.leaving(me);
    }

    /** Set some useful global variables. */
    _setNavBarInfo() {
      const fudgeFactor = 4;

      this._globals.navBarHeightPixels = this._navbar.clientHeight + fudgeFactor;
      // XXX: These {Scroller~How} items are static, so they need to be
      // configured after we figure out what the values should be.
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
        `<p>This is information about the <b>${GM.info.script.name}</b> userscript, a type of add-on.  It is not associated with LinkedIn Corporation in any way.</p>`,
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
   * Generally, a single instance of this class is created, and all instances
   * of {Page} are registered to it.  As the user navigates through the
   * single-page application, this will react to it and enable and disable
   * view specific handling as appropriate.
   */
  class SPA {

    static _errorMarker = '---';

    /** @type {Set<Page>} - Currently active {Page}s. */
    #activePages = new Set();

    /** @type {Set<Page>} - Registered {Page}s. */
    _pages = new Set();

    /** @type {Element} - The most recent element to receive focus. */
    _lastInputElement = null;

    /** @type {KeyboardService} */
    _tabUiKeyboard = null;

    /**
     * Create a SPA.
     * @param {SPADetails} details - Implementation specific details.
     */
    constructor(details) {
      this._name = `${this.constructor.name}: ${details.constructor.name}`;
      this._id = safeId(`${this._name}-${crypto.randomUUID()}`);
      this._log = new Logger(this._name);
      this._details = details;
      this._details.init(this);
      this._installNavStyle();
      this._initializeInfoView();
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
     * Tampermonkey was the first(?) userscript manager to provide events
     * about URLs changing.  Hence the need for `@grant window.onurlchange` in
     * the UserScript header.
     * @fires Event#urlchange
     */
    _startUserscriptManagerUrlMonitor() {
      this._log.log('Using Userscript Manager provided URL monitor.');
      window.addEventListener('urlchange', (info) => {
        // The info that TM gives is not really an event.  So we turn it into
        // one and throw it again, this time onto `document` where something
        // is listening for it.
        const newUrl = new URL(info.url);
        const evt = new CustomEvent('urlchange', {detail: {url: newUrl}});
        document.dispatchEvent(evt);
      });
    }

    /**
     * Install a long lived MutationObserver that watches
     * {SPADetails.urlChangeMonitorSelector}.  Whenever it is triggered, it
     * will check to see if the current URL has changed, and if so, send an
     * appropriate event.
     * @fires Event#urlchange
     */
    async _startMutationObserverUrlMonitor() {
      this._log.log('Using MutationObserver for monitoring URL changes.');

      const observeOptions = {childList: true, subtree: true};

      /**
       * Watch for the initial {SPADetails.urlChangeMonitorSelector} to show
       * up.
       * @implements {Monitor}
       * @returns {Continuation} - Indicate whether done monitoring.
       */
      const monitor = () => {
        // The default selector is 'body', so we need to query 'document', not
        // 'document.body'.
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

    /** Select which way to monitor the URL for changes and start it. */
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
      for (const page of pages) {
        page.keyboard.setContext(context, state);
      }
    }

    /**
     * Handle focus events to track whether we have gone into or left an area
     * where we want to disable hotkeys.
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

    /** Configure handlers for the info view. */
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
     * Create and configure a separate {@link KeyboardService} for the info
     * view.
     */
    _initializeTabUiKeyboard() {
      this._tabUiKeyboard = new VM.shortcut.KeyboardService();
      this._tabUiKeyboard.register('c-right', this._nextTab);
      this._tabUiKeyboard.register('c-left', this._prevTab);
    }

    /**
     * @callback TabGenerator
     * @returns {TabbedUI~TabDefinition}
     */

    /** Add CSS styling for use with the info view. */
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
        `#${this._infoId} kbd > kbd { font-size: 0.85em; padding: 0.07em; border-width: 1px; border-style: solid; }`,
        `#${this._infoId} p { margin-bottom: 1em; }`,
        `#${this._infoId} th { padding-top: 1em; text-align: left; }`,
        `#${this._infoId} td:first-child { white-space: nowrap; text-align: right; padding-right: 0.5em; }`,
        // The "color: unset" addresses dimming because these display-only
        // buttons are disabled.
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
      const left = SPA._parseSeq2('c-left');
      const right = SPA._parseSeq2('c-right');
      const esc = SPA._parseSeq2('esc');
      instructions.innerHTML =
        `<span class="left">Use the ${left} and ${right} keys or click to select tab</span>` +
        `<span class="right">Hit ${esc} to close</span>`;
      dialog.append(name, instructions);
      return dialog;
    }

    /**
     * Add basic dialog with an embedded tabbbed ui for the info view.
     * @param {TabbedUI~TabDefinition[]} tabs - Array defining the info tabs.
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
        this._tabUiKeyboard.enable();
        for (const {panel} of this._info.tabs.values()) {
          // 0, 0 is good enough
          panel.scrollTo(0, 0);
        }
      });
      dialog.addEventListener('close', () => {
        this._setKeyboardContext('inDialog', false);
        this._tabUiKeyboard.disable();
      });
    }

    /**
     * @implements {TabGenerator}
     * @returns {TabbedUI~TabDefinition} - Initial table for the keyboard
     * shortcuts.
     */
    static _shortcutsTab() {
      return {
        name: 'Keyboard shortcuts',
        content: '<table data-spa-id="shortcuts"><tbody></tbody></table>',
      };
    }

    /**
     * Generate information about the current environment useful in bug
     * reports.
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
     * @returns {TabbedUI~TabDefinition} - Initial placeholder for error
     * logging.
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

    /** Set up everything necessary to get the info view going. */
    _initializeInfoView() {
      this._infoId = `info-${this._id}`;
      this._details.infoId = this._infoId;
      this._initializeTabUiKeyboard();

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

    static keyMap = new Map([
      ['LEFT', '←'],
      ['UP', '↑'],
      ['RIGHT', '→'],
      ['DOWN', '↓'],
    ]);

    /**
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
        return sequence.map(c => `<kbd>${c}</kbd>`).join('+');
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
        const keys = SPA._parseSeq2(seq);
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
     * Add a marker to the Errors tab so the user can see where different
     * issues happened.
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
      this._pages.add(page);
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
     * @returns {Set<Page>} - The pages to use.
     */
    _findPages(pathname) {
      const pages = Array.from(this._pages.values());
      return new Set(pages.filter(page => page.pathname.test(pathname)));
    }

    /**
     * Handle switching from the old page (if any) to the new one.
     * @param {string} pathname - A {URL.pathname}.
     */
    activate(pathname) {
      const pages = this._findPages(pathname);
      const oldPages = new Set(this.#activePages);
      const newPages = new Set(pages);
      for (const page of oldPages) {
        newPages.delete(page);
      }
      for (const page of pages) {
        oldPages.delete(page);
      }
      for (const page of oldPages) {
        page.deactivate();
        this._dull(page);
      }
      for (const page of newPages) {
        page.activate();
        this._shine(page);
      }
      this.#activePages = pages;
    }

  }

  /** Test case. */
  function testParseSeq() {
    const tests = [
      {test: 'q', expected: '<kbd><kbd>q</kbd></kbd>'},
      {test: 's-q', expected: '<kbd><kbd>Shift</kbd>+<kbd>q</kbd></kbd>'},
      {test: 'Q', expected: '<kbd><kbd>Shift</kbd>+<kbd>q</kbd></kbd>'},
      {test: 'a b', expected: '<kbd><kbd>a</kbd> then <kbd>b</kbd></kbd>'},
      {test: '<', expected: '<kbd><kbd><</kbd></kbd>'},
      {test: 'C-q', expected: '<kbd><kbd>Ctrl</kbd>+<kbd>q</kbd></kbd>'},
      {test: 'c-q', expected: '<kbd><kbd>Ctrl</kbd>+<kbd>q</kbd></kbd>'},
      {test: 'c-a-t', expected: '<kbd><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>t</kbd></kbd>'},
      {test: 'a-c-T', expected: '<kbd><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>t</kbd></kbd>'},
      {test: 'c-down esc', expected: '<kbd><kbd>Ctrl</kbd>+<kbd>↓</kbd> then <kbd>ESC</kbd></kbd>'},
      {test: 'alt-up tab', expected: '<kbd><kbd>Alt</kbd>+<kbd>↑</kbd> then <kbd>TAB</kbd></kbd>'},
      {test: 'shift-X control-alt-del', expected: '<kbd><kbd>Shift</kbd>+<kbd>x</kbd> then <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>DEL</kbd></kbd>'},
      {test: 'c-x c-v',
        expected:
       '<kbd><kbd>Ctrl</kbd>+<kbd>x</kbd> then <kbd>Ctrl</kbd>+<kbd>v</kbd></kbd>'},
      {test: 'a-x enter', expected: '<kbd><kbd>Alt</kbd>+<kbd>x</kbd> then <kbd>ENTER</kbd></kbd>'},
      {test: 'up up down down left right left right b shift-a enter', expected: '<kbd><kbd>↑</kbd> then <kbd>↑</kbd> then <kbd>↓</kbd> then <kbd>↓</kbd> then <kbd>←</kbd> then <kbd>→</kbd> then <kbd>←</kbd> then <kbd>→</kbd> then <kbd>b</kbd> then <kbd>Shift</kbd>+<kbd>a</kbd> then <kbd>ENTER</kbd></kbd>'},
    ];

    for (const {test, expected} of tests) {
      const actual = SPA._parseSeq2(test);
      const passed = actual === expected;
      const msg = `t:${test} e:${expected} a:${actual}, p:${passed}`;
      testing.log.log(msg);
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
    spa.register(new InvitationManager());
    spa.register(new Jobs());
    spa.register(new JobsCollections());
    spa.register(new Notifications());
    spa.activate(window.location.pathname);
  });

  if (testing.enabled) {
    for (const test of testing.funcs) {
      test();
    }
    testing.log.log('All tests passed.');
  }

  log.log('Initialization successful.');

})();
