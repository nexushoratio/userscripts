# lib/base - A [NexusHoratio](https://github.com/nexushoratio/userscripts/blob/main/lib/README.md) library.

Pure [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) stuff.  Nothing here should be [WEB API](https://developer.mozilla.org/en-US/docs/Web/API) aware, except `Logger`'s use of *console*.

## Exported properties (as of version 12)
* version - Bumped per release.
* NOT_FOUND - Constant (to make eslint's `no-magic-numbers` setting happy).
* testing - Object for testing support (to be replaced with `TestCase`).
* ensure - Ensures appropriate versions of NexusHoratio libraries are loaded.
* TestCase - An xUnit style test framework (WIP: https://github.com/nexushoratio/userscripts/issues/172).
* DefaultMap - Subclass of *Map* similar to Python's *defaultdict*.
* Logger - Fancy-ish log messages (likely over engineered).
* uuId - Create a UUID-like string with a base.
* safeId - Normalizes a string to be safe to use as an HTML element id.
* strHash - Equivalent (for now) of Java's hashCode (do not store externally).
* Dispatcher - Simple dispatcher (event bus).

More details are in [base.js](base.js) as JSDoc.
