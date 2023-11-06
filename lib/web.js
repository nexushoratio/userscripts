// ==UserScript==
// ==UserLibrary==
// @name        NH_web
// @description Common patterns for working with the WEB API.
// @version     1
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

window.NexusHoratio.web = (function web() {
  'use strict';

  /** @type {number} - Bumped per release. */
  const version = 1;

  const NH = window.NexusHoratio.base.ensure([{name: 'base'}]);

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

      const logger = new NH.base.Logger(`otmot ${name}`);
      let timeoutID = null;
      let observer = null;

      /** @param {MutationRecord[]} records - Standard mutation records. */
      const moCallback = (records) => {
        const {done, results} = monitor(records);
        logger.log('monitor:', done, results);
        if (done) {
          observer.disconnect();
          clearTimeout(timeoutID);
          logger.log('resolving');
          resolve(results);
        }
      };

      /** Standard setTimeout callback. */
      const toCallback = () => {
        observer.disconnect();
        logger.log('one last try');
        moCallback([]);
        logger.log('rejecting after timeout');
        reject(new Error(`otmot ${name} timed out`));
      };

      observer = new MutationObserver(moCallback);
      if (timeout) {
        timeoutID = setTimeout(toCallback, timeout);
      }

      observer.observe(base, observeOptions);
      trigger();
      logger.log('running');
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
   * One time resize observer with timeout.
   *
   * Will resolve automatically upon first resize change.
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
      const {
        clientHeight: initialHeight,
        clientWidth: initialWidth,
      } = base;

      const logger = new NH.base.Logger(`otrot ${name}`);
      let timeoutID = null;
      let observer = null;
      logger.log('initial dimensions:', initialWidth, initialHeight);

      /** Standard ResizeObserver callback. */
      const roCallback = () => {
        const {clientHeight, clientWidth} = base;
        logger.log('observed dimensions:', clientWidth, clientHeight);
        if (clientHeight !== initialHeight || clientWidth !== initialWidth) {
          observer.disconnect();
          clearTimeout(timeoutID);
          logger.log('resolving');
          resolve(what);
        }
      };

      /** Standard setTimeout callback. */
      const toCallback = () => {
        observer.disconnect();
        logger.log('rejecting after timeout');
        reject(new Error(`otrot ${name} timed out`));
      };

      observer = new ResizeObserver(roCallback);
      timeoutID = setTimeout(toCallback, timeout);

      observer.observe(base);
      trigger();
      logger.log('running');
    });

    return prom;
  }

  /**
   * @callback ResizeAction
   * @param {ResizeObserverEntry[]} entries - Standard resize entries.
   */

  /**
   * @typedef {object} Otrot2How
   * @property {SimpleFunction} [trigger] - Function to call that triggers
   * observable events.
   * @property {ResizeAction} action - Function to call upon each event
   * observed and also at the end of duration.
   * @property {number} duration - Time to run in milliseconds.
   */

  /**
   * One time resize observer with action callback and duration.
   *
   * Will resolve upon duration expiration.  Uses the same what parameter as
   * {@link otrot}.
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

      const logger = new NH.base.Logger(`otrot2 ${name}`);
      let observer = null;

      /** @param {ResizeObserverEntry[]} entries - Standard entries. */
      const roCallback = (entries) => {
        logger.log('calling action');
        action(entries);
      };

      /** Standard setTimeout callback. */
      const toCallback = () => {
        observer.disconnect();
        roCallback([]);
        logger.log('resolving');
        resolve(`otrot2 ${name} finished`);
      };

      observer = new ResizeObserver(roCallback);
      setTimeout(toCallback, duration);

      observer.observe(base);
      trigger();
      logger.log('running');
    });

    return prom;
  }

  /**
   * Wait for selector to match using querySelector.
   * @param {string} selector - CSS selector.
   * @param {number} timeout - Time to wait in milliseconds, 0 disables.
   * @returns {Promise<Element>} - Matched element.
   */
  function waitForSelector(selector, timeout) {
    const me = 'waitForSelector';
    const logger = new NH.base.Logger(me);
    logger.entered(me, selector, timeout);

    /**
     * @implements {Monitor}
     * @returns {Continuation} - Indicate whether done monitoring.
     */
    const monitor = () => {
      const element = document.querySelector(selector);
      if (element) {
        logger.log(`match for ${selector}`, element);
        return {done: true, results: element};
      }
      logger.log('Still waiting for', selector);
      return {done: false};
    };

    const what = {
      name: me,
      base: document,
    };

    const how = {
      observeOptions: {childList: true, subtree: true},
      monitor: monitor,
      timeout: timeout,
    };

    logger.leaving(me);
    return otmot(what, how);
  }

  return {
    version: version,
    clickElement: clickElement,
    focusOnElement: focusOnElement,
    isInput: isInput,
    otmot: otmot,
    otrot: otrot,
    otrot2: otrot2,
    waitForSelector: waitForSelector,
  };

}());
