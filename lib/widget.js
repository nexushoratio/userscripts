// ==UserScript==
// ==UserLibrary==
// @name        NH_widget
// @description Widgets for user interactions.
// @version     1
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

// An experimental feature to use the https://w2ui.com library is being
// tested.  https://github.com/nexushoratio/userscripts/issues/185

// Eventually it might be wrapped by this library to.  For now, require widget
// as normal, and also add the following lines to your application:

// @require     https://cdn.jsdelivr.net/npm/w2ui@2.0.0/w2ui-2.0.js
// @resource    w2uiCss https://cdn.jsdelivr.net/npm/w2ui@2.0.0/w2ui-2.0.min.css
// @grant       GM.getResourceUrl

// await NH.widget.w2uiCssInstall();

window.NexusHoratio.widget = (function widget() {
  'use strict';

  /** @type {number} - Bumped per release. */
  const version = 1;

  const NH = window.NexusHoratio.base.ensure([{name: 'base'}]);

  /** Verifies w2ui is loaded and then installs the necessary CSS. */
  async function w2uiCssInstall() {
    const CSS_KEY = 'w2uiCss';

    if (!window.w2base) {
      throw new Error('The w2ui library was not loaded.');
    }

    if (!GM.getResourceUrl) {
      throw new Error('Access to "GM.getResourceUrl" has not been granted.');
    }

    const href = await GM.getResourceUrl(CSS_KEY);
    if (!href) {
      throw new Error(`"${CSS_KEY}" not found as userscript resource.`);
    }

    const link = document.createElement('link');
    link.href = href;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    document.head.append(link);
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

  /**
   * A widget that can be opened and closed on demand, designed for fairly
   * persistent information.
   *
   * The element will get `open` and `close` events.
   */
  class Info extends Widget {

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

  return {
    version: version,
    w2uiCssInstall: w2uiCssInstall,
    Widget: Widget,
    Info: Info,
  };

}());
