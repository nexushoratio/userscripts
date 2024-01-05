# lib/widget - A [NexusHoratio](https://github.com/nexushoratio/userscripts/blob/main/lib/README.md) library.

Widgets for user interactions.

As widgets are built, they should be designed and implemented against [ARIA guidelines](https://www.w3.org/WAI/ARIA/).  There is a section on widget specific [patterns](https://www.w3.org/WAI/ARIA/apg/patterns/).

## Exported properties (as of version 26)
* version - Bumped per release.
* Widget - Base class for other rendering widgets.
* Layout - Implements the Layout pattern.
* Modal - Implements the Modal pattern.
* Info - A widget that can be opened and closed on demand.

More details are in [widget.js](widget.js) as JSDoc.
