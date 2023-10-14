// ==UserScript==
// ==UserLibrary==
// @name        NH_base
// @description Base library usable any time.
// @version     3
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

window.NexusHoratio.base = (function base() {
  'use strict';

  const version = 3;

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

  return {
    version: version,
    testing: testing,
    NOT_FOUND: NOT_FOUND,
    DefaultMap: DefaultMap,
  };

}());
