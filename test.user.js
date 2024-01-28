// ==UserScript==
// @name        Test
// @namespace   https://github.com/nexushoratio/userscripts
// @match       http://localhost:8000/
// @noframes
// @version     3
// @author      Mike Castle
// @description Just for running tests.
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @require     https://greasyfork.org/scripts/478188-nh-xunit/code/NH_xunit.js
// @require     https://greasyfork.org/scripts/477290-nh-base/code/NH_base.js
// @require     https://greasyfork.org/scripts/478349-nh-userscript/code/NH_userscript.js
// @require     https://greasyfork.org/scripts/478440-nh-web/code/NH_web.js
// @require     https://greasyfork.org/scripts/478676-nh-widget/code/NH_widget.js
// ==/UserScript==

// eslint-disable-next-line max-lines-per-function
(() => {
  'use strict';

  const NH = window.NexusHoratio.base.ensure([
    {name: 'xunit'},
    {name: 'base'},
    {name: 'userscript'},
    {name: 'widget'},
  ]);

  const logger = new NH.base.Logger('Testing');
  NH.base.Logger.config('Testing').enabled = true;
  NH.base.Logger.config('Testing')
    .group('Failures').mode = 'opened';
  NH.base.Logger.config('Testing')
    .group('Errors').mode = 'opened';

  for (const entry of NH.userscript.environmentData()) {
    logger.log(entry);
  }

  NH.xunit.testing.enabled = true;
  NH.xunit.testing.run();

  logger.log('finished');

  /* eslint-disable require-jsdoc */
  function demoGrid() {
    function renderInt(record, field) {
      return `${record[field]}`;
    }

    function renderType(record) {
      return `${record.stage}, ${record.species}`;
    }

    const w = new NH.widget.Grid('Characters');
    const data = [
      {id: 1, name: 'Sally', species: 'human', stage: 'juvenile'},
      {name: 'Jane', id: 2, species: 'human', stage: 'juvenile'},
      {name: 'Puff', id: 3, species: 'feline', stage: 'juvenile'},
    ];
    w.set(data);
    w.columns.push(
      new NH.widget.GridColumn({field: 'id', renderFunc: renderInt}),
      new NH.widget.GridColumn({field: 'name'}),
      new NH.widget.GridColumn({title: 'Type', renderFunc: renderType})
    );

    // Act
    w.build();

    document.body.append(w.container);
  }
  /* eslint-enable */

  const demos = [{enabled: true, demo: demoGrid}];

  for (const {enabled, demo} of demos) {
    if (enabled) {
      demo();
    }
  }

})();
