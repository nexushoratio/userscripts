# lib/widget - A [NexusHoratio](https://github.com/nexushoratio/userscripts/blob/main/lib/README.md) library.

Widgets for user interactions.

As widgets are built, they should be designed and implemented against [ARIA guidelines](https://www.w3.org/WAI/ARIA/).  There is a section on widget specific [patterns](https://www.w3.org/WAI/ARIA/apg/patterns/).

## Exported properties (as of version 33)
* version - Bumped per release.
* Widget - Base class for other rendering widgets.
* Layout - Implements the Layout pattern (WIP: https://github.com/nexushoratio/userscripts/issues/192).
* GridColumn - Column for the Grid widget (WIP: https://github.com/nexushoratio/userscripts/issues/185).
* Grid - Implements the Grid pattern (WIP: https://github.com/nexushoratio/userscripts/issues/185).
* Modal - Implements the Modal pattern (WIP: https://github.com/nexushoratio/userscripts/issues/194).
* Info - A widget that can be opened and closed on demand.

More details are in [widget.js](widget.js) as JSDoc.
