// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @noframes
// @version     5.17
// @author      Mike Castle
// @description Minor enhancements to LinkedIn. Mostly just hotkeys.
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @downloadURL https://github.com/nexushoratio/userscripts/raw/main/linkedin-tool.user.js
// @supportURL  https://github.com/nexushoratio/userscripts/blob/main/linkedin-tool.md
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// @require     https://greasyfork.org/scripts/478188-nh-xunit/code/NH_xunit.js?version=1271279
// @require     https://greasyfork.org/scripts/477290-nh-base/code/NH_base.js?version=1271281
// @require     https://greasyfork.org/scripts/478349-nh-userscript/code/NH_userscript.js?version=1271282
// @require     https://greasyfork.org/scripts/478440-nh-web/code/NH_web.js?version=1271425
// @grant       window.onurlchange
// ==/UserScript==

/* global VM */

// eslint-disable-next-line max-lines-per-function
(async () => {
  'use strict';

  const NH = window.NexusHoratio.base.ensure([
    {name: 'xunit', minVersion: 3},
    {name: 'base', minVersion: 16},
    {name: 'userscript', minVersion: 1},
    {name: 'web'},
  ]);

  // TODO(#170): Placeholder comment to allow easy patching of test code.

  // TODO(#145): The if test is just here while developing.
  if (NH.xunit.testing.enabled) {
    // eslint-disable-next-line require-atomic-updates
    NH.base.Logger.configs = await GM.getValue('Logger');
  } else {
    NH.base.Logger.config('Default').enabled = true;
  }

  const log = new NH.base.Logger('Default');

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
   * const entry = tabby.tabs.get(contactTabDefinition.name);
   * entry.classList.add('random-css');
   * entry.innerHTML += '<p>More contact info.</p>';
   */
  class TabbedUI {

    /**
     * @param {string} name - Used to distinguish HTML elements and CSS
     * classes.
     */
    constructor(name) {
      this.#log = new NH.base.Logger(`TabbedUI ${name}`);
      this.#name = name;
      this.#idName = NH.base.safeId(name);
      this.#id = NH.base.uuId(this.#idName);
      this.#container = document.createElement('section');
      this.#container.id = `${this.#id}-container`;
      this.#installControls();
      this.#container.append(this.#nav);
      this.#installStyle();
      this.#log.log(`${this.#name} constructed`);
    }

    /** @type {Element} */
    get container() {
      return this.#container;
    }

    /**
     * @typedef {object} TabEntry
     * @property {string} name - Tab name.
     * @property {Element} label - Tab label, so CSS can be applied.
     * @property {Element} panel - Tab panel, so content can be updated.
     */

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
     * A string of HTML or a prebuilt Element.
     * @typedef {(string|Element)} TabContent
     */

    /**
     * @typedef {object} TabDefinition
     * @property {string} name - Tab name.
     * @property {TabContent} content - Initial content.
     */

    /** @param {TabDefinition} tab - The new tab. */
    addTab(tab) {
      const me = 'addTab';
      this.#log.entered(me, tab);
      const {
        name,
        content,
      } = tab;
      const idName = NH.base.safeId(name);
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

    /** Activate the next tab. */
    next() {
      const me = 'next';
      this.#log.entered(me);
      this.#switchTab(1);
      this.#log.leaving(me);
    }

    /** Activate the previous tab. */
    prev() {
      const me = 'prev';
      this.#log.entered(me);
      this.#switchTab(-1);
      this.#log.leaving(me);
    }

    /** @param {string} name - Name of the tab to activate. */
    goto(name) {
      const me = 'goto';
      this.#log.entered(me, name);
      const controls = this.#getTabControls();
      const control = controls.find(item => item.dataset.tabbedName === name);
      control.click();
      this.#log.leaving(me);
    }

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

    /** Installs basic CSS styles for the UI. */
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
      if (idx === NH.base.NOT_FOUND) {
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
     * @param {TabContent} content - Initial content.
     * @returns {Element} - Panel portion of the tab.
     */
    #createPanel = (name, idName, content) => {
      const me = 'createPanel';
      this.#log.entered(me);
      const panel = document.createElement('div');
      panel.dataset.tabbedId = `${this.#idName}-panel-${idName}`;
      panel.dataset.tabbedName = name;
      panel.classList.add(`${this.#idName}-panel`);
      if (content instanceof Element) {
        panel.append(content);
      } else {
        panel.innerHTML = content;
      }
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

  }

  /**
   * An ordered collection of HTMLElements for a user to continuously scroll
   * through.
   *
   * The dispatcher can be used the handle the following events:
   * - 'out-of-range' - Scrolling went past one end of the collection.  This
       is NOT an error condition, but rather a design feature.
   * - 'change' - The value of item has changed.
   * - 'activate' - The Scroller was activated.
   * - 'deactivate' - The Scroller was deactivated.
   */
  class Scroller {

    /**
     * Function that generates a, preferably, reproducible unique identifier
     * for an Element.
     * @callback uidCallback
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */

    /**
     * Contains CSS selectors to first find a base element, then items that it
     * contains.
     * @typedef {object} ContainerItemsSelector
     * @property {string} container - CSS selector to find the container
     * element.
     * @property {string} items - CSS selector to find the items inside the
     * container.
     */

    /**
     * There are two ways to describe what elements go into a Scroller:
     * 1. An explicit container (base) element and selectors stemming from it.
     * 2. An array of ContainerItemsSelector that can allow for multiple
     *   containers with items.  This approach will also allow the Scroller to
     *   automatically wait for all container elements to exist during
     *   activation.
     * @typedef {object} What
     * @property {string} name - Name for this scroller, used for logging.
     * @property {Element} base - The container to use as a base for selecting
     * elements.
     * @property {string[]} selectors - Array of CSS selectors to find
     * elements to collect, calling base.querySelectorAll().
     * @property {ContainerItemsSelector[]} containerItems - Array of
     * ContainerItemsSelectors.
     */

    /**
     * @typedef {object} How
     * @property {uidCallback} uidCallback - Callback to generate a uid.
     * @property {string[]} [classes=[]] - Array of CSS classes to add/remove
     * from an element as it becomes current.
     * @property {boolean} [handleClicks=true] - Whether the scroller should
     * watch for clicks and if one is inside an item, select it.
     * @property {boolean} [autoActivate=false] - Whether to call the activate
     * method at the end of construction.
     * @property {boolean} [snapToTop=false] - Whether items should snap to
     * the top of the window when coming into view.
     * @property {number} [topMarginPixels=0] - Used to determine if scrolling
     * should happen when {snapToTop} is false.
     * @property {number} [bottomMarginPixels=0] - Used to determin if
     * scrolling should happen when {snapToTop} is false.
     * @property {string} [topMarginCSS='0'] - CSS applied to
     * `scrollMarginTop`.
     * @property {string} [bottomMarginCSS='0'] - CSS applied to
     * `scrollMarginBottom`.
     */

    /**
     * @param {What} what - What we want to scroll.
     * @param {How} how - How we want to scroll.
     * @throws {Scroller.Error} - On many construction problems.
     */
    constructor(what, how) {
      ({
        name: this.#name = 'Unnamed scroller',
        base: this.#base,
        selectors: this.#selectors,
        containerItems: this.#containerItems = [],
      } = what);
      ({
        uidCallback: this.#uidCallback,
        classes: this.#classes = [],
        handleClicks: this.#handleClicks = true,
        autoActivate: this.#autoActivate = false,
        snapToTop: this.#snapToTop = false,
        topMarginPixels: this.#topMarginPixels = 0,
        bottomMarginPixels: this.#bottomMarginPixels = 0,
        topMarginCSS: this.#topMarginCSS = '0',
        bottomMarginCSS: this.#bottomMarginCSS = '0',
      } = how);

      this.#validateInstance();

      this.#mutationObserver = new MutationObserver(this.#mutationHandler);

      this.#logger = new NH.base.Logger(`{${this.#name}}`);
      this.logger.log('Scroller constructed', this);

      if (this.#autoActivate) {
        this.activate();
      }
    }

    static Error = class extends Error {

      /** @inheritdoc */
      constructor(...rest) {
        super(...rest);
        this.name = this.constructor.name;
      }

    };

    /** @type {NH.base.Dispatcher} */
    get dispatcher() {
      return this.#dispatcher;
    }

    /** @type {string} - Current item's uid. */
    get itemUid() {
      return this.#currentItemId;
    }

    /** @type {Element} - Represents the current item. */
    get item() {
      const me = 'get item';
      this.logger.entered(me);
      if (this.#destroyed) {
        const msg = `Tried to work with destroyed ${Scroller.name} ` +
              `on ${this.#base}`;
        this.logger.log(msg);
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
      this.logger.leaving(me, item);
      return item;
    }

    /** @param {Element} val - Set the current item. */
    set item(val) {
      const me = 'set item';
      this.logger.entered(me, val);
      this.dull();
      this.#bottomHalf(val);
      this.logger.leaving(me);
    }

    /** @type {NH.base.Logger} */
    get logger() {
      return this.#logger;
    }

    /** Move to the next item in the collection. */
    next() {
      this.#scrollBy(1);
    }

    /** Move to the previous item in the collection. */
    prev() {
      this.#scrollBy(-1);
    }

    /** Jump to the first item in the collection. */
    first() {
      this.#jumpToEndItem(true);
    }

    /** Jump to last item in the collection. */
    last() {
      this.#jumpToEndItem(false);
    }

    /**
     * Move to a specific item if possible.
     * @param {Element} item - Item to go to.
     */
    goto(item) {
      this.item = item;
    }

    /**
     * Move to a specific item if possible, by uid.
     * @param {string} uid - The uid of a specific item.
     * @returns {boolean} - Was able to goto the item.
     */
    gotoUid(uid) {
      const me = 'goto';
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

    /** Bring current item back into view. */
    show() {
      this.#scrollToCurrentItem();
    }

    /**
     * Activate the scroller.
     * @fires 'out-of-range'
     */
    async activate() {
      const me = 'activate';
      this.logger.entered(me);

      const bases = new Set(await this.#waitForBases());
      if (this.#base) {
        bases.add(this.#base);
      }

      for (const base of bases) {
        if (this.#handleClicks) {
          this.#onClickElements.add(base);
          base.addEventListener('click', this.#onClick);
        }
        this.#mutationObserver.observe(base, {childList: true});
      }
      this.dispatcher.fire('activate', null);

      this.logger.leaving(me);
    }

    /**
     * Deactivate the scroller (but do not destroy it).
     * @fires 'out-of-range'
     */
    deactivate() {
      this.#mutationObserver.disconnect();
      for (const base of this.#onClickElements) {
        base.removeEventListener('click', this.#onClick);
      }
      this.#onClickElements.clear();
      this.dispatcher.fire('deactivate', null);
    }

    /** Mark instance as inactive and do any internal cleanup. */
    destroy() {
      const me = 'destroy';
      this.logger.entered(me);
      this.deactivate();
      this.item = null;
      this.#destroyed = true;
      this.logger.leaving(me);
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

    #autoActivate
    #base
    #bottomMarginCSS
    #bottomMarginPixels
    #classes
    #containerItems
    #currentItemId = null;
    #destroyed = false;

    #dispatcher = new NH.base.Dispatcher(
      'change', 'out-of-range', 'activate', 'deactivate'
    );

    #handleClicks
    #historicalIdToIndex = new Map();
    #logger
    #mutationObserver
    #name
    #onClickElements = new Set();
    #selectors
    #snapToTop
    #stackTrace
    #topMarginCSS
    #topMarginPixels
    #uidCallback

    /**
     * If an item is clicked, switch to it.
     * @param {Event} evt - Standard 'click' event.
     */
    #onClick = (evt) => {
      const me = 'onClick';
      this.logger.entered(me, evt);
      for (const item of this.#getItems()) {
        if (item.contains(evt.target)) {
          this.logger.log('found:', item);
          if (item !== this.item) {
            this.item = item;
          }
        }
      }
      this.logger.leaving(me);
    }

    /** @param {MutationRecord[]} records - Standard mutation records. */
    #mutationHandler = (records) => {
      const me = 'mutationHandler';
      this.logger.entered(
        me, `records: ${records.length} type: ${records[0].type}`
      );
      for (const record of records) {
        if (record.type === 'childList') {
          this.logger.log('childList record');
        } else if (record.type === 'attributes') {
          this.logger.log('attribute records');
        }
      }
      this.logger.leaving(me);
    }

    /**
     * Since the getter will try to validate the current item (since it could
     * have changed out from under us), it too can update information.
     * @param {Element} val - Element to make current.
     */
    #bottomHalf = (val) => {
      const me = 'bottomHalf';
      this.logger.entered(me, val);
      this.#currentItemId = this.#uid(val);
      const idx = this.#getItems().indexOf(val);
      this.#historicalIdToIndex.set(this.#currentItemId, idx);
      this.shine();
      this.#scrollToCurrentItem();
      this.dispatcher.fire('change', {});
      this.logger.leaving(me);
    }

    /**
     * Builds the list of elements using the registered CSS selectors.
     * @returns {Elements[]} - Items to scroll through.
     */
    #getItems = () => {
      const me = 'getItems';
      this.logger.entered(me);
      const items = [];
      if (this.#base) {
        for (const selector of this.#selectors) {
          this.logger.log(`considering ${selector}`);
          items.push(...this.#base.querySelectorAll(selector));
        }
      } else {
        for (const {container, items: selector} of this.#containerItems) {
          const base = document.querySelector(container);
          items.push(...base.querySelectorAll(selector));
        }
      }
      this.logger.starting('items');
      for (const item of items) {
        this.logger.log('item:', item);
      }
      this.logger.finished('items');

      this.logger.leaving(me, `${items.length} items`);
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
      this.logger.entered(me, element);
      let uid = null;
      if (element) {
        if (!element.dataset.scrollerId) {
          element.dataset.scrollerId = this.#uidCallback(element);
        }
        uid = element.dataset.scrollerId;
      }
      this.logger.leaving(me, uid);
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
      this.logger.entered(me);
      const res = this.#currentItemId === this.#uid(element);
      this.logger.leaving(me, res);
      return res;
    }

    /**
     * Scroll the current item into the view port.  Depending on the instance
     * configuration, this could snap to the top, snap to the bottom, or be a
     * no-op.
     */
    #scrollToCurrentItem = () => {
      const me = 'scrollToCurrentItem';
      this.logger.entered(me, `snaptoTop: ${this.#snapToTop}`);
      const {item} = this;
      if (item) {
        item.style.scrollMarginTop = this.#topMarginCSS;
        if (this.#snapToTop) {
          this.logger.log('snapping to top');
          item.scrollIntoView(true);
        } else {
          this.logger.log('not snapping to top');
          item.style.scrollMarginBottom = this.#bottomMarginCSS;
          const rect = item.getBoundingClientRect();
          // If both scrolling happens, it means the item is too tall to fit
          // on the page, so the top is preferred.
          const allowedBottom = document.documentElement.clientHeight -
                this.#bottomMarginPixels;
          if (rect.bottom > allowedBottom) {
            this.logger.log('scrolling up onto page');
            item.scrollIntoView(false);
          }
          if (rect.top < this.#topMarginPixels) {
            this.logger.log('scrolling down onto page');
            item.scrollIntoView(true);
          }
          // XXX: The following was added to support horizontal scrolling in
          // carousels.  Nothing seemed to break.  TODO(#132): Did find a side
          // effect though: it can cause an item being *left* to shift up if
          // the scrollMarginBottom has been set.
          item.scrollIntoView({block: 'nearest', inline: 'nearest'});
        }
      }
      this.logger.leaving(me);
    }

    /**
     * Jump an item on an end of the collection.
     * @param {boolean} first - If true, the first item in the collection,
     * else, the last.
     */
    #jumpToEndItem = (first) => {
      const me = 'jumpToEndItem';
      this.logger.entered(me, `first=${first}`);
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
            this.logger.log('skipping item', item);
            idx -= 1;
            item = items[idx];
          }
        }
        this.item = item;
      }
      this.logger.leaving(me);
    }

    /**
     * Move forward or backwards in the collection by at least n.
     * @param {number} n - How many items to move and the intended direction.
     * @fires 'out-of-range'
     */
    #scrollBy = (n) => {  // eslint-disable-line max-statements
      const me = 'scrollBy';
      this.logger.entered(me, n);
      // Reset in case item was heavily modified
      this.item = this.item;

      const items = this.#getItems();
      if (items.length) {
        let idx = items.findIndex(this.#matchItem);
        this.logger.log('initial idx', idx);
        idx += n;
        if (idx < NH.base.NOT_FOUND) {
          idx = items.length - 1;
        }
        if (idx === NH.base.NOT_FOUND || idx >= items.length) {
          this.item = null;
          this.dispatcher.fire('out-of-range', null);
        } else {
          // Skip over empty items
          let item = items[idx];
          while (!Scroller.#isItemViewable(item)) {
            this.logger.log('skipping item', item);
            idx += n;
            item = items[idx];
          }
          this.logger.log('final idx', idx);
          this.item = item;
        }
      }
      this.logger.leaving(me);
    }

    /** @throws {Scroller.Error} - On many validation issues. */
    #validateInstance = () => {

      if (this.#base && this.#containerItems.length) {
        throw new Scroller.Error(
          `Cannot have both base AND containerItems: ${this.#name} has both`
        );
      }

      if (!this.#base && !this.#containerItems.length) {
        throw new Scroller.Error(
          `Needs either base OR containerItems: ${this.#name} has neither`
        );
      }

      if (this.#base && !(this.#base instanceof Element)) {
        throw new Scroller.Error(
          `Not an element: base ${this.#base} given for ${this.#name}`
        );
      }

      if (this.#base && !this.#selectors) {
        throw new Scroller.Error(
          `No selectors: ${this.#name} is missing selectors`
        );
      }

      if (this.#selectors && !this.#base) {
        throw new Scroller.Error(
          `No base: ${this.#name} is using selectors and so needs a base`
        );
      }

    }

    /**
     * The page may still be loading, so wait for many things to settle.
     * @returns {Promise<Element[]>} - All the new base elements.
     */
    #waitForBases = () => {
      const me = 'waitForBases';
      this.logger.entered(me);

      const results = [];

      for (const {container} of this.#containerItems) {
        results.push(NH.web.waitForSelector(container, 0));
      }

      this.logger.leaving(me, results);
      return Promise.all(results);
    }

  }

  /* eslint-disable max-lines-per-function */
  /* eslint-disable no-new */
  /** Test case. */
  function testScroller() {
    const tests = new Map();

    tests.set('needsBaseOrContainerItems', {test: () => {
      const what = {
        name: 'needsBaseOrContainerItems',
      };
      const how = {
      };
      try {
        new Scroller(what, how);
      } catch (e) {
        if (e instanceof Scroller.Error &&
            e.message.includes('Needs either base OR containerItems:')) {
          return 'passed';
        }
        return 'caught-but-wrong-error';
      }
      return 'failed';
    },
    expected: 'passed'});

    tests.set('notBaseAndContainerItems', {test: () => {
      const what = {
        name: 'needsBaseAndContainerItems',
        base: document.body,
        containerItems: [{}],
      };
      const how = {
      };
      try {
        new Scroller(what, how);
      } catch (e) {
        if (e instanceof Scroller.Error &&
            e.message.includes('Cannot have both base AND containerItems:')) {
          return 'passed';
        }
        return 'caught-but-wrong-error';
      }
      return 'failed';
    },
    expected: 'passed'});

    tests.set('baseIsElement', {test: () => {
      const what = {
        name: 'baseIsElement',
        base: document,
      };
      const how = {
      };
      try {
        new Scroller(what, how);
      } catch (e) {
        if (e instanceof Scroller.Error &&
            e.message.includes('Not an element:')) {
          return 'passed';
        }
        return 'caught-but-wrong-error';
      }
      return 'failed';
    },
    expected: 'passed'});

    tests.set('baseNeedsSelector', {test: () => {
      const what = {
        name: 'baseNeedsSelector',
        base: document.body,
      };
      const how = {
      };
      try {
        new Scroller(what, how);
      } catch (e) {
        if (e instanceof Scroller.Error &&
            e.message.includes('No selectors:')) {
          return 'passed';
        }
        return 'caught-but-wrong-error';
      }
      return 'failed';
    },
    expected: 'passed'});

    tests.set('selectorNeedsBase', {test: () => {
      const what = {
        name: 'selectorNeedsBase',
        selectors: [],
        containerItems: [{}],
      };
      const how = {
      };
      try {
        new Scroller(what, how);
      } catch (e) {
        if (e instanceof Scroller.Error && e.message.includes('No base:')) {
          return 'passed';
        }
        return 'caught-but-wrong-error';
      }
      return 'failed';
    },
    expected: 'passed'});

    tests.set('baseWithSelectorsIsFine', {test: () => {
      const what = {
        name: 'baseWithSelectorsIsFine',
        base: document.body,
        selectors: [],
      };
      const how = {
      };
      try {
        new Scroller(what, how);
      } catch (e) {
        return 'failed';
      }
      return 'passed';
    },
    expected: 'passed'});

    for (const [name, {test, expected}] of tests) {
      const actual = test();
      const passed = actual === expected;
      const msg = `t:${name} e:${expected} a:${actual} p:${passed}`;
      NH.xunit.testing.log.log(msg);
      if (!passed) {
        throw new Error(msg);
      }
    }

  }
  /* eslint-enable */

  NH.xunit.testing.funcs.push(testScroller);

  /**
   * This class exists solely to avoid some `no-use-before-define` linter
   * issues.
   */
  class LinkedInGlobals {

    /** @type {string} - LinkedIn's common aside used in many layouts. */
    static get asideSelector() {
      return this.#asideSelector;
    }

    /** @type {string} - LinkedIn's common sidebar used in many layouts. */
    static get sidebarSelector() {
      return this.#sidebarSelector;
    }

    /** @type {string} - The height of the navbar as CSS string. */
    get navBarHeightCSS() {
      return `${this.#navBarHeightPixels}px`;
    }

    /** @type {number} - The height of the navbar in pixels. */
    get navBarHeightPixels() {
      return this.#navBarHeightPixels;
    }

    /** @param {number} val - Set height of the navbar in pixels. */
    set navBarHeightPixels(val) {
      this.#navBarHeightPixels = val;
    }

    /** Scroll common sidebar into view and move focus to it. */
    focusOnSidebar = () => {
      const sidebar = document.querySelector(LinkedInGlobals.sidebarSelector);
      if (sidebar) {
        sidebar.style.scrollMarginTop = this.navBarHeightCSS;
        sidebar.scrollIntoView();
        focusOnElement(sidebar);
      }
    }

    /**
     * Scroll common aside (right-hand sidebar) into view and move focus to
     * it.
     */
    focusOnAside = () => {
      const aside = document.querySelector(LinkedInGlobals.asideSelector);
      if (aside) {
        aside.style.scrollMarginTop = this.navBarHeightCSS;
        aside.scrollIntoView();
        focusOnElement(aside);
      }
    }

    /**
     * Create a Greasy Fork project URL.
     * @param {string} path - Portion of the URL.
     * @returns {string} - Full URL.
     */
    gfUrl = (path) => {
      const base = 'https://greasyfork.org/en/scripts/472097-linkedin-tool';
      const url = `${base}/${path}`;
      return url;
    }

    /**
     * Create a GitHub project URL.
     * @param {string} path - Portion of the URL.
     * @returns {string} - Full URL.
     */
    ghUrl = (path) => {
      const base = 'https://github.com/nexushoratio/userscripts';
      const url = `${base}/${path}`;
      return url;
    }

    static #asideSelector = 'aside.scaffold-layout__aside';
    static #sidebarSelector = 'div.scaffold-layout__sidebar';

    #navBarHeightPixels = 0;

  }

  /** Base class for other rendering widgets. */
  class Widget {

    /**
     * @param {string} name - Name for this instance.
     * @param {string} element - Type of element to use for the container.
     */
    constructor(name, element) {
      this.#name = `${this.constructor.name} ${name}`;
      this.#id = NH.base.uuId(NH.base.safeId(this.name));
      this.#container = document.createElement(element);
      this.#container.id = `${this.id}-container`;
      this.#logger = new NH.base.Logger(`${this.constructor.name}`);
    }

    /** @type {Element} */
    get container() {
      return this.#container;
    }

    /** @type {string} */
    get id() {
      return this.#id;
    }

    /** @type {NH.base.Logger} */
    get logger() {
      return this.#logger;
    }

    /** @type {string} */
    get name() {
      return this.#name;
    }

    /** Clears the container element. */
    clear() {
      this.#container.innerHTML = '';
    }

    #container
    #id
    #logger
    #name

  }

  /** A table with collapsible sections. */
  class AccordionTableWidget extends Widget {

    /** @param {string} name - Name for this instance. */
    constructor(name) {
      super(name, 'table');
      this.logger.log(`${this.name} constructed`);
    }

    /**
     * This becomes the current section.
     * @param {string} name - Name of the new section.
     * @returns {Element} - The new section.
     */
    addSection(name) {
      this.#currentSection = document.createElement('tbody');
      this.#currentSection.id = NH.base.safeId(`${this.id}-${name}`);
      this.container.append(this.#currentSection);
      return this.#currentSection;
    }

    /**
     * Add a row of header cells to the current section.
     * @param {...string} items - To make up the row cells.
     */
    addHeader(...items) {
      this.#addRow('th', ...items);
    }

    /**
     * Add a row of data cells to the current section.
     * @param {...string} items - To make up the row cells.
     */
    addData(...items) {
      this.#addRow('td', ...items);
    }

    /**
     * Add a row to the current section.
     * @param {string} type - Cell type, typically 'td' or 'th'.
     * @param {...string} items - To make up the row cells.
     */
    #addRow = (type, ...items) => {
      const tr = document.createElement('tr');
      for (const item of items) {
        const cell = document.createElement(type);
        cell.innerHTML = item;
        tr.append(cell);
      }
      this.container.append(tr);
    }

    #currentSection

  }

  /**
   * A widget that can be opened and closed on demand, designed for fairly
   * persistent information.
   *
   * The element will get `open` and `close` events.
   */
  class InfoWidget extends Widget {

    /** @param {string} name - Name for this instance. */
    constructor(name) {
      super(name, 'dialog');
      this.logger.log(`${this.name} constructed`);
    }

    /** Open the widget. */
    open() {
      this.container.showModal();
      this.container.dispatchEvent(new Event('open'));
    }

    /** Close the widget. */
    close() {
      // HTMLDialogElement sends a close event natively.
      this.container.close();
    }

  }

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
   * Base class for building services to go with {@link SPA}.
   *
   * This should be subclassed to implement services that instances of {@link
   * Page} will instantiate, initialize, active and deactivate at appropriate
   * times.
   *
   * It is expected that each {Page} subclass will have individual instances
   * of the services, though nothing will enforce that.
   *
   * @example
   * class DummyService extends Service {
   * ... implement methods ...
   * }
   *
   * class CustomPage extends Page {
   *   constructor() {
   *     this.addService(DummyService);
   *   }
   * }
   */
  class Service {

    /** @param {string} name - Custom portion of this instance. */
    constructor(name) {
      if (new.target === Service) {
        throw new TypeError('Abstract class; do not instantiate directly.');
      }
      this.#name = `${this.constructor.name}: ${name}`;
      this.#shortName = name;
      this.#logger = new NH.base.Logger(this.#name);
    }

    /** @type {NH.base.Logger} - NH.base.Logger instance. */
    get logger() {
      return this.#logger;
    }

    /** @type {string} - Instance name. */
    get name() {
      return this.#name;
    }

    /** @type {string} - Shorter instance name. */
    get shortName() {
      return this.#shortName;
    }

    /** Called each time service is activated. */
    activate() {
      this.#notImplemented('activate');
    }

    /** Called each time service is deactivated. */
    deactivate() {
      this.#notImplemented('deactivate');
    }

    #logger
    #name
    #shortName

    /** @param {string} name - Name of method that was not implemented. */
    #notImplemented(name) {
      const msg = `Class ${this.constructor.name} did not implement ` +
            `method "${name}".`;
      this.logger.log(msg);
      throw new Error(msg);
    }

  }

  /** Toy service for experimenting. */
  class DummyService extends Service {

    /** @inheritdoc */
    activate() {
      this.logger.log('Dummy activate');
    }

    /** @inheritdoc */
    deactivate() {
      this.logger.log('Dummy deactivate');
    }

  }

  /** Manage a {Scroller} via {Service}. */
  class ScrollerService extends Service {

    /**
     * @param {string} name - Custom portion of this instance.
     * @param {Scroller} scroller - Scroller instance to manage.
     */
    constructor(name, scroller) {
      super(name);
      this.#scroller = scroller;
    }

    /** @inheritdoc */
    activate() {
      this.#scroller.activate();
    }

    /** @inheritdoc */
    deactivate() {
      this.#scroller.deactivate();
    }

    #scroller

  }

  // TODO(#173): Migrate to style guide

  /**
   * @external VMShortcuts
   * @see {@link https://violentmonkey.github.io/guide/keyboard-shortcuts/}
   */

  /**
   * Integrates {@link external:VMShortcuts} with {@link Shortcut}s.
   *
   * NB {Shortcut} was designed to work natively with {external:VMShortcuts},
   * but there should be no known technical reason preventing other
   * implementations from being used, would have have to write a different
   * service.
   *
   * Instances of classes that have {@link Shortcut} properties on them can be
   * added and removed to each instance of this service.  The shortcuts will
   * be enabled and disabled as the service is activated/deactived.  This can
   * allow each service to have different groups of shortcuts present.
   *
   * All Shortcuts can react to VM.shortcut style conditions.  These
   * conditions are added once during each call to addService(), and default
   * to '!inputFocus'.
   *
   * The built in handler for 'inputFocus' can be enabled by executing:
   *
   * @example
   * VMKeyboardService.start();
   */
  class VMKeyboardService extends Service {

    /** @inheritdoc */
    constructor(name) {
      super(name);
      VMKeyboardService.#services.add(this);
    }

    /** @param {string} val - New condition. */
    static set condition(val) {
      this.#navOption.condition = val;
    }

    /** @type {Set<VMKeyboardService>} - Instantiated services. */
    static get services() {
      return new Set(this.#services.values());
    }

    /** Add listener. */
    static start() {
      document.addEventListener('focus', this.#onFocus, this.#focusOption);
    }

    /** Remove listener. */
    static stop() {
      document.removeEventListener('focus', this.#onFocus, this.#focusOption);
    }

    /**
     * Set the keyboard context to a specific value.
     * @param {string} context - The name of the context.
     * @param {object} state - What the value should be.
     */
    static setKeyboardContext(context, state) {
      for (const service of this.#services) {
        for (const keyboard of service.#keyboards.values()) {
          keyboard.setContext(context, state);
        }
      }
    }

    /**
     * @type {VM.shortcut.IShortcutOptions} - Disables keys when focus is on
     * an element or info view.
     */
    static #navOption = {
      condition: '!inputFocus',
      caseSensitive: true,
    };

    static #focusOption = {
      capture: true,
    };

    static #services = new Set();
    static #lastFocusedElement = null

    /** @type {boolean} */
    get active() {
      return this.#active;
    }

    /** @type {Shortcut[]} - Well, seq and desc properties only. */
    get shortcuts() {
      return this.#shortcuts;
    }

    /** @inheritdoc */
    activate() {
      for (const keyboard of this.#keyboards.values()) {
        this.logger.log('would enable keyboard', keyboard);
        // TODO: keyboard.enable();
      }
      this.#active = true;
    }

    /** @inheritdoc */
    deactivate() {
      for (const keyboard of this.#keyboards.values()) {
        this.logger.log('would disable keyboard', keyboard);
        // TODO: keyboard.disable();
      }
      this.#active = false;
    }

    /** @param {*} instance - Object with {Shortcut} properties. */
    addInstance(instance) {
      const me = 'addInstance';
      this.logger.entered(me, instance);
      if (this.#keyboards.has(instance)) {
        this.logger.log('Already registered');
      } else {
        const keyboard = new VM.shortcut.KeyboardService();
        for (const prop of Object.values(instance)) {
          if (prop instanceof Shortcut) {
            // While we are here, give the function a name.
            Object.defineProperty(prop, 'name', {value: name});
            keyboard.register(prop.seq, prop, VMKeyboardService.#navOption);
          }
        }
        this.#keyboards.set(instance, keyboard);
        this.#rebuildShortcuts();
      }
      this.logger.leaving(me);
    }

    /** @param {*} instance - Object with {Shortcut} properties. */
    removeInstance(instance) {
      const me = 'removeInstance';
      this.logger.entered(me, instance);
      if (this.#keyboards.has(instance)) {
        const keyboard = this.#keyboards.get(instance);
        keyboard.disable();
        this.#keyboards.delete(instance);
        this.#rebuildShortcuts();
      } else {
        this.logger.log('Was not registered');
      }
      this.logger.leaving(me);
    }

    /**
     * Handle focus event to determine if shortcuts should be disabled.
     * @param {Event} evt - Standard 'focus' event.
     */
    static #onFocus = (evt) => {
      if (this.#lastFocusedElement &&
          evt.target !== this.#lastFocusedElement) {
        this.#lastFocusedElement = null;
        this.setKeyboardContext('inputFocus', false);
      }
      if (isInput(evt.target)) {
        this.setKeyboardContext('inputFocus', true);
        this.#lastFocusedElement = evt.target;
      }
    }

    #active = false;
    #keyboards = new Map();
    #shortcuts = [];

    #rebuildShortcuts = () => {
      this.#shortcuts = [];
      for (const instance of this.#keyboards.keys()) {
        for (const prop of Object.values(instance)) {
          if (prop instanceof Shortcut) {
            this.#shortcuts.push({seq: prop.seq, desc: prop.desc});
          }
        }
      }
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

    #pageReadySelector

    /** @type {SPA} - SPA instance managing this instance. */
    #spa;

    /** @type {NH.base.Logger} - NH.base.Logger instance. */
    #logger;

    /** @type {RegExp} - Computed RegExp version of _pathname. */
    #pathnameRE;

    /** @type {KeyboardService} */
    #keyboard = new VM.shortcut.KeyboardService();

    #services = new Set();

    /**
     * @type {IShortcutOptions} - Disables keys when focus is on an element or
     * info view.
     */
    static #navOption = {
      caseSensitive: true,
      condition: '!inputFocus && !inDialog',
    };

    /**
     * Turn a pathname into a RegExp.
     * @param {string|RegExp} pathname - A pathname to convert.
     * @returns {RegExp} - A converted pathname.
     */
    #computePathname = (pathname) => {
      const me = 'computePath';
      this.logger.entered(me, pathname);
      let pathnameRE = /.*/u;
      if (pathname instanceof RegExp) {
        pathnameRE = pathname;
      } else if (pathname) {
        pathnameRE = RegExp(`^${pathname}$`, 'u');
      }
      this.logger.leaving(me, pathnameRE);
      return pathnameRE;
    }

    /**
     * @typedef {object} PageDetails
     * @property {SPA} spa - SPA instance that manages this Page.
     * @property {string|RegExp} [pathname=RegExp(.*)] - Pathname portion of
     * the URL this page should handle.
     * @property {string} [pageReadySelector='body'] - CSS selector that is
     * used to detect that the page is loaded enough to activate.
     */

    /** @param {PageDetails} details - Details about the instance. */
    constructor(details = {}) {
      if (new.target === Page) {
        throw new TypeError('Abstract class; do not instantiate directly.');
      }
      this.#spa = details.spa;
      this.#logger = new NH.base.Logger(this.constructor.name);
      this.#pathnameRE = this.#computePathname(details.pathname);
      ({
        pageReadySelector: this.#pageReadySelector = 'body',
      } = details);
      this.#logger.log('Base page constructed', this);
    }

    /**
     * Register a new {@link Service}.
     * @param {function(): Service} Klass - A service class to instantiate.
     * @param {...*} rest - Arbitrary objects to pass to constructor.
     * @returns {Service} - Instance of Klass.
     */
    addService(Klass, ...rest) {
      const me = 'addService';
      let instance = null;
      this.logger.entered(me, Klass, ...rest);
      if (Klass.prototype instanceof Service) {
        instance = new Klass(this.constructor.name, ...rest);
        this.#services.add(instance);
      } else {
        this.logger.log('Bad class was passed.');
        throw new Error(`${Klass.name} is not a Service`);
      }
      this.logger.leaving(me, instance);
      return instance;
    }

    /**
     * Called when registered via {@link SPA}.
     */
    start() {
      for (const shortcut of this.allShortcuts) {
        this.#addKey(shortcut);
      }
    }

    /** @type {Shortcut[]} - List of {@link Shortcut}s to register. */
    get allShortcuts() {
      const shortcuts = [];
      for (const prop of Object.values(this)) {
        if (prop instanceof Shortcut) {
          shortcuts.push(prop);
          // While we are here, give the function a name.
          Object.defineProperty(prop, 'name', {value: name});
        }
      }
      return shortcuts;
    }

    /** @type {RegExp} */
    get pathname() {
      return this.#pathnameRE;
    }

    /** @type {SPA} */
    get spa() {
      return this.#spa;
    }

    /** @type {NH.base.Logger} */
    get logger() {
      return this.#logger;
    }

    /** @type {KeyboardService} */
    get keyboard() {
      return this.#keyboard;
    }

    /**
     * Wait until the page has loaded enough to continue.
     * @returns {Element} - The element matched by #pageReadySelector.
     */
    #waitUntilReady = async () => {
      const me = 'waitUntilReady';
      this.logger.entered(me);

      this.logger.log('pageReadySelector:', this.#pageReadySelector);
      const element = await NH.web.waitForSelector(
        this.#pageReadySelector, 0
      );
      this.logger.leaving(me, element);

      return element;
    }

    /**
     * Turns on this Page's features.  Called by {@link SPA} when this becomes
     * the current view.
     */
    async activate() {
      this.#keyboard.enable();
      await this.#waitUntilReady();
      for (const service of this.#services) {
        service.activate();
      }

      // TODO(#150): Will be removed.
      this._refresh();
    }

    /**
     * Turns off this Page's features.  Called by {@link SPA} when this is no
     * longer the current view.
     */
    deactivate() {
      this.#keyboard.disable();
      for (const service of this.#services) {
        service.deactivate();
      }
    }

    /** @type {string} - Describes what the header should be. */
    get infoHeader() {
      return this.constructor.name;
    }

    /**
     * Registers a specific key sequence with a function with VM.shortcut.
     * @param {Shortcut} shortcut - Shortcut to register.
     */
    #addKey(shortcut) {
      this.#keyboard.register(shortcut.seq, shortcut, Page.#navOption);
    }

    /**
     * Override this function in subclasses to take action upon becoming the
     * current view again.
     */
    _refresh() {
      this.logger.log('In base refresh.');
    }

  }

  /** Class for holding keystrokes that simplify debugging. */
  class DebugKeys {

    clearConsole = new Shortcut('c-c c-c', 'Clear the debug console', () => {
      NH.base.Logger.clear();
    });

  }

  const linkedInGlobals = new LinkedInGlobals();

  /**
   * Class for handling aspects common across LinkedIn.
   *
   * This includes things like the global nav bar, information view, etc.
   */
  class Global extends Page {

    #keyboardService

    /**
     * Create a Global instance.
     * @param {SPA} spa - SPA instance that manages this Page.
     */
    constructor(spa) {
      super({spa: spa});

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);
      if (NH.xunit.testing.enabled) {
        this.#keyboardService.addInstance(new DebugKeys());
      }
    }

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

    #tabSnippet = SPA._parseSeq2('tab');  // eslint-disable-line no-use-before-define

    #postScroller = null;
    #commentScroller = null;
    #lastScroller

    #dummy

    /** @type {Scroller~What} */
    static #postsWhat = {
      name: 'Feed posts',
      containerItems: [
        {container: 'main div.scaffold-finite-scroll__content',
          items: 'div[data-id]'},
      ],
    };

    /** @type {Scroller~How} */
    static #postsHow = {
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
    static #commentsHow = {
      uidCallback: Feed._uniqueIdentifier,
      classes: ['dick'],
      autoActivate: true,
      snapToTop: false,
    };

    /** @type {Page~PageDetails} */
    static #details = {
      pathname: '/feed/',
      pageReadySelector: 'main',
    };

    /**
     * Create a Feed instance.
     * @param {SPA} spa - SPA instance that manages this Page.
     */
    constructor(spa) {
      super({spa: spa, ...Feed.#details});

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      spa.details.navBarScrollerFixup(Feed.#postsHow);
      spa.details.navBarScrollerFixup(Feed.#commentsHow);

      this.#dummy = this.addService(DummyService);

      this.#postScroller = new Scroller(Feed.#postsWhat, Feed.#postsHow);
      this.addService(ScrollerService, this.#postScroller);
      this.#postScroller.dispatcher.on(
        'out-of-range', linkedInGlobals.focusOnSidebar
      );
      this.#postScroller.dispatcher.on('change', this.#onPostChange);

      this.#lastScroller = this.#postScroller;
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
          observeOptions: {
            attributeFilter: ['class'],
            attributes: true,
            attributeOldValue: true,
          },
          monitor: monitor,
          timeout: 5000,
        };
        NH.web.otmot(what, how).finally(() => {
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
      const me = 'get comments';
      this.logger.entered(me, this.#commentScroller, this._posts.item);

      if (!this.#commentScroller && this._posts.item) {
        this.#commentScroller = new Scroller(
          {base: this._posts.item, ...Feed.#commentsWhat}, Feed.#commentsHow
        );
        this.#commentScroller.dispatcher.on(
          'out-of-range', this.#returnToPost
        );
        this.#commentScroller.dispatcher.on('change', this.#onCommentChange);
      }

      this.logger.leaving(me, this.#commentScroller);
      return this.#commentScroller;
    }

    /** Reset the comment scroller. */
    #resetComments() {
      if (this.#commentScroller) {
        this.#commentScroller.destroy();
        this.#commentScroller = null;
      }
      this._comments;
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

    #onCommentChange = () => {
      this.#lastScroller = this._comments;
    }

    /**
     * Reselects current post, triggering same actions as initial selection.
     */
    #returnToPost = () => {
      this._posts.item = this._posts.item;
    }

    /** Resets the comments {@link Scroller}. */
    #onPostChange = () => {
      const me = 'onPostChange';
      this.logger.entered(me, this._posts.item);
      this.#resetComments();
      this.#lastScroller = this._posts;
      this.logger.leaving(me);
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
      this.#lastScroller.first();
    });

    _lastItem = new Shortcut(
      '>', 'Go to last post or comment currently loaded', () => {
        this.#lastScroller.last();
      }
    );

    _focusBrowser = new Shortcut(
      'f', 'Change browser focus to current item', () => {
        const el = this.#lastScroller.item;
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
        const el = this.#lastScroller.item;
        clickElement(el, ['button[aria-label^="see more"]']);
      }
    );

    _loadMorePosts = new Shortcut(
      'l',
      'Load more posts (if the <button>New Posts</button> button ' +
        'is available, load those)', () => {
        const savedScrollTop = document.documentElement.scrollTop;
        let first = false;
        const posts = this._posts;

        /** Trigger function for {@link NH.web.otrot2}. */
        function trigger() {
          // The topButton only shows up when the app detects new posts.  In
          // that case, going back to the first post is appropriate.
          const topButton = 'main div.feed-new-update-pill button';
          // If there is not top button, there should always be a button at
          // the bottom the click.
          const botButton = 'main button.scaffold-finite-scroll__load-button';
          if (clickElement(document, [topButton])) {
            first = true;
          } else {
            clickElement(document, [botButton]);
          }
        }

        /** Action function for {@link NH.web.otrot2}. */
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
        NH.web.otrot2(what, how);
      }
    );

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
        const el = this.#lastScroller.item;
        const selector = [
          // Button on a comment
          'button.comments-comment-social-bar__reactions-count',
          // Original button on a post
          'button.feed-shared-social-action-bar-counts',
          // Possibly new button on a post
          'button.social-details-social-counts__count-value',
        ].join(',');
        clickElement(el, [selector]);
      }
    );

    _viewReposts = new Shortcut(
      'v R', 'View reposts of current post', () => {
        clickElement(this._posts.item, ['button[aria-label*="repost"]']);
      }
    );

    _openMeatballMenu = new Shortcut(
      '=',
      'Open closest <button class="spa-meatball">⋯</button> menu',
      () => {
        // XXX: In this case, the identifier is on an svg element, not the
        // button, so use the parentElement.  When Firefox [fully
        // supports](https://bugzilla.mozilla.org/show_bug.cgi?id=418039) the
        // `:has()` pseudo-selector, we can probably use that and use
        // `clickElement()`.
        const el = this.#lastScroller.item;
        const selector = [
          // Comment variant
          '[aria-label^="Open options"]',
          // Original post variant
          '[aria-label^="Open control menu"]',
          // Maybe new post variant
          '[a11y-text^="Open control menu"]',
        ].join(',');
        const button = el.querySelector(selector).parentElement;
        button?.click();
      }
    );

    _likeItem = new Shortcut('L', 'Like current post or comment', () => {
      const el = this.#lastScroller.item;
      clickElement(el, ['button[aria-label^="Open reactions menu"]']);
    });

    _commentOnItem = new Shortcut(
      'C', 'Comment on current post or comment', () => {
        // Order of the queries matters here.  If a post has visible comments,
        // the wrong button could be selected.
        clickElement(this.#lastScroller.item, [
          'button[aria-label^="Comment"]',
          'button[aria-label^="Reply"]',
        ]);
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

    _gotoShare = new Shortcut(
      'P',
      `Go to the share box to start a post or ${this.#tabSnippet} ` +
        'to the other creator options',
      () => {
        const share = document.querySelector(
          'div.share-box-feed-entry__top-bar'
        ).parentElement;
        share.style.scrollMarginTop = linkedInGlobals.navBarHeightCSS;
        share.scrollIntoView();
        share.querySelector('button').focus();
      }
    );

    _togglePost = new Shortcut('X', 'Toggle hiding current post', () => {
      clickElement(
        this._posts.item,
        [
          'button[aria-label^="Dismiss post"]',
          'button[aria-label^="Undo and show"]',
        ]
      );
    });

    _nextPostPlus = new Shortcut(
      'J', 'Toggle hiding then next post', async () => {

        /** Trigger function for {@link NH.web.otrot}. */
        const trigger = () => {
          this._togglePost();
          this._nextPost();
        };
        // XXX: Need to remove the highlights before NH.web.otrot sees it
        // because it affects the .clientHeight.
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
          await NH.web.otrot(what, how);
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

    #keyboardService

  }

  /**
   * Class for handling the base MyNetwork page.
   *
   * This page takes 3-4 seconds to load every time.  Revisits are
   * likely to take a while.
   */
  class MyNetwork extends Page {

    #sectionScroller
    #cardScroller
    #lastScroller

    #currentSectionText

    /** @type {Scroller~What} */
    static #sectionsWhat = {
      name: 'MyNetwork sections',
      containerItems: [
        {
          container: 'main',
          items: [
            // Invitations
            ':scope > section',
            // Most sections
            ':scope > ul > li',
            // More suggestions for you section
            ':scope > div > section',
          ].join(','),
        },
      ],
    };

    /** @type {Scroller~How} */
    static #sectionsHow = {
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
    static #cardsHow = {
      uidCallback: MyNetwork._uniqueCardsIdentifier,
      classes: ['dick'],
      autoActivate: true,
      snapToTop: false,
    };

    /** @type {Page~PageDetails} */
    static #details = {
      pathname: '/mynetwork/',
      pageReadySelector: 'main > ul',
    };

    /**
     * Create a MyNetwork instance.
     * @param {SPA} spa - SPA instance that manages this Page.
     */
    constructor(spa) {
      super({spa: spa, ...MyNetwork.#details});

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      spa.details.navBarScrollerFixup(MyNetwork.#sectionsHow);
      spa.details.navBarScrollerFixup(MyNetwork.#cardsHow);

      this.#sectionScroller = new Scroller(MyNetwork.#sectionsWhat,
        MyNetwork.#sectionsHow);
      this.addService(ScrollerService, this.#sectionScroller);
      this.#sectionScroller.dispatcher.on('out-of-range',
        linkedInGlobals.focusOnSidebar);
      this.#sectionScroller.dispatcher.on('change', this.#onSectionChange);

      this.#lastScroller = this.#sectionScroller;
    }

    /** @inheritdoc */
    async _refresh() {

      /**
       * Wait for sections to eventually show up to see if our current one
       * comes back.  It may not.
       * @implements {Monitor}
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
        await NH.web.otmot(what, how);
        this._sections.shine();
        this._sections.show();
        this.#resetCards();
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
      return NH.base.strHash(content);
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static _uniqueCardsIdentifier(element) {
      const content = element.innerText;
      return NH.base.strHash(content);
    }

    /** @type {Scroller} */
    get _sections() {
      return this.#sectionScroller;
    }

    /** @type {Scroller} */
    get _cards() {
      if (!this.#cardScroller && this._sections.item) {
        this.#cardScroller = new Scroller(
          {base: this._sections.item, ...MyNetwork.#cardsWhat},
          MyNetwork.#cardsHow
        );
        this.#cardScroller.dispatcher.on('change', this.#onCardChange);
        this.#cardScroller.dispatcher.on(
          'out-of-range', this.#returnToSection
        );
      }
      return this.#cardScroller;
    }

    #resetCards = () => {
      if (this.#cardScroller) {
        this.#cardScroller.destroy();
        this.#cardScroller = null;
      }
      this._cards;
    }

    #onCardChange = () => {
      this.#lastScroller = this._cards;
    }

    #onSectionChange = () => {
      this.#currentSectionText = this._sections.item?.innerText
        .trim().split('\n')[0];
      this.#resetCards();
      this.#lastScroller = this._sections;
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
      this.#lastScroller.first();
    });

    lastItem = new Shortcut('>', 'Go to the last section or card', () => {
      this.#lastScroller.last();
    });

    focusBrowser = new Shortcut(
      'f', 'Change browser focus to current item', () => {
        focusOnElement(this.#lastScroller.item);
      }
    );

    viewItem = new Shortcut('Enter', 'View the current item', () => {
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
        const me = 'enagageCard';
        this.logger.entered(me);
        const selector = [
          // Connect w/ Person, Join Group, View event
          'footer > button',
          // Follow person, Follow page
          'div.discover-entity-type-card__container-bottom > button',
          // Subscribe to newsletter
          'div.p3 > button',
        ].join(',');
        this.logger.log('button?', this._cards.item.querySelector(selector));
        clickElement(this._cards?.item, [selector]);
        this.logger.leaving(me);
      }
    );

    dismissCard = new Shortcut('X', 'Dismiss current card', () => {
      clickElement(this._cards?.item, ['button.artdeco-card__dismiss']);
    });

    #keyboardService

  }

  /** Class for handling the Invitation manager page. */
  class InvitationManager extends Page {

    #inviteScroller
    #currentInviteText

    /** @type {Scroller~What} */
    static #invitesWhat = {
      name: 'Invitation cards',
      base: document.body,
      selectors: [
        [
          // Actual invites
          'main > section section > ul > li',
        ].join(','),
      ],
    };

    static #invitesHow = {
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
      return NH.base.strHash(content);
    }

    /** @type {Scroller} */
    get _invites() {
      return this.#inviteScroller;
    }

    /** @type {Page~PageDetails} */
    static #details = {
      pathname: '/mynetwork/invitation-manager/',
      pageReadySelector: 'main',
    };

    /**
     * Create a InvitationManager instance.
     * @param {SPA} spa - SPA instance that manages this Page.
     */
    constructor(spa) {
      super({spa: spa, ...InvitationManager.#details});

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      spa.details.navBarScrollerFixup(InvitationManager.#invitesHow);

      this.#inviteScroller = new Scroller(
        InvitationManager.#invitesWhat, InvitationManager.#invitesHow
      );
      this.addService(ScrollerService, this.#inviteScroller);
      this.#inviteScroller.dispatcher.on('change', this.#onChange);
    }

    /** @inheritdoc */
    async _refresh() {
      const me = 'refresh';
      this.logger.entered(me);

      /**
       * Wait for current invitation to show back up.
       * @implements {Monitor}
       * @returns {Continuation} - Indicate whether done monitoring.
       */
      const monitor = () => {
        for (const el of document.body.querySelectorAll(
          'main > section section > ul > li'
        )) {
          const text = el.innerText.trim().split('\n')[0];
          if (text === this.#currentInviteText) {
            return {done: true};
          }
        }
        return {done: false};
      };
      const what = {
        name: 'InviteManager refresh',
        base: document.body.querySelector('main'),
      };
      const how = {
        observeOptions: {childList: true, subtree: true},
        monitor: monitor,
        timeout: 3000,
      };

      if (this.#currentInviteText) {
        this.logger.log(`We will look for ${this.#currentInviteText}`);
        await NH.web.otmot(what, how);
        this._invites.shine();
        this._invites.show();
      }
      this.logger.leaving(me);
    }

    #onChange = () => {
      const me = 'onChange';
      this.logger.entered(me);
      this.#currentInviteText = this._invites.item?.innerText
        .trim().split('\n')[0];
      this.logger.log('current', this.#currentInviteText);
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

    #keyboardService

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

    /**
     * Create a Jobs instance.
     * @param {SPA} spa - SPA instance that manages this Page.
     */
    constructor(spa) {
      super({spa: spa, ...Jobs.#details});

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      spa.details.navBarScrollerFixup(Jobs.#sectionsHow);
      spa.details.navBarScrollerFixup(Jobs.#jobsHow);

      this.#sectionScroller = new Scroller(Jobs.#sectionsWhat,
        Jobs.#sectionsHow);
      this.addService(ScrollerService, this.#sectionScroller);
      this.#sectionScroller.dispatcher.on('out-of-range',
        linkedInGlobals.focusOnSidebar);
      this.#sectionScroller.dispatcher.on('activate',
        this.#onSectionActivate);
      this.#sectionScroller.dispatcher.on('change', this.#onSectionChange);

      this.#lastScroller = this.#sectionScroller;
    }

    /** @type {Scroller} */
    get _sections() {
      return this.#sectionScroller;
    }

    /** @type {Scroller} */
    get _jobs() {
      const me = 'get jobs';
      this.logger.entered(me, this.#jobScroller);

      if (!this.#jobScroller && this._sections.item) {
        this.#jobScroller = new Scroller(
          {base: this._sections.item, ...Jobs.#jobsWhat},
          Jobs.#jobsHow
        );
        this.#jobScroller.dispatcher.on('change', this.#onJobChange);
        this.#jobScroller.dispatcher.on('out-of-range',
          this.#returnToSection);
      }

      this.logger.leaving(me, this.#jobScroller);
      return this.#jobScroller;
    }

    /** Reset the jobs scroller. */
    #resetJobs = () => {
      const me = 'resetJobs';
      this.logger.entered(me, this.#jobScroller);
      if (this.#jobScroller) {
        this.#jobScroller.destroy();
        this.#jobScroller = null;
      }
      this._jobs;
      this.logger.leaving(me);
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
      return NH.base.strHash(content);
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
            options = element
              .querySelectorAll('.jobs-home-upsell-card__container');
            if (options.length === ONE_ITEM) {
              content = options[0].className;
            }
          }
        }
      }
      return NH.base.strHash(content);
    }

    /**
     * Reselects current section, triggering same actions as initial
     * selection.
     */
    #returnToSection = () => {
      this._sections.item = this._sections.item;
    }

    #onJobChange = () => {
      this.#lastScroller = this._jobs;
    }

    #onSectionActivate = () => {
      const me = 'onSectionActivate';
      this.logger.entered(me);
      this._sections.show();
      this._sections.shine();
      this.logger.leaving(me);
    }

    /**
     * Updates {@link Jobs} specific watcher data and removes the jobs
     * {@link Scroller}.
     */
    #onSectionChange = () => {
      const me = 'onSectionChange';
      this.logger.entered(me);
      this.#resetJobs();
      this.#lastScroller = this._sections;
      this.logger.leaving(me);
    }

    /**
     * Recover scroll position after elements were recreated.
     * @param {number} topScroll - Where to scroll to.
     */
    #resetScroll = (topScroll) => {
      const me = 'resetScroll';
      this.logger.entered(me, topScroll);
      // Explicitly setting jobs.item below will cause it to scroll to that
      // item.  We do not want to do that if the user is manually scrolling.
      const savedJob = this._jobs?.item;
      this._sections.shine();
      // Section was probably rebuilt, assume jobs scroller is invalid.
      this.#resetJobs();
      if (savedJob) {
        this._jobs.item = savedJob;
      }
      document.documentElement.scrollTop = topScroll;
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

    _firstSectionOrJob = new Shortcut(
      '<', 'Go to to first section or job', () => {
        this.#lastScroller.first();
      }
    );

    _lastSectionOrJob = new Shortcut(
      '>', 'Go to last section or job currently loaded', () => {
        this.#lastScroller.last();
      }
    );

    _focusBrowser = new Shortcut(
      'f', 'Change browser focus to current section or job', () => {
        this._sections.show();
        this._jobs?.show();
        focusOnElement(this.#lastScroller.item);
      }
    );

    _activateJob = new Shortcut(
      'Enter',
      'Activate the current job (click on it)',
      () => {
        const job = this._jobs?.item;
        if (job) {
          if (!clickElement(job, ['div[data-view-name]', 'a', 'button'])) {
            this.spa.dumpInfoAboutElement(job, 'job');
          }
        } else {
          // Again, because we use Enter as the hotkey for this action.
          document.activeElement.click();
        }
      }
    );

    _loadMoreSections = new Shortcut(
      'l',
      'Load more sections (or <i>More jobs for you</i> items)',
      async () => {
        const savedScrollTop = document.documentElement.scrollTop;

        /** Trigger function for {@link NH.web.otrot}. */
        function trigger() {
          clickElement(document,
            ['main button.scaffold-finite-scroll__load-button']);
        }
        const what = {
          name: 'loadMoreSections',
          base: document.querySelector('div.scaffold-finite-scroll__content'),
        };
        const how = {
          trigger: trigger,
          timeout: 3000,
        };
        await NH.web.otrot(what, how);
        this.#resetScroll(savedScrollTop);
      }
    );

    _toggleSaveJob = new Shortcut('S', 'Toggle saving job', () => {
      const selector = [
        'button[aria-label^="Save job"]',
        'button[aria-label^="Unsave job"]',
      ].join(',');
      clickElement(this._jobs?.item, [selector]);
    });

    _toggleDismissJob = new Shortcut('X',
      'Toggle dismissing job',
      async () => {
        const savedJob = this._jobs.item;

        /** Trigger function for {@link NH.web.otrot}. */
        function trigger() {
          const selector = [
            'button[aria-label^="Dismiss job"]:not([disabled])',
            'button[aria-label$=" Undo"]',
          ].join(',');
          clickElement(savedJob, [selector]);
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
          await NH.web.otrot(what, how);
          this._jobs.item = savedJob;
        }
      });

    /** @type {Page~PageDetails} */
    static #details = {
      pathname: '/jobs/',
      pageReadySelector: LinkedInGlobals.asideSelector,
    };

    /** @type {Scroller~What} */
    static #jobsWhat = {
      name: 'Job entries',
      selectors: [
        [
          // Most job entries
          ':scope > ul > li',
          // Show all button
          'div.discovery-templates-vertical-list__footer',
        ].join(','),
      ],
    };

    /** @type {Scroller~How} */
    static #jobsHow = {
      uidCallback: Jobs._uniqueJobIdentifier,
      classes: ['dick'],
      autoActivate: true,
      snapToTop: false,
    };

    /** @type {Scroller~What} */
    static #sectionsWhat = {
      name: 'Jobs sections',
      containerItems: [{container: 'main', items: 'section'}],
    };

    /** @type {Scroller~How} */
    static #sectionsHow = {
      uidCallback: Jobs._uniqueIdentifier,
      classes: ['tom'],
      snapToTop: true,
    };

    #sectionScroller = null;
    #jobScroller = null;
    #lastScroller

    #keyboardService

  }

  /** Class for handling Job collections. */
  class JobCollections extends Page {

    #lastScroller

    #jobCardScroller = null;

    /** @type {Scroller} */
    get _jobCards() {
      return this.#jobCardScroller;
    }

    /** @type {Scroller~What} */
    static #jobCardsWhat = {
      name: 'Job cards',
      base: document.body,
      // This selector is also used in #onJobCardActivate.
      selectors: ['div.jobs-search-results-list > ul > li'],
    };

    /** @type {Scroller~How} */
    static #jobCardsHow = {
      uidCallback: this._uniqueJobIdentifier,
      classes: ['tom'],
      snapToTop: false,
      bottomMarginCSS: '3em',
    };

    #resultsPageScroller = null;

    /** @type {Scroller} */
    get _resultsPages() {
      return this.#resultsPageScroller;
    }

    /** @type {Scroller~What} */
    static #resultsPagesWhat = {
      name: 'Results pages',
      base: document.body,
      // This selector is also used in #onResultsPageActivate.
      selectors: ['div.jobs-search-results-list__pagination li'],
    };

    /** @type {Scroller~How} */
    static #resultsPagesHow = {
      uidCallback: this._uniqueResultsPageIdentifier,
      classes: ['dick'],
      snapToTop: false,
      bottomMarginCSS: '3em',
    };

    /** @type {Page~PageDetails} */
    static #details = {
      // eslint-disable-next-line prefer-regex-literals
      pathname: RegExp('^/jobs/(?:collections|search)/.*', 'u'),
      pageReadySelector: 'footer.global-footer-compact',
    };

    /**
     * Create a JobCollections instance.
     * @param {SPA} spa - SPA instance that manages this Page.
     */
    constructor(spa) {
      super({spa: spa, ...JobCollections.#details});

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      this.#jobCardScroller = new Scroller(JobCollections.#jobCardsWhat,
        JobCollections.#jobCardsHow);
      this.addService(ScrollerService, this.#jobCardScroller);
      this.#jobCardScroller.dispatcher.on('activate',
        this.#onJobCardActivate);
      this.#jobCardScroller.dispatcher.on('change', this.#onJobCardChange);

      this.#resultsPageScroller = new Scroller(
        JobCollections.#resultsPagesWhat, JobCollections.#resultsPagesHow
      );
      this.addService(ScrollerService, this.#resultsPageScroller);
      this.#resultsPageScroller.dispatcher.on('activate',
        this.#onResultsPageActivate);
      this.#resultsPageScroller.dispatcher.on('change',
        this.#onResultsPageChange);

      this.#lastScroller = this.#jobCardScroller;
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static _uniqueJobIdentifier(element) {
      let content = '';
      if (element) {
        content = element.dataset.occludableJobId;
      }
      return NH.base.strHash(content);
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static _uniqueResultsPageIdentifier(element) {
      let content = '';
      if (element) {
        content = element.innerText;
        const label = element.getAttribute('aria-label');
        if (label) {
          content = label;
        }
      }
      return NH.base.strHash(content);
    }

    #onJobCardActivate = async () => {
      const me = 'onJobActivate';
      this.logger.entered(me);

      const params = new URL(document.location).searchParams;
      const jobId = params.get('currentJobId');
      this.logger.log('Looking for job card for', jobId);

      // Wait some amount of time for a job card to show up, if it ever does.
      // Annoyingly enough, the selection of jobs that shows up on a reload
      // may not include one for the current URL.  Even if the user arrived at
      // the URL moments ago.

      try {
        const timeout = 2000;
        const item = await NH.web.waitForSelector(
          `li[data-occludable-job-id="${jobId}"]`,
          timeout
        );
        this._jobCards.gotoUid(JobCollections._uniqueJobIdentifier(item));
      } catch (e) {
        this.logger.log('Job card matching URL not found, staying put');
      }

      this.logger.leaving(me);
    }

    #onJobCardChange = () => {
      const me = 'onJobCardChange';
      this.logger.entered(me, this._jobCards.item);
      clickElement(this._jobCards.item, ['div[data-job-id]']);
      this.#lastScroller = this._jobCards;
      this.logger.leaving(me);
    }

    #onResultsPageActivate = async () => {
      const me = 'onResultsPageActivate';
      this.logger.entered(me);

      try {
        const timeout = 2000;
        const item = await NH.web.waitForSelector(
          'div.jobs-search-results-list__pagination li.selected', timeout
        );
        this._resultsPages.goto(item);
      } catch (e) {
        this.logger.log('Results paginator not found, staying put');
      }

      this.logger.leaving(me);
    }

    #onResultsPageChange = () => {
      const me = 'onResultsPageChange';
      this.logger.entered(me, this._resultsPages.item);
      this.#lastScroller = this._resultsPages;
      this.logger.leaving(me);
    }

    nextJob = new Shortcut('j', 'Next job card', () => {
      this._jobCards.next();
    });

    prevJob = new Shortcut('k', 'Previous job card', () => {
      this._jobCards.prev();
    });

    nextResultsPage = new Shortcut('n', 'Next results page', () => {
      this._resultsPages.next();
    });

    prevResultsPage = new Shortcut('p', 'Previous results page', () => {
      this._resultsPages.prev();
    });

    firstItem = new Shortcut('<', 'Go to first job or results page', () => {
      this.#lastScroller.first();
    });

    lastItem = new Shortcut(
      '>', 'Go to last job currently loaded or results page', () => {
        this.#lastScroller.last();
      }
    );

    focusBrowser = new Shortcut(
      'f', 'Move browser focus to most recently selected item', () => {
        focusOnElement(this.#lastScroller.item);
      }
    );

    detailsPane = new Shortcut('d', 'Jump to details pane', () => {
      focusOnElement(document.querySelector(
        'div.jobs-search__job-details--container'
      ));
    });

    selectCurrentResultsPage = new Shortcut(
      'c', 'Select current results page', () => {
        clickElement(this._resultsPages.item, ['button']);
      }
    );

    openShareMenu = new Shortcut('s', 'Open share menu', () => {
      clickElement(document, ['button[aria-label="Share"]']);
    });

    openMeatballMenu = new Shortcut(
      '=', 'Open the <button class="spa-meatball">⋯</button> menu', () => {
        // XXX: There are TWO buttons.  The *first* one is hidden until the
        // user scrolls down.  This always triggers the first one.
        clickElement(document, ['.jobs-options button']);
      }
    );

    applyToJob = new Shortcut(
      'A', 'Apply to job (or previous application)', () => {
        // XXX: There are TWO apply buttons.  The *second* one is hidden until
        // the user scrolls down.  This always triggers the first one.
        const selectors = [
          // Apply and Easy Apply buttons
          'button[aria-label*="Apply to"]',
          // See application link
          'a[href^="/jobs/tracker"]',
        ];
        clickElement(document, selectors);
      }
    );

    toggleSaveJob = new Shortcut('S', 'Toggle saving job', () => {
      // XXX: There are TWO buttons.  The *first* one is hidden until the user
      // scrolls down.  This always triggers the first one.
      clickElement(document, ['button.jobs-save-button']);
    });

    toggleDismissJob = new Shortcut(
      'X', 'Toggle dismissing job, if available', () => {
        // Currently these two are the same, but one never knows.
        this.toggleThumbsDown();
      }
    );

    toggleFollowCompany = new Shortcut(
      'F', 'Toggle following company', () => {
        // The button toggles between Follow and Following
        clickElement(document, ['button[aria-label^="Follow"]']);
      }
    );

    toggleAlert = new Shortcut(
      'L', 'Toggle the job search aLert, if available', () => {
        clickElement(document,
          ['main .jobs-search-create-alert__artdeco-toggle']);
      }
    );

    toggleThumbsUp = new Shortcut(
      '+', 'Toggle thumbs up, if available', () => {
        const selector = [
          'button[aria-label="Like job"]',
          'button[aria-label="Job is liked, undo"]',
        ].join(',');
        clickElement(this._jobCards.item, [selector]);
      }
    );

    toggleThumbsDown = new Shortcut(
      '-', 'Toggle thumbs down, if available', () => {
        const selector = [
          'button[aria-label="Dismiss job"]',
          'button[aria-label="Job is dismissed, undo"]',
        ].join(',');
        clickElement(this._jobCards.item, [selector]);
      }
    );

    #keyboardService

  }

  /** Class for handling the Messaging page. */
  class Messaging extends Page {

    /**
     * Create a Messaging instance.
     * @param {SPA} spa - SPA instance that manages this Page.
     */
    constructor(spa) {
      super({spa: spa, ...Messaging.#details});

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);
    }

    /** @type {Page~PageDetails} */
    static #details = {
      // eslint-disable-next-line prefer-regex-literals
      pathname: RegExp('^/messaging/.*', 'u'),
      pageReadySelector: LinkedInGlobals.asideSelector,
    };

    #keyboardService

  }

  /** Class for handling the Notifications page. */
  class Notifications extends Page {

    #notificationScroller = null;

    /** @type {Scroller~What} */
    static #notificationsWhat = {
      name: 'Notification cards',
      base: document.body,
      selectors: ['main section div.nt-card-list article'],
    };

    /** @type {Scroller-How} */
    static #notificationsHow = {
      uidCallback: Notifications._uniqueIdentifier,
      classes: ['tom'],
      snapToTop: false,
    };

    /** @type {Page~PageDetails} */
    static #details = {
      pathname: '/notifications/',
      pageReadySelector: 'main section div.nt-card-list',
    };

    /**
     * Create a Notifications instance.
     * @param {SPA} spa - SPA instance that manages this Page.
     */
    constructor(spa) {
      super({spa: spa, ...Notifications.#details});

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      spa.details.navBarScrollerFixup(Notifications.#notificationsHow);

      this.#notificationScroller = new Scroller(
        Notifications.#notificationsWhat, Notifications.#notificationsHow
      );
      this.addService(ScrollerService, this.#notificationScroller);
      this.#notificationScroller.dispatcher.on('out-of-range',
        linkedInGlobals.focusOnSidebar);
    }

    /** @inheritdoc */
    _refresh() {
      this._notifications.shine();
      this._notifications.show();
    }

    /** @type {Scroller} */
    get _notifications() {
      return this.#notificationScroller;
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
          for (const el of element.children[CONTENT_INDEX]
            .querySelectorAll('*')) {
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
      return NH.base.strHash(content);
    }

    _nextNotification = new Shortcut('j', 'Next notification', () => {
      this._notifications.next();
    });

    _prevNotification = new Shortcut('k', 'Previous notification', () => {
      this._notifications.prev();
    });

    _firstNotification = new Shortcut('<', 'Go to first notification', () => {
      this._notifications.first();
    });

    _lastNotification = new Shortcut('>', 'Go to last notification', () => {
      this._notifications.last();
    });

    _focusBrowser = new Shortcut(
      'f', 'Change browser focus to current notification', () => {
        this._notifications.show();
        focusOnElement(this._notifications.item);
      }
    );

    _activateNotification = new Shortcut(
      'Enter', 'Activate the current notification (click on it)', () => {
        const ONE_ITEM = 1;
        const notification = this._notifications.item;
        if (notification) {
          // Because we are using Enter as the hotkey here, if the active
          // element is inside the current card, we want that to take
          // precedence.
          if (document.activeElement.closest('article') === notification) {
            return;
          }

          const elements = notification.querySelectorAll(
            '.nt-card__headline'
          );
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
    );

    _loadMoreNotifications = new Shortcut(
      'l', 'Load more notifications', () => {
        const savedScrollTop = document.documentElement.scrollTop;
        let first = false;
        const notifications = this._notifications;

        /** Trigger function for {@link NH.web.otrot2}. */
        function trigger() {
          if (clickElement(document,
            ['button[aria-label^="Load new notifications"]'])) {
            first = true;
          } else {
            clickElement(document,
              ['main button.scaffold-finite-scroll__load-button']);
          }
        }

        /** Action function for {@link NH.web.otrot2}. */
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
        NH.web.otrot2(what, how);
      }
    );

    _openMeatballMenu = new Shortcut(
      '=', 'Open the <button class="spa-meatball">⋯</button> menu', () => {
        clickElement(this._notifications.item,
          ['button[aria-label^="Settings menu"]']);
      }
    );

    _deleteNotification = new Shortcut(
      'X', 'Toggle current notification deletion', async () => {
        const notification = this._notifications.item;

        /** Trigger function for {@link NH.web.otrot}. */
        function trigger() {
          // Hah.  Unlike in other places, these buttons already exist, just
          // hidden under the menu.
          const buttons = Array.from(notification.querySelectorAll('button'));
          const button = buttons
            .find(el => (/Delete .*notification/u).test(el.textContent));
          if (button) {
            button.click();
          } else {
            clickElement(notification,
              ['button[aria-label^="Undo notification deletion"]']);
          }
        }
        if (notification) {
          const what = {
            name: 'deleteNotification',
            base: document.querySelector(
              'div.scaffold-finite-scroll__content'
            ),
          };
          const how = {
            trigger: trigger,
            timeout: 3000,
          };
          await NH.web.otrot(what, how);
          this._notifications.shine();
        }
      }
    );

    #keyboardService

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
    #setupIssues = [];

    /**
     * @type {string} - CSS selector to monitor if self-managing URL changes.
     * The selector must resolve to an element that, once it exists, will
     * continue to exist for the lifetime of the SPA.
     */
    urlChangeMonitorSelector = 'body';

    /** @type {TabbedUI} */
    #ui = null;

    #id
    #logger

    /** @type {string} - Unique ID for this instance . */
    get id() {
      return this.#id;
    }

    /** @type {NH.base.Logger} - NH.base.Logger instance. */
    get logger() {
      return this.#logger;
    }

    /** Create a SPADetails instance. */
    constructor() {
      if (new.target === SPADetails) {
        throw new TypeError('Abstract class; do not instantiate directly.');
      }

      this.#logger = new NH.base.Logger(this.constructor.name);
      this.#id = NH.base.safeId(NH.base.uuId(this.constructor.name));
      this.dispatcher = new NH.base.Dispatcher('errors', 'news');
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
      const me = 'done (SPADetails)';
      this.logger.entered(me);
      this.logger.leaving(me);
    }

    /** @type {TabbedUI} */
    get ui() {
      return this.#ui;
    }

    /** @param {TabbedUI} val - UI instance. */
    set ui(val) {
      this.#ui = val;
    }

    /**
     * Handles notifications about changes to the {@link SPA} Errors tab
     * content.
     * @implements {NH.base.Dispatcher~Handler}
     * @param {string} eventType - Event type.
     * @param {number} count - Number of errors currently logged.
     */
    _errors = (eventType, count) => {
      this.logger.log('errors:', eventType, count);
    }

    /**
     * Handles notifications about activity on the {@link SPA} News tab.
     * @implements {NH.base.Dispatcher~Handler}
     * @param {string} eventType - Event type.
     * @param {object} data - Undefined at this time.
     */
    _news = (eventType, data) => {
      this.logger.log('news', eventType, data);
    }

    /** @type {SetupIssue[]} */
    get setupIssues() {
      return this.#setupIssues;
    }

    /**
     * Collects {SetupIssue}s for reporting.
     * @param {...string} msgs - Text to report.
     */
    addSetupIssue(...msgs) {
      for (const msg of msgs) {
        this.logger.log('Setup issue:', msg);
      }
      this.#setupIssues.push(msgs);
    }

    /**
     * @implements {SPA~TabGenerator}
     * @returns {TabbedUI~TabDefinition} - Where to find documentation
     * and file bugs.
     */
    docTab() {
      this.logger.log('docTab is not implemented');
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
      this.logger.log('licenseTab is not implemented');
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

    static #icon =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">' +
      '<defs>' +
      '<mask id="a" maskContentUnits="objectBoundingBox">' +
      '<path fill="#fff" d="M0 0h1v1H0z"/>' +
      '<circle cx=".5" cy=".5" r=".25"/>' +
      '</mask>' +
      '<mask id="b" maskContentUnits="objectBoundingBox">' +
      '<path fill="#fff" mask="url(#a)" d="M0 0h1v1H0z"/>' +
      '<rect x="0.375" y="-0.05" height="0.35" width="0.25"' +
      ' transform="rotate(30 0.5 0.5)"/>' +
      '</mask>' +
      '</defs>' +
      '<rect x="9.5" y="7" width="5" height="10"' +
      ' transform="rotate(45 12 12)"/>' +
      '<circle cx="6" cy="18" r="5" mask="url(#a)"/>' +
      '<circle cx="18" cy="6" r="5" mask="url(#b)"/>' +
      '</svg>';

    /**
     * @param {LinkedInGlobals} globals - Instance of a helper class to avoid
     * circular dependencies.
     */
    constructor(globals) {
      super();
      this.#globals = globals;
      this.ready = this.#waitUntilPageLoadedEnough();
    }

    /** @inheritdoc */
    done() {
      super.done();
      const me = 'done';
      this.logger.entered(me);
      const licenseEntry = this.ui.tabs.get('License');
      licenseEntry.panel.addEventListener('expose', this.#licenseHandler);
      VMKeyboardService.condition = '!inputFocus && !inDialog';
      VMKeyboardService.start();
      this.logger.leaving(me);
    }

    /** @type {string} - The element.id used to identify the info pop-up. */
    get infoId() {
      return this.#infoId;
    }

    /** @param {string} val - Set the value of the info element.id. */
    set infoId(val) {
      this.#infoId = val;
    }

    /**
     * @typedef {object} LicenseData
     * @property {string} name - Name of the license.
     * @property {string} url - License URL.
     */

    /** @type {LicenseData} */
    get licenseData() {
      const me = 'licenseData';
      this.logger.entered(me);

      if (!this.#licenseData) {
        try {
          this.#licenseData = NH.userscript.licenseData();
        } catch (e) {
          if (e instanceof NH.userscript.UserscriptError) {
            this.logger.log('e:', e);
            this.addSetupIssue(e.message);
            this.#licenseData = {
              name: 'Unable to extract: Please file a bug',
              url: '',
            };
          }
        }
      }

      this.logger.leaving(me, this.#licenseData);
      return this.#licenseData;
    }

    #useOriginalInfoDialog = !NH.xunit.testing.enabled;

    /** Hang out until enough HTML has been built to be useful. */
    #waitUntilPageLoadedEnough = async () => {
      const me = 'waitOnPageLoadedEnough';
      this.logger.entered(me);

      this.#navbar = await NH.web.waitForSelector('#global-nav', 0);
      this.#finishConstruction();

      this.logger.leaving(me);
    }

    /**
     * Many classes have some static {Scroller~How} items that need to be
     * fixed up after the page loads enough that the values are available.
     * They do that by calling this method.
     * @param {Scroller~How} how - Object to be fixed up.
     */
    navBarScrollerFixup(how) {
      const me = 'navBarScrollerFixup';
      this.logger.entered(me, how);

      how.topMarginPixels = this.#globals.navBarHeightPixels;
      how.topMarginCSS = this.#globals.navBarHeightCSS;
      how.bottomMarginCSS = '3em';

      this.logger.leaving(me, how);
    }

    /** Do the bits that were waiting on the page. */
    #finishConstruction = () => {
      const me = 'finishConstruction';
      this.logger.entered(me);

      this.#createInfoWidget();
      this.#addInfoTabs();
      this.#addLitStyle();
      this.#addToolMenuItem();
      this.#setNavBarInfo();

      this.logger.leaving(me);
    }

    /**
     * Lazily load license text when exposed.
     * @param {Event} evt - The 'expose' event.
     */
    #licenseHandler = async (evt) => {
      const me = 'licenseHandler';
      this.logger.entered(me, evt.target);

      // Probably should debounce this.  If the user visits this tab twice
      // fast enough, they end up with two copies loaded.  Amusing, but
      // probably should be resilient.
      if (!this.#licenseLoaded) {
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
          this.#licenseLoaded = true;
        }
      }

      this.logger.leaving(me);
    }

    #createInfoWidget = () => {
      this.#infoWidget = new InfoWidget('LinkedIn Tool');
      const widget = this.#infoWidget.container;
      widget.classList.add('lit-info');
      document.body.prepend(widget);
      const dismissId = NH.base.safeId(`${widget.id}-dismiss`);

      const name = this.#infoName(dismissId);
      const instructions = this.#infoInstructions();

      widget.append(name, instructions);

      document.getElementById(dismissId).addEventListener('click', () => {
        this.#infoWidget.close();
      });

      this.#infoKeyboard = new VM.shortcut.KeyboardService();
      widget.addEventListener('open', this.#onOpenInfo);
      widget.addEventListener('close', this.#onCloseInfo);
    }

    /**
     * @param {string} dismissId - Element #id to give dismiss button.
     * @returns {Element} - For the info widget name header.
     */
    #infoName = (dismissId) => {
      const name = document.createElement('div');
      name.classList.add('lit-justify');
      const title = `<b>${GM.info.script.name}</b> - ` +
            `v${GM.info.script.version}`;
      const dismiss = `<button id=${dismissId}>X</button>`;
      name.innerHTML = `<span>${title}</span><span>${dismiss}</span>`;

      return name;
    }

    /** @returns {Element} - Instructions for navigating the info widget. */
    #infoInstructions = () => {
      const instructions = document.createElement('div');
      instructions.classList.add('lit-justify');
      instructions.classList.add('lit-instructions');
      const left = SPA._parseSeq2('c-left');  // eslint-disable-line no-use-before-define
      const right = SPA._parseSeq2('c-right');  // eslint-disable-line no-use-before-define
      const esc = SPA._parseSeq2('esc');  // eslint-disable-line no-use-before-define
      instructions.innerHTML =
        `<span>Use the ${left} and ${right} keys or click to select ` +
        'tab</span>' +
        `<span>Hit ${esc} to close</span>`;

      return instructions;
    }

    #onOpenInfo = () => {
      VMKeyboardService.setKeyboardContext('inDialog', true);
      this.#infoKeyboard.enable();
      this.#buildShortcutsInfo();
      this.logger.log('info opened');
    }

    #onCloseInfo = () => {
      this.#infoKeyboard.disable();
      VMKeyboardService.setKeyboardContext('inDialog', false);
      this.logger.log('info closed');
    }

    /** Create CSS styles for stuff specific to LinkedIn Tool. */
    #addLitStyle = () => {
      const style = document.createElement('style');
      style.id = `${this.id}-style`;
      const styles = [
        '.lit-info:modal {' +
          ' height: 100%;' +
          ' width: 65rem;' +
          ' display: flex;' +
          ' flex-direction: column;' +
          '}',
        '.lit-info button {' +
          ' border-width: 1px;' +
          ' border-style: solid;' +
          ' border-radius: 1em;' +
          ' padding: 3px;' +
          '}',
        '.lit-news {' +
          ' position: absolute;' +
          ' bottom: 14px;' +
          ' right: -5px;' +
          ' width: 16px;' +
          ' height: 16px;' +
          ' border-radius: 50%;' +
          ' border: 5px solid green;' +
          '}',
        '.lit-justify {' +
          ' display: flex;' +
          ' flex-direction: row;' +
          ' justify-content: space-between;' +
          '}',
        '.lit-instructions {' +
          ' padding-bottom: 1ex;' +
          ' border-bottom: 1px solid black;' +
          ' margin-bottom: 5px;' +
          '}',
        '.lit-instructions kbd > kbd {' +
          ' font-size: 0.85em;' +
          ' padding: 0.07em;' +
          ' border-width: 1px;' +
          ' border-style: solid;' +
          '}',
      ];
      style.textContent = styles.join('\n');
      document.head.prepend(style);
    }

    #addInfoTabs = () => {
      const me = 'addInfoTabs';
      this.logger.entered(me);

      const tabs = [
        this.#shortcutsTab(),
        this.docTab(),
        this.newsTab(),
      ];

      this.#infoTabs = new TabbedUI('LinkedIn Tool');

      for (const tab of tabs) {
        this.#infoTabs.addTab(tab);
      }
      this.#infoTabs.goto(tabs[0].name);

      this.#infoWidget.container.append(this.#infoTabs.container);

      this.#infoKeyboard.register('c-right', this.#nextTab);
      this.#infoKeyboard.register('c-left', this.#prevTab);

      this.logger.leaving(me);
    }

    #nextTab = () => {
      this.#infoTabs.next();
    }

    #prevTab = () => {
      this.#infoTabs.prev();
    }

    /** Add a menu item to the global nav bar. */
    #addToolMenuItem = () => {
      const me = 'addToolMenuItem';
      this.logger.entered(me);

      const ul = document.querySelector('ul.global-nav__primary-items');
      const li = document.createElement('li');
      li.classList.add('global-nav__primary-item');
      li.innerHTML =
        '<button id="lit-nav-button" class="global-nav__primary-link">' +
        '  <div class="global-nav__primary-link-notif ' +
        'artdeco-notification-badge">' +
        '    <div class="notification-badge">' +
        '      <span class="notification-badge__count"></span>' +
        '    </div>' +
        `    <div>${LinkedIn.#icon}</div>` +
        '    <span class="lit-news-badge">TBD</span>' +
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
        this.addSetupIssue(
          'Unable to find the Profile navbar item.',
          'LIT menu installed in non-standard location.'
        );
      }
      const button = li.querySelector('button');
      button.addEventListener('click', () => {
        if (this.#useOriginalInfoDialog) {
          const info = document.querySelector(`#${this.infoId}`);
          info.showModal();
          info.dispatchEvent(new Event('open'));
        } else {
          this.#infoWidget.open();
        }
        if (NH.xunit.testing.enabled) {
          this.#useOriginalInfoDialog = !this.#useOriginalInfoDialog;

          // TODO(#145): Just here while developing
          GM.setValue('Logger', NH.base.Logger.configs);
        }
      });
      this.logger.leaving(me);
    }

    /** Set some useful global variables. */
    #setNavBarInfo = () => {
      const fudgeFactor = 4;

      this.#globals.navBarHeightPixels = this.#navbar.clientHeight +
        fudgeFactor;
    }

    /** @inheritdoc */
    _errors = (eventType, count) => {
      const me = 'errors';
      this.logger.entered(me, eventType, count);
      const button = document.querySelector('#lit-nav-button');
      const toggle = button.querySelector('.notification-badge');
      const badge = button.querySelector('.notification-badge__count');
      badge.innerText = `${count}`;
      if (count) {
        toggle.classList.add('notification-badge--show');
      } else {
        toggle.classList.remove('notification-badge--show');
      }
      this.logger.leaving(me);
    }

    /**
     * @returns {TabbedUI~TabDefinition} - Keyboard shortcuts listing.
     */
    #shortcutsTab = () => {
      this.#shortcutsWidget = new AccordionTableWidget('Shortcuts');

      const tab = {
        name: 'Keyboard Shortcuts',
        content: this.#shortcutsWidget.container,
      };
      return tab;
    }

    #buildShortcutsInfo = () => {
      const me = 'buildShortcutsInfo';
      this.logger.entered(me);

      this.#shortcutsWidget.clear();
      for (const service of VMKeyboardService.services) {
        this.logger.log('service:', service.shortName, service.active);
        // Works in progress may not have any shortcuts yet.
        if (service.shortcuts.length) {
          this.#shortcutsWidget.addSection(service.shortName);
          this.#shortcutsWidget.addHeader(service.active, service.shortName);
          for (const shortcut of service.shortcuts) {
            this.logger.log('shortcut:', shortcut);
            this.#shortcutsWidget.addData(shortcut.seq, shortcut.desc);
          }
        }
      }

      this.logger.leaving(me);
    }

    /** @inheritdoc */
    docTab() {
      const me = 'docTab';
      this.logger.entered(me);

      const issuesLink = this.#globals.ghUrl('labels/linkedin-tool');
      const newIssueLink = this.#globals.ghUrl('issues/new/choose');
      const newGfIssueLink = this.#globals.gfUrl('feedback');
      const releaseNotesLink = this.#globals.gfUrl('versions');

      const content = [
        `<p>This is information about the <b>${GM.info.script.name}</b> ` +
          'userscript, a type of add-on.  It is not associated with ' +
          'LinkedIn Corporation in any way.</p>',
        '<p>Documentation can be found on ' +
          `<a href="${GM.info.script.supportURL}">GitHub</a>.  Release ` +
          'notes are automatically generated on ' +
          `<a href="${releaseNotesLink}">Greasy Fork</a>.</p>`,
        '<p>Existing issues are also on GitHub ' +
          `<a href="${issuesLink}">here</a>.</p>`,
        '<p>New issues or feature requests can be filed on GitHub (account ' +
          `required) <a href="${newIssueLink}">here</a>.  Then select the ` +
          'appropriate issue template to get started.  Or, on Greasy Fork ' +
          `(account required) <a href="${newGfIssueLink}">here</a>.  ` +
          'Review the <b>Errors</b> tab for any useful information.</p>',
        '',
      ];

      const tab = {
        name: 'About',
        content: content.join('\n'),
      };

      this.logger.leaving(me, tab);
      return tab;
    }

    /** @inheritdoc */
    newsTab() {
      const me = 'newsTab';
      this.logger.entered(me);

      const {dates, knownIssues} = this.#preprocessKnownIssues();

      const content = [
        '<p>The contains a manually curated list of changes over the last ' +
          'month or so that:',
        '<ul>',
        '<li>Added new features like support for new pages or more ' +
          'hotkeys</li>',
        '<li>Explicitly fixed a bug</li>',
        '<li>May cause a use noticeable change</li>',
        '</ul>',
        '</p>',
        '<p>See the <b>About</b> tab for finding all changes by release.</p>',
      ];

      const dateHeader = 'h3';
      const issueHeader = 'h4';

      for (const [date, items] of dates) {
        content.push(`<${dateHeader}>${date}</${dateHeader}>`);
        for (const [issue, subjects] of items) {
          content.push(
            `<${issueHeader}>${knownIssues.get(issue)}</${issueHeader}>`
          );
          content.push('<ul>');
          for (const subject of subjects) {
            content.push(`<li>${subject}</li>`);
          }
          content.push('</ul>');
        }
      }

      const tab = {
        name: 'News',
        content: content.join('\n'),
      };

      this.logger.leaving(me);
      return tab;
    }

    /** @inheritdoc */
    licenseTab() {
      const me = 'licenseTab';
      this.logger.entered(me);

      const {name, url} = this.licenseData;
      const tab = {
        name: 'License',
        content: `<p><a href="${url}">${name}</a></p>`,
      };

      this.logger.leaving(me, tab);
      return tab;
    }

    static #knownIssues = [
      ['Bob', 'Bob has no issues'],
      ['', 'Minor internal improvement'],
      ['#106', 'info view: more tabs: News, License'],
      [
        '#110', 'info view: replace <kbd><kbd>X</kbd></kbd> with ' +
       '<kbd><kbd>Shift</kbd>+<kbd>x</kbd></kbd>',
      ],
      ['#116', 'help view: Rename as info view or something'],
      ['#130', 'Factor hotkey handling out of SPA'],
      ['#140', 'Self registering keyboard shortcuts'],
      ['#142', 'Support My Network view'],
      ['#143', 'Support jobs search view'],
      ['#144', 'Support Messaging view'],
      ['#145', 'Logger: improved controls'],
      ['#149', 'Scroller: support onclick natively'],
      ['#150', 'Scroller: handle page reloads better'],
      ['#151', 'MyNetwork: card scrolling does not work after return'],
      ['#153', 'Support Invitation manager view'],
      [
        '#154', 'Notifications: <kbd><kbd>X</kbd></kbd> no longer works to ' +
       'dismiss',
      ],
      [
        '#155', 'Jobs: The <i>More jobs few you</i> section no longer ' +
       'navigates jobs',
      ],
      [
        '#157', 'InvitationManager: Invite not scrolling into view upon ' +
       'refresh',
      ],
      [
        '#159', 'MyNetwork: Trying to <kbd><kbd>E</kbd></kbd>ngage does ' +
          'not always work',
      ],
      ['#165', 'Scroller: Wait until base shows up'],
      ['#167', 'Refactor into libraries'],
      [
        '#168', 'JobCollections: <kbd><kbd>X</kbd></kbd> will not recover ' +
          'a dismissed job card',
      ],
    ];

    static #newsContent = [
      {
        date: '2023-10-27',
        issues: ['#165'],
        subject: 'Switch `MyNetwork` to using *containerItems* for primary ' +
          '`Scroller`',
      },
      {
        date: '2023-10-27',
        issues: ['#165'],
        subject: 'Switch `Feed` to using *containerItems* for primary ' +
          '`Scroller`',
      },
      {
        date: '2023-10-22',
        issues: ['#144'],
        subject: 'Initial support for the *Messaging* page',
      },
      {
        date: '2023-10-20',
        issues: ['#106'],
        subject: 'Basic News tab',
      },
      {
        date: '2023-10-19',
        issues: ['#167'],
        subject: 'Bump lib/base to version 9, switch to that ' +
          '<i>Dispatcher</i>',
      },
      {
        date: '2023-10-18',
        issues: ['#167'],
        subject: 'Bump lib/base to version 8, for new features',
      },
      {
        date: '2023-10-17',
        issues: ['#167'],
        subject: 'Bump lib/base to version 6, switch to that <i>uuId</i>, ' +
          '<i>safeId</i>, and <i>strHash</i>',
      },
      {
        date: '2023-10-16',
        issues: ['#167'],
        subject: 'Bump lib/base to version 5, switch to that <i>Logger</i>',
      },
      {
        date: '2023-10-15',
        issues: ['#168'],
        subject: 'Implement <kbd><kbd>+</kbd></kbd> and ' +
          '<kbd><kbd>-</kbd></kbd> for thumbs-up and thumbs-down on job ' +
          'cards',
      },
      {
        date: '2023-10-15',
        issues: ['#168'],
        subject: 'Make a CSS selector case insensitive',
      },
      {
        date: '2023-10-14',
        issues: ['#167'],
        subject: 'Bump lib/base to version 3, switch to that ' +
          '<i>DefaultMap</i>',
      },
      {
        date: '2023-10-13',
        issues: ['#167'],
        subject: 'Bump lib/base to version 2, still learning the ropes',
      },
      {
        date: '2023-10-12',
        issues: ['#167'],
        subject: 'Include libraries and version numbers in the ' +
          '<b>Errors</b> tab',
      },
      {
        date: '2023-10-12',
        issues: ['#167'],
        subject: 'First use of the new base library',
      },
      {
        date: '2023-10-12',
        issues: ['#150'],
        subject: 'Rip out <i>Jobs</i> Rube Goldberg device for monitoring ' +
          'changes',
      },
      {
        date: '2023-10-11',
        issues: ['#145'],
        subject: 'Plug in loading saved <i>Logger</i> configs (dev only)',
      },
      {
        date: '2023-10-11',
        issues: ['#145'],
        subject: 'Implement setting configs from an object',
      },
      {
        date: '2023-10-11',
        issues: ['#145'],
        subject: 'Remove explicit setting of <i>Logger</i>s for debug ' +
          'reasons',
      },
      {
        date: '2023-10-11',
        issues: ['#145'],
        subject: 'Initial implementation of saving <i>Logger</i> config ' +
          '(dev only)',
      },
      {
        date: '2023-10-10',
        issues: ['#149'],
        subject: 'Migrate all secondary <i>Scroller</i>s to using ' +
          '<i>autoActivate</i>',
      },
      {
        date: '2023-10-10',
        issues: ['#149'],
        subject: 'Give <i>Scroller</i> the option to call <i>activate</i> ' +
          'upon construction',
      },
      {
        date: '2023-10-10',
        issues: ['#149'],
        subject: 'Have all secondary <i>Scroller</i>s created immediately',
      },
      {
        date: '2023-10-09',
        issues: ['#143'],
        subject: 'Initial work selecting job card on initial page load',
      },
      {
        date: '2023-10-09',
        issues: ['#143'],
        subject: 'Change the job card <i>Scroller</i> to use a different ' +
          'element',
      },
      {
        date: '2023-10-09',
        issues: ['#143'],
        subject: 'Give the job cards a bottom scroll margin as well',
      },
      {
        date: '2023-10-09',
        issues: ['#143'],
        subject: 'Change hotkey from <kbd><kbd>Enter</kbd></kbd> to ' +
          '<kbd>c</kbd>',
      },
      {
        date: '2023-10-09',
        issues: ['#143'],
        subject: 'Give pagination <i>Scroller</i> a bit of a buffer on the ' +
          'bottom',
      },
      {
        date: '2023-10-09',
        issues: ['#143'],
        subject: 'Allow pagination <i>Scroller</i> to get focus',
      },
      {
        date: '2023-10-09',
        issues: ['#143'],
        subject: 'Change the pagination <i>Scroller</i> to use a different ' +
          'element',
      },
      {
        date: '2023-10-08',
        issues: ['#143'],
        subject: 'Implement toggle the job search ' +
          'a<kbd><kbd>L</kbd></kbd>ert',
      },
      {
        date: '2023-10-08',
        issues: ['#143'],
        subject: 'Implement opening the job <kbd><kbd>s</kbd></kbd>hare menu',
      },
      {
        date: '2023-10-08',
        issues: ['#143'],
        subject: 'Implement <kbd><kbd>A</kbd></kbd>pply to job',
      },
      {
        date: '2023-10-08',
        issues: ['#143'],
        subject: 'Implement toggle to <kbd><kbd>F</kbd></kbd>ollow the ' +
          'company',
      },
      {
        date: '2023-10-08',
        issues: ['#143'],
        subject: 'Implement <kbd><kbd>=</kbd></kbd> to open the job ' +
          'details menu',
      },
      {
        date: '2023-10-08',
        issues: ['#143'],
        subject: 'Update focusing on the details pane',
      },
      {
        date: '2023-10-08',
        issues: ['#143'],
        subject: 'Explicitly set <i>snapToTop</i> false',
      },
      {
        date: '2023-10-08',
        issues: ['#143'],
        subject: 'Implement <kbd><kbd>S</kbd></kbd>ave job toggle',
      },
      {
        date: '2023-10-08',
        issues: ['#149'],
        subject: 'Remove all click handling from <i>Page</i> and subclasses',
      },
      {
        date: '2023-10-08',
        issues: ['#149'],
        subject: 'Enable click handling by default in <i>Scroller</i>',
      },
      {
        date: '2023-10-08',
        issues: ['#143'],
        subject: 'Use <kbd><kbd>X</kbd></kbd> to toggle dismissing job',
      },
      {
        date: '2023-10-07',
        issues: ['#143'],
        subject: 'Use <kbd><kbd>d</kbd></kbd> to jump to the job details ' +
          'pane',
      },
      {
        date: '2023-10-07',
        issues: ['#149'],
        subject: 'Switch <i>Feed</i> to use the new <i>Scroller</i> click ' +
          'handler',
      },
      {
        date: '2023-10-07',
        issues: ['#143'],
        subject: 'Support the <i>/jobs/{collections,search}/</i> pages',
      },
      {
        date: '2023-10-06',
        issues: [''],
        subject: 'Rename <i>Information</i> tab to <i>About</i>',
      },
      {
        date: '2023-10-06',
        issues: ['#159'],
        subject: 'The <i>MyNetwork</i> cards need more selectors',
      },
      {
        date: '2023-10-06',
        issues: ['#142'],
        subject: 'Change <i>MyNetwork</i> card viewing from ' +
          '<kbd><kbd>v</kbd></kbd> to <kbd><kbd>Enter</kbd></kbd>',
      },
      {
        date: '2023-10-05',
        issues: ['#157'],
        subject: 'Enable some logging while working on this issue',
      },
      {
        date: '2023-10-05',
        issues: ['#157'],
        subject: 'Additional logging',
      },
      {
        date: '2023-10-04',
        issues: ['#153'],
        subject: 'Track current invite so it can be found again later',
      },
      {
        date: '2023-10-04',
        issues: ['#140'],
        subject: 'Migrate <i>Notifications</i> to self-registering shortcuts',
      },
      {
        date: '2023-10-03',
        issues: ['#154'],
        subject: 'Update text used to find a button',
      },
      {
        date: '2023-10-03',
        issues: ['#153'],
        subject: 'Support clicking on an invite to select it',
      },
      {
        date: '2023-10-01',
        issues: ['#153'],
        subject: 'Implement many <i>Invitation manager</i> actions',
      },
      {
        date: '2023-09-30',
        issues: ['#140'],
        subject: 'Migrate <i>Feed</i> to self-registering shortcuts',
      },
      {
        date: '2023-09-29',
        issues: ['#153'],
        subject: 'Support the <i>/mynetwork/invitation-manager/</i> page',
      },
      {
        date: '2023-09-29',
        issues: ['#142'],
        subject: 'Correct the description for <kbd><kbd>f</kbd></kbd>ocus',
      },
      {
        date: '2023-09-29',
        issues: ['#151'],
        subject: 'Reset card scroller when revisiting the <i>MyNetwork</i> ' +
          'page',
      },
      {
        date: '2023-09-28',
        issues: ['#140'],
        subject: 'Migrate <i>Global</i> to self-registering shortcuts',
      },
      {
        date: '2023-09-28',
        issues: ['#142'],
        subject: 'Enable <kbd><kbd>X</kbd></kbd> to dismiss a card',
      },
      {
        date: '2023-09-28',
        issues: ['#142'],
        subject: 'Disable debugging in card scroller',
      },
      {
        date: '2023-09-27',
        issues: ['#142'],
        subject: 'Add <kbd><kbd>E</kbd></kbd>ngage as a way to interact ' +
          'with the current card',
      },
      {
        date: '2023-09-27',
        issues: ['#142'],
        subject: 'Reword <i>Activate</i> to <i>View</i>',
      },
    ];

    #globals
    #infoId
    #infoKeyboard
    #infoTabs
    #infoWidget
    #licenseData
    #licenseLoaded
    #navbar
    #shortcutsWidget

    /** @returns {obj} - dates and known issues. */
    #preprocessKnownIssues = () => {
      const knownIssues = new Map(LinkedIn.#knownIssues);
      const unknownIssues = new Set();
      const unusedIssues = new Set(knownIssues.keys());

      const dates = new NH.base.DefaultMap(
        () => new NH.base.DefaultMap(Array)
      );

      for (const item of LinkedIn.#newsContent) {
        for (const issue of item.issues) {
          if (knownIssues.has(issue)) {
            unusedIssues.delete(issue);
            dates.get(item.date).get(issue)
              .push(item.subject);
          } else {
            unknownIssues.add(issue);
          }
        }
      }

      this.logger.log('unknown', unknownIssues);
      this.logger.log('unused', unusedIssues);

      if (unknownIssues.size) {
        throw new Error('Unknown issues were detected.');
      }

      return {
        dates: dates,
        knownIssues: knownIssues,
      };
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

    #details
    #id
    #logger
    #name
    #oldUrl

    /** @type {NH.base.Logger} */
    get logger() {
      return this.#logger;
    }

    /** @type {Set<Page>} - Currently active {Page}s. */
    #activePages = new Set();

    /** @type {Set<Page>} - Registered {Page}s. */
    #pages = new Set();

    /** @type {Element} - The most recent element to receive focus. */
    _lastInputElement = null;

    /** @type {KeyboardService} */
    _tabUiKeyboard = null;

    /** @param {SPADetails} details - Implementation specific details. */
    constructor(details) {
      this.#name = `${this.constructor.name}: ${details.constructor.name}`;
      this.#id = NH.base.safeId(NH.base.uuId(this.#name));
      this.#logger = new NH.base.Logger(this.#name);
      this.#details = details;
      this.#details.init(this);
      this._installNavStyle();
      this._initializeInfoView();
      for (const issue of details.setupIssues) {
        this.logger.log('issue:', issue);
        for (const error of issue) {
          this.addError(error);
        }
        this.addErrorMarker();
      }
      document.addEventListener('focus', this._onFocus, true);
      document.addEventListener('urlchange', this.#onUrlChange, true);
      this.#startUrlMonitor();
      this.#details.done();
    }

    /** @type {SPADetails} */
    get details() {
      return this.#details;
    }

    /**
     * Tampermonkey was the first(?) userscript manager to provide events
     * about URLs changing.  Hence the need for `@grant window.onurlchange` in
     * the UserScript header.
     * @fires Event#urlchange
     */
    #startUserscriptManagerUrlMonitor = () => {
      this.logger.log('Using Userscript Manager provided URL monitor.');
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
    #startMutationObserverUrlMonitor = async () => {
      this.logger.log('Using MutationObserver for monitoring URL changes.');

      const observeOptions = {childList: true, subtree: true};

      const element = await NH.web.waitForSelector(
        this.#details.urlChangeMonitorSelector, 0
      );
      this.logger.log('element exists:', element);

      this.#oldUrl = new URL(window.location);
      new MutationObserver(() => {
        const newUrl = new URL(window.location);
        if (this.#oldUrl.href !== newUrl.href) {
          const evt = new CustomEvent('urlchange', {detail: {url: newUrl}});
          this.#oldUrl = newUrl;
          document.dispatchEvent(evt);
        }
      }).observe(element, observeOptions);
    }

    /** Select which way to monitor the URL for changes and start it. */
    #startUrlMonitor = () => {
      if (window.onurlchange === null) {
        this.#startUserscriptManagerUrlMonitor();
      } else {
        this.#startMutationObserverUrlMonitor();
      }
    }

    /**
     * Set the context (used by VM.shortcut) to a specific value.
     * @param {string} context - The name of the context.
     * @param {object} state - What the value should be.
     */
    _setKeyboardContext(context, state) {
      const pages = Array.from(this.#pages.values());
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
    #onUrlChange = (evt) => {
      this.activate(evt.detail.url.pathname);
    }

    /** Configure handlers for the info view. */
    _addInfoViewHandlers() {
      const errors = document.querySelector(
        `#${this._infoId} [data-spa-id="errors"]`
      );
      errors.addEventListener('change', (evt) => {
        const count = evt.target.value.split('\n')
          .filter(x => x === SPA._errorMarker).length;
        this.#details.dispatcher.fire('errors', count);
        this._updateInfoErrorsLabel(count);
      });
    }

    /** Create the CSS styles used for indicating the current items. */
    _installNavStyle() {
      const style = document.createElement('style');
      style.id = NH.base.safeId(`${this.#id}-nav-style`);
      const styles = [
        '.tom {' +
          ' border-color: orange !important;' +
          ' border-style: solid !important;' +
          ' border-width: medium !important;' +
          '}',
        '.dick {' +
          ' border-color: red !important;' +
          ' border-style: solid !important;' +
          ' border-width: thin !important;' +
          '}',
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
    _addInfoStyle() {  // eslint-disable-line max-lines-per-function
      const style = document.createElement('style');
      style.id = NH.base.safeId(`${this.#id}-info-style`);
      const styles = [
        `#${this._infoId}:modal {` +
          ' height: 100%;' +
          ' width: 65rem;' +
          ' display: flex;' +
          ' flex-direction: column;' +
          '}',
        `#${this._infoId} .left { text-align: left; }`,
        `#${this._infoId} .right { text-align: right; }`,
        `#${this._infoId} .spa-instructions {` +
          ' display: flex;' +
          ' flex-direction: row;' +
          ' padding-bottom: 1ex;' +
          ' border-bottom: 1px solid black;' +
          ' margin-bottom: 5px;' +
          '}',
        `#${this._infoId} .spa-instructions > span { flex-grow: 1; }`,
        `#${this._infoId} textarea[data-spa-id="errors"] {` +
          ' flex-grow: 1;' +
          ' resize: none;' +
          '}',
        `#${this._infoId} .spa-danger { background-color: red; }`,
        `#${this._infoId} .spa-current-page { background-color: lightgray; }`,
        `#${this._infoId} kbd > kbd {` +
          ' font-size: 0.85em;' +
          ' padding: 0.07em;' +
          ' border-width: 1px;' +
          ' border-style: solid;' +
          '}',
        `#${this._infoId} p { margin-bottom: 1em; }`,
        `#${this._infoId} th { padding-top: 1em; text-align: left; }`,
        `#${this._infoId} td:first-child {` +
          ' white-space: nowrap;' +
          ' text-align: right;' +
          ' padding-right: 0.5em;' +
          '}',
        // The "color: unset" addresses dimming because these display-only
        // buttons are disabled.
        `#${this._infoId} button {` +
          ' border-width: 1px;' +
          ' border-style: solid;' +
          ' border-radius: 1em;' +
          ' color: unset;' +
          ' padding: 3px;' +
          '}',
        `#${this._infoId} ul {` +
          ' padding-inline: revert !important;' +
          '}',
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
      name.innerHTML = `<b>${GM.info.script.name}</b> - ` +
        `v${GM.info.script.version}`;
      const instructions = document.createElement('div');
      instructions.classList.add('spa-instructions');
      const left = SPA._parseSeq2('c-left');
      const right = SPA._parseSeq2('c-right');
      const esc = SPA._parseSeq2('esc');
      instructions.innerHTML =
        `<span class="left">Use the ${left} and ${right} keys or ` +
        'click to select tab</span>' +
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

      this._info = new TabbedUI(`${this.#name} Info`);
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
        VMKeyboardService.setKeyboardContext('inDialog', true);
        this._tabUiKeyboard.enable();
        for (const {panel} of this._info.tabs.values()) {
          // 0, 0 is good enough
          panel.scrollTo(0, 0);
        }
      });
      dialog.addEventListener('close', () => {
        this._setKeyboardContext('inDialog', false);
        VMKeyboardService.setKeyboardContext('inDialog', false);
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
      const header = 'Please consider including some of the following ' +
            'information in any bug report:';

      // TODO(#167): Migrating to lib/userscript.js

      const msgs = [`${gm.script.name}: ${gm.script.version}`];

      for (const [lib, obj] of Object.entries(NH)) {
        if (Object.hasOwn(obj, 'version')) {
          msgs.push(`  ${lib}: ${obj.version}`);
        } else {
          msgs.push(`  ${lib}: Unknown version`);
        }
      }

      msgs.push(`Userscript manager: ${gm.scriptHandler} ${gm.version}`);

      if (gm.injectInto) {
        msgs.push(`  injected into "${gm.injectInto}"`);
      }

      // Violentmonkey
      if (gm.platform) {
        msgs.push(`Platform: ${gm.platform.browserName} ` +
                  `${gm.platform.browserVersion} ${gm.platform.os} ` +
                  `${gm.platform.arch}`);
      }

      // Tampermonkey
      if (gm.userAgentData) {
        let msg = 'Platform: ';
        for (const brand of gm.userAgentData.brands.values()) {
          msg += `${brand.brand} ${brand.version} `;
        }
        msg += `${gm.userAgentData?.platform} `;
        msg +=
          `${gm.userAgentData?.architecture}-${gm.userAgentData?.bitness}`;
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
          '<p>Any information in the text box below could be helpful in ' +
            'fixing a bug.</p>',
          '<p>The content can be edited and then included in a bug ' +
            'report.  Different errors should be separated by ' +
            `"${SPA._errorMarker}".</p>`,
          '<p><b>Please remove any identifying information before ' +
            'including it in a bug report!</b></p>',
          SPA._errorPlatformInfo(),
          '<textarea data-spa-id="errors" spellcheck="false" ' +
            'placeholder="No errors logged yet."></textarea>',
        ].join(''),
      };
    }

    /** Set up everything necessary to get the info view going. */
    _initializeInfoView() {
      this._infoId = `info-${this.#id}`;
      this.#details.infoId = this._infoId;
      this._initializeTabUiKeyboard();

      const tabGenerators = [
        SPA._shortcutsTab(),
        this.#details.docTab(),
        this.#details.newsTab(),
        SPA._errorTab(),
        this.#details.licenseTab(),
      ];

      this._addInfoStyle();
      this._addInfoDialog(tabGenerators);
      this.#details.ui = this._info;
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
      for (const {seq, desc} of page.allShortcuts) {
        const keys = SPA._parseSeq2(seq);
        s += `<tr><td>${keys}:</td><td>${desc}</td></tr>`;
      }
      // Don't include works in progress that have no keys yet.
      if (page.allShortcuts.length) {
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
      this.logger.entered(me, count);
      const label = this._info.tabs.get('Errors').label;
      if (count) {
        this._info.goto('Errors');
        label.classList.add('spa-danger');
      } else {
        label.classList.remove('spa-danger');
      }
      this.logger.leaving(me);
    }

    /**
     * Get the hot keys tab header element for this page.
     * @param {Page} page - Page to find.
     * @returns {?Element} - Element that acts as the header.
     */
    _pageHeader(page) {
      const me = 'pageHeader';
      this.logger.entered(me, page);
      let element = null;
      if (page) {
        const pageId = this._pageInfoId(page);
        this.logger.log('pageId:', pageId);
        element = document.querySelector(`#${pageId}`);
      }
      this.logger.leaving(me, element);
      return element;
    }

    /**
     * Highlight information about the page in the hot keys tab.
     * @param {Page} page - Page to shine.
     */
    _shine(page) {
      const me = 'shine';
      this.logger.entered(me, page);
      const element = this._pageHeader(page);
      element?.classList.add('spa-current-page');
      this.logger.leaving(me);
    }

    /**
     * Remove highlights from this page in the hot keys tab.
     * @param {Page} page - Page to dull.
     */
    _dull(page) {
      const me = 'dull';
      this.logger.entered(me, page);
      const element = this._pageHeader(page);
      element?.classList.remove('spa-current-page');
      this.logger.leaving(me);
    }

    /**
     * Add content to the Errors tab so the user can use it to file feedback.
     * @param {string} content - Information to add.
     */
    addError(content) {
      const errors = document.querySelector(
        `#${this._infoId} [data-spa-id="errors"]`
      );
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
     * @param {function(SPA): Page} Klass - A {Page} class to instantiate.
     */
    register(Klass) {
      if (Klass.prototype instanceof Page) {
        const page = new Klass(this);
        page.start();
        this._addInfo(page);
        this.#pages.add(page);
      } else {
        throw new Error(`${Klass.name} is not a Page`);
      }
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
      const pages = Array.from(this.#pages.values());
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
      {test: 'c-a-t',
        expected: '<kbd><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+' +
       '<kbd>t</kbd></kbd>'},
      {test: 'a-c-T',
        expected: '<kbd><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+' +
       '<kbd>Shift</kbd>+<kbd>t</kbd></kbd>'},
      {test: 'c-down esc',
        expected: '<kbd><kbd>Ctrl</kbd>+<kbd>↓</kbd> ' +
       'then <kbd>ESC</kbd></kbd>'},
      {test: 'alt-up tab',
        expected: '<kbd><kbd>Alt</kbd>+<kbd>↑</kbd> ' +
       'then <kbd>TAB</kbd></kbd>'},
      {test: 'shift-X control-alt-del',
        expected: '<kbd><kbd>Shift</kbd>+<kbd>x</kbd> ' +
       'then <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>DEL</kbd></kbd>'},
      {test: 'c-x c-v',
        expected: '<kbd><kbd>Ctrl</kbd>+<kbd>x</kbd> ' +
       'then <kbd>Ctrl</kbd>+<kbd>v</kbd></kbd>'},
      {test: 'a-x enter',
        expected: '<kbd><kbd>Alt</kbd>+<kbd>x</kbd> ' +
       'then <kbd>ENTER</kbd></kbd>'},
      {test: 'up up down down left right left right b shift-a enter',
        expected: '<kbd><kbd>↑</kbd> then <kbd>↑</kbd> then <kbd>↓</kbd> ' +
       'then <kbd>↓</kbd> then <kbd>←</kbd> then <kbd>→</kbd> ' +
       'then <kbd>←</kbd> then <kbd>→</kbd> then <kbd>b</kbd> ' +
       'then <kbd>Shift</kbd>+<kbd>a</kbd> then <kbd>ENTER</kbd></kbd>'},
    ];

    for (const {test, expected} of tests) {
      const actual = SPA._parseSeq2(test);
      const passed = actual === expected;
      const msg = `t:${test} e:${expected} a:${actual}, p:${passed}`;
      NH.xunit.testing.log.log(msg);
      if (!passed) {
        throw new Error(msg);
      }
    }
  }

  NH.xunit.testing.funcs.push(testParseSeq);

  NH.xunit.testing.run();

  const linkedIn = new LinkedIn(linkedInGlobals);

  // Inject some test errors
  if (NH.xunit.testing.enabled) {
    linkedIn.addSetupIssue('This is a dummy test issue.',
      'It was added because NH.xunit.testing is enabled.');
    linkedIn.addSetupIssue('This is a second issue.',
      'We just want to make sure things count properly.');
  }

  await linkedIn.ready;
  log.log('proceeding...');

  const spa = new SPA(linkedIn);
  spa.register(Global);
  spa.register(Feed);
  spa.register(MyNetwork);
  spa.register(Messaging);
  spa.register(InvitationManager);
  spa.register(Jobs);
  spa.register(JobCollections);
  spa.register(Notifications);
  spa.activate(window.location.pathname);

  log.log('Initialization successful.');

})();
