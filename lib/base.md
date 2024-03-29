# lib/base - A [NexusHoratio](https://github.com/nexushoratio/userscripts/blob/main/lib/README.md) library.

Pure [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) stuff.  Nothing here should be [WEB API](https://developer.mozilla.org/en-US/docs/Web/API) aware, except `Logger`'s use of *console*.

## Exported properties (as of version 52)
* version - Bumped per release.
* NOT_FOUND - Constant (to make eslint's `no-magic-numbers` setting happy).
* ONE_ITEM - Constant useful for testing length of an array.
* ensure - Ensures appropriate versions of NexusHoratio libraries are loaded.
* Exception - Base exception that uses the name of the class.
* Dispatcher - Simple dispatcher (event bus).
* MessageQueue - A simple message system that will queue messages to be delivered.
* issues - NexusHoratio libraries and apps should log issues here.
* DefaultMap - Subclass of *Map* similar to Python's *defaultdict*.
* Logger - Fancy-ish log messages (likely over engineered).
* uuId - Create a UUID-like string with a base.
* safeId - Normalizes a string to be safe to use as an HTML element id.
* strHash - Equivalent (for now) of Java's hashCode (do not store externally).
* simpleParseWords - Separate a string of concatenated words along transitions.
* Service - Base class for building services that can be turned on and off.

More details are in [base.js](base.js) as JSDoc.
