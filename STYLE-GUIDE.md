The following is subject to change.  The goal is to put all user serviceable parts at the top. but details outside of that could change.

Use eslint and the configured `.eslintrc.json`.  The primary dev machine comes with v6.4.0, which is an older release.

For things is cannot handle at the moment:

- `@typedef` before the first use
- constructor
- static public fields (alphabetical, usually none)
- static public getters/setters (alphabetical)
- static public methods
- public fields (alphabetical, usually none)
- public getters/setters (alphabetical)
- public methods
- static private fields (alphabetical)
- static private getters/setters (alphabetical)
- static private methods
- private fields (alphabetical)
- private getters/setters (alphabetical)
- private methods

## Libraries

Should go into the `NexusHoratio` namespace object with an object the same name as the library.

Each library should have a `version` number that is strictly increasing.  **NOT** SemVer!

Skeleton for *lib/foo.js*:
```
// ==UserScript==
// ==UserLibrary==
// @name        NH_foo
// @description Foo library does Foo stuff.
// @version     N
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @homepageURL https://github.com/nexushoratio/userscripts
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @match       https://www.example.com/*
// ==/UserLibrary==
// ==/UserScript==

window.NexusHoratio ??= {};

window.NexusHoratio.foo = (function foo() {
  'use strict';

  const version = N;

  return {
    version: version,
  };

}());
```
Some of the above is simply to keep eslint happy.

Libraries and apps may locally rename `NexusHoratio` to `NH`.
```
const NH = NexusHoratio;
```

## Applications

Use the `https://github.com/nexushoratio/userscripts` userscript namespace.

Use libraries as hosted on [Greasy Fork](https://greasyfork.org/en/users/1139937-mike-castle-nexus).

Skeleton for *bar.user.js*:
```
// ==UserScript==
// @name        Bar
// @namespace   https://github.com/nexushoratio/userscripts
// @match       https://www.example.com/*
// @noframes
// @version     X
// @author      Mike Castle
// @description Bar does that.
// @license     GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0-standalone.html
// @downloadURL https://github.com/nexushoratio/userscripts/raw/main/bar.user.js
// @supportURL  https://github.com/nexushoratio/userscripts/blob/main/bar.md
// @require     https://greasyfork.org/scripts/477290-nh-base/code/NH_base.js?version=XYZ
// ==/UserScript==

/* global NexusHoratio */

(async () => {
  'use strict';

  const NH = NexusHoratio;

})();
```

## Developer environment

In a POSIX environment, set up the hooks after cloning:
```
git config core.hooksPath hooks
```

I am not wholly committed to the `npm` ecosystem.  If it cannot easily be installed on a Debian system using `apt install`, I will not use it.  Unfortunately, this can mean things like using older versions of tools like eslint as well as emacs plugins.

### Fun trick

If using [Violentmonkey](https://violentmonkey.github.io/) to develop:

Add the following the the userscript at the *end* of the UserScript directive:
```
// DO NOT SUBMIT
// @require http://localhost:8000/lib/base.js?0
// @require http://localhost:8000/lib/foo.js?0
```

In one window:
```
python -m http.server -d src/userscripts/
```

In another:
```
inotifywait --quiet --monitor --event CLOSE_WRITE --format '%w%f' lib | while read filename; do sum=$(cksum $filename | awk '{print $1}'); sed -i "s+\(${filename}\)?.*+\1?${sum}+" linkedin-tool.user.js; done
```

As the libraries are updated, the extra `@require`statements will be updated which will force *VM* to reload them because the URLs have changed.  Two versions of the library will be loaded, but the second one will take precedence.  Not yet tested with other userscript managers.

Do **NOT** check in!

### Supporting a new page

Supporting a new page is not always easy.  Many pages load dynamically, which is why things like `Page`'s *pageReadySelector* exists.  Learning what that selector should be can be challenging, and it will be discovered that, depending on what gets loaded onto the page, it may change from time to time.

One technique is to create *MutationObserver* that simply adds a counter to each element on the page as it arrives.  Elements that existed before the observe gets activated will have no counter.  Simply watching to see when the page settles down can provide a strong hint on when things are ready.

The is an example of a new `Page` that does this.  Note that sometimes, nodes get removed from a page moments after they get added.  Shipping your org chart FTW!

```
  class WatchPage extends Page {

    constructor(spa) {
      super({spa: spa});

      this.#MO = new MutationObserver(this.#mutationHandler);
    }

    #MO

    _refresh() {
      this.counter = 1;
      this.#MO.observe(document.querySelector('body'), {childList: true, subtree: true});
    }

    #mutationHandler = (records) => {
      const me = 'mutationHandler';
      this.logger.entered(me, `records: ${records.length}`);

      const adds = [];
      const dels = [];
      for (const record of records) {
        if (record.type === 'childList') {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              node.dataset.counter = this.counter;
              this.counter += 1;
              adds.push(node);
            }
          }
          for (const node of record.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && node.matches('[data-counter]')) {
              dels.push(node);
            }
          }
        }
      }

      if (adds.length) {
        this.logger.starting('adds', adds.length);
        for (const node of adds) {
          this.logger.log('node:', node, node.innerText);
        }
        this.logger.finished('adds');
      }
      if (dels.length) {
        this.logger.starting('dels', dels.length);
        for (const node of dels) {
          this.logger.log('node:', node);
        }
        this.logger.finished('dels');
      }
      this.logger.leaving(me, this.counter);
    }

  }
```
Then in the console, do a query for the largest *data-counter* to see what the last thing loaded was.  Having timestamps turned on in the console helps.
```
$('[data-counter="NUM"]')
```

Without true details passed to *super()*, this will watch any page being loaded, so careful.
