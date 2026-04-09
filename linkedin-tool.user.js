// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @inject-into content
// @noframes
// @version     5.132
// @author      Mike Castle
// @description Minor enhancements to LinkedIn. Mostly just hotkeys.
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @downloadURL https://github.com/nexushoratio/userscripts/raw/main/linkedin-tool.user.js
// @supportURL  https://github.com/nexushoratio/userscripts/blob/main/linkedin-tool.md
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// @require     https://update.greasyfork.org/scripts/478188/1787507/NH_xunit.js
// @require     https://update.greasyfork.org/scripts/477290/1788132/NH_base.js
// @require     https://update.greasyfork.org/scripts/478349/1787506/NH_userscript.js
// @require     https://update.greasyfork.org/scripts/478440/1787504/NH_web.js
// @require     https://update.greasyfork.org/scripts/478676/1787505/NH_widget.js
// @require     https://update.greasyfork.org/scripts/570146/1789609/NH_spa.js
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       window.onurlchange
// ==/UserScript==

/* global VM */

// eslint-disable-next-line max-lines-per-function
(async () => {
  'use strict';

  const NH = window.NexusHoratio.base.ensure([
    {name: 'xunit', minVersion: 56},
    {name: 'base', minVersion: 54},
    {name: 'userscript', minVersion: 8},
    {name: 'web', minVersion: 9},
    {name: 'widget', minVersion: 46},
    {name: 'spa', minVersion: 3},
  ]);

  const APP_LONG = GM.info.script.name;
  const CKEY = 'componentkey';
  const OPTIONS = 'Options';
  const APP_SHORT = APP_LONG.split(' ')
    .at(NH.base.LAST_ITEM);

  /**
   * Save options to storage.
   *
   * @param {object} options - Options key/value pairs.
   */
  function saveOptions(options) {
    NH.userscript.setValue(OPTIONS, options);
  }

  /**
   * Load options from storage.
   *
   * TODO: Over engineer this into having a schema that could be used for
   * building an edit widget.
   *
   * Saved options will be augmented by any new defaults and resaved.
   * @returns {object} - Options key/value pairs.
   */
  async function loadOptions() {
    const defaultOptions = {
      enableDevMode: false,
      enableIssue241ClickMethod: false,
      enableAlertUnsupportedPages: false,
      enableKeyboardService: false,
      enableMigrateKIFailures: false,
      enableScrollerChangesFocus: false,
      fakeErrorRate: 0.8,
    };
    const savedOptions = await NH.userscript.getValue(OPTIONS, {});
    const options = {
      ...defaultOptions,
      ...savedOptions,
    };
    saveOptions(options);
    return options;
  }

  const litOptions = await loadOptions();

  // eslint-disable-next-line require-atomic-updates
  NH.xunit.testing.enabled = litOptions.enableDevMode;

  // Inject some test errors
  if (litOptions.enableDevMode && Math.random() < litOptions.fakeErrorRate) {
    NH.base.issues.post('This is a dummy test issue.',
      'It was added because enableDevMode is true and' +
                        ` the fakeErrorRate is ${litOptions.fakeErrorRate}.`);
    NH.base.issues.post('This is a second issue.',
      'We just want to make sure things count properly.');
  }

  await NH.userscript.setAutoManageLoggerConfigs(true);

  // TODO(#145): The if test is just here while developing.
  if (!litOptions.enableDevMode) {
    NH.base.Logger.config('Default').enabled = true;
  }

  const log = new NH.base.Logger('Default');

  /**
   * @typedef {object} KnownIssueDetails
   * @property {string} title - The GitHub issue title.
   * @property {string} date - A Date parsable string of the last time the
   * issue was verified opened.
   */

  /** @typedef {string} IssueId */

  /** @typedef {[IssueId, string|KnownIssueDetails} KnownIssue */

  const globalKnownIssues = [
    ['Bob', {title: 'Bob has no issues', date: '9999'}],
    ['', {title: 'Minor internal improvement', date: '9999'}],
    [
      '#106', {
        title: 'info view: more tabs: News, License',
        date: '2026-03-24',
      },
    ],
    [
      '#130', {
        title: 'Factor hotkey handling out of SPA',
        date: '2026-03-24',
      },
    ],
    ['#167', {title: 'Refactor into libraries', date: '2026-03-25'}],
    ['#184', {title: 'Fix <b>News</b> tab rendering', date: '2026-03-30'}],
    [
      '#208', {
        title: '<code>Scroller</code>: If end-item is never viewable' +
          ' (e.g., empty), cannot wrap',
        date: '2026-03-27',
      },
    ],
    [
      '#209', {
        title: 'Support <b>SearchResultsPeople</b> view',
        date: '2026-04-09',
      },
    ],
    [
      '#232', {
        title: '<code>Scroller</code>: Change the focus UX',
        date: '2026-03-29',
      },
    ],
    ['#236', {title: 'Support <b>Events</b> page', date: '2026-04-10'}],
    [
      '#240', {
        title: '<code>Scroller</code>: navbar height can change',
        date: '2026-03-30',
      },
    ],
    [
      '#244', {
        title: 'Capture info about all unsupported pages',
        date: '2026-04-11',
      },
    ],
    [
      '#245', {
        title: 'Revisit pages that use the terms "section{,s}" or "card{,s}"',
        date: '2026-03-31',
      },
    ],
    ['#251', 'Normalize the `uniqueFooIdentifier()` functions'],
    [
      '#253', {
        title: 'Support <b>My Network Events</b> page',
        date: '2026-04-03',
      },
    ],
    [
      '#255', {
        title: 'Support <b>Search appearances</b> page',
        date: '2026-04-07',
      },
    ],
    ['#256', {title: 'Support <b>Verify</b> page', date: '2026-04-08'}],
    [
      '#257', {
        title: 'Support <b>Analytics & tools</b> page',
        date: '2026-04-08',
      },
    ],
    ['#272', 'Styling issue on <code>Information view</code>'],
    ['#278', 'Update <b>Jobs</b> pages'],
    ['#279', 'Update <b>Messaging</b> page'],
    ['#280', 'Update <b>Invitation Manager</b> pages'],
    ['#281', 'Internal page structure changed mid-migration'],
    ['#282', '<code>LinkedInToolbarService</code> needs a refresh'],
    ['#283', 'Update <b>Notifications</b> page'],
    ['#284', 'Create a style monitoring feature'],
    ['#286', 'Factor out <code>SPA</code> related code into a library'],
    [
      '#288',
      'Add <code>Logger</code> startup ability to <code>userscript</code>',
    ],
    ['#290', 'Update <b>Profile</b> page'],
    ['#291', 'Update <b>Events</b> page'],
    ['#292', 'Update <b>SearchResultsPeople</b> page'],
    [
      '#295',
      'Navigating from <b>Style-2</b> page to <b>Style-1</b> page breaks LIT',
    ],
    ['#296', 'Ugly and missing badges'],
    ['#297', 'Update <b>Profile</b> page (Style-2)'],
    [
      '#298', {
        title: '<code>Scroller</code>: <code>#isItemViewable()</code> is' +
          ' broken when item is an image',
        date: '2026-04-08',
      },
    ],
  ];

  const globalNewsContent = [
    {
      date: '2026-04-09',
      issues: [''],
      subject: 'Include the <code>fakeErrorRate</code> in the dummy/test' +
        ' error messages',
    },
    {
      date: '2026-04-08',
      issues: ['#297'],
      subject: 'Match the <code>Show all</code> button on the' +
        ' <code>Profile</code> page',
    },
    {
      date: '2026-04-08',
      issues: ['#232'],
      subject: 'Fire <code>focus<kbd><kbd>/</kbd></kbd>focused</code>' +
        ' events inside <code>Scroller</code>',
    },
    {
      date: '2026-04-08',
      issues: [''],
      subject: 'Update <code>pageReadySelector</code> for' +
        ' <code>Notifications</code>',
    },
    {
      date: '2026-04-08',
      issues: ['#106'],
      subject: 'Factor out assembling of the badges',
    },
    {
      date: '2026-04-08',
      issues: ['#286'],
      subject: 'Move a couple of functions from' +
        ' <code>LinkedInGlobals</code> to <code>LinkedIn</code>',
    },
    {
      date: '2026-04-07',
      issues: [''],
      subject: 'Update <code>Feed</code> comments selector',
    },
    {
      date: '2026-04-07',
      issues: [''],
      subject: 'Update selector to load more <code>Feed</code> comments',
    },
    {
      date: '2026-04-07',
      issues: ['#286'],
      subject: 'Move <code>ckeyIdentifier()</code> from' +
        ' <code>LinkedInGlobals</code> to <code>LinkedIn</code>',
    },
    {
      date: '2026-04-07',
      issues: ['#298'],
      subject: 'Enhance a logging statement for easier filtering',
    },
    {
      date: '2026-04-07',
      issues: ['#297'],
      subject: 'Add a list of known sections on the <code>Profile</code>' +
        ' page',
    },
    {
      date: '2026-04-07',
      issues: ['#130'],
      subject: 'Put active keyboard services first in the new shortcuts tab',
    },
    {
      date: '2026-04-07',
      issues: ['#232'],
      subject: 'Use <code>Scroller.focus()</code> for all focus attempts' +
        ' (behind option)',
    },
    {
      date: '2026-04-07',
      issues: ['#251'],
      subject: 'Rename <code>uniqueIdentifier</code> to' +
        ' <code>uniqueNotificationIdentifier</code>',
    },
    {
      date: '2026-04-07',
      issues: ['#106'],
      subject: 'Rename badges from <em>type</em>-badge to' +
        ' badge-<em>type</em>',
    },
    {
      date: '2026-04-07',
      issues: ['#286'],
      subject: 'Move <code>LinkedInGlobals.Style</code> to' +
        ' <code>LinkedIn.Style</code>',
    },
    {
      date: '2026-04-07',
      issues: [''],
      subject: 'Report old news before unused issues',
    },
    {
      date: '2026-04-07',
      issues: ['#297'],
      subject: 'Partial update of <code>Profile</code> with Style-2 support',
    },
    {
      date: '2026-04-04',
      issues: ['#232'],
      subject: 'Create a library wide <code>Logger</code> instance',
    },
    {
      date: '2026-04-04',
      issues: ['#295'],
      subject: 'Modify how <code>HybridFixerService</code> detects a hybrid' +
        ' page',
    },
    {
      date: '2026-04-04',
      issues: ['#251'],
      subject: 'Make all <code>Scroller~uidCallback</code> implementations' +
        ' consistent',
    },
    {
      date: '2026-04-04',
      issues: ['#232'],
      subject: 'Allow <code>Jobs.focus()</code> to use the WIP' +
        ' <code>Scroller.focus()</code> work',
    },
    {
      date: '2026-04-04',
      issues: ['#232'],
      subject: 'Update how the flagged version of' +
        ' <code>Scroller.focus()</code> is implemented',
    },
    {
      date: '2026-04-03',
      issues: ['#297'],
      subject: 'Add a timeout to <code>Page.#waitUntilReady</code>',
    },
    {
      date: '2026-04-03',
      issues: [''],
      subject: 'Update <code>Feed</code> comment selectors',
    },
    {
      date: '2026-04-02',
      issues: ['#251'],
      subject: 'Update <code>JobsCollections.uniqueDetailsIdentifier</code>' +
        ' for consistency',
    },
    {
      date: '2026-03-31',
      issues: ['#296'],
      subject: 'Badge whac-a-mole',
    },
    {
      date: '2026-03-31',
      issues: [''],
      subject: 'Support dismissing <code>Feed</code> items that use a popup' +
        ' menu',
    },
    {
      date: '2026-03-30',
      issues: ['#106'],
      subject: 'Factor out saving options for future use',
    },
    {
      date: '2026-03-30',
      issues: ['#106'],
      subject: 'Add a handler for the <code>expose</code> event on the' +
        ' <em>News</em> tabs',
    },
    {
      date: '2026-03-30',
      issues: ['#296'],
      subject: 'Fix how sets are manipulated',
    },
    {
      date: '2026-03-30',
      issues: ['#295'],
      subject: 'Move reloading of hybrid pages into a <code>Service</code>',
    },
    {
      date: '2026-03-29',
      issues: ['#130'],
      subject: 'Provide an option for using the WIP keyboard service',
    },
    {
      date: '2026-03-29',
      issues: ['#244'],
      subject: 'Rename <code>enableIssue244Changes</code> to' +
        ' <code>enableAlertUnsupportedPages</code>',
    },
    {
      date: '2026-03-29',
      issues: ['#184'],
      subject: 'Update <code>ul</code> style to return bullet points and' +
        ' indentation',
    },
    {
      date: '2026-03-29',
      issues: ['#184'],
      subject: 'Apply a minor HTML fixup',
    },
    {
      date: '2026-03-29',
      issues: ['#296'],
      subject: 'Ignore specific properties when comparing badges',
    },
    {
      date: '2026-03-29',
      issues: ['#295'],
      subject: 'Implement a temporary workaround for hybrid pages',
    },
    {
      date: '2026-03-29',
      issues: ['#295'],
      subject: 'Update the <code>pathname:</code> for <code>Feed</code>',
    },
    {
      date: '2026-03-27',
      issues: [''],
      subject: 'Fix issue caused by the recent <code>News</code> tab update',
    },
    {
      date: '2026-03-27',
      issues: ['#296'],
      subject: 'Change how the Style-2 error badge is created',
    },
    {
      date: '2026-03-25',
      issues: ['#286'],
      subject: 'Move style installation out of <code>SPA</code> and' +
        ' into <code>LinkedIn</code>',
    },
    {
      date: '2026-03-25',
      issues: ['#251'],
      subject: 'Update the selector for <code>Feed</code> comments',
    },
    {
      date: '2026-03-25',
      issues: ['#209', '#292'],
      subject: 'Update the <code>SearchResultsPeople</code> page',
    },
    {
      date: '2026-03-25',
      issues: [''],
      subject: 'Update the selector for the global search input',
    },
    {
      date: '2026-03-25',
      issues: ['#286'],
      subject: 'Replace <code>SPADetails</code> with ' +
        '<code>NH.spa.Details</code>',
    },
    {
      date: '2026-03-25',
      issues: [''],
      subject: 'Track when <code>globalKnownIssues</code> were last ' +
        'reviewed for clean up',
    },
    {
      date: '2026-03-24',
      issues: [''],
      subject: 'Update how issue processing is handled for the ' +
        '<code>News</code> tab',
    },
    {
      date: '2026-03-24',
      issues: ['#236', '#291'],
      subject: 'Update the <code>Events</code> page',
    },
    {
      date: '2026-03-23',
      issues: [''],
      subject: 'Run through <code>ispell</code>',
    },
    {
      date: '2026-03-23',
      issues: ['#290'],
      subject: 'Update the <code>Profile</code> page',
    },
    {
      date: '2026-03-20',
      issues: ['#283'],
      subject: 'Update the <code>Notifications</code> page',
    },
    {
      date: '2026-03-19',
      issues: ['#279'],
      subject: 'Update the <code>Messages</code> page',
    },
    {
      date: '2026-03-18',
      issues: ['#286'],
      subject: 'Depend on the new <code>spa</code> library',
    },
    {
      date: '2026-03-18',
      issues: ['#288'],
      subject: 'Make use of the new ' +
        '<code>setAutoManageLoggerConfigs()</code> function',
    },
    {
      date: '2026-03-18',
      issues: ['#286', '#288'],
      subject: 'Update to most recent version of all libraries',
    },
    {
      date: '2026-03-15',
      issues: ['#284'],
      subject: 'Implement a <code>LinkedInStyleService</code> to verify ' +
        'site styles',
    },
    {
      date: '2026-03-15',
      issues: ['#278'],
      subject: 'Rename <code>JobView</code> to <code>JobsView</code>',
    },
    {
      date: '2026-03-15',
      issues: ['#278'],
      subject: 'Update the implementation of the <code>JobView</code> page',
    },
    {
      date: '2026-03-14',
      issues: ['#282'],
      subject: 'Verify that a toolbar exists before getting values from it',
    },
    {
      date: '2026-03-14',
      issues: ['#278'],
      subject: 'Rename <code>JobCollections</code> to ' +
        '<code>JobsCollections</code>',
    },
    {
      date: '2026-03-14',
      issues: ['#278'],
      subject: 'Update the <code>JobCollections</code> pages',
    },
    {
      date: '2026-03-13',
      issues: ['#272'],
      subject: 'Tweak styling of list items in the ' +
        '<code>Information view</code>',
    },
    {
      date: '2026-03-13',
      issues: ['#278'],
      subject: 'Update the implementation of the <code>Jobs</code> view',
    },
    {
      date: '2026-03-11',
      issues: [''],
      subject: 'Change hotkeys to match LinkedIn\'s official ' +
        'keyboard shortcuts',
    },
    {
      date: '2026-03-11',
      issues: ['#280'],
      subject: 'Update the implementation of the ' +
        '<code>Invitation Manager</code> view',
    },
    {
      date: '2026-03-11',
      issues: ['#281'],
      subject: 'Update <code>My Network</code> to the latest layout change',
    },
  ];

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

      this.#switchTab(NH.base.ONE_ITEM);

      this.#log.leaving(me);
    }

    /** Activate the previous tab. */
    prev() {
      const me = 'prev';
      this.#log.entered(me);

      this.#switchTab(-NH.base.ONE_ITEM);

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
   *   is NOT an error condition, but rather a design feature.
   * - 'change' - The value of item has changed.
   * - 'activate' - The Scroller was activated.
   * - 'deactivate' - The Scroller was deactivated.
   * - 'focus' - Before the focus is set.
   * - 'focused' - After the focus is set.
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
     * Function that finds an DOM element based upon another one.
     *
     * Useful for cases where CSS selectors are not sufficient.
     * @callback ElementFinder
     * @param {HTMLElement} element - Starting point.
     * @returns {HTMLElement} - Found element.
     */

    /**
     * Common config for finding a clickable element inside the current item.
     *
     * Use only one of selectorArray or finder.
     *
     * @typedef {object} ClickConfig
     * @property {string[]} [selectorArray] - CSS selectors to use to find an
     * element, passed to {@link NH.web.clickElement}.
     * @property {boolean} [matchSelf=false] - If a CSS selector would match
     * base, then use it, {@link NH.web.clickElement}.
     * @property {ElementFinder} [finder] - Function to find the appropriate
     * clickable element, when a selectorArray is too simplistic.
     */

    /**
     * There are two ways to describe what elements go into a Scroller:
     * 1. An explicit container (base) element and selectors stemming from it.
     * 2. An array of ContainerItemsSelector that can allow for multiple
     *   containers with items.  This approach will also allow the Scroller to
     *   automatically wait for all container elements to exist during
     *   activation.
     * @typedef {object} What
     * @property {string} name - Name for this Scroller, used for logging.
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
     * @property {number} [maxUidLength=20] - Max length for default uid text.
     * @property {string[]} [classes=[]] - Array of CSS classes to add/remove
     * from an element as it becomes current.
     * @property {boolean} [watchForClicks=true] - Whether the Scroller should
     * watch for clicks and if one is inside an item, select it.
     * @property {boolean} [autoActivate=false] - Whether to call the activate
     * method at the end of construction.
     * @property {boolean} [snapToTop=false] - Whether items should snap to
     * the top of the window when coming into view.
     * @property {number} [topMarginPixels=0] - Used to determine if scrolling
     * should happen when {snapToTop} is false.
     * @property {number} [bottomMarginPixels=0] - Used to determine if
     * scrolling should happen when {snapToTop} is false.
     * @property {string} [topMarginCSS='0'] - CSS applied to
     * `scrollMarginTop`.
     * @property {string} [bottomMarginCSS='0'] - CSS applied to
     * `scrollMarginBottom`.
     * @property {number} [waitForItemTimeout=3000] - Time to wait, in
     * milliseconds, for existing item to reappear upon reactivation.
     * @property {number} [containerTimeout=0] - Time to wait, in
     * milliseconds, for a {ContainerItemsSelector.container} to show up.
     * Some pages may not always provide all identified containers.  The
     * default of 0 disables timing out.  NB: Any containers that timeout will
     * not handle further activate() processing, such as watchForClicks.
     * @property {ClickConfig} [clickConfig={}] - Configures how the click()
     * method operates.
     */

    /**
     * @param {What} what - What we want to scroll.
     * @param {How} how - How we want to scroll.
     * @throws {Scroller.Exception} - On many construction problems.
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
        maxUidLength: this.#maxUidLength = Scroller.#defaults.MAX_UID_LENGTH,
        classes: this.#classes = [],
        watchForClicks: this.#watchForClicks =
        Scroller.#defaults.WATCH_FOR_CLICKS,
        autoActivate: this.#autoActivate = false,
        snapToTop: this.#snapToTop = false,
        topMarginPixels: this.#topMarginPixels = 0,
        bottomMarginPixels: this.#bottomMarginPixels = 0,
        topMarginCSS: this.#topMarginCSS = '0',
        bottomMarginCSS: this.#bottomMarginCSS = '0',
        waitForItemTimeout: this.#waitForItemTimeout =
        Scroller.#defaults.WAIT_FOR_ITEM,
        containerTimeout: this.#containerTimeout = 0,
        clickConfig: this.#clickConfig = {},
      } = how);

      this.#validateInstance();

      this.#mutationObserver = new MutationObserver(this.#mutationHandler);

      this.#logger = new NH.base.Logger(`{${this.#name}}`);
      this.logger.log('Scroller constructed', this);

      if (this.#autoActivate) {
        this.activate();
      }
    }

    static Exception = class extends NH.base.Exception {}

    /** @type {NH.base.Dispatcher} */
    get dispatcher() {
      return this.#dispatcher;
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

    /** @type {string} - Current item's uid. */
    get itemUid() {
      return this.#currentItemId;
    }

    /** @type {NH.base.Logger} */
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
     * Like HTMLElement.innerText, but cleaner and mostly deduped.
     *
     * @param {HTMLElement} element - Element to examine.
     * @returns {string} - The normalized text.
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

    /**
     * @param {number} [pixels=0] - Used to determine if scrolling should
     * happen when {snapToTop} is false.
     * @returns {Scroller} - This instance, for chaining.
     */
    topMarginPixels(pixels = 0) {
      this.#topMarginPixels = pixels;
      return this;
    }

    /**
     * @param {number} [pixels=0] - Used to determine if scrolling should
     * happen when {snapToTop} is false.
     * @returns {Scroller} - This instance, for chaining.
     */
    bottomMarginPixels(pixels = 0) {
      this.#bottomMarginPixels = pixels;
      return this;
    }

    /**
     * @param {string} [css='0'] - CSS applied to `scrollMarginTop`.
     * @returns {Scroller} - This instance, for chaining.
     */
    topMarginCSS(css = '0') {
      this.#topMarginCSS = css;
      return this;
    }

    /**
     * @param {string} [css='0'] - CSS applied to `scrollMarginBottom`.
     * @returns {Scroller} - This instance, for chaining.
     */
    bottomMarginCSS(css = '0') {
      this.#bottomMarginCSS = css;
      return this;
    }

    /** Click either the current item OR document.activeElement. */
    click() {
      const me = 'click';
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
          NH.base.issues.post(`Scroller.click() for "${this.name}" was ` +
                            'called without a configuration');
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
      const me = 'gotoUid';
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
     * Focus on current item.
     * @fires 'focus' 'focused'
     */
    focus() {
      const me = this.focus.name;
      this.logger.entered(me, litOptions.enableScrollerChangesFocus);

      this.dispatcher.fire('focus', null);

      this.shine();
      this.show();

      if (litOptions.enableScrollerChangesFocus) {
        let item = this.item;
        if (item) {
          this.logger.log('initial', item);
          const selector = ':enabled, a, [tabindex]';
          if (!item.matches(selector)) {
            item = item.querySelector(selector) || item;
          }
          this.logger.log('final', item);
          NH.web.focusOnElement(item, false);
        }
      }

      this.logger.leaving(me, 'current focus:', document.activeElement);
      this.dispatcher.fire('focused', null);
    }

    /**
     * Activate the scroller.
     * @fires 'activate'
     */
    async activate() {
      const me = 'activate';
      this.logger.entered(me);

      const containers = new Set(
        Array.from(await this.#waitForContainers())
          .filter(x => x)
      );
      if (this.#base) {
        containers.add(this.#base);
      }

      const watcher = this.#currentItemWatcher();

      for (const container of containers) {
        if (this.#watchForClicks) {
          this.#onClickElements.add(container);
          container.addEventListener('click',
            this.#onClick,
            this.#clickOptions);
        }
        this.#mutationObserver.observe(container,
          {childList: true, subtree: true});
      }

      this.logger.log('watcher:', await watcher);
      this.#mutationDispatcher.on('records', this.#monitorConnectedness);

      this.dispatcher.fire('activate', null);

      this.logger.leaving(me);
    }

    /**
     * Deactivate the scroller (but do not destroy it).
     * @fires 'deactivate'
     */
    deactivate() {
      this.#mutationDispatcher.off('records', this.#monitorConnectedness);
      this.#mutationObserver.disconnect();
      for (const container of this.#onClickElements) {
        container.removeEventListener('click',
          this.#onClick,
          this.#clickOptions);
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

    static #defaults = {};

    static {
      Scroller.#defaults.MAX_UID_LENGTH = 20;
      Scroller.#defaults.WAIT_FOR_ITEM = 3000;
      Scroller.#defaults.WATCH_FOR_CLICKS = true;

      Object.freeze(Scroller.#defaults);
    }

    /**
     * Determines if the item can be viewed.  Usually this means the content
     * is being loaded lazily and is not ready yet.
     * @param {Element} item - The item to inspect.
     * @returns {boolean} - Whether the item has viewable content.
     */
    static #isItemViewable(item) {
      return Boolean(item.clientHeight && item.innerText.length);
    }

    #autoActivate
    #base
    #bottomMarginCSS
    #bottomMarginPixels
    #classes
    #clickConfig
    #clickOptions = {capture: true};
    #containerItems
    #containerTimeout
    #currentItem = null;
    #currentItemId = null;
    #destroyed = false;

    #dispatcher = new NH.base.Dispatcher(
      'change', 'out-of-range', 'activate', 'deactivate', 'focus', 'focused'
    );

    #historicalIdToIndex = new Map();
    #logger
    #maxUidLength
    #mutationDispatcher = new NH.base.Dispatcher('records');
    #mutationObserver
    #name
    #onClickElements = new Set();
    #selectors
    #snapToTop
    #stackTrace
    #topMarginCSS
    #topMarginPixels
    #uidCallback
    #waitForItemTimeout
    #watchForClicks

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

    /**
     * Return the computed height of an element.
     *
     * The usual element.clientHeight is too unpredictable.
     *
     * @param {Element} element - Element to examine.
     * @returns {number} - The height of the element.
     */
    #realHeight = (element) => {
      const me = this.#realHeight.name;
      this.logger.entered(me, element);

      const height = element.getBoundingClientRect?.().height;

      this.logger.leaving(me, height);
      return height;
    }

    /**
     * @param {MutationRecord[]} records - Standard mutation records.
     * @fires 'records'
     */
    #mutationHandler = (records) => {
      const me = 'mutationHandler';
      this.logger.entered(
        me, `records: ${records.length} type: ${records[0].type}`
      );

      this.#mutationDispatcher.fire('records', null);

      this.logger.leaving(me);
    }

    /**
     * Since the getter will try to validate the current item (since it could
     * have changed out from under us), it too can update information.
     * @param {Element} val - Element to make current.
     * @fires 'change'
     */
    #bottomHalf = (val) => {
      const me = 'bottomHalf';
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
          this.logger.log(`considering ${container} with ${selector}`);
          const base = document.querySelector(container);
          if (base) {
            items.push(...base.querySelectorAll(selector));
          }
        }
      }
      this.#postProcessItems(items);

      this.logger.leaving(me, items.length);
      return items;
    }

    /**
     * Log items and do any fixups on them.
     * @param {[Element]} items - Elements in the Scroller.
     */
    #postProcessItems = (items) => {
      const me = 'postProcessItems';
      this.logger.starting(me, `count: ${items.length}`);

      const uids = new NH.base.DefaultMap(Array);
      for (const item of items) {
        this.logger.log(
          'item:', item, `isItemViewable: ${Scroller.#isItemViewable(item)}`
        );
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

      this.logger.finished(me, `uid count: ${uids.size}`);
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
     * If necessary, scroll the bottom into view, then same for top.
     * @param {HTMLElement} item - The item to scroll into view.
     */
    #gentlyScrollIntoView = (item) => {
      const me = 'gentlyScrollIntoView';
      this.logger.entered(me, item);

      item.style.scrollMarginBottom = this.#bottomMarginCSS;
      let rect = item.getBoundingClientRect();

      const allowedBottom = document.documentElement.clientHeight -
                this.#bottomMarginPixels;
      if (rect.bottom > allowedBottom) {
        this.logger.log('scrolling up onto page');
        item.scrollIntoView(false);
      }
      rect = item.getBoundingClientRect();
      if (rect.top < this.#topMarginPixels) {
        this.logger.log('scrolling down onto page');
        item.scrollIntoView(true);
      }
      // XXX: The following was added to support horizontal scrolling in
      // carousels.  Nothing seemed to break.  TODO(#132): Did find a side
      // effect though: it can cause an item being *left* to shift up if the
      // scrollMarginBottom has been set.  This also makes the current `Jobs`
      // *Recent job searches* secondary scroller a little wonky.  There are
      // invisible items that take up space at the bottom of the list, and
      // this causes the last visible one to scroll into the middle, leaving
      // blank space at the bottom of the view.
      item.scrollIntoView({block: 'nearest', inline: 'nearest'});

      this.logger.leaving(me);
    };

    /**
     * Scroll the current item into the view port.  Depending on the instance
     * configuration, this could snap to the top, snap to the bottom, or be a
     * no-op.
     */
    #scrollToCurrentItem = () => {
      const me = 'scrollToCurrentItem';
      this.logger.entered(me, `snapToTop: ${this.#snapToTop}`);

      const item = this.item;

      if (item) {
        item.style.scrollMarginTop = this.#topMarginCSS;
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
     * Jump an item on an end of the collection.
     * @param {boolean} first - If true, the first item in the collection,
     * else, the last.
     */
    #jumpToEndItem = (first) => {
      const me = 'jumpToEndItem';
      this.logger.entered(me, `first=${first}`);

      const items = this.#getItems();
      if (items.length) {
        // eslint-disable-next-line no-extra-parens
        let idx = first ? 0 : (items.length - NH.base.ONE_ITEM);
        let item = items[idx];

        // Content of items is sometimes loaded lazily and can be detected by
        // having no innerText yet.  So start at the end and work our way up
        // to the last one loaded.
        if (!first) {
          while (!Scroller.#isItemViewable(item)) {
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
     * @param {number} n - How many items to move and the intended direction.
     * @fires 'out-of-range'
     */
    #scrollBy = (n) => {
      const me = 'scrollBy';
      this.logger.entered(me, n);

      /**
       * Keep viewable items and the current one.
       *
       * The current item may not yet be viewable after a reload, but give it
       * a chance.
       * @param {HTMLElement} item - Item to check.
       * @fires 'out-of-range'
       * @returns {boolean} - Whether to keep or not.
       */
      const filterItem = (item) => {
        if (Scroller.#isItemViewable(item)) {
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

    /** @throws {Scroller.Exception} - On many validation issues. */
    #validateInstance = () => {
      this.#validateWhat();
      this.#validateHow();
    }

    /** @throws {Scroller.Exception} - On many validation issues. */
    #validateWhat = () => {
      if (this.#base && this.#containerItems.length) {
        throw new Scroller.Exception(
          `Cannot have both base AND containerItems: ${this.#name} has both`
        );
      }

      if (!this.#base && !this.#containerItems.length) {
        throw new Scroller.Exception(
          `Needs either base OR containerItems: ${this.#name} has neither`
        );
      }

      if (this.#base && !(this.#base instanceof Element)) {
        throw new Scroller.Exception(
          `Not an element: base ${this.#base} given for ${this.#name}`
        );
      }

      if (this.#base && !this.#selectors) {
        throw new Scroller.Exception(
          `No selectors: ${this.#name} is missing selectors`
        );
      }

      if (this.#selectors && !this.#base) {
        throw new Scroller.Exception(
          `No base: ${this.#name} is using selectors and so needs a base`
        );
      }
    }

    /** @throws {Scroller.Exception} - On many validation issues. */
    #validateHow = () => {
      if (!this.#uidCallback) {
        throw new Scroller.Exception(
          `Missing uidCallback: ${this.#name} has no uidCallback defined`
        );
      }

      if (!(this.#uidCallback instanceof Function)) {
        throw new Scroller.Exception(
          `Invalid uidCallback: ${this.#name} uidCallback is not a function`
        );
      }

      if (this.#clickConfig.selectorArray && this.#clickConfig.finder) {
        throw new Scroller.Exception(
          `Invalid clickConfig: ${this.name} cannot have both ` +
            'selectorArray AND a finder function'
        );
      }

      if (this.#clickConfig.selectorArray) {
        if (!(this.#clickConfig.selectorArray instanceof Array)) {
          throw new Scroller.Exception(
            `Invalid clickConfig: ${this.#name} selectorArray is not an Array`
          );
        }
      }

      if (this.#clickConfig.finder) {
        if (!(this.#clickConfig.finder instanceof Function)) {
          throw new Scroller.Exception(
            `Invalid clickConfig: ${this.#name} finder property should be ` +
              'a function'
          );
        }

        if (this.#clickConfig.finder.length !== NH.base.ONE_ITEM) {
          throw new Scroller.Exception(
            `Invalid clickConfig: ${this.#name} finder function should ` +
                'take exactly one argument, currently takes ' +
                `${this.#clickConfig.finder.length}`
          );
        }
      }
    }

    /**
     * The page may still be loading, so wait for many things to settle.
     * @returns {Promise<Element[]>} - All the new base elements.
     */
    #waitForContainers = () => {
      const me = 'waitForContainers';
      this.logger.entered(me);

      const results = [];

      /**
       * Simply eats any exception throw by the Promise.
       * @param {Promise} prom - Whatever Promise we are wrapping.
       * @param {string} note - Put into log on error.
       * @returns {Promise} - Resolved promise.
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
     * TODO(#150): This is a good start but needs more work.  Hooking into the
     * MutationObserver seemed like a good idea, but in practice, we only get
     * invoked once, then time out.  Likely the observe options need some
     * tweaking.  Will need to balance between what we do on activation as
     * well as long term monitoring (which is not being done yet anyway).
     * Also note the call to Scroller.#isItemViewable, a direct nod to what
     * Feed needs to do.
     *
     * @returns {Promise<string>} - Wait on this to finish with something
     * useful to log.
     */
    #currentItemWatcher = () => {
      const me = 'currentItemWatcher';
      this.logger.entered(me);

      const uid = this.itemUid;
      let prom = Promise.resolve('nothing to watch for');

      if (uid) {
        this.logger.log('reactivation with', uid);
        let timeoutID = null;

        prom = new Promise((resolve) => {

          /** Dispatcher monitor. */
          const moCallback = () => {
            this.logger.log('moCallback');
            if (this.gotoUid(uid)) {
              this.logger.log('item is present', this.item);
              if (Scroller.#isItemViewable(this.item)) {
                this.logger.log('and viewable');
                this.#mutationDispatcher.off('records', moCallback);
                clearTimeout(timeoutID);
                resolve('looks good');
              } else {
                this.logger.log('but not yet viewable');
              }
            } else {
              this.logger.log('not ready yet');
            }
          };

          /** Standard setTimeout callback. */
          const toCallback = () => {
            this.#mutationDispatcher.off('records', moCallback);
            this.logger.log('one last try...');
            moCallback();
            resolve('we tried...');
          };

          this.#mutationDispatcher.on('records', moCallback);
          timeoutID = setTimeout(toCallback, this.#waitForItemTimeout);
          moCallback();
        });
      }

      this.logger.leaving(me, prom);
      return prom;
    }

    #monitorConnectedness = () => {
      if (this.#currentItem && !this.#currentItem.isConnected) {
        this.logger.log('current item disconnected');
        this.#currentItem = null;
        if (litOptions.enableDevMode) {
          NH.base.issues.post(
            `Current Scroller, ${this.name}, item disconnected.`,
            'Did an item lose shine?'
          );
        }
      }
    }

    /* eslint-disable require-jsdoc */
    static ScrollerTestCase = class extends NH.xunit.TestCase {

      testClassIsFrozen() {
        this.assertRaisesRegExp(TypeError, /is not extensible/u, () => {
          Scroller.#defaults.FIELD = 'field';
        });
      }

    }
    /* eslint-enable */

  }

  NH.xunit.testing.testCases.push(Scroller.ScrollerTestCase);

  /* eslint-disable max-lines-per-function */
  /* eslint-disable no-empty-function */
  /* eslint-disable no-new */
  /* eslint-disable no-unused-vars */
  /* eslint-disable require-jsdoc */
  class ScrollerTestCase extends NH.xunit.TestCase {

    testNeedsBaseOrContainerItems() {
      const what = {
        name: this.id,
      };
      const how = {
      };

      this.assertRaisesRegExp(
        Scroller.Exception,
        /Needs either base OR containerItems:/u,
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

      this.assertRaisesRegExp(
        Scroller.Exception,
        /Cannot have both base AND containerItems:/u,
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

      this.assertRaisesRegExp(
        Scroller.Exception,
        /Not an element:/u,
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

      this.assertRaisesRegExp(
        Scroller.Exception,
        /No selectors:/u,
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

      this.assertRaisesRegExp(
        Scroller.Exception,
        /No base:/u,
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

      this.assertRaisesRegExp(
        Scroller.Exception,
        /Missing uidCallback:/u,
        () => {
          new Scroller(what, how);
        },
        'missing',
      );

      how.uidCallback = {};

      this.assertRaisesRegExp(
        Scroller.Exception,
        /Invalid uidCallback:/u,
        () => {
          new Scroller(what, how);
        },
        'invalid',
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

      this.assertRaisesRegExp(
        Scroller.Exception,
        /Invalid clickConfig: .*both selectorArray AND a finder function$/u,
        () => {
          new Scroller(what, how);
        },
        'both selectorArray and finder'
      );

      how.clickConfig = {selectorArray: 'string'};

      this.assertRaisesRegExp(
        Scroller.Exception,
        /Invalid clickConfig: .* selectorArray is not an Array$/u,
        () => {
          new Scroller(what, how);
        },
        'non-array'
      );

      how.clickConfig = {
        finder: (element) => {},
      };

      this.assertNoRaises(() => {
        new Scroller(what, how);
      }, 'single argument element finder is fine');

      how.clickConfig.finder = () => {};

      this.assertRaisesRegExp(
        Scroller.Exception,
        /Invalid clickConfig: .* 0$/u,
        () => {
          new Scroller(what, how);
        },
        'zero argument element finder is not fine'
      );

      how.clickConfig.finder = (a, b, c) => {};

      this.assertRaisesRegExp(
        Scroller.Exception,
        /Invalid clickConfig: .* 3$/u,
        () => {
          new Scroller(what, how);
        },
        'too many arguments element finder is not fine'
      );
    }

  }
  /* eslint-enable */

  NH.xunit.testing.testCases.push(ScrollerTestCase);

  /**
   * This class exists solely to avoid some `no-use-before-define` linter
   * issues.
   */
  class LinkedInGlobals {

    /** @type {string} - LinkedIn's common aside used in many layouts. */
    static get asideSelector() {
      return this.#asideSelector;
    }

    /** @type {string} - LinkedIn's common navigation bar. */
    static get primaryNavSelector() {
      return this.#navSelector;
    }

    /** @type {string} - LinkedIn's common sidebar used in many layouts. */
    static get sidebarSelector() {
      return this.#sidebarSelector;
    }

    /** @type {string} - The height of the navbar as CSS string. */
    get navbarHeightCSS() {
      return `${this.#navbarHeightPixels}px`;
    }

    /** @type {number} - The height of the navbar in pixels. */
    get navbarHeightPixels() {
      return this.#navbarHeightPixels;
    }

    /** @param {number} val - Set height of the navbar in pixels. */
    set navbarHeightPixels(val) {
      this.#navbarHeightPixels = val;
    }

    /** Scroll common sidebar into view and move focus to it. */
    focusOnSidebar = () => {
      const sidebar = document.querySelector(LinkedInGlobals.sidebarSelector);
      if (sidebar) {
        sidebar.style.scrollMarginTop = this.navbarHeightCSS;
        sidebar.scrollIntoView();
        NH.web.focusOnElement(sidebar, false);
      }
    }

    /**
     * Scroll common aside (right-hand sidebar) into view and move focus to
     * it.
     */
    focusOnAside = () => {
      const aside = document.querySelector(LinkedInGlobals.asideSelector);
      if (aside) {
        aside.style.scrollMarginTop = this.navbarHeightCSS;
        aside.scrollIntoView();
        NH.web.focusOnElement(aside, false);
      }
    }

    static #asideSelector = [
      // Style 1
      'aside.scaffold-layout__aside',
      // Style 2
      '#workspace > div > div > div:nth-of-type(3)',
    ].join(', ');

    static #navSelector = [
      // Style 1
      '#global-nav .global-nav__primary-items',
      // Style 2
      `nav[${CKEY}="primaryNavLinksComponentRef"] > ul`,
    ].join(', ');

    static #sidebarSelector = [
      // Style 1
      'aside.scaffold-layout__sidebar',
      // Style 2
      '#workspace > div > div > div:nth-of-type(1)',
    ].join(', ');

    #navbarHeightPixels = 0;

  }

  /** A table with collapsible sections. */
  class AccordionTableWidget extends NH.widget.Widget {

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

    #currentSection

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
      this.#currentSection.append(tr);
    }

  }

  /**
   * Self-decorating class useful for integrating with a hotkey service.
   *
   * @example
   * // Wrap an arrow function:
   * foo = new Shortcut(
   *   'c-c',
   *   'Clear the console.',
   *   () => {
   *     console.clear();
   *     console.log('I did it!', this);
   *   }
   * );
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
     * @param {string} desc - Human readable documentation about this
     * function.
     * @param {NH.web.SimpleFunction} func - Function to wrap, usually in the
     * form of an arrow function.  Keep JS `this` magic in mind!
     */
    constructor(seq, desc, func) {
      super('return this.func();');
      const myself = this.bind(this);
      myself.seq = seq;
      myself.desc = desc;
      this.func = func;
      return myself;
    }

  }

  /**
   * Manage a {Scroller} via {NH.base.Service} with LIT idiosyncrasies.
   *
   * It will turn the {Scroller} on/off.
   * Apply any fixups for margin features.
   * Monitor margin for changes.
   */
  class LinkedInScrollerService extends NH.base.Service {

    /**
     * @param {string} name - Custom portion of this instance.
     */
    constructor(name) {
      super(name);
      this.on('activate', this.#onActivate)
        .on('deactivate', this.#onDeactivate)
        .setScroller();
    }

    /**
     * @param {NH.base.Dispatcher} details - The {@link LinkedIn} instance.
     * @returns {LinkedInScrollerService} - This instance, for chaining.
     */
    setDetails(details) {
      this.#details = details;
      return this;
    }

    /**
     * Sets the {@link Scroller} to manage with this service.
     *
     * If not value is passed, any existing instance will be removed.
     *
     * @param {Scroller} [scroller] - The instance to manage.
     * @returns {LinkedInScrollerService} - This instance, for chaining.
     */
    setScroller(scroller = null) {
      this.#scroller = scroller;
      return this;
    }

    #details
    #scroller

    #onActivate = () => {
      this.#scroller?.activate();
    }

    #onDeactivate = () => {
      this.#scroller?.deactivate();
    }

  }

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
   * be enabled/disabled as the service is activated/deactivated.  This can
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
  class VMKeyboardService extends NH.base.Service {

    /** @inheritdoc */
    constructor(name) {
      super(name);
      VMKeyboardService.#services.add(this);
      this.on('activate', this.#onActivate)
        .on('deactivate', this.#onDeactivate);
    }

    static keyMap = new Map([
      ['LEFT', '←'],
      ['UP', '↑'],
      ['RIGHT', '→'],
      ['DOWN', '↓'],
    ]);

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
     * Parse a {@link Shortcut.seq} and wrap it in HTML.
     * @example
     * 'a c-b' ->
     *   '<kbd><kbd>a</kbd> then <kbd>Ctrl</kbd> + <kbd>b</kbd></kbd>'
     * @param {Shortcut.seq} seq - Keystroke sequence.
     * @returns {string} - Appropriately wrapped HTML.
     */
    static parseSeq(seq) {

      /**
       * Convert a VM.shortcut style into an HTML snippet.
       * @param {IShortcutKey} key - A particular key press.
       * @returns {string} - HTML snippet.
       */
      function reprKey(key) {
        if (key.base.length === NH.base.ONE_ITEM) {
          if ((/\p{Uppercase_Letter}/u).test(key.base)) {
            key.base = key.base.toLowerCase();
            key.modifierState.s = true;
          }
        } else {
          key.base = key.base.toUpperCase();
          const mapped = VMKeyboardService.keyMap.get(key.base);
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
        return sequence.map(c => `<kbd>${c}</kbd>`)
          .join('+');
      }
      const res = VM.shortcut.normalizeSequence(seq, true)
        .map(key => reprKey(key))
        .join(' then ');
      return `<kbd>${res}</kbd>`;
    }

    /** @type {boolean} */
    get active() {
      return this.#active;
    }

    /** @type {Shortcut[]} - Well, seq and desc properties only. */
    get shortcuts() {
      return this.#shortcuts;
    }

    /** @param {*} instance - Object with {Shortcut} properties. */
    addInstance(instance) {
      const me = 'addInstance';
      this.logger.entered(me, instance);

      if (this.#keyboards.has(instance)) {
        this.logger.log('Already registered');
      } else {
        const keyboard = new VM.shortcut.KeyboardService();
        for (const [name, prop] of Object.entries(instance)) {
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

    static #focusOption = {
      capture: true,
    };

    static #lastFocusedElement = null

    /**
     * @type {VM.shortcut.IShortcutOptions} - Disables keys when focus is on
     * an element or info view.
     */
    static #navOption = {
      condition: '!inputFocus',
      caseSensitive: true,
    };

    static #services = new Set();

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
      if (NH.web.isInput(evt.target)) {
        this.setKeyboardContext('inputFocus', true);
        this.#lastFocusedElement = evt.target;
      }
    }

    #active = false;
    #keyboards = new Map();
    #shortcuts = [];

    #onActivate = () => {
      for (const keyboard of this.#keyboards.values()) {
        if (litOptions.enableKeyboardService) {
          keyboard.enable();
        } else {
          this.logger.log('skipping enabling of', keyboard);
        }
      }
      this.#active = true;
    }

    #onDeactivate = () => {
      for (const keyboard of this.#keyboards.values()) {
        keyboard.disable();
      }
      this.#active = false;
    }

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

  /* eslint-disable require-jsdoc */
  class ParseSeqTestCase extends NH.xunit.TestCase {

    testNormalInputs() {
      const tests = [
        {text: 'q', expected: '<kbd><kbd>q</kbd></kbd>'},
        {text: 's-q', expected: '<kbd><kbd>Shift</kbd>+<kbd>q</kbd></kbd>'},
        {text: 'Q', expected: '<kbd><kbd>Shift</kbd>+<kbd>q</kbd></kbd>'},
        {text: 'a b', expected: '<kbd><kbd>a</kbd> then <kbd>b</kbd></kbd>'},
        {text: '<', expected: '<kbd><kbd><</kbd></kbd>'},
        {text: 'C-q', expected: '<kbd><kbd>Ctrl</kbd>+<kbd>q</kbd></kbd>'},
        {text: 'c-q', expected: '<kbd><kbd>Ctrl</kbd>+<kbd>q</kbd></kbd>'},
        {text: 'c-a-t',
          expected: '<kbd><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+' +
       '<kbd>t</kbd></kbd>'},
        {text: 'a-c-T',
          expected: '<kbd><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+' +
       '<kbd>Shift</kbd>+<kbd>t</kbd></kbd>'},
        {text: 'c-down esc',
          expected: '<kbd><kbd>Ctrl</kbd>+<kbd>↓</kbd> ' +
       'then <kbd>ESC</kbd></kbd>'},
        {text: 'alt-up tab',
          expected: '<kbd><kbd>Alt</kbd>+<kbd>↑</kbd> ' +
       'then <kbd>TAB</kbd></kbd>'},
        {text: 'shift-X control-alt-del',
          expected: '<kbd><kbd>Shift</kbd>+<kbd>x</kbd> ' +
       'then <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>DEL</kbd></kbd>'},
        {text: 'c-x c-v',
          expected: '<kbd><kbd>Ctrl</kbd>+<kbd>x</kbd> ' +
       'then <kbd>Ctrl</kbd>+<kbd>v</kbd></kbd>'},
        {text: 'a-x enter',
          expected: '<kbd><kbd>Alt</kbd>+<kbd>x</kbd> ' +
       'then <kbd>ENTER</kbd></kbd>'},
      ];
      for (const {text, expected} of tests) {
        this.assertEqual(VMKeyboardService.parseSeq(text), expected, text);
      }
    }

    testKonamiCode() {
      this.assertEqual(VMKeyboardService.parseSeq(
        'up up down down left right left right b shift-a enter'
      ),
      '<kbd><kbd>↑</kbd> then <kbd>↑</kbd> then <kbd>↓</kbd> ' +
      'then <kbd>↓</kbd> then <kbd>←</kbd> then <kbd>→</kbd> ' +
      'then <kbd>←</kbd> then <kbd>→</kbd> then <kbd>b</kbd> ' +
      'then <kbd>Shift</kbd>+<kbd>a</kbd> then <kbd>ENTER</kbd></kbd>');
    }

  }
  /* eslint-enable */

  NH.xunit.testing.testCases.push(ParseSeqTestCase);

  /** LinkedIn specific information. */
  class LinkedIn extends NH.spa.Details {

    /**
     * @param {LinkedInGlobals} globals - Instance of a helper class to avoid
     * circular dependencies.
     */
    constructor(globals) {
      super();
      this.#globals = globals;
      this.#navbarMutationObserver = new MutationObserver(
        this.#navbarHandler
      );
      this.#navbarResizeObserver = new ResizeObserver(
        this.#navbarHandler
      );
      this.ready = this.#waitUntilPageLoadedEnough();
    }

    static Style = {
      UNKNOWN: Symbol.for('Style-0'),
      ONE: Symbol.for('Style-1'),
      TWO: Symbol.for('Style-2'),
    }

    static {
      Object.freeze(LinkedIn.Style);
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static ckeyIdentifier(element) {
      const me = LinkedIn.ckeyIdentifier.name;
      this.logger?.entered(me, element);

      const content = element?.getAttribute(CKEY);

      this.logger?.leaving(me, content);
      return content;
    }

    /**
     * Combine text from child headers.
     *
     * @param {Element} element - Element to examine.
     * @returns {string} - Combined header text.
     */
    static h2(element) {
      return element.querySelectorAll('h2')
        .values()
        .map(x => x.innerText.trim())
        .toArray()
        .join('; ');
    }

    urlChangeMonitorSelector = 'html';

    /** @type {NH.base.Dispatcher} */
    get dispatcher2() {
      return this.#dispatcher;
    }

    /** @type {LinkedInGlobals} - Instance passed in during construction. */
    get globals() {
      return this.#globals;
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
          if (e instanceof NH.userscript.Exception) {
            this.logger.log('e:', e);
            NH.base.issues.post(e.message);
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

    /** @type {HTMLElement} */
    get navbar() {
      return this.#navbar;
    }

    /** @type {NH.base.Dispatcher} */
    get navbarDispatcher() {
      return this.#navbarDispatcher;
    }

    /** @type {LinkedIn.Style} */
    get pageStyle() {
      return this.#pageStyle;
    }

    /** @param {SPA} spa - The SPA instance. */
    init(spa) {
      this.dispatcher.fire('initialize', spa);
      this.dispatcher.fire('initialized', null);
    }

    /** Called by SPA. */
    done() {
      const me = 'done';
      this.logger.entered(me);

      const licenseEntry = this.ui.tabs.get('License');
      licenseEntry.panel.addEventListener('expose', this.#licenseHandler);

      this.ui.tabs
        .get('News').panel.addEventListener('expose', this.#newsHandler);
      this.#infoTabs.tabs
        .get('News').panel.addEventListener('expose', this.#newsHandler);

      VMKeyboardService.condition = '!inputFocus && !inDialog';
      VMKeyboardService.start();

      this.logger.leaving(me);
    }

    /**
     * Many classes have some static {Scroller~How} items that need to be
     * fixed up after the page loads enough that the values are available.
     * They do that by calling this method.
     * @param {Scroller~How} how - Object to be fixed up.
     */
    navbarScrollerFixup(how) {
      const me = 'navbarScrollerFixup';
      this.logger.entered(me, how);

      how.topMarginPixels = this.#globals.navbarHeightPixels;
      how.topMarginCSS = this.#globals.navbarHeightCSS;
      how.bottomMarginCSS = '3em';

      this.logger.leaving(me, how);
    }

    /** Special processing to handle page transitions. */
    pageChanged() {
      const me = this.pageChanged.name;
      this.logger.entered(me);

      this.#navbarHandler();

      this.logger.leaving(me);
    }

    /** @inheritdoc */
    docTab() {
      const me = 'docTab';
      this.logger.entered(me);

      const issuesLink = this.#ghUrl('labels/linkedin-tool');
      const newIssueLink = this.#ghUrl('issues/new/choose');
      const newGfIssueLink = this.#gfUrl('feedback');
      const releaseNotesLink = this.#gfUrl('versions');

      const content = [
        `<p>This is information about the <b>${APP_LONG}</b> ` +
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
          'month or so that:</p>',
        '<ul>',
        '<li>Added new features like support for new pages or more ' +
          'hotkeys</li>',
        '<li>Explicitly fixed a bug</li>',
        '<li>May cause a user noticeable change</li>',
        '</ul>',
        '<p></p>',
        '<p>See the <b>About</b> tab for finding all changes by release.</p>',
      ];

      const dateHeader = 'h3';
      const issueHeader = 'h4';

      for (const [date, items] of dates) {
        content.push(`<${dateHeader}>${date}</${dateHeader}>`);
        for (const [issue, subjects] of items) {
          const ki = knownIssues.get(issue);
          content.push(
            `<${issueHeader}>${ki.title}</${issueHeader}>`
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

    #badgeErrorStyle1
    #badgeErrorStyle2
    #badgeResultsStyle2
    #dispatcher = new NH.base.Dispatcher('errors', 'news');
    #globals
    #iframeDoc
    #infoId
    #infoKeyboard
    #infoTabs
    #infoWidget
    #licenseData
    #licenseLoaded
    #navbar
    #navbarDispatcher = new NH.base.Dispatcher('resize');
    #navbarMutationObserver
    #navbarResizeObserver
    #ourMenuItemStyle1
    #ourMenuItemStyle2
    #pageStyle
    #shortcutsWidget
    #useOriginalInfoDialog = !litOptions.enableDevMode;

    /**
     * Create a Greasy Fork project URL.
     * @param {string} path - Portion of the URL.
     * @returns {string} - Full URL.
     */
    #gfUrl = (path) => {
      const base = 'https://greasyfork.org/en/scripts/472097-linkedin-tool';
      const url = `${base}/${path}`;
      return url;
    }

    /**
     * Create a GitHub project URL.
     * @param {string} path - Portion of the URL.
     * @returns {string} - Full URL.
     */
    #ghUrl = (path) => {
      const base = 'https://github.com/nexushoratio/userscripts';
      const url = `${base}/${path}`;
      return url;
    }

    /**
     * @param {HTMLElement} element - Starting element to avoid another query.
     * @returns {LinkedIn.Style} - Guessed style.
     */
    #guessPageStyle = (element) => {
      const me = this.#guessPageStyle.name;
      this.logger.entered(me, element);

      const hint = element.closest('[id]').id;
      let pageStyle = null;

      switch (hint) {
        case 'global-nav':
          pageStyle = LinkedIn.Style.ONE;
          break;
        case 'root':
          pageStyle = LinkedIn.Style.TWO;
          break;
        default:
          pageStyle = LinkedIn.Style.UNKNOWN;
      }

      this.logger.leaving(me, pageStyle);
      return pageStyle;
    }

    /** Hang out until the navigation bar has stabilized. */
    #waitUntilPageLoadedEnough = async () => {
      const me = 'waitOnPageLoadedEnough';
      this.logger.entered(me);

      // Wait for page to hopefully settle.
      await NH.web.waitForSelector(
        `${LinkedInGlobals.primaryNavSelector} svg`
      );

      this.#finishConstruction();

      this.logger.leaving(me);
    }

    /** Do the bits that were waiting on the page. */
    #finishConstruction = () => {
      const me = 'finishConstruction';
      this.logger.entered(me);

      this.#createInfoWidget();
      this.#addInfoTabs();
      this.#addScrollerStyle();
      this.#addLitStyle();
      this.#findNavbar();

      this.logger.leaving(me);
    }

    /**
     * @param {Event} evt - The 'expose' event.
     */
    #newsHandler = (evt) => {
      const me = this.#newsHandler.name;
      this.logger.entered(me, evt.target);

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
      this.#infoWidget = new NH.widget.Info(APP_LONG);
      const widget = this.#infoWidget.container;
      widget.classList.add('lit-info');
      document.body.prepend(widget);
      const dismissId = NH.base.safeId(`${widget.id}-dismiss`);

      const infoName = this.#infoName(dismissId);
      const instructions = this.#infoInstructions();

      widget.append(infoName, instructions);

      document.getElementById(dismissId)
        .addEventListener('click', () => {
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
      const nameElement = document.createElement('div');
      nameElement.classList.add('lit-justify');
      const title = `<b>${APP_LONG}</b> - v${GM.info.script.version}`;
      const dismiss = `<button id=${dismissId}>X</button>`;
      nameElement.innerHTML = `<span>${title}</span><span>${dismiss}</span>`;

      return nameElement;
    }

    /** @returns {Element} - Instructions for navigating the info widget. */
    #infoInstructions = () => {
      const instructions = document.createElement('div');
      instructions.classList.add('lit-justify');
      instructions.classList.add('lit-instructions');
      const left = VMKeyboardService.parseSeq('c-left');
      const right = VMKeyboardService.parseSeq('c-right');
      const esc = VMKeyboardService.parseSeq('esc');
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

    /** Create the CSS styles used for indicating the current items. */
    #addScrollerStyle() {
      const style = document.createElement('style');
      style.id = NH.base.safeId(`${this.id}-scroller-style`);
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

    /** Create CSS styles for stuff specific to LinkedIn Tool. */
    #addLitStyle = () => {  // eslint-disable-line max-lines-per-function
      const style = document.createElement('style');
      style.id = `${this.id}-style`;
      const styles = [
        '.lit-info:modal {' +
          ' height: 100%;' +
          ' width: 65rem;' +
          ' font-size: 1.6rem;' +
          ' line-height: 1.5em;' +
          ' display: flex;' +
          ' flex-direction: column;' +
          '}',
        '.lit-info button {' +
          ' border-width: 1px;' +
          ' border-style: solid;' +
          ' border-radius: 1em;' +
          ' padding: 3px;' +
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
        '.lit-info kbd > kbd {' +
          ' font-size: 0.85em;' +
          ' padding: 0.07em;' +
          ' border-width: 1px;' +
          ' border-style: solid;' +
          '}',
        '.lit-info p {margin-bottom: 1em; }',
        '.lit-info ul {' +
          ' list-style: unset;' +
          ' padding-inline: revert;' +
          '}',
        '.lit-info th { padding-top: 1em; text-align: left; }',
        '.lit-info td:first-child {' +
          ' white-space: nowrap;' +
          ' text-align: right;' +
          ' padding-right: 0.5em;' +
          '}',
        '.lit-kbd-service-active th { background-color: lightgray; }',
        '.lit-menu-badge-news {' +
          ' position: absolute;' +
          ' bottom: 14px;' +
          ' right: -5px;' +
          ' width: 16px;' +
          ' height: 16px;' +
          ' border-radius: 50%;' +
          ' border: 5px solid green;' +
          '}',
        '.lit-menu-badge-error {' +
          ' align-items: center;' +
          ' background-color: rgb(203, 17, 45);' +
          ' block-size: 12px;' +
          ' border-radius: 9px;' +
          ' bottom: 13.5px;' +
          ' color-scheme: light;' +
          ' color: white;' +
          ' display: flex;' +
          ' font-size: 9px;' +
          ' font-weight: 600;' +
          ' height: 12px;' +
          ' inset-block-start: -1.5px;' +
          ' inset-inline-start: 24px;' +
          ' justify-content: center;' +
          ' left: 24px;' +
          ' margin-inline-start: -6px;' +
          ' margin-left: -6px;' +
          ' min-inline-size: 12px;' +
          ' min-width: 12px;' +
          ' padding-inline-end: 3px;' +
          ' padding-inline-start: 3px;' +
          ' padding-left: 3px;' +
          ' padding-right: 3px;' +
          ' position: absolute;' +
          ' top: -1.5px;' +
          ' z-index: 100;' +
          '}',
        // Get rid of the donut
        '.lit-menu-badge-error::after {' +
          ' content: none !important;' +
          '}',
        '.lit-menu-badge-hide { opacity: 0; }',
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

      this.#infoTabs = new TabbedUI(APP_LONG);

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

    #toolButtonHandler = () => {
      if (this.#useOriginalInfoDialog) {
        const info = document.querySelector(`#${this.infoId}`);
        info.showModal();
        info.dispatchEvent(new Event('open'));
      } else {
        this.#infoWidget.open();
      }
      if (litOptions.enableDevMode) {
        // Toggle which dialog is used.
        this.#useOriginalInfoDialog = !this.#useOriginalInfoDialog;
      }
    }

    /**
     * Update error badge as appropriate.
     *
     * @implements {NH.base.Dispatcher~Handler}
     * @param {string} eventType - Event type.
     * @param {number} count - Number of errors currently logged.
     */
    #errorHandlerBadgeStyle1 = (eventType, count) => {
      const me = this.#errorHandlerBadgeStyle1.name;
      this.logger.entered(me, eventType, count);

      const toggle = this.#badgeErrorStyle1.parentElement;
      this.#badgeErrorStyle1.innerText = `${count}`;

      if (count) {
        toggle.classList.add('notification-badge--show');
      } else {
        toggle.classList.remove('notification-badge--show');
      }

      this.logger.leaving(me);
    }

    /**
     * Tweak the internals of whatever random element we cloned.
     *
     * @param {HTMLElement} button - The newly created button.
     */
    #finishButtonStyle1 = (button) => {
      button.querySelector('.notification-badge')
        ?.classList.remove('notification-badge--show');

      const a11y = button.querySelector('.a11y-text');
      if (a11y) {
        a11y.innerText = `${APP_LONG} notifications`;
      }

      const count = button.querySelector('.notification-badge__no-count');
      count?.classList.remove('notification-badge__no-count');
      count?.classList.add('notification-badge__count');

      const title = button.querySelector('.global-nav__primary-link-text');
      title.innerText = APP_SHORT;
      title.setAttribute('title', APP_SHORT);
    }

    /** @param {Element} element - Element that will hold the badges. */
    #assembleBadgesStyle1 = (element) => {
      this.#badgeErrorStyle1 = element.querySelector(
        '.notification-badge__count'
      );
    }

    #createMenuItemStyle1 = () => {
      const me = this.#createMenuItemStyle1.name;
      this.logger.entered(me, this.#navbar);

      // Making the assumption that the there is at least one item with a
      // badge and it is an anchor.
      let item = this.#navbar
        .querySelector('.global-nav__primary-item:has(.notification-badge)');
      const subItem = item.querySelector('a');
      item = item.cloneNode(false);

      const button = document.createElement('button');
      button.classList.add('global-nav__primary-link');

      button.append(...Array.from(subItem.childNodes)
        .map(x => x.cloneNode(true))
        .map((x) => {
          x.removeAttribute?.('id');
          return x;
        }));

      const svg = button.querySelector('svg');
      if (svg) {
        svg.parentElement.innerHTML = LinkedIn.#icon;
        item.append(button);

        this.#finishButtonStyle1(button);
        this.#assembleBadgesStyle1(button);

        button.addEventListener('click', this.#toolButtonHandler);
        this.#ourMenuItemStyle1 = item;
        this.dispatcher2.on('errors', this.#errorHandlerBadgeStyle1);
      }

      this.logger.leaving(me, this.#ourMenuItemStyle1);
    }

    /**
     * Updates error badge as appropriate.
     *
     * @implements {NH.base.Dispatcher~Handler}
     * @param {string} eventType - Event type.
     * @param {number} count - Number of errors currently logged.
     */
    #errorHandlerBadgeStyle2 = (eventType, count) => {
      const me = this.#errorHandlerBadgeStyle2.name;
      this.logger.entered(me, eventType, count);

      this.#badgeErrorStyle2.innerText = `${count}`;

      if (count) {
        this.#badgeErrorStyle2
          .classList.remove('lit-menu-badge-hide');
      } else {
        this.#badgeErrorStyle2.classList.add('lit-menu-badge-hide');
      }

      this.logger.leaving(me);
    }

    /**
     * Tweak the internals of whatever random element we cloned.
     *
     * @param {HTMLElement} button - The newly created button.
     */
    #finishButtonStyle2 = (button) => {
      // Grab the common obfuscated class names
      const buttons = this.#navbar.querySelectorAll('li > button');
      const buttonClasses = new Set(buttons[0].classList)
        .intersection(new Set(buttons[1].classList));

      button.ariaLabel = APP_SHORT;
      button.removeAttribute('aria-current');
      button.className = [...buttonClasses].join(' ');

      const textNodes = Array.from(button.querySelectorAll('*'))
        .filter(el => el.childNodes[0]?.nodeType === Node.TEXT_NODE);

      textNodes[0].innerText = APP_SHORT;
    }

    /** @param {Element} element - Element that will hold the badges. */
    #assembleBadgesStyle2 = (element) => {
      this.#badgeErrorStyle2 = document.createElement('span');
      this.#badgeErrorStyle2.classList.add('lit-menu-badge-error');
      element.append(this.#badgeErrorStyle2);
    }

    #createMenuItemStyle2 = () => {
      const me = this.#createMenuItemStyle2.name;
      this.logger.entered(me, this.#navbar);

      const item = this.#navbar
        .querySelector('li')
        .cloneNode(true);

      // The page may not have settled down yet, so check each bit carefully.
      const button = item.querySelector('button');
      if (button) {
        const svg = button.querySelector('svg');
        if (svg) {
          const svgParent = svg.parentElement;
          svg.outerHTML = LinkedIn.#icon;

          button.querySelector('svg + span')
            ?.remove();

          this.#finishButtonStyle2(button);
          this.#assembleBadgesStyle2(svgParent);

          button.addEventListener('click', this.#toolButtonHandler);
          this.#ourMenuItemStyle2 = item;
          this.dispatcher2.on('errors', this.#errorHandlerBadgeStyle2);
        }
      }

      this.logger.leaving(me, this.#ourMenuItemStyle2);
    }

    /**
     * Connect our menu item to the navbar if necessary.
     *
     * It will always go after "Me" menu item.
     *
     * This supports both Styles 1 and 2.
     *
     * @param {HTMLElement} menuItem - The menu item to connect.
     * @param {string} selector - The CSS selector for "Me".
     */
    #connectMenuItem = (menuItem, selector) => {
      const me = this.#connectMenuItem.name;
      this.logger.entered(me, menuItem, selector);

      if (this.#navbar) {
        if (!menuItem.isConnected) {
          this.logger.log('Will connect menu item to', this.navbar);

          const navMe = this.#navbar.querySelector(selector)
            ?.closest('li');
          this.logger.log('navMe', navMe);

          if (navMe) {
            navMe.after(menuItem);
          } else {
            // If the site changed and we cannot insert ourself after the Me
            // menu item, then go first.
            this.#navbar.prepend(menuItem);
            NH.base.issues.post(
              'Unable to find the Profile navbar item.',
              'LIT menu installed in non-standard location.'
            );
          }
          this.spa.refreshErrors();
        }
      }

      this.logger.leaving(me);
    }

    #ensureMenuStyle1 = () => {
      const me = this.#ensureMenuStyle1.name;
      this.logger.entered(me, this.#ourMenuItemStyle1);

      if (this.#pageStyle === LinkedIn.Style.ONE) {
        if (!this.#ourMenuItemStyle1) {
          this.#createMenuItemStyle1();
        }
        if (this.#ourMenuItemStyle1) {
          this.#connectMenuItem(this.#ourMenuItemStyle1, '.global-nav__me');
        }
      }

      this.logger.leaving(me);
    }

    #compareBadgeStyles2 = () => {
      const me = this.#compareBadgeStyles2.name;
      this.logger.entered(me, this.#badgeResultsStyle2);

      // Only do this once.
      if (!this.#badgeResultsStyle2) {
        // Some badges are bad examples, so skip them using :not().
        const badges = this.navbar
          .querySelectorAll('svg:not([id^="home"]) + span');
        if (badges.length > NH.base.ONE_ITEM) {
          const ignoreSet = new Set(['opacity']);
          const results = [];
          const ours = getComputedStyle(this.#badgeErrorStyle2);
          const theirs = getComputedStyle(badges[0]);
          const ourSet = new Set([...ours]);
          const theirSet = new Set([...theirs]);
          for (const prop of ourSet.union(theirSet)
            .difference(ignoreSet)) {
            const ourValue = ours.getPropertyValue(prop);
            const theirValue = theirs.getPropertyValue(prop);
            if (ourValue !== theirValue) {
              results.push(`' ${prop}: ${theirValue};' +`);
            }
          }
          if (results.length) {
            NH.base.issues.post(
              'Style-2 error badge needs updating:', results.join('\n')
            );
          }
          this.#badgeResultsStyle2 = results;
        }
      }

      this.logger.leaving(me);
    }

    #ensureMenuStyle2 = () => {
      const me = this.#ensureMenuStyle2.name;
      this.logger.entered(me, this.#ourMenuItemStyle2);

      if (this.#pageStyle === LinkedIn.Style.TWO) {
        if (!this.#ourMenuItemStyle2) {
          this.#createMenuItemStyle2();
        }
        if (this.#ourMenuItemStyle2) {
          this.#connectMenuItem(this.#ourMenuItemStyle2, 'li:last-child');
        }
        if (this.#ourMenuItemStyle2?.isConnected) {
          this.#compareBadgeStyles2();
        }
      }

      this.logger.leaving(me);
    }

    /** Find the nav links and ensure observers. */
    #findNavbar = () => {
      const me = this.#findNavbar.name;
      this.logger.entered(me, this.#navbar?.isConnected);

      if (!this.#iframeDoc) {
        const iframe = document
          .querySelector('iframe[data-testid]')
          ?.contentDocument;
        // Do not track the iframe until it has settled a bit.
        if (iframe && iframe.URL !== 'about:blank') {
          this.#iframeDoc = iframe;
        }
      }

      let doObserve = !this.#navbar?.isConnected;

      const navbar = document.querySelector(
        LinkedInGlobals.primaryNavSelector
      ) || this.#iframeDoc
        ?.querySelector(LinkedInGlobals.primaryNavSelector);

      if (navbar) {
        const pageStyle = this.#guessPageStyle(navbar);
        doObserve ||= pageStyle !== this.#pageStyle;
        this.#pageStyle = pageStyle;
      }

      if (this.#navbar && navbar) {
        doObserve ||= !this.#navbar.isSameNode(navbar);
      }

      if (doObserve) {
        this.#navbar = navbar;
        this.#observeNavbar();
      }

      this.logger.leaving(me, this.#navbar);
    }

    /** Reset observers for the navbar. */
    #observeNavbar = () => {
      const me = this.#observeNavbar.name;
      this.logger.entered(me, this.#navbar);

      this.#navbarMutationObserver.disconnect();
      this.#navbarResizeObserver.disconnect();

      if (this.#iframeDoc?.head) {
        this.#navbarMutationObserver.observe(
          this.#iframeDoc.head, {childList: true, subtree: true}
        );
      }

      if (this.#navbar) {
        this.#navbarMutationObserver.observe(
          this.#navbar, {childList: true, subtree: true}
        );
        this.#navbarResizeObserver.observe(this.#navbar);
      }

      this.logger.leaving(me);
    }

    /**
     * Recheck various items after a change to the navbar.
     * @fires 'resize'
     */
    #navbarHandler = () => {
      const me = this.#navbarHandler.name;
      this.logger.entered(me);

      const margin = 4;

      this.#findNavbar();

      if (this.#navbar) {
        this.#ensureMenuStyle1();
        this.#ensureMenuStyle2();

        this.logger.log('Raw navbar height is', this.#navbar.clientHeight);
        this.#globals.navbarHeightPixels = this.#navbar.clientHeight + margin;

        this.#navbarDispatcher.fire('resize', this.#globals);
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
      const me = this.#buildShortcutsInfo.name;
      this.logger.entered(me);

      this.#shortcutsWidget.clear();

      const activeFirst = [
        ...VMKeyboardService.services.values()
          .filter(x => x.active),
        ...VMKeyboardService.services.values()
          .filter(x => !x.active),
      ];
      for (const service of activeFirst) {
        this.logger.log('service:', service.shortName, service.active);
        // Works in progress may not have any shortcuts yet.
        if (service.shortcuts.length) {
          const parsedName = NH.base.simpleParseWords(service.shortName)
            .join(' ');
          const section = this.#shortcutsWidget.addSection(service.shortName);
          if (service.active) {
            section.classList.add('lit-kbd-service-active');
          }
          this.#shortcutsWidget.addHeader('', parsedName);
          for (const shortcut of service.shortcuts) {
            this.logger.log('shortcut:', shortcut);
            this.#shortcutsWidget.addData(
              `${VMKeyboardService.parseSeq(shortcut.seq)}:`, shortcut.desc
            );
          }
        }
      }

      this.logger.leaving(me);
    }

    /**
     * Post problems about stale issues.
     *
     * @param {Set<string>} unknown - Issue ids referenced in news items but
     * not in {@link globalKnownIssues}.
     * @param {Set<string>} unused - Stale {@link globalKnownIssues} ids.
     * @param {Set<string>} old - Stale {@link globalNewsContent} entries.
     */
    #reportIssueProblems = (unknown, unused, old) => {
      for (const item of unknown) {
        NH.base.issues.post('Unknown issue detected:', item);
      }

      for (const item of old) {
        NH.base.issues.post('Old news item:', item);
      }

      for (const item of unused) {
        NH.base.issues.post('Unused issue detected:', item);
      }
    }

    /** @returns {obj} - dates and known issues. */
    #preprocessKnownIssues = () => {  // eslint-disable-line max-lines-per-function
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;  // eslint-disable-line no-magic-numbers
      const oldestAllowedDate = litOptions.enableMigrateKIFailures
        ? Date.now() - thirtyDays
        : 0;
      const defaultDate = litOptions.enableMigrateKIFailures
        ? '1999'
        : '9999';

      /**
       * Migrate to new format.
       * @param {KnownIssue} issue - Mix of old and new formats.
       * @returns {KnownIssue} - But updated to the new format.
       */
      const migrateKnownIssues = (issue) => {
        const key = issue[0];
        let details = issue[1];
        if (typeof details === 'string') {
          details = {
            title: details,
            date: defaultDate,
          };
        }
        return [key, details];
      };

      const knownIssues = new Map(globalKnownIssues.map(migrateKnownIssues));
      const unknownIssues = new Set();
      const unusedIssues = new Set(
        knownIssues
          .entries()
          .filter(x => new Date(x[1].date) < oldestAllowedDate)
          .map(x => x[0])
      );
      const oldItems = new Set();

      const dates = new NH.base.DefaultMap(
        () => new NH.base.DefaultMap(Array)
      );

      for (const item of globalNewsContent) {
        if (new Date(item.date) < oldestAllowedDate) {
          oldItems.add(item.subject);
        }
        for (const issue of item.issues) {
          if (knownIssues.has(issue)) {
            unusedIssues.delete(issue);
            dates.get(item.date)
              .get(issue)
              .push(item.subject);
          } else {
            unknownIssues.add(issue);
          }
        }
      }

      this.#reportIssueProblems(unknownIssues, unusedIssues, oldItems);

      return {
        dates: dates,
        knownIssues: knownIssues,
      };
    }

  }

  /** TODO(#295): This is a hack.  Find a more principled solution. */
  class HybridFixerService extends NH.base.Service {

    /**
     * @param {string} name - Custom portion of this instance.
     * @param {Page} page - Page this service is tied to.
     */
    constructor(name, page) {
      super(name);
      this.#page = page;
      this.on('activate', this.#onActivate);
    }

    #page

    #onActivate = () => {
      const pageStyle = this.#page.spa.details.pageStyle;
      const main = document.querySelector('main')?.id;
      if (pageStyle === LinkedIn.Style.ONE && main === 'workspace') {
        this.logger.log('hybrid mode, reloading');
        document.location.reload();
      }
    }

  }

  /**
   * Verify a {Page} implementation and current site style match.
   *
   * It will post a bug on mismatches.
   */
  class LinkedInStyleService extends NH.base.Service {

    /**
     * @param {string} name - Custom portion of this instance.
     * @param {Page} page - Page this service is tied to.
     */
    constructor(name, page) {
      super(name);
      this.#page = page;
      this.on('activate', this.#onActivate);
    }

    /**
     * @param {...LinkedIn.Style} styles - Styles allowed for the page.
     * @returns {LinkedInStyleService} - This instance, for chaining.
     */
    addStyles(...styles) {
      for (const style of styles) {
        this.#allowedStyles.add(style);
      }
      return this;
    }

    #allowedStyles = new Set();
    #page

    #onActivate = () => {
      if (!this.#allowedStyles.has(this.#page.spa.details.pageStyle)) {
        const style = this.#page.spa.details.pageStyle.toString()
          .replace('Symbol(', '')
          .replace(')', '');
        NH.base.issues.post([
          `The page "${this.shortName}" was activated`,
          `with unsupported style: ${style}`,
        ].join(' '));
      }
    }

  }

  /**
   * Helper for pages that have an extra drop-down toolbar.
   *
   * Some LinkedIn pages have an extra toolbar that will drop down and obscure
   * content.  This makes it difficult for `LinkedIn.navbarScrollerFixup()` to
   * properly adjust.
   *
   * For those pages, use this Service which will activate once to do the
   * initial fixups, then the additional ones necessary for that page.
   */
  class LinkedInToolbarService extends NH.base.Service {

    /**
     * @param {string} name - Custom portion of this instance.
     * @param {Page} page - Page this service is tied to.
     */
    constructor(name, page) {
      super(name);
      this.#page = page;
      this.#postHook = () => {};  // eslint-disable-line no-empty-function
      this.on('activate', this.#onActivate);
    }

    /**
     * @param {...Scroller~How} hows - How types to update.
     * @returns {LinkedInToolbarService} - This instance, for chaining.
     */
    addHows(...hows) {
      for (const how of hows) {
        this.#scrollerHows.add(how);
      }
      return this;
    }

    /**
     * Often a {Page} would like to do a bit more initialization after this
     * fixups.  That is what this hook is for.
     *
     * @param {NH.web.SimpleFunction} hook - Function to call post activation.
     * @returns {LinkedInToolbarService} - This instance, for chaining.
     */
    postActivateHook(hook) {
      this.#postHook = hook;
      return this;
    }

    #activatedOnce = false;
    #page
    #postHook
    #scrollerHows = new Set();

    #onActivate = () => {
      const me = 'onActivate';
      this.logger.entered(me, this.#page);

      if (!this.#activatedOnce) {
        const toolbarElement = document.querySelector(
          '.scaffold-layout-toolbar'
        );
        this.logger.log('toolbar:', toolbarElement);

        if (toolbarElement) {
          for (const how of this.#scrollerHows) {
            this.logger.log('how:', how);
            this.#page.spa.details.navbarScrollerFixup(how);

            const newHeight = how.topMarginPixels +
                  toolbarElement.clientHeight;
            const newCSS = `${newHeight}px`;

            how.topMarginPixels = newHeight;
            how.topMarginCSS = newCSS;
          }

          this.#postHook();
        }
      }

      this.#activatedOnce = true;

      this.logger.leaving(me);
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

    /**
     * @typedef {object} PageDetails
     * @property {SPA} spa - SPA instance that manages this Page.
     * @property {string} [pageName=this.constructor.name] - A human readable
     * name for this page (normally parsed from the subclass name).
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
      this.#pageId = this.constructor.name;
      this.#spa = details.spa;
      this.#logger = new NH.base.Logger(this.pageId);
      this.#pathnameRE = this.#computePathname(details.pathname);
      ({
        pageReadySelector: this.#pageReadySelector = 'body',
        pageName: this.#pageName = NH.base.simpleParseWords(this.#pageId)
          .join(' '),
      } = details);
      this.#logger.log('Base page constructed', this);
    }

    /** @type {Shortcut[]} - List of {@link Shortcut}s to register. */
    get allShortcuts() {
      const shortcuts = [];
      for (const [name, prop] of Object.entries(this)) {
        if (prop instanceof Shortcut) {
          shortcuts.push(prop);
          // While we are here, give the function a name.
          Object.defineProperty(prop, 'name', {value: name});
        }
      }
      return shortcuts;
    }

    /** @type {KeyboardService} */
    get keyboard() {
      return this.#keyboard;
    }

    /** @type {NH.base.Logger} */
    get logger() {
      return this.#logger;
    }

    /** @type {string} - Machine readable name for the page. */
    get pageId() {
      return this.#pageId;
    }

    /** @type {string} - Human readable name for the page. */
    get pageName() {
      return this.#pageName;
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
     * @param {function(): NH.base.Service} Klass - A service class to
     * instantiate.
     * @param {...*} rest - Arbitrary objects to pass to constructor.
     * @returns {NH.base.Service} - Instance of Klass.
     */
    addService(Klass, ...rest) {
      const me = 'addService';
      this.logger.entered(me, Klass, ...rest);

      let instance = null;
      if (Klass.prototype instanceof NH.base.Service) {
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

    /**
     * Turns on this Page's features.  Called by {@link SPA} when this becomes
     * the current view.
     */
    async activate() {
      const me = 'activate';
      this.logger.entered(me);

      if (!litOptions.enableKeyboardService) {
        this.logger.log('enabling SPA-based keyboard handling');
        this.#keyboard.enable();
      }
      await this.#waitUntilReady();
      for (const service of this.#services) {
        this.logger.log(`activating service: "${service.name}"`);
        service.activate();
      }

      this.logger.leaving(me);
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

    /**
     * @type {IShortcutOptions} - Disables keys when focus is on an element or
     * info view.
     */
    static #navOption = {
      caseSensitive: true,
      condition: '!inputFocus && !inDialog',
    };

    /** @type {KeyboardService} */
    #keyboard = new VM.shortcut.KeyboardService();

    /** @type {NH.base.Logger} - NH.base.Logger instance. */
    #logger

    #pageId
    #pageName
    #pageReadySelector

    /** @type {RegExp} - Computed RegExp version of details.pathname. */
    #pathnameRE

    #services = new Set();

    /** @type {SPA} - SPA instance managing this instance. */
    #spa

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
     * Wait until the page has loaded enough to continue.
     * @returns {Element} - The element matched by #pageReadySelector.
     */
    #waitUntilReady = async () => {
      const me = this.#waitUntilReady.name;
      this.logger.entered(me, this.#pageReadySelector);

      const timeout = 3000;
      let element = null;
      try {
        element = await NH.web.waitForSelector(
          this.#pageReadySelector, timeout
        );
      } catch (e) {
        NH.base.issues.post(
          `${this.pageId} failed to load`,
          e.message,
          this.#pageReadySelector
        );
      }

      this.logger.leaving(me, element);
      return element;
    }

    /**
     * Registers a specific key sequence with a function with VM.shortcut.
     * @param {Shortcut} shortcut - Shortcut to register.
     */
    #addKey = (shortcut) => {
      this.#keyboard.register(shortcut.seq, shortcut, Page.#navOption);
    }

  }

  /** Class for holding keystrokes that simplify debugging. */
  class DebugKeys {

    /** @param {NH.base.Logger} logger - Logger to use. */
    constructor(logger) {
      this.#logger = logger;
    }

    clearConsole = new Shortcut(
      'c-c c-c',
      'Clear the debug console',
      () => {
        NH.base.Logger.clear();
      }
    );

    activeElement = new Shortcut(
      'c-c c-a',
      'Log the active element',
      () => {
        this.#logger.log('activeElement', document.activeElement);
      }
    );

    #logger

  }

  const linkedInGlobals = new LinkedInGlobals();

  /**
   * Class for handling aspects common across LinkedIn.
   *
   * This includes things like the global nav bar, information view, etc.
   */
  class Global extends Page {

    /** @param {SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa});

      this.addService(HybridFixerService, this);

      this.addService(LinkedInStyleService, this)
        .addStyles(LinkedIn.Style.ONE, LinkedIn.Style.TWO);

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);
      if (litOptions.enableDevMode) {
        const dk = new DebugKeys(this.logger);
        this.#keyboardService.addInstance(dk);
      }

      if (litOptions.enableAlertUnsupportedPages) {
        this.addService(Global.#Activator, this);
      }
    }

    info = new Shortcut(
      '?',
      'Show this information view',
      () => {
        if (this.spa.details.pageStyle === LinkedIn.Style.ONE) {
          this.#gotoNavButton(APP_SHORT);
        } else {
          this.#gotoNavLabel(APP_SHORT);
        }
      }
    );

    gotoSearch = new Shortcut(
      '/',
      'Go to Search box',
      () => {
        if (this.spa.details.pageStyle === LinkedIn.Style.ONE) {
          NH.web.clickElement(document, ['#global-nav-search button']);
        } else {
          const element = document.querySelector(
            `[${CKEY}="SearchResults_SearchTyahInputRef"]`
          );
          NH.web.focusOnElement(element);
        }
      }
    );

    goHome = new Shortcut(
      'g h',
      'Go Home (aka, Feed)',
      () => {
        if (this.spa.details.pageStyle === LinkedIn.Style.ONE) {
          this.#gotoNavLink('feed');
        } else {
          this.#gotoNavLabel('Home');
        }
      }
    );

    gotoMyNetwork = new Shortcut(
      'g w',
      'Go to My Network',
      () => {
        if (this.spa.details.pageStyle === LinkedIn.Style.ONE) {
          this.#gotoNavLink('mynetwork');
        } else {
          this.#gotoNavLabel('My Network');
        }
      }
    );

    gotoJobs = new Shortcut(
      'g j',
      'Go to Jobs',
      () => {
        if (this.spa.details.pageStyle === LinkedIn.Style.ONE) {
          this.#gotoNavLink('jobs');
        } else {
          this.#gotoNavLabel('Jobs');
        }
      }
    );

    gotoMessaging = new Shortcut(
      'g m',
      'Go to Messaging',
      () => {
        if (this.spa.details.pageStyle === LinkedIn.Style.ONE) {
          this.#gotoNavLink('messaging');
        } else {
          this.#gotoNavLabel('Messaging');
        }
      }
    );

    gotoNotifications = new Shortcut(
      'g n',
      'Go to Notifications',
      () => {
        if (this.spa.details.pageStyle === LinkedIn.Style.ONE) {
          this.#gotoNavLink('notifications');
        } else {
          this.#gotoNavLabel('Notifications');
        }
      }
    );

    gotoProfile = new Shortcut(
      'g p',
      'Go to Profile (aka, Me)',
      () => {
        if (this.spa.details.pageStyle === LinkedIn.Style.ONE) {
          this.#gotoNavButton('Me');
        } else {
          // Nothing easy to identify, so assume always after Notification
          this.spa.details
            .navbar
            .querySelector('[aria-label^="Notifications"]')
            .closest('li')
            .nextSibling
            .querySelector('button')
            .click();
        }
      }
    );

    gotoBusiness = new Shortcut(
      'g b',
      'Go to Business',
      () => {
        if (this.spa.details.pageStyle === LinkedIn.Style.ONE) {
          this.#gotoNavButton('Business');
        } else {
          this.#gotoNavLabel('For Business');
        }
      }
    );

    gotoLearning = new Shortcut(
      'g l',
      'Go to Learning',
      () => {
        this.#gotoNavLink('learning');
      }
    );

    focusOnSidebar = new Shortcut(
      ',',
      'Focus on the left/top sidebar (not always present)',
      () => {
        linkedInGlobals.focusOnSidebar();
      }
    );

    focusOnAside = new Shortcut(
      '.',
      'Focus on the right/bottom sidebar (not always present)',
      () => {
        linkedInGlobals.focusOnAside();
      }
    );

    /** Called on every page activation to reset observers. */
    async activate() {
      await super.activate();
      this.spa.details.pageChanged();
    }

    static #Activator = class extends NH.base.Service {

      /**
       * @param {string} name - Custom portion of this instance.
       * @param {Page} page - Page this service is tied to.
       */
      constructor(name, page) {
        super(name);
        this.#page = page;
        this.on('activate', this.#onActivate);
      }

      #page

      /** Called each time service is activated. */
      #onActivate = () => {
        const me = 'onActivate';
        this.logger.entered(me);

        if (this.#page.spa.activePages.size === NH.base.ONE_ITEM) {
          const pathname = window.location.pathname;
          /* eslint-disable prefer-regex-literals */
          const knownUrlsTodo = [
            // TODO(#237): Support *SpecificEvent* pages
            RegExp('^/events/.*/(?:about|comments)/.*', 'u'),
            // TODO(#253): Support *My Network Events* page
            '/mynetwork/network-manager/events/',
            // TODO(#255): Support *Search appearances* page
            '/analytics/search-appearances/',
            // TODO(#256): Support *Verify* page
            RegExp('/verify/?.*', 'u'),
            // TODO(#257): Support *Analytics & tools* page
            '/dashboard/',
            // TODO(#260): Support *My Jobs* page
            RegExp('^/my-items/saved-jobs/.*', 'u'),
            // TODO(#261): Support *Follow Page* Page
            '/suggested-for-you/follow-page/',
            // TODO(#262): Support *Analytics Posts* Page
            '/analytics/creator/content/',
            // TODO(#263): Support *Feed update* Page
            '/feed/update/',
            // TODO(#264): Support *Saved Posts* Page
            '/my-items/saved-posts/',
            // TODO(#265): Support *Post analytics* Page
            '/analytics/post-summary/',
            // TODO(#266): Support *Company* Page
            '/company/',
          ];
          /* eslint-enable */

          if (!knownUrlsTodo.some(x => pathname.match(x))) {
            NH.base.issues.post('Unsupported page:', window.location);
          }
        }

        this.logger.leaving(me);
      }

    }

    #keyboardService

    /**
     * Click on the requested link in the global nav bar.
     * @param {string} item - Portion of the link to match.
     */
    #gotoNavLink = (item) => {
      const me = this.#gotoNavLink.name;
      this.logger.entered(me, item);

      // The navbar elements may be split across two containers.  So we start
      // at the navbar, move up to find a container that has the link.
      const target = `a[href*="/${item}"]`;
      this.spa.details.navbar
        .closest(`:has(${target})`)
        .querySelector(target)
        .click();

      this.logger.leaving(me);
    }

    /**
     * Click on the requested button in the global nav bar.
     * @param {string} item - Text on the button to look for.
     */
    #gotoNavButton = (item) => {
      const me = 'gotoNavButton';
      this.logger.entered(me, item);

      Array.from(
        this.spa.details.navbar.querySelectorAll('button')
      )
        .find(el => el.textContent.includes(item))
        ?.click();

      this.logger.leaving(me);
    }

    /**
     * Click on the requested element in the Style-2 global nav bar.
     *
     * This uses the `aria-label`, which has the potential to be translated.
     * @param {string} item - The prefix for the target `aria-label`.
     */
    #gotoNavLabel = (item) => {
      const me = this.#gotoNavLabel.name;
      this.logger.entered(me, item);

      // The navbar elements may be split across two containers.  So we start
      // at the navbar, move up to find a container that has the label, then
      // back down.
      const target = `[aria-label^="${item}"]`;
      this.spa.details.navbar
        .closest(`:has(${target})`)
        .querySelector(target)
        .click();

      this.logger.leaving(me);
    }

  }

  /** Class for handling the Posts feed. */
  class Feed extends Page {

    /** @param {SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...Feed.#details});

      this.addService(LinkedInStyleService, this)
        .addStyles(LinkedIn.Style.TWO);

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      spa.details.navbarScrollerFixup(Feed.#postsHow);
      spa.details.navbarScrollerFixup(Feed.#commentsHow);

      this.#postScroller = new Scroller(Feed.#postsWhat, Feed.#postsHow);
      this.addService(LinkedInScrollerService)
        .setScroller(this.#postScroller);
      this.#postScroller.dispatcher.on(
        'out-of-range', linkedInGlobals.focusOnSidebar
      );
      this.#postScroller.dispatcher.on('activate', this.#onPostActivate);
      this.#postScroller.dispatcher.on('change', this.#onPostChange);

      this.#lastScroller = this.#postScroller;
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniquePostIdentifier(element) {
      const me = Feed.uniquePostIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const key = LinkedIn.ckeyIdentifier(element);
      const groups = Feed.#uidPostRE.exec(key)?.groups;

      if (key) {
        content = key;
      }
      if (groups) {
        content = groups.body;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueCommentIdentifier(element) {
      const me = Feed.uniqueCommentIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const key = LinkedIn.ckeyIdentifier(element);
      const groups = Feed.#uidCommentRE.exec(key)?.groups;

      if (key) {
        content = key;
      }
      if (groups) {
        content = groups.body;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /** @type {Scroller} */
    get comments() {
      const me = 'get comments';
      this.logger.entered(me, this.#commentScroller, this.posts.item);

      if (!this.#commentScroller && this.posts.item) {
        this.#commentScroller = new Scroller(
          {base: this.posts.item, ...Feed.#commentsWhat}, Feed.#commentsHow
        );
        this.#commentScroller.dispatcher.on(
          'out-of-range', this.#returnToPost
        );
        this.#commentScroller.dispatcher.on('change', this.#onCommentChange);
      }

      this.logger.leaving(me, this.#commentScroller);
      return this.#commentScroller;
    }

    /** @type {Scroller} */
    get posts() {
      return this.#postScroller;
    }

    nextPost = new Shortcut(
      'j',
      'Next post',
      () => {
        this.posts.next();
      }
    );

    prevPost = new Shortcut(
      'k',
      'Previous post',
      () => {
        this.posts.prev();
      }
    );

    nextComment = new Shortcut(
      'n',
      'Next comment',
      () => {
        this.comments.next();
      }
    );

    prevComment = new Shortcut(
      'p',
      'Previous comment',
      () => {
        this.comments.prev();
      }
    );

    firstItem = new Shortcut(
      '<',
      'Go to first post or comment',
      () => {
        this.#lastScroller.first();
      }
    );

    lastItem = new Shortcut(
      '>',
      'Go to last post or comment currently loaded',
      () => {
        this.#lastScroller.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Change browser focus to current item',
      () => {
        if (litOptions.enableScrollerChangesFocus) {
          this.#lastScroller.focus();
        } else {
          const el = this.#lastScroller.item;
          this.posts.show();
          this.comments?.show();
          NH.web.focusOnElement(el, false);
        }
      }
    );

    showComments = new Shortcut(
      'c',
      'Show comments',
      () => {
        const el = this.posts.item;
        // Check for the "Load more" button first, otherwise we just keep
        // clicking on the first comment button which does nothing useful
        // after the first batch of comments is loaded.
        NH.web.clickElement(el, [
          // Load more comments
          `[${CKEY}*="LoadMoreComments"] button`,
          // Inside post body
          '[role="button"]',
        ]);
      }
    );

    seeMore = new Shortcut(
      'm',
      'Show more of current post or comment',
      () => {
        const el = this.#lastScroller.item;
        NH.web.clickElement(el, ['[data-testid="expandable-text-button"]']);
      }
    );

    loadMorePosts = new Shortcut(
      'l',
      'Load more posts (if the <button>New Posts</button> button ' +
        'is available, load those)', () => {  // eslint-disable-line max-lines-per-function
        const me = this.loadMorePosts.name;
        this.logger.entered(me);

        const savedScrollTop = document.documentElement.scrollTop;
        let first = false;
        const posts = this.posts;

        /** Trigger function for {@link NH.web.otrot2}. */
        function trigger() {
          // The topButton only shows up when the app detects new posts.  In
          // that case, going back to the first post is appropriate.
          const topButton = document.querySelector(
            'main [data-testid="mainFeed"] > div:nth-of-type(3) button'
          );
          if (topButton?.checkVisibility()) {
            topButton.click();
            first = true;
          } else {
            // If there is not top button, there should always be a button at
            // the bottom to click.
            const botButton =
                  'main [data-testid="mainFeed"] > div:last-child button';
            NH.web.clickElement(document, [botButton]);
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
          name: `${this.pageId} ${me}`,
          base: document.querySelector('main [data-testid="mainFeed"]'),
        };
        const how = {
          trigger: trigger,
          action: action,
          duration: 2000,
        };
        NH.web.otrot2(what, how);

        this.logger.leaving(me);
      }
    );

    viewReactions = new Shortcut(
      'v r',
      'View reactions on current post or comment',
      () => {
        const el = this.#getItemStatusBar();
        NH.web.clickElement(el, ['a:has([role])']);
      }
    );

    viewReposts = new Shortcut(
      'v R',
      'View reposts of current post',
      () => {
        const el = this.#getPostStatusBar();
        NH.web.clickElement(el, ['a:not(:has([role]))']);
      }
    );

    openMeatballMenu = new Shortcut(
      '=',
      'Open closest <button class="spa-meatball">⋯</button> menu',
      () => {
        const el = this.#getItemHeader();
        NH.web.clickElement(el, [':has(> * > svg[id^="overflow"])']);
      }
    );

    likeItem = new Shortcut(
      'L',
      'Like current post or comment',
      () => {
        const el = this.#getItemFooter();
        NH.web.clickElement(el, [':has(> * > svg[id^="chevron-up"])']);
      }
    );

    commentOnItem = new Shortcut(
      'C',
      'Comment on current post or comment',
      () => {
        const el = this.#getItemFooter();
        NH.web.clickElement(el, [
          // For post
          ':has(> * > svg[id^="comment"])',
          // For comment
          ':scope > div > button',
        ]);
      }
    );

    repost = new Shortcut(
      'R',
      'Repost current post',
      () => {
        const el = this.#getPostFooter();
        NH.web.clickElement(el, [':has(> * > svg[id^="repost"])']);
      }
    );

    sendPost = new Shortcut(
      'S',
      'Send current post privately',
      () => {
        const el = this.#getPostFooter();
        NH.web.clickElement(el, [':has(> * > svg[id^="send"])']);
      }
    );

    gotoShare = new Shortcut(
      'P',
      `Go to the share box to start a post or ${Feed.#tabSnippet} ` +
        'to the other creator options',
      () => {
        document
          .querySelector(`main [data-testid="mainFeed"] a[${CKEY}]`)
          .focus();
      }
    );

    toggleItem = new Shortcut(
      'X',
      'Toggle hiding current item',
      async () => {
        const me = this.toggleItem.name;
        this.logger.entered(me);

        const el = this.#lastScroller.item;

        const target = await this.#getDismissElement();

        /** Trigger function for {@link NH.web.otrot}. */
        function trigger() {
          target.click();
        }
        if (target) {
          const what = {
            name: `${this.pageId} ${me}`,
            base: el,
          };
          const how = {
            trigger: trigger,
            timeout: 3000,
          };
          await NH.web.otrot(what, how);
          this.#lastScroller.item = el;
        }

        this.logger.leaving(me);
      }
    );

    nextPostPlus = new Shortcut(
      'J',
      'Toggle hiding current post, then next post',
      async () => {
        this.#returnToPost();
        await this.toggleItem();
        this.nextPost();
      }
    );

    prevPostPlus = new Shortcut(
      'K',
      'Toggle hiding current post, then previous post',
      async () => {
        this.#returnToPost();
        await this.toggleItem();
        this.prevPost();
      }
    );

    /** @type {Scroller~How} */
    static #commentsHow = {
      uidCallback: Feed.uniqueCommentIdentifier,
      classes: ['dick'],
      autoActivate: true,
      snapToTop: false,
    };

    /** @type {Scroller~What} */
    static #commentsWhat = {
      name: `${this.name} comments`,
      selectors: [
        [
          // Regular
          `[${CKEY}*=":comment:"]:has(> * > [${CKEY}*=":comment:"])`,
          // Dismissed
          `[${CKEY}*=":comment:"]:has(> * > * > [${CKEY}^="hiddenComment"])`,
        ].join(','),
      ],
    };

    /** @type {Page~PageDetails} */
    static #details = {
      // eslint-disable-next-line prefer-regex-literals
      pathname: RegExp('^/feed/?', 'u'),
      pageReadySelector: 'main > div > div > div',
    };

    /** @type {Scroller~How} */
    static #postsHow = {
      uidCallback: Feed.uniquePostIdentifier,
      classes: ['tom'],
      snapToTop: true,
    };

    /** @type {Scroller~What} */
    static #postsWhat = {
      name: `${this.name} posts`,
      containerItems: [
        {
          container: 'main [data-testid="mainFeed"]',
          items: [
            // Regular items
            '[role="listitem"]',
            // Dismissed item placeholders
            `div[${CKEY}^="collapsed"]`,
          ].join(','),
        },
      ],
    };

    static #tabSnippet = VMKeyboardService.parseSeq('tab');

    static #uidCommentRE =
    /^(?:replaceableComment_urn:li:comment:\()?(?<body>.*)\)/u;

    static #uidPostRE = /^(?:expanded|collapsed)?(?<body>.*)FeedType/u;

    #commentScroller
    #keyboardService
    #lastScroller
    #postScroller

    /** @returns {HTMLElement} - Header container for current post. */
    #getPostHeader = () => {
      const me = this.#getPostHeader.name;
      this.logger.entered(me);

      const el = this.posts.item?.querySelector([
        // Regular
        'h2 + div',
        // Dismissed
        'div:has(+ hr)',
      ].join(','));

      this.logger.leaving(me, el);
      return el;
    }

    /** @returns {HTMLElement} - Header container for current comment. */
    #getCommentHeader = () => {
      const me = this.#getCommentHeader.name;
      this.logger.entered(me);

      const el = this.comments
        ?.item?.querySelector('div:has(> div ~ button)');

      this.logger.leaving(me, el);
      return el;
    }

    /** @returns {HTMLElement} - Header container for current item. */
    #getItemHeader = () => {
      const me = this.#getItemHeader.name;
      this.logger.entered(me);

      const el = this.#getCommentHeader() || this.#getPostHeader();

      this.logger.leaving(me, el);
      return el;
    }

    /** @returns {HTMLElement} - Footer container for current post. */
    #getPostFooter = () => {
      const me = this.#getPostFooter.name;
      this.logger.entered(me);

      const el = this.posts.item
        ?.querySelector('div:has(> h2) > div:last-of-type');

      this.logger.leaving(me, el);
      return el;
    }

    /** @returns {HTMLElement} - Footer container for current comment. */
    #getCommentFooter = () => {
      const me = this.#getCommentFooter.name;
      this.logger.entered(me);

      // Comment Footer and StatusBar use the same query.
      const el = this.comments?.item
        ?.querySelector('div:has(> hr)');

      this.logger.leaving(me, el);
      return el;
    }

    /** @returns {HTMLElement} - Footer container for current item. */
    #getItemFooter = () => {
      const me = this.#getItemFooter.name;
      this.logger.entered(me);

      const el = this.#getCommentFooter() || this.#getPostFooter();

      this.logger.leaving(me, el);
      return el;
    }

    /** @returns {HTMLElement} - StatusBar container for current post. */
    #getPostStatusBar = () => {
      const me = this.#getPostStatusBar.name;
      this.logger.entered(me);

      const el = this.posts.item
        ?.querySelector('div:has(> a [role="presentation"])');

      this.logger.leaving(me, el);
      return el;
    }

    /** @returns {HTMLElement} - StatusBar container for current comment. */
    #getCommentStatusBar = () => {
      const me = this.#getCommentStatusBar.name;
      this.logger.entered(me);

      // Comment Footer and StatusBar use the same query.
      const el = this.comments?.item
        ?.querySelector('div:has(> hr)');

      this.logger.leaving(me, el);
      return el;
    }

    /** @returns {HTMLElement} - StatusBar container for current item. */
    #getItemStatusBar = () => {
      const me = this.#getItemStatusBar.name;
      this.logger.entered(me);

      const el = this.#getCommentStatusBar() || this.#getPostStatusBar();

      this.logger.leaving(me, el);
      return el;
    }

    /**
     * Find the correct element to dismiss the current item.
     *
     * Comments and ads require invoking a popup menu (portal).
     *
     * @returns {HTMLElement} - The element to click.
     */
    #getDismissElement = async () => {  // eslint-disable-line max-lines-per-function, max-statements
      const me = this.#getDismissElement.name;
      this.logger.entered(me, this.#lastScroller.item);

      let el = null;

      if (this.#lastScroller.item) {
        const portalSelector = '[data-floating-ui-portal]';
        const timeout = 2000;
        if (document.querySelector(portalSelector)) {
          document.dispatchEvent(
            new KeyboardEvent('keydown', {key: 'Escape'})
          );
          await this.#waitForSelectorToBeGone(portalSelector, timeout);
        }

        // If the current item is a regular post, this will match.
        let selector = [
          // Visible
          ':has(> * > svg[id^="close"])',
          // Dismissed
          'button:has(> span > span)',
        ].join(',');
        let header = this.#getItemHeader();
        el = header?.querySelector(selector);
        if (!el) {
          // Some items need to trigger a popup menu.
          this.openMeatballMenu();
          try {
            // The menus take a while to populate.  Even though known types of
            // menus look to have the same "cancelled eye" icon, they are
            // currently brought in differently.  One menu type uses one named
            // "visibility-off-*" while another menu has no id.  Interestingly
            // enough, the one without an id is the only svg icon without a
            // name so, :not([id]) is used for finding it proper, while a
            // sibling named "signal" is used waiting for the menu to settle.
            header = await NH.web.waitForSelector([
              portalSelector,
              ':has(svg[id^="visibility-off"], svg[id^="signal"])',
            ].join(''), timeout);
            selector = [
              ':has(> * > svg[id^="visibility-off"])',
              ':has(> * > svg:not([id])',
            ].join(',');
          } catch (e) {
            // If the menu was slow, use a simpler selector.
            selector = 'svg:not([id])';
          }
          el = header?.querySelector(selector);
        }
      }

      this.logger.leaving(me, el);
      return el;
    }

    /**
     * Wait for matching selector to disappear.
     *
     * This could probably be rolled into {@link NH.web.waitForSelector}.
     *
     * @param {string} selector - CSS selector.
     * @param {number} [timeout=0] - Time to wait in milliseconds, 0 disables.
     * @returns {Promise<NH.web.Continuation.results>} - Basically, something
     * to await on.
     */
    #waitForSelectorToBeGone = (selector, timeout = 0) => {

      /**
       * @implements {Monitor}
       * @returns {Continuation} - Indicate whether done monitoring.
       */
      const monitor = () => {
        const element = document.querySelector(selector);
        if (element) {
          this.logger.log(`match for ${selector}`, element);
          return {done: false};
        }
        this.logger.log('And gone');
        return {done: true};
      };

      const what = {
        name: this.#waitForSelectorToBeGone.name,
        base: document,
      };

      const how = {
        observeOptions: {childList: true, subtree: true},
        monitor: monitor,
        timeout: timeout,
      };

      return NH.web.otmot(what, how);
    }

    #onPostActivate = () => {
      const me = 'onPostActivate';
      this.logger.entered(me);

      /**
       * Wait for the post to be reloaded.
       * @implements {NH.web.Monitor}
       * @returns {NH.web.Continuation} - Indicate whether done monitoring.
       */
      const monitor = () => {
        this.logger.log('monitor item classes:', this.posts.item.classList);
        return {
          done: !this.posts.item.classList.contains('has-occluded-height'),
        };
      };
      if (this.posts.item) {
        const what = {
          name: `${this.pageId} ${me}`,
          base: this.posts.item,
        };
        const how = {
          observeOptions: {
            attributeFilter: ['class'],
            attributes: true,
          },
          monitor: monitor,
          timeout: 5000,
        };
        NH.web.otmot(what, how)
          .finally(() => {
            this.posts.shine();
            this.posts.show();
          });
      }

      this.logger.leaving(me);
    }

    /** Reset the comment scroller. */
    #resetComments = () => {
      if (this.#commentScroller) {
        this.#commentScroller.destroy();
        this.#commentScroller = null;
      }
      this.comments;
    }

    #onCommentChange = () => {
      this.#lastScroller = this.comments;
    }

    /**
     * Reselects current post, triggering same actions as initial selection.
     */
    #returnToPost = () => {
      this.posts.item = this.posts.item;
    }

    /** Resets the comments {@link Scroller}. */
    #onPostChange = () => {
      const me = 'onPostChange';
      this.logger.entered(me, this.posts.item);

      this.#resetComments();
      this.#lastScroller = this.posts;

      this.logger.leaving(me);
    }

  }

  /**
   * Class for handling the MyNetwork page.
   *
   * This page takes 3-4 seconds to load every time.  Revisits are
   * likely to take a while.
   */
  class MyNetwork extends Page {

    /** @param {SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...MyNetwork.#details});

      this.addService(LinkedInStyleService, this)
        .addStyles(LinkedIn.Style.TWO);

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      spa.details.navbarScrollerFixup(MyNetwork.#collectionsHow);
      spa.details.navbarScrollerFixup(MyNetwork.#individualsHow);

      this.#collectionScroller = new Scroller(MyNetwork.#collectionsWhat,
        MyNetwork.#collectionsHow);
      this.addService(LinkedInScrollerService)
        .setScroller(this.#collectionScroller);
      this.#collectionScroller.dispatcher.on('out-of-range',
        linkedInGlobals.focusOnSidebar);
      this.#collectionScroller.dispatcher.on(
        'change', this.#onCollectionChange
      );

      this.#lastScroller = this.#collectionScroller;
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueCollectionIdentifier(element) {
      const me = MyNetwork.uniqueCollectionIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const key = LinkedIn.ckeyIdentifier(element);
      const childKey = LinkedIn.ckeyIdentifier(
        element.querySelector(`[${CKEY}]`)
      );

      if (childKey) {
        content = childKey;
      }
      if (key) {
        content = key;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueIndividualsIdentifier(element) {
      const me = MyNetwork.uniqueIndividualsIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const key = LinkedIn.ckeyIdentifier(element);
      const childKey = LinkedIn.ckeyIdentifier(
        element.querySelector(`[${CKEY}]`)
      );

      if (childKey) {
        content = childKey;
      }
      if (key) {
        content = key;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /** @type {Scroller} */
    get collections() {
      return this.#collectionScroller;
    }

    /** @type {Scroller} */
    get individuals() {
      if (!this.#individualScroller && this.collections.item) {
        this.#individualScroller = new Scroller(
          {base: this.collections.item, ...MyNetwork.#individualsWhat},
          MyNetwork.#individualsHow
        );
        this.#individualScroller.dispatcher.on(
          'change', this.#onIndividualChange
        );
        this.#individualScroller.dispatcher.on(
          'out-of-range', this.#returnToCollection
        );
      }
      return this.#individualScroller;
    }

    nextCollection = new Shortcut(
      'j',
      'Next collection card',
      () => {
        this.collections.next();
      }
    );

    prevCollection = new Shortcut(
      'k',
      'Previous collection card',
      () => {
        this.collections.prev();
      }
    );

    nextIndividual = new Shortcut(
      'n',
      'Next individual item in collection',
      () => {
        this.individuals.next();
      }
    );

    prevIndividual = new Shortcut(
      'p',
      'Previous individual item in collection',
      () => {
        this.individuals.prev();
      }
    );

    firstItem = new Shortcut(
      '<',
      'Go to the first collection card or individual item',
      () => {
        this.#lastScroller.first();
      }
    );

    lastItem = new Shortcut(
      '>',
      'Go to the last collection card or individual item',
      () => {
        this.#lastScroller.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Change browser focus to current card/item',
      () => {
        if (litOptions.enableScrollerChangesFocus) {
          this.#lastScroller.focus();
        } else {
          NH.web.focusOnElement(this.#lastScroller.item);
        }
      }
    );

    viewItem = new Shortcut(
      'Enter',
      'View the current item',
      () => {
        if (litOptions.enableIssue241ClickMethod) {
          this.individuals.click();
        } else {
          const individual = this.individuals?.item;
          if (individual) {
            if (!NH.web.clickElement(individual, ['a', 'button'], true)) {
              NH.web.postInfoAboutElement(individual, 'network individual');
            }
          } else {
            document.activeElement.click();
          }
        }
      }
    );

    openMeatballMenu = new Shortcut(
      '=',
      'Open closest <button class="spa-meatball">⋯</button> menu',
      () => {
        const el = this.#lastScroller?.item;
        NH.web.clickElement(el, [
          // Catch up items
          ':has(> * > svg[id^="overflow"])',
        ]);
      }
    );

    tabList = new Shortcut(
      'l',
      'Focus on Manage invitations tab list',
      () => {
        const el = document.querySelector('main nav [aria-current]');
        el.scrollIntoView(false);
        NH.web.focusOnElement(el);
      }
    );

    engageIndividual = new Shortcut(
      'E',
      'Engage the individual (Connect, Follow, Join, Message, etc)',
      () => {
        const el = this.individuals?.item;
        NH.web.clickElement(el, [
          // Connect
          ':has(> * > svg[id^="connect"])',
          // Withdraw pending
          ':has(> * > svg[id^="clock"])',
          // Follow
          ':has(> * > svg[id^="add-"])',
          // Unfollow
          ':has(> * > svg[id^="check"])',
          // Catch up Message
          ':has(> * > svg[id^="send"])',
        ]);
      }
    );

    likeItem = new Shortcut(
      'L',
      'Like current item',
      () => {
        const el = this.#lastScroller.item;
        NH.web.clickElement(el, [':has(> * > svg[id^="chevron-up"])']);
      }
    );

    commentOnItem = new Shortcut(
      'C',
      'Comment on current item',
      () => {
        const el = this.#lastScroller.item;
        NH.web.clickElement(el, [':has(> * > svg[id^="comment"])']);
      }
    );

    dismissIndividual = new Shortcut(
      'X',
      'Dismiss current item',
      () => {
        const el = this.individuals?.item;
        NH.web.clickElement(el, [
          // Most items
          ':has(> * > svg[id^="close"]',
        ]);
      }
    );

    /** @type {Scroller~How} */
    static #collectionsHow = {
      uidCallback: MyNetwork.uniqueCollectionIdentifier,
      classes: ['tom'],
      snapToTop: true,
    };

    /** @type {Scroller~What} */
    static #collectionsWhat = {
      name: `${this.name} cards`,
      containerItems: [
        {
          container: 'main > div > div > div:nth-of-type(2) > div',
          items: [
            // Most "Grow" cards
            '[role="main"] > div > div > div > section',
            // Other "Grow" cards
            '[role="main"] > div > div > section',
            // "Catch up" card
            ':scope > div > section',
          ].join(','),
        },
      ],
    };

    /** @type {Page~PageDetails} */
    static #details = {
      pageName: 'My Network (Grow, Catch up)',
      // eslint-disable-next-line prefer-regex-literals
      pathname: RegExp('^/mynetwork/(?:grow/|catch-up/.*)', 'u'),
      pageReadySelector: 'main > div > div > div',
    };

    /** @type {Scroller~How} */
    static #individualsHow = {
      uidCallback: MyNetwork.uniqueIndividualsIdentifier,
      classes: ['dick'],
      autoActivate: true,
      snapToTop: false,
      clickConfig: {
        selectorArray: ['a', 'button'],
        matchSelf: true,
      },
    };

    /** @type {Scroller~What} */
    static #individualsWhat = {
      name: `${this.name} individual`,
      selectors: [
        [
          // Carousel cards (different variations)
          '[data-testid="carousel-child-container"] > div > a',
          '[data-testid="carousel-child-container"] > div:has(> div)',
          // Most cards with followable entities in them
          '[role="listitem"]',
        ].join(','),
      ],
    };

    #collectionScroller
    #individualScroller
    #keyboardService
    #lastScroller

    #resetIndividuals = () => {
      if (this.#individualScroller) {
        this.#individualScroller.destroy();
        this.#individualScroller = null;
      }
      this.individuals;
    }

    #onIndividualChange = () => {
      this.#lastScroller = this.individuals;
    }

    #onCollectionChange = () => {
      const me = this.#onCollectionChange.name;
      this.logger.entered(me);

      this.#resetIndividuals();
      this.#lastScroller = this.collections;

      this.logger.leaving(me, this.collections.item);
    }

    #returnToCollection = () => {
      this.collections.item = this.collections.item;
    }

  }

  /**
   * Class for handling Invitation Manager.
   *
   * While this page does have multiple sections (Manage Invitations and
   * Suggestions for you), the latter is enclosed by the former.  There is no
   * way to highlight the former without including the latter.  So just treat
   * the page as one big long list.
   */
  class InvitationManager extends Page {

    /** @param {SPA} spa - SPA instance that manages this Page.     */
    constructor(spa) {
      super({spa: spa, ...InvitationManager.#details});

      this.addService(LinkedInStyleService, this)
        .addStyles(LinkedIn.Style.TWO);

      spa.details.navbarScrollerFixup(
        InvitationManager.#invitesHow
      );

      this.#inviteScroller = new Scroller(
        InvitationManager.#invitesWhat,
        InvitationManager.#invitesHow
      );
      this.addService(LinkedInScrollerService)
        .setScroller(this.#inviteScroller);
    }

    /** @type {Scroller} */
    get invites() {
      return this.#inviteScroller;
    }

    nextInvite = new Shortcut(
      'j',
      'Next invitation',
      () => {
        this.invites.next();
      }
    );

    prevInvite = new Shortcut(
      'k',
      'Previous invitation',
      () => {
        this.invites.prev();
      }
    );

    firstInvite = new Shortcut(
      '<',
      'Go to the first invitation',
      () => {
        this.invites.first();
      }
    );

    lastInvite = new Shortcut(
      '>',
      'Go to the last invitation',
      () => {
        this.invites.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Change browser focus to current item',
      () => {
        if (litOptions.enableScrollerChangesFocus) {
          this.invites.focus();
        } else {
          const el = this.invites.item;
          NH.web.focusOnElement(el);
        }
      }
    );

    seeMore = new Shortcut(
      'm',
      'Toggle seeing more of current invite',
      () => {
        const el = this.invites.item;
        NH.web.clickElement(el, ['button[data-testid]']);
      }
    );

    viewInviter = new Shortcut(
      'i',
      'View invite principal',
      () => {
        const el = this.invites.item;
        NH.web.clickElement(el, [
          // Most invites
          ':scope [role="listitem"] a:has(+ span)',
          // Suggestions for you
          'a',
        ]);
      }
    );

    viewTarget = new Shortcut(
      't',
      'View invitation target ' +
        '(may not be the same as inviter, e.g., Newsletter)',
      () => {
        const el = this.invites.item;
        if (el.tagName === 'A') {
          el.click();
        } else {
          NH.web.clickElement(el, [':scope [role="listitem"] > * > a']);
        }
      }
    );

    tabList = new Shortcut(
      'l',
      'Focus on Manage invitations tab list',
      () => {
        const el = document.querySelector('main nav [aria-current]');
        el.scrollIntoView(false);
        NH.web.focusOnElement(el);
      }
    );

    acceptInvite = new Shortcut(
      'A',
      'Accept invite',
      () => {
        const el = this.invites.item;
        NH.web.clickElement(el, ['[aria-label^="Accept"]']);
      }
    );

    ignoreInvite = new Shortcut(
      'I',
      'Ignore invite',
      () => {
        const el = this.invites.item;
        NH.web.clickElement(el, ['[aria-label^="Ignore"]']);
      }
    );

    connectSuggestion = new Shortcut(
      'C',
      'Connect with suggestion',
      () => {
        const el = this.invites.item;
        this.logger.log('el', el);
        NH.web.clickElement(el, ['[aria-label^="Invite"]']);
      }
    );

    messageInviter = new Shortcut(
      'M',
      'Message inviter',
      () => {
        const el = this.invites.item;
        NH.web.clickElement(el, ['a[href*="/compose/"]']);
      }
    );

    withDraw = new Shortcut(
      'W',
      'Withdraw invitation',
      () => {
        const el = this.invites.item;
        const rc = NH.web.clickElement(el, [
          // Suggestions for you
          '[aria-label^="Pending"]',
        ]);
        if (!rc) {
          // Sent tab
          const elements = Array.from(el?.querySelectorAll('a') || [])
            .filter(x => x.innerText === 'Withdraw');
          if (elements.length === NH.base.ONE_ITEM) {
            elements[0].click();
          }
        }
      }
    );

    dismissInvite = new Shortcut(
      'X',
      'Dismiss invitation (after accepting or ignoring)',
      () => {
        const el = this.invites.item;
        NH.web.clickElement(el, [':has(> * > svg[id^="close"]']);
      }
    );

    /** @type {Page~PageDetails} */
    static #details = {
      // eslint-disable-next-line prefer-regex-literals
      pathname: RegExp('^/mynetwork/invitation-manager/.*', 'u'),
      pageReadySelector: 'main > div > div > div',
    };

    static #invitesHow = {
      uidCallback: LinkedIn.ckeyIdentifier,
      classes: ['tom'],
    };

    /** @type {Scroller~What} */
    static #invitesWhat = {
      name: `${this.name} cards`,
      containerItems: [
        {
          container: 'main [role="main"] [data-testid="lazy-column"]',
          items: [
            // Standard invites
            `:scope > div[${CKEY}]`,
            // Suggestions for you
            'h3 ~ div > a',
          ].join(','),
        },
      ],
    };

    #inviteScroller

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

    /** @param {SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...Jobs.#details});

      this.addService(LinkedInStyleService, this)
        .addStyles(LinkedIn.Style.TWO);

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      spa.details.navbarScrollerFixup(Jobs.#sectionsHow);
      spa.details.navbarScrollerFixup(Jobs.#jobsHow);

      this.#sectionScroller = new Scroller(Jobs.#sectionsWhat,
        Jobs.#sectionsHow);
      this.addService(LinkedInScrollerService)
        .setScroller(this.#sectionScroller);
      this.#sectionScroller.dispatcher.on('out-of-range',
        linkedInGlobals.focusOnSidebar);
      this.#sectionScroller.dispatcher.on('change', this.#onSectionChange);

      this.#lastScroller = this.#sectionScroller;
    }

    /**
     * Complicated because there are so many variations.
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueJobIdentifier(element) {
      const me = Jobs.uniqueJobIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const key = LinkedIn.ckeyIdentifier(element);

      if (key) {
        content = key;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /** @type {Scroller} */
    get jobs() {
      const me = 'get jobs';
      this.logger.entered(me, this.#jobScroller);

      if (!this.#jobScroller && this.sections.item) {
        this.#jobScroller = new Scroller(
          {base: this.sections.item, ...Jobs.#jobsWhat},
          Jobs.#jobsHow
        );
        this.#jobScroller.dispatcher.on('change', this.#onJobChange);
        this.#jobScroller.dispatcher.on('out-of-range',
          this.#returnToSection);
      }

      this.logger.leaving(me, this.#jobScroller);
      return this.#jobScroller;
    }

    /** @type {Scroller} */
    get sections() {
      return this.#sectionScroller;
    }

    nextSection = new Shortcut(
      'j',
      'Next section',
      () => {
        this.sections.next();
      }
    );

    prevSection = new Shortcut(
      'k',
      'Previous section',
      () => {
        this.sections.prev();
      }
    );

    nextJob = new Shortcut(
      'n',
      'Next job',
      () => {
        this.jobs.next();
      }
    );

    prevJob = new Shortcut(
      'p',
      'Previous job',
      () => {
        this.jobs.prev();
      }
    );

    firstItem = new Shortcut(
      '<',
      'Go to to first section or job',
      () => {
        this.#lastScroller.first();
      }
    );

    lastItem = new Shortcut(
      '>',
      'Go to last section or job currently loaded',
      () => {
        this.#lastScroller.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Change browser focus to current section or job',
      () => {
        if (litOptions.enableScrollerChangesFocus) {
          this.#lastScroller.focus();
        } else {
          this.sections.show();
        this.jobs?.show();
        NH.web.focusOnElement(this.#lastScroller.item);
        }
      }
    );

    activateItem = new Shortcut(
      'Enter',
      'Activate the current item (click on it)',
      () => {
        if (litOptions.enableIssue241ClickMethod) {
          this.jobs.click();
        } else {
          const el = this.jobs?.item;
          if (el) {
            if (!NH.web.clickElement(el,
              [
                '[role="button"]',
                'a',
                'button',
              ], true)) {
              NH.web.postInfoAboutElement(el, 'el');
            }
          } else {
            // Again, because we use Enter as the hotkey for this action.
            document.activeElement.click();
          }
        }
      }
    );

    openMeatballMenu = new Shortcut(
      '=',
      'Open closest <button class="spa-meatball">⋯</button> menu',
      () => {
        const el = this.jobs?.item;
        NH.web.clickElement(el, [':has(> * > svg[id^="overflow"])']);
      }
    );

    loadMoreSections = new Shortcut(
      'l',
      'Load more sections',
      () => {
        const base = document.querySelector(Jobs.#sectionsContainer);
        NH.web.clickElement(base,
          [':scope > div:last-of-type > button']);
      }
    );

    toggleDismissJob = new Shortcut(
      'X',
      'Toggle dismissing job',
      () => {
        const el = this.jobs?.item;
        NH.web.clickElement(el, [
          ':has(> * > svg[id^="close"]',
          ':has(> * > svg[id^="undo-"]',
        ]);
      }
    );

    /** @type {Page~PageDetails} */
    static #details = {
      pathname: '/jobs/',
      pageReadySelector: 'main > div > div > div',
    };

    /** @type {Scroller~How} */
    static #jobsHow = {
      uidCallback: Jobs.uniqueJobIdentifier,
      classes: ['dick'],
      autoActivate: true,
      snapToTop: false,
      clickConfig: {
        selectorArray: ['[role="button"]', 'a', 'button'],
        matchSelf: true,
      },
    };

    /** @type {Scroller~What} */
    static #jobsWhat = {
      name: `${this.name} entries`,
      selectors: [
        [
          // Match your profile - Show all button
          ':scope > * > a',
          // Most job entries
          ':scope > * > * > a',
          // Carousels
          '[data-testid="carousel-child-container"] a',
          // Job collections tabs
          '[role="button"]',
          // Job collections entries
          `[${CKEY}^="JobsHomeModuleTabbed"] > * > a`,
          `[${CKEY}^="JobsHomeModuleTabbed"] > * > * > a`,
        ].join(','),
      ],
    };

    static #sectionsContainer =
      '[data-testid="JobsHomeFeedModuleListCollection"]';

    /** @type {Scroller~How} */
    static #sectionsHow = {
      uidCallback: LinkedIn.ckeyIdentifier,
      classes: ['tom'],
      snapToTop: true,
    };

    /** @type {Scroller~What} */
    static #sectionsWhat = {
      name: `${this.name} sections`,
      containerItems: [
        {
          container: Jobs.#sectionsContainer,
          items: [
            `:scope > [${CKEY}^="Jobs"] [${CKEY}^="Jobs"]`,
            `:scope > div > div[${CKEY}]`,
          ].join(','),
        },
      ],
    };

    #jobScroller
    #keyboardService
    #lastScroller
    #sectionScroller

    /** Reset the jobs scroller. */
    #resetJobs = () => {
      const me = 'resetJobs';
      this.logger.entered(me, this.#jobScroller);

      if (this.#jobScroller) {
        this.#jobScroller.destroy();
        this.#jobScroller = null;
      }
      this.jobs;

      this.logger.leaving(me);
    }

    /**
     * Reselects current section, triggering same actions as initial
     * selection.
     */
    #returnToSection = () => {
      this.sections.item = this.sections.item;
    }

    #onJobChange = () => {
      this.#lastScroller = this.jobs;
    }

    /**
     * Updates {@link Jobs} specific watcher data and removes the jobs
     * {@link Scroller}.
     */
    #onSectionChange = () => {
      const me = 'onSectionChange';
      this.logger.entered(me);

      this.#resetJobs();
      this.#lastScroller = this.sections;

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
      const savedJob = this.jobs?.item;
      this.sections.shine();
      // Section was probably rebuilt, assume jobs scroller is invalid.
      this.#resetJobs();
      if (savedJob) {
        this.jobs.item = savedJob;
      }
      document.documentElement.scrollTop = topScroll;

      this.logger.leaving(me);
    }

  }

  /** Class for handling Jobs collections. */
  class JobsCollections extends Page {

    /** @param {SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...JobsCollections.#details});

      this.addService(LinkedInStyleService, this)
        .addStyles(LinkedIn.Style.ONE);

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      this.#jobCardScroller = new Scroller(JobsCollections.#jobCardsWhat,
        JobsCollections.#jobCardsHow);
      this.addService(LinkedInScrollerService)
        .setScroller(this.#jobCardScroller)
        .allowReactivation(false);
      this.#jobCardScroller.dispatcher.on('activate',
        this.#onJobCardActivate);
      this.#jobCardScroller.dispatcher.on('change', this.#onJobCardChange);

      this.#paginationScroller = new Scroller(
        JobsCollections.#paginationWhat, JobsCollections.#paginationHow
      );
      this.addService(LinkedInScrollerService)
        .setScroller(this.#paginationScroller)
        .allowReactivation(false);
      this.#paginationScroller.dispatcher.on('activate',
        this.#onPaginationActivate);
      this.#paginationScroller.dispatcher.on('change',
        this.#onPaginationChange);

      spa.details.navbarScrollerFixup(JobsCollections.#detailsHow);
      this.#detailsScroller = new Scroller(
        JobsCollections.#detailsWhat, JobsCollections.#detailsHow
      );
      this.addService(LinkedInScrollerService)
        .setScroller(this.#detailsScroller)
        .allowReactivation(false);
      this.#detailsScroller.dispatcher.on('change', this.#onDetailsChange);

      this.#lastScroller = this.#jobCardScroller;
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueDetailsIdentifier(element) {
      const me = JobsCollections.uniqueDetailsIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const id = element.id;
      const nestedId = element.querySelector(
        '[id]:not([id^="ember"]):not([id^="artdeco"])'
      )?.id;
      const h2 = LinkedIn.h2(element);
      const classes = new Set(
        element.querySelectorAll('*:not(h2,svg)')
          .values()
          .map(x => [...x.classList])
          .toArray()
          .flat()
          .sort()
      );
      const klass = new Set(
        classes
          .values()
          .map(x => JobsCollections.#uidDetailsClassRE.exec(x)?.groups.class)
          .filter(x => x)
      )
        .values()
        .toArray()
        .sort()
        .join('-_-');

      if (h2) {
        content = h2;
      }
      if (klass) {
        content = klass;
      }
      if (nestedId) {
        content = nestedId;
      }
      if (id) {
        content = id;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueJobIdentifier(element) {
      const me = JobsCollections.uniqueJobIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const jobId = element.dataset.occludableJobId;

      if (jobId) {
        content = jobId;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniquePaginationIdentifier(element) {
      const me = JobsCollections.uniquePaginationIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const label = element.getAttribute('aria-label');

      if (label) {
        content = label;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /** @type {Scroller} */
    get details() {
      return this.#detailsScroller;
    }

    /** @type {Scroller} */
    get jobCards() {
      return this.#jobCardScroller;
    }

    /** @type {Scroller} */
    get paginator() {
      return this.#paginationScroller;
    }

    nextJob = new Shortcut(
      'j',
      'Next job card',
      () => {
        this.jobCards.next();
      }
    );

    prevJob = new Shortcut(
      'k',
      'Previous job card',
      () => {
        this.jobCards.prev();
      }
    );

    nextDetail = new Shortcut(
      'n',
      'Next job detail',
      () => {
        this.details.next();
      }
    );

    prevDetail = new Shortcut(
      'p',
      'Previous job detail',
      () => {
        this.details.prev();
      }
    );

    nextResultsPage = new Shortcut(
      'N',
      'Next results page',
      () => {
        this.paginator.next();
      }
    );

    prevResultsPage = new Shortcut(
      'P',
      'Previous results page',
      () => {
        this.paginator.prev();
      }
    );

    firstItem = new Shortcut(
      '<',
      'Go to first job or results page',
      () => {
        this.#lastScroller.first();
      }
    );

    lastItem = new Shortcut(
      '>',
      'Go to last job currently loaded or results page',
      () => {
        this.#lastScroller.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Move browser focus to most recently selected item',
      () => {
        if (litOptions.enableScrollerChangesFocus) {
          this.#lastScroller.focus();
        } else {
          NH.web.focusOnElement(this.#lastScroller.item);
        }
      }
    );

    detailsPane = new Shortcut(
      'd',
      'Move browser focus to the details pane',
      () => {
        NH.web.focusOnElement(document.querySelector(
          'div.jobs-details__main-content'
        ), false);
      }
    );

    selectCurrentResultsPage = new Shortcut(
      'c',
      'Select current results page',
      () => {
        this.paginator.dull();
        NH.web.clickElement(this.paginator.item, ['button'], true);
      }
    );

    tabList = new Shortcut(
      'l',
      'Focus on discovery tab list (has native scrolling using arrows)',
      () => {
        const el = document.querySelector(
          '.jobs-search-discovery-tabs nav [aria-current="true"]'
        );
        el.focus();
      }
    );

    openShareMenu = new Shortcut(
      's',
      'Open share menu',
      () => {
        NH.web.clickElement(document, ['.social-share button']);
      }
    );

    openMeatballMenu = new Shortcut(
      '=',
      'Open the <button class="spa-meatball">⋯</button> menu',
      () => {
        // XXX: There are TWO buttons.  The *second* one is hidden until the
        // user scrolls down.  This always triggers the first one.
        NH.web.clickElement(document, ['.jobs-options button']);
      }
    );

    applyToJob = new Shortcut(
      'A',
      'Apply to job (or previous application)',
      () => {
        NH.web.clickElement(document, [
          // Apply and Easy Apply buttons
          '#jobs-apply-button-id',
          // See application link
          'a[href^="/jobs/tracker"]',
        ]);
      }
    );

    toggleSaveJob = new Shortcut(
      'S',
      'Toggle saving job',
      () => {
        // XXX: There are TWO buttons.  The *first* one is hidden until the
        // user scrolls down.  This always triggers the first one.
        NH.web.clickElement(document, ['button.jobs-save-button']);
      }
    );

    toggleDismissJob = new Shortcut(
      'X',
      'Toggle dismissing job, if available',
      () => {
        NH.web.clickElement(this.jobCards.item, ['button']);
      }
    );

    nextJobPlus = new Shortcut(
      'J',
      'Toggle dismissing then next job card',
      () => {
        this.toggleDismissJob();
        this.nextJob();
      }
    );

    prevJobPlus = new Shortcut(
      'K',
      'Toggle dismissing then previous job card',
      () => {
        this.toggleDismissJob();
        this.prevJob();
      }
    );

    toggleFollowCompany = new Shortcut(
      'F', 'Toggle following company', () => {
        NH.web.clickElement(document, ['button.follow']);
      }
    );

    toggleAlert = new Shortcut(
      'L', 'Toggle the job search aLert, if available', () => {
        NH.web.clickElement(document,
          ['main .jobs-search-create-alert__artdeco-toggle']);
      }
    );

    /** @type {Page~PageDetails} */
    static #details = {
      pageName: 'Jobs Collections (various listings)',
      // eslint-disable-next-line prefer-regex-literals
      pathname: RegExp('^/jobs/(?:collections|search)/.*', 'u'),
      pageReadySelector: 'footer.global-footer-compact',
    };

    /** @type {Scroller~How} */
    static #detailsHow = {
      uidCallback: JobsCollections.uniqueDetailsIdentifier,
      classes: ['dick'],
      snapToTop: true,
    };

    /** @type {Scroller~What} */
    static #detailsWhat = {
      name: `${this.name} details`,
      containerItems: [
        {
          container: 'div.jobs-details__main-content',
          items: ':scope > div, :scope > section',
        },
      ],
    };

    /** @type {Scroller~How} */
    static #jobCardsHow = {
      uidCallback: JobsCollections.uniqueJobIdentifier,
      classes: ['tom'],
      snapToTop: false,
      bottomMarginCSS: '3em',
    };

    /** @type {Scroller~What} */
    static #jobCardsWhat = {
      name: `${this.name} cards`,
      containerItems: [
        {
          container: 'div.scaffold-layout__list > div > ul',
          // This selector is also used in #onJobCardActivate.
          items: ':scope > li',
        },
      ],
    };

    /** @type {Scroller~How} */
    static #paginationHow = {
      uidCallback: JobsCollections.uniquePaginationIdentifier,
      classes: ['dick'],
      snapToTop: false,
      bottomMarginCSS: '3em',
      containerTimeout: 1000,
    };

    /** @type {Scroller~What} */
    static #paginationWhat = {
      name: `${this.name} pagination`,
      containerItems: [
        {
          container: 'div.jobs-search-results-list__pagination > ul',
          // This selector is also used in #onPaginationActivate.
          items: ':scope > li > button',
        },
      ],
    };

    static #uidDetailsClassRE = /^(?:job-details|jobs)-(?<class>[^_]*)__/u;

    #detailsScroller
    #jobCardScroller
    #keyboardService
    #lastScroller
    #paginationScroller

    #onJobCardActivate = async () => {
      const me = 'onJobCardActivate';
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
        this.logger.log('Found', item);
        this.jobCards.gotoUid(JobsCollections.uniqueJobIdentifier(item));
        this.logger.log('and went to it');
      } catch (e) {
        this.logger.log('Job card matching URL not found, staying put');
      }

      this.logger.leaving(me);
    }

    #onJobCardChange = () => {
      const me = 'onJobCardChange';
      this.logger.entered(me, this.jobCards.item);

      NH.web.clickElement(this.jobCards.item, ['div[data-job-id]']);
      this.details.first();
      this.#lastScroller = this.jobCards;

      this.logger.leaving(me);
    }

    #onPaginationActivate = async () => {
      const me = 'onPaginationActivate';
      this.logger.entered(me);

      try {
        const timeout = 2000;
        const item = await NH.web.waitForSelector(
          'div.jobs-search-results-list__pagination > ul [aria-current]',
          timeout
        );
        this.paginator.goto(item);
      } catch (e) {
        this.logger.log('Results paginator not found, staying put');
      }

      this.logger.leaving(me);
    }

    #onPaginationChange = () => {
      this.#lastScroller = this.paginator;
    }

    #onDetailsChange = () => {
      this.#lastScroller = this.details;
    }

  }

  /** Class for handling the direct Jobs view. */
  class JobsView extends Page {

    /** @param {SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...JobsView.#details});

      this.addService(LinkedInStyleService, this)
        .addStyles(LinkedIn.Style.TWO);

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      this.addService(LinkedInToolbarService, this)
        .addHows(JobsView.#cardsHow, JobsView.#entriesHow)
        .postActivateHook(this.#toolbarHook);
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueCardIdentifier(element) {
      const me = JobsView.uniqueCardIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const key = LinkedIn.ckeyIdentifier(element);
      const label = element
        .querySelector('[aria-label]')
        ?.getAttribute('aria-label');
      const h2 = LinkedIn.h2(element);

      if (h2) {
        content = h2;
      }
      if (label) {
        content = label;
      }
      if (key) {
        content = key;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueEntryIdentifier(element) {
      const me = JobsView.uniqueEntryIdentifier.name;
      this.logger.entered(me, element);

      const content = this.defaultUid(element);

      this.logger.leaving(me, content);
      return content;
    }

    /** @type {Scroller} */
    get cards() {
      if (!this.#cardScroller) {
        this.#cardScroller = new Scroller(JobsView.#cardsWhat,
          JobsView.#cardsHow);
        this.addService(LinkedInScrollerService)
          .setScroller(this.#cardScroller);
        this.#cardScroller.dispatcher.on('change', this.#onCardChange);

        this.#lastScroller = this.#cardScroller;
      }
      return this.#cardScroller;
    }

    /** @type {Scroller} */
    get entries() {
      if (!this.#entryScroller && this.cards.item) {
        this.#entryScroller = new Scroller(
          {base: this.cards.item, ...JobsView.#entriesWhat},
          JobsView.#entriesHow
        );
        this.#entryScroller.dispatcher.on('change', this.#onEntryChange);
        this.#entryScroller.dispatcher.on(
          'out-of-range', this.#returnToCard
        );
      }
      return this.#entryScroller;
    }

    nextCard = new Shortcut(
      'j',
      'Next card',
      () => {
        this.cards.next();
      }
    );

    prevCard = new Shortcut(
      'k',
      'Previous card',
      () => {
        this.cards.prev();
      }
    );

    nextEntry = new Shortcut(
      'n',
      'Next entry in a section',
      () => {
        this.entries.next();
      }
    );

    prevEntry = new Shortcut(
      'p',
      'Previous entry in a section',
      () => {
        this.entries.prev();
      }
    );

    firstItem = new Shortcut(
      '<',
      'Go to the first item',
      () => {
        this.#lastScroller.first();
      }
    );

    lastItem = new Shortcut(
      '>',
      'Go to the last item',
      () => {
        this.#lastScroller.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Change browser focus to current item',
      () => {
        if (litOptions.enableScrollerChangesFocus) {
          this.#lastScroller.focus();
        } else {
          NH.web.focusOnElement(this.#lastScroller.item);
        }
      }
    );

    showMore = new Shortcut(
      'm',
      'Show more of current item',
      () => {
        const el = this.#lastScroller.item;
        if (el) {
          NH.web.clickElement(el, ['[data-testid="expandable-text-button"]']);
        }
      }
    );

    applyToJob = new Shortcut(
      'A',
      'Apply to job',
      () => {
        const el = document.querySelector(JobsView.#jobCardSelector);
        NH.web.clickElement(el, [
          // Matches both "link-external" and "linkedin-bug" icons
          '[aria-label]:has(> * > svg[id^="link"])',
        ]);
      }
    );

    toggleFollowCompany = new Shortcut(
      'F', 'Toggle following company', () => {
        // The anchor below is the link to the company in "About the company"
        NH.web.clickElement(document, [
          // Follow
          'a + :has(> * > svg[id^="add-"])',
          // Unfollow
          'a + :has(> * > svg[id^="check-"])',
        ]);
      }
    );

    toggleAlert = new Shortcut(
      'L',
      'Toggle the similar job search aLert',
      () => {
        NH.web.clickElement(document, ['[role="switch"]']);
      }
    );

    toggleSaveJob = new Shortcut(
      'S',
      'Toggle saving job',
      () => {
        const el = document.querySelector(JobsView.#jobCardSelector);
        NH.web.clickElement(el, [
          // Fragile, as currently only button in the card without an icon.
          'button:not(:has(svg))',
        ]);
      }
    );

    static #cardsContainer = '[data-testid="lazy-column"]';

    /** @type {Scroller~How} */
    static #cardsHow = {
      uidCallback: JobsView.uniqueCardIdentifier,
      classes: ['tom'],
      snapToTop: false,
    };

    /** @type {Scroller~What} */
    static #cardsWhat = {
      name: `${this.name} cards`,
      containerItems: [
        {
          container: JobsView.#cardsContainer,
          items: [
            // Main content
            ':scope > :first-child',
            // Rest
            ':scope > :not(:first-child) > *',
          ].join(','),
        },
      ],
    };

    /** @type {Page~PageDetails} */
    static #details = {
      // eslint-disable-next-line prefer-regex-literals
      pathname: RegExp('^/jobs/view/\\d+.*', 'u'),
      pageReadySelector: 'main > div > div > div',
    };

    /** @type {Scroller~How} */
    static #entriesHow = {
      uidCallback: JobsView.uniqueEntryIdentifier,
      classes: ['dick'],
      autoActivate: true,
      snapToTop: false,
    };

    /** @type {Scroller~What} */
    static #entriesWhat = {
      name: `${this.name} entries`,
      selectors: [
        // More jobs
        ':scope a',
      ],
    };

    static #jobCardSelector = `${JobsView.#cardsContainer} > div:first-child`;

    #cardScroller
    #entryScroller
    #keyboardService
    #lastScroller

    #toolbarHook = () => {
      const me = 'toolbarHook';
      this.logger.entered(me);

      this.logger.log('Initializing scroller:', this.cards.item);

      this.logger.leaving(me);
    }

    #onCardChange = () => {
      this.#resetEntries();
      this.#lastScroller = this.cards;
    }

    #resetEntries = () => {
      if (this.#entryScroller) {
        this.#entryScroller.destroy();
        this.#entryScroller = null;
      }
      this.entries;
    }

    #onEntryChange = () => {
      this.#lastScroller = this.entries;
    }

    #returnToCard = () => {
      this.cards.item = this.cards.item;
    }

  }

  /** Class for handling the Messaging page. */
  class Messaging extends Page {

    /** @param {SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...Messaging.#details});

      this.addService(LinkedInStyleService, this)
        .addStyles(LinkedIn.Style.ONE);

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      this.#convoCardScroller = new Scroller(Messaging.#convoCardsWhat,
        Messaging.#convoCardsHow);
      this.addService(LinkedInScrollerService)
        .setScroller(this.#convoCardScroller);
      this.#convoCardScroller.dispatcher.on('activate',
        this.#onConvoCardActivate);
      this.#convoCardScroller.dispatcher.on('change',
        this.#onConvoCardChange);
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueConvoCardsIdentifier(element) {
      const me = Messaging.uniqueConvoCardsIdentifier.name;
      this.logger.entered(me, element);

      const content = this.defaultUid(element);

      this.logger.leaving(me);
      return content;
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueMessageIdentifier(element) {
      const me = Messaging.uniqueMessageIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const urn = element.dataset.eventUrn;

      if (urn) {
        content = urn;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /** @type {Scroller} */
    get convoCards() {
      return this.#convoCardScroller;
    }

    /** @type {Scroller} */
    get messages() {
      const me = 'get messages';
      this.logger.entered(me, this.convoCards.item);

      if (!this.#messageScroller && this.convoCards.item) {
        this.#messageScroller = new Scroller(
          Messaging.#messagesWhat, Messaging.#messagesHow
        );
        this.#messageScroller.dispatcher.on('change', this.#onMessageChange);
      }

      this.logger.leaving(me, this.#messageScroller);
      return this.#messageScroller;
    }

    nextConvo = new Shortcut(
      'j',
      'Next conversation card',
      () => {
        this.convoCards.next();
      }
    );

    prevConvo = new Shortcut(
      'k',
      'Previous conversation card',
      () => {
        this.convoCards.prev();
      }
    );

    nextMessage = new Shortcut(
      'n',
      'Next message in conversation',
      () => {
        this.messages.next();
      }
    );

    prevMessage = new Shortcut(
      'p',
      'Previous message in conversation',
      () => {
        this.messages.prev();
      }
    );

    firstItem = new Shortcut(
      '<',
      'First conversation card or message',
      () => {
        this.#lastScroller.first();
      }
    );

    lastItem = new Shortcut(
      '>',
      'Last conversation card or message',
      () => {
        this.#lastScroller.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Move browser focus to most recently selected item',
      () => {
        if (litOptions.enableScrollerChangesFocus) {
          this.#lastScroller.focus();
        } else {
          NH.web.focusOnElement(this.#lastScroller.item, false);
        }
      }
    );

    loadMoreConversations = new Shortcut(
      'l',
      'Load more conversations',
      () => {
        const me = 'loadMoreConversations';
        this.logger.entered(me);

        // This button has no distinguishing features, but seems to be the
        // last item in this list, and only one immediately a list item.
        NH.web.clickElement(document,
          [`${Messaging.#convoCardsList} > li > button`]);

        this.logger.leaving(me);
      }
    );

    messageFilters = new Shortcut(
      'm',
      'Go to messaging filters',
      () => {
        const me = this.messageFilters.name;
        this.logger.entered(me);

        NH.web.focusOnElement(document.querySelector(
          `${Messaging.#messagingFilterSelector} button`
        ));

        this.logger.leaving(me);
      }
    );

    searchMessages = new Shortcut(
      's',
      'Go to Search messages',
      () => {
        const me = 'searchMessages';
        this.logger.entered(me);

        NH.web.focusOnElement(
          document.querySelector('#search-conversations')
        );

        this.logger.leaving(me);
      }
    );

    openMeatballMenu = new Shortcut(
      '=',
      'Open closest <button class="spa-meatball">⋯</button> menu (tricky, ' +
        'as there are many buttons to choose from)',
      () => {
        const me = this.openMeatballMenu.name;
        this.logger.entered(me, this.#lastScroller);

        if (this.convoCards.item.contains(document.activeElement) ||
            this.messages.item?.contains(document.activeElement)) {
          let buttons = null;
          if (this.#lastScroller === this.convoCards) {
            buttons = this.convoCards.item.querySelectorAll('button');
            if (buttons.length === NH.base.ONE_ITEM) {
              buttons[0].click();
            } else {
              NH.base.issues.post(
                'Current conversation card does not have only one button',
                this.convoCards.item.outerHTML
              );
            }
          } else {
            this.logger.log('Using messages', this.messages.item);
            buttons = document.querySelectorAll(
              'div.msg-title-bar button.msg-thread-actions__control'
            );
            if (buttons.length === NH.base.ONE_ITEM) {
              buttons[0].click();
            } else {
              const msgs = Array.from(buttons)
                .map(x => x.outerHTML);
              NH.base.issues.post(
                'The message title bar did not have exactly one button ' +
                  'matching the search criteria',
                ...msgs
              );
            }
          }
        } else {
          this.#clickClosestMenuButton();
        }
        this.logger.leaving(me);
      }
    );

    messageBox = new Shortcut(
      'M',
      'Go to the <i>Write a message</i> box',
      () => {
        NH.web.clickElement(document, [Messaging.#messageBoxSelector]);
      }
    );

    newMessage = new Shortcut(
      'N',
      'Compose a new message',
      () => {
        const me = 'newMessage';
        this.logger.entered(me);

        // Composing a new message changes the URL, triggering page
        // activation, which immediately refocuses on the current
        // conversation.  Setting it to `null` does lose are spot in the
        // Scroller, but then at least the feature works.
        this.convoCards.item = null;
        NH.web.clickElement(document,
          ['#messaging :has(> svg[data-test-icon^="compose"])']);

        this.logger.leaving(me);
      }
    );

    toggleStar = new Shortcut(
      'S',
      'Toggle star on the current conversation',
      () => {
        NH.web.clickElement(document, ['button.msg-thread__star-icon']);
      }
    );

    /** @type {Scroller~How} */
    static #convoCardsHow = {
      uidCallback: Messaging.uniqueConvoCardsIdentifier,
      classes: ['tom'],
      snapToTop: false,
    };

    static #convoCardsList =
      'main ul.msg-conversations-container__conversations-list';

    /** @type {Scroller~What} */
    static #convoCardsWhat = {
      name: `${this.name} conversations`,
      containerItems: [
        {
          container: Messaging.#convoCardsList,
          items: ':scope > li.msg-conversations-container__pillar',
        },
      ],
    };

    /** @type {Page~PageDetails} */
    static #details = {
      // eslint-disable-next-line prefer-regex-literals
      pathname: RegExp('^/messaging/.*', 'u'),
      pageReadySelector: LinkedInGlobals.asideSelector,
    };

    static #messageBoxSelector = 'main div.msg-form__contenteditable';

    /** @type {Scroller~How} */
    static #messagesHow = {
      uidCallback: Messaging.uniqueMessageIdentifier,
      classes: ['dick'],
      autoActivate: true,
      snapToTop: false,
    };

    /** @type {Scroller~What} */
    static #messagesWhat = {
      name: `${this.name} messages`,
      containerItems: [
        {
          container: 'ul.msg-s-message-list-content',
          items:
          ':scope > li.msg-s-message-list__event > div[data-event-urn]',
        },
      ],
    };

    static #messagingFilterSelector =
      '.msg-cross-pillar-inbox-filters-v3__container';

    static #messagingOptionsSelector =
      'button[aria-label="See more messaging options"]';

    static #sendToggleSelector = 'button.msg-form__send-toggle';

    #activator
    #convoCardScroller
    #keyboardService
    #lastScroller
    #messageScroller

    /**
     * @typedef {object} Point
     * @property {number} x - Horizontal location in pixels.
     * @property {number} y - Vertical location in pixels.
     * @property {HTMLElement} element - Associated element.
     */

    /**
     * @param {HTMLElement} element - Element to examine.
     * @returns {Point} - Center of the element.
     */
    #centerOfElement = (element) => {
      const TWO = 2;

      const center = {
        x: 0,
        y: 0,
        element: element,
      };
      if (element) {
        const bbox = element.getBoundingClientRect();
        this.logger.log('bbox:', bbox);
        center.x = (bbox.left + bbox.right) / TWO;
        center.y = (bbox.top + bbox.bottom) / TWO;
      }
      return center;
    }

    #clickClosestMenuButton = () => {
      // Two more buttons to choose from.  There are two ways of calculating
      // the distance from the activeElement to the buttons: Path in the DOM
      // tree or geometry.  Considering the buttons are fixed, I suspect
      // geometry is probably easier than trying to find the common ancestors.
      const messagingOptions = document.querySelector(
        Messaging.#messagingOptionsSelector
      );
      if (!messagingOptions) {
        NH.base.issues.post(
          'Unable to find the messaging options button.',
          'Selector used:',
          Messaging.#messagingOptionsSelector
        );
      }

      const sendToggle = document.querySelector(
        Messaging.#sendToggleSelector
      );
      if (!sendToggle) {
        NH.base.issues.post(
          'Unable to find the messaging send toggle button',
          'Selector used:',
          Messaging.#sendToggleSelector
        );
      }
      const activeCenter = this.#centerOfElement(document.activeElement);
      const optionsCenter = this.#centerOfElement(messagingOptions);
      const toggleCenter = this.#centerOfElement(sendToggle);
      optionsCenter.distance = this.#distanceBetweenPoints(
        activeCenter, optionsCenter
      );
      toggleCenter.distance = this.#distanceBetweenPoints(
        activeCenter, toggleCenter
      );
      const centers = [optionsCenter, toggleCenter];
      centers.sort((a, b) => a.distance - b.distance);
      centers[0].element.click();
    }

    /**
     * @param {Point} one - First point.
     * @param {Point} two - Second point.
     * @returns {number} - Distance between the points in pixels.
     */
    #distanceBetweenPoints = (one, two) => {
      const me = 'distanceBetweenPoints';
      this.logger.entered(me, one, two);

      const xd = one.x - two.x;
      const yd = one.y - two.y;
      const distance = Math.sqrt((xd * xd) + (yd * yd));

      this.logger.leaving(me, distance);
      return distance;
    }

    #onConvoCardActivate = async () => {
      const me = 'onConvoCardActivate';
      this.logger.entered(me);

      await this.#findActiveConvo();

      this.logger.leaving(me);
    }

    #onConvoCardChange = () => {
      const me = this.#onConvoCardChange.name;
      this.logger.entered(me);

      const el = this.convoCards?.item;
      NH.web.clickElement(el, ['.msg-conversation-listitem__link']);

      this.#resetMessages();
      this.#lastScroller = this.convoCards;

      this.logger.leaving(me);
    }

    #resetMessages = () => {
      if (this.#messageScroller) {
        this.#messageScroller.destroy();
        this.#messageScroller = null;
      }
      this.messages;
    }

    #onMessageChange = () => {
      this.#lastScroller = this.messages;
    }

    #findActiveConvo = async () => {
      const me = this.#findActiveConvo.name;
      this.logger.entered(me);

      try {
        const timeout = 2000;
        const item = await NH.web.waitForSelector(
          '.msg-conversations-container__convo-item-link--active', timeout
        );
        this.convoCards.goto(item.closest('li'));
      } catch (e) {
        this.logger.log('Active conversation card not found, staying put');
      }

      this.logger.leaving(me);
    }

  }

  /** Class for handling the Notifications page. */
  class Notifications extends Page {

    /** @param {SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...Notifications.#details});

      this.addService(LinkedInStyleService, this)
        .addStyles(LinkedIn.Style.ONE);

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      spa.details.navbarScrollerFixup(Notifications.#notificationsHow);

      this.#notificationScroller = new Scroller(
        Notifications.#notificationsWhat, Notifications.#notificationsHow
      );
      this.addService(LinkedInScrollerService)
        .setScroller(this.#notificationScroller);
      this.#notificationScroller.dispatcher.on('out-of-range',
        linkedInGlobals.focusOnSidebar);
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueNotificationIdentifier(element) {
      const me = Notifications.uniqueNotificationIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const hotKey = element.parentElement.dataset.finiteScrollHotkeyItem;
      const cardIndex = element.dataset.ntCardIndex;

      if (hotKey) {
        content = hotKey;
      }
      if (cardIndex) {
        content = cardIndex;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * Given a notification card, find the correct item inside of it to click.
     *
     * @implements {Scroller~ElementFinder}
     * @param {HTMLElement} element - Element to examine.
     * @returns {HTMLElement} - Found element.
     */
    static cardItemToClick(element) {
      let found = null;

      if (element) {
        const elements = element.querySelectorAll(
          '.nt-card__headline'
        );
        if (elements.length === NH.base.ONE_ITEM) {
          found = elements[0];
        } else {
          const ba = element.querySelectorAll('button,a');
          if (ba.length === NH.base.ONE_ITEM) {
            found = ba[0];
          }
        }
      }

      return found;
    }

    /** @type {Scroller} */
    get notifications() {
      return this.#notificationScroller;
    }

    nextNotification = new Shortcut(
      'j',
      'Next notification',
      () => {
        this.notifications.next();
      }
    );

    prevNotification = new Shortcut(
      'k',
      'Previous notification',
      () => {
        this.notifications.prev();
      }
    );

    firstNotification = new Shortcut(
      '<',
      'Go to first notification',
      () => {
        this.notifications.first();
      }
    );

    lastNotification = new Shortcut(
      '>', 'Go to last notification', () => {
        this.notifications.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Change browser focus to current notification',
      () => {
        if (litOptions.enableScrollerChangesFocus) {
          this.notifications.focus();
        } else {
          this.notifications.show();
          NH.web.focusOnElement(this.notifications.item);
        }
      }
    );

    activateNotification = new Shortcut(
      'Enter',
      'Activate the current notification (click on it)',
      () => {
        if (litOptions.enableIssue241ClickMethod) {
          this.notifications.click();
        } else {
          const element = Notifications.cardItemToClick(
            this.notifications.item
          );
          if (element) {
            element.click();
          } else {
            // Again, because we use Enter as the hotkey for this action.
            document.activeElement.click();
          }
        }
      }
    );

    loadMoreNotifications = new Shortcut(
      'l',
      'Load more notifications',
      () => {
        const me = this.loadMoreNotifications.name;
        this.logger.entered(me);

        const savedScrollTop = document.documentElement.scrollTop;
        let first = false;
        const notifications = this.notifications;

        /** Trigger function for {@link NH.web.otrot2}. */
        function trigger() {
          if (NH.web.clickElement(document,
            ['main button:has(> svg[data-test-icon^="arrow-up"]'])) {
            first = true;
          } else {
            NH.web.clickElement(document,
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
            this.notifications.shine();
          }
        };

        const what = {
          name: `${this.pageId} ${me}`,
          base: document.querySelector('div.scaffold-finite-scroll__content'),
        };
        const how = {
          trigger: trigger,
          action: action,
          duration: 2000,
        };

        NH.web.otrot2(what, how);

        this.logger.leaving(me);
      }
    );

    openMeatballMenu = new Shortcut(
      '=',
      'Open the <button class="spa-meatball">⋯</button> menu',
      () => {
        NH.web.clickElement(this.notifications.item,
          ['button:has(> svg[data-test-icon^="overflow"]']);
      }
    );

    gotoFilter = new Shortcut(
      'F',
      'Move focus to the notification filters',
      () => {
        this.notifications.item = null;
        NH.web.focusOnElement(
          document.querySelector('#notification-nt-pill .nt-pill--selected')
        );
      }
    );

    deleteNotification = new Shortcut(
      'X',
      'Toggle current notification deletion',
      async () => {
        const me = this.deleteNotification.name;
        this.logger.entered(me);

        const el = this.notifications.item;

        /** Trigger function for {@link NH.web.otrot}. */
        function trigger() {
          NH.web.clickElement(el, [
            'button:has(svg[data-test-icon^="trash"])',
            'button:has(svg[data-test-icon^="undo"])',
          ]);
        }
        if (el) {
          const what = {
            name: `${this.pageId} ${me}`,
            base: el,
          };
          const how = {
            trigger: trigger,
            timeout: 3000,
          };
          await NH.web.otrot(what, how);
          this.notifications.shine();
        }

        this.logger.leaving(me);
      }
    );

    /** @type {Page~PageDetails} */
    static #details = {
      pathname: '/notifications/',
      pageReadySelector: 'footer.global-footer-compact',
    };

    /** @type {Scroller~How} */
    static #notificationsHow = {
      uidCallback: Notifications.uniqueNotificationIdentifier,
      classes: ['tom'],
      snapToTop: false,
      clickConfig: {
        finder: Notifications.cardItemToClick,
      },
    };

    /** @type {Scroller~What} */
    static #notificationsWhat = {
      name: `${this.name} cards`,
      containerItems: [
        {
          container: 'main section div.nt-card-list',
          items: 'article',
        },
      ],
    };

    #keyboardService
    #notificationScroller

  }

  /** Class for handling the Profile page. */
  class Profile extends Page {

    /** @param {SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...Profile.#details});

      this.addService(LinkedInStyleService, this)
        .addStyles(LinkedIn.Style.TWO);

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      this.addService(LinkedInToolbarService, this)
        .addHows(Profile.#sectionsHow, Profile.#entriesHow)
        .postActivateHook(this.#toolbarHook);
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueSectionIdentifier(element) {
      const me = Profile.uniqueSectionIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const key = LinkedIn.ckeyIdentifier(element);

      if (key) {
        content = Profile.#uidSectionRE.exec(key)?.groups.id;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * With so much variation in items, this is overly long.
     *
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueEntryIdentifier(element) {
      const me = Profile.uniqueEntryIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const key = LinkedIn.ckeyIdentifier(element);

      if (key) {
        content = key;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /** @type {Scroller} */
    get entries() {
      if (!this.#entryScroller && this.sections.item) {
        this.#entryScroller = new Scroller(
          {base: this.sections.item, ...Profile.#entriesWhat},
          Profile.#entriesHow
        );
        this.#entryScroller.dispatcher.on('change', this.#onEntryChange);
        this.#entryScroller.dispatcher.on(
          'out-of-range', this.#returnToSection
        );
      }
      return this.#entryScroller;
    }

    /** @type {Scroller} */
    get sections() {
      if (!this.#sectionScroller) {
        this.#sectionScroller = new Scroller(Profile.#sectionsWhat,
          Profile.#sectionsHow);
        this.addService(LinkedInScrollerService)
          .setScroller(this.#sectionScroller);
        this.#sectionScroller.dispatcher.on('change', this.#onSectionChange);

        this.#lastScroller = this.#sectionScroller;
      }
      return this.#sectionScroller;
    }

    nextSection = new Shortcut(
      'j',
      'Next section',
      () => {
        this.sections.next();
      }
    );

    prevSection = new Shortcut(
      'k',
      'Previous section',
      () => {
        this.sections.prev();
      }
    );

    nextEntry = new Shortcut(
      'n',
      'Next entry in a section',
      () => {
        this.entries.next();
      }
    );

    prevEntry = new Shortcut(
      'p',
      'Previous entry in a section',
      () => {
        this.entries.prev();
      }
    );

    firstItem = new Shortcut(
      '<',
      'Go to the first section or entry',
      () => {
        this.#lastScroller.first();
      }
    );

    lastItem = new Shortcut(
      '>',
      'Go to the last section or entry',
      () => {
        this.#lastScroller.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Change browser focus to current item',
      () => {
        if (litOptions.enableScrollerChangesFocus) {
          this.#lastScroller.focus();
        } else {
          NH.web.focusOnElement(this.#lastScroller.item);
        }
      }
    );

    seeMore = new Shortcut(
      'm',
      'Show more of the current item',
      () => {
        const el = this.#lastScroller.item;
        NH.web.clickElement(el, ['[data-testid="expandable-text-button"]']);
      }
    );

    editItem = new Shortcut(
      'E',
      'Edit the current item (if possible)',
      () => {
        // Some sections have multiple edit buttons, so walk amongst them.
        const el = this.#lastScroller.item;
        this.logger.log('el', el);
      }
    );

    /** @type {Page~PageDetails} */
    static #details = {
      // eslint-disable-next-line prefer-regex-literals
      pathname: RegExp('^/in/.*', 'u'),
      pageReadySelector: '[data-sdui-component$="profileCardsAboveActivity"]',
    };

    /** @type {Scroller~How} */
    static #entriesHow = {
      uidCallback: Profile.uniqueEntryIdentifier,
      classes: ['dick'],
      autoActivate: true,
      snapToTop: false,
    };

    /** @type {Scroller~What} */
    static #entriesWhat = {
      name: `${this.name} entries`,
      // TODO(#297): Need to start from scratch.
      selectors: [
        // Known sections in "curr next" pairs, suitable for tsort.
        // This is just to help stay organized.
        // Topcard About
        // Topcard Analytics
        // Topcard Highlights
        // Highlights About
        // Analytics About
        // About Activity
        // About Featured
        // About Services
        // Services Featured
        // Featured Activity
        // Activity Experience
        // Experience Education
        // Education License
        // Education Skills
        // License Projects
        // License Skills
        // License Volunteering
        // Volunteering Skills
        // Projects Skills
        // Skills Honors
        // Skills Interests
        // Skills Recommendations
        // Recommendations Courses
        // Recommendations Interests
        // Recommendations Publications
        // Publications Patents
        // Courses Languages
        // Patents Honors
        // Honors Interests
        // Honors Languages
        // Languages Interests
        // Interests Causes
        [
          // "Show all" buttons
          'hr ~ div > a:has(svg[id^="arrow-right"])',
        ].join(','),
      ],
    };

    /** @type {Scroller~How} */
    static #sectionsHow = {
      uidCallback: Profile.uniqueSectionIdentifier,
      classes: ['tom'],
      snapToTop: false,
    };

    /** @type {Scroller~What} */
    static #sectionsWhat = {
      name: `${this.name} sections`,
      containerItems: [
        {
          container: '[data-testid="lazy-column"]',
          items: [
            // Sections of interest.
            'section:not([aria-roledescription="carousel"])',
          ].join(','),
        },
      ],
    };

    static #uidSectionRE =
    /^(?:com.linkedin.sdui.profile.card.*-aow)?(?<id>.*)/u;

    #entryScroller
    #keyboardService
    #lastScroller
    #sectionScroller

    #toolbarHook = () => {
      const me = 'toolbarHook';
      this.logger.entered(me);

      this.logger.log('Initializing scroller:', this.sections.item);

      this.logger.leaving(me);
    }

    #resetEntries = () => {
      if (this.#entryScroller) {
        this.#entryScroller.destroy();
        this.#entryScroller = null;
      }
      this.entries;
    }

    #onEntryChange = () => {
      this.#lastScroller = this.entries;
    }

    #onSectionChange = () => {
      this.#resetEntries();
      this.#lastScroller = this.sections;
    }

    #returnToSection = () => {
      this.sections.item = this.sections.item;
    }

  }

  /**
   * Class for handling the Events page.
   * TODO(#236): WIP.
   */
  class Events extends Page {

    /** @param {SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...Events.#details});

      this.addService(LinkedInStyleService, this)
        .addStyles(LinkedIn.Style.ONE);

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      spa.details.navbarScrollerFixup(Events.#collectionsHow);
      spa.details.navbarScrollerFixup(Events.#eventsHow);

      this.#collectionScroller = new Scroller(
        Events.#collectionsWhat, Events.#collectionsHow
      );
      this.addService(LinkedInScrollerService)
        .setScroller(this.#collectionScroller);

      this.#collectionScroller.dispatcher.on(
        'change', this.#onCollectionChange
      );
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueCollectionIdentifier(element) {
      const me = Events.uniqueCollectionIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const h1 = element.querySelector('h1')?.innerText.trim();
      const h2 = LinkedIn.h2(element);

      if (h2) {
        content = h2;
      }
      if (h1) {
        content = h1;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueEventIdentifier(element) {
      const me = Events.uniqueEventIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const anchor = element.querySelector('a');

      if (anchor?.href) {
        content = new URL(anchor.href).pathname;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /** @type {Scroller} */
    get collections() {
      return this.#collectionScroller;
    }

    /** @type {Scroller} */
    get events() {
      if (!this.#eventScroller && this.collections.item) {
        this.#eventScroller = new Scroller(
          {base: this.collections.item, ...Events.#eventsWhat},
          Events.#eventsHow
        );
        this.#eventScroller.dispatcher.on('change', this.#onEventChange);
        this.#eventScroller.dispatcher.on(
          'out-of-range', this.#returnToCollection
        );
      }
      return this.#eventScroller;
    }

    nextEventsCollection = new Shortcut(
      'j',
      'Next event collection',
      () => {
        this.collections.next();
      }
    );

    prevEventsCollection = new Shortcut(
      'k',
      'Previous event collection',
      () => {
        this.collections.prev();
      }
    );

    nextEvent = new Shortcut(
      'n',
      'Next event in collection',
      () => {
        this.events.next();
      }
    );

    prevEvent = new Shortcut(
      'p',
      'Previous event in collection',
      () => {
        this.events.prev();
      }
    );

    firstItem = new Shortcut(
      '<',
      'Go to first item',
      () => {
        this.#lastScroller.first();
      }
    );

    lastItem = new Shortcut(
      '>',
      'Go to last item',
      () => {
        this.#lastScroller.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Change browser focus to current item',
      () => {
        if (litOptions.enableScrollerChangesFocus) {
          this.#lastScroller.focus();
        } else {
          const el = this.#lastScroller.item;
          NH.web.focusOnElement(el);
        }
      }
    );

    shareItem = new Shortcut(
      'S',
      'Share the current item, if available',
      () => {
        const me = 'shareItem';
        const item = this.events.item;
        this.logger.entered(me, item);

        if (item) {
          NH.web.clickElement(item,
            ['button.events-components-shared-support-share__share-button']);
        }

        this.logger.leaving(me);
      }
    );

    /** @type {Scroller~How} */
    static #collectionsHow = {
      uidCallback: Events.uniqueCollectionIdentifier,
      classes: ['tom'],
      snapToTop: false,
    };

    /** @type {Scroller~What} */
    static #collectionsWhat = {
      name: `${this.name} collections`,
      containerItems: [
        {
          container: 'main:has(> section)',
          items: [
            // Major collections
            ':scope > section',
          ].join(','),
        },
      ],
    };

    static #details = {
      pathname: '/events/',
      pageReadySelector: '#share-linkedin-small',
    };

    /** @type {Scroller~How} */
    static #eventsHow = {
      uidCallback: Events.uniqueEventIdentifier,
      classes: ['dick'],
      snapToTop: false,
    };

    /** @type {Scroller~What} */
    static #eventsWhat = {
      name: `${this.name} events`,
      selectors: [
        // Your events collection
        ':scope > section > div',
        // Most event collections
        ':scope > main > div > section',
        // Exclusive for Premium
        ':scope > main > div > div > section',
        // Show more
        ':scope > footer',
      ],
    };

    #collectionScroller
    #eventScroller
    #keyboardService
    #lastScroller

    #resetEvents = () => {
      this.#eventScroller?.destroy();
      this.#eventScroller = null;
      this.events;
    }

    #onEventChange = () => {
      this.#lastScroller = this.events;
    }

    #returnToCollection = () => {
      this.collections.item = this.collections.item;
    }

    #onCollectionChange = () => {
      this.#resetEvents();
      this.#lastScroller = this.collections;
    }

  }

  /**
   * Class for handling the SearchResultsPeople page.
   * TODO(#209): WIP.
   */
  class SearchResultsPeople extends Page {

    /** @param {SPA} spa - SPA instance that manages this Page. */
    constructor(spa) {
      super({spa: spa, ...SearchResultsPeople.#details});

      this.addService(LinkedInStyleService, this)
        .addStyles(LinkedIn.Style.TWO);

      this.#keyboardService = this.addService(VMKeyboardService);
      this.#keyboardService.addInstance(this);

      this.addService(LinkedInToolbarService, this)
        .addHows(
          SearchResultsPeople.#resultsHow,
          SearchResultsPeople.#paginationHow
        )
        .postActivateHook(this.#toolbarHook);
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniquePaginationIdentifier(element) {
      const me = SearchResultsPeople.uniquePaginationIdentifier.name;
      this.logger.entered(me, element);

      const content = this.defaultUid(element);

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @implements {Scroller~uidCallback}
     * @param {Element} element - Element to examine.
     * @returns {string} - A value unique to this element.
     */
    static uniqueResultIdentifier(element) {
      const me = SearchResultsPeople.uniqueResultIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const href = element.href;

      if (href) {
        content = new URL(href).pathname;
      }
      if (!content) {
        content = this.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /** @type {Scroller} */
    get paginator() {
      if (!this.#paginationScroller) {
        this.#paginationScroller = new Scroller(
          SearchResultsPeople.#paginationWhat,
          SearchResultsPeople.#paginationHow
        );
        this.addService(LinkedInScrollerService)
          .setScroller(this.#paginationScroller);
        this.#paginationScroller.dispatcher.on('activate',
          this.#onPaginationActivate);
        this.#paginationScroller.dispatcher.on('change',
          this.#onPaginationChange);
      }
      return this.#paginationScroller;
    }

    /** @type {Scroller} */
    get results() {
      if (!this.#resultScroller) {
        this.#resultScroller = new Scroller(SearchResultsPeople.#resultsWhat,
          SearchResultsPeople.#resultsHow);
        this.addService(LinkedInScrollerService)
          .setScroller(this.#resultScroller);
        this.#resultScroller.dispatcher.on('change', this.#onResultChange);

        this.#lastScroller = this.#resultScroller;
      }
      return this.#resultScroller;
    }

    nextResult = new Shortcut(
      'j',
      'Next result',
      () => {
        this.results.next();
      }
    );

    prevResult = new Shortcut(
      'k',
      'Previous result',
      () => {
        this.results.prev();
      }
    );

    nextResultsPage = new Shortcut(
      'N',
      'Next results page',
      () => {
        this.paginator.next();
      }
    );

    prevResultsPage = new Shortcut(
      'P',
      'Previous results page',
      () => {
        this.paginator.prev();
      }
    );

    selectCurrentResultsPage = new Shortcut(
      'c',
      'Select current results page',
      () => {
        NH.web.clickElement(this.paginator.item, ['button']);
      }
    );

    firstItem = new Shortcut(
      '<',
      'Go to the first item',
      () => {
        this.#lastScroller.first();
      }
    );

    lastItem = new Shortcut(
      '>',
      'Go to the last item',
      () => {
        this.#lastScroller.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Change browser focus to current item',
      () => {
        if (litOptions.enableScrollerChangesFocus) {
          this.#lastScroller.focus();
        } else {
          NH.web.focusOnElement(this.#lastScroller.item);
        }
      }
    );

    gotoFilter = new Shortcut(
      'F',
      'Move focus to the search filters',
      () => {
        const element = document.querySelector(
          `[${CKEY}="SearchResults_SearchResultsFilterBar"] [role="button"]`
        );
        NH.web.focusOnElement(element);
      }
    );

    static #details = {
      pathname: '/search/results/people/',
      pageReadySelector: 'div > footer',
    };

    /** @type {Scroller~How} */
    static #paginationHow = {
      uidCallback: SearchResultsPeople.uniquePaginationIdentifier,
      classes: ['dick'],
      snapToTop: false,
      bottomMarginCSS: '3em',
      containerTimeout: 1000,
    };

    /** @type {Scroller~What} */
    static #paginationWhat = {
      name: `${this.name} pagination`,
      containerItems: [
        {
          // This selector is also used in #onPaginationActivate.
          container: 'main ul[data-testid="pagination-controls-list"]',
          items: ':scope > li',
        },
      ],
    };

    /** @type {Scroller~How} */
    static #resultsHow = {
      uidCallback: SearchResultsPeople.uniqueResultIdentifier,
      classes: ['dick'],
      snapToTop: false,
    };

    /** @type {Scroller~What} */
    static #resultsWhat = {
      name: `${this.name} cards`,
      containerItems: [
        {
          container: '[data-testid="lazy-column"]',
          items: `a[${CKEY}]:not([aria-label])`,
        },
      ],
    };

    #keyboardService
    #lastScroller
    #paginationScroller
    #resultScroller

    #toolbarHook = () => {
      const me = 'toolbarHook';
      this.logger.entered(me);

      this.logger.log('Initializing paginator:', this.paginator.item);
      this.logger.log('Initializing results:', this.results.item);

      this.logger.leaving(me);
    }

    #onPaginationActivate = async () => {
      const me = 'onPaginationActivate';
      this.logger.entered(me);

      try {
        const timeout = 2000;
        const item = await NH.web.waitForSelector(
          'div.artdeco-pagination > ul > li.selected',
          timeout
        );
        this.paginator.goto(item);

        // The previous line popped the page to the bottom, so go to someplace
        // reasonable.  On a similar page, JobsCollections, the URL changes to
        // match the current card, so it watches that to avoid this same
        // problem.
        const result = this.results.item;
        if (result) {
          this.results.goto(result);
        } else {
          this.results.first();
        }
      } catch (e) {
        this.logger.log('Results paginator not found, staying put');
      }

      this.logger.leaving(me);
    }

    #onPaginationChange = () => {
      this.#lastScroller = this.paginator;
    }

    #onResultChange = () => {
      this.#lastScroller = this.results;
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

    /** @param {LinkedIn} details - Implementation specific details. */
    constructor(details) {
      this.#name = `${this.constructor.name}: ${details.constructor.name}`;
      this.#id = NH.base.safeId(NH.base.uuId(this.#name));
      this.#logger = new NH.base.Logger(this.#name);
      this.#details = details;
      this.#details.init(this);
      this._initializeInfoView();
      NH.base.issues.listen(this.#issueListener);
      document.addEventListener('focus', this._onFocus, true);
      document.addEventListener('urlchange', this.#onUrlChange, true);
      this.#startUrlMonitor();
      this.#details.done();
    }

    static _errorMarker = '---';

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
      const header = 'Please consider including some of the following ' +
            'information in any bug report:';

      const msgs = NH.userscript.environmentData();

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

    /** @type {Element} - The most recent element to receive focus. */
    _lastInputElement = null;

    /** @type {KeyboardService} */
    _tabUiKeyboard = null;

    /** @type {Set<Page>} - A copy of the current active pages. */
    get activePages() {
      return new Set(this.#activePages);
    }

    /** @type {LinkedIn} */
    get details() {
      return this.#details;
    }

    /** @type {NH.base.Logger} */
    get logger() {
      return this.#logger;
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
      const me = 'onFocus';
      this.logger.entered(me, evt);

      if (this._lastInputElement && evt.target !== this._lastInputElement) {
        this._lastInputElement = null;
        this._setKeyboardContext('inputFocus', false);
      }
      if (NH.web.isInput(evt.target)) {
        this._setKeyboardContext('inputFocus', true);
        this._lastInputElement = evt.target;
      }

      this.logger.leaving(me);
    }

    /**
     * Configure handlers for the info view.
     * @fires 'errors'
     */
    _addInfoViewHandlers() {
      this.#errorText = document.querySelector(
        `#${this._infoId} [data-spa-id="errors"]`
      );
      this.#errorText.addEventListener('change', (evt) => {
        const count = evt.target.value.split('\n')
          .filter(x => x === SPA._errorMarker).length;
        this.#details.dispatcher2.fire('errors', count);
        this._updateInfoErrorsLabel(count);
      });
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
          ' font-size: 1.6rem;' +
          ' line-height: 1.5em;' +
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
          ' list-style: unset;' +
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
      const nameElement = document.createElement('div');
      nameElement.innerHTML =
        `<b>${APP_LONG}</b> - v${GM.info.script.version}`;
      const instructions = document.createElement('div');
      instructions.classList.add('spa-instructions');
      const left = VMKeyboardService.parseSeq('c-left');
      const right = VMKeyboardService.parseSeq('c-right');
      const esc = VMKeyboardService.parseSeq('esc');
      instructions.innerHTML =
        `<span class="left">Use the ${left} and ${right} keys or ` +
        'click to select tab</span>' +
        `<span class="right">Hit ${esc} to close</span>`;
      dialog.append(nameElement, instructions);
      return dialog;
    }

    /**
     * Add basic dialog with an embedded tabbed ui for the info view.
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
     * Generate a unique id for page views.
     * @param {Page} page - An instance of the Page class.
     * @returns {string} - Unique identifier.
     */
    _pageInfoId(page) {
      return `${this._infoId}-${page.pageId}`;
    }

    /**
     * Add shortcut descriptions from the page to the shortcut tab.
     * @param {Page} page - An instance of the Page class.
     */
    _addInfo(page) {
      const shortcuts = document.querySelector(`#${this._infoId} tbody`);
      const section = page.pageName;
      const pageId = this._pageInfoId(page);
      let s = `<tr id="${pageId}"><th></th><th>${section}</th></tr>`;
      for (const {seq, desc} of page.allShortcuts) {
        const keys = VMKeyboardService.parseSeq(seq);
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

    /** Send `change` event to the errors text area. */
    refreshErrors() {
      const evt = new Event('change');
      this.#errorText.dispatchEvent(evt);
    }

    /**
     * Add content to the Errors tab so the user can use it to file feedback.
     * @param {string} content - Information to add.
     */
    addError(content) {
      this.#errorText.value += `${content}\n`;

      if (content === SPA._errorMarker) {
        this.refreshErrors();
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
      const me = 'activate';
      this.logger.entered(me, pathname, this.#activePageNames());

      const pages = this._findPages(pathname);
      const oldPages = new Set(this.#activePages);
      const newPages = new Set(pages);
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

      this.logger.leaving(me, this.#activePageNames());
    }

    /** @type {Set<Page>} - Currently active {Page}s. */
    #activePages = new Set();

    #details
    #errorText
    #id
    #logger
    #name
    #oldUrl

    /** @type {Set<Page>} - Registered {Page}s. */
    #pages = new Set();

    /** @returns {string[]} - Names of active pages. */
    #activePageNames = () => {
      const names = Array.from(this.#activePages, x => x.pageName);
      return names;
    }

    #issueListener = (...issues) => {
      for (const issue of issues) {
        this.addError(issue);
      }
      this.addErrorMarker();
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
     * {LinkedIn.urlChangeMonitorSelector}.  Whenever it is triggered, it
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
      })
        .observe(element, observeOptions);
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
     * Handle urlchange events that indicate a switch to a new page.
     * @param {CustomEvent} evt - Custom 'urlchange' event.
     */
    #onUrlChange = (evt) => {
      this.activate(evt.detail.url.pathname);
    }

  }

  NH.xunit.testing.run();

  // TODO(#240): Due to changes in start up, this value is no longer set
  // before Pages are registered.
  linkedInGlobals.navbarHeightPixels = 16;
  const linkedIn = new LinkedIn(linkedInGlobals);

  await linkedIn.ready;
  log.log('proceeding...');

  const spa = new SPA(linkedIn);
  spa.register(Global);
  spa.register(Feed);
  spa.register(MyNetwork);
  spa.register(InvitationManager);
  spa.register(Jobs);
  spa.register(JobsCollections);
  spa.register(JobsView);
  spa.register(Messaging);
  spa.register(Notifications);
  spa.register(Profile);
  spa.register(Events);
  spa.register(SearchResultsPeople);
  spa.activate(window.location.pathname);

  log.log('Initialization successful.');

})();
