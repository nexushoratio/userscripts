// ==UserScript==
// ==UserLibrary==
// @name        NH_base
// @description Base library usable any time.
// @version     30
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

window.NexusHoratio.base = (function base() {
  'use strict';

  /** @type {number} - Bumped per release. */
  const version = 30;

  /**
   * @type {number} - Constant (to make eslint's `no-magic-numbers` setting
   * happy).
   */
  const NOT_FOUND = -1;

  /**
   * @typedef {NexusHoratioVersion}
   * @property {string} name - Library name.
   * @property {number} [minVersion=0] - Minimal version needed.
   */

  /**
   * Ensures appropriate versions of NexusHoratio libraries are loaded.
   * @param {NexusHoratioVersion[]} versions - Versions required.
   * @returns {object} - Namespace with only ensured libraries present.
   * @throws {Error} - When requirements not met.
   */
  function ensure(versions) {
    let msg = 'Forgot to set a message';
    const namespace = {};
    for (const ver of versions) {
      const {
        name,
        minVersion = 0,
      } = ver;
      const lib = window.NexusHoratio[name];
      if (!lib) {
        msg = `Library "${name}" is not loaded`;
        throw new Error(`Not Loaded: ${msg}`);
      }
      if (minVersion > lib.version) {
        msg = `At least version ${minVersion} of library "${name}" ` +
          `required; version ${lib.version} present.`;
        throw new Error(`Min Version: ${msg}`);
      }
      namespace[name] = lib;
    }
    return namespace;
  }

  const NH = ensure([{name: 'xunit', minVersion: 20}]);

  /* eslint-disable require-jsdoc */
  class EnsureTestCase extends NH.xunit.TestCase {

    testEmpty() {
      const actual = ensure([]);
      const expected = {};
      // TODO(#183): Better assertEqual()
      this.assertEqual(JSON.stringify(actual), JSON.stringify(expected));
    }

    testNameOnly() {
      const ns = ensure([{name: 'base'}]);
      this.assertTrue(ns.base);
    }

    testMinVersion() {
      this.assertRaisesRegExp(
        Error, /^Min Version:.*required.*present.$/u, () => {
          ensure([{name: 'base', minVersion: Number.MAX_VALUE}]);
        }
      );
    }

    testMissing() {
      this.assertRaisesRegExp(
        Error, /^Not Loaded: /u, () => {
          ensure([{name: 'missing'}]);
        }
      );
    }

  }
  /* eslint-enable */

  NH.xunit.testing.testCases.push(EnsureTestCase);

  /**
   * A Number like class that supports operations.
   *
   * For lack of any other standard, methods will be named like those in
   * Python's operator module.
   *
   * All operations should return `this` to allow chaining.
   *
   * The existence of the valueOf(), toString() and toJSON() methods will
   * probably allow this class to work in many situations through type
   * coercion.
   */
  class NumberOp {

    /** @param {number} value - Initial value, parsed by Number(). */
    constructor(value) {
      this.assign(value);
    }

    /** @returns {number} - Current value. */
    valueOf() {
      return this.#value;
    }

    /** @returns {string} - Current value. */
    toString() {
      return `${this.valueOf()}`;
    }

    /** @returns {number} - Current value. */
    toJSON() {
      return this.valueOf();
    }

    /**
     * @param {number} value - Number to assign.
     * @returns {NumberOp} - This instance.
     */
    assign(value = 0) {
      this.#value = Number(value);
      return this;
    }

    /**
     * @param {number} value - Number to add.
     * @returns {NumberOp} - This instance.
     */
    add(value) {
      this.#value += Number(value);
      return this;
    }

    #value

  }

  /* eslint-disable no-magic-numbers */
  /* eslint-disable no-undefined */
  /* eslint-disable require-jsdoc */
  class NumberOpTestCase extends NH.xunit.TestCase {

    testValueOf() {
      this.assertEqual(new NumberOp().valueOf(), 0, 'default');
      this.assertEqual(new NumberOp(null).valueOf(), 0, 'null');
      this.assertEqual(new NumberOp(undefined).valueOf(), 0, 'undefined');
      this.assertEqual(new NumberOp(42).valueOf(), 42, 'number');
      this.assertEqual(new NumberOp('52').valueOf(), 52, 'string');
    }

    testToString() {
      this.assertEqual(new NumberOp(123).toString(), '123', 'number');
      this.assertEqual(new NumberOp(null).toString(), '0', 'null');
      this.assertEqual(new NumberOp(undefined).toString(), '0', 'undefined');
    }

    testTemplateLiteral() {
      const val = new NumberOp(456);
      this.assertEqual(`abc${val}xyz`, 'abc456xyz');
    }

    testBasicMath() {
      this.assertEqual(new NumberOp(124) + 6, 130, 'NO + x');
      this.assertEqual(3 + new NumberOp(5), 8, 'x + NO');
    }

    testStringManipulation() {
      const a = 'abc';
      const x = 'xyz';
      const n = new NumberOp('654');

      this.assertEqual(a + n, 'abc654', 's + NO');
      this.assertEqual(n + x, '654xyz', 'NO + s');
    }

    testAssignOp() {
      const n = new NumberOp(123);
      n.assign(42);
      this.assertEqual(n.valueOf(), 42, 'number');

      n.assign(null);
      this.assertEqual(n.valueOf(), 0, 'null');

      n.assign(789);
      this.assertEqual(n.valueOf(), 789, 'number, reset');

      n.assign(undefined);
      this.assertEqual(n.valueOf(), 0, 'undefined');
    }

    testAddOp() {
      this.assertEqual(new NumberOp(3).add(1)
        .valueOf(), 4,
      'number');
      this.assertEqual(new NumberOp(1).add('5')
        .valueOf(), 6,
      'string');
      this.assertEqual(new NumberOp(3).add(new NumberOp(8))
        .valueOf(), 11,
      'NO.add(NO)');
      this.assertEqual(new NumberOp(9).add(-16)
        .valueOf(), -7,
      'negative');
    }

    testChaining() {
      this.assertEqual(new NumberOp().add(1)
        .add(2)
        .add('3')
        .valueOf(), 6,
      'adds');
      this.assertEqual(new NumberOp(3).assign(40)
        .add(2)
        .valueOf(), 42,
      'mixed');
    }

  }
  /* eslint-enable */

  NH.xunit.testing.testCases.push(NumberOpTestCase);

  /**
   * Subclass of {Map} similar to Python's defaultdict.
   *
   * First argument is a factory function that will create a new default value
   * for the key if not already present in the container.
   *
   * The factory function may take arguments.  If `.get()` is called with
   * extra arguments, those will be passed to the factory if it needed.
   */
  class DefaultMap extends Map {

    /**
     * @param {function(...args) : *} factory - Function that creates a new
     * default value if a requested key is not present.
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

    /**
     * Enhanced version of `Map.prototype.get()`.
     * @param {*} key - The key of the element to return from this instance.
     * @param {...*} args - Extra arguments passed tot he factory function if
     * it is called.
     * @returns {*} - The value associated with the key, perhaps newly
     * created.
     */
    get(key, ...args) {
      if (!this.has(key)) {
        this.set(key, this.#factory(...args));
      }

      return super.get(key);
    }

    #factory

  }

  /* eslint-disable require-jsdoc */
  /* eslint-disable no-new */
  /* eslint-disable no-magic-numbers */
  class DefaultMapTestCase extends NH.xunit.TestCase {

    testNoFactory() {
      this.assertRaisesRegExp(TypeError, /MUST.*not undefined/u, () => {
        new DefaultMap();
      });
    }

    testBadFactory() {
      this.assertRaisesRegExp(TypeError, /MUST.*not string/u, () => {
        new DefaultMap('a');
      });
    }

    testFactorWithArgs() {
      // Assemble
      const dummy = new DefaultMap(x => new NumberOp(x));
      this.defaultEqual = this.equalValueOf;

      // Act
      dummy.get('a');
      dummy.get('b', 5);

      // Assert
      this.assertEqual(Array.from(dummy.entries()),
        [['a', 0], ['b', 5]]);
    }

    testWithIterable() {
      // Assemble
      const dummy = new DefaultMap(Number, [[1, 'one'], [2, 'two']]);

      // Act
      dummy.set(3, ['a', 'b']);
      dummy.get(4);

      // Assert
      this.assertEqual(Array.from(dummy.entries()),
        [[1, 'one'], [2, 'two'], [3, ['a', 'b']], [4, 0]]);
    }

    testCounter() {
      // Assemble
      const dummy = new DefaultMap(() => new NumberOp());
      this.defaultEqual = this.equalValueOf;

      // Act
      dummy.get('a');
      dummy.get('b').add(1);
      dummy.get('b').add(1);
      dummy.get('c');
      dummy.get(4).add(1);

      // Assert
      this.assertEqual(Array.from(dummy.entries()),
        [['a', 0], ['b', 2], ['c', 0], [4, 1]]);
    }

    testArray() {
      // Assemble
      const dummy = new DefaultMap(Array);

      // Act
      dummy.get('a').push(1, 2, 3);
      dummy.get('b').push(4, 5, 6);
      dummy.get('a').push('one', 'two', 'three');

      // Assert
      this.assertEqual(Array.from(dummy.entries()),
        [['a', [1, 2, 3, 'one', 'two', 'three']], ['b', [4, 5, 6]]]);
    }

  }
  /* eslint-enable */

  NH.xunit.testing.testCases.push(DefaultMapTestCase);

  /**
   * Fancy-ish log messages (likely over engineered).
   *
   * Console nested message groups can be started and ended using the special
   * method pairs, {@link Logger#entered}/{@link Logger#leaving} and {@link
   * Logger#starting}/{@link Logger#finished}.  By default, the former are
   * opened and the latter collapsed (documented here as closed).
   *
   * Individual Loggers can be enabled/disabled by setting the {@link
   * Logger##Config.enabled} boolean property.
   *
   * Each Logger will have also have a collection of {@link Logger##Group}s
   * associated with it.  These groups can have one of three modes: "opened",
   * "closed", "silenced".  The first two correspond to the browser console
   * nested message groups.  The intro and outro type of methods will handle
   * the nesting.  If a group is set as "silenced", no messages will be sent
   * to the console.
   *
   * All Logger instances register a configuration with a singleton Map keyed
   * by the instance name.  If more than one instance is created with the same
   * name, they all share the same configuration.
   *
   * Configurations can be exported as a plain object and reimported using the
   * {@link Logger.configs} property.  The object could be saved via the
   * userscript script manager.  Depending on which one, it may have to be
   * processed with the JSON.{stringify,parse} functions.  Once exported, the
   * object may be modified.  This could be used to provide a UI to edit the
   * object, though no schema is provided.
   *
   * Some values may be of interest to users for help in debugging a script.
   *
   * The {callCount} value is how many times a logger would have been used for
   * messages, even if the logger is disabled.  Similarly, each group
   * associated with a logger also has a {callCount}.  These values can be
   * used to determine which loggers and groups generate a lot of messages and
   * could be disabled or silenced.
   *
   * The {sequence} value is a rough indicator of how recently a logger or
   * group was actually used.  It is purposely not a timestamp, but rather,
   * more closely associated with how often configurations are restored,
   * e.g. during web page reloads.  A low sequence number, relative to the
   * others, may indicate a logger was renamed, groups removed, or simply
   * parts of an application that have not been visited recently.  Depending
   * on the situation, the could clean up old configs, or explore other parts
   * of the script.
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
   * Logger.config('Bob').group('foo').mode = 'silenced');
   *
   * GM.setValue('Logger', Logger.configs);
   * ... restart browser ...
   * Logger.configs = GM.getValue('Logger');
   */
  class Logger {

    /** @param {string} name - Name for this logger. */
    constructor(name) {
      this.#name = name;
      this.#config = Logger.config(name);
      Logger.#loggers.get(this.#name).push(new WeakRef(this));
    }

    static sequence = 1;

    /** @type {object} - Logger configurations. */
    static get configs() {
      return Logger.#toPojo();
    }

    /** @param {object} val - Logger configurations. */
    static set configs(val) {
      Logger.#fromPojo(val);
      Logger.#resetLoggerConfigs();
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
      this.sequence = 1;
    }

    /** Clear the console. */
    static clear() {
      this.#clear();
    }

    /** @type {boolean} - Whether logging is currently enabled. */
    get enabled() {
      return this.#config.enabled;
    }

    /** @type {boolean} - Indicates whether messages include a stack trace. */
    get includeStackTrace() {
      return this.#config.includeStackTrace;
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
        const mode = this.#config.group(group).mode;
        ret = mode === Logger.#GroupMode.Silenced;
      }
      return ret;
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
        Logger.sequence += 1;
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

    /**
     * This only resets Logger instances that have know configs.
     *
     * That way, Loggers created during tests wrapped with a save/restore
     * sequence, will not have their configs regenerated.
     */
    static #resetLoggerConfigs = () => {
      for (const key of this.#configs.keys()) {
        // We do not want to accidentally create a key in this DefaultMap.
        if (this.#loggers.has(key)) {
          const loggerArrays = this.#loggers.get(key);
          for (const loggerRef of loggerArrays) {
            const logger = loggerRef.deref();
            if (logger) {
              logger.#config = Logger.config(key);
            }
          }
        }
      }
    }

    /* eslint-disable no-console */
    static #clear = () => {
      console.clear();
    }

    #config
    #groupStack = [];
    #name

    /**
     * Log a specific message.
     * @param {string} msg - Message to send to console.debug.
     * @param {...*} rest - Arbitrary items to pass to console.debug.
     */
    #log = (msg, ...rest) => {
      const group = this.#groupStack.at(-1);
      this.#config.used(group);
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
      const mode = this.#config.group(group, defaultMode).mode;

      if (this.enabled && mode !== Logger.#GroupMode.Silenced) {
        console[mode.func](`${this.name}: ${group}`);
      }

      if (rest.length) {
        const msg = `${mode.greeting} ${group} with`;
        this.log(msg, ...rest);
      }
    }

    /**
     * Concludes a specific group.
     * @param {string} group - Group leaving.
     * @param {...*} rest - Arbitrary items to pass to console.debug.
     */
    #outro = (group, ...rest) => {
      const mode = this.#config.group(group).mode;

      let msg = `${mode.farewell} ${group}`;
      if (rest.length) {
        msg += ' with:';
      }
      this.log(msg, ...rest);

      const lastGroup = this.#groupStack.pop();
      if (group !== lastGroup) {
        console.error(`${this.name}: Group mismatch!  Passed ` +
                      `"${group}", expected to see "${lastGroup}"`);
      }

      if (this.enabled && mode !== Logger.#GroupMode.Silenced) {
        console.groupEnd();
      }
    }
    /* eslint-enable */

    static #Config = class {

      sequence = 0;

      /** @type {NumberOp} */
      get callCount() {
        return this.#callCount;
      }

      /** @type {boolean} - Whether logging is currently enabled. */
      get enabled() {
        return this.#enabled;
      }

      /** @param {boolean} val - Set whether logging is currently enabled. */
      set enabled(val) {
        this.#enabled = Boolean(val);
      }

      /** @type {Map<string,Logger.#Group>} - Per group settings. */
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
       * @returns {Logger.#Group} - Requested group, perhaps newly made.
       */
      group(name, mode) {
        const sanitizedName = name ?? 'null';
        const defaultMode = mode ?? 'opened';
        return this.#groups.get(sanitizedName, defaultMode);
      }

      /**
       * Capture that the associated Logger was used.
       * @param {string} name - Which group was used.
       */
      used(name) {
        const grp = this.group(name);

        this.callCount.add(1);
        this.sequence = Logger.sequence;

        grp.callCount.add(1);
        grp.sequence = Logger.sequence;
      }

      /** @returns {object} - Config as a plain object. */
      toPojo() {
        const pojo = {
          callCount: this.callCount.valueOf(),
          sequence: this.sequence,
          enabled: this.enabled,
          includeStackTrace: this.includeStackTrace,
          groups: {},
        };

        for (const [k, v] of this.groups) {
          pojo.groups[k] = v.toPojo();
        }

        return pojo;
      }

      /** @param {object} pojo - Config as a plain object. */
      fromPojo(pojo) {
        if (Object.hasOwn(pojo, 'callCount')) {
          this.callCount.assign(pojo.callCount);
        }
        if (Object.hasOwn(pojo, 'sequence')) {
          this.sequence = pojo.sequence;
          Logger.sequence = Math.max(Logger.sequence, this.sequence);
        }
        if (Object.hasOwn(pojo, 'enabled')) {
          this.enabled = pojo.enabled;
        }
        if (Object.hasOwn(pojo, 'includeStackTrace')) {
          this.includeStackTrace = pojo.includeStackTrace;
        }
        if (Object.hasOwn(pojo, 'groups')) {
          for (const [k, v] of Object.entries(pojo.groups)) {
            const gm = Logger.#GroupMode.byName(v.mode);
            if (gm) {
              this.group(k).fromPojo(v);
            }
          }
        }
      }

      #callCount = new NumberOp();
      #enabled = false;
      #groups = new DefaultMap(x => new Logger.#Group(x));
      #includeStackTrace = false;

    }

    static #Group = class {

      /** @param {Logger.#GroupMode} mode - Initial mode for this group. */
      constructor(mode) {
        this.mode = mode;
        this.sequence = 0;
      }

      /** @type {NumberOp} */
      get callCount() {
        return this.#callCount;
      }

      /** @type {Logger.#GroupMode} */
      get mode() {
        return this.#mode;
      }

      /** @param {Logger.#GroupMode} val - Mode to set this group. */
      set mode(val) {
        let newVal = val;
        if (!(newVal instanceof Logger.#GroupMode)) {
          newVal = Logger.#GroupMode.byName(newVal);
        }
        if (newVal) {
          this.#mode = newVal;
        }
      }

      /** @returns {object} - Group as a plain object. */
      toPojo() {
        const pojo = {
          mode: this.mode.name,
          callCount: this.callCount.valueOf(),
          sequence: this.sequence,
        };

        return pojo;
      }

      /** @param {object} pojo - Group as a plain object. */
      fromPojo(pojo) {
        this.mode = pojo.mode;
        this.callCount.assign(pojo.callCount);
        this.sequence = pojo.sequence ?? 0;
        Logger.sequence = Math.max(Logger.sequence, this.sequence);
      }

      #callCount = new NumberOp();
      #mode

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

        Object.freeze(this);
      }

      /**
       * Find GroupMode by name.
       * @param {string} name - Mode name.
       * @returns {GroupMode} - Mode, if found.
       */
      static byName(name) {
        return this.#known.get(name);
      }

      /** @type {string} - Farewell when closing group. */
      get farewell() {
        return this.#farewell;
      }

      /** @type {string} - console.func to use for opening group. */
      get func() {
        return this.#func;
      }

      /** @type {string} - Greeting when opening group. */
      get greeting() {
        return this.#greeting;
      }

      /** @type {string} - Mode name. */
      get name() {
        return this.#name;
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

      /* eslint-disable max-lines-per-function */
      /** Test case. */
      Logger.#testGroupMode = () => {
        const tests = new Map();

        tests.set('classIsFrozen', {test: () => {
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

        tests.set('instanceIsFrozen', {test: () => {
          try {
            Logger.#GroupMode.Silenced.newProp = 'data';
          } catch (e) {
            if (e.message.includes('newProp')) {
              return 'cold';
            }
            return 'exception message missing newProp';
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
          NH.xunit.testing.log.log(msg);
          if (!passed) {
            throw new Error(msg);
          }
        }

      };
      /* eslint-enable */

      Logger.#testGroupMode.testName = 'testLoggerGroupMode';

      NH.xunit.testing.funcs.push(Logger.#testGroupMode);
    }

  }

  /* eslint-disable max-lines-per-function */
  /* eslint-disable max-statements */
  /* eslint-disable no-magic-numbers */
  /** Test case. */
  function testLogger() {
    const tests = new Map();

    tests.set('testReset', {test: () => {
      Logger.config('testReset').enabled = true;
      Logger.resetConfigs();
      return JSON.stringify(Logger.configs.entries);
    },
    expected: '{}'});

    tests.set('defaultDisabled', {test: () => {
      const config = Logger.config('defaultDisabled');
      return config.enabled;
    },
    expected: false});

    tests.set('defaultNoStackTraces', {test: () => {
      const config = Logger.config('defaultNoStackTraces');
      return config.includeStackTrace;
    },
    expected: false});

    tests.set('defaultNoGroups', {test: () => {
      const config = Logger.config('defaultNoGroups');
      return config.groups.size;
    },
    expected: 0});

    tests.set('openedGroup', {test: () => {
      const logger = new Logger('openedGroup');
      logger.entered('ent');
      return Logger.config('openedGroup').groups.get('ent').mode.name;
    },
    expected: 'opened'});

    tests.set('closedGroup', {test: () => {
      const logger = new Logger('closedGroup');
      logger.starting('start');
      return Logger.config('closedGroup').groups.get('start').mode.name;
    },
    expected: 'closed'});

    tests.set('countsCollected', {test: () => {
      const me = 'countsCollected';
      Logger.sequence = 10;
      const logger = new Logger(me);
      const results = [];

      // Results in counts
      logger.log('one');
      logger.log('two');

      // No count because no message logged
      logger.entered('ent1');

      // The extra causes a log message
      logger.entered('ent2', 'extra');

      // Count in group
      logger.log('three');

      // Outros cause logs
      logger.leaving('ent2');
      logger.leaving('ent1', 'extra');

      results.push(Logger.config(me).callCount, Logger.config(me).sequence);
      for (const [name, group] of Logger.config(me).groups) {
        results.push(name, group.callCount, group.sequence);
      }

      return JSON.stringify(results);
    },
    expected: '[6,10,"null",2,10,"ent1",1,10,"ent2",3,10]'});

    tests.set('expectMismatchedGroup', {test: () => {
      // This test requires manual verification that an error message was
      // logged:
      // <name>: Group mismatch!  Passed "two", expected to see "one"
      const logger = new Logger('expectMismatchedGroup');
      logger.entered('one');
      logger.leaving('two');
      return 'x';
    },
    expected: 'x'});

    tests.set('updateGroupByString', {test: () => {
      const logger = new Logger('updateGroupByString');
      logger.entered('one');
      Logger.config('updateGroupByString').group('one').mode = 'silenced';
      return Logger.config('updateGroupByString').group('one').mode.name;
    },
    expected: 'silenced'});

    tests.set('restoreConfigsTopLevel', {test: () => {
      const me = 'restoreConfigsTopLevel';
      const results = [];

      Logger.config(me).includeStackTrace = true;
      const logger = new Logger(me);
      logger.log('once');
      results.push(Logger.config(me).includeStackTrace);
      results.push(Logger.config(me).callCount);
      const oldConfigs = Logger.configs;

      Logger.resetConfigs();
      results.push(Logger.config(me).includeStackTrace);
      results.push(Logger.config(me).callCount);

      // Bob is not in oldConfigs, so should go back to the default (false)
      // after restoring the configs.
      Logger.config('Bob').enabled = true;
      Logger.configs = oldConfigs;
      results.push(Logger.config(me).includeStackTrace);
      results.push(Logger.config(me).callCount);
      results.push(Logger.config('Bob').enabled);

      return JSON.stringify(results);
    },
    expected: '[true,1,false,0,true,1,false]'});

    tests.set('restoreConfigsGroups', {test: () => {
      const me = 'restoreConfigsGroups';
      const results = [];

      const logger = new Logger(me);
      logger.starting('ent');
      logger.finished('ent');
      results.push(Logger.config(me).group('ent').mode.name);
      results.push(Logger.config(me).group('ent').callCount);

      const saved = Logger.configs;
      Logger.resetConfigs();
      results.push(Logger.config(me).group('ent').mode.name);
      results.push(Logger.config(me).group('ent').callCount);

      Logger.configs = saved;
      results.push(Logger.config(me).group('ent').mode.name);
      results.push(Logger.config(me).group('ent').callCount);

      return JSON.stringify(results);
    },
    expected: '["closed",1,"opened",0,"closed",1]'});

    tests.set('sequenceIncreases', {test: () => {
      const me = 'sequenceIncreases';
      const groupName = 'ent';
      Logger.sequence = 23;

      const logger = new Logger(me);
      logger.starting(groupName);
      logger.finished(groupName);

      const saved = Logger.configs;
      saved.entries[me].sequence = 34;
      saved.entries[me].groups[groupName].sequence = 42;

      Logger.configs = saved;
      return Logger.sequence > 42;
    },
    expected: true});

    const savedConfigs = Logger.configs;
    for (const [name, {test, expected}] of tests) {
      Logger.resetConfigs();
      const actual = test();
      const passed = actual === expected;
      const msg = `t:${name} e:${expected} a:${actual} p:${passed}`;
      NH.xunit.testing.log.log(msg);
      if (!passed) {
        throw new Error(msg);
      }
    }
    Logger.configs = savedConfigs;

  }
  /* eslint-enable */

  NH.xunit.testing.funcs.push(testLogger);

  /**
   * Execute function tests.
   * @returns {boolean} - Success status.
   */
  function doFunctionTests() {
    const me = 'Running function tests';
    NH.xunit.testing.log.entered(me);
    let savedConfigs = null;
    let passed = true;

    for (const test of NH.xunit.testing.funcs) {
      const name = test.name || test.testName;
      NH.xunit.testing.log.starting(name);
      savedConfigs = Logger.configs;

      try {
        test();
      } catch (e) {
        NH.xunit.testing.log.log('caught exception:', e);
        passed = false;
      }

      Logger.configs = savedConfigs;
      NH.xunit.testing.log.finished(name);
      // Bail after the first failure.
      if (!passed) {
        break;
      }
    }

    NH.xunit.testing.log.leaving(me, passed);
    return passed;
  }

  /**
   * Execute TestCase tests.
   * @returns {boolean} - Success status.
   */
  function doTestCases() {
    const me = 'Running TestCases';
    NH.xunit.testing.log.entered(me);

    const savedConfigs = Logger.configs;
    const result = NH.xunit.runTests();
    Logger.configs = savedConfigs;

    NH.xunit.testing.log.log('result:', result);
    if (result.errors.length) {
      NH.xunit.testing.log.starting('Errors');
      for (const error of result.errors) {
        NH.xunit.testing.log.log('error:', error);
      }
      NH.xunit.testing.log.finished('Errors');
    }

    if (result.failures.length) {
      NH.xunit.testing.log.starting('Failures');
      for (const failure of result.failures) {
        NH.xunit.testing.log.log('failure:', failure.name, failure.message);
      }
      NH.xunit.testing.log.finished('Failures');
    }

    NH.xunit.testing.log.leaving(me, result.wasSuccessful());
    return result.wasSuccessful();
  }

  /**
   * Basic test runner.
   *
   * This depends on {Logger}, hence the location in this file.
   */
  function runTests() {
    NH.xunit.testing.log = new Logger('Testing');

    if (NH.xunit.testing.enabled) {
      if (doFunctionTests()) {
        NH.xunit.testing.log.log('All function tests passed.');
      } else {
        NH.xunit.testing.log.log('A function test failed.');
      }
      if (doTestCases()) {
        NH.xunit.testing.log.log('All TestCases passed.');
      } else {
        NH.xunit.testing.log.log('At least one TestCase failed.');
      }
    }

  }

  NH.xunit.testing.run = runTests;

  /**
   * Create a UUID-like string with a base.
   * @param {string} strBase - Base value for the string.
   * @returns {string} - A unique string.
   */
  function uuId(strBase) {
    return `${strBase}-${crypto.randomUUID()}`;
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

  /* eslint-disable no-undefined */
  /* eslint-disable require-jsdoc */
  class SafeIdTestCase extends NH.xunit.TestCase {

    testNormalInputs() {
      const tests = [
        {text: 'Tabby Cat', expected: 'Tabby-Cat'},
        {text: '_', expected: '_'},
        {text: '', expected: 'a'},
        {text: '0', expected: 'a0'},
        {text: 'a.b.c', expected: 'a_b_c'},
        {text: 'a,b,c', expected: 'a__comma__b__comma__c'},
        {text: 'a:b::c', expected: 'a__colon__b__colon____colon__c'},
      ];
      for (const {text, expected} of tests) {
        this.assertEqual(safeId(text), expected);
      }
    }

    testBadInputs() {
      this.assertRaises(
        TypeError,
        () => {
          safeId(undefined);
        },
        'undefined'
      );

      this.assertRaises(
        TypeError,
        () => {
          safeId(null);
        },
        'null'
      );
    }

  }
  /* eslint-enable */

  NH.xunit.testing.testCases.push(SafeIdTestCase);

  /**
   * Equivalent (for now) Java's hashCode (do not store externally).
   *
   * Do not expect it to be stable across releases.
   *
   * Implements: s[0]*31(n-1) + s[1]*31(n-2) + ... + s[n-1]
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
   * Simple dispatcher (event bus).
   *
   * It takes a fixed list of event types upon construction and attempts to
   * use an unknown event will throw an error.
   */
  class Dispatcher {

    /**
     * @callback Handler
     * @param {string} eventType - Event type.
     * @param {*} data - Event data.
     */

    /**
     * @param {...string} eventTypes - Event types this instance can handle.
     */
    constructor(...eventTypes) {
      for (const eventType of eventTypes) {
        this.#handlers.set(eventType, []);
      }
    }

    /**
     * Attach a function to an eventType.
     * @param {string} eventType - Event type to connect with.
     * @param {Handler} func - Single argument function to call.
     */
    on(eventType, func) {
      const handlers = this.#getHandlers(eventType);
      handlers.push(func);
    }

    /**
     * Remove all instances of a function registered to an eventType.
     * @param {string} eventType - Event type to disconnect from.
     * @param {Handler} func - Function to remove.
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
        handler(eventType, data);
      }
    }

    #handlers = new Map();

    /**
     * Look up array of handlers by event type.
     * @param {string} eventType - Event type to look up.
     * @throws {Error} - When eventType was not registered during
     * instantiation.
     * @returns {Handler[]} - Handlers currently registered for this
     * eventType.
     */
    #getHandlers = (eventType) => {
      const handlers = this.#handlers.get(eventType);
      if (!handlers) {
        const eventTypes = Array.from(this.#handlers.keys()).join(', ');
        throw new Error(
          `Unknown event type: ${eventType}, must be one of: ${eventTypes}`
        );
      }
      return handlers;
    }

  }

  /**
   * Separate a string of concatenated words along transitions.
   *
   * Transitions are:
   *   lower to upper (lowerUpper -> lower Upper)
   *   grouped upper to lower (ABCd -> AB Cd)
   *   underscores (snake_case -> snake case)
   *   spaces
   *   character/numbers (lower2Upper -> lower 2 Upper)
   * Likely only works with ASCII.
   * Empty strings return an empty array.
   * Extra separators are consolidated.
   * @param {string} text - Text to parse.
   * @returns {string[]} - Parsed text.
   */
  function simpleParseWords(text) {
    const results = [];

    const working = [text];
    const moreWork = [];

    while (working.length || moreWork.length) {
      if (working.length === 0) {
        working.push(...moreWork);
        moreWork.length = 0;
      }

      // Unicode categories used below:
      // L - Letter
      // Ll - Letter, lower
      // Lu - Letter, upper
      // N - Number
      let word = working.shift();
      if (word) {
        word = word.replace(
          /(?<lower>\p{Ll})(?<upper>\p{Lu})/u,
          '$<lower> $<upper>'
        );

        word = word.replace(
          /(?<upper>\p{Lu}+)(?<lower>\p{Lu}\p{Ll})/u,
          '$<upper> $<lower>'
        );

        word = word.replace(
          /(?<letter>\p{L})(?<number>\p{N})/u,
          '$<letter> $<number>'
        );

        word = word.replace(
          /(?<number>\p{N})(?<letter>\p{L})/u,
          '$<number> $<letter>'
        );

        const split = word.split(/[ _]/u);
        if (split.length > 1 || moreWork.length) {
          moreWork.push(...split);
        } else {
          results.push(word);
        }
      }
    }

    return results;
  }

  /* eslint-disable require-jsdoc */
  class SimpleParseWordsTestCase extends NH.xunit.TestCase {

    // TODO(#183): Stop doing joins once assertEqual() is better.
    testEmpty() {
      // Act
      const actual = simpleParseWords('');

      // Assert
      this.assertEqual(actual.length, 0);
    }

    testSeparatorsOnly() {
      // Act
      const actual = simpleParseWords(' _ __  _');

      // Assert
      this.assertEqual(actual.length, 0);
    }

    testAllLower() {
      // Act
      const actual = simpleParseWords('lower');

      // Assert
      const expected = 'lower';
      this.assertEqual(actual.join(','), expected);
    }

    testAllUpper() {
      // Act
      const actual = simpleParseWords('UPPER');

      // Assert
      const expected = 'UPPER';
      this.assertEqual(actual.join(','), expected);
    }

    testMixed() {
      // Act
      const actual = simpleParseWords('Mixed');

      // Assert
      const expected = 'Mixed';
      this.assertEqual(actual.join(','), expected);
    }

    testSimpleCamelCase() {
      // Act
      const actual = simpleParseWords('SimpleCamelCase');

      // Assert
      const expected = 'Simple,Camel,Case';
      this.assertEqual(actual.join(','), expected);
    }

    testLongCamelCase() {
      // Act
      const actual = simpleParseWords('AnUPPERWord');

      // Assert
      const expected = 'An,UPPER,Word';
      this.assertEqual(actual.join(','), expected);
    }

    testLowerCamelCase() {
      // Act
      const actual = simpleParseWords('lowerCamelCase');

      // Assert
      const expected = 'lower,Camel,Case';
      this.assertEqual(actual.join(','), expected);
    }

    testSnakeCase() {
      // Act
      const actual = simpleParseWords('snake_case_Example');

      // Assert
      const expected = 'snake,case,Example';
      this.assertEqual(actual.join(','), expected);
    }

    testDoubleSnakeCase() {
      // Act
      const actual = simpleParseWords('double__snake_Case_example');

      // Assert
      const expected = 'double,snake,Case,example';
      this.assertEqual(actual.join(','), expected);
    }

    testWithNumbers() {
      // Act
      const actual = simpleParseWords('One23fourFive');

      // Assert
      const expected = 'One,23,four,Five';
      this.assertEqual(actual.join(','), expected);
    }

    testWithSpaces() {
      // Act
      const actual = simpleParseWords('ABCd EF  ghIj');

      // Assert
      const expected = 'AB,Cd,EF,gh,Ij';
      this.assertEqual(actual.join(','), expected);
    }

    testComplicated() {
      // Act
      const actual = simpleParseWords(
        'A_VERYComplicated_Wordy __ _  Example'
      );

      // Assert
      const expected = 'A,VERY,Complicated,Wordy,Example';
      this.assertEqual(actual.join(','), expected);
    }

  }
  /* eslint-enable */

  NH.xunit.testing.testCases.push(SimpleParseWordsTestCase);

  return {
    version: version,
    NOT_FOUND: NOT_FOUND,
    ensure: ensure,
    DefaultMap: DefaultMap,
    Logger: Logger,
    uuId: uuId,
    safeId: safeId,
    strHash: strHash,
    Dispatcher: Dispatcher,
    simpleParseWords: simpleParseWords,
  };

}());
