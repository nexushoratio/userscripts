// ==UserScript==
// ==UserLibrary==
// @name        NH_xunit
// @description xUnit style testing.
// @version     20
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

window.NexusHoratio.xunit = (function xunit() {
  'use strict';

  /** @type {number} - Bumped per release. */
  const version = 20;

  /**
   * @type {object} - For testing support (to be replaced with `TestCase`).
   */
  const testing = {
    enabled: false,
    funcs: [],
    testCases: [],
  };

  /** Accumulated results from running a TestCase. */
  class TestResult {

    /** Unexpected exceptions. */
    errors = [];

    /** Explicit test failures (typically failed asserts). */
    failures = [];

    /** Skipped tests. */
    skipped = [];

    /** Successes. */
    successes = [];

    /**
     * Record an unexpected exception from a execution.
     * @param {string} name - Name of the TestCase.testMethod.
     * @param {Error} exception - Exception caught.
     */
    addError(name, exception) {
      this.errors.push({
        name: name,
        error: exception.name,
        message: exception.message,
      });
    }

    /**
     * Record a test failure.
     * @param {string} name - Name of the TestCase.testMethod.
     * @param {string} message - Message from the test or framework.
     */
    addFailure(name, message) {
      this.failures.push({
        name: name,
        message: message,
      });
    }

    /**
     * Record a test skipped.
     * @param {string} name - Name of the TestCase.testMethod.
     * @param {string} message - Reason the test was skipped.
     */
    addSkip(name, message) {
      this.skipped.push({
        name: name,
        message: message,
      });
    }

    /**
     * Record a successful execution.
     * @param {string} name - Name of the TestCase.testMethod.
     */
    addSuccess(name) {
      this.successes.push(name);
    }

    /** @returns {boolean} - Indicates success so far. */
    wasSuccessful() {
      return this.errors.length === 0 && this.failures.length === 0;
    }

  }

  /**
   * Attempt to get the type of item.
   *
   * This is internal to xunit, so no need to make it equivalent to the
   * built-in `typeof` operator.  Hence, results are explicitly NOT
   * lower-cased in order to reduce chances of conflicts.
   *
   * This just needs to be good enough to find a comparator function.
   * @param {*} item - Item to inspect.
   * @returns {string} - The likely type of item.
   */
  function getType(item) {
    const builtInClasses = [
      'Array',
      'Date',
      'Error',
      'Map',
      'Set',
    ];
    let type = Object.prototype.toString.call(item)
      .replace(/^\[object (?<type>.*)\]$/u, '$<type>');
    if (type === 'Function') {
      if (String(item).startsWith('class ')) {
        type = 'class';
      } else if (builtInClasses.includes(item.name)) {
        type = 'class';
      }
    }
    if (type === 'Object') {
      if (typeof item.constructor.name === 'string') {
        type = item.constructor.name;
      }
    }
    return type;
  }

  /**
   * An xUnit style test framework.
   *
   * TODO(#172): WIP.
   *
   * Many expected methods exist, such as setUp, setUpClass, addCleanup,
   * addClassCleanup, etc.  No tearDown methods, however; use addCleanup.
   *
   * Assertion methods should always take a plain text string, typically named
   * `msg`, as the last parameter.  This string should be added to the
   * assertion specific error message in case of a failure.
   *
   * JavaScript does not have portable access to things like line numbers and
   * stack traces (and in the case of userscripts, those may be inaccurate
   * anyway).  So it can be difficult to track down a particular test failure.
   * The failure messages do include the name of the test class and test
   * method, but, if the method happens to have several assertions in it, it
   * may not be obvious which one failed.  These extra messages can help with
   * differentiation.
   *
   * While the *assertEqual()* method will handle many cases by looking up
   * special functions comparing by type.  There may be times when what it can
   * handle needs to be enhanced.  There are currently two ways to make such
   * enhancements.
   *
   * First, the method *addEqualFunc()* will allow the test method to register
   * an additional function for comparing two identical instances.
   *
   * Second, the property *defaultEqual* points to whatever *equalX()*
   * function should be used if one cannot be found, or if instances differ by
   * type.  This fallback defaults to *equalEqEqEq()* which uses the strict
   * equality (`===`) operator.  This can be explicitly set in the test
   * method.  The method *equalValueOf()* will use the instance's *valueOf()*
   * method to get comparable values, and may be useful in such cases.
   *
   * TestCases should run only one test method per instance.  The name of the
   * method is registered during instantiation and invoked by calling
   * *instance.run().*.  Generally, a system, like {@link TestRunner} is used
   * to register a number of TestCases, discover the test methods, and invoke
   * all of them in turn.
   *
   * @example
   * class FooTestCase extends TestCase {
   *   testMethod() {
   *     // Assemble - Act
   *
   *     // Assert
   *     this.assertEqual(actual, expected, 'extra message');
   *   }
   * }
   *
   * const test = new FooTestCase('testMethod');
   * const result = test.run();
   */
  class TestCase {

    /**
     * Instantiate a TestCase.
     * @param {string} methodName - The method to run on this instantiation.
     */
    constructor(methodName) {
      if (new.target === TestCase) {
        throw new TypeError('Abstract class; do not instantiate directly.');
      }

      this.#methodName = methodName;

      this.defaultEqual = this.equalEqEqEq;
      this.addEqualFunc('String', this.equalString);
      this.addEqualFunc('Array', this.equalArray);
    }

    static Error = class extends Error {

      /** @inheritdoc */
      constructor(...rest) {
        super(...rest);
        this.name = `TestCase.${this.constructor.name}`;
      }

    };

    static Fail = class extends this.Error {}
    static Skip = class extends this.Error {}

    static classCleanups = [];

    /** Called once before any instances are created. */
    static setUpClass() {
      // Empty.
    }

    /**
     * Register a function with arguments to run after all tests in the class
     * have ran.
     * @param {function} func - Function to call.
     * @param {...*} rest - Arbitrary arguments to func.
     */
    static addClassCleanup(func, ...rest) {
      this.classCleanups.push([func, rest]);
    }

    /** Execute all functions registered with addClassCleanup. */
    static doClassCleanups() {
      while (this.classCleanups.length) {
        const [func, rest] = this.classCleanups.pop();
        func.call(this, ...rest);
      }
    }

    /** @type {string} */
    get id() {
      const methodName = this.#methodName;
      return `${this.constructor.name}.${methodName}`;
    }

    /**
     * Execute the test method registered upon instantiation.
     * @param {TestResult} [result] - Instance for accumulating results.
     * Typically, a test runner will pass in one of these to gather results
     * across multiple tests.
     * @returns {TestResult} - Accumulated results (one is created if not
     * passed in).
     */
    run(result) {
      const localResult = result ?? new TestResult();
      const klass = this.constructor.name;

      let stage = null;
      try {
        stage = `${klass}.setUp`;
        this.setUp();

        stage = this.id;
        this[this.#methodName]();

        stage = `${klass}.doCleanups`;
        this.doCleanups();

        localResult.addSuccess(this.id);
      } catch (e) {
        const inCleanup = stage.includes('.doCleanups');
        if (e instanceof TestCase.Skip && !inCleanup) {
          localResult.addSkip(stage, e.message);
        } else if (e instanceof TestCase.Fail && !inCleanup) {
          localResult.addFailure(stage, e.message);
        } else {
          localResult.addError(stage, e);
        }
      }

      return localResult;
    }

    /** Called once before each test method. */
    setUp() {  // eslint-disable-line class-methods-use-this
      // Empty.
    }

    /**
     * Register a function with arguments to run after a test.
     * @param {function} func - Function to call.
     * @param {...*} rest - Arbitrary arguments to func.
     */
    addCleanup(func, ...rest) {
      this.#cleanups.push([func, rest]);
    }

    /** Execute all functions registered with addCleanup. */
    doCleanups() {
      while (this.#cleanups.length) {
        const [func, rest] = this.#cleanups.pop();
        func.call(this, ...rest);
      }
    }

    /**
     * Immediately skips a test method.
     * @param {string} [msg=''] - Reason for skipping.
     * @throws {TestCase.Skip}
     */
    skip(msg = '') {
      throw new this.constructor.Skip(msg);
    }

    /**
     * Immediately fail a test method.
     * @param {string} [msg=''] - Reason for the failure.
     * @throws {TestCase.Fail}
     */
    fail(msg = '') {
      throw new this.constructor.Fail(msg);
    }

    /**
     * Asserts that two arguments are equal.
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @param {string} [msg=''] - Text to complement the failure message.
     */
    assertEqual(first, second, msg = '') {
      this.#assertBase(first, second, true, msg);
    }

    /**
     * Asserts that two arguments are NOT equal.
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @param {string} [msg=''] - Text to complement the failure message.
     */
    assertNotEqual(first, second, msg = '') {
      this.#assertBase(first, second, false, msg);
    }

    /**
     * Asserts that the argument is a boolean true.
     * @param {*} arg - Argument to test.
     * @param {string} [msg=''] - Text to complement the failure message.
     */
    assertTrue(arg, msg = '') {
      if (!arg) {
        const failMsg = `${arg} is not true`;
        this.#failMsgs(failMsg, msg);
      }
    }

    /**
     * Asserts that the argument is a boolean false.
     * @param {*} arg - Argument to test.
     * @param {string} [msg=''] - Text to complement the failure message.
     */
    assertFalse(arg, msg = '') {
      if (arg) {
        const s1 = String(arg);
        const failMsg = `${s1} is not false`;
        this.#failMsgs(failMsg, msg);
      }
    }

    /**
     * Asserts the expected exception is raised.
     * @param {function(): Error} exc - Expected Error class.
     * @param {function} func - Function to call.
     * @param {string} [msg=''] - Text to complement the failure message.
     */
    assertRaises(exc, func, msg = '') {
      this.assertRaisesRegExp(exc, /.*/u, func, msg);
    }

    /**
     * Asserts the expected exception is raised and the message matches the
     * regular expression.
     * @param {function(): Error} exc - Expected Error class.
     * @param {RegExp} regexp - Regular expression to match.
     * @param {function} func - Function to call.
     * @param {string} [msg=''] - Text to complement the failure message.
     */
    assertRaisesRegExp(exc, regexp, func, msg = '') {  // eslint-disable-line max-params
      let failMsg = `Expected ${exc.name}, caught nothing`;
      try {
        func();
      } catch (e) {
        if (e instanceof exc) {
          if (regexp.test(e.message)) {
            return;
          }
          failMsg = `Exception message "${e.message}" did not match ` +
            `regular expression "${regexp}"`;
        } else {
          failMsg = `Expected ${exc.name}, caught ${e.name}`;
        }
      }
      this.#failMsgs(failMsg, msg);
    }

    /**
     * Asserts the target matches the regular expression.
     * @param {string} target - Target string to check.
     * @param {RegExp} regexp - Regular expression to match.
     * @param {string} [msg=''] - Text to complement the failure message.
     */
    assertRegExp(target, regexp, msg = '') {
      if (!regexp.test(target)) {
        const failMsg = `Target "${target}" did not match ` +
              `regular expression "${regexp}"`;
        this.#failMsgs(failMsg, msg);
      }
    }

    // TODO: Add assertions as needed.

    /**
     * @typedef {object} EqualOutput
     * @property {boolean} equal - Result of equality test.
     * @property {string} detail - Details appropriate to the test (e.g.,
     * where items differed).
     */

    /**
     * @callback EqualFunc
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @returns {EqualOutput} - Results of testing equality.
     */

    /**
     * Find an equality function appropriate for the arguments.
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @returns {EqualFunc} - Function that should be used to test equality.
     */
    getEqualFunc(first, second) {
      let equal = this.defaultEqual;
      const t1 = getType(first);
      const t2 = getType(second);
      if (t1 === t2) {
        equal = this.#equalFuncs.get(t1) ?? equal;
      }
      return equal;
    }

    /**
     * @param {string} type - As returned from {@link getType}.
     * @param {EqualFunc} func - Function to call to compare that type.
     */
    addEqualFunc(type, func) {
      this.#equalFuncs.set(type, func);
    }

    /**
     * @implements {EqualFunc}
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @returns {EqualOutput} - Results of testing equality.
     */
    equalEqEqEq = (first, second) => {
      const equal = first === second;
      return {
        equal: equal,
        details: '',
      };
    }

    /**
     * For those cases when '===' is too strict.
     * @implements {EqualFunc}
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @returns {EqualOutput} - Results of testing equality.
     */
    equalValueOf = (first, second) => {
      const val1 = first?.valueOf() ?? first;
      const val2 = second?.valueOf() ?? second;
      const equal = val1 === val2;
      return {
        equal: equal,
        details: 'Using valueOf()',
      };
    }

    /**
     * @implements {EqualFunc}
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @returns {EqualOutput} - Results of testing equality.
     */
    equalString = (first, second) => {
      let details = '';
      const equal = first === second;
      if (!equal) {
        let indicator = '';
        const len = Math.min(first.length, second.length);
        for (let idx = 0; idx < len; idx += 1) {
          const c1 = first.at(idx);
          const c2 = second.at(idx);
          if (c1 === c2) {
            indicator += ' ';
          } else {
            break;
          }
        }
        indicator += '|';
        details = `\n   1: ${first}\ndiff: ${indicator}\n   2: ${second}\n`;
      }
      return {
        equal: equal,
        details: details,
      };
    }

    /**
     * @implements {EqualFunc}
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @returns {EqualOutput} - Results of testing equality.
     */
    equalArray = (first, second) => {
      let equal = true;
      const details = [''];

      const len = Math.min(first.length, second.length);
      for (let idx = 0; idx < len; idx += 1) {
        const i1 = first.at(idx);
        const i2 = second.at(idx);
        const equalFunc = this.getEqualFunc(i1, i2);
        const result = equalFunc(i1, i2);
        if (!result.equal) {
          equal = false;
          details.push(
            `First difference at element ${idx}`,
            String(i1),
            String(i2)
          );
          break;
        }
      }

      if (first.length !== second.length) {
        equal = false;
        const diff = Math.abs(first.length - second.length);
        const name = first.length > second.length ? 'First' : 'Second';
        details.push(
          '',
          `${name} array contains ${diff} more elements.`,
          `First additional at position ${len}`,
          String(first.at(len) ?? second.at(len))
        );
      }

      return {
        equal: equal,
        details: details.join('\n'),
      };
    }

    #cleanups = [];
    #equalFuncs = new Map();
    #methodName

    /**
     * Asserts that two arguments have the expected equality
     * TODO(#183): Handle more than primitives.
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @param {boolean} expected - Expectation of equality.
     * @param {string} [msg=''] - Text to complement the failure message.
     */
    #assertBase = (first, second, expected, msg) => {  // eslint-disable-line max-params
      const equal = this.getEqualFunc(first, second);
      const results = equal(first, second);
      const passed = results.equal === expected;
      if (!passed) {
        const badCmp = expected ? '!==' : '===';
        const s1 = String(first);
        const s2 = String(second);
        const failMsg = `${s1} ${badCmp} ${s2}`;
        if (!expected) {
          results.details = '';
        }
        this.#failMsgs(failMsg, results.details, msg);
      }
    }

    /**
     * Immediately fail while combining messages.
     * @param {...string} messages - Messages to join.
     */
    #failMsgs = (...messages) => {
      const filtered = messages
        .filter(x => x)
        .map(x => String(x))
        .join(' : ');
      this.fail(filtered);
    }

  }

  /* eslint-disable no-array-constructor */
  /* eslint-disable no-undef */
  /* eslint-disable no-undefined */
  /* eslint-disable require-jsdoc */
  class TestGetTypeTestCase extends TestCase {

    testPrimitives() {
      this.assertEqual(getType(0), 'Number');
      this.assertEqual(getType(NaN), 'Number');
      this.assertEqual(getType('0'), 'String');
      this.assertEqual(getType(true), 'Boolean');
      this.assertEqual(getType(false), 'Boolean');
      this.assertEqual(getType(BigInt('123')), 'BigInt');
      this.assertEqual(getType(456n), 'BigInt');
      this.assertEqual(getType(undefined), 'Undefined');
      this.assertEqual(getType(null), 'Null');
    }

    testBuiltInFunctionLike() {
      this.assertEqual(getType(Symbol('xyzzy')), 'Symbol');
      this.assertEqual(getType(Symbol), 'Function');
      this.assertEqual(getType(/abc123/u), 'RegExp');
      this.assertEqual(getType(new Date()), 'Date');
      this.assertEqual(getType(Date()), 'String');
      this.assertEqual(getType(Date), 'class');
      this.assertEqual(getType(Math.min), 'Function');
      this.assertEqual(getType(Math), 'Math');
    }

    testBuiltinClasses() {
      this.assertEqual(getType({}), 'Object');
      this.assertEqual(getType([]), 'Array');
      this.assertEqual(getType(new Array()), 'Array');
      this.assertEqual(getType(Array), 'class');
      this.assertEqual(getType(new Map()), 'Map');
      this.assertEqual(getType(Map), 'class');
      this.assertEqual(getType(new Set()), 'Set');
      this.assertEqual(getType(Set), 'class');
      this.assertEqual(getType(new Error()), 'Error');
      this.assertEqual(getType(Error), 'class');
    }

    testRegularClasses() {
      this.assertEqual(getType(TestCase), 'class');
      this.assertEqual(getType(this), 'TestGetTypeTestCase');
      this.assertEqual(getType(getType), 'Function');
      this.assertEqual(getType(TestCase.Skip), 'class');
    }

  }
  /* eslint-enable */

  testing.testCases.push(TestGetTypeTestCase);

  /* eslint-disable class-methods-use-this */
  /* eslint-disable no-magic-numbers */
  /* eslint-disable require-jsdoc */
  /**
   * For testing TestCase basic features.
   *
   * Do not use directly, but rather inside `TestTestCase`.
   */
  class BasicFeaturesTestCase extends TestCase {

    static classCalls = [];

    /** Register cleanup functions.. */
    static setUpClassCleanups() {
      this.classCalls = [];
      this.addClassCleanup(this.one);
      this.addClassCleanup(this.two, 3, 4);
    }

    /** Capture that it was called. */
    static one() {
      this.classCalls.push('one');
    }

    /**
     * Capture that it was called with arguments.
     * @param {*} a - Anything.
     * @param {*} b - Anything.
     */
    static two(a, b) {
      this.classCalls.push('two', a, b);
    }

    testInstanceCleanups() {
      this.instanceCalls = [];
      this.addCleanup(this.three);
      this.addCleanup(this.four, 5, 6);
    }

    /** Capture that it was called. */
    three() {
      this.instanceCalls.push('three');
    }

    /**
     * Capture that it was called with arguments.
     * @param {*} a - Anything.
     * @param {*} b - Anything.
     */
    four(a, b) {
      this.instanceCalls.push('four', a, b);
    }

    testInstanceCleanupsWithError() {
      this.addCleanup(this.willError);
    }

    testInstanceCleanupsWithSkip() {
      this.addCleanup(this.willSkip);
    }

    testInstanceCleanupsWithFail() {
      this.addCleanup(this.willFail);
    }

    willError() {
      throw new Error('from willError');
    }

    willSkip() {
      this.skip('from willSkip');
    }

    willFail() {
      this.fail('from willFail');
    }

  }
  /* eslint-enable */

  /* eslint-disable no-empty-function */
  /* eslint-disable no-magic-numbers */
  /* eslint-disable no-new */
  /* eslint-disable no-new-wrappers */
  /* eslint-disable no-undef */
  /* eslint-disable no-undefined */
  /* eslint-disable no-unused-vars */
  /* eslint-disable require-jsdoc */
  class TestCaseTestCase extends TestCase {

    testCannotInstantiateDirectly() {
      this.assertRaises(TypeError, () => {
        new TestCase();
      });
    }

    testStaticSetUpClassExists() {
      try {
        TestCase.setUpClass();
      } catch (e) {
        this.fail(e);
      }
    }

    testDoClassCleanups() {
      // Assemble
      BasicFeaturesTestCase.setUpClassCleanups();

      // Act
      BasicFeaturesTestCase.doClassCleanups();

      // Assert
      const actual = BasicFeaturesTestCase.classCalls;
      const expected = ['two', 3, 4, 'one'];
      this.assertEqual(actual, expected);
    }

    testId() {
      // Assemble
      const instance = new BasicFeaturesTestCase('testSomething');

      // Assert
      const actual = instance.id;
      const expected = 'BasicFeaturesTestCase.testSomething';
      this.assertEqual(actual, expected);
    }

    testDoInstanceCleanups() {
      // Assemble
      const instance = new BasicFeaturesTestCase('testInstanceCleanups');

      // Act
      const result = instance.run();

      // Assert
      this.assertTrue(result.wasSuccessful());
      const actual = instance.instanceCalls;
      const expected = ['four', 5, 6, 'three'];
      this.assertEqual(actual, expected);
    }

    testDoInstanceCleanupsWithError() {
      // Assemble
      const method = 'testInstanceCleanupsWithError';
      const instance = new BasicFeaturesTestCase(method);

      // Act
      const result = instance.run();

      // Assert
      this.assertFalse(result.wasSuccessful());
      this.assertEqual(result.errors.length, 1);
      this.assertEqual(result.errors[0].error, 'Error');
    }

    testDoInstanceCleanupsWithSkip() {
      // Assemble
      const method = 'testInstanceCleanupsWithSkip';
      const instance = new BasicFeaturesTestCase(method);

      // Act
      const result = instance.run();

      // Assert
      this.assertFalse(result.wasSuccessful());
      this.assertEqual(result.errors.length, 1);
      this.assertEqual(result.errors[0].error, 'TestCase.Skip');
    }

    testDoInstanceCleanupsWithFail() {
      // Assemble
      const method = 'testInstanceCleanupsWithFail';
      const instance = new BasicFeaturesTestCase(method);

      // Act
      const result = instance.run();

      // Assert
      this.assertFalse(result.wasSuccessful());
      this.assertEqual(result.errors.length, 1);
      this.assertEqual(result.errors[0].error, 'TestCase.Fail');
    }

    testSkip() {
      // Act/Assert
      this.assertRaisesRegExp(TestCase.Skip, /^$/u, () => {
        this.skip();
      });

      // Act/Assert
      this.assertRaisesRegExp(TestCase.Skip, /a message/u, () => {
        this.skip('a message');
      });
    }

    testFail() {
      // Act/Assert
      this.assertRaisesRegExp(TestCase.Fail, /^$/u, () => {
        this.fail();
      });

      // Act/Assert
      this.assertRaisesRegExp(TestCase.Fail, /for the masses/u, () => {
        this.fail('for the masses');
      });
    }

    testGetEqualFunc() {
      this.assertEqual(this.getEqualFunc({}, []), this.equalEqEqEq);
      this.assertEqual(this.getEqualFunc('a', 'b'), this.equalString);
    }

    testChangingDefaultEqual() {
      // Assemble
      this.assertEqual(this.getEqualFunc({}, []), this.equalEqEqEq);
      this.defaultEqual = this.equalValueOf;

      // Act/Assert
      this.assertEqual(this.getEqualFunc({}, []), this.equalValueOf);
    }

    testAddEqualFunc() {
      // Assemble
      class C {}
      const c = new C();
      function equalC(first, second) {}

      this.assertNotEqual(this.getEqualFunc(c, c), equalC);

      // Act
      this.addEqualFunc(getType(c), equalC);

      // Assert
      this.assertEqual(this.getEqualFunc(c, c), equalC);
    }

    testAssertEqualPrimitives() {
      this.assertEqual(0, 0);
      this.assertEqual(42, 42);
      this.assertEqual(true, true);
      this.assertEqual(false, false);
      this.assertEqual(BigInt('123456789'), BigInt('123456789'));
      this.assertEqual(undefined, {}.undef);
      this.assertEqual(null, null);

      const bar = Symbol('bar');
      this.assertEqual(bar, bar);

      // Equivalent Symbols cannot be equal.
      this.assertRaisesRegExp(TestCase.Fail,
        /^Symbol.foo. !== Symbol.foo.$/u,
        () => {
          this.assertEqual(Symbol('foo'), Symbol('foo'));
        });
    }

    testAssertEqualValueOf() {
      // Assemble
      class Silly extends Number {}

      const n = new Number(3);
      const s = new Silly(3);

      this.assertNotEqual(n, s, 'before');

      // Act
      this.defaultEqual = this.equalValueOf;

      // Assert
      this.assertEqual(n, s, 'after');
    }

    testAssertEqualPrimitivesWithValueOf() {
      this.defaultEqual = this.equalValueOf;

      this.assertEqual(0, 0);
      this.assertEqual(42, 42);
      this.assertEqual(true, true);
      this.assertEqual(false, false);
      this.assertEqual(BigInt('123456789'), BigInt('123456789'));
      this.assertEqual(undefined, {}.undef);
      this.assertEqual(null, null);

      const bar = Symbol('bar');
      this.assertEqual(bar, bar);

      // Equivalent Symbols cannot be equal, even with valueOf().
      this.assertRaisesRegExp(TestCase.Fail,
        /^Symbol.foo. !== Symbol.foo. : Using valueOf/u,
        () => {
          this.assertEqual(Symbol('foo'), Symbol('foo'));
        });
    }

    testAssertEqualFailureMessages() {

      // TODO: This is ugly and should be fixed.
      this.assertRaisesRegExp(TestCase.Fail,
        /^.object Object. !== $/u,
        () => {
          this.assertEqual({}, []);
        });

      this.assertRaisesRegExp(TestCase.Fail,
        /^undefined !== null$/u,
        () => {
          this.assertEqual(undefined, null);
        });

      this.assertRaisesRegExp(TestCase.Fail, /^0 !== 0$/u, () => {
        this.assertEqual(0, '0');
      });

      this.assertRaisesRegExp(TestCase.Fail, / : oopsie$/u, () => {
        this.assertEqual({}, {}, 'oopsie');
      });
    }

    // Old version of eslint does not know BigInt.
    /* eslint-disable no-undef */
    testAssertNotEqualPrimitives() {
      this.assertNotEqual(NaN, NaN, 'NaN');
      this.assertNotEqual(true, false, 'true/false');
      this.assertNotEqual(false, true, 'false/true');
      this.assertNotEqual(BigInt('12345678'), BigInt('123456789'), 'BigInt');
      this.assertNotEqual(undefined, null, 'undef/null');
      this.assertNotEqual({}, {}, 'objects');
      this.assertNotEqual(Symbol('foo'), Symbol('foo'), 'symbols');
    }

    testAssertNotEqualFailureMessages() {
      this.assertRaisesRegExp(TestCase.Fail,
        /^0 === 0$/u,
        () => {
          this.assertNotEqual(0, 0);
        });

      this.assertRaisesRegExp(TestCase.Fail,
        /^undefined === undefined$/u,
        () => {
          this.assertNotEqual(undefined, undefined);
        });

      this.assertRaisesRegExp(TestCase.Fail,
        /^null === null$/u,
        () => {
          this.assertNotEqual(null, null);
        });

      this.assertRaisesRegExp(TestCase.Fail,
        /^Symbol\(sym\) === Symbol\(sym\)$/u,
        () => {
          const sym = Symbol('sym');
          this.assertNotEqual(sym, sym);
        });

      this.assertRaisesRegExp(TestCase.Fail, / : oopsie$/u, () => {
        this.assertNotEqual('a', 'a', 'oopsie');
      });
    }

    testEqualString() {
      this.assertEqual(this.getEqualFunc('a', 'b'), this.equalString);
      this.assertEqual('string', 'string');
      this.assertNotEqual('string 1', 'string 2');

      this.assertRaisesRegExp(TestCase.Fail, /diff: {7}|/u, () => {
        this.assertEqual('abc1234', 'abc123');
      });

      this.assertRaisesRegExp(TestCase.Fail, /diff: {3}|/u, () => {
        this.assertEqual('abcd', 'abxd');
      });

      this.assertRaisesRegExp(TestCase.Fail, /diff: {3}|.* : extra/u, () => {
        this.assertEqual('abcd', 'abxd', 'extra');
      });
    }

    testEqualArray() {
      this.assertEqual(this.getEqualFunc([1], [2, 3]), this.equalArray);
      this.assertEqual([], [], 'empty');
      this.assertEqual([1, 'a'], [1, 'a'], 'mixed');
      this.assertEqual([1, [2, 3]], [1, [2, 3]], 'nested');
      this.assertNotEqual([0], [1], 'simple notequal');
      this.assertNotEqual([], [1], 'different lengths');

      this.assertRaisesRegExp(
        TestCase.Fail,
        /element 1/u,
        () => {
          this.assertEqual([0, 1], [0, 2]);
        },
        'simple unequal'
      );

      this.assertRaisesRegExp(
        TestCase.Fail,
        /First array.* more .*\n.* position 1\nxyzzy/u,
        () => {
          this.assertEqual([1, 'xyzzy'], [1]);
        },
        'first longer'
      );

      this.assertRaisesRegExp(
        TestCase.Fail,
        /Second array.* more .*\n.* position 2\nasdf/u,
        () => {
          this.assertEqual([1, 2], [1, 2, 'asdf']);
        },
        'second longer'
      );

      this.assertRaisesRegExp(
        TestCase.Fail,
        /element 2/u,
        () => {
          this.assertEqual([-1, 0, [1, 2]], [-1, 0, [1, 3]]);
        },
        'nested unequal'
      );
    }

    testAssertTrue() {
      this.assertTrue(true);
      this.assertTrue(1);
      this.assertTrue(' ');
      this.assertTrue({});
      this.assertTrue([]);
      this.assertTrue(Symbol('true'));

      this.assertRaisesRegExp(TestCase.Fail, /false is not true/u, () => {
        this.assertTrue(false);
      });

      this.assertRaisesRegExp(TestCase.Fail, /0 is not true/u, () => {
        this.assertTrue(0);
      });

      this.assertRaisesRegExp(TestCase.Fail,
        /^0 is not true : xyzzy$/u,
        () => {
          this.assertTrue(0, 'xyzzy');
        });

      this.assertRaisesRegExp(TestCase.Fail,
        /^undefined is not true : Symbol\(xyzzy\)$/u,
        () => {
          this.assertTrue(undefined, Symbol('xyzzy'));
        });

      this.assertRaisesRegExp(TestCase.Fail,
        /^null is not true/u,
        () => {
          this.assertTrue(null, false);
        });
    }

    testAssertFalse() {
      this.assertFalse(false);
      this.assertFalse(0);
      this.assertFalse('');

      this.assertRaisesRegExp(TestCase.Fail, /true is not false/u, () => {
        this.assertFalse(true);
      });

      this.assertRaisesRegExp(TestCase.Fail, /-1 is not false/u, () => {
        this.assertFalse(-1);
      });

      this.assertRaisesRegExp(TestCase.Fail,
        /.object Object. is not false/u,
        () => {
          this.assertFalse({});
        });

      this.assertRaisesRegExp(TestCase.Fail,
        /^ is not false : abc123$/u,
        () => {
          this.assertFalse([], 'abc123');
        });

      this.assertRaisesRegExp(TestCase.Fail,
        /Symbol\(bar\) is not false/u,
        () => {
          this.assertFalse(Symbol('bar'));
        });
    }

    testAssertRaises() {
      this.assertRaises(Error, () => {
        throw new Error();
      });

      this.assertRaises(Error, () => {
        throw new Error('with a message');
      });

      this.assertRaisesRegExp(TestCase.Fail, /caught nothing/u, () => {
        this.assertRaises(Error, () => {});
      });

      this.assertRaisesRegExp(TestCase.Fail, /TypeError.* Error/u, () => {
        this.assertRaises(TypeError, () => {
          throw new Error();
        });
      });

      this.assertRaisesRegExp(TestCase.Fail, / : hovercraft/u, () => {
        this.assertRaises(TypeError,
          () => {
            throw new Error();
          },
          'hovercraft full of eels');
      });
    }

    testAssertRaisesRegExp() {
      this.assertRaisesRegExp(Error, /xyzzy/u, () => {
        throw new Error('xyzzy');
      });

      this.assertRaisesRegExp(TestCase.Fail, /caught nothing/u, () => {
        this.assertRaisesRegExp(Error, /.*/u, () => {});
      });

      this.assertRaisesRegExp(TestCase.Fail, / : my message/u, () => {
        this.assertRaisesRegExp(Error, /.*/u, () => {}, 'my message');
      });

      this.assertRaisesRegExp(TestCase.Fail, /Expected TypeError/u, () => {
        this.assertRaisesRegExp(TypeError, /message/u, () => {
          throw new Error('message');
        });
      });

      this.assertRaisesRegExp(TestCase.Fail,
        /did not match regular expression/u,
        () => {
          this.assertRaisesRegExp(Error, /message/u, () => {
            throw new Error('xyzzy');
          });
        });
    }

    testAssertRegExp() {
      this.assertRegExp('abc', /ab./u);

      this.assertRaisesRegExp(TestCase.Fail,
        /Target.*did not match regular expression/u,
        () => {
          this.assertRegExp('abc', /ab.d/u);
        });

      this.assertRaisesRegExp(TestCase.Fail,
        / : what do you expect/u,
        () => {
          this.assertRegExp('abc', /xyz/u, 'what do you expect');
        });
    }

  }
  /* eslint-enable */

  testing.testCases.push(TestCaseTestCase);

  /* eslint-disable no-magic-numbers */
  /* eslint-disable require-jsdoc */
  class TestResultTestCase extends TestCase {

    setUp() {
      this.result = new TestResult();
    }

    testAddSuccess() {
      this.assertEqual(0, this.result.successes.length);

      // Act
      this.result.addSuccess('TestClass.testMethod');
      this.result.addSuccess('TestClass.testMethod');

      // Assert
      this.assertEqual(2, this.result.successes.length);
    }

    testAddError() {
      this.assertEqual(0, this.result.errors.length);

      // Act
      this.result.addError('name1', new Error('first message'));
      this.result.addError('name2', new TypeError('second message'));
      this.result.addError('name3', new Error('third message'));

      // Assert
      const actual = this.result.errors;
      const expected = [
        {name: 'name1', error: 'Error', message: 'first message'},
        {name: 'name2', error: 'TypeError', message: 'second message'},
        {name: 'name3', error: 'Error', message: 'third message'},
      ];
      // TODO: enhance assertEqual to not require stringify here
      this.assertEqual(JSON.stringify(actual), JSON.stringify(expected));
    }

    testAddFailure() {
      this.assertEqual(0, this.result.failures.length);

      // Act
      this.result.addFailure('method1', 'a message');
      this.result.addFailure('method2', 'another message');

      // Assert
      const actual = this.result.failures;
      const expected = [
        {name: 'method1', message: 'a message'},
        {name: 'method2', message: 'another message'},
      ];
      // TODO: enhance assertEqual to not require stringify here
      this.assertEqual(JSON.stringify(actual), JSON.stringify(expected));
    }

    testAddSkip() {
      this.assertEqual(0, this.result.skipped.length);

      // Act
      this.result.addSkip('Skip.Skip', 'skip to my lou');
      this.result.addSkip('Skip.Skip', 'skip to my lou');
      this.result.addSkip('Skip.ToMyLou', 'my darling');

      // Assert
      const actual = this.result.skipped;
      const expected = [
        {name: 'Skip.Skip', message: 'skip to my lou'},
        {name: 'Skip.Skip', message: 'skip to my lou'},
        {name: 'Skip.ToMyLou', message: 'my darling'},
      ];
      // TODO: enhance assertEqual to not require stringify here
      this.assertEqual(JSON.stringify(actual), JSON.stringify(expected));
    }

    testWasSuccessful() {
      this.assertTrue(this.result.wasSuccessful());

      this.result.addSuccess('Class.method');
      this.assertTrue(this.result.wasSuccessful());

      this.result.addSkip('Class.differentMethod', 'rocks');
      this.assertTrue(this.result.wasSuccessful());

      this.result.addError('NewClass.method', new Error());
      this.assertFalse(this.result.wasSuccessful());

      const result = new TestResult();

      this.assertTrue(result.wasSuccessful());

      result.addFailure('NewClass.failedMethod', 'oops');
      this.assertFalse(result.wasSuccessful());
    }

  }
  /* eslint-enable */

  testing.testCases.push(TestResultTestCase);

  /** Assembles and drives execution of {@link TestCase}s. */
  class TestRunner {

    /** @param {function(): TestCase} tests - TestCases to execute. */
    constructor(tests) {
      const badKlasses = [];
      const testMethods = [];
      for (const klass of tests) {
        if (klass.prototype instanceof TestCase) {
          testMethods.push(...this.#extractTestMethods(klass));
        } else {
          badKlasses.push(klass);
        }
      }
      if (badKlasses.length) {
        const msg = `Bad class count: ${badKlasses.length}`;
        for (const klass of badKlasses) {
          // eslint-disable-next-line no-console
          console.error('Not a TestCase:', klass);
        }
        throw new TypeError(`Bad classes: ${msg}`);
      }

      this.#tests = testMethods;
    }

    /**
     * Run each test method in turn.
     * @returns {TestResult} - Collected results.
     */
    runTests() {
      const result = new TestResult();

      let lastKlass = null;
      let doRunTests = true;
      for (const {klass, method} of this.#tests) {
        if (klass !== lastKlass) {
          this.#doClassCleanups(lastKlass, result);
          doRunTests = this.#doSetUpClass(klass, result);
        }
        lastKlass = klass;

        if (doRunTests) {
          this.#doRunTestMethod(klass, method, result);
        }
      }

      this.#doClassCleanups(lastKlass, result);

      return result;
    }

    #tests

    /** @param {function(): TestCase} klass - TestCase to process. */
    #extractTestMethods = function *extractTestMethods(klass) {
      let obj = klass;
      while (obj) {
        if (obj.prototype instanceof TestCase) {
          for (const prop of Object.getOwnPropertyNames(obj.prototype)) {
            if (prop.startsWith('test')) {
              yield {klass: klass, method: prop};
            }
          }
        }
        obj = Object.getPrototypeOf(obj);
      }
    }

    /**
     * @param {function(): TestCase} klass - TestCase to process.
     * @param {TestResult} result - Result to use if any errors.
     */
    #doClassCleanups = (klass, result) => {
      if (klass) {
        const name = `${klass.name}.doClassCleanups`;
        try {
          klass.doClassCleanups();
        } catch (e) {
          result.addError(name, e);
        }
      }
    }

    /**
     * @param {function(): TestCase} klass - TestCase to process.
     * @param {TestResult} result - Result to use if any errors.
     * @returns {boolean} - Indicates success of calling setUpClass().
     */
    #doSetUpClass = (klass, result) => {
      const name = `${klass.name}.setUpClass`;
      try {
        klass.setUpClass();
      } catch (e) {
        if (e instanceof TestCase.Skip) {
          result.addSkip(name, e.message);
        } else {
          result.addError(name, e);
        }
        return false;
      }
      return true;
    }

    /**
     * @param {function(): TestCase} Klass - TestCase to process.
     * @param {string} methodName - Name of the test method to execute.
     * @param {TestResult} result - Result of the execution.
     */
    #doRunTestMethod = (Klass, methodName, result) => {
      let name = null;
      try {
        name = `${Klass.name}.constructor`;
        const instance = new Klass(methodName);

        instance.run(result);
      } catch (e) {
        if (e instanceof TestCase.Skip) {
          result.addSkip(name, e.message);
        } else {
          result.addError(name, e);
        }
      }
    }

  }

  /* eslint-disable class-methods-use-this */
  /* eslint-disable no-empty-function */
  /* eslint-disable require-jsdoc */
  /**
   * TestCases require at least one test method to get instantiated by {@link
   * TestRunner}
   */
  class DummyMethodTestCase extends TestCase {

    testDummy() {}

  }
  /* eslint-enable */

  /* eslint-disable class-methods-use-this */
  /* eslint-disable max-lines-per-function */
  /* eslint-disable no-empty-function */
  /* eslint-disable no-magic-numbers */
  /* eslint-disable no-new */
  /* eslint-disable require-jsdoc */
  class TestRunnerTestCase extends TestCase {

    testNoClasses() {
      // Assemble
      const runner = new TestRunner([]);

      // Act
      const result = runner.runTests();

      // Assert
      this.assertTrue(result.wasSuccessful());
    }

    testBadClasses() {
      this.assertRaisesRegExp(TypeError, /Bad class count: 2$/u, () => {
        new TestRunner([Error, TestRunnerTestCase, TypeError]);
      });
    }

    testStrangeClassSetup() {
      // Assemble
      class ClassSetupErrorTestCase extends DummyMethodTestCase {

        static setUpClass() {
          throw new Error('erroring');
        }

      }

      class ClassSetupFailTestCase extends DummyMethodTestCase {

        static setUpClass() {
          throw new this.Fail('failing');
        }

      }

      class ClassSetupSkipTestCase extends DummyMethodTestCase {

        static setUpClass() {
          throw new this.Skip('skipping');
        }

      }

      const classes = [
        DummyMethodTestCase,
        ClassSetupErrorTestCase,
        ClassSetupFailTestCase,
        ClassSetupSkipTestCase,
      ];
      const runner = new TestRunner(classes);

      // Act
      const result = runner.runTests();

      // Assert
      this.assertFalse(result.wasSuccessful());

      // In setUpClass, TestCase.Fail should count as an error
      this.assertEqual(result.successes.length, 1);
      this.assertEqual(result.errors.length, 2);
      this.assertEqual(result.failures.length, 0);
      this.assertEqual(result.skipped.length, 1);
    }

    testStrangeClassCleanups() {
      // Assemble
      class BaseClassCleanupTestCase extends DummyMethodTestCase {

        static setUpClass() {
          this.addClassCleanup(this.cleanupFunc);
        }

        static cleanupFunc() {}

      }
      class CleanupErrorTestCase extends BaseClassCleanupTestCase {

        static cleanupFunc() {
          throw new Error('cleanup error');
        }

      }

      class CleanupFailTestCase extends BaseClassCleanupTestCase {

        static cleanupFunc() {
          throw new this.Fail('cleanup fail');
        }

      }
      class CleanupSkipTestCase extends BaseClassCleanupTestCase {

        static cleanupFunc() {
          throw new this.Skip('cleanup skip');
        }

      }

      const classes = [
        BaseClassCleanupTestCase,
        CleanupErrorTestCase,
        CleanupFailTestCase,
        CleanupSkipTestCase,
      ];
      const runner = new TestRunner(classes);

      // Act
      const result = runner.runTests();

      // Assert
      this.assertFalse(result.wasSuccessful());

      // In doClassCleanups, TestCase.{Fail,Skip} should count as errors,
      // however, the test *also* passed already, so we get extra counts.  Not
      // sure if this is a bug or a feature.
      this.assertEqual(result.successes.length, 4, 'successes');
      this.assertEqual(result.errors.length, 3, 'errors');
      this.assertEqual(result.failures.length, 0, 'failures');
      this.assertEqual(result.skipped.length, 0, 'skipped');
    }

    testFindsTestMethods() {
      // Assemble
      class One extends TestCase {

        test() {}

        test_() {}

        _test() {
          this.fail('_test');
        }

        testOne() {
          this.skip('One');
        }

        notATest() {
          this.fail('notATest');
        }

      }
      class Two extends TestCase {

        alsoNotATest() {
          this.fail('alsoNotATest');
        }

        testTwo() {
          this.skip('Two');
        }

      }
      const runner = new TestRunner([One, Two]);

      // Act
      const result = runner.runTests();

      // Assert
      this.assertTrue(result.wasSuccessful());
      this.assertEqual(result.successes.length, 2, 'successes');
      this.assertEqual(result.errors.length, 0, 'errors');
      this.assertEqual(result.failures.length, 0, 'failures');
      this.assertEqual(result.skipped.length, 2, 'skipped');
    }

    testAccumulatesResults() {
      class FooTestCase extends TestCase {

        testFail() {
          this.fail('Fail failed');
        }

        testNotEqual() {
          this.assertEqual(1, 2);
        }

        testPass() {}

        testError() {
          throw new Error('Oh, dear!');
        }

        testSkip() {
          this.skip('Skip skipped');
        }

      }
      const runner = new TestRunner([FooTestCase]);

      // Act
      const result = runner.runTests();

      // Assert
      this.assertFalse(result.wasSuccessful());
      // TODO(#183): Rewrite when objects are supported.
      this.assertEqual(result.errors.length, 1);
      this.assertEqual(result.failures.length, 2);
      this.assertEqual(result.skipped.length, 1);
      this.assertEqual(result.successes.length, 1);
    }

  }
  /* eslint-enable */

  testing.testCases.push(TestRunnerTestCase);

  /**
   * Run registered TestCases.
   * @returns {TestResult} - Accumulated results of these tests.
   */
  function runTests() {
    const runner = new TestRunner(testing.testCases);
    return runner.runTests();
  }

  return {
    version: version,
    testing: testing,
    TestCase: TestCase,
    runTests: runTests,
  };

}());
