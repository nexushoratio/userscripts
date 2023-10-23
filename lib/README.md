# Libraries

This directory will contain libraries mostly useful in creating [userscripts](../README.md).

As with my scripts, the libraries can also be found on [Greasy Fork](https://greasyfork.org/en/users/1139937-mike-castle-nexus).

Issue https://github.com/nexushoratio/userscripts/issues/167 is tracking the initial population of this directory.

See the [style guide)[https://github.com/nexushoratio/userscripts/blob/main/STYLE-GUIDE.md) for how I expect the lay out the code.

In general, each library will be in the `NexusHoratio` global name space with each library in a property named after the library.  That is, functions from [base.js](base.js) will accessible via `NexusHoratio.base`.

The function `NexusHoration.base.ensure()` can be used to make sure appropriate library dependency criteria is met.

## The libraries
* [base](base.md) - Pure [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) stuff.  Nothing here should be [WEB API](https://developer.mozilla.org/en-US/docs/Web/API) aware, except `Logger`'s use of *console*.
