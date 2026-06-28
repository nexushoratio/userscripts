// ==UserScript==
// ==UserLibrary==
// @name        NH_spa
// @description Support for Single-Page Applications (SPA).
// @version     13
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

window.NexusHoratio.spa = (function spa() {
  'use strict';

  const version = 13;

  const NH = window.NexusHoratio.base.ensure([
    {name: 'xunit', minVersion: 61},
    {name: 'base', minVersion: 64},
    {name: 'web', minVersion: 14},
  ]);

  /**
   * Base class for handling various views of a single-page application.
   *
   * Pages are created by subclassing with at least a custom constructor that
   * provides {PageDetails} via super().  The classes are then registered with
   * a {SPA} instance where they are instantiated with a single parameter of
   * {SPA}.
   *
   */
  class Page {

    /**
     * @typedef {object} PageDetails
     * @property {SPA} spa - SPA instance that manages this Page.
     * @property {string} [name=this.constructor.name] - A human readable name
     * for this page (normally parsed from the subclass name).
     * @property {string|RegExp} [pathname=RegExp(.*)] - Pathname portion of
     * the URL this page should handle.
     * @property {string} [readySelector='body'] - CSS selector that is used
     * to detect that the page is loaded enough to activate.
     */

    /** @param {PageDetails} details - Details about the page. */
    constructor(details = {}) {
      if (new.target === Page) {
        throw new TypeError('Abstract class; do not instantiate directly.');
      }

      this.#id = this.constructor.name;
      this.#spa = details.spa;
      this.#logger = new NH.base.Logger(this.#id);
      this.#pathnameRE = this.#computePathnameRE(details.pathname);
      ({
        readySelector: this.#readySelector = 'body',
        name: this.#name = NH.base.simpleParseWords(this.#id)
          .join(' '),
      } = details);
      this.dispatcher
        .on('activate', this.#onActivate)
        .on('deactivate', this.#onDeactivate);
    }

    /**
     * A convenience class for integrating {Page} with {NH.base.Service}.
     *
     * When used with {@link addService}, subclasses will have the page
     * property set.
     *
     * The class can also be used directly simply to use Service handlers.
     */
    static Service = class extends NH.base.Service {

      /** @returns {Page} - Associated instance. */
      get page() {
        return this.#page;
      }

      /** @param {Page} val - Associated instance. */
      set page(val) {
        if (this.#page) {
          const msg = 'This attribute may only be set once.';
          const opts = {
            cause: {
              code: NH.base.Code.ALREADY_EXISTS,
              reason: 'AlreadySet',
              service: this.shortName,
            },
          };
          throw new Error(msg, opts);
        }
        this.#page = val;
      }

      #page

    }

    /** @type {NH.base.Dispatcher} */
    get dispatcher() {
      return this.#dispatcher;
    }

    /** @type {string} - Machine readable name for the page. */
    get id() {
      return this.#id;
    }

    /** @type {NH.base.Logger} */
    get logger() {
      return this.#logger;
    }

    /** @type {string} - Human readable name for the page. */
    get name() {
      return this.#name;
    }

    /** @type {RegExp} */
    get pathname() {
      return this.#pathnameRE;
    }

    /** @type {SPA} */
    get spa() {
      return this.#spa;
    }

    /**
     * Register a new {@link NH.base.Service}.
     *
     * @param {function(): NH.base.Service} Klass - A service class to
     * instantiate.  If this is a {Page.Service}, the .page property is also
     * set.
     * @param {...*} rest - Arbitrary objects to pass to constructor.
     * @returns {NH.base.Service} - Instance of Klass.
     */
    addService(Klass, ...rest) {
      const me = this.addService.name;
      this.logger.entered(me, Klass, ...rest);

      let instance = null;
      if (Klass.prototype instanceof NH.base.Service) {
        instance = new Klass(this.constructor.name, ...rest);
        this.#services.add(instance);
      } else {
        const msg = 'Not a Service';
        const opts = {
          cause: {
            code: NH.base.Code.INVALID_ARGUMENT,
            reason: 'NotService',
            service: Klass,
          },
        };
        throw new Error(msg, opts);
      }

      if (instance instanceof Page.Service) {
        instance.page = this;
      }

      this.logger.leaving(me, instance);
      return instance;
    }

    static #supportedEvents = [
      'activate',
      'deactivate',
    ];

    #dispatcher = new NH.base.Dispatcher(...Page.#supportedEvents);
    #id
    #logger
    #name
    #pathnameRE
    #readySelector
    #services = new Set();
    #spa

    /**
     * Turn a path into a RegExp.
     * @param {string|RegExp} pathname - A path to convert.
     * @returns {RegExp} - A converted path.
     */
    #computePathnameRE = (pathname) => {
      const me = this.#computePathnameRE.name;
      this.logger.entered(me, pathname);

      let re = /.*/u;
      if (pathname instanceof RegExp) {
        re = pathname;
      } else if (pathname) {
        re = RegExp(`^${pathname}$`, 'u');
      }

      this.logger.leaving(me, re);
      return re;
    }

    #onActivate = async () => {
      await this.#waitUntilReady();

      for (const service of this.#services) {
        service.activate();
      }
    }

    #onDeactivate = () => {
      for (const service of this.#services) {
        service.deactivate();
      }
    }

    /**
     * Wait until the page has loaded enough to continue...
     * @returns {Element} - The element matched by #readySelector.
     */
    #waitUntilReady = async () => {
      const me = this.#waitUntilReady.name;
      this.logger.entered(me, this.#readySelector);

      const timeout = 3000;
      let element = null;
      try {
        element = await NH.web.waitForSelector(
          this.#readySelector, timeout
        );
      } catch (e) {
        NH.base.issues.post(
          `${this.name} failed to load`,
          e.message,
          this.#readySelector
        );
      }

      this.logger.leaving(me, element);
      return element;
    }

  }

  /* eslint-disable no-new */
  /* eslint-disable no-shadow */
  /* eslint-disable no-undefined */
  /* eslint-disable require-jsdoc */
  class PageTestCase extends NH.xunit.TestCase {

    static BaseService = class extends NH.base.Service {

      constructor(name) {
        super(`The ${name}`);
        this
          .on('activate', this.#onEvent)
          .on('activated', this.#onEvent)
          .on('deactivate', this.#onEvent)
          .on('deactivated', this.#onEvent);
      }

      mq = new NH.base.MessageQueue();

      #onEvent = (evt, data) => {
        this.mq.post(`service-${evt}`, data);
      }

    }

    static TestService = class extends Page.Service {}

    static ADefaultPage = class extends Page {

      constructor(spa) {
        super({spa: spa});
        this.baseService = this.addService(PageTestCase.BaseService);
        this.pageService = this.addService(Page.Service);
        this.testService = this.addService(PageTestCase.TestService)
          .on('activate', this.#onEvent)
          .on('activated', this.#onEvent)
          .on('deactivate', this.#onEvent)
          .on('deactivated', this.#onEvent);
      }

      mq = new NH.base.MessageQueue();

      #onEvent = (evt, data) => {
        this.mq.post(`page-${evt}`, data);
      }

    }

    static AnOverridePage = class extends Page {

      constructor(spa, method) {
        const pathnames = new Map([
          ['s', '/path/to/override'],
          // eslint-disable-next-line prefer-regex-literals
          ['r', RegExp('^/another/path/to/page/(?:sub1|sub2)/', 'u')],
        ]);
        const pathname = pathnames.get(method);

        super({
          spa: spa,
          pathname: pathname,
          ...PageTestCase.AnOverridePage.#details,
        });

      }

      static #details = {
        name: 'XyZzy Tasks',
      }

    }

    testAbstract() {
      this.assertRaises(TypeError, () => {
        new Page();
      });
    }

    testDefaultProperties() {
      // Assemble
      const spa = Symbol(this.id);
      const d = new PageTestCase.ADefaultPage(spa);

      // Assert
      this.assertTrue(
        d.dispatcher instanceof NH.base.Dispatcher, 'dispatcher'
      );
      this.assertEqual(d.id, 'ADefaultPage', 'id');
      this.assertTrue(d.logger instanceof NH.base.Logger, 'logger');
      this.assertEqual(d.name, 'A Default Page', 'name');
      this.assertEqual(d.pathname, /.*/u, 'path');
      this.assertEqual(d.spa, spa, 'spa');
    }

    testOverrideProperties() {
      // Assemble
      const spa = Symbol(this.id);
      // String path
      const s = new PageTestCase.AnOverridePage(spa, 's');
      // Regex path
      const r = new PageTestCase.AnOverridePage(spa, 'r');

      // Assert
      this.assertTrue(
        s.dispatcher instanceof NH.base.Dispatcher, 'dispatcher'
      );
      this.assertEqual(s.id, 'AnOverridePage', 'id');
      this.assertTrue(s.logger instanceof NH.base.Logger, 'logger');
      this.assertEqual(s.name, 'XyZzy Tasks', 'name');
      this.assertEqual(s.pathname, /^\/path\/to\/override$/u, 's-path');
      this.assertEqual(s.spa, spa, 'spa');

      this.assertEqual(
        r.pathname,
        /^\/another\/path\/to\/page\/(?:sub1|sub2)\//u,
        'r-path'
      );
    }

    testServicesAdded() {
      // Assemble
      const spa = Symbol(this.id);
      const page = new PageTestCase.ADefaultPage(spa);

      this.assertTrue(
        page.baseService instanceof PageTestCase.BaseService, 'base service'
      );

      this.assertTrue(
        page.pageService instanceof Page.Service, 'page service'
      );

      this.assertTrue(
        page.testService instanceof PageTestCase.TestService, 'test service'
      );
    }

    async testServicesActivation() {
      // Assemble
      const spa = Symbol(this.id);
      const page = new PageTestCase.ADefaultPage(spa);
      const messages = [];
      const cb = (...items) => {
        messages.push(items[0]);
        messages.push('---');
      };

      // Act - Simulate what SPA does.
      page.dispatcher.fire('activate');

      // TODO(#304): Activate triggers async functions, and we need two
      // iterations to process all of the messages.  Yes, this is fragile.
      await null;
      await null;

      // Assert - Base handles messages directly, Test uses the Page.
      page.baseService.mq.listen(cb);
      this.assertEqual(
        messages,
        ['service-activate', '---', 'service-activated', '---'],
        'base service'
      );

      messages.length = 0;
      page.mq.listen(cb);
      this.assertEqual(
        messages,
        ['page-activate', '---', 'page-activated', '---'],
        'test service'
      );
    }

    testServicePagePropertyInitialized() {
      // Assemble/Act
      const spa = Symbol(this.id);
      const page = new PageTestCase.ADefaultPage(spa);

      // Assert
      this.assertEqual(page.baseService.page, undefined, 'base service');
      this.assertEqual(page.pageService.page, page, 'page service');
      this.assertEqual(page.testService.page, page, 'test service');
    }

    testServicePagePropertyCannotBeAssignedTwice() {
      // Assemble
      const spa = Symbol(this.id);
      const page = new PageTestCase.ADefaultPage(spa);
      const service = new Page.Service(this.id);

      // Act
      service.page = page;

      // Assert
      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.ALREADY_EXISTS,
          reason: 'AlreadySet',
          service: this.id,
        },
        () => {
          service.page = page;
        },
        'assigned a second time'
      );
    }

    testNotAService() {
      // Assemble
      const spa = Symbol(this.id);
      const page = new PageTestCase.ADefaultPage(spa);

      // Act/Assert
      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'NotService',
          service: 'not-a-service',
        },
        () => {
          page.addService('not-a-service');
        },
        'not a service'
      );
    }

    static { this.register(); }

  }
  /* eslint-enable */

  /**
   * Class for monitoring and logging mutations to a page.
   *
   * This is intended to explore new and modified pages.
   *
   * As elements are loaded, they are modified with a `data-counter` property
   * to indicate the order they were loaded.  This can be used to find page
   * useful values for {@link PageDetails.readySelector}.
   *
   * This class logs a lot and modifies every element encountered, slowing
   * down pages.  It is unlikely it should always be enabled.
   *
   * After registering this class, in the console, do a query for the largest
   * *data-counter* to see what the last thing loaded was.  Having timestamps
   * turned on in the console helps.
   *
   * @example
   * $$('[data-counter]:not(svg,img,figure)')
   *   .map(x => [x.dataset.counter, x])
   *   .sort((a,b) => (b[0] - a[0]))
   */
  class WatchPage extends Page {

    /** @param {SPA} spaInstance - SPA instance that manages this Page. */
    constructor(spaInstance) {
      super({spa: spaInstance});

      this.#mo = new MutationObserver(this.#mutationHandler);
      this.addService(Page.Service)
        .on('activate', this.#onActivateWatch)
        .allowReactivation(false);
    }

    #counter
    #mo

    #onActivateWatch = () => {
      const me = this.#onActivateWatch.name;
      this.logger.entered(me);

      this.#counter = 1;
      this.#mo.observe(document.querySelector('body'),
        {childList: true, subtree: true});

      this.logger.leaving(me);
    }

    /**
     * MutationObserver callback.
     * @param {MutationRecord[]} records - Standard mutation records.
     */
    #mutationHandler = (records) => {  // eslint-disable-line max-statements
      const me = this.#mutationHandler.name;
      this.logger.entered(me, `records: ${records.length}`);

      const adds = [];
      const dels = [];
      for (const record of records) {
        if (record.type === 'childList') {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              node.dataset.counter = this.#counter;
              this.#counter += 1;
              adds.push(node);
            }
          }
          for (const node of record.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE &&
                node.matches('[data-counter]')) {
              dels.push(node);
            }
          }
        }
      }

      if (adds.length) {
        this.logger.starting('adds', adds.length);
        for (const node of adds) {
          this.logger.log('node:', node, node.innerText);
        }
        this.logger.finished('adds');
      }
      if (dels.length) {
        this.logger.starting('dels', dels.length);
        for (const node of dels) {
          this.logger.log('node:', node);
        }
        this.logger.finished('dels');
      }
      this.logger.leaving(me, this.#counter);
    }

  }

  /**
   * Base class for site details.
   *
   * Single-page application userscripts should subclass, instantiate then
   * pass in while creating a {SPA} instance.
   *
   * Instances of {Page} will have access to maintain state and shared
   * information.
   *
   * A dispatcher is exposed to allow {SPA} to send events.
   */
  class Details {

    /** Create a Details instance. */
    constructor() {
      if (new.target === Details) {
        throw new TypeError('Abstract class; do not instantiate directly.');
      }

      this.#logger = new NH.base.Logger(`${this.constructor.name}`);
      this.#id = NH.base.safeId(NH.base.uuId(this.constructor.name));
      this.#dispatcher.on('initialize', this.#onInit);
    }

    /**
     * @type {string} - CSS selector to monitor if self-managing URL changes.
     *
     * Override in subclass if desired.
     *
     * The selector must resolve to an element that, once it exists, will
     * continue to exist for the lifetime of the SPA.
     */
    urlChangeMonitorSelector = 'body';

    /** @type {NH.base.Dispatcher} */
    get dispatcher() {
      return this.#dispatcher;
    }

    /** @type {string} - Unique ID for this instance . */
    get id() {
      return this.#id;
    }

    /** @type {NH.base.Logger} - NH.base.Logger instance. */
    get logger() {
      return this.#logger;
    }

    /** @type {SPA} */
    get spa() {
      return this.#spa;
    }

    static #supportedEvents = [
      'activate',
      'activated',
      'initialize',
      'initialized',
    ];

    #dispatcher = new NH.base.Dispatcher(...Details.#supportedEvents);
    #id
    #logger
    #spa

    #onInit = (...args) => {
      this.#spa = args[1];
    }

  }

  /* eslint-disable no-new */
  /* eslint-disable no-shadow */
  /* eslint-disable no-undefined */
  /* eslint-disable require-jsdoc */
  class DetailsTestCase extends NH.xunit.TestCase {

    static TestDeets = class extends Details {};

    static OverrideDeets = class extends Details {

      urlChangeMonitorSelector = 'html';

    };

    testAbstract() {
      this.assertRaises(TypeError, () => {
        new Details();
      });
    }

    testProperties() {
      const deets = new DetailsTestCase.TestDeets();

      this.assertEqual(deets.urlChangeMonitorSelector, 'body', 'url monitor');
      this.assertRegExp(
        deets.id,
        /^TestDeets-.*/u,
        'id'
      );
      this.assertTrue(deets.logger instanceof NH.base.Logger, 'logger');

      this.assertEqual(deets.spa, undefined, 'early spa');
      const spa = Symbol('spa');
      deets.dispatcher.fire('initialize', spa);
      this.assertEqual(deets.spa, spa, 'late spa');
    }

    testOverrides() {
      const deets = new DetailsTestCase.OverrideDeets();

      this.assertEqual(deets.urlChangeMonitorSelector, 'html', 'url monitor');
    }

    static { this.register(); }

  }
  /* eslint-enable */

  /**
   * A userscript driver for working with a single-page application (SPA).
   *
   * In many cases, as a user navigates through a SPA, the website will change
   * the URL.  This allows for easy bookmarking by users.  By monitoring the
   * changes to the URL, this class facilitates making userscripts that adapt
   * to different views.
   *
   * Generally, a single instance of this class is created, and all {Page}
   * subclasses are registered with it.  As the user navigates through the
   * SPA, this class will react to the changes and enable and disable view
   * specific Pages as appropriate.
   *
   * Each Page can be customized to augment the individual site page.
   */
  class SPA {

    /** @param {Details} details - Implementation specific details. */
    constructor(details) {
      const myName = `${this.constructor.name}: ${details.constructor.name}`;
      this.#details = details;
      this.details.dispatcher.fire('initialize', this);
      this.#id = NH.base.safeId(NH.base.uuId(myName));
      this.#logger = new NH.base.Logger(myName);
      this.#startUrlMonitor();
      this.details.dispatcher.fire('initialized', null);
      this.#activate(window.location.pathname);
    }

    /** @type {Details} */
    get details() {
      return this.#details;
    }

    /** Dispose of the instance. */
    [Symbol.dispose]() {
      // Depending on what features the userscript manager provides, creating
      // a SPA instance may involve async functions.  In tests, that could
      // cause this SPA instance to be created and disposed in same event loop
      // iteration, while async function would happen in the next iteration.
      // Depending on what happens, it is possible, even likely, that
      // listeners will get attached after the tests, and stick around.  The
      // `setTimeout()` will append this to the event loop job queue, and thus
      // hopefully get properly cleaned up.  The word "hopefully" is doing a
      // lot of lifting there.
      setTimeout(() => {
        this.#stopUrlMonitor();
      }, 0);
    }

    /**
     * Add a new page to those supported by this instance.
     * @param {Page} Klass - A {@link Page} class to instantiate.
     * @returns {SPA} - This instance, for chaining.
     */
    register(Klass) {
      const me = this.register.name;
      this.#logger.entered(me, Klass);

      if (Klass.prototype instanceof Page) {
        this.#pages.add(new Klass(this));
        this.#activate(window.location.pathname);
      } else {
        const msg = 'Not a Page';
        const opts = {
          cause: {
            code: NH.base.Code.INVALID_ARGUMENT,
            reason: 'NotPage',
            page: Klass,
          },
        };
        throw new Error(msg, opts);
      }

      this.#logger.leaving(me);
      return this;
    }

    #activePages = new Set();
    #details
    #id
    #logger
    #oldUrl
    #pages = new Set();
    #urlMonitorObserver

    /**
     * @typedef {object} Pages
     * @property {Set<Page>} active - Currently active pages.
     * @property {Set<Page>} old - Pages being deactivated.
     * @property {Set<Page>} new - Pages being activated.
     */

    /**
     * Handle switching from the old page (if any) to the new one.
     * @param {string} pathname - A {URL.pathname}.
     */
    #activate = (pathname) => {
      const me = this.#activate.name;
      this.#logger.entered(me, pathname);

      const found = this.#findPages(pathname);
      const pages = {
        active: found,
        old: this.#activePages.difference(found),
        new: found.difference(this.#activePages),
      };
      const oldPages = new Set(this.#activePages);
      const newPages = new Set(found);
      for (const page of pages.active) {
        oldPages.delete(page);
      }

      this.details.dispatcher.fire('activate', pages);
      // TODO(#353): Replace oldPages with pages.old.
      for (const page of oldPages) {
        page.dispatcher.fire('deactivate');
      }

      // TODO(#353): Replace newPages with pages.new.
      for (const page of newPages) {
        page.dispatcher.fire('activate');
      }
      this.#activePages = pages.active;
      this.details.dispatcher.fire('activated', pages);

      this.#logger.leaving(me);
    }

    /**
     * Determine which pages can handle this portion of the URL.
     * @param {string} pathname - A {URL.pathname}.
     * @returns {Set<Page>} - The pages to use.
     */
    #findPages = (pathname) => {
      const pages = Array.from(this.#pages.values());
      return new Set(pages.filter(page => page.pathname.test(pathname)));
    }

    /**
     * Start userscript manager based URL monitoring.
     *
     * This explicitly listens on `window`.
     *
     * Tampermonkey was the first(?) userscript manager to provide events
     * about URLs changing.  Hence the need for `@grant window.onurlchange` in
     * the UserScript header.
     */
    #startUserscriptManagerUrlMonitor = () => {
      this.#logger.log('Using Userscript Manager provided URL monitor.');
      window.addEventListener('urlchange', this.#urlChangeAdapter);
    }

    #stopUserscriptManagerUrlMonitor = () => {
      window.removeEventListener('urlchange', this.#urlChangeAdapter);
    }

    /**
     * The info that TM gives is not really an event.  So we turn it into one
     * and throw it again, this time onto `document` where something is
     * listening for it.
     * @param {object} info - Generic object from the userscript manager.
     * @fires Event#urlchange
     */
    #urlChangeAdapter = (info) => {
      const newUrl = new URL(info.url);
      const evt = new CustomEvent('urlchange', {detail: {url: newUrl}});
      document.dispatchEvent(evt);
    }

    /**
     * Install a long lived MutationObserver that watches
     * {Details.urlChangeMonitorSelector}.
     *
     * Whenever it is triggered, it will check to see if the current URL has
     * changed, and if so, send an appropriate event.
     * @fires Event#urlchange
     */
    #startMutationObserverUrlMonitor = async () => {
      this.#logger.log('Using MutationObserver for monitoring URL changes.');

      const observeOptions = {childList: true, subtree: true};

      const element = await NH.web.waitForSelector(
        this.details.urlChangeMonitorSelector, 0
      );
      this.#logger.log('element exists:', element);

      this.#oldUrl = new URL(window.location);
      this.#urlMonitorObserver = new MutationObserver(
        this.#urlMonitorHandler
      );
      this.#urlMonitorObserver.observe(element, observeOptions);
      window.addEventListener('popstate', this.#urlMonitorHandler);
    }

    #stopMutationObserverUrlMonitor = () => {
      this.#urlMonitorObserver?.disconnect();
      this.#urlMonitorObserver = null;
      window.removeEventListener('popstate', this.#urlMonitorHandler);
    }

    #urlMonitorHandler = () => {
      const newUrl = new URL(window.location);
      if (this.#oldUrl.href !== newUrl.href) {
        const evt = new CustomEvent('urlchange', {detail: {url: newUrl}});
        this.#oldUrl = newUrl;
        document.dispatchEvent(evt);
      }
    }

    /**
     * Start URL monitoring.
     *
     * If the userscript manager supports monitoring, that will be used.
     *
     * This explicitly uses `document` for the event.
     */
    #startUrlMonitor = () => {
      document.addEventListener('urlchange', this.#onUrlChange, true);
      if (window.onurlchange === null) {
        this.#startUserscriptManagerUrlMonitor();
      } else {
        this.#startMutationObserverUrlMonitor();
      }
    }

    /** Stop URL monitoring. */
    #stopUrlMonitor = () => {
      document.removeEventListener('urlchange', this.#onUrlChange, true);
      this.#stopUserscriptManagerUrlMonitor();
      this.#stopMutationObserverUrlMonitor();
    }

    /**
     * Handle urlchange events that indicate a switch to a new page.
     * @param {CustomEvent} evt - Custom 'urlchange' event.
     */
    #onUrlChange = (evt) => {
      this.#activate(evt.detail.url.pathname);
    }

  }

  /* eslint-disable no-shadow */
  /* eslint-disable require-jsdoc */
  class SPATestCase extends NH.xunit.TestCase {

    static Deets = class extends Details {};
    static Paige = class extends Page {

      constructor(spa) {
        super({spa: spa});
      }

    };

    testConstructor() {
      const deets = new SPATestCase.Deets();
      const spa = new SPA(deets);

      try {
        this.assertEqual(deets.spa, spa, 'deets spa');
      } finally {
        spa[Symbol.dispose]();
      }
    }

    testRegister() {
      const deets = new SPATestCase.Deets();
      const spa = new SPA(deets);

      try {
        this.assertEqual(spa.register(SPATestCase.Paige), spa, 'chaining');

        this.assertRaisesCause(
          Error,
          {
            code: NH.base.Code.INVALID_ARGUMENT,
            reason: 'NotPage',
            page: 'not-a-page',
          },
          () => {
            spa.register('not-a-page');
          },
          'not a page'
        );
      } finally {
        spa[Symbol.dispose]();
      }

    }

    static { this.register(); }

  }
  /* eslint-enable */

  return {
    version: version,
    Page: Page,
    WatchPage: WatchPage,
    Details: Details,
    SPA: SPA,
  };

}());
