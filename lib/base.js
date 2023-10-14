// ==UserScript==
// ==UserLibrary==
// @name        NH_base
// @description Base library usable any time.
// @version     4
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

window.NexusHoratio.base = (function base() {
  'use strict';

  const version = 4;

  const testing = {
    enabled: false,
    funcs: [],
  };

  const NOT_FOUND = -1;

  /**
   * Subclass of {Map} similar to Python's defaultdict.
   *
   * First argument is a factory function that will create a new default value
   * for the key if not already present in the container.
   */
  class DefaultMap extends Map {

    /**
     * @param {function() : *} factory - Function that creates a new default
     * value if a requested key is not present.
     * @param {Iterable} [iterable] - Passed to {Map} super().
     */
    constructor(factory, iterable) {
      if (!(factory instanceof Function)) {
        throw new TypeError('The factory argument MUST be of ' +
                            `type Function, not ${typeof factory}.`);
      }
      super(iterable);

      this.#factory = factory;
    }

    /** @inheritdoc */
    get(key) {
      if (!this.has(key)) {
        this.set(key, this.#factory());
      }

      return super.get(key);
    }

    #factory

  }

  /* eslint-disable max-lines-per-function */
  /* eslint-disable no-magic-numbers */
  /* eslint-disable no-unused-vars */
  /** Test case. */
  function testDefaultMap() {

    /**
     * @typedef {object} DefaultMapTest
     * @property {function()} test - Function to execute.
     * @property {*} expected - Expected results.
     */

    /** @type {Map<string,DefaultMapTest>} */
    const tests = new Map();

    tests.set('noFactory', {test: () => {
      try {
        const dummy = new DefaultMap();
      } catch (e) {
        if (e instanceof TypeError) {
          return 'caught';
        }
      }
      return 'oops';
    },
    expected: 'caught'});

    tests.set('badFactory', {test: () => {
      try {
        const dummy = new DefaultMap('a');
      } catch (e) {
        if (e instanceof TypeError) {
          return 'caught';
        }
      }
      return 'oops';
    },
    expected: 'caught'});

    tests.set('withIterable', {test: () => {
      const dummy = new DefaultMap(Number, [[1, 'one'], [2, 'two']]);
      dummy.set(3, ['a', 'b']);
      dummy.get(4);
      return JSON.stringify(Array.from(dummy.entries()));
    },
    expected: '[[1,"one"],[2,"two"],[3,["a","b"]],[4,0]]'});

    tests.set('counter', {test: () => {
      const dummy = new DefaultMap(Number);
      dummy.get('a');
      dummy.set('b', dummy.get('b') + 1);
      dummy.set('b', dummy.get('b') + 1);
      dummy.get('c');
      return JSON.stringify(Array.from(dummy.entries()));
    },
    expected: '[["a",0],["b",2],["c",0]]'});

    tests.set('array', {test: () => {
      const dummy = new DefaultMap(Array);
      dummy.get('a').push(1, 2, 3);
      dummy.get('b').push(4, 5, 6);
      dummy.get('a').push('one', 'two', 'three');
      return JSON.stringify(Array.from(dummy.entries()));
    },
    expected: '[["a",[1,2,3,"one","two","three"]],["b",[4,5,6]]]'});

    for (const [name, {test, expected}] of tests) {
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
   * Logger.config('Bob').groups.set('foo', GroupMode.Silenced);
   */
  class Logger {

    /** @param {string} name - Name for this logger. */
    constructor(name) {
      this.#name = name;
      this.#config = Logger.config(name);
      Logger.#loggers.get(this.#name).push(new WeakRef(this));
    }

    /** @type {object} - Logger configurations. */
    static get configs() {
      return Logger.#toPojo();
    }

    /** @param {object} val - Logger configurations. */
    static set configs(val) {
      Logger.#fromPojo(val);
    }

    /** @type {string[]} - Names of known loggers. */
    static get loggers() {
      return Array.from(this.#loggers.keys());
    }

    /**
     * Get configuration of a specific Logger.
     * @param {string} name - Logger configuration to get.
     * @returns {Logger.Config} - Current config for that Logger.
     */
    static config(name) {
      return this.#configs.get(name);
    }

    /** Reset all configs to an empty state. */
    static resetConfigs() {
      this.#configs.clear();
    }

    /** Clear the console. */
    static clear() {
      this.#clear();
    }

    /** @type {boolean} - Whether logging is currently enabled. */
    get enabled() {
      return this.#config.enabled;
    }

    /** @type {string} - Name for this logger. */
    get name() {
      return this.#name;
    }

    /** @type {boolean} - Indicates whether current group is silenced. */
    get silenced() {
      let ret = false;
      const group = this.#groupStack.at(-1);
      if (group) {
        const mode = this.#config.groupMode(group);
        ret = mode === Logger.#GroupMode.Silenced;
      }
      return ret;
    }

    /** @type {boolean} - Indicates whether messages include a stack trace. */
    get includeStackTrace() {
      return this.#config.includeStackTrace;
    }

    /**
     * Log a specific message.
     * @param {string} msg - Message to send to console.debug.
     * @param {...*} rest - Arbitrary items to pass to console.debug.
     */
    log(msg, ...rest) {
      this.#log(msg, ...rest);
    }

    /**
     * Indicate entered a specific group.
     * @param {string} group - Group that was entered.
     * @param {...*} rest - Arbitrary items to pass to console.debug.
     */
    entered(group, ...rest) {
      this.#intro(group, Logger.#GroupMode.Opened, ...rest);
    }

    /**
     * Indicate leaving a specific group.
     * @param {string} group - Group leaving.
     * @param {...*} rest - Arbitrary items to pass to console.debug.
     */
    leaving(group, ...rest) {
      this.#outro(group, ...rest);
    }

    /**
     * Indicate starting a specific collapsed group.
     * @param {string} group - Group that is being started.
     * @param {...*} rest - Arbitrary items to pass to console.debug.
     */
    starting(group, ...rest) {
      this.#intro(group, Logger.#GroupMode.Closed, ...rest);
    }

    /**
     * Indicate finishe a specific collapsed group.
     * @param {string} group - Group that was entered.
     * @param {...*} rest - Arbitrary items to pass to console.debug.
     */
    finished(group, ...rest) {
      this.#outro(group, ...rest);
    }

    static #configs = new DefaultMap(() => new Logger.#Config());
    static #loggers = new DefaultMap(Array);

    /**
     * Set Logger configs from a plain object.
     * @param {object} pojo - Created by {Logger.#toPojo}.
     */
    static #fromPojo = (pojo) => {
      if (pojo && pojo.type === 'LoggerConfigs') {
        this.resetConfigs();
        for (const [k, v] of Object.entries(pojo.entries)) {
          this.#configs.get(k).fromPojo(v);
        }
      }
    }

    /** @returns {object} - Logger.#configs as a plain object. */
    static #toPojo = () => {
      const pojo = {
        type: 'LoggerConfigs',
        entries: {},
      };
      for (const [k, v] of this.#configs.entries()) {
        pojo.entries[k] = v.toPojo();
      }
      return pojo;
    }

    /* eslint-disable no-console */
    static #clear = () => {
      console.clear();
    }

    /**
     * Log a specific message.
     * @param {string} msg - Message to send to console.debug.
     * @param {...*} rest - Arbitrary items to pass to console.debug.
     */
    #log = (msg, ...rest) => {
      if (this.enabled && !this.silenced) {
        if (this.includeStackTrace) {
          console.groupCollapsed(`${this.name} call stack`);
          console.includeStackTrace();
          console.groupEnd();
        }
        console.debug(`${this.name}: ${msg}`, ...rest);
      }
    }

    /**
     * Introduces a specific group.
     * @param {string} group - Group being created.
     * @param {Logger.#GroupMode} defaultMode - Mode to use if new.
     * @param {...*} rest - Arbitrary items to pass to console.debug.
     */
    #intro = (group, defaultMode, ...rest) => {
      this.#groupStack.push(group);
      const mode = this.#config.groupMode(group, defaultMode);
      if (this.enabled && mode !== Logger.#GroupMode.Silenced) {
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
     * @param {...*} rest - Arbitrary items to pass to console.debug.
     */
    #outro = (group, ...rest) => {
      const lastGroup = this.#groupStack.pop();
      if (group !== lastGroup) {
        console.error(`${this.name}: Group mismatch!  Passed ` +
                      `"${group}", expected to see "${lastGroup}"`);
      }
      const mode = this.#config.groupMode(group);
      if (this.enabled && mode !== Logger.#GroupMode.Silenced) {
        let msg = `${mode.farewell} ${group}`;
        if (rest.length) {
          msg += ' with:';
        }
        this.log(msg, ...rest);
        console.groupEnd();
      }
    }
    /* eslint-enable */

    static #Config = class {

      /** @type {boolean} - Whether logging is currently enabled. */
      get enabled() {
        return this.#enabled;
      }

      /** @param {boolean} val - Set whether logging is currently enabled. */
      set enabled(val) {
        this.#enabled = Boolean(val);
      }

      /** @type {Map<string,Logger.#GroupMode>} - Per group settings. */
      get groups() {
        return this.#groups;
      }

      /** @type {boolean} - Whether messages include a stack trace. */
      get includeStackTrace() {
        return this.#includeStackTrace;
      }

      /** @param {boolean} val - Set inclusion of stack traces. */
      set includeStackTrace(val) {
        this.#includeStackTrace = Boolean(val);
      }

      /**
       * @param {string} name - Name of the group to get.
       * @param {Logger.#GroupMode} mode - Default mode if not seen before.
       * @returns {Logger.#GroupMode} - Mode for this group.
       */
      groupMode(name, mode) {
        if (!this.#groups.has(name)) {
          this.#groups.set(name, mode);
        }
        return this.#groups.get(name);
      }

      /** @returns {object} - Config as a plain object. */
      toPojo() {
        const pojo = {
          enabled: this.enabled,
          includeStackTrace: this.includeStackTrace,
          groups: {},
        };

        for (const [k, v] of this.groups) {
          pojo.groups[k] = v.name;
        }

        return pojo;
      }

      /** @param {object} pojo - Config as a plain object. */
      fromPojo(pojo) {
        if (Object.hasOwn(pojo, 'enabled')) {
          this.enabled = pojo.enabled;
        }
        if (Object.hasOwn(pojo, 'includeStackTrace')) {
          this.includeStackTrace = pojo.includeStackTrace;
        }
        if (Object.hasOwn(pojo, 'groups')) {
          for (const [k, v] of Object.entries(pojo.groups)) {
            const gm = Logger.#GroupMode.byName(v);
            if (gm) {
              this.groupMode(k, gm);
            }
          }
        }
      }

      #enabled = false;
      #includeStackTrace = false;
      #groups = new Map();

    }

    /** Enum/helper for Logger groups. */
    static #GroupMode = class {

      /**
       * @param {string} name - Mode name.
       * @param {string} [greeting] - Greeting when opening group.
       * @param {string} [farewell] - Salutation when closing group.
       * @param {string} [func] - console.func to use for opening group.
       */
      constructor(name, greeting, farewell, func) {  // eslint-disable-line max-params
        this.#farewell = farewell;
        this.#func = func;
        this.#greeting = greeting;
        this.#name = name;

        Logger.#GroupMode.#known.set(name, this);
      }

      /**
       * Find GroupMode by name.
       * @param {string} name - Mode name.
       * @returns {GroupMode} - Mode, if found.
       */
      static byName(name) {
        return this.#known.get(name);
      }

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

      static #known = new Map();

      #farewell
      #func
      #greeting
      #name

    }

    static {
      Logger.#GroupMode.Silenced = new Logger.#GroupMode('silenced');
      Logger.#GroupMode.Opened = new Logger.#GroupMode(
        'opened', 'Entered', 'Leaving', 'group'
      );
      Logger.#GroupMode.Closed = new Logger.#GroupMode(
        'closed', 'Starting', 'Finished', 'groupCollapsed'
      );

      Object.freeze(Logger.#GroupMode);
    }

    // JavaScript does not support friend type access, so embedded these
    // tests.
    static #testGroupMode

    static {

      /** Test case. */
      Logger.#testGroupMode = () => {
        const tests = new Map();

        tests.set('isFrozen', {test: () => {
          try {
            Logger.#GroupMode.Bob = {};
          } catch (e) {
            if (e instanceof TypeError) {
              return 'cold';
            }
          }
          return 'hot';
        },
        expected: 'cold'});

        tests.set('byName', {test: () => {
          const gm = Logger.#GroupMode.byName('closed');
          return gm;
        },
        expected: Logger.#GroupMode.Closed});

        tests.set('byNameBad', {test: () => {
          const gm = Logger.#GroupMode.byName('bob');
          if (!gm) {
            return 'expected-missing-bob';
          }
          return 'confused-bob';
        },
        expected: 'expected-missing-bob'});

        for (const [name, {test, expected}] of tests) {
          const actual = test();
          const passed = actual === expected;
          const msg = `t:${name} e:${expected} a:${actual} p:${passed}`;
          testing.log.log(msg);
          if (!passed) {
            throw new Error(msg);
          }
        }

      };

      Logger.#testGroupMode.testName = 'testLoggerGroupMode';

      testing.funcs.push(Logger.#testGroupMode);
    }

    #config
    #groupStack = [];
    #name

  }

  /* eslint-disable max-lines-per-function */
  /** Test case. */
  function testLogger() {
    const tests = new Map();

    tests.set('testReset', {test: () => {
      Logger.config('UncleBob').enabled = true;
      Logger.resetConfigs();
      return JSON.stringify(Logger.configs.entries);
    },
    expected: '{}'});

    tests.set('defaultDisabled', {test: () => {
      const config = Logger.config('Bob');
      return config.enabled;
    },
    expected: false});

    tests.set('defaultNoStackTraces', {test: () => {
      const config = Logger.config('Bob');
      return config.includeStackTrace;
    },
    expected: false});

    tests.set('defaultNoGroups', {test: () => {
      const config = Logger.config('Bob');
      return config.groups.size;
    },
    expected: 0});

    tests.set('openedGroup', {test: () => {
      const logger = new Logger('Bob');
      logger.entered('ent');
      return Logger.config('Bob').groups.get('ent').name;
    },
    expected: 'opened'});

    tests.set('closedGroup', {test: () => {
      const logger = new Logger('Bob');
      logger.starting('start');
      return Logger.config('Bob').groups.get('start').name;
    },
    expected: 'closed'});

    tests.set('mismatchedGroup', {test: () => {
      // This test requires manual verification that an error message was
      // logged:
      // Bob: Group mismatch!  Passed "two", expected to see "one"
      const logger = new Logger('Bob');
      logger.entered('one');
      logger.leaving('two');
      return 'x';
    },
    expected: 'x'});

    tests.set('restoreConfigs', {test: () => {
      const results = [];
      Logger.config('Bob').includeStackTrace = true;
      results.push(Logger.config('Bob').includeStackTrace);
      const oldConfigs = Logger.configs;

      Logger.resetConfigs();
      results.push(Logger.config('Bob').includeStackTrace);

      // Pat is not in oldConfigs, so should go back to the default (false)
      // after restoring the configs.
      Logger.config('Pat').enabled = true;
      Logger.configs = oldConfigs;
      results.push(Logger.config('Bob').includeStackTrace);
      results.push(Logger.config('Pat').enabled);

      return JSON.stringify(results);
    },
    expected: '[true,false,true,false]'});

    const savedConfigs = Logger.configs;
    for (const [name, {test, expected}] of tests) {
      Logger.resetConfigs();
      const actual = test();
      const passed = actual === expected;
      const msg = `t:${name} e:${expected} a:${actual} p:${passed}`;
      testing.log.log(msg);
      if (!passed) {
        throw new Error(msg);
      }
    }
    Logger.configs = savedConfigs;

  }
  /* eslint-enable */

  testing.funcs.push(testLogger);

  return {
    version: version,
    testing: testing,
    NOT_FOUND: NOT_FOUND,
    DefaultMap: DefaultMap,
    Logger: Logger,
  };

}());
