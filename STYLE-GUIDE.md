The following is subject to change.  The goal is to put all user serviceable parts at the top. but details outside of that could change.

Use eslint and the configured `.eslintrc.json`.  The primary dev machine comes with v6.4.0, which is an older release.

For things is cannot handle at the moment:

- `@typedef` before the first use
- constructor
- static public fields (alphabetical, usually none)
- static public getters/setters (alphabetical)
- static methods
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

}());
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
