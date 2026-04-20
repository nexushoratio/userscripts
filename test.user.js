// ==UserScript==
// @name        Test
// @namespace   https://github.com/nexushoratio/userscripts
// @match       http://localhost:8000/*
// @noframes
// @version     12
// @author      Mike Castle
// @description Just for running tests.
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @require     https://greasyfork.org/scripts/478188-nh-xunit/code/NH_xunit.js
// @require     https://greasyfork.org/scripts/477290-nh-base/code/NH_base.js
// @require     https://greasyfork.org/scripts/478349-nh-userscript/code/NH_userscript.js
// @require     https://greasyfork.org/scripts/478440-nh-web/code/NH_web.js
// @require     https://greasyfork.org/scripts/478676-nh-widget/code/NH_widget.js
// @require     https://greasyfork.org/scripts/570146-nh-spa/code/NH_spa.js
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       window.onurlchange
// ==/UserScript==

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
  const logger = new NH.base.Logger('Testing');
  logger.log('starting');

  for (const entry of NH.userscript.environmentData()) {
    logger.log(entry);
  }

  NH.xunit.testing.run();

  logger.log('finished');

  const issueLogger = new NH.base.Logger('Issues');

  /** @param {...*} items - Posted issues. */
  function issueListener(...issues) {
    for (const issue of issues) {
      issueLogger.log('item:', issue);
    }
    issueLogger.log('end-of-issues');
  }

  NH.base.issues.listen(issueListener);

  /* eslint-disable max-lines-per-function */
  /* eslint-disable require-jsdoc */
  function demoGrid() {
    function renderInt(record, field) {
      return `${record[field]}`;
    }

    function renderType(record) {
      return `${record.stage}, ${record.species}`;
    }

    function rowClassesFunc(record) {
      return [record.species, record.stage];
    }

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

  class DemoDetails extends NH.spa.Details {}

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

  class Slash extends NH.spa.Page {

    /** @param {NH.spa.SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...Slash.#details});
      this.dispatcher.on('activate', this.#onActivate);
    }

    /** @type {NH.spa.Page~PageDetails} */
    static #details = {
      pathname: '/',
    };

    #onActivate = () => {
      this.logger.log('world');
    }

  }

  // Localhost:8000 happens to point to my local copy of this git workspace.
  class Libby extends NH.spa.Page {

    /** @param {NH.spa.SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...Libby.#details});
      this.dispatcher.on('activate', this.#onActivate);
    }

    /** @type {NH.spa.Page~PageDetails} */
    static #details = {
      pathname: '/lib/',
    };

    #onActivate = () => {
      this.logger.log('libby');
    }

  }

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
  /* eslint-enable */

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
