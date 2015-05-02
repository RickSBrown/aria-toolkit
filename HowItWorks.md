This page briefly explains the fundamental workings of this project.

# Core ARIA Rules #

The lowest level component is 'aria.js'; this reads the [ARIA taxonomy](http://www.w3.org/WAI/ARIA/schemata/aria-1.rdf) and creates a javascript 'class' for each ARIA role.

The ARIA role inheritance hierarchy is represented on the prototype chain for each javascript 'class'.

This allows each role 'class' to know everything in the taxonomy, including:

  * What roles it can contain.
  * What roles it must contain.
  * What roles contain it.
  * What states/properties it supports.
  * What states/properties it requires.


# HTML + ARIA Rules #

The next core component is 'aria.html.js' which mainly exists to provide knowledge about the implicit semantics of HTML elements, including:

  * What is the implicit role of a given element
  * What states/properties are implicitly supported by a given element
  * What is the 'semantic strength' of a given element.

Like 'aria.js' this module loads an [XML file](https://aria-toolkit.googlecode.com/svn/trunk/src/main/xml/aria-html.xml) and uses XPath to build its rules.