// ==UserScript==
// ==UserLibrary==
// @name        NH_xunit
// @description xUnit style testing.
// @version     3
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
  const version = 3;

  /**
   * @type {object} - For testing support (to be replaced with `TestCase`).
   */
  const testing = {
    enabled: false,
    funcs: [],
    testCases: [],
  };

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
   */
  class TestCase {

    /** Instantiate a TestCase. */
    constructor() {
      if (new.target === TestCase) {
        throw new TypeError('Abstract class; do not instantiate directly.');
      }
    }

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

    static Error = class extends Error {

      /** @inheritdoc */
      constructor(...rest) {
        super(...rest);
        this.name = `TestCase.${this.constructor.name}`;
      }

    };

    static Fail = class extends this.Error {}
    static Skip = class extends this.Error {}

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
     * TODO: Handle more than primitives.
     * @param {*} first - First argument.
     * @param {*} second - Second argument.
     * @param {string} [msg=''] - Reason for the failure.
     */
    assertEqual(first, second, msg = '') {
      let failMsg = msg;
      if (first === second) {
        return;
      }
      if (!failMsg) {
        failMsg = `${first} does not equal ${second}.`;
      }
      this.fail(failMsg);
    }

    /**
     * Asserts the expected exception is raised.
     * @param {function(): Error} exc - Expected Error class.
     * @param {function} func - Function to call.
     * @param {string} [msg=''] - Reason for the failure.
     */
    assertRaises(exc, func, msg = '') {
      let failMsg = msg;
      try {
        func();
      } catch (e) {
        if (e instanceof exc) {
          return;
        }
        if (!failMsg) {
          failMsg = `Expected ${exc.name}, caught ${e.name} ` +
            `with ${e.message} instead`;
        }
      }
      if (!failMsg) {
        failMsg = `Expected ${exc.name}, caught nothing`;
      }
      this.fail(failMsg);
    }

    // TODO: Add assertions as needed.

    #cleanups = [];

  }

  /* eslint-disable no-magic-numbers */
  /** For testing TestCase basic features .*/
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

  }
  /* eslint-enable */

  /* eslint-disable no-new */
  /* eslint-disable no-magic-numbers */
  /** Test TestCase. */
  class TestTestCase extends TestCase {

    /** Test method. */
    testCannotInstantiateDirectly() {
      this.assertRaises(TypeError, () => {
        new TestCase();
      });
    }

    /** Test method. */
    testStaticSetUpClassExists() {
      try {
        TestCase.setUpClass();
      } catch (e) {
        this.fail(e);
      }
    }

    /** Test method. */
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

  }
  /* eslint-enable */

  testing.testCases.push(TestTestCase);

  /** Accumulated results from running a TestCase. */
  class TestResult {

    /**
     * Record a successful execution.
     * @param {string} name - Name of the TestCase.testMethod.
     */
    addSuccess(name) {
      this.successes.push(name);
    }

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

    /** @returns {boolean} - Indicates success so far. */
    wasSuccessful() {
      return this.errors.length === 0 && this.failures.length === 0;
    }

    /** Successes. */
    successes = [];

    /** Unexpected exceptions. */
    errors = [];

    /** Explicit test failures (typically failed asserts). */
    failures = [];

    /** Skipped tests. */
    skipped = [];

  }

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
        throw new Error(`Bad classes: ${msg}`);
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
      for (const {klass, method} of this.#tests) {
        if (klass !== lastKlass) {
          this.#doClassCleanUps(lastKlass, result);
          this.#doSetUpClass(klass, result);
        }
        lastKlass = klass;

        this.#doRunTestMethod(klass, method, result);
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
      }
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
        const instance = new Klass();

        name = `${Klass.name}.setUp`;
        instance.methodName = methodName;
        instance.setUp();

        name = `${Klass.name}.${methodName}`;
        instance[methodName]();

        result.addSuccess(name);
      } catch (e) {
        if (e instanceof TestCase.Skip) {
          result.addSkip(name, e.message);
        } else if (e instanceof TestCase.Fail) {
          result.addFailure(name, e.message);
        } else {
          result.addError(name, e);
        }
      }
    }

  }

  /** TestRunner TestCase. */
  class RunnerTestCase extends TestCase {

  }

  testing.testCases.push(RunnerTestCase);

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
