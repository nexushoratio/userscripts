// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @inject-into content
// @noframes
// @version     152
// @author      Mike Castle
// @description Minor enhancements to LinkedIn. Mostly just hotkeys.
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @downloadURL https://github.com/nexushoratio/userscripts/raw/main/linkedin-tool.user.js
// @supportURL  https://github.com/nexushoratio/userscripts/blob/main/linkedin-tool.md
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// @require     https://cdn.jsdelivr.net/npm/commonmark@0.31.2
// @require     https://update.greasyfork.org/scripts/478188/1884975/NH_xunit.js
// @require     https://update.greasyfork.org/scripts/477290/1972828/NH_base.js
// @require     https://update.greasyfork.org/scripts/478349/1936849/NH_userscript.js
// @require     https://update.greasyfork.org/scripts/478440/1978810/NH_web.js
// @require     https://update.greasyfork.org/scripts/478676/1931836/NH_widget.js
// @require     https://update.greasyfork.org/scripts/570146/1900843/NH_spa.js
// @require     https://update.greasyfork.org/scripts/597326/1974342/NH_nav.js
// @grant       GM.addValueChangeListener
// @grant       GM.removeValueChangeListener
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       window.onurlchange
// ==/UserScript==

/**
 * @file LinkedIn Tool
 * @module linkedin-tool
 * @version 152
 * @license [GPL-3.0-or-later]{@link https://www.gnu.org/licenses/gpl-3.0-standalone.html}
 */

/* global VM, commonmark */

// eslint-disable-next-line max-lines-per-function
(async () => {
  'use strict';

  const NH = window.NexusHoratio.base.ensure([
    {name: 'xunit', minVersion: 63},
    {name: 'base', minVersion: 77},
    {name: 'userscript', minVersion: 20},
    {name: 'web', minVersion: 20},
    {name: 'widget', minVersion: 53},
    {name: 'spa', minVersion: 15},
    {name: 'nav', minVersion: 2},
  ]);

  const APP_LONG = GM.info.script.name;
  const CKEY = 'componentkey';
  const COHORTS = 'cohorts';
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
   * @todo Over engineer this into having a schema that could be used for
   * building an edit widget.
   *
   * Saved options will be augmented by any new defaults and resaved.
   * @returns {object} Options key/value pairs.
   */
  async function loadOptions() {
    const defaultOptions = {
      enableDevMode: false,
      enableAlertOldNews: false,
      enableAlertUnsupportedPages: false,
      enableAlertUnknownProfileSections: false,
      enableWatchPage: false,
      fakeErrorRate: 0.8,
      latestNewsRead: '',
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

  /**
   * @todo [(#145)](https://github.com/nexushoratio/userscripts/issues/145)
   * The if test is just here while developing.
   */
  if (!litOptions.enableDevMode) {
    NH.base.Logger.config('Default').enabled = true;
  }

  const issuesForLinkedIn = new NH.base.MessageQueue();

  /** @param {...object} items - Posted issues. */
  function issueListener(...issues) {
    issuesForLinkedIn.post(...issues);
  }

  NH.base.issues.listen(issueListener);

  const log = new NH.base.Logger('Default');

  /** Encapsulate a GitHub (or similar) issue. */
  class GitHubIssue {

    /**
     * @param {string} issueId - Issue identifier, usually a GitHub number.
     * @param {string} title - The GitHub issue title.
     * @param {string} date - A Date parsable string of the last time the
     * issue was verified opened
     */
    constructor(issueId, title, date) {
      this.#issueId = issueId;
      this.#title = title;
      this.#date = new Date(date);
    }

    /** @type {Date} */
    get date() {
      return this.#date;
    }

    /** @type {string} */
    get issueId() {
      return this.#issueId;
    }

    /** @type {string} */
    get title() {
      return this.#title;
    }

    /** @returns {string} A string representing this object. */
    toString() {
      return `${this.issueId}: ${this.title}`;
    }

    #date
    #issueId
    #title

  }

  /**
   * @param {string} issueId - Issue identifier, usually a GitHub number.
   * @param {string} title - The GitHub issue title.
   * @param {string} date - A Date parsable string of the last time the
   * issue was verified opened.
   * @returns {GitHubIssue} New object.
   */
  function ish(issueId, title, date) {
    return new GitHubIssue(issueId, title, date);
  }

  const globalIssues = [
    ish('', 'Minor internal improvements', '9999'),
    ish('167', 'Refactor into libraries', '2026-10-25'),
    ish('209', 'Support **Search Results People** view', '2026-08-09'),
    ish(
      '295',
      'Navigating from *Style-2* page to *Style-1* page breaks LIT',
      '2026-11-06'
    ),
    ish('303', 'Keys are captured while editing text', '2026-10-21'),
    ish('360', 'Support **Search Results All** page', '2026-11-03'),
    ish('253', 'Support **Manage Events** page', '2026-09-21'),
    ish('237', 'Support **Specific Event** pages', '2026-08-23'),
    ish('381', '**Profile**: Make use of `UidMode` consistent', '2026-09-24'),
    ish(
      '385',
      'Capturing the `Enter` key causes as much harm as good.',
      '2026-09-29'
    ),
    ish('386', 'Support **Games** pages', '2026-10-29'),
    ish('260', 'Support **Job tracker** page', '2026-11-03'),
    ish(
      '396',
      '**Profile**: *Suggested for You* scroller is failing',
      '2026-11-03'
    ),
    ish('408', 'Support **Connections** pages', '2026-11-08'),
    ish('293', '`Navigation` library', '2026-09-24'),
    ish(
      '392',
      '**Profile**: *ConnectedAccountsTopLevel* scroller is failing',
      '2026-10-07'
    ),
    ish(
      '414',
      'The stock navbar was redesigned, breaking many things',
      '2026-10-11'
    ),
    ish('394', '**Profile**: *Projects* scroller is failing', '2026-10-12'),
    ish('395', '**Profile**: *Skills* scroller is failing', '2026-10-12'),
    ish(
      '416',
      '**Global**: Sometimes triggers *unsupported style*',
      '2026-10-13'
    ),
    ish(
      '398',
      '**Profile**: *SalesInsightsOrHighlights* scroller is failing',
      '2026-10-13'
    ),
    ish(
      '397',
      '**Profile**: *PublicationTopLevelSection* scroller is failing',
      '2026-10-13'
    ),
    ish('400', '**Profile**: *Patents* scroller is failing', '2026-10-14'),
    ish('380', '**Profile**: Handle tablists sensibly', '2026-10-14'),
    ish(
      '399',
      '**Profile**: *RecommendationsTopLevel* scroller is failing',
      '2026-10-14'
    ),
    ish(
      '401',
      '**Profile**: *HonorsTopLevel* scroller is failing',
      '2026-10-16'
    ),
    ish('402', '**Profile**: *Services* scroller is failing', '2026-10-16'),
    ish(
      '403',
      '**Profile**: *CourseTopLevelSection* scroller is failing',
      '2026-10-17'
    ),
    ish(
      '404',
      '**Profile**: *TestScoresTopLevel* scroller is failing',
      '2026-10-17'
    ),
    ish(
      '405',
      '**Profile**: *LanguageTopLevel* scroller is failing',
      '2026-10-18'
    ),
    ish(
      '406',
      '**Profile**: *Organizations* scroller is failing',
      '2026-10-18'
    ),
    ish('418', 'Support **Manage Event** pages', '2026-10-18'),
    ish('407', '**Profile**: *Causes* scroller is failing', '2026-10-19'),
    ish(
      '417',
      '**Jobs**: There are sections not being matched',
      '2026-10-19'
    ),
    ish('255', 'Support **Analytics Search Appearances** page', '2026-10-20'),
    ish(
      '421',
      '`Scroller`: Refactored version seem prone to infinite recursion' +
        ' issues',
      '2026-10-20'
    ),
    ish('422', 'Support **Jobs Search Results** page', '2026-10-20'),
    ish(
      '313',
      'Consistent way to navigate to filters / tablists',
      '2026-10-22'
    ),
    ish('424', '**Notifications**: Updated to a Style-2 page', '2026-10-22'),
    ish('425', 'Make more use of `LinkedIn` selectors', '2026-10-25'),
    ish('428', 'Support **Profile Viewers** page', '2026-10-25'),
    ish(
      '426',
      '**Feed**: <kbd><kbd>X</kbd></kbd> Toggle hiding post does' +
      ' not recover post',
      '2026-10-26'
    ),
    ish('431', '**Global**: Navbar icons updated', '2026-10-28'),
    ish('433', '**Feed**: menu icons have changed', '2026-10-28'),
    ish(
      '432', '**Feed**: Top margin for scrolling is incorrect', '2026-10-28'
    ),
    ish(
      '429',
      '**Feed**: <kbd><kbd>c</kbd></kbd>omment no longer works',
      '2026-10-28'
    ),
    ish('434', '**Feed**: Many controls had icons renamed', '2026-10-28'),
    ish('436', 'Many icons have changed names', '2026-10-29'),
    ish('427', '**Events**: Updated to a Style-2 page', '2026-10-30'),
    ish('437', 'Support **Recruiter Views** page', '2026-10-31'),
    ish(
      '438',
      'Support **Profile key skill suggestions** page',
      '2026-10-31'
    ),
    ish('439', 'Support **Explorer Career Insights** page', '2026-10-31'),
    ish('440', 'Support **Resumes and application data** page', '2026-10-31'),
    ish('443', 'Support **Manage events** page', '2026-11-01'),
    ish(
      '307',
      '`InvitationManager`: Improve stability of' +
        ' `uniqueInvitationIdentifier()`',
      '2026-11-02'
    ),
    ish('442', '**Invitation Manager**: Scrolling is broken', '2026-11-02'),
    ish(
      '312',
      '`Notifications`: Support delete+navigate hotkeys',
      '2026-11-03'
    ),
    ish(
      '441',
      '`Scroller`: Remove `click()` and associated config',
      '2026-11-03'
    ),
    ish('445', '**Profile**: *Dashboard* section is skipped', '2026-11-04'),
    ish(
      '257',
      'Support **Creator Dashboard: Performance** page',
      '2026-11-04'
    ),
    ish(
      '444',
      '**Search Results People**: finder and aside do not work',
      '2026-11-04'
    ),
    ish('446', 'Support **Creator Dashboard: Content** page', '2026-11-05'),
    ish('447', 'Support **Creator: Monetization** page', '2026-11-05'),
    ish('448', 'Support **Analytics: Audience** page', '2026-11-08'),
    ish(
      '449',
      '`LinkedIn.CONSTANTS`: Fix up and migrate users',
      '2026-11-08'
    ),
  ];

  const globalNewsContent = [
    {
      date: '2026-11-09',
      issues: ['449'],
      subject: 'Migrate **My Networks**\'s primary scroller to `:is(...)`' +
        ' selector',
    },
    {
      date: '2026-11-09',
      issues: ['449'],
      subject: 'Rename property so they start sorting together',
    },
    {
      date: '2026-11-09',
      issues: ['257'],
      subject: 'Remove TODO',
    },
    {
      date: '2026-11-07',
      issues: ['449'],
      subject: 'Make an `:is(...)` variant of `primaryContentSelector`',
    },
    {
      date: '2026-11-07',
      issues: ['449'],
      subject: 'Break up `#primaryContentSelector` into component parts',
    },
    {
      date: '2026-11-07',
      issues: ['448'],
      subject: 'Acknowledge the **Analytics: Audience** page',
    },
    {
      date: '2026-11-07',
      issues: ['257'],
      subject: 'Implement the secondary scroller',
    },
    {
      date: '2026-11-06',
      issues: ['257'],
      subject: 'Implement the primary scroller',
    },
    {
      date: '2026-11-05',
      issues: ['209'],
      subject: 'Update `name:` (and use it) to **Search Results: People**',
    },
    {
      date: '2026-11-05',
      issues: ['257'],
      subject: 'Initial support for the **Creator Dashboard: Performance**' +
        ' page',
    },
    {
      date: '2026-11-05',
      issues: ['446', '447'],
      subject: 'Acknowledge a couple of new pages to support',
    },
    {
      date: '2026-11-05',
      issues: ['385'],
      subject: 'Retire explicit `Enter` key support from **Jobs**',
    },
    {
      date: '2026-11-05',
      issues: ['293'],
      subject: 'Retire original `Scroller` code (in preference to `lib/nav`)',
    },
    {
      date: '2026-11-04',
      issues: ['445'],
      subject: 'Add a new selector for *Analytics* (aka, *Dashboard*)',
    },
    {
      date: '2026-11-04',
      issues: ['257'],
      subject: 'Acknowledge that a page now redirects and changed name',
    },
    {
      date: '2026-11-04',
      issues: ['444'],
      subject: 'Change how paginator handles scrolling during activation',
    },
    {
      date: '2026-11-04',
      issues: ['444'],
      subject: 'Update finder and processor for the `ScrollerService`',
    },
    {
      date: '2026-11-04',
      issues: ['425', '444'],
      subject: 'Factor out a selector for reuse (and migrate to "Style 2.1")',
    },
    {
      date: '2026-11-04',
      issues: ['425'],
      subject: 'Migrate a selector to the new "Style 2.1" variant',
    },
    {
      date: '2026-11-04',
      issues: ['444'],
      subject: 'Add new "Style 2.1" content and aside selectors',
    },
    {
      date: '2026-11-03',
      issues: ['312'],
      subject: 'Implement delete+navigate shortcuts',
    },
    {
      date: '2026-11-03',
      issues: ['312'],
      subject: 'Rename a shortcut for consistency',
    },
    {
      date: '2026-11-03',
      issues: ['293'],
      subject: 'JSDoc: Update types',
    },
    {
      date: '2026-11-03',
      issues: ['441'],
      subject: 'Remove `clickConfig` from `MyNetwork`',
    },
    {
      date: '2026-11-02',
      issues: ['293'],
      subject: 'Migrate `Events` to `nav.Scroller`',
    },
    {
      date: '2026-11-02',
      issues: ['307'],
      subject: 'Use the profile link as the UID',
    },
    {
      date: '2026-11-02',
      issues: ['442'],
      subject: 'Tune the *Suggestions for you* selector',
    },
    {
      date: '2026-11-02',
      issues: ['425'],
      subject: 'Migrate `EventsSpecific` to `navbarAndFriends*`',
    },
    {
      date: '2026-11-01',
      issues: ['427'],
      subject: 'Update the <kbd><kbd>S</kbd></kbd>hare selector',
    },
    {
      date: '2026-11-01',
      issues: ['427'],
      subject: 'Update selectors and friends for the secondary scroller',
    },
    {
      date: '2026-11-01',
      issues: ['443'],
      subject: 'Acknowledge the **Manage events** page',
    },
    {
      date: '2026-11-01',
      issues: ['425'],
      subject: 'Migrate `InvitationManager` to `navbarAndFriends*`',
    },
    {
      date: '2026-11-01',
      issues: ['293'],
      subject: 'Migrate `SearchResultsPeople` to `nav.Scroller`',
    },
    {
      date: '2026-11-01',
      issues: ['255'],
      subject: 'Remove WIP items',
    },
    {
      date: '2026-10-31',
      issues: ['427'],
      subject: 'Update `uidCallback` for the primary scroller',
    },
    {
      date: '2026-10-31',
      issues: [''],
      subject: 'Add missing `logger.entered()`;',
    },
    {
      date: '2026-10-31',
      issues: ['427'],
      subject: 'Switch to the new common finder and process',
    },
    {
      date: '2026-10-31',
      issues: ['427'],
      subject: 'Update primary scroller selectors',
    },
    {
      date: '2026-10-31',
      issues: ['293'],
      subject: 'Normalize property names to plural *results*',
    },
    {
      date: '2026-10-31',
      issues: ['293'],
      subject: 'Normalize property names to *paginator*',
    },
    {
      date: '2026-10-31',
      issues: ['209'],
      subject: 'Factor out a reused selector',
    },
    {
      date: '2026-10-31',
      issues: ['425'],
      subject: 'Factor out the selector for finding the profile menu item',
    },
    {
      date: '2026-10-31',
      issues: ['424'],
      subject: 'Reimplement <kbd><kbd>X</kbd></kbd> toggle deleting' +
        ' notification',
    },
    {
      date: '2026-10-31',
      issues: ['416'],
      subject: 'Fine-tune the new Style-2 `#primaryNavSelector`',
    },
    {
      date: '2026-10-31',
      issues: ['255'],
      subject: 'Implement the <kbd><kbd>E</kbd></kbd>ngage shortcut',
    },
    {
      date: '2026-10-31',
      issues: ['437', '438', '439', '440'],
      subject: 'Acknowledge a number of new pages to support',
    },
    {
      date: '2026-10-30',
      issues: ['293'],
      subject: 'Migrate `EventsSpecific` to `nav.Scroller`',
    },
    {
      date: '2026-10-30',
      issues: ['293'],
      subject: 'Migrate `Notifications` to `nav.Scroller`',
    },
    {
      date: '2026-10-30',
      issues: ['427'],
      subject: 'Rename properties for consistency',
    },
    {
      date: '2026-10-30',
      issues: ['427'],
      subject: 'Mark **Events** as a Style-2 page and remove' +
        ' `readySelectorTimeout`',
    },
    {
      date: '2026-10-30',
      issues: ['425'],
      subject: 'Migrate most `readySelector`s to a shared value',
    },
    {
      date: '2026-10-30',
      issues: ['424'],
      subject: 'Document that a couple of features are going to take a bit',
    },
    {
      date: '2026-10-29',
      issues: ['436'],
      subject: 'Update **Profile**\'s `readySelector`',
    },
    {
      date: '2026-10-29',
      issues: ['293'],
      subject: 'Migrate `Profile` to `nav.Scroller`',
    },
    {
      date: '2026-10-29',
      issues: ['424', '425', '433'],
      subject: 'Factor out a common selector for the menu button' +
        ' and migrate others',
    },
    {
      date: '2026-10-29',
      issues: ['429'],
      subject: 'Only proceed if comment counts exist and non-zero',
    },
    {
      date: '2026-10-29',
      issues: ['429'],
      subject: 'Only process command when on a post',
    },
    {
      date: '2026-10-29',
      issues: [''],
      subject: 'Include the "Start a post" URL as part of **Feed**',
    },
    {
      date: '2026-10-29',
      issues: ['429'],
      subject: 'Defeat the new UI moving focus into the comment text box',
    },
    {
      date: '2026-10-28',
      issues: ['434'],
      subject: 'Make the *view reactions* selector more precise',
    },
    {
      date: '2026-10-28',
      issues: ['434'],
      subject: 'Update selector for the <kbd><kbd>P</kbd></kbd>ost feature',
    },
    {
      date: '2026-10-28',
      issues: ['434'],
      subject: 'Update selectors for multiple controls',
    },
    {
      date: '2026-10-28',
      issues: ['434'],
      subject: 'Retire *view reactions* as it no longer seems to be' +
        ' a feature',
    },
    {
      date: '2026-10-27',
      issues: ['429'],
      subject: 'Update <kbd><kbd>c</kbd></kbd>omment selectors',
    },
    {
      date: '2026-10-27',
      issues: ['432'],
      subject: 'Update selector to handle old/new names',
    },
    {
      date: '2026-10-27',
      issues: ['433'],
      subject: 'Update menu selector',
    },
    {
      date: '2026-10-27',
      issues: ['424'],
      subject: 'Make a selector `static`, fixing breakage from 536c6f20',
    },
    {
      date: '2026-10-27',
      issues: ['414'],
      subject: 'Use an optional chaining',
    },
    {
      date: '2026-10-27',
      issues: ['431'],
      subject: 'Update navbar icons to handle new names',
    },
    {
      date: '2026-10-26',
      issues: ['293'],
      subject: 'Migrate `JobsCollections` to `nav.Scroller`',
    },
    {
      date: '2026-10-26',
      issues: ['255'],
      subject: 'Implement secondary navigation',
    },
    {
      date: '2026-10-26',
      issues: ['255'],
      subject: 'Switch existing shortcuts to use `#lastScroller`',
    },
    {
      date: '2026-10-26',
      issues: ['255'],
      subject: 'Add placeholder for an <kbd><kbd>E</kbd></kbd>ngage item' +
        ' shortcut',
    },
    {
      date: '2026-10-26',
      issues: ['424'],
      subject: 'Factor out closing open menus for later reuse',
    },
    {
      date: '2026-10-26',
      issues: ['426'],
      subject: 'Update `#uidPostRE`',
    },
    {
      date: '2026-10-25',
      issues: ['255'],
      subject: 'Implement primary navigation',
    },
    {
      date: '2026-10-25',
      issues: ['255', '425'],
      subject: 'Implement reusable finder and processor',
    },
    {
      date: '2026-10-25',
      issues: ['425'],
      subject: 'Add Style-1 support for `LinkedIn.primaryNavSelector`',
    },
    {
      date: '2026-10-25',
      issues: ['428'],
      subject: 'Acknowledge the **Profile Viewers** page',
    },
    {
      date: '2026-10-25',
      issues: ['424'],
      subject: 'Factor out `waitForSelectorToBeGone()` for reuse',
    },
    {
      date: '2026-10-24',
      issues: ['293'],
      subject: 'Update to the latest `lib/nav` to grab the recursion fix',
    },
    {
      date: '2026-10-24',
      issues: ['381'],
      subject: 'Replace optional chaining accidentally dropped with 5c32fe5',
    },
    {
      date: '2026-10-23',
      issues: ['381'],
      subject: 'Combine some processing strategies',
    },
    {
      date: '2026-10-23',
      issues: ['381'],
      subject: 'Rename a couple of variables',
    },
    {
      date: '2026-10-22',
      issues: ['424'],
      subject: 'Update the selector for the hamburger menu',
    },
    {
      date: '2026-10-22',
      issues: ['424'],
      subject: 'Update some shortcut descriptions from "notification"' +
        ' to "item"',
    },
    {
      date: '2026-10-22',
      issues: ['313', '385', '424'],
      subject: 'Replace `ENTER` shortcut with native browser handling',
    },
    {
      date: '2026-10-22',
      issues: ['424'],
      subject: 'Update **Notifications**\' `readySelector`',
    },
    {
      date: '2026-10-22',
      issues: ['424'],
      subject: 'Update **Notifications**\' `uidCallback`',
    },
    {
      date: '2026-10-21',
      issues: ['424'],
      subject: 'Update **Notifications**\' default scroller placement',
    },
    {
      date: '2026-10-21',
      issues: ['313', '424'],
      subject: 'Update **Notifications**\' selectors and retire' +
        ' tablist shortcut',
    },
    {
      date: '2026-10-21',
      issues: ['424'],
      subject: 'Mark **Notifications** as a Style-2',
    },
    {
      date: '2026-10-21',
      issues: ['380'],
      subject: 'Move tablist handling from secondary to primary `Scroller`',
    },
    {
      date: '2026-10-21',
      issues: ['380'],
      subject: 'Focus on the current tab when tablist changes',
    },
    {
      date: '2026-10-21',
      issues: ['381'],
      subject: 'Create `#uidModeAnchors` and populate' +
        ' `#entriesUidModeSelector`',
    },
    {
      date: '2026-10-20',
      issues: ['380'],
      subject: 'Include the tablists when navigating various sections',
    },
    {
      date: '2026-10-20',
      issues: ['255'],
      subject: 'Initial support for **Analytics Search Appearances** page',
    },
    {
      date: '2026-10-20',
      issues: ['293'],
      subject: 'Migrate `Messaging` to `nav.Scroller`',
    },
    {
      date: '2026-10-20',
      issues: ['293', '421'],
      subject: 'Document skipping migration `JobsCollections` for the moment',
    },
    {
      date: '2026-10-20',
      issues: ['381'],
      subject: 'Factor out a query selector for later automated creation',
    },
    {
      date: '2026-10-20',
      issues: ['422'],
      subject: 'Acknowledge the **Jobs Search Results** page',
    },
    {
      date: '2026-10-19',
      issues: ['417'],
      subject: 'Add entry selector for a new section',
    },
    {
      date: '2026-10-19',
      issues: ['417'],
      subject: 'Update sections selector',
    },
    {
      date: '2026-10-19',
      issues: [''],
      subject: 'Update **Jobs View**\'s `readySelector`',
    },
    {
      date: '2026-10-19',
      issues: ['293'],
      subject: 'Migrate `JobsView` to `nav.Scroller`',
    },
    {
      date: '2026-10-19',
      issues: ['407'],
      subject: 'Update the selector for the *Causes* section',
    },
    {
      date: '2026-10-18',
      issues: ['253'],
      subject: 'Remove WIP items',
    },
    {
      date: '2026-10-18',
      issues: ['418'],
      subject: 'Acknowledge the **Manage Event** pages',
    },
    {
      date: '2026-10-18',
      issues: ['293'],
      subject: 'Migrate `Jobs` to `nav.Scroller`',
    },
    {
      date: '2026-10-18',
      issues: [''],
      subject: 'Another **Profile** partial ordering pair',
    },
    {
      date: '2026-10-18',
      issues: ['406'],
      subject: 'Update the selector and modes for the *Organizations*' +
        ' section',
    },
    {
      date: '2026-10-18',
      issues: ['405'],
      subject: 'Update the selector and modes for the *Languages* section',
    },
    {
      date: '2026-10-17',
      issues: ['293'],
      subject: 'Migrate `InvitationManager` to `nav.Scroller`',
    },
    {
      date: '2026-10-17',
      issues: ['253'],
      subject: 'Implement various shortcuts',
    },
    {
      date: '2026-10-17',
      issues: ['414'],
      subject: 'For Nav-V2 menus, use the *Profile* entry as the template',
    },
    {
      date: '2026-10-17',
      issues: ['414'],
      subject: 'Attempt to support Nav-V1 and Nav-V2 menus during transition',
    },
    {
      date: '2026-10-17',
      issues: ['414'],
      subject: 'Use the whole navbar, not just the list of items',
    },
    {
      date: '2026-10-17',
      issues: ['404'],
      subject: 'Update the selector for the *Test scores* section',
    },
    {
      date: '2026-10-17',
      issues: ['403'],
      subject: 'Update the selector and modes for the *Courses* section',
    },
    {
      date: '2026-10-16',
      issues: ['253'],
      subject: 'Initial support for **Manage Events** pages',
    },
    {
      date: '2026-10-15',
      issues: ['402'],
      subject: 'Update the selectors for the *Services* section',
    },
    {
      date: '2026-10-15',
      issues: ['401'],
      subject: 'Update the selector for the *Honors & awards* section',
    },
    {
      date: '2026-10-14',
      issues: ['392'],
      subject: 'Update selector for the *Self promotion* variant',
    },
    {
      date: '2026-10-14',
      issues: ['209'],
      subject: 'Remove WIP items',
    },
    {
      date: '2026-10-14',
      issues: ['400'],
      subject: 'Update the selector for the *Patents* section',
    },
    {
      date: '2026-10-14',
      issues: ['380', '399'],
      subject: 'Update the selector for the *Recommendations* section',
    },
    {
      date: '2026-10-13',
      issues: ['209'],
      subject: 'Implement <kbd><kbd>E</kbd></kbd>ngage as a way to interact' +
        ' with the current individual',
    },
    {
      date: '2026-10-13',
      issues: ['237'],
      subject: 'Change result selector from <kbd><kbd>a</kbd></kbd> to' +
        ' `[role="listitem"]`',
    },
    {
      date: '2026-10-13',
      issues: ['293'],
      subject: 'Migrate `MyNetwork` to `nav.Scroller`',
    },
    {
      date: '2026-10-13',
      issues: ['416'],
      subject: 'Log the page style hint for debugging',
    },
    {
      date: '2026-10-13',
      issues: ['398'],
      subject: 'Update the selector for the *Highlights* section',
    },
    {
      date: '2026-10-13',
      issues: ['397'],
      subject: 'Update the selector for the *Publications* section',
    },
    {
      date: '2026-10-12',
      issues: ['395'],
      subject: 'Update the selector for the *Skills* section',
    },
    {
      date: '2026-10-12',
      issues: ['394'],
      subject: 'Update the selector for the *Projects* section',
    },
    {
      date: '2026-10-12',
      issues: [''],
      subject: 'More partial ordering pairs for **Profile**',
    },
    {
      date: '2026-10-12',
      issues: ['237'],
      subject: 'Remove WIP items',
    },
    {
      date: '2026-10-12',
      issues: ['293'],
      subject: 'Migrate `Feed` to `nav.Scroller`',
    },
    {
      date: '2026-10-11',
      issues: ['414'],
      subject: 'Update `#guessPageStyle()` to detect Style-2/Nav2',
    },
    {
      date: '2026-10-11',
      issues: ['414'],
      subject: 'Update `gotoProfile()` to support the Style-2/Nav2 navbar',
    },
    {
      date: '2026-10-11',
      issues: ['414'],
      subject: 'Implement a new shortcut for the new navbar *Menu* item',
    },
    {
      date: '2026-10-11',
      issues: ['414'],
      subject: 'Implement `#gotoNavIcon()` as a way of identifying navbar' +
        ' targets',
    },
    {
      date: '2026-10-11',
      issues: ['414'],
      subject: 'Update `#gotoNavButton()` for the Nav2 navbar',
    },
    {
      date: '2026-10-11',
      issues: ['414'],
      subject: 'Update many `Go to` shortcuts to the new Style-2 navbar',
    },
    {
      date: '2026-10-11',
      issues: ['414'],
      subject: 'Add selector for the Style-2/Nav2 navbar',
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

    /* XXX: This class is going away, so not bothering with fixing. */
    /* eslint-disable no-shadow */

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

    /** @type {external:Element} */
    get container() {
      return this.#container;
    }

    /**
     * @typedef {object} TabEntry
     * @memberof module:linkedin-tool~TabbedUI~
     * @property {string} name - Tab name.
     * @property {external:Element} label - Tab label, so CSS can be applied.
     * @property {external:Element} panel - Tab panel, so content can be
     * updated.
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
     * @memberof module:linkedin-tool~TabbedUI~
     */

    /**
     * @typedef {object} TabDefinition
     * @memberof module:linkedin-tool~TabbedUI~
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

    /**
     * Installs basic CSS styles for the UI.
     *
     * @method
     */
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
          ' padding: unset;' +
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
     *
     * @method
     * @returns {Element[]} Control elements for the tabs.
     */
    #getTabControls = () => {
      const controls = Array.from(this.container.querySelectorAll(
        ':scope > input'
      ));
      return controls;
    }

    /**
     * Switch to an adjacent tab.
     *
     * @method
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
     * @method
     * @param {string} name - Human readable name for tab.
     * @param {string} idName - Normalized to be CSS class friendly.
     * @returns {external:Element} Input portion of the tab.
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
     * @method
     * @param {string} name - Human readable name for tab.
     * @param {external:Element} input - Input element associated with this
     * label.
     * @param {string} idName - Normalized to be CSS class friendly.
     * @returns {external:Element} Label portion of the tab.
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
     * @method
     * @param {string} name - Human readable name for tab.
     * @param {string} idName - Normalized to be CSS class friendly.
     * @param {TabContent} content - Initial content.
     * @returns {external:Element} Panel portion of the tab.
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
     *
     * @method
     * @param {external:Element} panel - The panel associated with this tab.
     * @param {Event} evt - The original change event.
     * @fires Event#expose
     */
    #onChange = (panel, evt) => {
      const me = 'onChange';
      this.#log.entered(me, evt, panel);

      panel.dispatchEvent(new Event('expose'));

      this.#log.leaving(me);
    }

    /**
     * Installs navigational control elements.
     *
     * @method
     */
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
   * A table with collapsible sections.
   *
   * @extends NexusHoratio.widget.Widget
   */
  class AccordionTableWidget extends NH.widget.Widget {

    /** @param {string} instanceName - Name for this instance. */
    constructor(instanceName) {
      super(instanceName, 'table');
      this.logger.log(`${this.name} constructed`);
    }

    /**
     * This becomes the current section.
     * @param {string} section - Name of the new section.
     * @returns {external:Element} The new section.
     */
    addSection(section) {
      this.#currentSection = document.createElement('tbody');
      this.#currentSection.id = NH.base.safeId(`${this.id}-${section}`);
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
     *
     * @method
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
   * @extends Function
   */
  class Shortcut extends Function {

    /**
     * Wrap a function.
     * @param {string} seq - Key sequence to activate this function.
     * @param {string} desc - Human readable documentation about this
     * function.
     * @param {NexusHoratio.web~SimpleFunction} func - Function to wrap,
     * usually in the form of an arrow function.  Keep JS `this` magic in
     * mind!
     */
    constructor(seq, desc, func) {
      super('return this.wrapper();');
      const myself = this.bind(this);
      myself.seq = seq;
      myself.desc = desc;
      this.func = func;
      return myself;
    }

    wrapper = () => {
      try {
        this.func();
      } catch (e) {
        const output = [
          `${this.constructor.name} caught error:`,
          e.message,
        ];
        if (e.cause) {
          output.push(e.cause);
        }
        NH.base.issues.post(...output);
      }
    }

  }

  /**
   * @external VMShortcuts
   * @see {@link https://violentmonkey.github.io/guide/keyboard-shortcuts/}
   */

  /**
   * Integrates {@link external:VMShortcuts} with {@link
   * module:linkedin-tool~Shortcut Shortcut}s.
   *
   * Instances of classes that have {@link module:linkedin-tool~Shortcut
   * Shortcut} properties on them can be added and removed to each instance of
   * this service.  The shortcuts will be enabled/disabled as the service is
   * activated/deactivated.  This can allow each service to have different
   * groups of shortcuts present.
   *
   * All Shortcuts tie into {@link external:VMShortcuts}'s conditions.  These
   * conditions are added once during instantiation and default to
   * '!inputFocus'.
   *
   * The built in handler for browser `focus` events to update 'inputFocus'
   * can be enabled by executing:
   *
   * @example
   * VMKeyboardService.start();
   *
   * @extends NexusHoratio.base.Service
   */
  class VMKeyboardService extends NH.base.Service {

    /** @inheritdoc */
    constructor(instanceName) {
      super(instanceName);
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

    // eslint-disable-next-line require-jsdoc
    static set condition(val) {
      this.#shortcutOptions.condition = val;
    }

    /** @type {Set<module:linkedin-tool~VMKeyboardService>} */
    static get services() {
      return new Set(this.#services.values());
    }

    /** Add listener. */
    static start() {
      this.#listenForFocus(document);
    }

    /** Remove listener. */
    static stop() {
      for (const el of this.#listenForFocusElements.values()) {
        el.removeEventListener('focus', this.#onFocus, this.#focusOption);
      }
    }

    /**
     * Set the keyboard context to a specific value.
     *
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
     * Parse a {@link module:linkedin-tool~Shortcut#seq Shortcut#seq} and wrap
     * it in HTML.
     *
     * @example
     * 'a c-b' ->
     *   '<kbd><kbd>a</kbd> then <kbd>Ctrl</kbd> + <kbd>b</kbd></kbd>'
     * @param {module:linkedin-tool~Shortcut#seq} seq - Keystroke sequence.
     * @returns {string} Appropriately wrapped HTML.
     */
    static parseSeq(seq) {

      /**
       * Convert a VM.shortcut style into an HTML snippet.
       *
       * @param {IShortcutKey} key - A particular key press.
       * @returns {string} HTML snippet.
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

    /** @type {module:linkedin-tool~Shortcut[]} */
    get shortcuts() {
      return this.#shortcuts;
    }

    /**
     * @param {object} instance - Object with {@link
     * module:linkedin-tool~Shortcut Shortcut} properties.
     * @returns {module:linkedin-tool~VMKeyboardService} This instance, for
     * chaining.
     */
    addInstance(instance) {
      const me = this.addInstance.name;
      this.logger.entered(me, instance);

      if (this.#keyboards.has(instance)) {
        this.logger.log('Already registered');
      } else {
        const keyboard = new VM.shortcut.KeyboardService();
        for (const [key, value] of Object.entries(instance)) {
          if (value instanceof Shortcut) {
            // While we are here, give the function a name.
            Object.defineProperty(value, 'name', {value: key});
            keyboard.register(
              value.seq, value, VMKeyboardService.#shortcutOptions
            );
          }
        }
        this.#keyboards.set(instance, keyboard);
        this.#rebuildShortcuts();
      }

      this.logger.leaving(me);
      return this;
    }

    /**
     * @param {object} instance - Object with {@link
     * module:linkedin-tool~Shortcut Shortcut} properties.
     * @returns {module:linkedin-tool~VMKeyboardService} This instance, for
     * chaining.
     */
    removeInstance(instance) {
      const me = this.removeInstance.name;
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
      return this;
    }

    static #focusOption = {
      capture: true,
    };

    static #lastFocusedElement = null;
    static #listenForFocusElements = new Set();
    static #services = new Set();

    /**
     * Initial options for all shortcuts.
     *
     * @type {VM.shortcut.IShortcutOptions}
     */
    static #shortcutOptions = {
      condition: '!inputFocus',
      caseSensitive: true,
    };

    /**
     * @method
     * @param {external:Element} element - Element that gets a listener.
     */
    static #listenForFocus = (element) => {
      this.#listenForFocusElements.add(element);
      element.addEventListener('focus', this.#onFocus, this.#focusOption);
    }

    /**
     * Handle focus event to determine if shortcuts should be disabled.
     *
     * @method
     * @param {Event} evt - Standard 'focus' event.
     */
    static #onFocus = (evt) => {
      let target = evt.target;
      for (
        let shadow = null;
        (shadow = target.shadowRoot ?? null) !== null;
      ) {
        this.#listenForFocus(shadow);
        target = shadow.activeElement;
      }
      if (this.#lastFocusedElement &&
          target !== this.#lastFocusedElement) {
        this.#lastFocusedElement = null;
        this.setKeyboardContext('inputFocus', false);
      }
      if (NH.web.isInput(target)) {
        this.setKeyboardContext('inputFocus', true);
        this.#lastFocusedElement = target;
      }
    }

    #active = false;
    #keyboards = new Map();
    #shortcuts = [];

    #onActivate = () => {
      for (const keyboard of this.#keyboards.values()) {
        keyboard.enable();
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

    static { this.register(); }

  }
  /* eslint-enable */

  /**
   * LinkedIn specific information.
   *
   * @extends NexusHoratio.spa.Details
   */
  class LinkedIn extends NH.spa.Details {

    /** @hideconstructor */
    constructor() {
      super();
      this.#navbarMutationObserver = new MutationObserver(
        this.#navbarHandler
      );
      this.#navbarResizeObserver = new ResizeObserver(
        this.#navbarHandler
      );
      this.ready = this.#waitUntilPageLoadedEnough();

      this.#licenseElement = document.createElement('p');
      this.#licenseElement.innerHTML = '<i>Loading license...</i>';

      // The default reprString wraps in double-quotes.
      this.#typeTool.addReprFunc('String', x => x);

      this.dispatcher.on('initialize', this.#onInit);

      if (litOptions.enableAlertUnsupportedPages) {
        this.dispatcher.on('activated', this.#onActivateUnsupportedPageCheck);
      }
    }

    static errorMarker = '---';

    /**
     * LinkedIn's common aside used in many layouts.
     *
     * @type {string}
     */
    static get asideSelector() {
      return this.#asideSelector;
    }

    /**
     * LinkedIn's common floating menu.
     *
     * @type {string}
     */
    static get floatingUiPortalSelector() {
      return this.#floatingUiPortalSelector;
    }

    /**
     * LinkedIn's common menu selectors.
     *
     * @type {string[]}
     */
    static get menuSelectorArray() {
      return this.#menuSelectorArray;
    }

    /**
     * LinkedIn's profile in the navbar.
     *
     * @type {string}
     */
    static get navbarProfileItemSelector() {
      return this.#navbarProfileItemSelector;
    }

    /**
     * LinkedIn's common page ready selector.
     *
     * @type {string}
     */
    static get pageReadySelector() {
      return this.#pageReadySelector;
    }

    /**
     * LinkedIn's primary content for many layouts.
     *
     * @type {string}
     */
    static get primaryContentSelector() {
      return this.#primaryContentSelectorString;
    }

    /**
     * LinkedIn's common navigation bar.
     *
     * @type {string}
     */
    static get primaryNavSelector() {
      return this.#primaryNavSelector;
    }

    /**
     * CSS class name common for primary scrollers.
     *
     * @type {string}
     */
    static get scrollerPrimaryClassName() {
      return this.#scrollerPrimaryClassName;
    }

    /**
     * CSS class name common for secondary scrollers.
     *
     * @type {string}
     */
    static get scrollerSecondaryClassName() {
      return this.#scrollerSecondaryClassName;
    }

    /**
     * LinkedIn's primary content for many layouts (:is(...) variant).
     *
     * @type {string}
     */
    static get selectorIsPrimaryContent() {
      return `:is(${this.#primaryContentSelectorString})`;
    }

    /**
     * LinkedIn's common sidebar used in many layouts.
     *
     * @type {string}
     */
    static get sidebarSelector() {
      return this.#sidebarSelector;
    }

    /**
     * @returns {TabbedUI~TabDefinition} Where to find documentation and
     * file bugs.
     */
    static aboutTab() {
      const issuesLink = this.#ghUrl('labels/linkedin-tool');
      const newIssueLink = this.#ghIssue('new/choose');
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

      return tab;
    }

    /**
     * @param {string} variant - Migration text, one of `spa` or `lit`.
     * @returns {TabbedUI~TabDefinition} Initial placeholder for error
     * logging.
     */
    static errorTab(variant) {
      return {
        name: 'Errors',
        content: [
          '<p>Any information in the text box below could be helpful in ' +
            'fixing a bug.</p>',
          '<p>The content can be edited and then included in a bug ' +
            'report.  Different errors should be separated by ' +
            `"${this.errorMarker}".</p>`,
          '<p><b>Please remove any identifying information before ' +
            'including it in a bug report!</b></p>',
          this.errorPlatformInfo(),
          `<textarea data-${variant}-id="errors" spellcheck="false" ` +
            'placeholder="No errors logged yet."></textarea>',
        ].join(''),
      };
    }

    /**
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    static ckeyIdentifier(element) {
      const me = LinkedIn.ckeyIdentifier.name;
      this.logger?.entered(me, element);

      const content = element?.getAttribute(CKEY);

      this.logger?.leaving(me, content);
      return content;
    }

    /**
     * Generate information about the current environment useful in bug
     * reports.
     * @returns {string} Text with some wrapped in a `pre` element.
     */
    static errorPlatformInfo() {
      const header = 'Please consider including some of the following ' +
            'information in any bug report:';

      const msgs = NH.userscript.environmentData();
      msgs.push('Other libraries:', ` VM.shortcut: ${VM.shortcut.version}`);

      return `${header}<pre>${msgs.join('\n')}</pre>`;
    }

    /**
     * Combine text from child headers.
     *
     * @param {external:Element} element - Element to examine.
     * @param {number} level - Header level to use.
     * @returns {string} Combined header text.
     */
    static hN(element, level) {
      return element.querySelectorAll(`h${level}`)
        .values()
        .map(x => x.innerText.trim())
        .toArray()
        .join('; ');
    }

    /**
     * Combine text from child headers.
     *
     * @param {external:Element} element - Element to examine.
     * @returns {string} Combined header text.
     */
    static h1(element) {
      const level = 1;
      return this.hN(element, level);
    }

    /**
     * Combine text from child headers.
     *
     * @param {external:Element} element - Element to examine.
     * @returns {string} Combined header text.
     */
    static h2(element) {
      const level = 2;
      return this.hN(element, level);
    }

    urlChangeMonitorSelector = 'html';

    /** @type {NexusHoratio.base.Dispatcher} */
    get dispatcher2() {
      return this.#dispatcher;
    }

    /**
     * @typedef {object} LicenseData
     * @memberof module:linkedin-tool~LinkedIn~
     * @property {string} id - SPDX id for the license.
     * @property {string} url - License URL.
     * @property {string?} content - Fallback content.
     */

    /** @type {module:linkedin-tool~LinkedIn~LicenseData} */
    get licenseData() {
      const me = 'get licenseData';
      this.logger.entered(me);

      if (!this.#licenseData) {
        try {
          this.#licenseData = NH.userscript.licenseData();
        } catch (e) {
          NH.base.issues.post(e.message);
          this.#licenseData = {
            id: e.case?.code.reason ?? 'Unknown',
            url: '',
            content: 'Unable to extract license data from the' +
              ' userscript: Please file a bug.',
          };
        }
      }

      this.logger.leaving(me, this.#licenseData);
      return this.#licenseData;
    }

    /** @type {external:Element} */
    get navbar() {
      return this.#navbar;
    }

    /** @type {module:linkedin-tool~LinkedIn.Style} */
    get pageStyle() {
      return this.#pageStyle;
    }

    /** @type {boolean} */
    get registrationComplete() {
      return this.#registrationComplete;
    }

    // eslint-disable-next-line require-jsdoc
    set registrationComplete(val) {
      this.#registrationComplete = Boolean(val);
    }

    /**
     * Scroll common sidebar into view and move focus to it.
     *
     * @method
     */
    focusOnSidebar = () => {
      const sidebar = document.querySelector(LinkedIn.sidebarSelector);
      if (sidebar) {
        NH.web.focusOnTree(sidebar);
      }
    }

    /**
     * Scroll common aside (right-hand sidebar) into view and move focus to
     * it.
     *
     * @method
     */
    focusOnAside = () => {
      const aside = document.querySelector(LinkedIn.asideSelector);
      if (aside) {
        NH.web.focusOnTree(aside);
      }
    }

    /** @returns {TabbedUI~TabDefinition} News information. */
    newsTab() {  // eslint-disable-line max-lines-per-function, max-statements
      const me = this.newsTab.name;
      this.logger.entered(me);

      const {dates, knownIssues} = this.#preprocessKnownIssues();

      const reader = new commonmark.Parser();
      const writer = new commonmark.HtmlRenderer();

      const content = [
        'This is a manually curated list of changes over the last' +
          ' month or so that:',
        '',
        '* Added new features like support for new pages or more hotkeys',
        '* Explicitly fixed a bug',
        '* May cause a user noticeable change',
        '',
        'See the **About** tab for instructions on' +
          ' finding all changes by release.',
        '<div>',
        ' <input type="checkbox" id="lit-news-read-toggle"/>',
        ' <label for="lit-news-read-toggle">Mark news as read.</label>',
        '</div>',
        '',
        '---',
      ];

      const dateHeader = '###';
      const issueHeader = '####';

      for (const [date, items] of dates) {
        content.push(`${dateHeader} ${date}`);
        for (const [issue, subjects] of items) {
          const ki = knownIssues.get(issue);
          let title = ki.title;
          if (issue) {
            const link = this.constructor.#ghIssue(issue);
            title = `[${title}](${link})`;
          }
          content.push(
            `${issueHeader} ${title}`
          );
          for (const subject of subjects) {
            content.push(`* ${subject}`);
          }
          content.push('');
        }
        content.push('---');
      }

      const tab = {
        name: 'News',
        content: writer.render(reader.parse(content.join('\n'))),
      };

      this.#newsHash = NH.base.strHash(tab.content);

      this.logger.leaving(me);
      return tab;
    }

    /**
     * @returns {TabbedUI~TabDefinition} License information.
     */
    licenseTab() {
      const me = this.licenseTab.name;
      this.logger.entered(me);

      const {id, url} = this.licenseData;
      const tab = {
        name: 'License',
        content: `<p><a href="${url}">${id}</a></p>`,
      };

      this.logger.leaving(me, tab);
      return tab;
    }

    static #FetchState = {
      EMPTY: Symbol.for('Empty'),
      FETCHING: Symbol.for('Fetching'),
      FETCHED: Symbol.for('Fetched'),
    }

    static {
      Object.freeze(LinkedIn.#FetchState);
    }

    static #asideSelector = [
      // Style 1
      'aside.scaffold-layout__aside',
      // Style 2
      '#workspace > div > div > section + aside',
      // Style 2.1
      '#workspace > div > div:not(:has(> section))' +
        ' > div > div > div > div + div',
    ].join(', ');

    static #floatingUiPortalSelector = '[data-floating-ui-portal]';
    static #icon =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"' +
      ' fill="currentColor"' +
      ' viewBox="0 0 24 24" data-supported-dps="24x24">' +
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

    static #menuSelectorArray = [

      /**
       * @todo [(#436)](https://github.com/nexushoratio/userscripts/issues/436)
       * Retire `overflow` after a while.
       */
      ':has(> * > svg[id^="overflow"]',
      ':has(> * > svg[id^="ellipses"]',
    ];

    static #navbarProfileItemSelector = '#meMenuV2WideComponentRef';
    static #pageReadySelector = [
      // Style 1
      'footer.global-footer-compact',
      // Style 2
      '#linkedin-logo-xxsmall',
    ].join(', ');

    static #primaryContentSelectorArray = [
      // Style 1 (WIP?)
      '.scaffold-layout main',
      // Style 2
      '#workspace > div > div > section',
      // Style 2.1
      '#workspace > div > div:not(:has(> section))' +
        ' > div > div > div > div',
    ];

    static #primaryContentSelectorString = this.#primaryContentSelectorArray
      .join(', ');

    static #primaryNavSelector = [
      // Style 1
      '#global-nav',
      // Style 2
      /**
       * @todo [(#414)](https://github.com/nexushoratio/userscripts/issues/414)
       * Retire `primaryNavLinksComponentRef`
       */
      `[${CKEY}="primaryNavLinksComponentRef"] nav > ul`,
      // #dialog-header is an ad container
      '#root header:not(#dialog-header)',
    ].join(', ');

    static #scrollerPrimaryClassName = 'lit-scroller-primary';
    static #scrollerSecondaryClassName = 'lit-scroller-secondary';

    static #sidebarSelector = [
      // Style 1
      'aside.scaffold-layout__sidebar',
      // Style 2
      '#workspace > div > div > aside:has(+ section)',
    ].join(', ');

    /**
     * Create a Greasy Fork project URL.
     *
     * @method
     * @param {string} path - Portion of the URL.
     * @returns {string} Full URL.
     */
    static #gfUrl = (path) => {
      const base = 'https://greasyfork.org/en/scripts/472097-linkedin-tool';
      const url = `${base}/${path}`;
      return url;
    }

    /**
     * Create a GitHub project URL.
     *
     * @method
     * @param {string} path - Portion of the URL.
     * @returns {string} Full URL.
     */
    static #ghUrl = (path) => {
      const base = 'https://github.com/nexushoratio/userscripts';
      const url = `${base}/${path}`;
      return url;
    }

    /**
     * Create a GitHub issue URL.
     *
     * @method
     * @param {string} issue - Issue portion of the URL.
     * @returns {string} Full URL.
     */
    static #ghIssue = (issue) => {
      const url = this.#ghUrl(`issues/${issue}`);
      return url;
    }

    #badgeErrorResultsStyle2
    #badgeErrorStyle1
    #badgeErrorStyle2
    #badgeNewsResultsStyle2
    #badgeNewsStyle1
    #badgeNewsStyle2
    #dispatcher = new NH.base.Dispatcher('errors', 'news');
    #errorText
    #globals
    #iframeDoc
    #infoKeyboard
    #infoTabs
    #infoWidget
    #licenseData
    #licenseElement
    #licenseState = LinkedIn.#FetchState.EMPTY;
    #navbar
    #navbarMutationObserver
    #navbarResizeObserver
    #newsHash
    #newsQueue = new NH.base.MessageQueue();
    #newsReadToggle
    #ourMenuItemStyle1
    #ourMenuItemStyle2
    #pageStyle
    #registrationComplete = false;
    #shortcutsWidget
    #typeTool = new NH.xunit.TypeTool();

    #onInit = () => {
      const me = this.#onInit.name;
      this.logger.entered(me);

      this.#checkForNews();

      this.#infoTabs.tabs
        .get('License').panel
        .addEventListener('expose', this.#licenseHandler);

      VMKeyboardService.condition = '!inputFocus && !inDialog';
      VMKeyboardService.start();

      this.logger.leaving(me);
    }

    /**
     * @method
     * @implements {NexusHoratio.base.Dispatcher~Handler}
     * @param {string} type - Event type.
     * @param {NexusHoratio.spa.Page~Pages} pages - Updated pages information.
     */
    #onActivateUnsupportedPageCheck = (type, pages) => {
      const me = this.#onActivateUnsupportedPageCheck.name;
      this.logger.entered(me, type);

      const ignoredPathname = (/.*/u).toString();
      const filtered = pages.active.values()
        .filter(x => x.pathname.toString() !== ignoredPathname)
        .map(x => x.pathname)
        .toArray();

      if (!filtered.length && this.registrationComplete) {
        NH.base.issues.post('Unsupported page:', window.location);
      }

      this.logger.leaving(me);
    }

    #checkForNews = () => {
      const me = this.#checkForNews.name;
      this.logger.entered(me);

      if (this.#newsHash) {
        const prev = litOptions.latestNewsRead;
        const news = this.#newsHash !== prev;

        this.#newsQueue.post(news);
        this.#newsReadToggle.checked = !news;
      }

      this.logger.leaving(me);
    }

    /**
     * @method
     * @param {external:Element} element - Starting element to avoid another
     * query.
     * @returns {module:linkedin-tool~LinkedIn.Style} Guessed style.
     */
    #guessPageStyle = (element) => {
      const me = this.#guessPageStyle.name;
      this.logger.entered(me, element);

      const hint = element.closest('[id]').id;
      this.logger.log('hint', hint);
      let pageStyle = null;

      /**
       * @todo [(#414)](https://github.com/nexushoratio/userscripts/issues/414)
       * Retire `primaryNavLinksComponentRef`
       */
      switch (hint) {
        case 'global-nav':
          pageStyle = LinkedIn.Style.ONE;
          break;
        case 'primaryNavLinksComponentRef':
        case 'root':
          pageStyle = LinkedIn.Style.TWO;
          break;
        default:
          pageStyle = LinkedIn.Style.UNKNOWN;
      }

      this.logger.leaving(me, pageStyle);
      return pageStyle;
    }

    /**
     * Hang out until the navigation bar has stabilized.
     *
     * @method
     */
    #waitUntilPageLoadedEnough = async () => {
      const me = this.#waitUntilPageLoadedEnough.name;
      this.logger.entered(me);

      // Wait for page to hopefully settle.
      await NH.web.waitForSelector(
        `${LinkedIn.primaryNavSelector} svg`
      );

      this.#finishConstruction();

      this.logger.leaving(me);
    }

    /**
     * Do the bits that were waiting on the page.
     *
     * @method
     */
    #finishConstruction = () => {
      const me = this.#finishConstruction.name;
      this.logger.entered(me);

      this.#createInfoWidget();
      this.#addInfoTabs();
      this.#addLitStyle();
      this.#findNavbar();

      this.logger.leaving(me);
    }

    #newsReadToggleHandler = () => {
      const me = this.#newsReadToggleHandler.name;
      this.logger.entered(me, this.#newsReadToggle.checked);

      const newsRead = this.#newsReadToggle.checked;

      this.#newsQueue.post(!newsRead);
      if (newsRead) {
        litOptions.latestNewsRead = this.#newsHash;
      } else {
        litOptions.latestNewsRead = 'marked-unread';
      }
      saveOptions(litOptions);

      this.logger.leaving(me);
    }

    #licenseUpdateTabs = () => {
      const me = this.#licenseUpdateTabs.name;
      this.logger.entered(me);

      const litPanel = this.#infoTabs.tabs.get('License').panel;

      litPanel.replaceChildren(this.#licenseElement.cloneNode(true));

      this.logger.leaving(me);
    }

    /**
     * @typedef {object} FetchResult
     * @memberof module:linkedin-tool~LinkedIn~
     * @property {boolean} fetched - Indicates if a useful result was
     * generated; all right to retry if false.
     * @property {string} spdx - The SPDX id.
     * @property {string} content - HTML content to be rendered.
     */

    /**
     * @method
     * @returns {module:linkedin-tool~LinkedIn~FetchResult} Summary of the
     * fetch.
     */
    #licenseFetch = async () => {
      const url = this.licenseData.url;
      const result = {
        fetched: false,
        spdx: this.licenseData.id,
      };
      if (url) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            result.content = await response.text();
            result.fetched = true;
          } else {
            if (response.statusText) {
              result.content = response.statusText;
            } else {
              result.content =
                `License fetch failed with: ${response.status}`;
            }
            result.fetched = true;
          }
        } catch (e) {
          result.content = e.message;
          result.fetched = true;
        }
      } else {
        result.fetched = true;
        result.content = this.licenseData.content;
      }
      return result;
    }

    /**
     * Lazily load license text when exposed.
     *
     * @method
     */
    #licenseHandler = async () => {
      const me = this.#licenseHandler.name;
      this.logger.entered(me, this.#licenseState);

      if (this.#licenseState === LinkedIn.#FetchState.EMPTY) {

        this.#licenseUpdateTabs();

        this.#licenseState = LinkedIn.#FetchState.FETCHING;
        const result = await this.#licenseFetch();
        if (result.fetched) {
          const license = document.createElement('iframe');
          license.style.flexGrow = 1;
          license.title = result.spdx;
          license.sandbox = '';
          license.srcdoc = result.content;
          this.#licenseElement = license;
          this.#licenseUpdateTabs();
          this.#licenseState = LinkedIn.#FetchState.FETCHED;
        } else {
          this.#licenseState = LinkedIn.#FetchState.EMPTY;
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
     * @method
     * @param {string} dismissId - Element #id to give dismiss button.
     * @returns {external:Element} For the info widget name header.
     */
    #infoName = (dismissId) => {
      const nameElement = document.createElement('div');
      nameElement.classList.add('lit-justify');
      const title = `<b>${APP_LONG}</b> - v${GM.info.script.version}`;
      const dismiss = `<button id=${dismissId}>X</button>`;
      nameElement.innerHTML = `<span>${title}</span><span>${dismiss}</span>`;

      return nameElement;
    }

    /**
     * @method
     * @returns {external:Element} Instructions for navigating the info
     * widget.
     */
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

    /**
     * Force any 'focus' handlers to run.
     *
     * @method
     */
    #forceFocusEvent = () => {
      document.activeElement.dispatchEvent(new Event('focus'));
    }

    #onCloseInfo = () => {
      this.#infoKeyboard.disable();
      VMKeyboardService.setKeyboardContext('inDialog', false);
      // Force this to run on the next event loop.
      setTimeout(this.#forceFocusEvent, 0);
      this.logger.log('info closed');
    }

    /**
     * Create CSS styles for stuff specific to LinkedIn Tool.
     *
     * @method
     */
    #addLitStyle = () => {  // eslint-disable-line max-lines-per-function
      const style = document.createElement('style');
      style.id = `${this.id}-style`;
      const styles = [
        ':root {' +
          ' --lit-color-positive: #01754f;' +
          ' --lit-color-negative: #cb112d;' +
          '}',
        '.lit-positive {' +
          ' color: white;' +
          ' background-color: var(--lit-color-positive);' +
          '}',
        '.lit-negative {' +
          ' background-color: var(--lit-color-negative);' +
          '}',
        `.${LinkedIn.scrollerPrimaryClassName} {` +
          ' border-color: orange !important;' +
          ' border-style: solid !important;' +
          ' border-width: medium !important;' +
          ' scroll-margin-bottom: 3em;' +
          '}',
        `.${LinkedIn.scrollerSecondaryClassName} {` +
          ' border-color: red !important;' +
          ' border-style: solid !important;' +
          ' border-width: thin !important;' +
          ' scroll-margin-bottom: 3em;' +
          '}',
        '.lit-info:modal {' +
          ' height: 100%;' +
          ' width: 65rem;' +
          ' font-size: 1.6rem;' +
          ' line-height: 1.5em;' +
          ' display: flex;' +
          ' flex-direction: column;' +
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
        '.lit-info button {' +
          ' border-width: 1px;' +
          ' border-style: solid;' +
          ' border-radius: 1em;' +
          ' padding: 3px;' +
          '}',
        '.lit-info code {' +
          ' background-color: ButtonFace;' +
          ' font-family: monospace;' +
          '}',
        '.lit-info input {' +
          ' opacity: unset !important;' +
          '}',
        '.lit-info kbd > kbd {' +
          ' font-size: 0.85em;' +
          ' padding: 0.07em;' +
          ' border-width: 1px;' +
          ' border-style: solid;' +
          '}',
        '.lit-info p {' +
          ' margin-bottom: 1em;' +
          '}',
        '.lit-info ul {' +
          ' list-style: unset;' +
          ' padding-inline: revert;' +
          '}',
        '.lit-info th {' +
          ' padding-top: 1em;' +
          ' text-align: left;' +
          '}',
        '.lit-info td:first-child {' +
          ' white-space: nowrap;' +
          ' text-align: right;' +
          ' padding-right: 0.5em;' +
          '}',
        '.lit-info textarea[data-lit-id="errors"] {' +
          ' flex-grow: 1;' +
          ' resize: none;' +
          '}',
        '.lit-kbd-service-active th {' +
          ' background-color: lightgray;' +
          '}',
        '.lit-menu-badge-news-style1 {' +
          ' top: 1.35rem !important;' +
          ' --color-alert: var(--lit-color-positive) !important;' +
          '}',
        '.lit-menu-badge-news-style2 {' +
          ' align-items: center;' +
          ' background-color: var(--lit-color-positive);' +
          ' border-radius: 1.2rem;' +
          ' color-scheme: light;' +
          ' color: white;' +
          ' display: flex;' +
          ' font-size: 1.2rem;' +
          ' font-weight: 600;' +
          ' height: 1.6rem;' +
          ' inset-block-start: -0.2rem;' +
          ' inset-inline-start: 100%;' +
          ' justify-content: center;' +
          ' margin-inline-start: -0.8rem;' +
          ' min-width: 1.6rem;' +
          ' padding-inline-end: 0.4rem;' +
          ' padding-inline-start: 0.4rem;' +
          ' position: absolute;' +
          ' top: 1.6rem;' +
          ' z-index: 100;' +
          '}',
        '.lit-menu-badge-news-style2::after {' +
          ' background: white;' +
          ' border-radius: 50%;' +
          ' content: "";' +
          ' height: 0.6rem;' +
          ' width: 0.6rem;' +
          '}',
        '.lit-menu-badge-error {' +
          ' align-items: center;' +
          ' background-color: var(--lit-color-negative);' +
          ' border-radius: 1.2rem;' +
          ' color-scheme: light;' +
          ' color: white;' +
          ' display: flex;' +
          ' font-size: 1.2rem;' +
          ' font-weight: 600;' +
          ' height: 1.6rem;' +
          ' inset-block-end: 1.8rem;' +
          ' inset-block-start: -0.2rem;' +
          ' inset-inline-start: 100%;' +
          ' justify-content: center;' +
          ' margin-inline-start: -0.8rem;' +
          ' min-width: 1.6rem;' +
          ' padding-inline-end: 0.4rem;' +
          ' padding-inline-start: 0.4rem;' +
          ' position: absolute;' +
          ' width: fit-content;' +
          ' z-index: 100;' +
          '}',
        // Get rid of the donut
        '.lit-menu-badge-error::after {' +
          ' content: none !important;' +
          '}',
        '.lit-menu-badge-hide {' +
          ' opacity: 0;' +
          '}',
      ];
      style.textContent = styles.join('\n');
      document.head.append(style);
    }

    /**
     * Update Errors tab label based upon value.
     *
     * @method
     * @param {number} count - Number of errors currently logged.
     */
    #updateInfoErrorsLabel = (count) => {
      const me = this.#updateInfoErrorsLabel.name;
      this.logger.entered(me, count);

      const label = this.#infoTabs.tabs.get('Errors').label;
      if (count) {
        this.#infoTabs.goto('Errors');
        label.classList.add('lit-negative');
      } else {
        label.classList.remove('lit-negative');
      }

      this.logger.leaving(me);
    }

    /**
     * @method
     * @param {Event} evt - The 'change' event.
     */
    #errorTextHandler = (evt) => {
      const me = this.#errorTextHandler.name;
      this.logger.entered(me, evt);

      const count = evt.target.value
        .split('\n')
        .filter(x => x === LinkedIn.errorMarker).length;
      this.dispatcher2.fire('errors', count);
      this.#updateInfoErrorsLabel(count);

      this.logger.leaving(me);
    }

    #addInfoTabsHandlers = () => {
      const me = this.#addInfoTabsHandlers.name;
      this.logger.entered(me);

      this.#infoKeyboard.register('c-right', this.#nextTab);
      this.#infoKeyboard.register('c-left', this.#prevTab);

      this.#newsReadToggle = document.querySelector('#lit-news-read-toggle');
      this.#newsReadToggle.addEventListener(
        'change', this.#newsReadToggleHandler
      );
      this.#newsQueue.listen(this.#newsListener);

      this.#errorText = document.querySelector('[data-lit-id="errors"]');
      this.#errorText.addEventListener('change', this.#errorTextHandler);
      issuesForLinkedIn.listen(this.#issueListener);

      this.logger.leaving(me);
    }

    #addInfoTabs = () => {
      const me = this.#addInfoTabs.name;
      this.logger.entered(me);

      const tabs = [
        this.#shortcutsTab(),
        LinkedIn.aboutTab(),
        this.newsTab(),
        LinkedIn.errorTab('lit'),
        this.licenseTab(),
      ];

      this.#infoTabs = new TabbedUI(APP_LONG);

      for (const tab of tabs) {
        this.#infoTabs.addTab(tab);
      }
      this.#infoTabs.goto(tabs[0].name);

      this.#infoWidget.container.append(this.#infoTabs.container);

      this.#addInfoTabsHandlers();

      this.logger.leaving(me);
    }

    #nextTab = () => {
      this.#infoTabs.next();
    }

    #prevTab = () => {
      this.#infoTabs.prev();
    }

    #toolButtonHandler = () => {
      this.#infoWidget.open();
    }

    /**
     * Determine the style property differences between two elements.
     *
     * @method
     * @param {external:Element} el1 - The first element.
     * @param {external:Element} el2 - The second element.
     * @param {Set<string>} ignore - A collection of style properties to
     * ignore.
     * @returns {string[]} Style properties present in the first, but not
     * the second element, formatted to add to this source file.
     */
    #findMissingStyleProperties = (el1, el2, ignore) => {
      const me = this.#findMissingStyleProperties.name;
      this.logger.entered(me, el1, el2, ignore);

      const missing = new Map();
      const styles1 = getComputedStyle(el1);
      const styles2 = getComputedStyle(el2);
      const set1 = new Set([...styles1]);
      const set2 = new Set([...styles2]);
      for (const prop of set1.union(set2)
        .difference(ignore)) {
        const val1 = styles1.getPropertyValue(prop);
        const val2 = styles2.getPropertyValue(prop);
        if (val1 !== val2) {
          missing.set(prop, val1);
        }
      }

      const results = [];
      for (const [key, value] of missing.entries()) {
        results.push(`' ${key}: ${value};' +`);
      }

      this.logger.leaving(me, results);
      return results.sort();
    }

    /**
     * Update news badge as appropriate.
     *
     * @method
     * @implements {NexusHoratio.base.Dispatcher~Handler}
     * @param {string} eventType - Event type.
     * @param {boolean} show - Whether to show the badge or not.
     */
   #newsHandlerBadgeStyle1 = (eventType, show) => {
     const me = this.#newsHandlerBadgeStyle1.name;
     this.logger.entered(me, eventType, show);

     if (show) {
       this.#badgeNewsStyle1.classList.add('notification-badge--show');
     } else {
       this.#badgeNewsStyle1.classList.remove('notification-badge--show');
     }

     this.logger.leaving(me);
   }

    /**
     * Update error badge as appropriate.
     *
     * @method
     * @implements {NexusHoratio.base.Dispatcher~Handler}
     * @param {string} eventType - Event type.
     * @param {number} count - Number of errors currently logged.
     */
    #errorHandlerBadgeStyle1 = (eventType, count) => {
      const me = this.#errorHandlerBadgeStyle1.name;
      this.logger.entered(me, eventType, count);

      this.#badgeErrorStyle1
        .querySelector('.notification-badge__count').innerText = `${count}`;

      if (count) {
        this.#badgeErrorStyle1.classList.add('notification-badge--show');
      } else {
        this.#badgeErrorStyle1.classList.remove('notification-badge--show');
      }

      this.logger.leaving(me);
    }

    /**
     * Tweak the internals of whatever random element we cloned.
     *
     * @method
     * @param {external:Element} button - The newly created button.
     */
    #finishButtonStyle1 = (button) => {
      const title = button.querySelector('.global-nav__primary-link-text');
      title.innerText = APP_SHORT;
      title.setAttribute('title', APP_SHORT);

      /**
       * @todo [(#414)](https://github.com/nexushoratio/userscripts/issues/414)
       * Retire, as this is now the transition backup.
       */
      button.querySelector('li-icon')
        ?.setAttribute('type', APP_SHORT.toLowerCase());
    }

    /**
     * @method
     * @param {external:Element} element - Element that will hold the badges.
     */
    #assembleBadgesStyle1 = (element) => {
      this.#badgeErrorStyle1 = element.querySelector(
        '.notification-badge'
      );
      this.#badgeNewsStyle1 = this.#badgeErrorStyle1.cloneNode(true);
      this.#badgeNewsStyle1
        .classList.add('lit-menu-badge-news-style1');
      this.#badgeErrorStyle1.after(this.#badgeNewsStyle1);

      // Style-1 badges are easy to switch between counting or not.  This
      // makes sure we are in the correct mode for each badge.
      let count = this.#badgeErrorStyle1
        .querySelector('.notification-badge__no-count');
      count?.classList.remove('notification-badge__no-count');
      count?.classList.add('notification-badge__count');
      count = this.#badgeNewsStyle1
        .querySelector('.notification-badge__count');
      count?.classList.remove('notification-badge__count');
      count?.classList.add('notification-badge__no-count');

      let a11y = this.#badgeErrorStyle1.querySelector('.a11y-text');
      if (a11y) {
        a11y.innerText = `${APP_LONG} error count`;
      }
      a11y = this.#badgeNewsStyle1.querySelector('.a11y-text');
      if (a11y) {
        a11y.innerText = `${APP_LONG} news notifications`;
      }

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
        this.dispatcher2.on('news', this.#newsHandlerBadgeStyle1);
      }

      this.logger.leaving(me, this.#ourMenuItemStyle1);
    }

    /**
     * Update news badge as appropriate.
     *
     * @method
     * @implements {NexusHoratio.base.Dispatcher~Handler}
     * @param {string} eventType - Event type.
     * @param {boolean} show - Whether to show the badge or not.
     */
   #newsHandlerBadgeStyle2 = (eventType, show) => {
     const me = this.#newsHandlerBadgeStyle2.name;
     this.logger.entered(me, eventType, show, this.#badgeNewsStyle2);

     if (show) {
       this.#badgeNewsStyle2.classList.remove('lit-menu-badge-hide');
     } else {
       this.#badgeNewsStyle2.classList.add('lit-menu-badge-hide');
     }

     this.logger.leaving(me);
   }

    /**
     * Updates error badge as appropriate.
     *
     * @method
     * @implements {NexusHoratio.base.Dispatcher~Handler}
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
     * @method
     * @param {external:Element} button - The newly created button.
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

    /**
     * @method
     * @param {external:Element} element - Element that will hold the badges.
     */
    #assembleBadgesStyle2 = (element) => {
      this.#badgeErrorStyle2 = document.createElement('span');
      this.#badgeErrorStyle2.classList.add('lit-menu-badge-error');
      this.#badgeNewsStyle2 = document.createElement('span');
      this.#badgeNewsStyle2.classList.add(
        'lit-menu-badge-news-style2', 'lit-menu-badge-hide'
      );
      element.append(this.#badgeErrorStyle2, this.#badgeNewsStyle2);
    }

    #createMenuItemStyle2 = () => {  // eslint-disable-line max-statements
      const me = this.#createMenuItemStyle2.name;
      this.logger.entered(me, this.#navbar);

      let item = this.#navbar
        .querySelector('li')
        .cloneNode(true);

      /**
       * @todo [(#414)](https://github.com/nexushoratio/userscripts/issues/414)
       * This should become the default.
       */
      const nav2 = document.querySelector(LinkedIn.navbarProfileItemSelector)
        ?.cloneNode(true);
      if (nav2) {
        nav2.innerHTML = item.innerHTML;
        item = nav2;
      }

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
          this.dispatcher2.on('news', this.#newsHandlerBadgeStyle2);
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
     * @method
     * @param {external:Element} menuItem - The menu item to connect.
     * @param {string} selector - The CSS selector for "Me".
     */
    #connectMenuItem = (menuItem, selector) => {
      const me = this.#connectMenuItem.name;
      this.logger.entered(me, menuItem, selector);

      if (this.#navbar) {
        if (!menuItem.isConnected) {
          this.logger.log('Will connect menu item to', this.#navbar);

          const navMe = this.#navbar.querySelector(selector);
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
          this.#checkForNews();
          this.#refreshErrors();
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
          this.#connectMenuItem(
            this.#ourMenuItemStyle1, '.global-nav__me, .global-nav__me-v2'
          );
        }
      }

      this.logger.leaving(me);
    }

    #compareBadgeErrorStyle2 = () => {
      const me = this.#compareBadgeErrorStyle2.name;
      this.logger.entered(me);

      // Only do this once.
      if (!this.#badgeErrorResultsStyle2 &&
          this.#badgeErrorStyle2?.isConnected) {
        this.logger.log('checking error badge', this.#badgeErrorStyle2);
        // Some badges are bad examples, so skip them using :not().
        const badges = this.#navbar
          .querySelectorAll('svg:not([id^="home"]) + span');
        if (badges.length > NH.base.ONE_ITEM) {
          const ignore = new Set([
            'inline-size',
            'inset-inline-end',
            'opacity',
            'perspective-origin',
            'right',
            'transform-origin',
            'width',
          ]);
          const results = this.#findMissingStyleProperties(
            badges[0], this.#badgeErrorStyle2, ignore
          );
          if (results.length) {
            NH.base.issues.post(
              'Style-2 error badge needs updating:', results.join('\n')
            );
          }
          this.#badgeErrorResultsStyle2 = results;
        }
      }

      this.logger.leaving(me);
    }

    #compareBadgeNewsStyle2 = () => {
      const me = this.#compareBadgeNewsStyle2.name;
      this.logger.entered(me);

      // Only do this once.
      if (!this.#badgeNewsResultsStyle2 &&
          this.#badgeNewsStyle2?.isConnected) {
        this.logger.log('checking error badge', this.#badgeNewsStyle2);
        const badge = this.#navbar
          .querySelector('svg[id^="home"] + span');
        if (badge) {
          const ignore = new Set([
            'background-color',
            'bottom',
            'inset-block-end',
            'inset-block-start',
            'opacity',
            'top',
          ]);
          const results = this.#findMissingStyleProperties(
            badge, this.#badgeNewsStyle2, ignore
          );
          if (results.length) {
            NH.base.issues.post(
              'Style-2 news badge needs updating:', results.join('\n')
            );
          }
          this.#badgeNewsResultsStyle2 = results;
        }
      }

      this.logger.leaving(me);
    }

    #compareBadgesStyle2 = () => {
      const me = this.#compareBadgesStyle2.name;
      this.logger.entered(me);

      this.#compareBadgeErrorStyle2();
      this.#compareBadgeNewsStyle2();

      this.logger.leaving(me);
    }

    /**
     * Update News tab label as appropriate.
     *
     * @method
     * @param {boolean} highlight - Whether to show the badge or not.
     */
    #updateInfoNewsLabel = (highlight) => {
      const me = this.#updateInfoNewsLabel.name;
      this.logger.entered(me, highlight);

      const litLabel = this.#infoTabs.tabs.get('News').label;

      if (highlight) {
        this.#infoTabs.goto('News');
        litLabel.classList.add('lit-positive');
      } else {
        litLabel.classList.remove('lit-positive');
      }

      this.logger.leaving(me);
    }

    /**
     * Decisions about news could be made before the UI is available.
     *
     * @method
     */
    #newsListener = (...msgs) => {
      const me = this.#newsListener.name;
      this.logger.entered(me, msgs);

      for (const msg of msgs) {
        this.dispatcher2.fire('news', msg);
        this.#updateInfoNewsLabel(msg);
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
          this.#connectMenuItem(
            this.#ourMenuItemStyle2, LinkedIn.navbarProfileItemSelector
          );

          /**
           * @todo [(#414)](https://github.com/nexushoratio/userscripts/issues/414)
           * Retire, as this is now the transition backup.
           */
          this.#connectMenuItem(this.#ourMenuItemStyle2, 'li:last-child');
        }
        this.#compareBadgesStyle2();
      }

      this.logger.leaving(me);
    }

    /**
     * Find the nav links and ensure observers.
     *
     * @method
     */
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
        LinkedIn.primaryNavSelector
      ) || this.#iframeDoc
        ?.querySelector(LinkedIn.primaryNavSelector);

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

    /**
     * Reset observers for the navbar.
     *
     * @method
     */
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
     *
     * @method
     * @fires 'resize'
     */
    #navbarHandler = () => {
      const me = this.#navbarHandler.name;
      this.logger.entered(me);

      this.#findNavbar();

      if (this.#navbar) {
        this.#ensureMenuStyle1();
        this.#ensureMenuStyle2();
      }

      this.logger.leaving(me);
    }

    /**
     * @method
     * @returns {TabbedUI~TabDefinition} Keyboard shortcuts listing.
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
     * @method
     * @param {Set<string>} unknown - Issue ids referenced in news items but
     * not in {@link globalKnownIssues}.
     * @param {Set<string>} unused - Stale {@link globalKnownIssues} ids.
     * @param {Set<string>} old - Stale {@link globalNewsContent} entries.
     */
    #reportIssueProblems = (unknown, unused, old) => {
      for (const item of unknown) {
        NH.base.issues.post(
          'Unknown issue detected:', item, this.constructor.#ghIssue(item)
        );
      }

      for (const item of old) {
        NH.base.issues.post('Old news item:', item);
      }

      for (const item of unused.values()) {
        NH.base.issues.post(
          'Unused issue detected:',
          item,
          this.constructor.#ghIssue(item.issueId)
        );
      }
    }

    /**
     * @method
     * @returns {obj} dates and known issues.
     */
    #preprocessKnownIssues = () => {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;  // eslint-disable-line no-magic-numbers
      const oldestAllowedDate = litOptions.enableAlertOldNews
        ? Date.now() - thirtyDays
        : 0;

      const knownIssues = new Map(globalIssues.map(x => [x.issueId, x]));
      const unknownIssues = new Set();
      const unusedIssues = new Map(
        knownIssues
          .entries()
          .filter(x => x[1].date < oldestAllowedDate)
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
          unusedIssues.delete(issue);
          if (knownIssues.has(issue)) {
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

    /**
     * Send `change` event to the errors text area.
     *
     * @method
     */
    #refreshErrors = () => {
      const evt = new Event('change');
      this.#errorText.dispatchEvent(evt);
    }

    /**
     * Add content to the Errors tab so the user can use it to file feedback.
     *
     * @method
     * @param {string} content - Information to add.
     */
    #addError = (content) => {
      const repr = this.#typeTool.repr(content);
      this.#errorText.value += `${repr}\n`;

      if (content === LinkedIn.errorMarker) {
        this.#refreshErrors();
      }
    }

    /**
     * Add a marker to the Errors tab so the user can see where different
     * issues happened.
     *
     * @method
     */
    #addErrorMarker = () => {
      this.#addError(LinkedIn.errorMarker);
    }

    #issueListener = (...issues) => {
      for (const issue of issues) {
        this.#addError(issue);
      }
      this.#addErrorMarker();
    }

  }

  /**
   * Different implementation styles across LinkedIn over time.
   * @readonly
   * @enum {Symbol}
   */
  LinkedIn.Style = {
    UNKNOWN: Symbol.for('Style-0'),
    ONE: Symbol.for('Style-1'),
    TWO: Symbol.for('Style-2'),
  };

  Object.freeze(LinkedIn.Style);

  /**
   * Verify a {@link NexusHoratio.spa.Page Page} implementation and current
   * site style match.
   *
   * It will post a bug on mismatches.
   */
  class LinkedInStyleService extends NH.spa.Page.Service {

    /**
     * @param {string} instanceName - Custom portion of this instance.
     */
    constructor(instanceName) {
      super(instanceName);
      this.on('activate', this.#onActivate);
    }

    /**
     * @param {...module:linkedin-tool~LinkedIn.Style} styles - Styles allowed
     * for the page.
     * @returns {module:linkedin-tool~LinkedInStyleService} This instance, for
     * chaining.
     */
    addStyles(...styles) {
      for (const style of styles) {
        this.#allowedStyles.add(style);
      }
      return this;
    }

    #allowedStyles = new Set();

    #onActivate = () => {
      if (!this.#allowedStyles.has(this.page.spa.details.pageStyle)) {
        const style = this.page.spa.details.pageStyle.toString()
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
   * LinkedIn Tool enhancements for {@link NexusHoratio.spa.Page spa.Page}.
   *
   * @extends NexusHoratio.spa.Page
   */
  class Page extends NH.spa.Page {

    /**
     * @param {NexusHoratio.spa.Page~PageDetails} details - Details about the
     * instance.
     */
    constructor(details = {}) {
      if (new.target === Page) {
        throw new TypeError('Abstract class; do not instantiate directly.');
      }
      super(details);

      this.logger.log('Adapter page constructed', this);
    }

    /**
     * Alias for `this.constructor`.
     *
     * @type {module:linkedin-tool~Page}
     */
    get ctor() {
      return this.constructor;
    }

    /**
     * Useful default for CSS class name.
     *
     * @type {string}
     */
    get scrollerClassName() {
      return this.cssClassName(['scroller']);
    }

    /**
     * Derive a CSS className from the name of the subclass.
     *
     * @method
     * @param {string[]} extras - Extract strings to add to the class name.
     * @returns {string} A CSS className.
     */
    cssClassName = (extras = []) => {
      const split = NH.base.simpleParseWords(this.name)
        .map(x => x.toLowerCase());
      const className = NH.base.safeId(['lit'].concat(split)
        .concat(extras)
        .join('-'));

      return className;
    }

    /**
     * A useful processor for many LIT pages.
     *
     * It just sums up height of the matched elements to set a top margin.
     *
     * @method
     * @implements {NexusHoratio.web.StyleService~ElementsProcessor}
     * @param {NexusHoratio.web.StyleService~ElementMap} elements - Elements
     * to examine.
     * @returns {NexusHoratio.web.StyleService~StyleProperties} Style
     * properties for to contribute.
     */
    elementsHeightProcessor = (elements) => {
      const me = this.elementsHeightProcessor.name;
      this.logger.entered(me, elements);

      let height = 0;
      const properties = new Map();

      for (const value of elements.values()) {
        if (value) {
          const header = getComputedStyle(value);
          if (header.visibility === 'visible') {
            height += value.offsetHeight;
          }
        }
      }

      properties.set('scroll-margin-top', `${height}px`);

      this.logger.leaving(me, properties);
      return properties;
    }

    /**
     * A useful finder for many LIT pages.
     *
     * It finds the navbar and buffer for the content just below it.  This is
     * intended for use with {@link
     * module:linkedin-tool~Page.navbarAndFriendsElementsProcessor
     * navbarAndFriendsElementsProcessor}.
     *
     * @method
     * @implements {NexusHoratio.web.StyleService~Finder}
     * @returns {NexusHoratio.web.StyleService~ElementMap} Elements to
     * monitor.
     */
    navbarAndFriendsFinder = () => {
      const me = this.navbarAndFriendsFinder.name;
      this.logger.entered(me);

      const elements = new Map();
      elements.set(
        'content',
        document.querySelector(LinkedIn.primaryContentSelector)?.parentElement
      );
      elements.set('navbar', this.spa.details.navbar);

      this.logger.leaving(me, elements);
      return elements;
    }

    /**
     * A useful processor for many LIT pages.
     *
     * It computes a top margin that works nicely for consistently positioning
     * items.
     *
     * Currently only tested with Style.ONE pages.
     *
     * @method
     * @implements {NexusHoratio.web.StyleService~ElementsProcessor}
     * @param {NexusHoratio.web.StyleService~ElementMap} elements - Elements
     * to examine.
     * @returns {NexusHoratio.web.StyleService~StyleProperties} Style
     * properties for to contribute.
     */
    navbarAndFriendsElementsProcessor = (elements) => {
      const me = this.navbarAndFriendsElementsProcessor.name;
      this.logger.entered(me, elements);

      const tops = [];
      const properties = new Map();

      for (const [key, value] of elements.entries()) {
        switch (key) {
          case 'navbar':
            if (value) {
              tops.push(`${value.offsetHeight}px`);
            }
            break;
          case 'content':
            if (value) {
              tops.push(getComputedStyle(value).marginTop);
            }
            break;
          default:
            NH.base.issues.post(
              this.name, me, 'Unsupported element key:', key
            );
        }
      }

      if (tops.length) {
        const plus = tops.join(' + ');
        properties.set('scroll-margin-top', `calc(${plus})`);
      }

      this.logger.leaving(me, properties);
      return properties;
    }

    /**
     * Wait for matching selector to disappear.
     *
     * This could possibly be rolled into {@link
     * NexusHoratio.web.waitForSelector}.
     *
     * @method
     * @param {string} selector - CSS selector.
     * @param {number} [timeout=0] - Time to wait in milliseconds, 0 disables.
     * @returns {Promise<NexusHoratio.web~Results>} Basically, something to
     * await on.
     */
    waitForSelectorToBeGone = (selector, timeout = 0) => {

      /**
       * @implements {NexusHoratio.web~Monitor}
       * @returns {NexusHoratio.web~Continuation} Indicate whether done
       * monitoring.
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
        name: this.waitForSelectorToBeGone.name,
        base: document,
      };

      const how = {
        observeOptions: {childList: true, subtree: true},
        monitor: monitor,
        timeout: timeout,
      };

      return NH.web.otmot(what, how);
    }

    dismissFloatingUiPortal = async () => {
      const timeout = 2000;
      if (document.querySelector(LinkedIn.floatingUiPortalSelector)) {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {key: 'Escape'})
        );
        await this.waitForSelectorToBeGone(
          LinkedIn.floatingUiPortalSelector, timeout
        );
      }
    }

    #klass

  }

  /* eslint-disable no-new */
  /* eslint-disable require-jsdoc */
  class LitPageTestCase extends NH.xunit.TestCase {

    static TestPage = class extends Page {}

    static CtorPage = class extends Page {

      /**
       * @alias CtorPage
       * @ignore
       */
      constructor() {
        super();

        this.ctor.#business = 'nunya';
      }

      static get businessClass() {
        return [this.#business, 'class'].join('-');
      }

      get businessInst() {
        return [this.ctor.#business, 'inst'].join('-');
      }

      static #business = 'uninit';

    }

    testAbstract() {
      this.assertRaises(TypeError, () => {
        new Page();
      });

      this.assertNoRaises(() => {
        new LitPageTestCase.TestPage();
      }, 'subclass passes');
    }

    testScrollerClassName() {
      const page = new LitPageTestCase.TestPage();

      this.assertEqual(
        page.scrollerClassName, 'lit-test-page-scroller'
      );
    }

    testCssClassName() {
      const page = new LitPageTestCase.TestPage();

      this.assertEqual(
        page.cssClassName(),
        'lit-test-page',
        'no arguments'
      );
      this.assertEqual(
        page.cssClassName([]),
        'lit-test-page',
        'empty array'
      );
      this.assertEqual(
        page.cssClassName(['single']),
        'lit-test-page-single',
        'single item'
      );
      this.assertEqual(
        page.cssClassName(
          ['multiple', 'items', 'here']
        ),
        'lit-test-page-multiple-items-here',
        'multiple items'
      );
      this.assertEqual(
        page.cssClassName(
          ['one two', 'three_four']
        ),
        'lit-test-page-one-two-three_four',
        'spaces and underscores'
      );
    }

    testCtor() {
      this.assertEqual(
        LitPageTestCase.CtorPage.businessClass, 'uninit-class', 'uninit'
      );
      const page = new LitPageTestCase.CtorPage();

      this.assertEqual(page.ctor, LitPageTestCase.CtorPage, 'equivalence');
      this.assertEqual(page.businessInst, 'nunya-inst', 'inst');
      this.assertEqual(
        LitPageTestCase.CtorPage.businessClass, 'nunya-class', 'static'
      );
    }

    static { this.register(); }

  }
  /* eslint-enable */

  /** Class for holding keystrokes that simplify debugging. */
  class DebugKeys {

    /** @hideconstructor */
    constructor() {
      this.#logger = new NH.base.Logger(`[${this.constructor.name}]`);
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
        let shadow = '';
        let target = document.activeElement;
        while (target.shadowRoot) {
          shadow = ' (shadow-dom)';
          target = target.shadowRoot.activeElement;
        }
        this.#logger.log(`activeElement${shadow}`, target);
      }
    );

    dumpWatched = new Shortcut(
      'c-c c-d',
      'Dump watched elements (help find a readySelector)',
      () => {
        const me = this.dumpWatched.name;
        this.#logger.entered(me);

        try {
          const byId = new NH.base.DefaultMap(Array);
          // Will get wrapped in a `:not(...)`
          const ignoredExtras = [
            'iframe',
            'img',
            'figure',
          ];

          // Eliminate element ids used more than once.
          document.querySelectorAll('[data-counter][id]')
            .values()
            .map(x => byId.get(x.id)
              .push(1))
            .toArray();

          const nots = byId.entries()
            .filter(x => x[1].length > 1)
            .map(x => `#${x[0]}`)
            .toArray()
            .concat(ignoredExtras)
            .map(x => `:not(${x})`)
            .join('');

          this.#logger.log(
            'watched',
            document.querySelectorAll(`[data-counter]${nots}`)
              .values()
              .map(x => [x.dataset.counter, x])
              .toArray()
              .sort((a, b) => b[0] - a[0])
          );
        } catch (e) {
          this.#logger.log('caught', e);
        }

        this.#logger.leaving(me);
      }
    );

    resetScrollers = new Shortcut(
      'c-c c-s',
      'Reset all Scroller IDs',
      () => {
        const me = this.resetScrollers.name;
        this.#logger.entered(me);

        let count = 0;
        for (const item of document.querySelectorAll('[data-scroller-id]')) {
          delete item.dataset.scrollerId;
          count += 1;
        }

        this.#logger.log('items reset:', count);

        this.#logger.leaving(me);
      }
    );

    #logger

  }

  /**
   * Class for handling aspects common across LinkedIn.
   *
   * This includes things like the global nav bar, information view, etc.
   *
   * @extends module:linkedin-tool~Page
   */
  class Global extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({spa: spa});

      spa.details.dispatcher
        .on('activate', this.#onHybridActivate);

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.ONE, LinkedIn.Style.TWO);

      this.addService(VMKeyboardService)
        .addInstance(this);
      if (litOptions.enableDevMode) {
        this.addService(VMKeyboardService)
          .setShortName(DebugKeys.name)
          .addInstance(new DebugKeys());
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

          /**
           * @todo [(#436)](https://github.com/nexushoratio/userscripts/issues/436)
           * Retire this old target after a while.
           */
          this.#gotoNavIcon('home');
          this.#gotoNavIcon('house');
        }
      }
    );

    gotoMyNetwork = new Shortcut(
      'g w',
      'Go to My Network',
      () => {
        this.#gotoNavLink('mynetwork');
      }
    );

    gotoJobs = new Shortcut(
      'g j',
      'Go to Jobs',
      () => {
        this.#gotoNavLink('jobs');
      }
    );

    gotoMessaging = new Shortcut(
      'g m',
      'Go to Messaging',
      () => {
        this.#gotoNavLink('messaging');
      }
    );

    gotoNotifications = new Shortcut(
      'g n',
      'Go to Notifications',
      () => {
        this.#gotoNavLink('notifications');
      }
    );

    gotoMenu = new Shortcut(
      'g =',
      'Go to More menu',
      () => {
        if (this.spa.details.pageStyle === LinkedIn.Style.ONE) {
          this.#gotoNavButton('More');
        } else {

          /**
           * @todo [(#436)](https://github.com/nexushoratio/userscripts/issues/436)
           * Retire this old target after a while.
           */
          this.#gotoNavIcon('menu');
          this.#gotoNavIcon('bars');
        }
      }
    );

    gotoProfile = new Shortcut(
      'g p',
      'Go to Profile (aka, Me)',
      () => {
        if (this.spa.details.pageStyle === LinkedIn.Style.ONE) {
          this.#gotoNavButton('Me');
        } else if (!NH.web.clickElement(
          document, [`${LinkedIn.navbarProfileItemSelector} > div`]
        )) {

          /**
           * @todo [(#414)](https://github.com/nexushoratio/userscripts/issues/414)
           *
           * Retire this old Style-2 approach.
           * Nothing easy to identify, so assume always after Notification.
           */
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
        this.spa.details.focusOnSidebar();
      }
    );

    focusOnAside = new Shortcut(
      '.',
      'Focus on the right/bottom sidebar (not always present)',
      () => {
        this.spa.details.focusOnAside();
      }
    );

    /**
     * Click on the requested link in the global nav bar.
     *
     * @method
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
     *
     * @todo [(#414)](https://github.com/nexushoratio/userscripts/issues/414)
     * Retire this old Style-2 approach.  There are only two users, Profile
     * and Business, and both could be translated, so not great anyway.
     *
     * @method
     * @param {string} item - Text on the button to look for.
     */
    #gotoNavButton = (item) => {
      const me = this.#gotoNavButton.name;
      this.logger.entered(me, item);

      this.spa.details.navbar
        .parentElement.parentElement.querySelectorAll('button')
        .values()
        .find(el => el.textContent.includes(item))
        ?.click();

      this.logger.leaving(me);
    }

    /**
     * Click on the requested button in the global nav bar.
     *
     * This uses the `svg.id` for selection.
     *
     * @method
     * @param {string} item - Text on the button to look for.
     */
    #gotoNavIcon = (item) => {
      const me = this.#gotoNavIcon.name;
      this.logger.entered(me, item);

      const svg = `svg[id^="${item}-"]`;
      this.spa.details.navbar.closest(`:has(${svg})`)
        ?.querySelector(`button:has(${svg})`)
        ?.click();

      this.logger.leaving(me);
    }

    /**
     * Click on the requested element in the Style-2 global nav bar.
     *
     * This uses the `aria-label`, which has the potential to be translated.
     *
     * @method
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

    /**
     * @todo [(#295)](https://github.com/nexushoratio/userscripts/issues/295)
     * This is a hack.  Find a more principled solution.
     *
     * @method
     */
    #onHybridActivate = () => {
      const me = this.#onHybridActivate.name;
      this.logger.entered(me, this.spa.details.pageStyle);

      const main = document.querySelector('main')?.id;
      if (this.spa.details.pageStyle === LinkedIn.Style.ONE &&
          main === 'workspace') {
        this.logger.log('hybrid mode, reloading');
        document.location.reload();
      }

      this.logger.leaving(me);
    }

  }

  /**
   * Class for handling the Posts feed.
   *
   * @extends module:linkedin-tool~Page
   */
  class Feed extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        // eslint-disable-next-line prefer-regex-literals
        pathname: RegExp('^/(?:feed|sharing/compose)/?', 'u'),
        readySelector: LinkedIn.pageReadySelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.TWO);

      this.addService(VMKeyboardService)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get comments() {
      if (!this.#commentScroller && this.posts.item) {
        this.#initCommentScroller();
      }

      return this.#commentScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
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
        this.comments?.next();
      }
    );

    prevComment = new Shortcut(
      'p',
      'Previous comment',
      () => {
        this.comments?.prev();
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
        this.#lastScroller.focus();
      }
    );

    showComments = new Shortcut(
      'c',
      'Show comments',
      () => {  // eslint-disable-line max-lines-per-function
        let el = this.posts.item;
        // If current post style includes comment counts, bail if 0.
        const count = el?.querySelector('svg[id^="comment"] ~ div');
        if (count && !parseInt(count.innerText, 10)) {
          el = null;
        }

        if (el) {
          const main = document.querySelector('main');
          const scrollTop = main?.scrollTop;

          // The current UI (and it has changed), is that, the first time, it
          // not only opens the comments, but the comment input box as well,
          // moving focus to it.  This attempts to defeat that.
          const commentBoxSelector = '[id*="CommentBox"] [role="textbox"]';
          const defeatCommentBox = !el.querySelector(commentBoxSelector);

          /** Move focus from comment box back to current item. */
          const blurCommentBox = () => {
            if (document.activeElement.matches(commentBoxSelector)) {
              this.#lastScroller.focus();
              main.scrollTo({top: scrollTop});
            }
          };

          // Check for the "Load more" button first, otherwise we just keep
          // clicking on the first comment button which does nothing useful
          // after the first batch of comments is loaded.
          NH.web.clickElement(el, [

            /**
             * @todo [(#429)](https://github.com/nexushoratio/userscripts/issues/429)
             * Retire transitional selectors after a while.
             */
            // Load more comments
            `[${CKEY}*="LoadMoreComments"] button`,
            `[${CKEY}*="LoadMoreComments"] [role="button"]`,
            // Inside post body
            '[role="button"]',
            'button:has(svg[id^="comment"])',
          ]);

          if (defeatCommentBox) {
            NH.web.waitForSelector(commentBoxSelector, 0, el)
              .then((box) => {
                const delay = 1000;
                box.addEventListener('focus', blurCommentBox);
                // Depending on the situation, focus could move multiple
                // times, so rather than making it a one-shot, remove it after
                // a bit.
                setTimeout(() => {
                  box.removeEventListener('focus', blurCommentBox);
                }, delay);
              });
          }

          // Move back after the post click handlers (triggered by the click
          // above), moved things around.
          main.scrollTo({top: scrollTop});
        }
      }
    );

    showMore = new Shortcut(
      'm',
      'Show more of current post or comment',
      () => {
        const el = this.#lastScroller.item;
        NH.web.clickElement(el, ['[data-testid="expandable-text-button"]']);
      }
    );

    loadMorePosts = new Shortcut(
      'l',
      'Load more posts (if the <button>New Posts</button> button' +
        ' is available)',
      () => {
        const me = this.loadMorePosts.name;
        this.logger.entered(me);

        const posts = this.posts;

        /** Trigger function for {@link NexusHoratio.web.otrot2}. */
        function trigger() {
          // The topButton only shows up when the web app detects new posts.
          const topButton = document.querySelector(
            'button:has([id^="arrow-up"])'
          );
          if (topButton?.checkVisibility()) {
            topButton.click();
          }
        }

        /** Action function for {@link NexusHoratio.web.otrot2}. */
        function action() {
          if (posts.item) {
            posts.first();
          }
        }

        const what = {
          name: `${this.id} ${me}`,
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
        NH.web.clickElement(el, ['a:has(> div > ul)']);
      }
    );

    openMeatballMenu = new Shortcut(
      '=',
      'Open closest <button>⋯</button> menu',
      () => {
        const el = this.#getItemHeader();
        NH.web.clickElement(el, LinkedIn.menuSelectorArray);
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
        NH.web.clickElement(el, [

          /**
           * @todo [(#436)](https://github.com/nexushoratio/userscripts/issues/436)
           * Retire `report` after a while.
           */
          ':has(> * > svg[id^="repost"])',
          ':has(> * > svg[id^="arrows-swap"])',
        ]);
      }
    );

    sendPost = new Shortcut(
      'S',
      'Send current post privately',
      () => {
        const el = this.#getPostFooter();
        NH.web.clickElement(el, [

          /**
           * @todo [(#436)](https://github.com/nexushoratio/userscripts/issues/436)
           * Retire `send` after a while.
           */
          ':has(> * > svg[id^="send"])',
          ':has(> * > svg[id^="paper-plane"])',
        ]);
      }
    );

    gotoShare = new Shortcut(
      'P',
      `Go to the share box to start a post or ${this.ctor.#tabSnippet} ` +
        'to the other creator options',
      () => {
        document
          .querySelector('#shareboxProfilePictureComponentRef ~ div > div')
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

        /** Trigger function for {@link NexusHoratio.web.otrot}. */
        function trigger() {
          target.click();
        }
        if (target) {
          const what = {
            name: `${this.id} ${me}`,
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

    static #tabSnippet = VMKeyboardService.parseSeq('tab');

    #commentScroller
    #lastScroller
    #postScroller
    #postScrollerContainerSelector = 'main [data-testid="mainFeed"]';
    #uidCommentRE =
    /^(?:replaceableComment_urn:li:comment:\()?(?<body>.*)\)/u;

    // The "expanded" bit may be outdated with #426.
    #uidPostRE =
    /^(?:expanded|collapsed|update-card-focus)?(?<body>.*)FeedType/u;

    #initScrollers = () => {
      this.#initScrollerStyleService();
      this.#initPostScroller();
    }

    #initScrollerStyleService = () => {
      const styleConfig = {
        className: this.scrollerClassName,
        finder: this.#scrollerFinder,
        elementsProcessor: this.elementsHeightProcessor,
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    #initPostScroller = () => {
      const what = {
        name: `${this.name} posts`,
        containerItems: [
          {
            container: this.#postScrollerContainerSelector,
            items: [
              // Regular items
              '[role="listitem"]',
              // Dismissed item placeholders
              `div[${CKEY}^="collapsed"]`,
            ].join(','),
          },
        ],
      };

      const how = {
        uidCallback: this.#uniquePostIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#postScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#postScroller);
      this.#postScroller.dispatcher
        .on('activated', this.#onPostActivated)
        .on('changed', this.#onPostChanged)
        .on('out-of-range', this.spa.details.focusOnSidebar);

      this.#lastScroller = this.#postScroller;
    }

    #initCommentScroller = () => {
      const what = {
        name: `${this.name} comments`,
        base: this.posts.item,
        selectors: [
          [
            // Regular
            `[data-component-type] > div > div > [${CKEY}*=":comment:"]`,
          ].join(','),
        ],
      };

      const how = {
        uidCallback: this.#uniqueCommentIdentifier,
        classes: [
          LinkedIn.scrollerSecondaryClassName,
          this.scrollerClassName,
        ],
        autoActivate: true,
        snapToTop: false,
      };

      this.#commentScroller = new NH.nav.Scroller(what, how);
      this.#commentScroller.dispatcher
        .on('changed', this.#onCommentChanged)
        .on('out-of-range', this.#returnToPost);
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~Finder}
     * @returns {NexusHoratio.web.StyleService~ElementMap} Elements to
     * monitor.
     */
    #scrollerFinder = () => {
      const me = this.#scrollerFinder.name;
      this.logger.entered(me);

      const elements = new Map();

      // We want the element with the listener, which happens to be the one
      // with the "aria-expanded".
      elements.set('chevron', document.querySelector('[id^="chevron-down"]')
        ?.closest('[aria-expanded]'));

      this.logger.leaving(me, elements);
      return elements;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniquePostIdentifier = (scroller, element) => {
      const me = this.#uniquePostIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const key = LinkedIn.ckeyIdentifier(element);
      const groups = this.#uidPostRE.exec(key)?.groups;

      if (key) {
        content = key;
      }
      if (groups) {
        content = groups.body;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueCommentIdentifier = (scroller, element) => {
      const me = this.#uniqueCommentIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const key = LinkedIn.ckeyIdentifier(element);
      const groups = this.#uidCommentRE.exec(key)?.groups;

      if (key) {
        content = key;
      }
      if (groups) {
        content = groups.body;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @returns {external:Element} Header container for current post.
     */
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

    /**
     * @method
     * @returns {external:Element} Header container for current comment.
     */
    #getCommentHeader = () => {
      const me = this.#getCommentHeader.name;
      this.logger.entered(me);

      const el = this.comments?.item
        ?.querySelector('div:has(> div ~ button)');

      this.logger.leaving(me, el);
      return el;
    }

    /**
     * @method
     * @returns {external:Element} Header container for current item.
     */
    #getItemHeader = () => {
      const me = this.#getItemHeader.name;
      this.logger.entered(me);

      const el = this.#getCommentHeader() || this.#getPostHeader();

      this.logger.leaving(me, el);
      return el;
    }

    /**
     * @method
     * @returns {external:Element} Footer container for current post.
     */
    #getPostFooter = () => {
      const me = this.#getPostFooter.name;
      this.logger.entered(me);

      const el = this.posts.item
        ?.querySelector('div:has(> h2) > div:last-of-type');

      this.logger.leaving(me, el);
      return el;
    }

    /**
     * @method
     * @returns {external:Element} Footer container for current comment.
     */
    #getCommentFooter = () => {
      const me = this.#getCommentFooter.name;
      this.logger.entered(me);

      // Comment Footer and StatusBar use the same query.
      const el = this.comments?.item
        ?.querySelector('div:has(> hr)');

      this.logger.leaving(me, el);
      return el;
    }

    /**
     * @method
     * @returns {external:Element} Footer container for current item.
     */
    #getItemFooter = () => {
      const me = this.#getItemFooter.name;
      this.logger.entered(me);

      const el = this.#getCommentFooter() || this.#getPostFooter();

      this.logger.leaving(me, el);
      return el;
    }

    /**
     * @method
     * @returns {external:Element} StatusBar container for current post.
     */
    #getPostStatusBar = () => {
      const me = this.#getPostStatusBar.name;
      this.logger.entered(me);

      const el = this.posts.item
        ?.querySelector('div:has(> a [role="presentation"])');

      this.logger.leaving(me, el);
      return el;
    }

    /**
     * @method
     * @returns {external:Element} StatusBar container for current comment.
     */
    #getCommentStatusBar = () => {
      const me = this.#getCommentStatusBar.name;
      this.logger.entered(me);

      // Comment Footer and StatusBar use the same query.
      const el = this.comments?.item
        ?.querySelector('div:has(> hr)');

      this.logger.leaving(me, el);
      return el;
    }

    /**
     * @method
     * @returns {external:Element} StatusBar container for current item.
     */
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
     * @method
     * @returns {external:Element} The element to click.
     */
    #getDismissElement = async () => {  // eslint-disable-line max-lines-per-function
      const me = this.#getDismissElement.name;
      this.logger.entered(me, this.#lastScroller.item);

      let el = null;

      if (this.#lastScroller.item) {
        this.dismissFloatingUiPortal();

        // If the current item is a regular post, this will match.
        let selector = [
          // Visible
          /**
           * @todo [(#436)](https://github.com/nexushoratio/userscripts/issues/436)
           * Retire `close` after a while.
           */
          ':has(> * > svg[id^="close"])',
          ':has(> * > svg[id^="xmark"])',
          // Dismissed
          'button:has(> span > span)',
        ].join(',');
        let header = this.#getItemHeader();
        el = header?.querySelector(selector);
        if (!el) {
          // Some items need to trigger a popup menu.
          this.openMeatballMenu();
          try {
            const timeout = 2000;
            // The menus take a while to populate.  Even though known types of
            // menus look to have the same "cancelled eye" icon, they are
            // currently brought in differently.  One menu type uses one named
            // "visibility-off-*" while another menu has no id.  Interestingly
            // enough, the one without an id is the only svg icon without a
            // name so, :not([id]) is used for finding it proper, while a
            // sibling named "signal" is used waiting for the menu to settle.
            header = await NH.web.waitForSelector([
              LinkedIn.floatingUiPortalSelector,
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

    #onPostActivated = () => {  // eslint-disable-line max-lines-per-function
      const me = this.#onPostActivated.name;
      this.logger.entered(me);

      // Defeat LinkedIn's `focusin` listener on `#root`.
      //
      // It does annoying things like popping up menus.  They probably only
      // want it to happen when someone tabs onto elements, but it also
      // happens when mouse moves in/out of the browser and when LIT itself
      // navigates around, changing focus.  This particular element seems to
      // get replaced, so no current need to remove it.
      const el = document.querySelector(this.#postScrollerContainerSelector);
      el?.addEventListener('focusin', (evt) => {
        evt.stopPropagation();
      });

      /**
       * Wait for the post to be reloaded.
       *
       * @implements {NexusHoratio.web~Monitor}
       * @returns {NexusHoratio.web~Continuation} Indicate whether done
       * monitoring.
       */
      const monitor = () => {
        this.logger.log('monitor item classes:', this.posts.item.classList);
        return {
          done: !this.posts.item.classList.contains('has-occluded-height'),
        };
      };
      if (this.posts.item) {
        const what = {
          name: `${this.id} ${me}`,
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

    /**
     * Resets the comments {@link NexusHoratio.nav.Scroller Scroller}.
     */
    #onPostChanged = () => {
      const me = this.#onPostChanged.name;
      this.logger.entered(me, this.posts.item);

      this.#resetComments();
      this.#lastScroller = this.posts;

      this.logger.leaving(me);
    }

    /**
     * Reset the comment scroller.
     *
     * @method
     */
    #resetComments = () => {
      if (this.#commentScroller) {
        this.#commentScroller.destroy();
        this.#commentScroller = null;
      }
      this.comments;
    }

    #onCommentChanged = () => {
      this.#lastScroller = this.comments;
    }

    /**
     * Reselects current post, triggering same actions as initial selection.
     *
     * @method
     */
    #returnToPost = () => {
      this.posts.item = this.posts.item;
    }

  }

  /**
   * Class for handling the My Network pages.
   *
   * This page takes 3-4 seconds to load every time.  Revisits are
   * likely to take a while.
   *
   * @extends module:linkedin-tool~Page
   */
  class MyNetwork extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        name: 'My Network (Grow, Catch up)',
        // eslint-disable-next-line prefer-regex-literals
        pathname: RegExp('^/mynetwork(?:/(?:grow/|catch-up/.*)|$)', 'u'),
        readySelector: LinkedIn.pageReadySelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.TWO);

      this.addService(VMKeyboardService)
        .setShortName(this.name)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get collections() {
      return this.#collectionScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get individuals() {
      if (!this.#individualScroller && this.collections.item) {
        this.#initIndividualScroller();
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
        this.individuals?.next();
      }
    );

    prevIndividual = new Shortcut(
      'p',
      'Previous individual item in collection',
      () => {
        this.individuals?.prev();
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
        this.#lastScroller.focus();
      }
    );

    openMeatballMenu = new Shortcut(
      '=',
      'Open closest <button>⋯</button> menu',
      () => {
        const el = this.#lastScroller?.item;
        NH.web.clickElement(el, LinkedIn.menuSelectorArray);
      }
    );

    tabList = new Shortcut(
      'l',
      'Focus on Manage invitations tab list',
      () => {
        const el = document.querySelector(
          `${MyNetwork.#tablistSelector} [aria-current]`
        );
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

    static #tablistSelector = `${LinkedIn.selectorIsPrimaryContent} nav`;

    #collectionScroller
    #individualScroller
    #lastScroller

    #initScrollers = () => {
      this.#initScrollerStyleService();
      this.#initCollectionScroller();
    }

    #initScrollerStyleService = () => {
      const styleConfig = {
        className: this.scrollerClassName,
        finder: this.#scrollerFinder,
        elementsProcessor: this.elementsHeightProcessor,
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    #initCollectionScroller = () => {
      const what = {
        name: `${this.name} cards`,
        containerItems: [
          {
            container: LinkedIn.selectorIsPrimaryContent,
            items: [
              // Most "Grow" cards
              ':scope > div > div > div > div > section',
              ':scope > div > div > div > div > div > section',
              // "Catch up"
              ':scope > div > div > section',
            ].join(','),
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueCollectionIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#collectionScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#collectionScroller);
      this.#collectionScroller.dispatcher
        .on('changed', this.#onCollectionChanged)
        .on('out-of-range', this.spa.details.focusOnSidebar);

      this.#lastScroller = this.#collectionScroller;
    }

    #initIndividualScroller = () => {
      const what = {
        name: `${this.name} individual`,
        base: this.collections.item,
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

      const how = {
        uidCallback: this.#uniqueIndividualsIdentifier,
        classes: [
          LinkedIn.scrollerSecondaryClassName,
          this.scrollerClassName,
        ],
        autoActivate: true,
        snapToTop: false,
      };

      this.#individualScroller = new NH.nav.Scroller(what, how);
      this.#individualScroller.dispatcher
        .on('changed', this.#onIndividualChanged)
        .on('focused', this.#onIndividualFocused)
        .on('out-of-range', this.#returnToCollection);
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueCollectionIdentifier = (scroller, element) => {
      const me = this.#uniqueCollectionIdentifier.name;
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
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueIndividualsIdentifier = (scroller, element) => {
      const me = this.#uniqueIndividualsIdentifier.name;
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
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~Finder}
     * @returns {NexusHoratio.web.StyleService~ElementMap} Elements to
     * monitor.
     */
    #scrollerFinder = () => {
      const me = this.#scrollerFinder.name;
      this.logger.entered(me);

      const elements = new Map();
      elements.set('tablist',
        document.querySelector(this.ctor.#tablistSelector));

      this.logger.leaving(me, elements);
      return elements;
    }

    #onCollectionChanged = () => {
      const me = this.#onCollectionChanged.name;
      this.logger.entered(me);

      this.#resetIndividuals();
      this.#lastScroller = this.collections;

      this.logger.leaving(me, this.collections.item);
    }

    #resetIndividuals = () => {
      if (this.#individualScroller) {
        this.#individualScroller.destroy();
        this.#individualScroller = null;
      }
      this.individuals;
    }

    #onIndividualChanged = () => {
      this.#lastScroller = this.individuals;
    }

    #onIndividualFocused = () => {
      this.collections.show();
    }

    #returnToCollection = () => {
      this.collections.item = this.collections.item;
    }

  }

  /**
   * Class for handling the Invitation Manager page.
   *
   * While this page does have multiple sections (Manage Invitations and
   * Suggestions for you), the latter is enclosed by the former.  There is no
   * way to highlight the former without including the latter.  So just treat
   * the page as one big long list.
   *
   * @extends module:linkedin-tool~Page
   */
  class InvitationManager extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        // eslint-disable-next-line prefer-regex-literals
        pathname: RegExp('^/mynetwork/invitation-manager/.*', 'u'),
        readySelector: LinkedIn.pageReadySelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.TWO);

      this.addService(VMKeyboardService)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
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
        this.invites.focus();
      }
    );

    showMore = new Shortcut(
      'm',
      'Show more of current invite',
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

    #inviteScroller

    #initScrollers = () => {
      this.#initScrollerStyleService();
      this.#initInviteScroller();
    }

    #initScrollerStyleService = () => {
      const styleConfig = {
        className: this.scrollerClassName,
        finder: this.navbarAndFriendsFinder,
        elementsProcessor: this.navbarAndFriendsElementsProcessor,
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    #initInviteScroller = () => {
      const what = {
        name: `${this.name} cards`,
        containerItems: [
          {
            container: `${LinkedIn.primaryContentSelector}` +
            ' [data-testid="lazy-column"]',
            items: [
              // Standard invites
              `:scope > div[${CKEY}]`,
              // Suggestions for you (but not stuff on the Sent tab)
              ':scope > div > div > div > a:not(:has(> span))',
            ].join(','),
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueInvitationIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#inviteScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#inviteScroller);
      this.#inviteScroller.dispatcher
        .on('out-of-range', this.spa.details.focusOnAside);
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueInvitationIdentifier = (scroller, element) => {
      const me = this.#uniqueInvitationIdentifier.name;
      this.logger.entered(me, element);

      const selector = 'a[href*="/in/"]';
      let content = '';
      const href = element.querySelector(selector)?.href;

      if (href) {
        content = new URL(href).pathname;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

  }

  /**
   * Class for handling the Manage Events page.
   *
   * @extends module:linkedin-tool~Page
   */
  class ManageEvents extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        pathname: '/mynetwork/network-manager/events/',
        readySelector: LinkedIn.pageReadySelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.ONE);

      this.addService(VMKeyboardService)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get cards() {
      return this.#cardsScroller;
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

    firstItem = new Shortcut(
      '<',
      'Go to first card',
      () => {
        this.cards.first();
      }
    );

    lastItem = new Shortcut(
      '>',
      'Go to last card',
      () => {
        this.cards.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Change browser focus to current item',
      () => {
        this.cards.focus();
      }
    );

    #cardsScroller

    #initScrollers = () => {
      this.#initScrollerStyleService();
      this.#initCardsScroller();
    }

    #initScrollerStyleService = () => {
      const styleConfig = {
        className: this.scrollerClassName,
        finder: this.#scrollerFinder,
        elementsProcessor: this.elementsHeightProcessor,
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~Finder}
     * @returns {NexusHoratio.web.StyleService~ElementMap} Elements to
     * monitor.
     */
    #scrollerFinder = () => {
      const me = this.#scrollerFinder.name;
      this.logger.entered(me);

      const elements = new Map();
      elements.set('aside', document.querySelector(LinkedIn.asideSelector));

      this.logger.leaving(me, elements);
      return elements;
    }

    #initCardsScroller = () => {
      const what = {
        name: `${this.name} cards`,
        containerItems: [
          {
            container: 'main',
            items: [
              // Create
              'div:has(> h1)',
              // Events
              'ul > li',
            ].join(','),
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueCardsIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#cardsScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#cardsScroller);
      this.#cardsScroller.dispatcher
        .on('out-of-range', this.spa.details.focusOnAside);
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueCardsIdentifier = (scroller, element) => {
      const me = this.#uniqueCardsIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const label = element
        .querySelector('[aria-label]')
        ?.getAttribute('aria-label');
      const urn = element.querySelector('[data-chameleon-result-urn]')
        ?.dataset.chameleonResultUrn;

      if (label) {
        content = label;
      }
      if (urn) {
        content = urn;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

  }

  /**
   * Class for handling the base Jobs page.
   *
   * This particular page requires a lot of careful monitoring.  Unlike other
   * pages, this one will destroy and recreate HTML elements, often with the
   * exact same content, every time something interesting happens.  Like
   * loading more sections or jobs, or toggling state of a job.
   *
   * @extends module:linkedin-tool~Page
   */
  class Jobs extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        pathname: '/jobs/',
        readySelector: LinkedIn.pageReadySelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.TWO);

      this.addService(VMKeyboardService)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get jobs() {
      if (!this.#jobScroller && this.sections.item) {
        this.#initJobScroller();
      }

      return this.#jobScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
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
        this.jobs?.next();
      }
    );

    prevJob = new Shortcut(
      'p',
      'Previous job',
      () => {
        this.jobs?.prev();
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
        this.#lastScroller.focus();
      }
    );

    openMeatballMenu = new Shortcut(
      '=',
      'Open closest <button>⋯</button> menu',
      () => {
        const el = this.jobs?.item;
        NH.web.clickElement(el, LinkedIn.menuSelectorArray);
      }
    );

    loadMoreSections = new Shortcut(
      'l',
      'Load more sections',
      () => {
        const base = document.querySelector(this.#sectionsContainer);
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

    #jobScroller
    #lastScroller
    #sectionScroller
    #sectionsContainer =
      '[data-testid="JobsHomeFeedModuleListCollection"]';

    #initScrollers = () => {
      this.#initScrollerStyleService();
      this.#initSectionScroller();
    }

    #initScrollerStyleService = () => {
      const styleConfig = {
        className: this.scrollerClassName,
        finder: this.#scrollerFinder,
        elementsProcessor: this.#scrollerElementsProcessor,
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    #initSectionScroller = () => {
      const what = {
        name: `${this.name} sections`,
        containerItems: [
          {
            container: this.#sectionsContainer,
            items: [
              // First few sections
              `:scope > [${CKEY}^="JobsHomeATFModule"] > div > div`,
              // Everything else
              `:scope > div > div[${CKEY}]`,
            ].join(','),
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueSectionIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#sectionScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#sectionScroller);
      this.#sectionScroller.dispatcher
        .on('changed', this.#onSectionChanged)
        .on('out-of-range', this.spa.details.focusOnSidebar);

      this.#lastScroller = this.#sectionScroller;
    }

    #initJobScroller = () => {
      const what = {
        name: `${this.name} entries`,
        base: this.sections.item,
        selectors: [
          [
            // Match your profile - Show all button
            ':scope > * > a',
            // Most job entries
            ':scope > * > * > a',
            // Random "See who's hiring" section
            `:scope div[${CKEY}]:has(> h2) > div`,
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

      const how = {
        uidCallback: this.#uniqueJobIdentifier,
        classes: [
          LinkedIn.scrollerSecondaryClassName,
          this.scrollerClassName,
        ],
        autoActivate: true,
        snapToTop: false,
      };

      this.#jobScroller = new NH.nav.Scroller(what, how);
      this.#jobScroller.dispatcher
        .on('changed', this.#onJobChanged)
        .on('out-of-range', this.#returnToSection);
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~Finder}
     * @returns {NexusHoratio.web.StyleService~ElementMap} Elements to
     * monitor.
     */
    #scrollerFinder = () => {
      const me = this.#scrollerFinder.name;
      this.logger.entered(me);

      const elements = new Map();
      elements.set('div', document.querySelector('main > div'));

      this.logger.leaving(me, elements);
      return elements;
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~ElementsProcessor}
     * @param {NexusHoratio.web.StyleService~ElementMap} elements - Elements
     * to examine.
     * @returns {NexusHoratio.web.StyleService~StyleProperties} Style
     * properties for to contribute.
     */
    #scrollerElementsProcessor = (elements) => {
      const me = this.#scrollerElementsProcessor.name;
      this.logger.entered(me, elements);

      const properties = new Map();

      for (const [key, value] of elements.entries()) {
        switch (key) {
          case 'div':
            if (value) {
              const style = getComputedStyle(value);
              properties.set('scroll-margin-top', style.marginTop);
            }
            break;
          default:
            NH.base.issues.post(
              this.name, me, 'Unsupported element key:', key
            );
        }
      }

      this.logger.leaving(me, properties);
      return properties;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueJobIdentifier = (scroller, element) => {
      const me = this.#uniqueJobIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const key = LinkedIn.ckeyIdentifier(element);

      if (key) {
        content = key;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueSectionIdentifier = (scroller, element) => {
      const me = this.#uniqueSectionIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const key = LinkedIn.ckeyIdentifier(element);

      if (key) {
        content = key;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    #resetJobs = () => {
      const me = this.#resetJobs.name;
      this.logger.entered(me, this.#jobScroller);

      if (this.#jobScroller) {
        this.#jobScroller.destroy();
        this.#jobScroller = null;
      }
      this.jobs;

      this.logger.leaving(me);
    }

    /**
     * Updates {@link Jobs} specific watcher data and removes the jobs
     * {@link NexusHoratio.nav.Scroller Scroller}.
     *
     * @method
     */
    #onSectionChanged = () => {
      const me = this.#onSectionChanged.name;
      this.logger.entered(me);

      this.#resetJobs();
      this.#lastScroller = this.sections;

      this.logger.leaving(me);
    }

    /**
     * Reselects current section, triggering some actions as initial
     * selection.
     *
     * @method
     */
    #returnToSection = () => {
      this.sections.item = this.sections.item;
    }

    #onJobChanged = () => {
      this.#lastScroller = this.jobs;
    }

  }

  /**
   * Class for handling Jobs collections pages.
   *
   * @extends module:linkedin-tool~Page
   */
  class JobsCollections extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        name: 'Jobs Collections (various listings)',
        // eslint-disable-next-line prefer-regex-literals
        pathname: RegExp('^/jobs/(?:collections|search)/.*', 'u'),
        readySelector: LinkedIn.pageReadySelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.ONE);

      this.addService(VMKeyboardService)
        .setShortName(this.name)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get cards() {
      return this.#cardsScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get details() {
      return this.#detailsScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get paginator() {
      return this.#paginationScroller;
    }

    nextJob = new Shortcut(
      'j',
      'Next job card',
      () => {
        this.cards.next();
      }
    );

    prevJob = new Shortcut(
      'k',
      'Previous job card',
      () => {
        this.cards.prev();
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
        this.#lastScroller.focus();
      }
    );

    detailsPane = new Shortcut(
      'd',
      'Move browser focus to the details pane',
      () => {
        NH.web.focusOnTree(document.querySelector(
          'div.jobs-details__main-content'
        ));
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
      'Open the <button>⋯</button> menu',
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
        NH.web.clickElement(this.cards.item, ['button']);
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

    #cardsScroller
    #detailsContainerClassName
    #detailsScroller
    #lastScroller
    #paginationScroller
    #uidDetailsClassRE = /^(?:job-details|jobs)-(?<class>[^_]*)__/u;

    #initScrollers = () => {
      this.#initScrollerStyleService();
      this.#initCardsScroller();
      this.#initPaginationScroller();
      this.#initDetailsScroller();
    }

    #initScrollerStyleService = () => {
      this.#detailsContainerClassName = this.cssClassName(
        ['details', 'container']
      );
      const styleConfig = {
        className: this.#detailsContainerClassName,
        finder: this.#detailsFinder,
        elementsProcessor: this.#detailsElementsProcessor,
        events: ['transitionend'],
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    #initCardsScroller = () => {
      const what = {
        name: `${this.name} cards`,
        containerItems: [
          {
            container: 'div.scaffold-layout__list > div > ul',
            // This selector is also used in #onCardActivate.
            items: ':scope > li',
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueJobIdentifier,
        classes: [LinkedIn.scrollerPrimaryClassName],
        snapToTop: true,
      };

      this.#cardsScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#cardsScroller);
      this.#cardsScroller.dispatcher
        .on('activated', this.#onCardsActivated)
        .on('changed', this.#onCardsChanged);

      this.#lastScroller = this.#cardsScroller;
    }

    #initPaginationScroller = () => {
      const what = {
        name: `${this.name} pagination`,
        containerItems: [
          {
            container: 'div.jobs-search-results-list__pagination > ul',
            // This selector is also used in #onPaginationActivate.
            items: ':scope > li > button',
          },
        ],
      };

      const how = {
        uidCallback: this.#uniquePaginationIdentifier,
        classes: [LinkedIn.scrollerSecondaryClassName],
        snapToTop: false,
        containerTimeout: 1000,
        observeAttributes: true,
      };

      this.#paginationScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#paginationScroller);
      this.#paginationScroller.dispatcher
        .on('activated', this.#onPaginationActivated)
        .on('changed', this.#onPaginationChanged);
    }

    #initDetailsScroller = () => {
      const what = {
        name: `${this.name} details`,
        containerItems: [
          {
            container: 'div.jobs-details__main-content',
            items: ':scope > div, :scope > section',
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueDetailsIdentifier,
        classes: [LinkedIn.scrollerSecondaryClassName],
        snapToTop: true,
      };

      this.#detailsScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#detailsScroller);
      this.#detailsScroller.dispatcher
        .on('changed', this.#onDetailsChanged);
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~ElementsProcessor}
     * @param {NexusHoratio.web.StyleService~ElementMap} elements - Elements
     * to examine.
     * @returns {NexusHoratio.web.StyleService~StyleProperties} Style
     * properties for to contribute.
     */
    #detailsElementsProcessor = (elements) => {
      const me = this.#detailsElementsProcessor.name;
      this.logger.entered(me, elements);

      let height = 0;
      let padding = '0px';
      const properties = new Map();

      for (const [key, value] of elements.entries()) {
        switch (key) {
          case 'container':
            if (value) {
              value.classList.add(this.#detailsContainerClassName);
              padding = getComputedStyle(value).paddingTop;
            }
            break;
          case 'header':
            if (value) {
              const header = getComputedStyle(value);
              if (header.visibility === 'visible') {
                height = value.offsetHeight;
              }
            }
            break;
          default:
            NH.base.issues.post(
              this.name, me, 'Unsupported element key:', key
            );
        }
      }

      properties.set('scroll-padding-top', `calc(${padding} + ${height}px)`);

      this.logger.leaving(me, properties);
      return properties;
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~Finder}
     * @returns {NexusHoratio.web.StyleService~ElementMap} Elements to
     * monitor.
     */
    #detailsFinder = () => {
      const me = this.#detailsFinder.name;
      this.logger.entered(me);

      const elements = new Map();

      elements.set('container', document.querySelector(
        '.jobs-search__job-details--wrapper'
      ));
      elements.set('header', document.querySelector(
        '.job-details-jobs-unified-top-card__sticky-header'
      ));

      this.logger.leaving(me, elements);
      return elements;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueDetailsIdentifier = (scroller, element) => {
      const me = this.#uniqueDetailsIdentifier.name;
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
          .map(x => this.#uidDetailsClassRE.exec(x)?.groups.class)
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
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueJobIdentifier = (scroller, element) => {
      const me = this.#uniqueJobIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const jobId = element.dataset.occludableJobId;

      if (jobId) {
        content = jobId;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniquePaginationIdentifier = (scroller, element) => {
      const me = this.#uniquePaginationIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const label = element.getAttribute('aria-label');

      if (label) {
        content = label;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    #onCardsActivated = async () => {
      const me = this.#onCardsActivated.name;
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
        this.cards.gotoUid(this.#uniqueJobIdentifier(item));
        this.logger.log('and went to it');
      } catch (e) {
        this.logger.log('Job card matching URL not found, staying put');
      }

      this.logger.leaving(me);
    }

    #onCardsChanged = () => {
      const me = this.#onCardsChanged.name;
      this.logger.entered(me, this.cards.item);

      NH.web.clickElement(this.cards.item, ['div[data-job-id]']);
      this.details.first();
      this.#lastScroller = this.cards;

      this.logger.leaving(me);
    }

    #onPaginationActivated = async () => {
      const me = this.#onPaginationActivated.name;
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

    #onPaginationChanged = () => {
      this.#lastScroller = this.paginator;
    }

    #onDetailsChanged = () => {
      this.#lastScroller = this.details;
    }

  }

  /**
   * Class for handling the direct Jobs view.
   *
   * @extends module:linkedin-tool~Page
   */
  class JobsView extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        // eslint-disable-next-line prefer-regex-literals
        pathname: RegExp('^/jobs/view/\\d+.*', 'u'),
        readySelector: '#add-small',
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.TWO);

      this.addService(VMKeyboardService)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get cards() {
      return this.#cardScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get entries() {
      if (!this.#entryScroller && this.cards.item) {
        this.#initEntryScroller();
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
        this.entries?.next();
      }
    );

    prevEntry = new Shortcut(
      'p',
      'Previous entry in a section',
      () => {
        this.entries?.prev();
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
        this.#lastScroller.focus();
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
        const el = document.querySelector(this.#jobCardSelector);
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
        const el = document.querySelector(this.#jobCardSelector);
        NH.web.clickElement(el, [
          // Fragile, as currently only button in the card without an icon.
          'button:not(:has(svg))',
        ]);
      }
    );

    #cardScroller
    #cardsContainer = '[data-testid="lazy-column"]';
    #entryScroller
    #jobCardSelector = `${this.#cardsContainer} > div:first-child`;
    #lastScroller

    #initScrollers = () => {
      this.#initScrollerStyleService();
      this.#initCardsScroller();
    }

    #initScrollerStyleService = () => {
      const styleConfig = {
        className: this.scrollerClassName,
        finder: this.#scrollerFinder,
        elementsProcessor: this.elementsHeightProcessor,
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    #initCardsScroller = () => {
      const what = {
        name: `${this.name} cards`,
        containerItems: [
          {
            container: this.#cardsContainer,
            items: [
              // Main content
              ':scope > :first-child',
              // Rest
              ':scope > :not(:first-child) > *',
            ].join(','),
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueCardIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#cardScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#cardScroller);
      this.#cardScroller.dispatcher
        .on('changed', this.#onCardChanged);

      this.#lastScroller = this.#cardScroller;
    }

    #initEntryScroller = () => {
      const what = {
        name: `${this.name} entries`,
        base: this.cards.item,
        selectors: [
          // More jobs - Matches grid and footer
          `:scope[${CKEY}^="JobDetailsSimilarJobsSlot"] a`,
        ],
      };

      const how = {
        uidCallback: this.#uniqueEntryIdentifier,
        classes: [
          LinkedIn.scrollerSecondaryClassName,
          this.scrollerClassName,
        ],
        autoActivate: true,
        snapToTop: false,
      };

      this.#entryScroller = new NH.nav.Scroller(what, how);
      this.#entryScroller.dispatcher
        .on('changed', this.#onEntryChanged)
        .on('out-of-range', this.#returnToCard);
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~Finder}
     * @returns {NexusHoratio.web.StyleService~ElementMap} Elements to
     * monitor.
     */
    #scrollerFinder = () => {
      const me = this.#scrollerFinder.name;
      this.logger.entered(me);

      const elements = new Map();

      elements.set('toolbar', document.querySelector('[role="toolbar"]'));

      this.logger.leaving(me, elements);
      return elements;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueCardIdentifier = (scroller, element) => {
      const me = this.#uniqueCardIdentifier.name;
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
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueEntryIdentifier = (scroller, element) => {
      const me = this.#uniqueEntryIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const href = element.href;

      if (href) {
        content = new URL(href).searchParams.get('currentJobId');
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    #onCardChanged = () => {
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

    #onEntryChanged = () => {
      this.#lastScroller = this.entries;
    }

    #returnToCard = () => {
      this.cards.item = this.cards.item;
    }

  }

  /**
   * Class for handling the Messaging page.
   *
   * @extends module:linkedin-tool~Page
   */
  class Messaging extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        // eslint-disable-next-line prefer-regex-literals
        pathname: RegExp('^/messaging/.*', 'u'),
        readySelector: LinkedIn.asideSelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.ONE);

      this.addService(VMKeyboardService)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get convoCards() {
      return this.#convoCardScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get messages() {
      if (!this.#messageScroller && this.convoCards.item) {
        this.#initMessageScroller();
      }

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
        this.#lastScroller.focus();
      }
    );

    loadMoreConversations = new Shortcut(
      'l',
      'Load more conversations',
      () => {
        const me = this.loadMoreConversations.name;
        this.logger.entered(me);

        // This button has no distinguishing features, but seems to be the
        // last item in this list, and only one immediately a list item.
        NH.web.clickElement(document,
          [`${this.#convoCardsList} > li > button`]);

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
        const me = this.searchMessages.name;
        this.logger.entered(me);

        NH.web.focusOnElement(
          document.querySelector('#search-conversations')
        );

        this.logger.leaving(me);
      }
    );

    openMeatballMenu = new Shortcut(
      '=',
      'Open closest <button>⋯</button> menu (tricky, ' +
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
        const me = this.newMessage.name;
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

    static #messageBoxSelector = 'main div.msg-form__contenteditable';

    static #messagingFilterSelector =
      '.msg-cross-pillar-inbox-filters-v3__container';

    static #messagingOptionsSelector =
      'button[aria-label="See more messaging options"]';

    static #sendToggleSelector = 'button.msg-form__send-toggle';

    #activator
    #convoCardScroller
    #convoCardsList = 'main' +
      ' ul.msg-conversations-container__conversations-list';

    #lastScroller
    #messageScroller

    #initScrollers = () => {
      this.#initCardsScroller();
    }

    #initCardsScroller = () => {
      const what = {
        name: `${this.name} conversations`,
        containerItems: [
          {
            container: this.#convoCardsList,
            items: ':scope > li.msg-conversations-container__pillar',
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueConvoCardsIdentifier,
        classes: [LinkedIn.scrollerPrimaryClassName],
        snapToTop: true,
      };

      this.#convoCardScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#convoCardScroller);
      this.#convoCardScroller.dispatcher
        .on('activated', this.#onConvoCardActivated)
        .on('changed', this.#onConvoCardChanged);
    }

    #initMessageScroller = () => {
      const what = {
        name: `${this.name} messages`,
        containerItems: [
          {
            container: 'ul.msg-s-message-list-content',
            items: ':scope' +
              ' > li.msg-s-message-list__event > div[data-event-urn]',
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueMessageIdentifier,
        classes: [LinkedIn.scrollerSecondaryClassName],
        autoActivate: true,
        snapToTop: false,
      };

      this.#messageScroller = new NH.nav.Scroller(what, how);
      this.#messageScroller.dispatcher
        .on('changed', this.#onMessageChanged);
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueConvoCardsIdentifier = (scroller, element) => {
      const me = this.#uniqueConvoCardsIdentifier.name;
      this.logger.entered(me, element);

      // XXX: As of 2026-04-14, there are no distinguishing features in the
      // cards.  Unlike the similar UI for JobsCollections, there is no easy
      // mapping between the URL and the card.  The img.src looks interesting,
      // but not really.  It is possible to have multiple cards for the
      // person, making using the URL unsuitable.  And some folks do not have
      // photos, so get the same placeholder data: scheme.
      const content = scroller.defaultUid(element);

      this.logger.leaving(me);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueMessageIdentifier = (scroller, element) => {
      const me = this.#uniqueMessageIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const urn = element.dataset.eventUrn;

      if (urn) {
        content = urn;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @typedef {object} Point
     * @memberof module:linkedin-tool~Messaging~
     * @property {number} x - Horizontal location in pixels.
     * @property {number} y - Vertical location in pixels.
     * @property {external:Element} element - Associated element.
     */

    /**
     * @method
     * @param {external:Element} element - Element to examine.
     * @returns {module:linkedin-tool~Messaging~Point} Center of the element.
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
     * @method
     * @param {module:linkedin-tool~Messaging~Point} one - First point.
     * @param {module:linkedin-tool~Messaging~Point} two - Second point.
     * @returns {number} Distance between the points in pixels.
     */
    #distanceBetweenPoints = (one, two) => {
      const me = this.#distanceBetweenPoints.name;
      this.logger.entered(me, one, two);

      const xd = one.x - two.x;
      const yd = one.y - two.y;
      const distance = Math.sqrt((xd * xd) + (yd * yd));

      this.logger.leaving(me, distance);
      return distance;
    }

    #onConvoCardActivated = async () => {
      const me = this.#onConvoCardActivated.name;
      this.logger.entered(me);

      await this.#findActiveConvo();

      this.logger.leaving(me);
    }

    #onConvoCardChanged = () => {
      const me = this.#onConvoCardChanged.name;
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

    #onMessageChanged = () => {
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
        // Page loading could still be happening, preventing the previous
        // goto() from doing anything useful.  Try again on the next loop.
        setTimeout(() => {
          this.convoCards.focus();
        }, 0);
      } catch (e) {
        this.logger.log('Active conversation card not found, staying put');
      }

      this.logger.leaving(me);
    }

  }

  /**
   * Class for handling the Notifications page.
   *
   * @extends module:linkedin-tool~Page
   */
  class Notifications extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        pathname: '/notifications/',
        readySelector: LinkedIn.pageReadySelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.TWO);

      this.addService(VMKeyboardService)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get notifications() {
      return this.#notificationScroller;
    }

    nextNotification = new Shortcut(
      'j',
      'Next item',
      () => {
        this.notifications.next();
      }
    );

    prevNotification = new Shortcut(
      'k',
      'Previous item',
      () => {
        this.notifications.prev();
      }
    );

    firstNotification = new Shortcut(
      '<',
      'Go to first item',
      () => {
        this.notifications.first();
      }
    );

    lastNotification = new Shortcut(
      '>',
      'Go to last item',
      () => {
        this.notifications.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Change browser focus to current item',
      () => {
        this.notifications.focus();
      }
    );

    loadMoreNotifications = new Shortcut(
      'l',
      'Load more notifications',
      () => {
        const msg = 'Needs to be reimplemented.';
        const opts = {
          cause: {
            code: NH.base.Code.UNAVAILABLE,
            reason: 'Issue #424',
          },
        };
        throw new Error(msg, opts);
      }
    );

    openMeatballMenu = new Shortcut(
      '=',
      'Open the <button>⋯</button> menu',
      () => {
        NH.web.clickElement(
          this.notifications.item, LinkedIn.menuSelectorArray
        );
      }
    );

    toggleItem = new Shortcut(
      'X',
      'Toggle current notification deletion',
      async () => {
        const me = this.toggleItem.name;
        this.logger.entered(me);

        const el = this.notifications.item;
        // Both present and dismissed notifications have an anchor.
        const undoSelector = 'p > a';
        const undo = el?.querySelector(undoSelector);
        if (undo) {
          undo.click();
        } else if (el) {
          await this.dismissFloatingUiPortal();
          NH.web.clickElement(el, LinkedIn.menuSelectorArray);
          const ui = await NH.web.waitForSelector(
            LinkedIn.floatingUiPortalSelector, 0
          );
          ui.querySelector('[role="menuitem"]:has([id^="trash"])')
            ?.click();
        }

        this.logger.leaving(me);
      }
    );

    nextNotificationPlus = new Shortcut(
      'J',
      'Toggle current notification deletion, then next item',
      async () => {
        await this.toggleItem();
        this.nextNotification();
      }
    );

    prevNotificationPlus = new Shortcut(
      'K',
      'Toggle current notification deletion, then previous item',
      async () => {
        await this.toggleItem();
        this.prevNotification();
      }
    );

    #notificationScroller

    #initScrollers = () => {
      this.#initScrollerStyleService();
      this.#initNotificationScroller();
    }

    #initScrollerStyleService = () => {
      const styleConfig = {
        className: this.scrollerClassName,
        finder: this.#scrollerFinder,
        elementsProcessor: this.#scrollerElementsProcessor,
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    #initNotificationScroller = () => {
      const what = {
        name: `${this.name} cards`,
        containerItems: [
          {
            container: `main section > div > div:not([${CKEY}])`,
            items: [
              // Filter tablist
              ':scope > div:not([data-sdui-screen])',
              // Most items
              ':scope [data-testid="lazy-column"] > div',
            ].join(','),
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueNotificationIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#notificationScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#notificationScroller);
      this.#notificationScroller.dispatcher
        .on('focused', this.#onNotificationsFocused)
        .on('out-of-range', this.spa.details.focusOnSidebar);
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~Finder}
     * @returns {NexusHoratio.web.StyleService~ElementMap} Elements to
     * monitor.
     */
    #scrollerFinder = () => {
      const me = this.#scrollerFinder.name;
      this.logger.entered(me);

      const elements = new Map();
      elements.set('div', document.querySelector('main > div'));

      this.logger.leaving(me, elements);
      return elements;
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~ElementsProcessor}
     * @param {NexusHoratio.web.StyleService~ElementMap} elements - Elements
     * to examine.
     * @returns {NexusHoratio.web.StyleService~StyleProperties} Style
     * properties for to contribute.
     */
    #scrollerElementsProcessor = (elements) => {
      const me = this.#scrollerElementsProcessor.name;
      this.logger.entered(me, elements);

      const properties = new Map();

      for (const [key, value] of elements.entries()) {
        switch (key) {
          case 'div':
            if (value) {
              const style = getComputedStyle(value);
              properties.set('scroll-margin-top', style.marginTop);
            }
            break;
          default:
            NH.base.issues.post(
              this.name, me, 'Unsupported element key:', key
            );
        }
      }

      this.logger.leaving(me, properties);
      return properties;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueNotificationIdentifier = (scroller, element) => {
      const me = this.#uniqueNotificationIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const paths = new Set(element.querySelectorAll('a')
        .values()
        .map(x => new URL(x))
        .map(x => `${x.pathname}${x.search}`));

      if (paths.size) {
        content = paths.values()
          .join();
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    #onTablistChange = () => {
      setTimeout(this.#forceNotificationsFocus, 0);
    }

    #forceNotificationsFocus = () => {
      this.notifications.focus();
    }

    #onNotificationsFocused = () => {
      const item = this.notifications.item;
      if (item) {
        const el = item.querySelector('input:checked');
        if (el) {
          item.addEventListener('click', this.#onTablistChange);
          el.focus();
        } else {
          [...item.querySelectorAll('a')]
            .at(NH.base.LAST_ITEM)
            .focus();
        }
      }
    }

  }

  /**
   * Class for handling the Profile page.
   *
   * @extends module:linkedin-tool~Page
   */
  class Profile extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        // eslint-disable-next-line prefer-regex-literals
        pathname: RegExp('^/in/.*', 'u'),
        // This is the down arrow in the footer "Select language" dropdown.
        /**
         * @todo [(#436)](https://github.com/nexushoratio/userscripts/issues/436)
         * Remove `#caret-medium` after some time.
         */
        readySelector: 'select ~ svg[id^="caret-down"], #caret-medium',
        readySelectorTimeout: 5000,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.TWO);

      this.addService(VMKeyboardService)
        .addInstance(this);

      spa.details.dispatcher
        .on('activated', this.#onSpaActivated);

      this.#initScrollers();
    }

    /**
     * Different ways of computing UIDs for entry elements.
     * @readonly
     * @enum {Symbol}
     */
    UidMode = {
      ANCHOR: Symbol.for('anchor'),
      ANCHOR_FEED: Symbol.for('anchorFeed'),
      ANCHOR_GROUPS: Symbol.for('anchorGroups'),
      ANCHOR_LEARNING: Symbol.for('anchorLearning'),
      ANCHOR_NEWSLETTERS: Symbol.for('anchorNewsletters'),
      ANCHOR_OVERLAY: Symbol.for('anchorOverlay'),
      ANCHOR_PROFILE: Symbol.for('anchorProfile'),
      ANCHOR_PULSE: Symbol.for('anchorPulse'),
      ANCHOR_SHOWCASE: Symbol.for('anchorShowcase'),
      ARIA_LABEL: Symbol.for('ariaLabel'),
      CKEY: Symbol.for('ckey'),
      COMMENT_URN: Symbol.for('commentUrn'),
      COMPANY: Symbol.for('company'),
      DEFAULT: Symbol.for('default'),
      FALLBACK: Symbol.for('fallback'),
      FOOTER: Symbol.for('footer'),
      HREF: Symbol.for('href'),
      MULTI_IMG: Symbol.for('multiImg'),
      SAFETY: Symbol.for('safety'),
      SCHOOL: Symbol.for('school'),
      TEST_ID: Symbol.for('testId'),
    };

    /** @type {NexusHoratio.nav.Scroller} */
    get entries() {
      if (!this.#entryScroller && this.sections.item) {
        this.#initEntryScroller();
      }

      return this.#entryScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
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

    nextEntry = new Shortcut(
      'n',
      'Next entry in a section',
      () => {
        this.entries?.next();
      }
    );

    prevEntry = new Shortcut(
      'p',
      'Previous entry in a section',
      () => {
        this.entries?.prev();
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
        this.#lastScroller.focus();
      }
    );

    showMore = new Shortcut(
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

    /**
     * Create a CSS child combinator selector of DIVs.
     *
     * @method
     * @param {number} n - The number of DIVs in the selector.
     * @returns {string} N divs like "div > div > ... > div".
     */
    div = (n) => {
      const a = Array(n)
        .fill('div');
      return a.join(' > ');
    }

    #arrowRight = ':has(svg[id^="arrow-right"])';
    #arrowRightNot = `:not(${this.#arrowRight})`;
    #checkingPartialOrder = false

    /* eslint-disable no-magic-numbers */
    #div3 = this.div(3);
    #div4 = this.div(4);
    #div5 = this.div(5);
    #div6 = this.div(6);
    #div7 = this.div(7);
    /* eslint-enable */

    #divAnchorNoArrowRight = `div > a${this.#arrowRightNot}`;
    #divSectionDiv3 = `div > section > ${this.#div3}`;
    #entriesCurrentModes
    #entriesCurrentUid
    #entriesScrollerConfigDefault = Symbol('default');
    #entriesScrollerConfigs = new Map();
    #entriesSelectorAbout = [
      // Fairly simple layout
      `:scope > ${this.#divSectionDiv3}:has(> p) > *`,
    ].join(',');

    #entriesSelectorActivity = [
      // ANCHOR_FEED
      `div[${CKEY}*="posts"]` +
        ' [data-testid="carousel-child-container"] > * > *',
      // HREF
      `div[${CKEY}*="comments"] ${this.#divAnchorNoArrowRight}`,
      // HREF
      `div[${CKEY}*="videos"] ${this.#divAnchorNoArrowRight}`,
      // IMG
      `div[${CKEY}*="images"] ${this.#divAnchorNoArrowRight}`,
      // HREF
      `div[${CKEY}*="articles"] ${this.#divAnchorNoArrowRight}`,
      // Newsletters have both subscribe and posts subsections
      // ANCHOR
      `div[${CKEY}*="newsletters"] div:has(> a[href*="/newsletters/"])`,
      // HREF
      `div[${CKEY}*="newsletters"] div > a[href*="/pulse/"]`,
      // HREF
      `div[${CKEY}*="events"] ${this.#divAnchorNoArrowRight}`,
      // ANCHOR_FEED
      `div[${CKEY}*="documents"] > div > div > div:not(:has(> a > span))`,
    ].join(',');

    #entriesSelectorAnalytics = [
      `:scope:has(> ${this.#div3} > a[href$="/dashboard/"])` +
        ` a${this.#arrowRightNot}`,
    ].join(',');

    #entriesSelectorCauses = [
      // Skip the header.
      ':scope > div > section > div > div:not(:has(> h2))',
    ].join(',')

    #entriesSelectorCertification = [
      // Simple layout
      `:scope > ${this.#divSectionDiv3} > ${this.#div3}`,
    ].join(',');

    /**
     * @todo [(#392)](https://github.com/nexushoratio/userscripts/issues/392)
     * The rare self promotion offering showed up and was able to tune, but
     * will likely need tuning for the "End users" variant.
     */
    #entriesSelectorConnectedAccounts = [
      // Two layouts discovered so far:
      // * Self promotion
      `:scope > ${this.#divSectionDiv3} > ${this.#div4}`,
      `:scope > ${this.#divSectionDiv3} > div > div > a`,
      // * End users
      `:scope > ${this.#divSectionDiv3} > a`,
    ].join(',');

    #entriesSelectorCourses = [
      // Simple layout
      `:scope > ${this.#divSectionDiv3} > div > div`,
    ].join(',')

    #entriesSelectorDefault = [
      // Default catches the edit button on own page.
      `:scope > ${this.#div4}`,
    ].join(',')

    #entriesSelectorEducation = [
      // Sections with footers are one div deeper.
      `:scope > ${this.#divSectionDiv3} > ${this.#div3}[${CKEY}]`,
      `:scope > ${this.#divSectionDiv3} > ${this.#div4}[${CKEY}]`,
    ].join(',');

    #entriesSelectorExperience = [
      // Simple layout
      `:scope > ${this.#divSectionDiv3} > div > div`,
    ].join(',');

    #entriesSelectorFeatured = [
      // Simple carousel
      '[data-testid="carousel-child-container"] > * > *',
    ].join(',');

    #entriesSelectorFooter = [
      // "Show all" buttons
      `hr ~ div > a${this.#arrowRight}`,
    ].join(',');

    #entriesSelectorHighlights = [
      // Simple layout (but does need to be div4 for the few with a footer)
      `:scope > ${this.#divSectionDiv3} > ${this.#div4}`,
    ].join(',');

    #entriesSelectorHonors = [
      // Simple layout
      `:scope > ${this.#divSectionDiv3} > ${this.#div3}`,
    ].join(',')

    #entriesSelectorInterests = [
      // Simple layout, but deep due to multiple tab panels.
      `:scope > ${this.#div6} > ${this.#div3}`,
    ].join(',')

    #entriesSelectorLanguages = [
      // Simple layout
      `:scope > ${this.#divSectionDiv3} > ${this.#div3}`,
    ].join(',')

    #entriesSelectorOrganizations = [
      // Simple layout
      `:scope > ${this.#divSectionDiv3} > ${this.#div3}`,
    ].join(',')

    #entriesSelectorPatents = [
      // Simply layout (was not always this way)
      `:scope > ${this.#divSectionDiv3} > ${this.#div3}`,
    ].join(',')

    #entriesSelectorProjects = [
      // Simple layout
      `:scope > ${this.#divSectionDiv3} > ${this.#div3}`,
    ].join(',')

    #entriesSelectorPublications = [
      // Simply layout (was not always this way)
      `:scope > ${this.#divSectionDiv3} > ${this.#div3}`,
    ].join(',')

    #entriesSelectorRecommendations = [
      `:scope > ${this.#divSectionDiv3}` +
        ` > ${this.#div3}:not(:has(> div > input))`,
    ].join(',')

    #entriesSelectorServices = [
      // Some users have a carousel.
      `:scope > ${this.#divSectionDiv3} > div` +
        ' > div:not([data-testid="carousel-viewport-container"]) > *',
      ':scope [data-testid="carousel-child-container"] > *',
    ].join(',');

    #entriesSelectorSkills = [
      // Filter out the divider, which also has a CKEY.
      `:scope > ${this.#divSectionDiv3} > div > div:not(:has(> hr))`,
    ].join(',')

    #entriesSelectorSuggestedForYou = [
      // May or may not be a list/carousel
      `:scope > ${this.#divSectionDiv3}` +
        ':not(:has(> h2)) > div',
    ].join(',');

    #entriesSelectorTestScores = [
      // Simple layout
      `:scope > ${this.#divSectionDiv3} > div > div`,
    ].join(',')

    #entriesSelectorTopcard = [
      // Most items
      `:scope > ${this.#divSectionDiv3} > * > :is(div, a)` +
        // Skip premium badge
        ':not(:has(> a > svg))' +
        // Skip premium footer
        ':not(:has(> svg[id^="premium"]))' +
        // Skip carousels
        ':not([data-testid="carousel-viewport-container"])',
      // Buttons for Premium background carousel
      ':scope [data-testid="pagination-controls-list"]',
      // Links to external websites
      `:scope > ${this.#divSectionDiv3} > p`,
      // Carousels (private edit footer, DIVs at different levels)
      ':scope' +
        ' [data-testid="carousel-child-container"]' +
        ' div:has(> a[href*="/in/"])',
    ].join(',');

    #entriesSelectorVolunteering = [
      // Simple layout
      ':scope [role="listitem"]',
    ].join(',')

    #entriesUidModeAnchorSelector
    #entryScroller
    #hasDivCheckbox = ':has(> div > div > input[type="checkbox"])';
    #lastScroller
    #modeUidSelectorId
    #modeUidSelectorTestId
    #sectionScroller
    #sectionUidPrefixes = new Map();

    // Known sections in "curr next" pairs, suitable for tsort.
    #sectionsPartialOrder = new Set([

      'About, Activity',
      'About, ExperienceTopLevelSection',
      'About, Featured',
      'About, Services',
      'Activity, ExperienceTopLevelSection',
      'Activity, Skills',
      'Analytics, About',
      'CertificationTopLevel, CourseTopLevelSection',
      'CertificationTopLevel, HonorsTopLevel',
      'CertificationTopLevel, Interests',
      'CertificationTopLevel, Organizations',
      'CertificationTopLevel, Patents',
      'CertificationTopLevel, Projects',
      'CertificationTopLevel, PublicationTopLevelSection',
      'CertificationTopLevel, RecommendationsTopLevel',
      'CertificationTopLevel, Skills',
      'CertificationTopLevel, VolunteerExperienceTopLevel',
      'ConnectedAccountsTopLevel, CertificationTopLevel',
      'ConnectedAccountsTopLevel, RecommendationsTopLevel',
      'ConnectedAccountsTopLevel, Skills',
      'CourseTopLevelSection, Causes',
      'CourseTopLevelSection, HonorsTopLevel',
      'CourseTopLevelSection, Interests',
      'CourseTopLevelSection, LanguageTopLevel',
      'CourseTopLevelSection, Organizations',
      'EducationTopLevelSection, Causes',
      'EducationTopLevelSection, CertificationTopLevel',
      'EducationTopLevelSection, ConnectedAccountsTopLevel',
      'EducationTopLevelSection, CourseTopLevelSection',
      'EducationTopLevelSection, HonorsTopLevel',
      'EducationTopLevelSection, Interests',
      'EducationTopLevelSection, LanguageTopLevel',
      'EducationTopLevelSection, Organizations',
      'EducationTopLevelSection, Patents',
      'EducationTopLevelSection, Projects',
      'EducationTopLevelSection, PublicationTopLevelSection',
      'EducationTopLevelSection, RecommendationsTopLevel',
      'EducationTopLevelSection, Skills',
      'EducationTopLevelSection, VolunteerExperienceTopLevel',
      'ExperienceTopLevelSection, Causes',
      'ExperienceTopLevelSection, CertificationTopLevel',
      'ExperienceTopLevelSection, EducationTopLevelSection',
      'ExperienceTopLevelSection, Interests',
      'ExperienceTopLevelSection, RecommendationsTopLevel',
      'ExperienceTopLevelSection, Skills',
      'ExperienceTopLevelSection, VolunteerExperienceTopLevel',
      'Featured, Activity',
      'HonorsTopLevel, Interests',
      'HonorsTopLevel, LanguageTopLevel',
      'HonorsTopLevel, Organizations',
      'HonorsTopLevel, TestScoresTopLevel',
      'Interests, Causes',
      'LanguageTopLevel, Causes',
      'LanguageTopLevel, Interests',
      'LanguageTopLevel, Organizations',
      'Organizations, Causes',
      'Organizations, Interests',
      'Patents, CourseTopLevelSection',
      'Patents, HonorsTopLevel',
      'Patents, Interests',
      'Projects, Causes',
      'Projects, CourseTopLevelSection',
      'Projects, Interests',
      'Projects, LanguageTopLevel',
      'Projects, PublicationTopLevelSection',
      'Projects, RecommendationsTopLevel',
      'Projects, Skills',
      'Projects, VolunteerExperienceTopLevel',
      'PublicationTopLevelSection, Causes',
      'PublicationTopLevelSection, CourseTopLevelSection',
      'PublicationTopLevelSection, HonorsTopLevel',
      'PublicationTopLevelSection, Interests',
      'PublicationTopLevelSection, LanguageTopLevel',
      'PublicationTopLevelSection, Organizations',
      'PublicationTopLevelSection, Patents',
      'RecommendationsTopLevel, Causes',
      'RecommendationsTopLevel, CourseTopLevelSection',
      'RecommendationsTopLevel, HonorsTopLevel',
      'RecommendationsTopLevel, Interests',
      'RecommendationsTopLevel, LanguageTopLevel',
      'RecommendationsTopLevel, Organizations',
      'RecommendationsTopLevel, Patents',
      'RecommendationsTopLevel, PublicationTopLevelSection',
      'SalesInsightsOrHighlights, About',
      'SalesInsightsOrHighlights, Activity',
      'Services, Activity',
      'Services, Featured',
      'Skills, CourseTopLevelSection',
      'Skills, HonorsTopLevel',
      'Skills, Interests',
      'Skills, LanguageTopLevel',
      'Skills, Organizations',
      'Skills, Patents',
      'Skills, PublicationTopLevelSection',
      'Skills, RecommendationsTopLevel',
      'SuggestedForYou, Analytics',
      'TestScoresTopLevel, Causes',
      'TestScoresTopLevel, LanguageTopLevel',
      'Topcard, About',
      'Topcard, Activity',
      'Topcard, Analytics',
      'Topcard, EducationTopLevelSection',
      'Topcard, Featured',
      'Topcard, SalesInsightsOrHighlights',
      'Topcard, SimilarTo',
      'Topcard, SuggestedForYou',
      'VolunteerExperienceTopLevel, CourseTopLevelSection',
      'VolunteerExperienceTopLevel, HonorsTopLevel',
      'VolunteerExperienceTopLevel, Interests',
      'VolunteerExperienceTopLevel, LanguageTopLevel',
      'VolunteerExperienceTopLevel, Organizations',
      'VolunteerExperienceTopLevel, PublicationTopLevelSection',
      'VolunteerExperienceTopLevel, RecommendationsTopLevel',
      'VolunteerExperienceTopLevel, Skills',

    ]);

    #uidModeHrefs

    #initScrollers = () => {
      this.#initModeToUidHelpers();
      this.#initEntryScrollerConfigs();
      this.#initScrollerStyleService();
      this.#initSectionScroller();
    }

    /**
     * Create a CSS attribute selector with an ignore list.
     *
     * @example
     * [x]:not([[x]="foo"]):not([x]="bar")
     *
     * @method
     * @param {string} attr - Attribute.
     * @param {string[]} ignore - Values to ignore.
     * @returns {string} CSS selector.
     */
    #modeAttrHelperSelector = (attr, ignore) => {
      const positive = `[${attr}]`;
      const negative = ignore.map(x => `:not([${attr}="${x}"])`)
        .join('');
      const ret = positive + negative;
      return ret;
    }

    #initModeToUidHelpers = () => {
      this.#modeUidSelectorId = this.#modeAttrHelperSelector('id', [
        'calendar-small',
        'company-accent-4',
        'link-external-small',
        'school-accent-4',
      ]);
      this.#modeUidSelectorTestId = this.#modeAttrHelperSelector(
        'data-testid', [
          'expandable-text-box',
          'expandable-text-button',
        ]
      );
      this.#uidModeHrefs = new Map([
        [this.UidMode.ANCHOR_FEED, 'feed'],
        [this.UidMode.ANCHOR_GROUPS, 'groups'],
        [this.UidMode.ANCHOR_LEARNING, 'learning'],
        [this.UidMode.ANCHOR_NEWSLETTERS, 'newsletters'],
        [this.UidMode.ANCHOR_PROFILE, 'in'],
        [this.UidMode.ANCHOR_PULSE, 'pulse'],
        [this.UidMode.ANCHOR_SHOWCASE, 'showcase'],
        [this.UidMode.COMPANY, 'company'],
        [this.UidMode.SAFETY, 'safety'],
        [this.UidMode.SCHOOL, 'school'],
      ].map(x => [x[0], {href: `[href*="/${x[1]}/"]`}]));

      this.#entriesUidModeAnchorSelector = [
        'a',
        ':not([href$="#"])',
      ].concat(this.#uidModeHrefs.values()
        .map(x => `:not(${x.href})`)
        .toArray())
        .join('');
    }

    #initScrollerStyleService = () => {
      const styleConfig = {
        className: this.scrollerClassName,
        finder: this.#scrollerFinder,
        elementsProcessor: this.elementsHeightProcessor,
        events: ['transitionend'],
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    #initSectionScroller = () => {
      const what = {
        name: `${this.name} sections`,
        containerItems: [
          {
            container: '[data-testid="lazy-column"]',
            items: [
              // Most sections
              `:scope div[${CKEY}^="com.linkedin.sdui.profile.card."]`,
              // Analytics (aka Dashboard)
              /**
               * @todo [(#445)](https://github.com/nexushoratio/userscripts/issues/445)
               * Retire the first version after a while.
               */
              ':scope > div[id^="profileCards"]' +
                ` > div:not([${CKEY}^="com.linkedin.sdui.profile.card."])` +
                ' > div > section',
              ':scope > div > div[id^="profileCards"]' +
                ` > div:not([${CKEY}^="com.linkedin.sdui.profile.card."])` +
                ' > div > section',
              // Interests
              ':scope div[id^="profileCards"] > div > section',
            ].join(','),
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueSectionIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#sectionScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#sectionScroller);
      this.#sectionScroller.dispatcher
        .on('changed', this.#onSectionsChanged)
        .on('focused', this.#onSectionsFocused);

      this.#lastScroller = this.#sectionScroller;
    }

    #initEntryScrollerConfigs = () => {  // eslint-disable-line max-lines-per-function, max-statements
      this.#entriesScrollerConfigs.set(
        this.#entriesScrollerConfigDefault, {
          uidCallback: this.#entriesUidFromModes,
          selectors: [
            this.#entriesSelectorDefault,
            this.#entriesSelectorFooter,
          ],
          modes: [this.UidMode.FOOTER],
        }
      );
      this.#entriesScrollerConfigs.set('Topcard', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [this.#entriesSelectorTopcard],
        modes: [
          this.UidMode.ANCHOR_OVERLAY,
          this.UidMode.ARIA_LABEL,
          this.UidMode.ANCHOR,
          this.UidMode.MULTI_IMG,
          this.UidMode.SAFETY,
          this.UidMode.HREF,
        ],
      });
      this.#entriesScrollerConfigs.set('SuggestedForYou', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [this.#entriesSelectorSuggestedForYou],
        modes: [this.UidMode.ANCHOR_OVERLAY],
      });
      this.#entriesScrollerConfigs.set('SalesInsightsOrHighlights', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorHighlights,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.COMPANY,
          this.UidMode.ANCHOR_PROFILE,
          this.UidMode.ARIA_LABEL,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('Analytics', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorAnalytics,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.HREF,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('About', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [this.#entriesSelectorAbout],
        modes: [
          this.UidMode.ANCHOR_OVERLAY,
          this.UidMode.DEFAULT,
        ],
      });
      this.#entriesScrollerConfigs.set('Services', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorServices,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.MULTI_IMG,
          this.UidMode.HREF,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('Featured', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [this.#entriesSelectorFeatured],
        modes: [
          this.UidMode.SAFETY,
          this.UidMode.ANCHOR_FEED,
          this.UidMode.ANCHOR_LEARNING,
          this.UidMode.ANCHOR_NEWSLETTERS,
          this.UidMode.ANCHOR_OVERLAY,
          this.UidMode.ANCHOR_PULSE,
          this.UidMode.ANCHOR_PROFILE,
        ],
      });
      this.#entriesScrollerConfigs.set('Activity', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorActivity,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.ANCHOR_FEED,
          this.UidMode.COMMENT_URN,
          this.UidMode.MULTI_IMG,
          this.UidMode.ANCHOR_PULSE,
          this.UidMode.ANCHOR_NEWSLETTERS,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('ExperienceTopLevelSection', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorExperience,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.ANCHOR_OVERLAY,
          this.UidMode.COMPANY,
          this.UidMode.SCHOOL,
          this.UidMode.FOOTER,
          // CKEY actually looks stable here.
          this.UidMode.CKEY,
          this.UidMode.ANCHOR_PROFILE,
        ],
      });
      this.#entriesScrollerConfigs.set('EducationTopLevelSection', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorEducation,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.SCHOOL,
          this.UidMode.ANCHOR_OVERLAY,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('ConnectedAccountsTopLevel', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [this.#entriesSelectorConnectedAccounts],
        modes: [
          this.UidMode.MULTI_IMG,
          this.UidMode.HREF,
        ],
      });
      this.#entriesScrollerConfigs.set('CertificationTopLevel', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorCertification,
          this.#entriesSelectorFooter,
        ],
        modes: [
          // /safety/go links often go to external certification sites.
          this.UidMode.SAFETY,
          this.UidMode.ANCHOR_OVERLAY,
          this.UidMode.COMPANY,
          this.UidMode.SCHOOL,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('Projects', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorProjects,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.SAFETY,
          this.UidMode.ANCHOR_OVERLAY,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('VolunteerExperienceTopLevel', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorVolunteering,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.COMPANY,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('Skills', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorSkills,
          this.#entriesSelectorFooter,
        ],
        modes: [
          // CKEY actually looks stable here.
          this.UidMode.CKEY,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('RecommendationsTopLevel', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorRecommendations,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.ANCHOR_PROFILE,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('PublicationTopLevelSection', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorPublications,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.SAFETY,
          this.UidMode.ANCHOR_OVERLAY,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('Patents', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorPatents,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.SAFETY,
          this.UidMode.ANCHOR_OVERLAY,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('CourseTopLevelSection', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorCourses,
          this.#entriesSelectorFooter,
        ],
        modes: [
          // MULTI_IMG has caused duplicates
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('HonorsTopLevel', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorHonors,
          this.#entriesSelectorFooter,
        ],
        modes: [
          // MULTI_IMG has caused duplicates
          this.UidMode.ANCHOR_OVERLAY,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('TestScoresTopLevel', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorTestScores,
          this.#entriesSelectorFooter,
        ],
        modes: [
          // MULTI_IMG has caused duplicates
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('LanguageTopLevel', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorLanguages,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.FOOTER,
          this.UidMode.DEFAULT,
        ],
      });
      this.#entriesScrollerConfigs.set('Organizations', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorOrganizations,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.FOOTER,
          this.UidMode.DEFAULT,
        ],
      });
      this.#entriesScrollerConfigs.set('Interests', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          this.#entriesSelectorInterests,
          this.#entriesSelectorFooter,
        ],
        modes: [
          this.UidMode.ANCHOR_NEWSLETTERS,
          this.UidMode.ANCHOR_PROFILE,
          this.UidMode.COMPANY,
          this.UidMode.ANCHOR_SHOWCASE,
          this.UidMode.ANCHOR_GROUPS,
          this.UidMode.SCHOOL,
          this.UidMode.FOOTER,
        ],
      });
      this.#entriesScrollerConfigs.set('Causes', {
        uidCallback: this.#entriesUidFromModes,
        selectors: [
          // Small section
          this.#entriesSelectorCauses,
        ],
        modes: [
          // Nothing better to use.
          this.UidMode.DEFAULT,
        ],
      });
    }

    #initEntryScroller = () => {
      const me = this.#initEntryScroller.name;
      this.logger.entered(me, 'current section', this.sections.itemUid);

      const config = this.#entriesScrollerConfigs.get(
        this.sections.itemUid
      ) ?? this.#entriesScrollerConfigs.get(
        this.#entriesScrollerConfigDefault
      );

      const what = {
        name: `${this.name} entries`,
        base: this.sections.item,
        selectors: config.selectors,
      };

      const how = {
        uidCallback: this.#entriesUidShim,
        classes: [
          LinkedIn.scrollerSecondaryClassName,
          this.scrollerClassName,
        ],
        autoActivate: true,
        snapToTop: false,
      };

      this.#entriesCurrentUid = config.uidCallback;
      this.#entriesCurrentModes = config.modes;

      this.#entryScroller = new NH.nav.Scroller(what, how);
      this.#entryScroller.dispatcher
        .on('changed', this.#onEntriesChanged)
        .on('out-of-range', this.#returnToSections);

      this.logger.leaving(me);
    }

    /**
     * Compute all UIDs for the requested modes.
     *
     * @method
     * @param {NexusHoratio.nav.Scroller} scroller - Scroller instance.
     * @param {external:Element} element - Element to examine.
     * @param {UidMode[]} modes - Computation modes to consider.
     * @returns {Map<UidMode, string>} All computed values.
     */
    #entriesModeToUid = (scroller, element, modes) => {  // eslint-disable-line max-lines-per-function, max-statements, complexity
      const me = this.#entriesModeToUid.name;
      this.logger.entered(me, element, modes);

      const results = new Map();

      // Different types may get additional post-processing.
      let content = null;
      let href = null;

      for (const mode of modes) {
        const hrefSelector = `a${this.#uidModeHrefs.get(mode)?.href}`;
        let scratch = null;
        content = null;
        href = null;
        switch (mode) {
          case this.UidMode.ANCHOR:
            href = element.querySelector(this.#entriesUidModeAnchorSelector)
              ?.href;
            break;
          case this.UidMode.ANCHOR_FEED:
          case this.UidMode.ANCHOR_LEARNING:
          case this.UidMode.ANCHOR_NEWSLETTERS:
          case this.UidMode.ANCHOR_PROFILE:
            href = element.querySelector(hrefSelector)?.href;
            break;
          case this.UidMode.ANCHOR_GROUPS:
          case this.UidMode.ANCHOR_PULSE:
          case this.UidMode.ANCHOR_SHOWCASE:
            scratch = element.matches(hrefSelector)
              ? element
              : element.querySelector(hrefSelector);
            href = scratch?.href;
            break;
          case this.UidMode.COMPANY:
          case this.UidMode.SCHOOL:
            scratch = element.querySelector(hrefSelector)?.href;
            if (scratch) {
              // The same target may be referenced more than once.
              content = new URL(scratch).pathname +
                scroller.defaultUid(element);
            }
            break;
          case this.UidMode.ANCHOR_OVERLAY:
            scratch = element.querySelector('a[href*="/in/"]')?.href;
            if (scratch) {
              // eslint-disable-next-line prefer-regex-literals
              const re = RegExp(
                '^/in/[^/]*/(?:overlay|edit|opportunities)/', 'u'
              );
              const overlayUrl = new URL(scratch);
              const suffix = '/#';
              if (re.test(overlayUrl.pathname)) {
                href = scratch;
              } else if (overlayUrl.href.endsWith(suffix)) {
                // Using content because we know this will match /in/ later.
                content = overlayUrl.pathname + suffix;
              }
            }
            break;
          case this.UidMode.ARIA_LABEL:
            content = element.ariaLabel ||
              element.querySelector('[aria-label]')
                ?.getAttribute('aria-label');
            break;
          case this.UidMode.CKEY:
            content = LinkedIn.ckeyIdentifier(element)
              ?.replace('com.linkedin.sdui.profile.', '');
            break;
          case this.UidMode.COMMENT_URN:
            // The ?? is so there is always a valid URL
            scratch = new URL(element.href ?? document.location)
              .searchParams;
            content = scratch.get('dashReplyUrn') ??
              scratch.get('dashCommentUrn');
            break;
          case this.UidMode.DEFAULT:
            content = scroller.defaultUid(element);
            break;
          case this.UidMode.FALLBACK:
            // No-op
            break;
          case this.UidMode.FOOTER:
            scratch = element.matches(this.#entriesSelectorFooter);
            if (scratch) {
              href = element.href;
            }
            break;
          case this.UidMode.HREF:
            scratch = element.matches(this.#entriesSelectorFooter);
            if (!scratch) {
              href = element.href;
            }
            break;
          case this.UidMode.MULTI_IMG:
            scratch = [];
            for (const img of element.querySelectorAll('img')) {
              scratch.push(new URL(img.src).pathname);
            }
            content = scratch.join('|');
            break;
          case this.UidMode.SAFETY:
            scratch = element.querySelector(hrefSelector)?.href;
            if (scratch) {
              content = new URL(scratch).searchParams.get('urlhash');
              this.logger.log('safety details',
                new URL(scratch).searchParams);
            }
            break;
          case this.UidMode.TEST_ID:
            scratch = element.matches(this.#modeUidSelectorTestId)
              ? element
              : element.querySelector(this.#modeUidSelectorTestId);
            content = scratch?.dataset.testid;
            break;
          default:
            NH.base.issues.post(
              'Unsupported profile entry mode:', mode.description
            );
        }
        if (content) {
          results.set(mode, content);
        } else if (href) {
          try {
            const url = new URL(href);
            const pathname = url.pathname;
            const extra = element.parentElement.matches(':has(hr)')
              ? '-hr'
              : '';
            results.set(mode, pathname + extra);
            if (document.location.pathname === pathname) {
              if (mode === this.UidMode.HREF) {
                this.logger.log('ignoring self href');
                results.delete(mode);
              } else {
                this.logger.log('points to self', mode.description);
              }
            }
          } catch (e) {
            this.logger.log('caught while examining href:', e);
          }
        }
      }

      this.logger.leaving(me, results);
      return results;
    }

    /**
     * Suggest UID sources.
     *
     * @method
     * @param {NexusHoratio.nav.Scroller} scroller - Scroller instance.
     * @param {external:Element} element - Element to examine.
     */
    #entriesSuggestUids = (scroller, element) => {
      const me = this.#entriesSuggestUids.name;
      this.logger.entered(me, element);

      const suggestions = [];

      const results = this.#entriesModeToUid(
        scroller, element, Object.values(this.UidMode)
      );
      for (const [key, value] of results.entries()) {
        suggestions.push(key);
        this.logger.log(key.description, value);
      }

      const page = new URL(document.location);
      const anchors = new Set(element.querySelectorAll('a')
        .values()
        .map(x => x.href)
        .filter(x => !['/', page.pathname].includes(new URL(x).pathname)));
      const ids = element.querySelectorAll(this.entriesUidSelectorId);

      if (anchors.size > 1) {
        suggestions.push('anchors');
        this.logger.log('Anchors to consider:', anchors);
      }

      if (ids.length > 1) {
        suggestions.push('ids');
        this.logger.log('IDs to consider:', ids);
      }

      this.logger.leaving(me, 'Suggested:', suggestions);
    }

    /**
     * Return the first UID computed from supported modes.
     *
     * @method
     * @param {NexusHoratio.nav.Scroller} scroller - Scroller instance.
     * @param {external:Element} element - Element to examine.
     * @returns {{0: UidMode, 1: string}} How the UID was computed, and
     * value.
     */
    #entriesUidFromModes = (scroller, element) => {
      const me = this.#entriesUidFromModes.name;
      this.logger.entered(me, element);

      const results = this.#entriesModeToUid(
        scroller, element, this.#entriesCurrentModes
      );

      if (results.size === 0) {
        this.#entriesSuggestUids(scroller, element);
        results.set(this.UidMode.FALLBACK, scroller.defaultUid(element));
      }

      const [mode, uid] = results
        .entries()
        .next().value;

      this.logger.leaving(me, mode, uid);
      return [mode, uid];
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~Finder}
     * @returns {NexusHoratio.web.StyleService~ElementMap} Elements to
     * monitor.
     */
    #scrollerFinder = async () => {
      const me = this.#scrollerFinder.name;
      this.logger.entered(me);

      const timeout = 4000;
      const elements = new Map();
      try {
        elements.set(
          'toolbar', await NH.web.waitForSelector('[role="toolbar"]', timeout)
        );
      } catch (e) {
        NH.base.issues.post(`${this.name}.${me}: toolbar`, e);
      }

      this.logger.leaving(me, elements);
      return elements;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueSectionIdentifier = (scroller, element) => {  // eslint-disable-line max-statements, max-lines-per-function
      const me = this.#uniqueSectionIdentifier.name;
      this.logger.entered(me, element);

      // There are two types of prefixes: One with a magic string, another
      // with url.  We need both.
      const prefixMagic = this.#sectionUidPrefixes.get(
        window.location.pathname
      );
      const twoBack = -2;
      const prefixUrl = [
        prefixMagic.split('.ref')[0],
        '.ref',
        window.location.pathname.split('/')
          .at(twoBack),
      ].join('');

      let content = '';
      let cardId = '';
      const key = LinkedIn.ckeyIdentifier(element);
      const similarTo = element.closest(
        `[${CKEY}^="ProfilePostConnectDrawer"]`
      );
      const analytics = element.querySelector('a[href$="/dashboard/"]');
      const interests = element.querySelector(`h2[${CKEY}$="_Interests`);

      if (key) {
        content = key;
        if (key.startsWith(prefixMagic)) {
          cardId = key.slice(prefixMagic.length);
        } else if (key.startsWith(prefixUrl)) {
          cardId = key.slice(prefixUrl.length);
        }
      }
      if (similarTo) {
        content = 'SimilarTo';
      }
      if (analytics) {
        content = 'Analytics';
      }
      if (interests) {
        content = 'Interests';
      }
      if (cardId) {
        content = cardId;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #entriesUidShim = (scroller, element) => {
      const [mode, content] = this.#entriesCurrentUid(scroller, element);
      return [mode.description, content].join('-');
    }

    #resetEntries = () => {
      if (this.#entryScroller) {
        this.#entryScroller.destroy();
        this.#entryScroller = null;
      }
      this.entries;
    }

    /**
     * @method
     * @implements {NexusHoratio.base.Dispatcher~Handler}
     * @param {string} type - Event type.
     * @param {NexusHoratio.spa.Page~Pages} pages - Updated pages information.
     */
    #onSpaActivated = async (type, pages) => {
      const me = this.#onSpaActivated.name;
      this.logger.entered(me);

      let prefix = `Skipping as not a ${this.name} page`;
      if (pages.active.has(this)) {
        // When returning to the previous page, the URL change is detected
        // first (triggering this method) before the page is updated.  In that
        // situation, this can see the old Topcard.  By mapping pathname to
        // prefix (which seems stable), this will use the previous value
        // rather than getting the wrong one.
        const pathname = window.location.pathname;
        prefix = this.#sectionUidPrefixes.get(pathname);
        if (!prefix) {
          const TOP_CARD = 'Topcard';
          const selector = `[${CKEY}$="${TOP_CARD}"]`;
          const timeout = 8000;
          // Grab the per-user prefix for the current profile that is used for
          // many `section` identifiers.
          try {
            const topCard = await NH.web.waitForSelector(selector, timeout);
            prefix = topCard?.getAttribute(CKEY)
              ?.slice(0, -TOP_CARD.length);
            this.#sectionUidPrefixes.set(pathname, prefix);
          } catch (e) {
            NH.base.issues.post(
              `${TOP_CARD} timed out`,
              'See https://github.com/nexushoratio/userscripts/issues/302#issuecomment-5269123801'
            );
          }
        }
      }

      this.logger.leaving(me, prefix);
    }

    #checkPartialOrder = () => {
      const me = this.#checkPartialOrder.name;
      this.logger.entered(me, this.#checkingPartialOrder);

      if (!this.#checkingPartialOrder) {
        this.#checkingPartialOrder = true;
        const startItem = this.sections.item;
        this.sections.last();
        const lastItem = this.sections.item;
        this.sections.first();

        while (this.sections.item !== lastItem) {
          const left = this.sections.itemUid;
          this.sections.next();
          const right = this.sections.itemUid;
          const pair = `${left}, ${right}`;
          if (left && right && !this.#sectionsPartialOrder.has(pair)) {
            this.#sectionsPartialOrder.add(pair);
            NH.base.issues.post('Missing Profile pairing', `'${pair}',`);
          }
        }
        this.sections.goto(startItem);
        this.#checkingPartialOrder = false;
      }

      this.logger.leaving(me);
    }

    #onEntriesChanged = () => {
      this.#lastScroller = this.entries;
    }

    /**
     * Selecting a different tab triggers the Scroller `watchForClicks`
     * feature, which eventually calls `focus()`.  Since we have a Scroller
     * based `focused` handler to ensure the correct tablist button has
     * browser focus, we end up focusing on the old button.
     *
     * We handle this by calling `focus()` again on the next JS event loop.
     */
    #onTablistChange = () => {
      setTimeout(this.#forceSectionsFocus, 0);
    }

    #forceSectionsFocus = () => {
      this.sections.focus();
    }

    #onSectionsChanged = () => {
      this.#resetEntries();
      this.#lastScroller = this.sections;
      if (litOptions.enableAlertUnknownProfileSections) {
        this.#checkPartialOrder();
      }
    }

    #onSectionsFocused = () => {
      let el = this.sections.item?.querySelector(
        this.#hasDivCheckbox
      );
      if (el) {
        // Shipping the org chart.
        if (this.sections.itemUid === 'RecommendationsTopLevel') {
          el = el.parentElement;
        }
        el.addEventListener('click', this.#onTablistChange);
        el.querySelector('input:checked')
          .focus();
      }
    }

    #returnToSections = () => {
      this.sections.item = this.sections.item;
    }

  }

  /**
   * Class for handling the Creator Dashboard: Performance page.
   *
   * @extends module:linkedin-tool~Page
   */
  class CreatorDashboardPerformance extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        name: 'Creator Dashboard: Performance',
        // eslint-disable-next-line prefer-regex-literals
        pathname: RegExp('^/(?:dashboard|creator/grow/performance)/', 'u'),
        readySelector: LinkedIn.pageReadySelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.TWO);

      this.addService(VMKeyboardService)
        .setShortName(this.name)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get entries() {
      if (!this.#entriesScroller && this.sections.item) {
        this.#initEntriesScroller();
      }

      return this.#entriesScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get sections() {
      return this.#sectionsScroller;
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
      'Next entry',
      () => {
        this.entries?.next();
      }
    );

    prevEntry = new Shortcut(
      'p',
      'Previous entry',
      () => {
        this.entries?.prev();
      }
    );

    firstItem = new Shortcut(
      '<',
      'Go to the first section',
      () => {
        this.#lastScroller.first();
      }
    );

    lastItem = new Shortcut(
      '>',
      'Go to the last section',
      () => {
        this.#lastScroller.last();
      }
    );

    focusBrowser = new Shortcut(
      'f',
      'Change browser focus to current item',
      () => {
        this.#lastScroller.focus();
      }
    );

    #entriesScroller
    #lastScroller
    #sectionsScroller

    #initScrollers = () => {
      this.#initSectionsScroller();
    }

    #initSectionsScroller = () => {
      const what = {
        name: `${this.name} sections`,
        containerItems: [
          {
            container: LinkedIn.primaryContentSelector,
            items: [
              // Simple sector
              ':scope > div > div',
            ].join(','),
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueSectionsIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#sectionsScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#sectionsScroller);
      this.#sectionsScroller.dispatcher
        .on('changed', this.#onSectionsChanged)
        .on('out-of-range', this.#onSectionsOutOfRange);

      this.#lastScroller = this.#sectionsScroller;
    }

    #initEntriesScroller = () => {
      this.logger.log('init entries');
      const what = {
        name: `${this.name} entries`,
        base: this.sections.item,
        selectors: [
          [
            // Carousel
            '[data-testid="carousel-child-container"] > div > div',
            // List headers
            ':scope > div > div > div > div > div > div > div:has(> div)',
            // List content
            ':scope > div > div > div > div > div > div > div > a',
          ].join(','),
        ],
      };

      const how = {
        uidCallback: this.#uniqueEntriesIdentifier,
        classes: [
          LinkedIn.scrollerSecondaryClassName,
          this.scrollerClassName,
        ],
        autoActivate: true,
        snapToTop: false,
      };

      this.#entriesScroller = new NH.nav.Scroller(what, how);
      this.#entriesScroller.dispatcher
        .on('changed', this.#onEntriesChanged)
        .on('out-of-range', this.#returnToSections);
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueSectionsIdentifier = (scroller, element) => {
      const me = this.#uniqueSectionsIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const h2 = LinkedIn.h2(element);
      const p = element
        .querySelectorAll(':scope div:has(> div > div > div > button) p')
        .values()
        .map(x => x.innerText.trim())
        .toArray()
        .join('; ');

      if (p) {
        content = p;
      }
      if (h2) {
        content = h2;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueEntriesIdentifier = (scroller, element) => {
      const me = this.#uniqueEntriesIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const h2 = LinkedIn.h2(element);
      const p = element.querySelector('p')?.innerText.trim();

      if (p) {
        content = p;
      }
      if (h2) {
        content = h2;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    #onSectionsChanged = () => {
      this.#resetEntries();
      this.#lastScroller = this.sections;
    }

    #resetEntries = () => {
      if (this.#entriesScroller) {
        this.#entriesScroller.destroy();
        this.#entriesScroller = null;
      }
      this.entries;
    }

    /**
     * @method
     * @implements {NexusHoratio.base.Dispatcher~Handler}
     * @param {string} type - Event type.
     * @param {NexusHoratio.nav.Scroller~Event} evt - Data sent along with
     * event.
     */
    #onSectionsOutOfRange = (type, evt) => {
      if (evt.delta < 0) {
        this.spa.details.focusOnSidebar();
      } else {
        this.spa.details.focusOnAside();
      }
    }

    #onEntriesChanged = () => {
      this.#lastScroller = this.entries;
    }

    #returnToSections = () => {
      this.sections.item = this.sections.item;
    }

  }

  /**
   * Class for handling the Search Appearances page.
   *
   * @extends module:linkedin-tool~Page
   */
  class AnalyticsSearchAppearances extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        pathname: '/analytics/search-appearances/',
        readySelector: LinkedIn.pageReadySelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.ONE);

      this.addService(VMKeyboardService)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get entries() {
      if (!this.#entriesScroller && this.sections.item) {
        this.#initEntriesScroller();
      }

      return this.#entriesScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get sections() {
      return this.#sectionsScroller;
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
        this.entries?.next();
      }
    );

    prevEntry = new Shortcut(
      'p',
      'Previous entry in a section',
      () => {
        this.entries?.prev();
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
        this.#lastScroller.focus();
      }
    );

    engageItem = new Shortcut(
      'E',
      'Engage the item (Message, View, Search, etc)',
      () => {
        NH.web.clickElement(this.entries.item, ['a.artdeco-button']);
      }
    );

    static #addon = 'member-analytics-addon'

    #entriesScroller
    #lastScroller
    #sectionsScroller

    #initScrollers = () => {
      this.#initScrollerStyleService();
      this.#initSectionsScroller();
    }

    #initScrollerStyleService = () => {
      const styleConfig = {
        className: this.scrollerClassName,
        finder: this.navbarAndFriendsFinder,
        elementsProcessor: this.navbarAndFriendsElementsProcessor,
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    #initSectionsScroller = () => {
      const what = {
        name: `${this.name} sections`,
        containerItems: [
          {
            container: `${LinkedIn.primaryContentSelector}` +
              ' > div > div > div > div',
            items: 'section',
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueSectionsIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#sectionsScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#sectionsScroller);
      this.#sectionsScroller.dispatcher
        .on('changed', this.#onSectionsChanged)
        .on('out-of-range', this.spa.details.focusOnAside);

      this.#lastScroller = this.#sectionsScroller;
    }

    #initEntriesScroller = () => {
      const what = {
        name: `${this.name} entries`,
        base: this.sections.item,
        selectors: [
          [
            // Most entries
            'ul[class*="is-card"] > li',
            // Random bits
            '[class*="--vertical"]' +
              ` > *[class*="${this.ctor.#addon}"]:not([class*="is-card"])`,
            '[class*="--vertical"]' +
              ` > * > div[class*="${this.ctor.#addon}"]`,
            // Footer
            'div[class*="footer-action"]',
          ].join(','),
        ],
      };

      const how = {
        uidCallback: this.#uniqueEntriesIdentifier,
        classes: [
          LinkedIn.scrollerSecondaryClassName,
          this.scrollerClassName,
        ],
        autoActivate: true,
        snapToTop: false,
      };

      this.#entriesScroller = new NH.nav.Scroller(what, how);
      this.#entriesScroller.dispatcher
        .on('changed', this.#onEntriesChanged)
        .on('out-of-range', this.#returnToSections);
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueSectionsIdentifier = (scroller, element) => {
      const me = this.#uniqueSectionsIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const h2 = LinkedIn.h2(element);

      if (h2) {
        content = h2;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueEntriesIdentifier = (scroller, element) => {
      const me = this.#uniqueEntriesIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const href = element.querySelector('a')?.href;
      const classes = element.classList
        .values()
        .filter(x => x.startsWith(this.ctor.#addon))
        .filter(x => !x.endsWith('__item'))
        .toArray()
        .join(',');

      if (classes) {
        content = classes;
      }
      if (href) {
        const url = new URL(href);
        if (url.search) {
          this.logger.log('href', url.search);
        } else {
          content = url.pathname;
        }
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    #onSectionsChanged = () => {
      this.#resetEntries();
      this.#lastScroller = this.sections;
    }

    #resetEntries = () => {
      this.#entriesScroller?.destroy();
      this.#entriesScroller = null;
      this.entries;
    }

    #onEntriesChanged = () => {
      this.#lastScroller = this.entries;
    }

    #returnToSections = () => {
      this.sections.item = this.sections.item;
    }

  }

  /**
   * Class for handling the Events page.
   *
   * @extends module:linkedin-tool~Page
   */
  class Events extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        pathname: '/events/',
        readySelector: LinkedIn.pageReadySelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.TWO);

      this.addService(VMKeyboardService)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get collections() {
      return this.#collectionsScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get events() {
      if (!this.#eventsScroller && this.collections.item) {
        this.#initEventsScroller();
      }

      return this.#eventsScroller;
    }

    nextCollection = new Shortcut(
      'j',
      'Next collection of entries',
      () => {
        this.collections.next();
      }
    );

    prevCollection = new Shortcut(
      'k',
      'Previous collection of entries',
      () => {
        this.collections.prev();
      }
    );

    nextEvent = new Shortcut(
      'n',
      'Next entry in collection',
      () => {
        this.events?.next();
      }
    );

    prevEvent = new Shortcut(
      'p',
      'Previous entry in collection',
      () => {
        this.events?.prev();
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
        this.#lastScroller.focus();
      }
    );

    shareItem = new Shortcut(
      'S',
      'Share the current item, if available',
      () => {
        const me = this.shareItem.name;
        const item = this.events?.item;
        this.logger.entered(me, item);

        let rc = null;

        if (item) {
          rc = NH.web.clickElement(item, ['button:has(svg[id^="share"])']);
        }

        this.logger.leaving(me, rc);
      }
    );

    #collectionsContainer = 'main > div > div > section'
    #collectionsScroller
    #eventsScroller
    #lastScroller

    #initScrollers = () => {
      this.#initScrollerStyleService();
      this.#initCollectionsScroller();
    }

    #initScrollerStyleService = () => {
      const styleConfig = {
        className: this.scrollerClassName,
        finder: this.navbarAndFriendsFinder,
        elementsProcessor: this.navbarAndFriendsElementsProcessor,
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    #initCollectionsScroller = () => {
      const what = {
        name: `${this.name} collections`,
        containerItems: [
          {
            container: this.#collectionsContainer,
            items: [
              // Events card
              ':scope > div > div > div > div:not([id])',
              // Rest
              ':scope > div > div > div > div[id] > div > div > div',
            ].join(','),
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueCollectionsIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#collectionsScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#collectionsScroller);

      this.#collectionsScroller.dispatcher
        .on('changed', this.#onCollectionsChanged);

      this.#lastScroller = this.#collectionsScroller;
    }

    #initEventsScroller = () => {
      const what = {
        name: `${this.name} events`,
        base: this.collections.item,
        selectors: [
          [
            // Events buttons container
            ':scope > div > div > p ~ div',
            // Your events
            ':scope > div > div > div > div > div > div > a:has(a)',
            // Your events "Show all" footer
            ':scope > div > div > div > a[href*="/mynetwork/"]',
            // Actual events
            ':scope > div > div > div > div > div > div',
            // Common "Show more"/"Show less" footer
            'button:has(> span > span)',
          ].join(','),
        ],
      };

      const how = {
        uidCallback: this.#uniqueEventsIdentifier,
        classes: [
          LinkedIn.scrollerSecondaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: false,
      };

      this.#eventsScroller = new NH.nav.Scroller(what, how);
      this.#eventsScroller.dispatcher
        .on('changed', this.#onEventsChanged)
        .on('out-of-range', this.#returnToCollections);
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueCollectionsIdentifier = (scroller, element) => {
      const me = this.#uniqueCollectionsIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const p = element.querySelector('div > div > p');

      if (p) {
        content = scroller.defaultUid(p);
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueEventsIdentifier = (scroller, element) => {
      const me = this.#uniqueEventsIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const eventHref = element.querySelector('a[href*="/events/"]')?.href;
      const selfHref = element.href;

      if (eventHref) {
        content = new URL(eventHref).pathname;
      }
      if (selfHref) {
        content = new URL(selfHref).pathname;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    #resetEvents = () => {
      this.#eventsScroller?.destroy();
      this.#eventsScroller = null;
      this.events;
    }

    #onEventsChanged = () => {
      this.events?.item?.classList.remove('artdeco-card');
      this.#lastScroller = this.events;
    }

    #returnToCollections = () => {
      this.collections.item = this.collections.item;
    }

    #onCollectionsChanged = () => {
      this.#resetEvents();
      this.#lastScroller = this.collections;
    }

  }

  /**
   * Class for handling the Specific Event pages.
   *
   * @extends module:linkedin-tool~Page
   */
  class EventsSpecific extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        name: 'Specific Event',
        // eslint-disable-next-line prefer-regex-literals
        pathname: RegExp('^/events/[^/]*/', 'u'),
        readySelector: LinkedIn.pageReadySelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.ONE);

      this.addService(VMKeyboardService)
        .setShortName(this.name)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get entries() {
      if (!this.#entriesScroller && this.sections.item) {
        this.#initEntriesScroller();
      }

      return this.#entriesScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get sections() {
      return this.#sectionsScroller;
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
        this.entries?.next();
      }
    );

    prevEntry = new Shortcut(
      'p',
      'Previous entry in a section',
      () => {
        this.entries?.prev();
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
        this.#lastScroller.focus();
      }
    );

    showComments = new Shortcut(
      'c',
      'Show more comments (pre-load them)',
      () => {
        const el = this.sections.item;
        NH.web.clickElement(
          el, ['.comments-comment-list__load-more-container > button']
        );
      }
    );

    showMore = new Shortcut(
      'm',
      'Show more of current item, perhaps with toggling' +
        ' (not Networking lists)',
      () => {
        const el = this.#lastScroller.item;
        NH.web.clickElement(
          el, ['a[class*="lt-line-clamp"]', 'button.see-more']
        );
      }
    );

    attend = new Shortcut(
      'A',
      'Attend the event',
      () => {
        NH.web.clickElement(
          document,
          ['div.events-live-top-card__cta > button.artdeco-button--primary']
        );
      }
    );

    openShareMenu = new Shortcut(
      'S',
      'Open share menu',
      () => {
        NH.web.clickElement(document, ['.social-share > * > button']);
      }
    );

    engageIndividual = new Shortcut(
      'E',
      'Engage with an individual in the Networking view' +
        ' (Message, Follow, Connect)',
      () => {
        // All Networking view items are `li`.
        if (this.entries?.item?.tagName === 'LI') {
          NH.web.clickElement(this.entries.item, ['button']);
        }
      }
    );

    openMeatballMenu = new Shortcut(
      '=',
      'Open the <button>⋯</button> menu',
      () => {
        // This seems to match only the the menu buttons.
        const selector = [
          '.artdeco-button--1',
          '.artdeco-button--circle',
          '.artdeco-dropdown__trigger',
        ].join('');
        let el = this.#lastScroller.item;
        const rc = NH.web.clickElement(el, [selector]);
        // If either no active scroller OR in an item that does not have a
        // menu, fall back to main.
        if (!rc) {
          el = document.querySelector('main');
          NH.web.clickElement(el, [selector]);
        }
      }
    );

    #entriesScroller
    #entriesScrollerConfigs = new Map();
    #lastScroller
    #sectionsContainer = 'main:has(> section)'
    #sectionsScroller

    #initScrollers = () => {
      this.#initEntriesScrollerConfigs();
      this.#initScrollerStyleService();
      this.#initSectionsScroller();
    }

    #initEntriesScrollerConfigs = () => {
      this.#entriesScrollerConfigs.set(
        'top-card', {
          uidCallback: this.#uniqueEntriesIdTopcard,
          selectors: [':scope > div > div'],
        }
      );
      this.#entriesScrollerConfigs.set(
        'description', {
          // This actually works well here.
          uidCallback: this.#uniqueSectionIdentifier,
          selectors: [':scope > div > div'],
        }
      );
      this.#entriesScrollerConfigs.set(
        'live-speaker-list', {
          uidCallback: this.#uniqueEntriesIdPeople,
          selectors: [':scope > div > div > div'],
        }
      );
      this.#entriesScrollerConfigs.set(
        'cohorts', {
          uidCallback: this.#uniqueEntriesIdPeople,
          selectors: [
            ':scope li',
            ':scope > footer',
          ],
        }
      );
      this.#entriesScrollerConfigs.set(
        'urn', {
          uidCallback: this.#uniqueEntriesIdUrn,
          selectors: [
            ':scope .comments-sort-order-toggle',
            ':scope article.comments-comment-entity',
          ],
        }
      );
    }

    #initScrollerStyleService = () => {
      const styleConfig = {
        className: this.scrollerClassName,
        finder: this.navbarAndFriendsFinder,
        elementsProcessor: this.navbarAndFriendsElementsProcessor,
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    #initEntriesScroller = () => {
      const me = this.#initEntriesScroller.name;
      this.logger.entered(me, 'current section', this.sections.itemUid);

      let key = this.sections.itemUid;
      if (key.startsWith(COHORTS)) {
        key = COHORTS;
      }
      const config = this.#entriesScrollerConfigs.get(key) ??
            this.#entriesScrollerConfigs.get('urn');
      this.logger.log('config', config);

      const what = {
        name: `${this.name} entries`,
        base: this.sections.item,
        selectors: config.selectors,
      };

      const how = {
        uidCallback: config.uidCallback,
        classes: [
          LinkedIn.scrollerSecondaryClassName,
          this.scrollerClassName,
        ],
        autoActivate: true,
        snapToTop: false,
      };

      this.#entriesScroller = new NH.nav.Scroller(what, how);
      this.#entriesScroller.dispatcher
        .on('changed', this.#onEntriesChanged)
        .on('out-of-range', this.#returnToSections);

      this.logger.leaving(me);
    }

    #initSectionsScroller = () => {
      const what = {
        name: `${this.name} sections`,
        containerItems: [
          {
            container: this.#sectionsContainer,
            items: [
              // Topcard
              ':scope > section',
              // Details
              ':scope > div > div > section',
              // Comments
              ':scope > div > div [role="article"]',
              // Networking
              ':scope > div > section',
            ].join(','),
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueSectionIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#sectionsScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#sectionsScroller);
      this.#sectionsScroller.dispatcher
        .on('changed', this.#onSectionsChanged);

      this.#lastScroller = this.sections;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueSectionIdentifier = (scroller, element) => {  // eslint-disable-line max-statements
      const me = this.#uniqueSectionIdentifier.name;
      this.logger.entered(me, element);

      const idSelector = '[id]:not([id^="ember"])';
      const prefix = 'events-';

      let content = '';
      const id = element.matches(idSelector)
        ? element
        : element.querySelector(idSelector);
      const header = element.querySelector('header');
      const cohorts = element.querySelector('.events-cohort-item');
      const urn = element.dataset.urn;

      if (id) {
        content = id.id;
      }
      if (header) {
        content = header.classList.values()
          .find(x => x.startsWith(prefix));
      }
      if (cohorts) {
        const scratch = [COHORTS];
        if (header) {
          scratch.push(header.innerText);
        } else {
          scratch.push(scroller.defaultUid(element));
        }
        content = scratch.join('-');
      }
      if (urn) {
        content = urn;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      } else if (content.startsWith(prefix)) {
        content = content
          .slice(prefix.length)
          .split('__')[0];
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueEntriesIdUrn = (scroller, element) => {
      const me = this.#uniqueEntriesIdUrn.name;
      this.logger.entered(me, element);

      let content = '';
      const dataId = element.dataset.id;

      if (dataId) {
        content = dataId;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueEntriesIdTopcard = (scroller, element) => {
      const me = this.#uniqueEntriesIdTopcard.name;
      this.logger.entered(me, element);

      const prefix = 'events-';

      let content = '';
      const cssClass = element.classList.values()
        .find(x => x.startsWith(prefix));

      if (cssClass) {
        content = cssClass;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      } else if (content.startsWith(prefix)) {
        content = content
          .slice(prefix.length)
          .split('__')[0];
      }

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueEntriesIdPeople = (scroller, element) => {
      const me = this.#uniqueEntriesIdPeople.name;
      this.logger.entered(me, element);

      let content = '';
      const anchor = element.querySelector('a')?.href;

      if (anchor) {
        content = new URL(anchor).pathname;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    #onSectionsChanged = () => {
      this.#resetEntries();
      this.#lastScroller = this.sections;
    }

    #resetEntries = () => {
      this.#entriesScroller?.destroy();
      this.#entriesScroller = null;
      this.entries;
    }

    #onEntriesChanged = () => {
      this.#lastScroller = this.entries;
      if (this.entries?.itemUid === 'navigation-container') {
        this.entries.item.querySelector('[aria-selected="true"]')
          ?.focus();
      }
    }

    #returnToSections = () => {
      this.sections.item = this.sections.item;
    }

  }

  /**
   * Class for handling the Search Results: People page.
   *
   * @extends module:linkedin-tool~Page
   */
  class SearchResultsPeople extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {
      super({
        spa: spa,
        name: 'Search Results: People',
        pathname: '/search/results/people/?',
        readySelector: LinkedIn.pageReadySelector,
      });

      this.addService(LinkedInStyleService)
        .addStyles(LinkedIn.Style.TWO);

      this.addService(VMKeyboardService)
        .setShortName(this.name)
        .addInstance(this);

      this.#initScrollers();
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get paginator() {
      return this.#paginatorScroller;
    }

    /** @type {NexusHoratio.nav.Scroller} */
    get results() {
      return this.#resultsScroller;
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
        this.#lastScroller.focus();
      }
    );

    engageIndividual = new Shortcut(
      'E',
      'Engage with an individual in the Networking view' +
        ' (Message, Follow, Connect)',
      () => {
        // This could be an actual button or a button shaped link.
        NH.web.clickElement(this.results.item,
          [`[${CKEY}^="SearchResults"] [aria-label][${CKEY}]`]);
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

    #lastScroller
    #paginatorScroller
    #paginatorScrollerContainerSelector =
      `${LinkedIn.primaryContentSelector}` +
      ' ul[data-testid="pagination-controls-list"]';

    #resultsScroller
    #resultsScrollerContainerSelector = `${LinkedIn.primaryContentSelector}` +
      ' [data-testid="lazy-column"]';

    #initScrollers = () => {
      this.#initScrollerStyleService();
      this.#initPaginatorScroller();
      this.#initResultsScroller();
    }

    #initScrollerStyleService = () => {
      const styleConfig = {
        className: this.scrollerClassName,
        finder: this.#scrollerFinder,
        elementsProcessor: this.#scrollerElementsProcessor,
      };
      this.addService(NH.web.StyleService, styleConfig);
    }

    #initPaginatorScroller = () => {
      const what = {
        name: `${this.name} paginator`,
        containerItems: [
          {
            container: this.#paginatorScrollerContainerSelector,
            items: ':scope > li',
          },
        ],
      };

      const how = {
        uidCallback: this.#uniquePaginatorIdentifier,
        classes: [LinkedIn.scrollerSecondaryClassName],
        snapToTop: false,
        containerTimeout: 1000,
      };

      this.#paginatorScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#paginatorScroller);
      this.#paginatorScroller.dispatcher
        .on('activated', this.#onPaginatorActivated)
        .on('changed', this.#onPaginatorChanged);
    }

    #initResultsScroller = () => {
      const what = {
        name: `${this.name} cards`,
        containerItems: [
          {
            container: this.#resultsScrollerContainerSelector,
            items: '[role="listitem"]',
          },
        ],
      };

      const how = {
        uidCallback: this.#uniqueResultsIdentifier,
        classes: [
          LinkedIn.scrollerPrimaryClassName,
          this.scrollerClassName,
        ],
        snapToTop: true,
      };

      this.#resultsScroller = new NH.nav.Scroller(what, how);
      this.addService(NH.nav.ScrollerService)
        .setScroller(this.#resultsScroller);
      this.#resultsScroller.dispatcher
        .on('changed', this.#onResultsChanged);

      this.#lastScroller = this.#resultsScroller;
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~Finder}
     * @returns {NexusHoratio.web.StyleService~ElementMap} Elements to
     * monitor.
     */
    #scrollerFinder = async () => {
      const me = this.#scrollerFinder.name;
      this.logger.entered(me);

      const elements = new Map();
      elements.set(
        'results-container',
        await NH.web.waitForSelector(this.#resultsScrollerContainerSelector)
      );

      this.logger.leaving(me, elements);
      return elements;
    }

    /**
     * @method
     * @implements {NexusHoratio.web.StyleService~ElementsProcessor}
     * @param {NexusHoratio.web.StyleService~ElementMap} elements - Elements
     * to examine.
     * @returns {NexusHoratio.web.StyleService~StyleProperties} Style
     * properties for to contribute.
     */
    #scrollerElementsProcessor = (elements) => {
      const me = this.#scrollerElementsProcessor.name;
      this.logger.entered(me, elements);

      const tops = [];
      const properties = new Map();

      // XXX: No idea this this fudge factor is needed.
      tops.push('1px');

      for (const [key, value] of elements.entries()) {
        switch (key) {
          case 'results-container':
            if (value) {
              tops.push(getComputedStyle(value).paddingTop);
            }
            break;
          default:
            NH.base.issues.post(
              this.name, me, 'Unsupported element key:', key
            );
        }
      }

      if (tops.length) {
        const plus = tops.join(' + ');
        properties.set('scroll-margin-top', `calc(${plus})`);
      }

      this.logger.leaving(me, properties);
      return properties;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniquePaginatorIdentifier = (scroller, element) => {
      const me = this.#uniquePaginatorIdentifier.name;
      this.logger.entered(me, element);

      const content = scroller.defaultUid(element);

      this.logger.leaving(me, content);
      return content;
    }

    /**
     * @method
     * @implements {NexusHoratio.nav.Scroller~uidCallback}
     * @param {NexusHoratio.nav.Scroller} scroller - The calling {@link
     * NexusHoratio.nav.Scroller Scroller} instance.
     * @param {external:Element} element - Element to examine.
     * @returns {string} A value unique to this element.
     */
    #uniqueResultsIdentifier = (scroller, element) => {
      const me = this.#uniqueResultsIdentifier.name;
      this.logger.entered(me, element);

      let content = '';
      const anchor = element.querySelector('a')?.href;

      if (anchor) {
        content = new URL(anchor).pathname;
      }
      if (!content) {
        content = scroller.defaultUid(element);
      }

      this.logger.leaving(me, content);
      return content;
    }

    #onPaginatorActivated = async () => {
      const me = this.#onPaginatorActivated.name;
      this.logger.entered(me);

      try {
        const container = document.querySelector(
          this.#resultsScrollerContainerSelector
        );
        const scrollTop = container?.scrollTop;
        const timeout = 2000;
        const item = await NH.web.waitForSelector(
          `${this.#paginatorScrollerContainerSelector} > li` +
            ' > [aria-current="true"]',
          timeout
        );
        this.paginator.goto(item);

        // The goto() moved us, so go back.
        container?.scrollTo({top: scrollTop});
      } catch (e) {
        this.logger.log('Results paginator not found, staying put');
      }

      this.logger.leaving(me);
    }

    #onPaginatorChanged = () => {
      this.#lastScroller = this.paginator;
    }

    #onResultsChanged = () => {
      this.#lastScroller = this.results;
    }

  }

  /**
   * Class for tracking pages to support.
   *
   * @extends module:linkedin-tool~Page
   */
  class PagesToDo extends Page {

    /**
     * @param {NexusHoratio.spa.SPA} spa - SPA instance that manages this
     * {@link module:linkedin-tool~Page Page}.
     */
    constructor(spa) {  // eslint-disable-line max-lines-per-function
      const URLs = [

        /**
         * @todo [(#256)](https://github.com/nexushoratio/userscripts/issues/256)
         * Support **Verify** page
         */
        '/verify/',

        /**
         * @todo [(#260)](https://github.com/nexushoratio/userscripts/issues/260)
         * Support **Job tracker** page
         */
        '/jobs-tracker/',

        /**
         * @todo [(#261)](https://github.com/nexushoratio/userscripts/issues/261)
         * Support **Follow Page** Page
         */
        '/suggested-for-you/follow-page/',

        /**
         * @todo [(#262)](https://github.com/nexushoratio/userscripts/issues/262)
         * Support **Analytics Posts** Page
         */
        '/analytics/creator/content/',

        /**
         * @todo [(#263)](https://github.com/nexushoratio/userscripts/issues/263)
         * Support **Feed update** Page
         */
        '/feed/update/',

        /**
         * @todo [(#264)](https://github.com/nexushoratio/userscripts/issues/264)
         * Support **Saved Posts** Page
         */
        '/my-items/saved-posts/',

        /**
         * @todo [(#265)](https://github.com/nexushoratio/userscripts/issues/265)
         * Support **Post analytics** Page
         */
        '/analytics/post-summary/[^/]*/',

        /**
         * @todo [(#266)](https://github.com/nexushoratio/userscripts/issues/266)
         * Support **Company** Page
         */
        '/company/[^/]*/',

        /**
         * @todo [(#360)](https://github.com/nexushoratio/userscripts/issues/360)
         * Support **SearchResultsAll** page
         */
        '/search/results/all/?',
        '/search/results/',

        /**
         * @todo [(#386)](https://github.com/nexushoratio/userscripts/issues/386)
         * Support **Games** pages
         */
        '/games/.*/?',

        /**
         * @todo [(#408)](https://github.com/nexushoratio/userscripts/issues/408)
         * Support **Connections** page
         */
        '/mynetwork/invite-connect/connections/?',

        /**
         * @todo [(#418)](https://github.com/nexushoratio/userscripts/issues/418)
         * Support **Manage Event** page
         */
        '/event/manage/[^/]*/',

        /**
         * @todo [(#422)](https://github.com/nexushoratio/userscripts/issues/422)
         * Support **Jobs Search Results** page
         */
        '/jobs/search-results/?[^/]*',

        /**
         * @todo [(#428)](https://github.com/nexushoratio/userscripts/issues/428)
         * Support **Profile Viewers** page
         */
        '/analytics/profile-views/?',

        /**
         * @todo [(#437)](https://github.com/nexushoratio/userscripts/issues/437)
         * Support **Recruiter Views** page
         */
        '/analytics/recruiter-views/.*',

        /**
         * @todo [(#438)](https://github.com/nexushoratio/userscripts/issues/438)
         * Support **Profile key skill suggestions** page
         */
        '/analytics/profile-key-skills/',

        /**
         * @todo [(#439)](https://github.com/nexushoratio/userscripts/issues/439)
         * Support **Explorer Career Insights** page
         */
        '/explore-career-insights/',

        /**
         * @todo [(#440)](https://github.com/nexushoratio/userscripts/issues/440)
         * Support **Resumes and application data** page
         */
        '/jobs/application-settings/',

        /**
         * @todo [(#443)](https://github.com/nexushoratio/userscripts/issues/443)
         * Support **Manage events** page
         */
        '/event-manager/.*',

        /**
         * @todo [(#446)](https://github.com/nexushoratio/userscripts/issues/446)
         * Support **Creator Dashboard: Content** page
         */
        '/creator/grow/content/',

        /**
         * @todo [(#447)](https://github.com/nexushoratio/userscripts/issues/447)
         * Support **Creator: Monetization** page
         */
        '/creator/monetization/',

        /**
         * @todo [(#448)](https://github.com/nexushoratio/userscripts/issues/448)
         * Support **Analytics: Audience** page
         */
        '/analytics/creator/audience/',
      ].map(x => `(${x})`)
        .join('|');
      super({
        spa: spa,
        pathname: RegExp(`^(${URLs})$`, 'u'),
      });
    }

  }

  NH.xunit.testing.run();

  const linkedIn = new LinkedIn();

  await linkedIn.ready;
  log.log('proceeding...');

  const spa = new NH.spa.SPA(linkedIn);
  if (litOptions.enableWatchPage) {
    spa.register(NH.spa.WatchPage);
  }
  spa.register(Feed);
  spa.register(MyNetwork);
  spa.register(InvitationManager);
  spa.register(ManageEvents);
  spa.register(Jobs);
  spa.register(JobsCollections);
  spa.register(JobsView);
  spa.register(Messaging);
  spa.register(Notifications);
  spa.register(Profile);
  spa.register(CreatorDashboardPerformance);
  spa.register(AnalyticsSearchAppearances);
  spa.register(Events);
  spa.register(EventsSpecific);
  spa.register(SearchResultsPeople);
  spa.register(PagesToDo);

  // Registering Global last ensures we check for an unsupported page at least
  // once.
  linkedIn.registrationComplete = true;
  spa.register(Global);

  log.log('Initialization successful.');

})();
