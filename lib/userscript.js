// ==UserScript==
// ==UserLibrary==
// @name        NH_userscript
// @description Wrappers for dealing with variations in userscript managers.
// @version     16
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

window.NexusHoratio.userscript = (function userscript() {
  'use strict';

  /** @type {number} - Bumped per release. */
  const version = 16;

  const NH = window.NexusHoratio.base.ensure(
    [{name: 'base', minVersion: 61}]
  );

  /**
   * @typedef LicenseData
   * @deprecated @property {string} name - License name.
   * @property {string} id - SPDX id (fka `name`).
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

      // Try a legacy way
      const header = GM.info.scriptMetaStr;
      if (header) {
        const line = header.split('\n')
          .find(l => l.startsWith(magic));
        if (line) {
          license = line.slice(magic.length)
            .trim();
        }
      }
    }

    if (!license) {
      const msg = [
        'Unable to extract license information from the userscript.',
        // eslint-disable-next-line no-magic-numbers
        JSON.stringify(GM.info, null, 2),
      ].join('\n');
      const opts = {
        cause: {
          code: NH.base.Code.NOT_FOUND,
          reason: 'NoLicense',
        },
      };
      throw new Error(msg, opts);
    }

    const [id, url] = license.split(';');

    return {
      name: id.trim(),
      id: id.trim(),
      url: url.trim(),
    };
  }

  /** @returns {string[]} - Raw text about the current environment. */
  function environmentData() {
    const gm = GM.info;
    const msgs = [`${gm.script.name}: ${gm.script.version}`];
    msgs.push('NexusHoratio libraries:');
    for (const [lib, obj] of Object.entries(window.NexusHoratio)) {
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
    return msgs;
  }

  /**
   * Fetches value from userscript storage if granted.
   *
   * Purposefully no errors if permissions are not granted.
   *
   * Enable in the ==UserScript== header with:
   * @grant GM.getValue
   *
   * @param {string} key - The name of the value to load.
   * @param {*} defaultValue - Value if not stored OR not enabled.
   * @returns {Promise<*>} - The value fetched or defaultValue.
   */
  function getValue(key, defaultValue) {
    if (GM.getValue) {
      return GM.getValue(key, defaultValue);
    }
    return Promise.resolve(defaultValue);
  }

  /**
   * Sets a value in userscript storage if granted.
   *
   * Purposefully no errors if permissions are not granted.
   *
   * Enable in the ==UserScript== header with:
   * @grant GM.setValue
   *
   * @param {string} key - The name to use in the storage.
   * @param {*} value - The value to set.
   * @returns {Promise<*>} - Always resolves to null; mostly used to ensure
   * the write is complete.
   */
  function setValue(key, value) {
    if (GM.setValue) {
      return GM.setValue(key, value);
    }
    return Promise.resolve(null);
  }

  /**
   * Automatically load/save Logger configs based on state changes.
   *
   * This particular implementation is intended to be efficient but imperfect.
   * Data, at least as far as high water marks, may be lost.
   *
   * This uses {@link getValue} and {@link setValue).  See them for enabling
   * in a userscript.
   *
   * It monitors changes to Logger configs, and saves them to userscript
   * storage as appropriate.
   *
   * If the userscript enables the value change listener API, that will be
   * used to detect when values need to be reread.  Otherwise, it will use the
   * browser based visibilitychange event to reload.
   *
   * Enable in the ==UserScript== header with:
   * @grant GM.addValueChangeListener
   * @grant GM.removeValueChangeListener
   */
  class LoggerConfigSaver {

    /** @param {string} key - Userscript storage key. */
    constructor(key) {
      this.#key = key;
      this.#load();
      NH.base.Logger.onConfig(this.#onLoggerConfig);
      if (GM.addValueChangeListener && GM.removeValueChangeListener) {
        this.#vclId = GM.addValueChangeListener(
          this.#key, this.#valueChangeListener
        );
      } else {
        document.addEventListener(
          'visibilitychange', this, {passive: true}
        );
      }

      this.ready = this.#mutex;
    }

    /** Dispose of the instance. */
    [Symbol.dispose]() {
      document.removeEventListener('visibilitychange', this);
      GM.removeValueChangeListener?.(this.#vclId);
    }

    /** Event listener callback. */
    async handleEvent() {
      if (!document.hidden) {
        await this.#load();
      }
    }

    static #defaults = Object.freeze({
      USED_LIMIT: 5000,
    });

    // TODO(#304): These leak through from async tests.
    static #ignoreList = [
      'ADefaultPage',
      'SPA: Deets',
      'Paige',
    ];

    #key
    #mutex = Promise.resolve('init');
    #usedCount = 0;
    #vclId

    #load = () => {
      const me = this.#load.name;

      this.#mutex = (async () => {
        await this.#mutex;
        this.#usedCount = 0;
        NH.base.Logger.configs = await getValue(this.#key);
        return Promise.resolve(me);
      })();
    }

    /** @param {string} reason - Attached to mutex as a debugging aid. */
    #save = (reason) => {
      this.#usedCount = 0;
      this.#mutex = (async () => {
        await this.#mutex;
        await setValue(this.#key, NH.base.Logger.configs);
        return Promise.resolve(reason);
      })();
    }

    /**
     * @param {string} key - The name of the observed variable.
     * @param {*} oldValue - The old value of the observed variable.
     * @param {*} newValue - The new value of the observed variable.
     * @param {boolean} remote - Same script or different tab.
     */
    #valueChangeListener = (key, oldValue, newValue, remote) => {  // eslint-disable-line max-params
      if (remote) {
        this.#load();
      }
    }

    /**
     * @implements {NH.base.Logger~ConfigMutationHandler}
     * @param {string} evt - Type of mutation.
     * @param {NH.base.Logger~ConfigMutationRecord} record - Details about the
     * mutation.
     */
    #onLoggerConfig = (evt, record) => {
      if (!LoggerConfigSaver.#ignoreList.includes(record.logger)) {
        const reason = `${evt} ${record.logger} ${record.group}`;
        switch (evt) {
          case 'logger':
          case 'group':
          case 'enabled':
          case 'mode':
            this.#save(reason);
            break;
          case 'used':
            this.#usedCount += 1;
            if (this.#usedCount > LoggerConfigSaver.#defaults.USED_LIMIT) {
              this.#save(`${evt} ${this.#usedCount}`);
            }
            break;
          default:
            NH.base.issues.post('Unknown Logger config event:', reason);
        }
      }
    }

  }

  let configSaver = null;

  /**
   * Control persistent saving of Logger configuration in userscript storage.
   *
   * Call once near the top of the userscript to enable.
   *
   * See {@link LoggerConfigSaver} for details.
   *
   * @param {boolean} state - Enables/disables the feature.
   * @param {string} [key='Logger'] - The key to use in userscript storage.
   */
  async function setAutoManageLoggerConfigs(state, key = 'Logger') {
    if (state) {
      if (!configSaver) {
        configSaver = new LoggerConfigSaver(key);
        await configSaver.ready;
      }
    } else {
      configSaver[Symbol.dispose]();
      configSaver = null;
    }
  }

  return {
    version: version,
    licenseData: licenseData,
    environmentData: environmentData,
    getValue: getValue,
    setValue: setValue,
    setAutoManageLoggerConfigs: setAutoManageLoggerConfigs,
  };

}());
