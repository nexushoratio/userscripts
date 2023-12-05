# lib/web - A [NexusHoratio](https://github.com/nexushoratio/userscripts/blob/main/lib/README.md) library.

Common patterns for working with the [WEB API](https://developer.mozilla.org/en-US/docs/Web/API).

## Exported properties (as of version 3)
* version - Bumped per release.
* clickElement - Run querySelector to get an element, then click it.
* focusOnElement - Bring the Browser's focus onto element.
* postInfoAboutElement - Post a bunch of information about an HTML element to issues.
* isInput - Determines if the element accepts keyboard input.
* otmot - One time mutation observer with timeout.
* otrot - One time resize observer with timeout.
* otrot2 - One time resize observer with action callback and duration.
* waitForSelector - Wait for selector to match using querySelector.

More details are in [web.js](web.js) as JSDoc.
