The following is subject to change.  The goal is to put all user serviceable parts at the top. but details outside of that could change.

Use eslint and the configured `.eslintrc.json`.  The primary dev machine comes with v6.4.0, which is an older release.

For things it cannot handle at the moment:

- `@typedef` before the first use
- constructor

- static public classes
- static public fields (alphabetical, usually none)
- static public getters/setters (alphabetical)
- static public methods

- public fields (alphabetical, usually none)
- public getters/setters (alphabetical)
- public methods

- static private classes
- static private fields (alphabetical)
- static private getters/setters (alphabetical)
- static private methods

- private fields (alphabetical)
- private getters/setters (alphabetical)
- private methods

- nested testcases (*friends*)

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

  // Note that *ver?* here is from {xunit,base}.version, NOT the @require URL.
  const NH = window.NexusHoratio.base.ensure([
    {name: 'xunit', minVersion: ver0},
    {name: 'base', minVersion: ver1},
  ]);

  function bar() {
    if (!right) {
      NH.base.issues.post('Something was not right with bar', 'Details ...');
    }
  }

  return {
    version: version,
  };

}());
```
Some of the above is simply to keep eslint happy.

Libraries and apps should use *base.ensure()* to restrict the namespace and verify minimal versions are present.
```
const NH = window.NexusHoratio.base.ensure([{name: 'xunit'}, {name: 'base'}]);
```

Libraries and apps should use *base.issues* to post bugs.  Apps should set a listener on *base.issues* to process those bugs (e.g., put them somewhere a user can easily get to them that is not just the console logs).
```
NH.base.issues.post('Something bad', 'detail 1', 'detail 2');
```

## Applications

Use the `https://github.com/nexushoratio/userscripts` userscript namespace.

Use libraries as hosted on [Greasy Fork](https://greasyfork.org/en/users/1139937-mike-castle-nexus).  As of 2023-10-16, we now use the new format that embeds the Greasy Fork version (different from the library version), inside the URL.  See the strings `ABC` and `XYZ` in the skeleton.

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
// @require     https://update.greasyfork.org/scripts/478188/ABC/NH_xunit.js
// @require     https://update.greasyfork.org/scripts/477290/XYZ/NH_base.js
// ==/UserScript==

(async () => {
  'use strict';

  // Note that *ver?* here is from {xunit,base}.version, NOT the @require URL.
  const NH = window.NexusHoratio.base.ensure([
    {name: 'xunit', minVersion: ver0},
    {name: 'base', minVersion: ver1},
  ]);

  function issueListener(...issues) {
    // Handle issues
  }

  NH.base.issues.listener(issueListener);

  NH.xunit.testing.run();

})();
```

## Developer environment

In a POSIX environment, set up the hooks after cloning:
```
git config core.hooksPath hooks
```

I am not wholly committed to the `npm` ecosystem.  If it cannot easily be installed on a Debian system using `apt install`, I will not use it.  Unfortunately, this can mean things like using older versions of tools like eslint as well as emacs plugins.

## Write tests

Most libraries, include *base* depend on *xunit*.

All tests should subclass `TestCase` and register itself with *testing.testCases*.

Assertions are being added to `TestCase` as needed.  Use https://docs.python.org/3/library/unittest.html for naming guidance.

All tests are ran in the browser, and applications should include the following line, which will run all tests registered in *testing.testCases*.
```
NH.xunit.testing.run();
```

Typically, a library or app will do something like the following to register tests:
```
/* eslint-disable no-empty-function */
/* eslint-disable no-magic-numbers */
/* eslint-disable no-new */
/* eslint-disable require-jsdoc */
class FooTestCase extends NH.xunit.TestCase {
  ... do test stuff ...
}
/* eslint-enable */

NH.xunit.testing.testCases.push(FooTestCase);
```

> [!NOTE]
> Keep any *eslint-disable* directives used minimal and sorted.

The *NH.xunit.testing.run()* mentioned above will then execute the tests on page load, *iff* `NH.xunit.testing.enabled === true`;

Experience has shown that test logs can become interleaved with other messages, so the *run()* may want to be placed after the application has defined tests, but before it starts doing anything.

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
      this.#activator = this.addService(WatchPage.#Activator);
      this.#activator.page = this;
    }

    static #Activator = class extends Service {

      /** @returns {WatchPage} - Associated instance. */
      get page() {
        return this.#page;
      }

      /** @param {WatchPage} val - Associated instance. */
      set page(val) {
        this.#page = val;
      }

      /** Called each time service is activated. */
      activate() {
        const me = 'activate';
        this.logger.entered(me);

        this.page.counter = 1;
        this.page.#MO.observe(document.querySelector('body'),
          {childList: true, subtree: true});

        this.logger.leaving(me);
      }

      /** Called each time service is deactivated. */
      deactivate() {
        const me = 'deactivate';
        this.logger.entered(me);

        this.page.#MO.disconnect();

        this.logger.leaving(me);
      }

      #page

    }

    #MO
    #activator

    /**
     * MutationObserver callback.
     * @param {MutationRecord[]} records - Standard mutation records.
     */
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
