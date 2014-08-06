/*
 * Knows about the implicit semantics of HTML5 elements.
 * 
 * Copyright (C) 2014  Rick Brown
 */
define(["aria", "xpath", "loadXml"], function(aria, query, loadXml){
	var url = "xml/aria-html.xml";//todo externalize this to build.xml
	
	AriaHtml.call(aria);
	
	/**
	 * This module knows about implementing ARIA in HTML5. In particular it knows about implicit semantics.
	 * The rules are specified in (and loaded from) the XML file aria-html.xml
	 *
	 * The methods are "mixed-in" to the base aria toolkit class.
	 * @exports ariahtml
	 */
	function AriaHtml()
	{
		var xmlDoc,
			htmlPropToAriaProp = [],
			htmlProps,
			elementByRoleCache = {},
			elementByXpathCache = {},
			modifyingAttributes;

		/**
		 * Used to rank the native semantic strength of an HTML element.
		 * @property {number} semantic.SACRED An HTML element with a special native purpose that makes no sense to override with an ARIA role.
		 * @property {number} semantic.STRONG An HTML element with strong native semantics that should not be overriden with an ARIA role.
		 * @property {number} semantic.WEAK An HTML element with weak native semantics that can be overriden with an ARIA role.
		 * @property {number} semantic.NONE An HTML element with no native semantics that is begging for you to add an ARIA role.
		 */
		this.semantic = {
			SACRED: 3,
			STRONG: 2,
			WEAK: 1,
			NONE: 0
		};
		
		/**
		 * Determine the implicit role for this element.
		 * @param {Element} element an HTML element.
		 * @return {string} The implicit role for this element, or null if none could be determined.
		 *
		 * @example var element = document.createElement("input");
		 * element.setAttribute("type", "checkbox");
		 * console.log(aria.getImplicitRole(element)); //logs checkbox
		 */
		this.getImplicitRole = function(element){
			var result = getInfoFor(element);
			if(result && result.role)
			{
				result = result.role;
			}
			else
			{
				result = null;
			}
			return result;
		};
		
		/**
		 * Finds descendants of this element which implement the given ARIA role.
		 * Will look for descendants with implicit or explicit roles.
		 * @param {Element} element an HTML DOM element.
		 * @param {string} role The role thou seekest.
		 * @return {Element[]} An array of matching elements.
		 * @example
		 *	var result, container = document.createElement("div"),
		 *		button = document.createElement("button"),
		 *		span = document.createElement("span");
		 *	span.setAttribute("role", "button");
		 *	container.appendChild(button);
		 *	container.appendChild(span);
		 *	result = aria.findDescendants(container, "button"); //result is an array containing both 'button' and 'span'
		 */
		this.findDescendants = function(element, role){
			var result, qs = [], xpath, infos, qs;
			if(element && role)
			{
				infos = elementByRoleCache[role];
				if(!infos)
				{
					initialise();
					xpath = "/htmlconcepts/elements/element[role[@name='" + role + "']]";
					infos = query(xpath, false, xmlDoc);
					if(infos)
					{
						infos = elementByRoleCache[role] = infos.map(function(element){
							return new HtmlInfo(element);
						});
					}
				}
				if(infos)
				{
					qs = infos.qs;
					if(!qs)
					{
						qs = infos.map(function(info){
							return info.toQs();
						});
						qs[qs.length] = "[role='" + role + "']";//search for explicit role as well as implicit
						infos.qs = qs = qs.join();
					}
					result = element.querySelectorAll(qs);
					if(result)
					{
						result = Array.prototype.map.call(result, function(item){return item;});
					}
				}
			}
			return result || [];
		};
		
		/**
		 * Find the semantic strength of an HTML element.
		 * @param {Element} element An HTML DOM element.
		 * @return {number} one of:
		 * <ul>
		 * <li>semantic.SACRED (truthy)</li>
		 * <li>semantic.STRONG (truthy)</li>
		 * <li>semantic.WEAK (truthy)</li>
		 * <li>semantic.NONE (falsey)</li>
		 * </ul>
		 *
		 * @example
		 *	aria.getSemanticStrength(document.createElement("script"));// will return semantic.SACRED
		 *	aria.getSemanticStrength(document.createElement("h1"));// will return semantic.STRONG
		 *	aria.getSemanticStrength(document.createElement("button"));// will return semantic.WEAK
		 *	aria.getSemanticStrength(document.createElement("div"));// will return semantic.NONE
		 */
		this.getSemanticStrength = function(element){
			var result, info = getInfoFor(element);
			if(info)
			{
				if(info.special)
				{
					result = "SACRED";
				}
				else if(info.strong)
				{
					result = "STRONG";
				}
				else
				{
					result = "WEAK";
				}
			}
			else
			{
				result = "NONE";
			}
			result = this.semantic[result];
			return result;
		};

		/**
		* This lists the aria attributes that are supported implicitly by native properties of this element.
		* 
		* @param {Element} element The element to check.
		* @return {string[]} An array of aria attributes.
		* The attributes are also set as properties on the array object, and the value of each property is the HTML equivalent.
		*
		* @example
		*	var supported, element = document.createElement("input");
		*	element.setAttribute("type", "range");
		*	supported = aria.getNativelySupported(element);//supported is now an array of aria attribute names
		*	console.log(supported.indexOf("aria-valuemax") >=0);//logs 'true'
		*	console.log(supported["aria-valuemax"]);//logs 'max'
		*
		*/
		this.getNativelySupported = function(element){
			var i, next, nextSupported, result = [], testElement;
			initialise();
			if(element)
			{
				testElement = element.cloneNode();//avoid expandos
				for(i=0; i<htmlProps.length; i++)
				{
					next = htmlProps[i];
					if(next in testElement)
					{
						nextSupported = htmlPropToAriaProp[next];
						result[result.length] = nextSupported;
						result[nextSupported] = next;
					}
				}
			}
			return result;
		};

		/**
		 * If you load the aria-html XML yourself you can provide it to the toolkit here.
		 * @param {DOM} xml The aria-html XML DOM.
		 */
		this.setXml = function(xml){
			xmlDoc = xml;
		};

		/**
		 * Get the aria-html XML used by the toolkit (if it has been loaded).
		 *  @return {DOM} The aria-html XML DOM used by the toolkit - don't hurt it.
		 */
		this.getXml = function(){
			return xmlDoc;
		};

		/**
		 * Get info object for this HTML DOM element.
		 * @param {Element} element an HTML DOM element.
		 * @returns {HtmlInfo} An info object if found, otherwise null
		 */
		function getInfoFor(element)
		{
			var result, xpath = elementToXpath(element);
			if(xpath && !(result = elementByXpathCache[xpath]))
			{
				result = query(xpath, false, xmlDoc);
				result = elementByXpathCache[xpath] = result.map(function(element){
					return new HtmlInfo(element);
				});
			}
			if(result && result.length)
			{
				result = ((result.length > 1)? getBestMatch(element, result) : result[0]) || null;
			}
			else
			{
				result = null;
			}
			return result;
		}
		
		/**
		 * Builds xpath to find this element in our aria-html document.
		 * @param {Element} element The html DOM element we are building a query for.
		 * @return {string} The xpath query.
		 */
		function elementToXpath(element)
		{
			var result, tagName, i, next;
			initialise();
			if(element && (tagName = element.tagName))
			{
				tagName = tagName.toLowerCase();
				result = "/htmlconcepts/elements/element[@name='" + tagName + "']";
				for(i=0; i<modifyingAttributes.length; i++)
				{
					next = modifyingAttributes[i];
					if(element.hasAttribute(next))
					{
						/*
						 * Note: this would give totally different results if we used "element.getAttribute(next)" instead of element[next]
						 * The former would be more akin to static analysis (validating what the user set) while the latter is dynamic analysis
						 * where we are validating what the browser truly 'understands' and what assistive technologies would be presented with.
						 */
						result += "[attributes/attribute[@name='" + next + "'][@value='" + element[next] + "']]";
					}
					else
					{
						result += "[not(attributes/attribute[@name='" + next + "'])]";
					}
				}
			}
			return result;
		}
		
		/**
		 * Call to perform one-time initialisation routine.
		 */
		function initialise()
		{
			if(!xmlDoc)
			{
				xmlDoc = loadXml(url);
			}
			if(!modifyingAttributes)
			{
				buildModifiers();
				buildProperties();
			}
		}
		
		/**
		 * Dynamically generate an array of html attribute names that have the potential to change
		 * the implicit role of an HTML element when present.
		 */
		function buildModifiers()
		{
			var attMap = {},
				attrs = query("//attribute/@name", false, xmlDoc);
			if(attrs && attrs.length)
			{
				attrs.forEach(function(attr){
					attMap[attr.value] = true;
				});
				modifyingAttributes = Object.keys(attMap);
			}
			else
			{
				modifyingAttributes = [];
			}
		}
		
		/**
		 * Dynamically generate an object that helps map between html and aria attributes.
		 * For example "aria-required" = "required".
		 */
		function buildProperties()
		{
			var attrs = query("//attr", false, xmlDoc);
			if(attrs && attrs.length)
			{
				attrs.forEach(function(attr){
					var aname = attr.getAttribute("aname");
					htmlPropToAriaProp[htmlPropToAriaProp.length] = aname;
					htmlPropToAriaProp[attr.getAttribute("hname")] = aname;
				});
				htmlProps = Object.keys(htmlPropToAriaProp);
			}
		}
	}

	/**
	 * Build an array of ancestor tagnames.
	 * @param {Element} element An HTML DOM element.
	 * @returns {string[]} An array of tagnames in this element's ancestor tree.
	 */
	function getAncestorList(element)
	{
		var result = [], tagName;
		while((element = element.parentNode))
		{
			tagName = element.tagName;
			if(tagName)
			{
				tagName = tagName.toLowerCase();
				result[result.length] = tagName;
			}
		}
		return result;
	}

	/**
	 * Determine if this element is contained within another element.
	 * @param {Element} element An HTML DOM element.
	 * @param {string} tagName The name of the element we are looking for int the ancestry.
	 * @param {string[]} [tree] Optionally (for performance reasons) provide the ancestor list.
	 * @returns {Number} 0 if not found, otherwise the distance (1 parent, 2 is grandparent etc).
	 */
	function isScopedBy(element, tagName, tree)
	{
		tree = tree || getAncestorList(element);
		return (tree.indexOf(tagName) + 1);
	}

	/**
	 * Find the HtmlInfo instance that best fits this element.
	 * @param {Element} element A DOM element.
	 * @param {HtmlInfo[]} htmlInfos An array of instances that match this element.
	 * @return {HtmlInfo} The best matching instance for this element, if it could be determined.
	 */
	function getBestMatch(element, htmlInfos)
	{
		var result, i, nearest = 0, distance, next, tree = getAncestorList(element);
		for(i=0; i<htmlInfos.length; i++)
		{
			next = htmlInfos[i];
			if(next.scope)
			{
				distance = isScopedBy(element, next.scope, tree);
				if(distance && (!nearest || distance < nearest))
				{
					nearest = distance;
					result = next;
				}
			}
		}
		return result;
	}

	/**
	 * Find first descendant with this tagname and return it.
	 * Identical to "element.querySelector(tagName);" but for XML elements that may not implement querySelector.
	 * @param {Element} element An XML DOM element.
	 * @param {string} tagName The tagName we are looking for.
	 * @return {Element} The droid you are looking for, if found.
	 */
	function getDescendant(element, tagName)
	{
		var result;
		if(element && tagName)
		{
			result = element.getElementsByTagName(tagName);
			if(result && result.length)
			{
				result = result[0];
			}
			else
			{
				result = null;
			}
		}
		return result;
	}
	/**
	 * Knows important details about implementing ARIA on various HTML elements.
	 * @param {Element} element An XML DOM element from our aria-html xml data.
	 * @constrcutor
	 */
	function HtmlInfo(element)
	{
		var qs,
			role = getDescendant(element, "role"),
			scope = getDescendant(element, "scope");
		this.name = element.getAttribute("name");
		this.strong = (element.getAttribute("strong") === "true");
		this.special = (element.getAttribute("special") === "true");
		this.role = role? role.getAttribute("name") : "";
		this.scope = scope? scope.getAttribute("name") : "";

		/**
		 * Returns a queryelector query which can be used to find HTMLElements that match
		 * this query instance.
		 * @return {string} A CSS selector for this element.
		 */
		this.toQs = function(){
			var i, next, result, attrs;
			if(qs)
			{
				result = qs;
			}
			else
			{
				attrs = element.getElementsByTagName("attribute");
				if(this.scope)
				{
					result = this.scope + " " + this.name;
				}
				else
				{
					result = this.name;
				}
				if(attrs)
				{
					for(i=0; i<attrs.length; i++)
					{
						next = attrs[i];
						result += "[" + next.getAttribute("name") + "='" + next.getAttribute("value") + "']";
					}
				}
				qs = result;
			}
			return result;
		};
	}
	return aria;
});