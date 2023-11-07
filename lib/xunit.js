// ==UserScript==
// ==UserLibrary==
// @name        NH_xunit
// @description xUnit style testing.
// @version     15
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
  const version = 15;

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
   * An xUnit style test framework.
   *
   * TODO(#172): WIP.
   *
   * Many expected methods exist, such as setUp, setUpClass, addCleanup,
   * addClassCleanup, etc.  No tearDown methods, however; use addCleanup.
   *
   * Generally, register the class with a test runner that will do them all in
   * turn.  One approach is to use a static initializer block at the top of
   * the class.
   *
   * @example
   * class FooTestCase extends TestCase {
   *   testMethod() {
   *     // Assemble - Act
   *
   *     // Assert
   *     this.assertEqual(actual, expected);
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
     * TODO(#183): Handle more than primitives.
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @param {string} [msg=''] - Reason for the failure.
     */
    assertEqual(first, second, msg = '') {
      const assert = this.#assertBase;
      assert(first, second, true, msg);
    }

    /**
     * Asserts that two arguments are NOT equal.
     * TODO(#183): Handle more than primitives.
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @param {string} [msg=''] - Reason for the failure.
     */
    assertNotEqual(first, second, msg = '') {
      const assert = this.#assertBase;
      assert(first, second, false, msg);
    }

    /**
     * Asserts that the argument is a boolean true.
     * @param {*} arg - Argument to test.
     * @param {string} [msg=''] - Reason for the failure.
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
     * @param {string} [msg=''] - Reason for the failure.
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
     * @param {string} [msg=''] - Reason for the failure.
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
     * @param {string} [msg=''] - Reason for the failure.
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

    // TODO: Add assertions as needed.

    #cleanups = [];
    #methodName

    /**
     * Asserts that two arguments have the expected equality
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @param {boolean} expected - Expectation of equality.
     * @param {string} [msg=''] - Reason for the failure.
     */
    #assertBase = (first, second, expected, msg) => {  // eslint-disable-line max-params
      if (!this.#testPrimitives(first, second, expected)) {
        const badCmp = expected ? '!==' : '===';
        const s1 = String(first);
        const s2 = String(second);
        const failMsg = `${s1} ${badCmp} ${s2}`;
        this.#failMsgs(failMsg, msg);
      }
    }

    /**
     * Test the equality against the expectation.
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @param {boolean} expected - Expectation of equality.
     * @returns {boolean} - If expectation is met.
     */
    #testPrimitives = (first, second, expected) => {
      const actual = first === second;
      return actual === expected;
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
  /* eslint-disable no-undefined */
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
      // TODO: enhance assertEqual to not require stringify here
      this.assertEqual(JSON.stringify(actual), JSON.stringify(expected));
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
      // TODO: enhance assertEqual to not require stringify here
      this.assertEqual(JSON.stringify(actual), JSON.stringify(expected));
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

    // Old version of eslint does not know BigInt.
    /* eslint-disable no-undef */
    testAssertEqualPrimitives() {
      this.assertEqual(0, 0);
      this.assertEqual(42, 42);
      this.assertEqual('string', 'string');
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
      this.assertNotEqual(NaN, NaN);
      this.assertNotEqual('string 1', 'string 2');
      this.assertNotEqual(true, false);
      this.assertNotEqual(false, true);
      this.assertNotEqual(BigInt('12345678'), BigInt('123456789'));
      this.assertNotEqual(undefined, null);
      this.assertNotEqual({}, {});
      this.assertNotEqual([], []);
      this.assertNotEqual(Symbol('foo'), Symbol('foo'));
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
          this.#doClassCleanUps(lastKlass, result);
          doRunTests = this.#doSetUpClass(klass, result);
        }
        lastKlass = klass;

        if (doRunTests) {
          this.#doRunTestMethod(klass, method, result);
        }
      }

      this.#doClassCleanUps(lastKlass, result);

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
    #doClassCleanUps = (klass, result) => {
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

  /* eslint-disable require-jsdoc */
  class ClassSetupErrorTestCase extends DummyMethodTestCase {

    static setUpClass() {
      throw new Error('erroring');
    }

  }
  /* eslint-enable */

  /* eslint-disable require-jsdoc */
  class ClassSetupFailTestCase extends DummyMethodTestCase {

    static setUpClass() {
      throw new this.Fail('failing');
    }

  }
  /* eslint-enable */

  /* eslint-disable require-jsdoc */
  class ClassSetupSkipTestCase extends DummyMethodTestCase {

    static setUpClass() {
      throw new this.Skip('skipping');
    }

  }
  /* eslint-enable */

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

      // In setUpClass, TestCase.Fail counts as an error
      this.assertEqual(result.successes.length, 1);
      this.assertEqual(result.errors.length, 2);
      this.assertEqual(result.failures.length, 0);
      this.assertEqual(result.skipped.length, 1);
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
