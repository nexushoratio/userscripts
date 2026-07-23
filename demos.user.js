// ==UserScript==
// @name        Demos
// @namespace   https://github.com/nexushoratio/userscripts
// @match       http://localhost:8000/*
// @noframes
// @version     1
// @author      Mike Castle
// @description Demos and testing.
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @require     https://greasyfork.org/scripts/478188-nh-xunit/code/NH_xunit.js
// @require     https://greasyfork.org/scripts/477290-nh-base/code/NH_base.js
// @require     https://greasyfork.org/scripts/478349-nh-userscript/code/NH_userscript.js
// @require     https://greasyfork.org/scripts/478440-nh-web/code/NH_web.js
// @require     https://greasyfork.org/scripts/478676-nh-widget/code/NH_widget.js
// @require     https://greasyfork.org/scripts/570146-nh-spa/code/NH_spa.js
// @grant       GM.addValueChangeListener
// @grant       GM.removeValueChangeListener
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       window.onurlchange
// ==/UserScript==

/**
 * @file This exists to run library tests and serve as a demonstration
 * infrastructure.
 * @module demos
 * @version 1
 * @license [GPL-3.0-or-later]{@link https://www.gnu.org/licenses/gpl-3.0-standalone.html}
 */

// eslint-disable-next-line max-lines-per-function
(async () => {
  'use strict';

  const NH = window.NexusHoratio.base.ensure([
    {name: 'xunit'},
    {name: 'base'},
    {name: 'userscript'},
    {name: 'widget'},
    {name: 'spa'},
  ]);

  NH.xunit.testing.enabled = true;

  await NH.userscript.setAutoManageLoggerConfigs(true);

  /**
   * @const {NH.base.Logger} logger - Default logger for the module.
   */
  const logger = new NH.base.Logger('Testing');
  logger.log('starting');

  logger.starting(NH.userscript.environmentData.name);
  for (const entry of NH.userscript.environmentData()) {
    logger.log(entry);
  }
  logger.finished(NH.userscript.environmentData.name);

  NH.xunit.testing.run();

  logger.log('finished');

  /**
   * @const {NH.base.Logger} issueLogger - Logger specifically for posted
   * issues.
   */
  const issueLogger = new NH.base.Logger('Issues');

  /**
   * @function issueListener
   * @param {...*} items - Posted issues.
   */
  function issueListener(...issues) {
    for (const issue of issues) {
      issueLogger.log('item:', issue);
    }
    issueLogger.log('end-of-issues');
  }

  NH.base.issues.listen(issueListener);

  /**
   * Demonstrate a populated grid widget.
   *
   * @function demoGrid
   */
  function demoGrid() {  // eslint-disable-line max-lines-per-function
    /* eslint-disable require-jsdoc */
    function renderInt(record, field) {
      return `${record[field]}`;
    }

    function renderType(record) {
      return `${record.stage}, ${record.species}`;
    }

    function rowClassesFunc(record) {
      return [record.species, record.stage];
    }
    /* eslint-enable */

    const data = [
      {id: 1, name: 'Sally', species: 'human', stage: 'juvenile'},
      {name: 'Puff', id: 3, species: 'feline', stage: 'juvenile'},
      {name: 'Jane', id: 2, species: 'human', stage: 'juvenile'},
      {name: 'Bob', id: 4, species: 'alien', stage: 'adolescent'},
      {name: 'Mother', id: 5, species: 'human', stage: 'adult'},
    ];
    const w = new NH.widget.Grid('Characters')
      .rowClassesFunc(rowClassesFunc)
      .set(data);

    w.installStyle(w.id, [
      `#${w.container.id} {border-collapse: collapse;}`,
      `#${w.container.id} td,th {border: 1px solid black;}`,
      `#${w.container.id} tr {background-blend-mode: screen;}`,
      `#${w.container.id} tr.feline {background-color: orange;}`,
      `#${w.container.id} tr.human {background-color: RebeccaPurple;}`,
      `#${w.container.id} tr.alien {background-color: green;}`,
      `#${w.container.id} tr.juvenile {background-image: ` +
        'linear-gradient(to bottom, white, black);}',
      `#${w.container.id} tr.adolescent {background-image: ` +
        'linear-gradient(to bottom, white, black, white);}',
      `#${w.container.id} tr.adult {background-image: ` +
        'linear-gradient(to bottom, white, black, white, black);}',
      `#${w.container.id} td.typ {font-weight: bolder;}`,
    ]);
    w.columns.push(
      new NH.widget.GridColumn('id')
        .renderFunc(renderInt),
      new NH.widget.GridColumn('name'),
      new NH.widget.GridColumn('typ')
        .setTitle('Type')
        .renderFunc(renderType),
    );

    w.build();

    document.body.append(w.container);
  }

  /** Boring details for a boring demo. */
  class DemoDetails extends NH.spa.Details {}

  /** Class for the whole test site. */
  class Global extends NH.spa.Page {

    /** @param {NH.spa.SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...Global.#details});
      this.dispatcher.on('activate', this.#onActivate);
    }

    static #details = {
      name: 'Globular cluster',
      // Bogus selector to trigger page load timeout.
      readySelector: 'footer',
    }

    #onActivate = () => {
      this.logger.log('hello');
    }

  }

  /** Class for just the root page. */
  class Slash extends NH.spa.Page {

    /** @param {NH.spa.SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({
        spa: spa,
        pathname: '/',
      });

      this.dispatcher.on('activate', this.#onActivate);
    }

    /** @method */
    #onActivate = () => {
      this.logger.log('world');
    }

  }

  /** Class for handling the lib directory. */
  class Libby extends NH.spa.Page {

    /** @param {NH.spa.SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({
        spa: spa,
        pathname: '/lib/',
      });

      this.dispatcher.on('activate', this.#onActivate);
    }

    /** @method */
    #onActivate = () => {
      this.logger.log('libby');
    }

  }

  /**
   * Demonstrate using SPA for multiple pages.
   *
   * @function demoSpa
   */
  function demoSpa() {
    const deets = new DemoDetails();
    const spa = new NH.spa.SPA(deets);
    spa
      .register(Global)
      .register(Libby)
      .register(Slash);

    logger.log('deets', deets);
    logger.log('spa', spa);
  }

  const demos = [
    {enabled: false, demo: demoGrid},
    {enabled: false, demo: demoSpa},
  ];

  for (const {enabled, demo} of demos) {
    if (enabled) {
      demo();
    }
  }

})();
