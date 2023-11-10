// ==UserScript==
// ==UserLibrary==
// @name        NH_widget
// @description Widgets for user interactions.
// @version     4
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

window.NexusHoratio.widget = (function widget() {
  'use strict';

  /** @type {number} - Bumped per release. */
  const version = 4;

  const NH = window.NexusHoratio.base.ensure([{name: 'base'}]);

  /**
   * Base class for rendering widgets.
   *
   * Subclasses should NOT override methods here, except for constructor().
   * Instead they should register listeners for appropriate events.
   *
   * Generally, methods will fire two event verbs.  The first, in present
   * tense, will instruct what should happen (build, destroy, etc).  The
   * second, in past tense, will describe what should have happened (built,
   * destroyed, etc).  Typically, subclasses will act upon the present tense,
   * and users of the class may act upon the past tense.
   *
   * Methods should generally be able to be chained.
   *
   * When a Widget is instantiated, it should only create a container of the
   * requested type (done in this base class).  The container property can
   * then be placed into the DOM.
   *
   * The build() method will fire 'build'/'built' events.  Subclasses then
   * populate the container with HTML as appropriate.  Widgets should
   * generally be designed to not update the internal HTML until build() is
   * explicitly called.
   *
   * The destroy() method will fire 'destroy'/'destroyed' events and also
   * clear the innerHTML of the container.  Subclasses are responsible for any
   * internal cleanup, such as nested Widgets.
   */
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
      this.#dispatcher = new NH.base.Dispatcher();
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

    /**
     * Attach a function to an eventType.
     * @param {string} eventType - Event type to connect with.
     * @param {Handler} func - Single argument function to call.
     * @returns {NH.base.Widget} - This instance, for chaining.
     */
    on(eventType, func) {
      this.#dispatcher.on(eventType, func);
      return this;
    }

    /**
     * Remove all instances of a function registered to an eventType.
     * @param {string} eventType - Event type to disconnect from.
     * @param {NH.base.Handler} func - Function to remove.
     * @returns {Widget} - This instance, for chaining.
     */
    off(eventType, func) {
      this.#dispatcher.off(eventType, func);
      return this;
    }

    #container
    #dispatcher
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
    Widget: Widget,
    Info: Info,
  };

}());
