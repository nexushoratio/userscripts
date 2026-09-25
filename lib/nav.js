// ==UserScript==
// ==UserLibrary==
// @name        NH_nav
// @description Support for adding navigation to existing web content.
// @version     0
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

/**
 * Support for adding navigation to existing web content.
 *
 * Depends on:
 * - {@link NexusHoratio.xunit}
 * - {@link NexusHoratio.base}
 * @version 0
 * @license [GPL-3.0-or-later]{@link https://www.gnu.org/licenses/gpl-3.0-standalone.html}
 * @namespace NexusHoratio.nav
 */
window.NexusHoratio.nav = (function nav() {
  'use strict';

  /**
   * @const {number} - Bumped per release.
   * @memberof NexusHoratio.nav
   * @default
   */
  const version = 0;

  const NH = window.NexusHoratio.base.ensure([
    {name: 'xunit', minVersion: 63},
    {name: 'base', minVersion: 74},
  ]);

  /**
   * An ordered collection of HTMLElements for a user to continuously scroll
   * through.
   *
   * @memberof NexusHoratio.nav
   */
  class Scroller {

    /**
     * Function that generates a, preferably, reproducible unique identifier
     * for an Element.
     *
     * The method {@link NexusHoratio.nav.Scroller#defaultUid defaultUid}
     * exists to both provide an example and fallback implementation.
     * However, it may not always be reproducible (consider items that consist
     * of counts for reads and likes).  It may also not be unique within a
     * particular instance.
     *
     * It is a good practice to verify the stability and uniqueness of
     * callbacks across page reloads.  Built in logging will identify
     * duplicates.
     *
     * @callback uidCallback
     * @memberof NexusHoratio.nav.Scroller~
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */

    /**
     * Contains CSS selectors to first find a base element, then items that it
     * contains.
     *
     * @typedef {object} ContainerItemsSelector
     * @memberof NexusHoratio.nav.Scroller~
     * @property {string} container - CSS selector to find the container
     * element.
     * @property {string} items - CSS selector to find the items inside the
     * container.
     */

    /**
     * Function that finds a DOM element based upon another one.
     *
     * Useful for cases where CSS selectors are not sufficient.
     *
     * @callback ElementFinder
     * @memberof NexusHoratio.nav.Scroller~
     * @param {external:Element} element - Starting point.
     * @returns {external:Element} Found element.
     */

    /**
     * Common config for finding a clickable element inside the current item.
     *
     * Use only one of `selectorArray` or `finder`.
     *
     * @typedef {object} ClickConfig
     * @memberof NexusHoratio.nav.Scroller~
     * @property {string[]} [selectorArray] - CSS selectors to use to find an
     * element, passed to {@link NexusHoratio.web.clickElement clickElement}.
     * @property {boolean} [matchSelf=false] - If a CSS selector would match
     * base, then use it (passed to {@link NexusHoratio.web.clickElement
     * clickElement}).
     * @property {NexusHoratio.nav.Scroller~ElementFinder} [finder] - Function
     * to find the appropriate clickable element, when a `selectorArray` is
     * too simplistic.
     */

    /**
     * There are two ways to describe what elements go into a {@link
     * NexusHoratio.nav.Scroller Scroller}:
     * 1. An explicit container (via `base`) element and selectors stemming
     * from it.
     * 2. An array of {@link NexusHoratio.nav.Scroller~ContainerItemsSelector
     *   ContainerItemsSelector}s that can allow for multiple containers with
     *   items.  This approach will also allow the {@link
     *   NexusHoratio.nav.Scroller Scroller} to automatically wait for all
     *   container elements to exist during activation.
     *
     * @typedef {object} What
     * @memberof NexusHoratio.nav.Scroller~
     * @property {string} name - Name for this {@link
     * NexusHoratio.nav.Scroller Scroller}, used for logging.
     * @property {external:Element} base - The container to use as a base for
     * selecting elements.
     * @property {string[]} selectors - Array of CSS selectors to find
     * elements to collect, calling `base.querySelectorAll()`.
     * @property {NexusHoratio.nav.Scroller~ContainerItemsSelector[]}
     * containerItems - Array of {@link
     * NexusHoratio.nav.Scroller~ContainerItemsSelector
     * ContainerItemsSelector}s.
     */

    /**
     * @typedef {object} How
     * @memberof NexusHoratio.nav.Scroller~
     * @property {NexusHoratio.nav.Scroller~uidCallback} uidCallback -
     * Callback to generate a uid.
     * @property {number} [maxUidLength=20] - Max length for default uid text.
     * @property {string[]} [classes=[]] - Array of CSS classes to add/remove
     * from an element as it becomes current.
     * @property {boolean} [watchForClicks=true] - Whether the Scroller should
     * watch for clicks and if one is inside an item, select it.
     * @property {boolean} [autoActivate=false] - Whether to call the activate
     * method at the end of construction.
     * @property {boolean} [observeAttributes=false] - Whether the built in
     * {@link external:MutationObserver MutationObserver} should also observer
     * node attributes (useful if the uid depends on attributes).
     * @property {boolean} [snapToTop=false] - Whether items should snap to
     * the top of the window when coming into view.
     * should happen when `snapToTop` is false.
     * @property {number} [waitForItemTimeout=3000] - Time to wait, in
     * milliseconds, for existing item to reappear upon reactivation.
     * @property {number} [containerTimeout=0] - Time to wait, in
     * milliseconds, for a {@link
     * NexusHoratio.nav.Scroller~ContainerItemsSelector
     * ContainerItemsSelector.container} to show up.  Some pages may not
     * always provide all identified containers.  The default of `0` disables
     * timing out.  NB: Any containers that timeout will not handle further
     * activate() processing, such as `watchForClicks`.
     * @property {NexusHoratio.nav.Scroller~ClickConfig} [clickConfig={}] -
     * Configures how the {@link NexusHoratio.nav.Scroller#click click} method
     * operates.
     */

    /**
     * @param {NexusHoratio.nav.Scroller~What} what - What we want to scroll.
     * @param {NexusHoratio.nav.Scroller~How} how - How we want to scroll.
     * @throws {external:Error} On many construction problems.
     */
    constructor(what, how) {
      ({
        name: this.#name,
        base: this.#base,
        selectors: this.#selectors,
        containerItems: this.#containerItems = [],
      } = what);
      ({
        uidCallback: this.#uidCallback,
        maxUidLength: this.#maxUidLength = Scroller.#defaults.MAX_UID_LENGTH,
        classes: this.#classes = [],
        watchForClicks: this.#watchForClicks =
        Scroller.#defaults.WATCH_FOR_CLICKS,
        autoActivate: this.#autoActivate = false,
        observeAttributes: this.#observeAttributes =
        Scroller.#defaults.OBSERVE_ATTRIBUTES,
        snapToTop: this.#snapToTop = false,
        waitForItemTimeout: this.#waitForItemTimeout =
        Scroller.#defaults.WAIT_FOR_ITEM,
        containerTimeout: this.#containerTimeout = 0,
        clickConfig: this.#clickConfig = {},
      } = how);

      this.#validateInstance();

      this.#containersMutationObserver = new MutationObserver(
        this.#containersMutationHandler
      );

      this.#logger = new NH.base.Logger(`{${this.#name}}`);
      this.logger.log('Scroller constructed', this);

      if (this.#autoActivate) {
        this.activate();
      }
    }

    /** @type {NexusHoratio.base.Dispatcher} */
    get dispatcher() {
      return this.#dispatcher;
    }

    /** @type {external:Element} */
    get item() {
      const me = 'get item';
      this.logger.entered(me);

      if (this.#destroyed) {
        const msg = 'Tried to work with destroyed scroller';
        const opts = {
          cause: {
            code: NH.base.Code.FAILED_PRECONDITION,
            reason: 'Destroyed',
            scroller: this.name,
          },
        };
        throw new Error(msg, opts);
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

      this.logger.leaving(me, item);
      return item;
    }

    // eslint-disable-next-line require-jsdoc
    set item(val) {
      const me = 'set item';
      this.logger.entered(me, val);

      this.dull();
      this.#bottomHalf(val);

      this.logger.leaving(me);
    }

    /** @type {string} */
    get itemUid() {
      return this.#currentItemId;
    }

    /** @type {NexusHoratio.base.Logger} */
    get logger() {
      return this.#logger;
    }

    /** @type {string} */
    get name() {
      return this.#name;
    }

    /**
     * Return normalized text for an element.
     *
     * Like `HTMLElement.innerText`, but cleaner and mostly deduped.
     *
     * @param {external:Element} element - Element to examine.
     * @returns {string} The normalized text.
     */
    defaultUid(element) {
      const me = this.defaultUid.name;
      this.logger.entered(me, element);

      const texts = new Set();

      /**
       * @param {Node} node - Node to process.
       * @param {number} height - Height of last node that was an Element.
       */
      const recurse = (node, height) => {
        const currHeight = this.#realHeight(node) || height;
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.nodeValue.trim();
          if (text && currHeight > 1) {
            texts.add(text);
          }
        }
        for (const nextNode of node.childNodes) {
          recurse(nextNode, currHeight);
        }
      };
      recurse(element, this.#realHeight(element));

      let content = [...texts].join(' ');

      if (content.length > this.#maxUidLength) {
        this.logger.log(
          'exceeded maxUidLength', content.length, this.#maxUidLength
        );
        content = NH.base.strHash(content);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /** Click either the current item OR `document.activeElement`. */
    click() {
      const me = this.click.name;
      const item = this.item;
      this.logger.entered(me, item);

      if (item) {
        if (this.#clickConfig.finder) {
          const result = this.#clickConfig.finder(item);
          if (result) {
            result.click();
          } else {
            NH.web.postInfoAboutElement(item,
              `the clickConfig function for ${this.name}`);
          }
        } else if (this.#clickConfig.selectorArray) {
          if (!NH.web.clickElement(
            item,
            this.#clickConfig.selectorArray,
            this.#clickConfig.matchSelf
          )) {
            NH.web.postInfoAboutElement(item,
              `the clickConfig selectorArray for ${this.name}`);
          }
        } else {
          NH.base.issues.post(
            `Scroller.click() for "${this.name}" was called without` +
              ' a configuration'
          );
        }
      } else {
        document.activeElement.click();
      }

      this.logger.leaving(me);
    }

    /** Move to the next item in the collection. */
    next() {
      this.#scrollBy(NH.base.ONE_ITEM);
    }

    /** Move to the previous item in the collection. */
    prev() {
      this.#scrollBy(-NH.base.ONE_ITEM);
    }

    /** Move to the first item in the collection. */
    first() {
      this.#jumpToEndItem(true);
    }

    /** Move to last item in the collection. */
    last() {
      this.#jumpToEndItem(false);
    }

    /**
     * Move to a specific item if possible.
     * @param {external:Element} item - Item to go to.
     */
    goto(item) {
      this.item = item;
    }

    /**
     * Move to a specific item if possible, by uid.
     * @param {string} uid - The uid of a specific item.
     * @returns {boolean} Was able to goto the item.
     */
    gotoUid(uid) {
      const me = this.gotoUid.name;
      this.logger.entered(me, uid);

      const items = this.#getItems();
      const item = items.find(el => uid === this.#uid(el));
      let success = false;
      if (item) {
        this.item = item;
        success = true;
      }

      this.logger.leaving(me, success, item);
      return success;
    }

    /** Adds the registered CSS classes to the current element. */
    shine() {
      this.item?.classList.add(...this.#classes);
    }

    /** Removes the registered CSS classes from the current element. */
    dull() {
      this.item?.classList.remove(...this.#classes);
    }

    /** Bring current item into view. */
    show() {
      this.#scrollToCurrentItem();
    }

    /**
     * Move browser focus to current item.
     *
     * @fires NexusHoratio.nav.Scroller#focus
     * @fires NexusHoratio.nav.Scroller#focused
     */
    focus() {
      const me = this.focus.name;
      this.logger.entered(me);

      this.dispatcher.fire('focus', null);

      this.shine();
      this.show();
      NH.web.focusOnTree(this.item);

      this.logger.leaving(me);
      this.dispatcher.fire('focused', null);
    }

    /**
     * Activate the scroller.
     *
     * @fires NexusHoratio.nav.Scroller#activate
     */
    async activate() {
      const me = this.activate.name;
      this.logger.entered(me);

      await this.#startContainers();
      // The logging statement is useful for debugging.  Keep it.
      this.logger.log('watcher:', await this.#currentItemWatcher());
      this.#mutationDispatcher.on('attributes', this.#attributesHandler);
      this.#mutationDispatcher.on('childList', this.#monitorConnectedness);

      this.dispatcher.fire('activate', null);

      this.logger.leaving(me);
    }

    /**
     * Deactivate the scroller (but do not destroy it).
     *
     * @fires NexusHoratio.nav.Scroller#deactivate
     */
    deactivate() {
      const me = this.deactivate.name;
      this.logger.entered(me);

      this.#mutationDispatcher.off('attributes', this.#attributesHandler);
      this.#mutationDispatcher.off('childList', this.#monitorConnectedness);
      this.#stopContainers();

      this.dispatcher.fire('deactivate', null);

      this.logger.leaving(me);
    }

    /** Mark instance as inactive and do any internal cleanup. */
    destroy() {
      const me = this.destroy.name;
      this.logger.entered(me);

      this.deactivate();
      this.item = null;
      this.#destroyed = true;

      this.logger.leaving(me);
    }

    static #defaults = Object.freeze({
      MAX_UID_LENGTH: 20,
      OBSERVE_ATTRIBUTES: false,
      WAIT_FOR_ITEM: 3000,
      WATCH_FOR_CLICKS: true,
    });

    /**
     * Scroller events.
     *
     * @const {NexusHoratio.base.Dispatcher~EventType[]}
     * NexusHoratio.nav.Scroller~eventTypes - Events used by this class.
     */
    static #eventTypes = [

      /**
       * The value of item has changed.
       *
       * @event NexusHoratio.nav.Scroller#change
       */
      'change',

      /**
       * Scrolling went past one end of the collection.  This is NOT an error
       * condition, but rather a design feature.
       *
       * @event NexusHoratio.nav.Scroller#out-of-range
       */
      'out-of-range',

      /**
       * This instance is being activated.
       *
       * @event NexusHoratio.nav.Scroller#activate
       */
      'activate',

      /**
       * This instance is being deactivated.
       *
       * @event NexusHoratio.nav.Scroller#deactivate
       */
      'deactivate',

      /**
       * Focus is changing to a different item.
       *
       * @event NexusHoratio.nav.Scroller#focus
       */
      'focus',

      /**
       * Focus has changed to a different item.
       *
       * @event NexusHoratio.nav.Scroller#focused
       */
      'focused',
    ];

    #autoActivate
    #base
    #classes
    #clickConfig
    #clickOptions = {capture: true};
    #containerItems
    #containerTimeout
    #containers = new Set();
    #containersMutationObserver
    #currentItem = null;
    #currentItemId = null;
    #destroyed = false;

    #dispatcher = new NH.base.Dispatcher(...Scroller.#eventTypes);

    #historicalIdToIndex = new Map();
    #logger
    #maxUidLength
    #mutationDispatcher = new NH.base.Dispatcher('attributes', 'childList');
    #name
    #observeAttributes
    #onClickElements = new Set();
    #selectors
    #snapToTop
    #uidCallback
    #waitForItemTimeout
    #watchForClicks

    /**
     * Currently removes `scrollerId` at the drop of a hat.
     *
     * XXX: This was originally intended to clear scrollerId before
     * duplications were detected.  But such detection happens inside {@link
     * NexusHoratio.nav.Scroller#getItems getItems}, so this does not help
     * with that.  Still, might be useful in cases where the uid depends on
     * attributes, even if duplicates are not involved.
     *
     * @method
     * @implements {NexusHoratio.base.Dispatcher~Handler}
     * @param {string} type - Event type.
     * @param {MutationRecords[]} records - Standard MutationRecords.
     */
    #attributesHandler = (type, records) => {
      const me = this.#attributesHandler.name;
      this.logger.entered(me, type, records.length);

      for (const item of this.#getItems()) {
        for (const record of records) {
          if (record.attributeName !== 'data-scroller-id') {
            if (item.contains(record.target)) {
              delete item.dataset.scrollerId;
              this.logger.log('reset item', item);
              break;
            }
          }
        }
      }

      this.logger.leaving(me);
    }

    /**
     * Determine if the item can be viewed.
     *
     * Often this used to see if the content is being loaded lazily and is not
     * ready yet.
     *
     * @method
     * @param {external:Element} item - The item to inspect.
     * @returns {boolean} Whether the item has viewable content.
     */
    #isItemViewable = (item) => {
      const me = this.#isItemViewable.name;
      this.logger.entered(me, item);

      const result = Boolean(item.clientHeight);

      this.logger.leaving(me, result);
      return result;
    }

    #startContainers = async () => {
      const me = this.#startContainers.name;
      this.logger.entered(me);

      this.#stopContainers();
      const found = await this.#waitForContainers();
      found.filter(x => x)
        .map(x => this.#containers.add(x));
      if (this.#base) {
        this.#containers.add(this.#base);
      }
      const observeOptions = {
        childList: true,
        subtree: true,
        attributes: this.#observeAttributes,
      };

      for (const container of this.#containers) {
        if (this.#watchForClicks) {
          this.#onClickElements.add(container);
          container.addEventListener('click',
            this.#onClick,
            this.#clickOptions);
        }
        this.logger.log('observing with', container, observeOptions);
        this.#containersMutationObserver.observe(container, observeOptions);
      }

      this.logger.leaving(me);
    }

    #stopContainers = () => {
      this.#containersMutationObserver.disconnect();
      for (const container of this.#onClickElements) {
        container.removeEventListener('click',
          this.#onClick,
          this.#clickOptions);
      }
      this.#onClickElements.clear();
      this.#containers.clear();
    }

    /**
     * If an item is clicked, switch to it.
     *
     * @method
     * @param {Event} evt - Standard `click` event.
     */
    #onClick = (evt) => {
      const me = this.#onClick.name;
      this.logger.entered(me, evt);

      for (const item of this.#getItems()) {
        if (item.contains(evt.target)) {
          this.logger.log('found:', item);
          if (item === this.item) {
            this.focus();
          } else {
            this.item = item;
          }
        }
      }

      this.logger.leaving(me);
    }

    /**
     * Return the computed height of an element.
     *
     * The usual `element.clientHeight` is too unpredictable.
     *
     * @method
     * @param {external:Element} element - Element to examine.
     * @returns {number} The height of the element.
     */
    #realHeight = (element) => {
      const me = this.#realHeight.name;
      this.logger.entered(me, element);

      const height = element.getBoundingClientRect?.().height;

      this.logger.leaving(me, height);
      return height;
    }

    /**
     * @method
     * @param {MutationRecord[]} records - Standard mutation records.
     */
    #containersMutationHandler = (records) => {
      const me = this.#containersMutationHandler.name;
      this.logger.entered(me, `records: ${records.length}`);

      const types = new NH.base.DefaultMap(Array);

      for (const record of records) {
        types.get(record.type)
          .push(record);
      }

      for (const [type, items] of types) {
        this.#mutationDispatcher.fire(type, items);
      }

      this.logger.leaving(me);
    }

    /**
     * Since the {@link NexusHoratio.nav.Scroller#item item} getter will try
     * to validate the current item (since it could have changed out from
     * under us), it too can update information.
     *
     * @method
     * @param {external:Element} val - Element to make current.
     * @fires NexusHoratio.nav.Scroller#change
     */
    #bottomHalf = (val) => {
      const me = this.#bottomHalf.name;
      this.logger.entered(me, val);

      this.#currentItem = val;
      this.#currentItemId = this.#uid(val);
      const idx = this.#getItems()
        .indexOf(val);
      this.#historicalIdToIndex.set(this.#currentItemId, idx);
      this.focus();
      this.dispatcher.fire('change', {});

      this.logger.leaving(me);
    }

    /**
     * Builds the list of elements using the registered CSS selectors.
     *
     * @method
     * @returns {external:Element[]} Items to scroll through.
     */
    #getItems = () => {
      const me = this.#getItems.name;
      this.logger.entered(me);

      // This needs to be ordered, so does not use #containers.
      const items = [];
      if (this.#base) {
        for (const selector of this.#selectors) {
          this.logger.log(`considering ${selector}`);
          items.push(...this.#base.querySelectorAll(selector));
        }
      } else {
        for (const {container, items: selector} of this.#containerItems) {
          this.logger.log(`considering ${container} with ${selector}`);
          const base = document.querySelector(container);
          if (base) {
            items.push(...base.querySelectorAll(selector));
          }
        }
      }
      const results = this.#postProcessItems(items);

      this.logger.leaving(me, results.length);
      return results;
    }

    /**
     * Log items and do any fixups on them.
     *
     * @method
     * @param {external:Element[]} items - Elements in the Scroller.
     * @returns {external:Element[]} Post processed items.
     */
    #postProcessItems = (items) => {
      const me = this.#postProcessItems.name;
      this.logger.starting(me, `count: ${items.length}`);

      const filtered = items.filter(this.#isItemViewable);

      const uids = new NH.base.DefaultMap(Array);
      for (const item of filtered) {
        this.logger.log('item:', item);
        const uid = this.#uid(item);
        uids.get(uid)
          .push(item);
      }
      for (const [uid, list] of uids.entries()) {
        if (list.length > NH.base.ONE_ITEM) {
          this.logger.log(`${list.length} duplicates with "${uid}"`);
          for (const item of list) {
            // Try again, maybe they can be de-duped this time.  The overall
            // experience seems to work better if the uid is recalculated
            // right away, but yeah, a bit of a hack.
            delete item.dataset.scrollerId;
            this.#uid(item);
          }
        }
      }

      this.logger.finished(me, `count: ${filtered.length}`);
      return filtered;
    }

    /**
     * Returns the uid for the current element.  Will use the registered
     * {@link NexusHoratio.nav.Scroller~How How.uidCallback} function for
     * this.
     *
     * @method
     * @param {external:Element} element - Element to identify.
     * @returns {string} Computed uid for element.
     */
    #uid = (element) => {
      const me = this.#uid.name;
      this.logger.entered(me, element);

      let uid = null;
      if (element) {
        if (!element.dataset.scrollerId) {
          element.dataset.scrollerId = this.#uidCallback(this, element);
        }
        uid = element.dataset.scrollerId;
      }

      this.logger.leaving(me, uid);
      return uid;
    }

    /**
     * Checks if the element is the current one.  Useful as a callback to
     * `Array.find`.
     *
     * @method
     * @param {external:Element} element - Element to check.
     * @returns {boolean} Whether or not element is the current one.
     */
    #matchItem = (element) => {
      const me = this.#matchItem.name;
      this.logger.entered(me);

      const res = this.#currentItemId === this.#uid(element);

      this.logger.leaving(me, res);
      return res;
    }

    /**
     * If necessary, scroll the bottom into view, then same for top.
     *
     * @method
     * @param {external:Element} item - The item to scroll into view.
     */
    #gentlyScrollIntoView = (item) => {
      const me = this.#gentlyScrollIntoView.name;
      this.logger.entered(me, item);

      let rect = item.getBoundingClientRect();

      const allowedBottom = document.documentElement.clientHeight;
      if (rect.bottom > allowedBottom) {
        this.logger.log('scrolling up onto page');
        item.scrollIntoView(false);
      }
      rect = item.getBoundingClientRect();
      if (rect.top < 0) {
        this.logger.log('scrolling down onto page');
        item.scrollIntoView(true);
      }
      item.scrollIntoView({block: 'nearest', inline: 'nearest'});

      this.logger.leaving(me);
    };

    /**
     * Scroll the current item into the view port.  Depending on the instance
     * configuration, this could snap to the top, snap to the bottom, or be a
     * no-op.
     *
     * @method
     */
    #scrollToCurrentItem = () => {
      const me = this.#scrollToCurrentItem.name;
      this.logger.entered(me, `snapToTop: ${this.#snapToTop}`);

      const item = this.item;

      if (item) {
        if (this.#snapToTop) {
          this.logger.log('snapping to top');
          item.scrollIntoView(true);
        } else {
          this.#gentlyScrollIntoView(item);
        }
      }

      this.logger.leaving(me);
    }

    /**
     * Jump to an item at one end of the collection.
     *
     * @method
     * @param {boolean} first - If true, the first item in the collection,
     * else, the last.
     */
    #jumpToEndItem = (first) => {
      const me = this.#jumpToEndItem.name;
      this.logger.entered(me, `first=${first}`);

      const items = this.#getItems();
      this.logger.log('length', items.length);
      if (items.length) {
        // eslint-disable-next-line no-extra-parens
        let idx = first ? 0 : (items.length - NH.base.ONE_ITEM);
        this.logger.log('idx', idx);
        let item = items[idx];
        this.logger.log('item', item);

        // Content of items is sometimes loaded lazily and can be detected by
        // having no innerText yet.  So start at the end and work our way up
        // to the last one loaded.
        if (!first) {
          while (!this.#isItemViewable(item)) {
            this.logger.log('skipping item', item);
            idx -= NH.base.ONE_ITEM;
            item = items[idx];
          }
        }
        this.item = item;
      }

      this.logger.leaving(me);
    }

    /**
     * Move forward or backwards in the collection by at least n.
     *
     * @method
     * @param {number} n - How many items to move and the intended direction.
     * @fires NexusHoratio.nav.Scroller#out-of-range
     */
    #scrollBy = (n) => {
      const me = this.#scrollBy.name;
      this.logger.entered(me, n);

      /**
       * Keep viewable items and the current one.
       *
       * The current item may not yet be viewable after a reload, but give it
       * a chance.
       *
       * @param {external:Element} item - Item to check.
       * @returns {boolean} Whether to keep or not.
       */
      const filterItem = (item) => {
        if (this.#isItemViewable(item)) {
          return true;
        }
        if (this.#uid(item) === this.#currentItemId) {
          return true;
        }
        return false;
      };

      const items = this.#getItems()
        .filter(item => filterItem(item));
      if (items.length) {
        let idx = items.findIndex(this.#matchItem);
        this.logger.log('initial idx', idx);
        idx += n;
        if (idx < NH.base.NOT_FOUND) {
          idx = items.length - NH.base.ONE_ITEM;
        }
        if (idx === NH.base.NOT_FOUND || idx >= items.length) {
          this.item = null;
          this.dispatcher.fire('out-of-range', null);
        } else {
          this.item = items[idx];
        }
      }

      this.logger.leaving(me);
    }

    /**
     * @method
     * @throws {external:Error} On many validation issues.
     */
    #validateInstance = () => {
      this.#validateWhat();
      this.#validateHow();
    }

    /**
     * @method
     * @throws {external:Error} On many validation issues.
     */
    #validateWhat = () => {  // eslint-disable-line max-statements
      let msg = '';
      const opts = {
        cause: {
          code: NH.base.Code.INVALID_ARGUMENT,
          scroller: this.name,
        },
      };

      if (!this.#name) {
        msg = 'Scroller requires a name';
        opts.cause.reason = 'MissingName';
        throw new Error(msg, opts);
      }

      if (this.#base && this.#containerItems.length) {
        msg = 'Cannot have both base AND containerItems';
        opts.cause.reason = 'BaseAndContainerItems';
        throw new Error(msg, opts);
      }

      if (!this.#base && !this.#containerItems.length) {
        msg = 'Needs either base OR containerItems';
        opts.cause.reason = 'BaseOrContainerItems';
        throw new Error(msg, opts);
      }

      if (this.#base && !(this.#base instanceof Element)) {
        msg = 'Supplied base is not an element';
        opts.cause.reason = 'BaseNotAnElement';
        throw new Error(msg, opts);
      }

      if (this.#base && !this.#selectors) {
        msg = 'Base was supplied without selectors';
        opts.cause.reason = 'BaseWithoutSelectors';
        throw new Error(msg, opts);
      }

      if (this.#selectors && !this.#base) {
        msg = 'Selectors were supplied without a base';
        opts.cause.reason = 'SelectorsWithoutBase';
        throw new Error(msg, opts);
      }
    }

    /**
     * @method
     * @throws {external:Error} On many validation issues.
     */
    #validateHow = () => {  // eslint-disable-line max-statements
      let msg = '';
      const opts = {
        cause: {
          code: NH.base.Code.INVALID_ARGUMENT,
          scroller: this.name,
        },
      };

      if (!this.#uidCallback) {
        msg = 'No uidCallback defined';
        opts.cause.reason = 'UidCallbackMissing';
        throw new Error(msg, opts);
      }

      if (!(this.#uidCallback instanceof Function)) {
        msg = 'The uidCallback is not a function';
        opts.cause.reason = 'UidCallbackNotFunction';
        throw new Error(msg, opts);
      }

      if (this.#clickConfig.selectorArray && this.#clickConfig.finder) {
        msg = 'Cannot have both a selectorArray AND a finder function';
        opts.cause.reason = 'ClickConfigSelectorArrayAndFinderFunction';
        throw new Error(msg, opts);
      }

      if (this.#clickConfig.selectorArray) {
        if (!(this.#clickConfig.selectorArray instanceof Array)) {
          msg = 'The selectorArray is not an Array';
          opts.cause.reason = 'ClickConfigSelectorNotArray';
          throw new Error(msg, opts);
        }
      }

      if (this.#clickConfig.finder) {
        if (!(this.#clickConfig.finder instanceof Function)) {
          msg = 'The finder property should be a function';
          opts.cause.reason = 'ClickConfigFinderNotFunction';
          throw new Error(msg, opts);
        }

        if (this.#clickConfig.finder.length !== NH.base.ONE_ITEM) {
          msg = 'The finder function should take exactly one argument,' +
            ` currently takes ${this.#clickConfig.finder.length}`;
          opts.cause.reason = 'ClickConfigFinderWrongSignature';
          throw new Error(msg, opts);
        }
      }
    }

    /**
     * The page may still be loading, so wait for things to settle.
     *
     * @method
     * @returns {Promise<external:Element[]>} All the new base elements.
     */
    #waitForContainers = () => {
      const me = this.#waitForContainers.name;
      this.logger.entered(me);

      const results = [];

      /**
       * Simply eats any exception thrown by the Promise.
       * @param {Promise} prom - Whatever Promise we are wrapping.
       * @param {string} note - Put into log on error.
       * @returns {Promise} Resolved promise.
       */
      const wrapper = async (prom, note) => {
        this.logger.log('wrapping', prom);
        try {
          return await prom;
        } catch (e) {
          this.logger.log(`wrapper ate error (${note}):`, e);
          return Promise.resolve();
        }
      };

      for (const {container} of this.#containerItems) {
        this.logger.log('container', container);
        results.push(wrapper(NH.web.waitForSelector(container,
          this.#containerTimeout), container));
      }

      this.logger.leaving(me, results);
      return Promise.all(results);
    }

    /**
     * Watches for the current item, if there was one, to return.
     *
     * Used during activation to deal with items still being loaded.
     *
     * @method
     * @returns {Promise<string>} Wait on this to finish with something
     * useful to log.
     */
    #currentItemWatcher = () => {  // eslint-disable-line max-lines-per-function
      const me = this.#currentItemWatcher.name;
      this.logger.entered(me);

      const uid = this.itemUid;
      let prom = Promise.resolve('nothing to watch for');

      if (uid) {
        this.logger.log('reactivation with', uid);
        let timeoutID = null;

        prom = new Promise((resolve) => {

          /** Dispatcher monitor. */
          const moCallback = () => {
            const monMe = moCallback.name;
            this.logger.entered(monMe);

            if (this.gotoUid(uid)) {
              this.logger.log('item is present', this.item);
              if (this.#isItemViewable(this.item)) {
                this.logger.log('and viewable');
                this.#mutationDispatcher.off('childList', moCallback);
                clearTimeout(timeoutID);
                resolve('looks good');
              } else {
                this.logger.log('but not yet viewable');
              }
            } else {
              this.logger.log('not ready yet');
            }

            this.logger.leaving(monMe);
          };

          /** Standard setTimeout callback. */
          const toCallback = () => {
            this.#mutationDispatcher.off('childList', moCallback);
            this.logger.log('one last try...');
            moCallback();
            resolve('we tried...');
          };

          this.#mutationDispatcher.on('childList', moCallback);
          timeoutID = setTimeout(toCallback, this.#waitForItemTimeout);
          moCallback();
        });
      }

      this.logger.leaving(me, prom);
      return prom;
    }

    #monitorConnectedness = () => {
      const me = this.#monitorConnectedness.name;
      this.logger.entered(me, this.#currentItem);

      if (this.#currentItem && !this.#currentItem.isConnected) {
        this.goto(this.#currentItem);
        this.logger.log('current item reconnected');
      }

      this.logger.leaving(me);
    }

    /* eslint-disable require-jsdoc */
    static ScrollerTestCase = class extends NH.xunit.TestCase {

      testClassIsFrozen() {
        this.assertRaisesRegExp(TypeError, /is not extensible/u, () => {
          Scroller.#defaults.FIELD = 'field';
        });
      }

      static { this.register(); }

    }
    /* eslint-enable */

  }

  /* eslint-disable max-lines-per-function */
  /* eslint-disable no-empty-function */
  /* eslint-disable no-new */
  /* eslint-disable no-undefined */
  /* eslint-disable no-unused-vars */
  /* eslint-disable require-jsdoc */
  class ScrollerTestCase extends NH.xunit.TestCase {

    testNeedsName() {
      const what = {
      };
      const how = {
      };

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'MissingName',
          scroller: undefined,
        },
        () => {
          new Scroller(what, how);
        },
        'undefined'
      );

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'MissingName',
          scroller: '',
        },
        () => {
          what.name = '';
          new Scroller(what, how);
        },
        'empty string'
      );
    }

    testNeedsBaseOrContainerItems() {
      const what = {
        name: this.id,
      };
      const how = {
      };

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'BaseOrContainerItems',
          scroller: this.id,
        },
        () => {
          new Scroller(what, how);
        }
      );
    }

    testNotBaseAndContainerItems() {
      const what = {
        name: this.id,
        base: document.body,
        containerItems: [{}],
      };
      const how = {
      };

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'BaseAndContainerItems',
          scroller: this.id,
        },
        () => {
          new Scroller(what, how);
        }
      );
    }

    testBaseIsElement() {
      const what = {
        name: this.id,
        base: document,
      };
      const how = {
      };

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'BaseNotAnElement',
          scroller: this.id,
        },
        () => {
          new Scroller(what, how);
        }
      );
    }

    testBaseNeedsSelector() {
      const what = {
        name: this.id,
        base: document.body,
      };
      const how = {
      };
      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'BaseWithoutSelectors',
          scroller: this.id,
        },
        () => {
          new Scroller(what, how);
        }
      );

    }

    testSelectorNeedsBase() {
      const what = {
        name: this.id,
        selectors: [],
        containerItems: [{}],
      };
      const how = {
      };

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'SelectorsWithoutBase',
          scroller: this.id,
        },
        () => {
          new Scroller(what, how);
        }
      );
    }

    testBaseWithSelectorIsFine() {
      const what = {
        name: this.id,
        base: document.body,
        selectors: [],
      };
      const how = {
        uidCallback: () => {},
      };

      this.assertNoRaises(() => {
        new Scroller(what, how);
      }, 'everything is in place');
    }

    testValidUidCallback() {
      const what = {
        name: this.id,
        base: document.body,
        selectors: [],
      };
      const how = {
      };

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'UidCallbackMissing',
          scroller: this.id,
        },
        () => {
          new Scroller(what, how);
        },
        'missing',
      );

      how.uidCallback = {};

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'UidCallbackNotFunction',
          scroller: this.id,
        },
        () => {
          new Scroller(what, how);
        },
        'not function',
      );

      how.uidCallback = () => {};

      this.assertNoRaises(() => {
        new Scroller(what, how);
      }, 'finally, good');
    }

    testValidClickConfig() {
      const what = {
        name: this.id,
        containerItems: [{}],
      };
      const how = {
        uidCallback: () => {},
      };

      this.assertNoRaises(() => {
        new Scroller(what, how);
      }, 'no clickConfig is fine');

      how.clickConfig = {};

      this.assertNoRaises(() => {
        new Scroller(what, how);
      }, 'empty clickConfig is fine');

      // Existence is what matters for this check, not correctness
      how.clickConfig = {
        selectorArray: {},
        finder: {},
      };

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'ClickConfigSelectorArrayAndFinderFunction',
          scroller: this.id,
        },
        () => {
          new Scroller(what, how);
        },
        'both selectorArray and finder'
      );

      how.clickConfig = {selectorArray: 'string'};

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'ClickConfigSelectorNotArray',
          scroller: this.id,
        },
        () => {
          new Scroller(what, how);
        },
        'non-array'
      );

      how.clickConfig = {
        finder: {},
      };

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'ClickConfigFinderNotFunction',
          scroller: this.id,
        },
        () => {
          new Scroller(what, how);
        },
        'non-function'
      );

      how.clickConfig = {
        finder: (element) => {},
      };

      this.assertNoRaises(() => {
        new Scroller(what, how);
      }, 'single argument element finder is fine');

      how.clickConfig.finder = () => {};

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'ClickConfigFinderWrongSignature',
          scroller: this.id,
        },
        () => {
          new Scroller(what, how);
        },
        'zero argument element finder is not fine'
      );

      how.clickConfig.finder = (a, b, c) => {};

      this.assertRaisesCause(
        Error,
        {
          code: NH.base.Code.INVALID_ARGUMENT,
          reason: 'ClickConfigFinderWrongSignature',
          scroller: this.id,
        },
        () => {
          new Scroller(what, how);
        },
        'too many arguments element finder is not fine'
      );
    }

    static { this.register(); }

  }
  /* eslint-enable */

  /**
   * Manage a {NexusHoratio.nav.Scroller Scroller} as a {@link
   * NexusHoratio.base.Service Service}.
   *
   * @memberof NexusHoratio.nav
   * @extends NexusHoratio.base.Service
   */
  class ScrollerService extends NH.base.Service {

    /**
     * @param {string} instanceName - Custom portion of this instance.
     */
    constructor(instanceName) {
      super(instanceName);
      this.on('activate', this.#onActivate)
        .on('deactivate', this.#onDeactivate)
        .allowReactivation(false)
        .setScroller();
    }

    /**
     * Sets the {@link Scroller} to manage with this service.
     *
     * If not value is passed, any existing instance will be removed.
     *
     * @param {NexusHoratio.nav.Scroller} [scroller] - The instance to manage.
     * @returns {NexusHoratio.nav.ScrollerService} This instance, for
     * chaining.
     */
    setScroller(scroller = null) {
      this.#scroller = scroller;
      return this;
    }

    #scroller

    #onActivate = () => {
      this.#scroller?.activate();
    }

    #onDeactivate = () => {
      this.#scroller?.deactivate();
    }

  }
  return {
    version: version,
    Scroller: Scroller,
    ScrollerService: ScrollerService,
  };

}());
