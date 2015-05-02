IMPORTANT!
I have stopped work on this project and joined the [accessibility-developer-tools](https://github.com/GoogleChrome/accessibility-developer-tools) team instead. My aim with aria-toolkit was to help developers implement ARIA and ensure conformance. These aims are met by the accessibility-developer-tools project with the huge advantage that it is backed by a team of collaborators rather than an individual working alone.

Note, the aria-toolkit Chrome Extension is replaced by the accessibility-developer-tools equivalent: https://chrome.google.com/webstore/detail/accessibility-developer-t/fpkknkljclfencbdbgkenhalefipecmb


ARIA Toolkit provides:

  * A high performance, light, adaptable javascript library that "knows" about ARIA.

  * ARIA utility methods for working with ARIA in HTML5 DOMs.

  * Methods that "know" about the implicit semantics of ARIA in HTML5.

  * An ARIA validator which allows you to check that your ARIA roles and attributes have been correctly implemented.

### Validator ###
The validator is different to many other tools because it performs dynamic analysis instead of static analysis.

This means:
  * You get results that are accurate for your user agent
  * Your page could be loaded from the server as XML/JSON, transformed to HTML in the client and it can still be validated

### Javascript ###
The javascript is provided as:
  1. Individal AMD modules (for use with a loader like RequireJS: http://requirejs.org/)
  1. Combined 'all-in-one' 'layer' files which you include like any other javascript library.

### Chrome Extension ###
It is also the home of the [ARIA Validator](https://chrome.google.com/webstore/detail/aria-validator/oigghlanfjgnkcndchmnlnmaojahnjoc) Chrome Extension.