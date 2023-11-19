// ==UserScript==
// ==UserLibrary==
// @name        NH_widget
// @description Widgets for user interactions.
// @version     11
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
  const version = 11;

  const NH = window.NexusHoratio.base.ensure([
    {name: 'xunit', minVersion: 19},
    {name: 'base'},
  ]);

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
   * If a variable holding a widget is set to a new value, the previous widget
   * should be explicitly destroyed.
   *
   * When a Widget is instantiated, it should only create a container of the
   * requested type (done in this base class).  And install any widget styles
   * it needs in order to function.  The container property can then be placed
   * into the DOM.
   *
   * If a Widget needs specific CSS to function, that CSS should be shared
   * across all instances of the Widget by using the same values in a call to
   * installStyle().  Anything used for presentation should include the
   * Widget's id as part of the style's id.
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
     * Each subclass should take a caller provided name.
     * @param {string} name - Name for this instance.
     * @param {string} element - Type of element to use for the container.
     */
    constructor(name, element) {
      if (new.target === Widget) {
        throw new TypeError('Abstract class; do not instantiate directly.');
      }

      this.#name = `${this.constructor.name} ${name}`;
      this.#id = NH.base.uuId(NH.base.safeId(this.name));
      this.#container = document.createElement(element);
      this.#container.id = `${this.id}-container`;
      this.#dispatcher = new NH.base.Dispatcher(...Widget.#knownEvents);
      this.#logger = new NH.base.Logger(`${this.constructor.name}`);
      this.#visible = true;

      this.installStyle('nh-widget',
        [`.${Widget.classHidden} {display: none}`]);
    }

    /** @type {string} - CSS class applied to hide element. */
    static get classHidden() {
      return 'nh-widget-hidden';
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

    /** @type {boolean} */
    get visible() {
      return this.#visible;
    }

    /**
     * Materialize the contents into the container.
     *
     * Each time this is called, the Widget should repopulate the contents.
     * @fires 'build' 'built'
     * @returns {NH.base.Widget} - This instance, for chaining.
     */
    build() {
      this.#dispatcher.fire('build', this);
      this.#dispatcher.fire('built', this);
      return this;
    }

    /**
     * Tears down internals.  E.g., any Widget that has other Widgets should
     * call their destroy() method as well.
     * @fires 'destroy' 'destroyed'
     * @returns {NH.base.Widget} - This instance, for chaining.
     */
    destroy() {
      this.#container.innerHTML = '';
      this.#dispatcher.fire('destroy', this);
      this.#dispatcher.fire('destroyed', this);
      return this;
    }

    /**
     * Tears down internals.  E.g., any Widget that has other Widgets should
     * call their destroy() method as well.
     * @fires 'show' 'showed'
     * @returns {NH.base.Widget} - This instance, for chaining.
     */
    show() {
      this.#dispatcher.fire('show', this);
      this.container.classList.remove(Widget.classHidden);
      this.#visible = true;
      this.#dispatcher.fire('showed', this);
      return this;
    }

    /**
     * Tears down internals.  E.g., any Widget that has other Widgets should
     * call their destroy() method as well.
     * @fires 'hide' 'hidden'
     * @returns {NH.base.Widget} - This instance, for chaining.
     */
    hide() {
      this.#dispatcher.fire('hide', this);
      this.container.classList.add(Widget.classHidden);
      this.#visible = false;
      this.#dispatcher.fire('hidden', this);
      return this;
    }

    /** Clears the container element. */
    clear() {
      this.logger.log('clear is deprecated');
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

    /**
     * Install a style if not already present.
     *
     * It will NOT overwrite an existing one.
     * @param {string} id - Base to use for the style id.
     * @param {string[]} rules - CSS rules in 'selector { declarations }'.
     * @returns {HTMLStyleElement} - Resulting <style> element.
     */
    installStyle(id, rules) {
      const me = 'installStyle';
      this.logger.entered(me, id, rules);

      const safeId = `${NH.base.safeId(id)}-style`;
      let style = document.querySelector(`#${safeId}`);
      if (!style) {
        style = document.createElement('style');
        style.id = safeId;
        style.textContent = rules.join('\n');
        document.head.append(style);
      }

      this.logger.leaving(me, style);
      return style;
    }

    static #knownEvents = [
      'build',
      'built',
      'destroy',
      'destroyed',
      'show',
      'showed',
      'hide',
      'hidden',
    ];

    #container
    #dispatcher
    #id
    #logger
    #name
    #visible

  }

  /* eslint-disable require-jsdoc */
  class Test extends Widget {

    constructor() {
      super('test', 'section');
    }

  }
  /* eslint-enable */

  /* eslint-disable no-magic-numbers */
  /* eslint-disable no-new */
  /* eslint-disable require-jsdoc */
  class WidgetTestCase extends NH.xunit.TestCase {

    testAbstract() {
      this.assertRaises(TypeError, () => {
        new Widget();
      });
    }

    testProperties() {
      // Assemble
      const w = new Test();

      // Assert
      this.assertTrue(w.container instanceof HTMLElement, 'element');
      this.assertRegExp(w.container.id, /^Test.*-container$/u, 'container');

      this.assertRegExp(w.id, /^Test-test.*-.*-/u, 'id');
      this.assertTrue(w.logger instanceof NH.base.Logger, 'logger');
      this.assertEqual(w.name, 'Test test', 'name');
    }

    testSimpleEvents() {
      // Assemble
      const calls = [];
      const cb = (...rest) => {
        calls.push(rest);
      };
      const w = new Test().on('build', cb)
        .on('built', cb)
        .on('destroy', cb)
        .on('destroyed', cb)
        .on('show', cb)
        .on('showed', cb)
        .on('hide', cb)
        .on('hidden', cb);

      // Act
      w.build().show()
        .hide()
        .destroy();

      // Assert
      this.assertEqual(calls, [
        ['build', w],
        ['built', w],
        ['show', w],
        ['showed', w],
        ['hide', w],
        ['hidden', w],
        ['destroy', w],
        ['destroyed', w],
      ]);
    }

    testDestroyCleans() {
      // Assemble
      const w = new Test();
      // XXX: Broken HTML on purpose
      w.container.innerHTML = '<p>Paragraph<p>';

      this.assertEqual(w.container.innerHTML,
        '<p>Paragraph</p><p></p>',
        'html got fixed');
      this.assertEqual(w.container.children.length, 2, 'initial count');

      // Act
      w.destroy();

      // Assert
      this.assertEqual(w.container.children.length, 0, 'post destroy count');
    }

    testHideShow() {
      // Assemble
      const w = new Test();

      this.assertTrue(w.visible, 'init vis');
      this.assertFalse(w.container.classList.contains(Widget.classHidden),
        'init class');

      w.hide();

      this.assertFalse(w.visible, 'hide vis');
      this.assertTrue(w.container.classList.contains(Widget.classHidden),
        'hide class');

      w.show();

      this.assertTrue(w.visible, 'show viz');
      this.assertFalse(w.container.classList.contains(Widget.classHidden),
        'show class');
    }

    testOnOff() {
      // Assemble
      const calls = [];
      const cb = (...rest) => {
        calls.push(rest);
      };
      const w = new Test().on('build', cb)
        .on('built', cb)
        .on('destroyed', cb)
        .off('build', cb)
        .on('destroy', cb)
        .off('destroyed', cb);

      // Act
      w.build().hide()
        .show()
        .destroy();

      // Assert
      this.assertEqual(calls, [
        ['built', w],
        ['destroy', w],
      ]);
    }

  }
  /* eslint-enable */

  NH.xunit.testing.testCases.push(WidgetTestCase);

  /**
   * An adapter for raw HTML.
   *
   * Other Widgets may use this to wrap any HTML they may be handed so they do
   * not need to special case their implementation outside of construction.
   */
  class StringAdapter extends Widget {

    /**
     * @param {string} name - Name for this instance.
     * @param {string} content - Item to be adapted.
     */
    constructor(name, content) {
      super(name, 'content');
      this.#content = content;
      this.on('build', this.#onBuild);
    }

    #content

    #onBuild = (...rest) => {
      const me = 'onBuild';
      this.logger.entered(me, rest);

      this.container.innerHTML = this.#content;

      this.logger.leaving(me);
    }

  }

  /* eslint-disable no-new-wrappers */
  /* eslint-disable require-jsdoc */
  class StringAdapterTestCase extends NH.xunit.TestCase {

    testPrimitiveString() {
      // Assemble
      let p = '<p id="bob">This is my paragraph.</p>';
      const content = new StringAdapter(this.id, p);

      // Act
      content.build();

      // Assert
      this.assertTrue(content.container instanceof HTMLUnknownElement,
        'is HTMLUnknownElement');
      this.assertTrue((/my paragraph./u).test(content.container.innerText),
        'expected text');
      this.assertEqual(content.container.firstChild.tagName, 'P', 'is para');
      this.assertEqual(content.container.firstChild.id, 'bob', 'is bob');

      // Tweak
      content.container.firstChild.id = 'joe';
      this.assertNotEqual(content.container.firstChild.id, 'bob', 'not bob');

      // Rebuild
      content.build();
      this.assertEqual(content.container.firstChild.id, 'bob', 'bob again');

      // Tweak - Not a live string
      p = '<p id="changed">New para.</p>';
      this.assertEqual(content.container.firstChild.id, 'bob', 'still bob');
    }

    testStringObject() {
      // Assemble
      const p = new String('<p id="pat">This is my paragraph.</p>');
      const content = new StringAdapter(this.id, p);

      // Act
      content.build();
      // Assert
      this.assertTrue(content.container instanceof HTMLUnknownElement,
        'is HTMLUnknownElement');
      this.assertTrue((/my paragraph./u).test(content.container.innerText),
        'expected text');
      this.assertEqual(content.container.firstChild.tagName, 'P', 'is para');
      this.assertEqual(content.container.firstChild.id, 'pat', 'is pat');
    }

  }
  /* eslint-enable */

  NH.xunit.testing.testCases.push(StringAdapterTestCase);

  /**
   * An adapter for HTMLElement.
   *
   * Other Widgets may use this to wrap any HTMLElements they may be handed so
   * they do not need to special case their implementation outside of
   * construction.
   */
  class ElementAdapter extends Widget {

    /**
     * @param {string} name - Name for this instance.
     * @param {HTMLElement} content - Item to be adapted.
     */
    constructor(name, content) {
      super(name, 'content');
      this.#content = content;
      this.on('build', this.#onBuild);
    }

    #content

    #onBuild = (...rest) => {
      const me = 'onBuild';
      this.logger.entered(me, rest);

      this.container.replaceChildren(this.#content);

      this.logger.leaving(me);
    }

  }
  /* eslint-disable require-jsdoc */
  class ElementAdapterTestCase extends NH.xunit.TestCase {

    testElement() {
      // Assemble
      const div = document.createElement('div');
      div.id = 'pat';
      div.innerText = 'I am a div.';
      const content = new ElementAdapter(this.id, div);

      // Act
      content.build();

      // Assert
      this.assertTrue(content.container instanceof HTMLUnknownElement,
        'is HTMLUnknownElement');
      this.assertTrue((/I am a div./u).test(content.container.innerText),
        'expected text');
      this.assertEqual(content.container.firstChild.tagName, 'DIV', 'is div');
      this.assertEqual(content.container.firstChild.id, 'pat', 'is pat');

      // Tweak
      content.container.firstChild.id = 'joe';
      this.assertNotEqual(content.container.firstChild.id, 'pat', 'not pat');
      this.assertEqual(div.id, 'joe', 'demos is a live element');

      // Rebuild
      content.build();
      this.assertEqual(content.container.firstChild.id, 'joe', 'still joe');

      // Multiple times
      content.build();
      content.build();
      content.build();
      this.assertEqual(content.container.childNodes.length, 1, 'child nodes');
    }

  }
  /* eslint-enable */

  NH.xunit.testing.testCases.push(ElementAdapterTestCase);

  /**
   * Selects the best adapter to wrap the content.
   * @param {string} name - Name for this instance.
   * @param {(string|HTMLElement|Widget)} content - Content to be adapted.
   * @throws {TypeError} - On type not handled.
   * @returns {Widget} - Appropriate adapter for content.
   */
  function contentWrapper(name, content) {
    if (typeof content === 'string' || content instanceof String) {
      return new StringAdapter(name, content);
    } else if (content instanceof HTMLElement) {
      return new ElementAdapter(name, content);
    } else if (content instanceof Widget) {
      return content;
    }
    throw new TypeError(`Unknown type for "${name}": ${content}`);
  }

  /* eslint-disable no-new-wrappers */
  /* eslint-disable require-jsdoc */
  class ContentTestCase extends NH.xunit.TestCase {

    testPrimitiveString() {
      const x = contentWrapper(this.id, 'a string');

      this.assertTrue(x instanceof StringAdapter);
    }

    testStringObject() {
      const x = contentWrapper(this.id, new String('a string'));

      this.assertTrue(x instanceof StringAdapter);
    }

    testElement() {
      const element = document.createElement('div');
      const x = contentWrapper(this.id, element);

      this.assertTrue(x instanceof ElementAdapter);
    }

    testWidget() {
      const t = new Test();
      const x = contentWrapper(this.id, t);

      this.assertEqual(x, t);
    }

    testUnknown() {
      this.assertRaises(
        TypeError,
        () => {
          contentWrapper(this.id, null);
        },
        'null'
      );

      this.assertRaises(
        TypeError,
        () => {
          contentWrapper(this.id, new Error('why not?'));
        },
        'error-type'
      );
    }

  }
  /* eslint-enable */

  NH.xunit.testing.testCases.push(ContentTestCase);

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
