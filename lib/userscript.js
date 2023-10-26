// ==UserScript==
// ==UserLibrary==
// @name        NH_userscript
// @description Wrappers for dealing with variations in userscript managers.
// @version     0
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

window.NexusHoratio.userscript = (function base() {
  'use strict';

  /** @type {number} - Bumped per release. */
  const version = 0;

  /** Library specific exception. */
  class UserscriptError extends Error {

    /** @inheritdoc */
    constructor(...rest) {
      super(...rest);
      this.name = this.constructor.name;
    }

  }

  /**
   * @typedef LicenseData
   * @property {string} name - License name.
   * @property {string} url - URL pointing to the license.
   */

  /**
   * Per the *old* GM docs:
   * https://sourceforge.net/p/greasemonkey/wiki/Metadata_Block/#license
   * @returns {LicenseData} - Extracted from the userscript header.
   * @throws {Error} - If cannot be extracted.
   */
  function licenseData() {
    let license = GM.info.script.license;
    if (!license) {
      const magic = '// @license ';

      // Try Tampermonkey's way.
      const header = GM.info.script.header;
      if (header) {
        const line = header.split('\n').find(l => l.startsWith(magic));
        if (line) {
          license = line.slice(magic.length).trim();
        }
      }
    }

    if (!license) {
      const msg = [
        'Unable to extract license information from the userscript.',
        // eslint-disable-next-line no-magic-numbers
        JSON.stringify(GM.info.script, null, 2),
      ].join('\n');
      throw new UserscriptError(msg);
    }

    const [name, url] = license.split(';');

    return {
      name: name.trim(),
      url: url.trim(),
    };
  }

  return {
    version: version,
    UserscriptError: UserscriptError,
    licenseData: licenseData,
  };

}());
