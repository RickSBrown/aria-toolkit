/*
 * This module knows about implementing ARIA in HTML5.
 * 
 * Copyright (C) 2014  Rick Brown
 */
define(["aria","xpath", "loadXml"], function(aria, query, loadXml){
	var url = "xml/aria-html.xml";
	AriaHtml.call(aria);
	
	aria.getSemanticStrength.SACRED = 3;
	aria.getSemanticStrength.STRONG = 2;
	aria.getSemanticStrength.WEAK = 1;
	aria.getSemanticStrength.NONE = 0;
	
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
	
	/**
	 * The main class of this module however instead of returning an instance we mix it in to the
	 * main ARIA toolkit module and return that instead.
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
		 * Determine the implicit role for this element.
		 * @param {Element} element an HTML element.
		 * @return {string} The implicit role for this element, or null if none could be determined.
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
		 */
		this.findDescendants = function(element, role){
			var result, qs = [], xpath, infos, qs;
			if(element && role)
			{
				infos = elementByRoleCache[role];
				if(!infos)
				{
					initialise();
					xpath = "/htmlconcepts/elements/element[role/@name='" + role + "']";
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
		 * There are four categories:
		 * 1. special - can not take a role
		 * 2. strong - has an implicit role, explicit role not recommended but if it is present must match its implicit role.
		 * 3. weak - has an implicit role but can be overriden.
		 * 4. none - can take any role.
		 * @param {Element} element An HTML DOM element.
		 * @return {number} one of:
		 * getSemanticStrength.SACRED (truthy)
		 * getSemanticStrength.STRONG (truthy)
		 * getSemanticStrength.WEAK (truthy)
		 * getSemanticStrength.NONE (falsey)
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
			result = this.getSemanticStrength[result];
			return result;
		};

		/**
		* This lists the aria attributes that are supported implicitly by native properties of this element.
		* 
		* @param {Element} element The element to check.
		* @return {string[]} An array of aria attributes.
		* The attributes are also set as properties on the array object.
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
	return aria;
});