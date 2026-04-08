# lib/userscript - A [NexusHoratio](https://github.com/nexushoratio/userscripts/blob/main/lib/README.md) library.

Wrappers for dealing with variations in userscript managers.

## Exported properties (as of version 9)
* version - Bumped per release.
* Exception - Library specific exception.
* licenseData - License data extracted from the userscript header.
* environmentData - Raw text about the current environment.
* getValue - Fetches value from userscript storage if granted.
* setValue - Sets a value in userscript storage if granted.
* setAutoManageLoggerConfigs - Control persistent saving of Logger configuration in userscript storage.

More details are in [userscript.js](userscript.js) as JSDoc.
