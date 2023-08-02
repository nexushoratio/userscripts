# LinkedIn Tool

Minor enhancements to LinkedIn. Mostly just hotkeys.

The major reason for this userscript is to provide keyboard navigation to LinkedIn.

A secondary reason is, being my first userscript, it provides me with a platform to learn HTML, JavaScript, CSS and other web technologies.

Mostly it works by mapping keystrokes to mouse event (e.g., hitting a key sequence results in a mouse click), or causing the page to scroll a bit of content into view.  It currently does not collect or save any information, though future enhancements may provide some customization which would require that.

## Installation

* Via [Greasy Fork](https://greasyfork.org/en/scripts/472097-linkedin-tool)
* Via [GitHub](https://github.com/nexushoratio/userscripts/raw/main/linkedin-tool.user.js)

After installing and reloading the LinkedIn web page, hitting the `?` key will bring up a help menu.

## Feedback

Existing issues can be seen at [GitHub](https://github.com/nexushoratio/userscripts/labels/linkedin-tool).

New bugs and feature requests can be filed on [GitHub](https://github.com/nexushoratio/userscripts/issues/new/choose).  Select the appropriate issue template to get started.

## Versioning

Currently I am using a [SemVer](https://semver.org/) inspired scheme of `x.y.z`.

* `x` will be bumped whenever a new page is handled.  0 was for `/feed/`, 1 introduced `/notification/` support.
* `y' will be a new feature (e.g., new keystrokes)
* `z` bumps are bug fixes or internal changes (refactorings and the like)
