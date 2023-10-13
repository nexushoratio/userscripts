// ==UserScript==
// ==UserLibrary==
// @name        NH_base
// @description Base library usable any time.
// @version     1
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

((ns) => {
  'use strict';

  ns.base = {
    version: 1,

    testing: {
      enabled: false,
      funcs: [],
    },

    NOT_FOUND: -1,

  };

})(window.NexusHoratio);
