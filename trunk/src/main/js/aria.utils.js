/*
 * This module provides utility methods useful when dealing with ARIA.
 * It knows about the rules of ARIA beyond what can be prgramatically derived from the ARIA taxonomy.
 * 
 * The methods are "mixed-in" to the base aria toolkit class.
 * 
 * Copyright (C) 2014  Rick Brown
 */
define(["aria", "xpath", "aria.html"], function(aria, xpathQuery){

	function AriaUtils()
	{
		var ESCAPE_ID_RE = /'/g,
			checkByAttributeQuery ={},//cache the attribute queries once they have been built
			ABSTRACT_ROLES = {
					command:true,
					composite:true,
					input:true,
					landmark:true,
					range:true,
					roletype:true,
					section:true,
					sectionhead:true,
					select:true,
					structure:true,
					widget:true,
					window:true};
		/**
		 * Gets the element that "aria-owns" this element
		 * @param {Element} element a potentially "aria-owned" DOM element
		 * @param {boolean} showAll If true will return multiple owners, if found, even though this is invalid (result will be nodeList).
		 * @return {Element|Nodelist|null} the element which owns the passed in element (if any) or null if no owner found
		 */
		this.getOwner = function(element, showAll)
		{
			var id = element.id, ownerQuery, result, document = element.ownerDocument;
			if(id)
			{
				id = id.replace(ESCAPE_ID_RE, "\\'");
				ownerQuery = "[aria-owns~='" + id  + "']";
				result = document.querySelectorAll(ownerQuery);
				if(!showAll && result)
				{
					if(result.length > 1)
					{
						console.info("Found more than one element which 'aria-owns' id ", id);
					}
					result = result[0];//yes, let it be undefined if length is zero
				}
			}
			return result || null;
		};
		
		/**
		 * Gets elements which this element "aria-owns".
		 * @param {Element} element The 'owner' DOM element.
		 * @return {Element[]} An array of "aria-owned" elements.
		 */
		this.getOwned = function(element)
		{
			var i, len, owned, ids = element.getAttribute("aria-owns"),
				result = [],
				document = element.ownerDocument;
			if(ids)
			{
				ids = this.splitAriaIdList(ids);
				for(i=0, len=ids.length; i < len; i++)
				{
					owned = document.getElementById(ids[i]);
					if(owned)
					{
						result[result.length] = owned;
					}
					else
					{
						console.warn("can not element specified in 'aria-owns' with id ", ids[i]);
					}
				}
			}
			return result;
		};

		/**
		 * Convert a string of IDs (in the format specified by the ARIA spec which is currently space separated)
		 * to an array of IDs.
		 * @param {string} val A space separated list of IDs
		 * @returns {string[]} An array of the IDs in 'val'.
		 */
		this.splitAriaIdList = function(val){
			var result;
			if(val)
			{
				result = val.split(/\s+/);
			}
			else
			{
				result = [];
			}
			return result;
		};
		
		/**
		 * Gets the role from an element.
		 * @param {Element} element The DOM element whose role we want.
		 * @param {boolean} implicit If true will also consider 'implicit' aria role.
		 * @see: http://www.w3.org/TR/wai-aria/host_languages#implicit_semantics
		 * @return {string} The role of this element, if found.
		 */
		this.getRole = function(element, implicit){
			var result;
			if(element && element.hasAttribute && element.hasAttribute("role"))
			{
				result = element.getAttribute("role");
			}
			else if(implicit)
			{
				result = this.getImplicitRole(element);
			}
			else
			{
				result = null;
			}
			return result;
		};
		
		/**
		 * Determine if this role is an abstract ARIA role.
		 * @param {string} role The role to check.
		 * @return {boolean} true if this is an abstract role.
		 */
		this.isAbstractRole = function(role){
			return (role && ABSTRACT_ROLES[role] && ABSTRACT_ROLES.hasOwnProperty(role));
		};

		/**
		 * Gets all elements with "aria-*" attributes.
		 * @param {Element} element The scope of the search.
		 * @param {boolean} [includeRole] If true will also include elements with a "role" attribute.
		 * By default elements with a role are not included in the result;
		 * @return {Element[]} An array of elements.
		 */
		this.getElementsWithAriaAttr = function(element, includeRole){
			var result, cacheKey = includeRole? "includeRole" : "excludeRole",
				query = checkByAttributeQuery[cacheKey] || (checkByAttributeQuery[cacheKey] = buildAttributeQuery(includeRole));
			if(document.evaluate)
			{
				result = xpathQuery(query, false, element);
			}
			else
			{
				result = getElementsWithAriaAttrLame(element, includeRole);
			}
			return result;
		};
		
		/**
		 * Gets all elements with a "role" attribute.
		 * @param {Element} element The scope of the search, only this element's subtree will be searched.
		 * @return {Element[]} An array of elements.
		 */
		this.getElementsWithRole = function(element){
			var i, len, elements = element.querySelectorAll("[role]"), result = [];
			if(result)
			{
				for(i=0, len = elements.length; i<len; i++)
				{
					result[i] = elements[i];
				}
			}
			return result;
		};

		/**
		 * For browsers that do not support XPath on HTML DOM use an alternate (probably slower) method.
		 * @param {Element} element The scope of the search.
		 * @param {boolean} [includeRole] If true will also include elements with a "role" attribute.
		 * By default elements with a role are not included in the result;
		 * @return {Element[]} An array of elements.
		 */
		function getElementsWithAriaAttrLame(element, includeRole)
		{
			var result = [], global = aria.getSupported(),
				document = (element.nodeType !== Node.DOCUMENT_NODE ? element.ownerDocument : element),
				treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT,acceptNode,false);

			if(acceptNode(element) === NodeFilter.FILTER_ACCEPT)
			{
				result[result.length] = element;
			}
			while(treeWalker.nextNode())
			{
				result[result.length] = treeWalker.currentNode;
			}
			function acceptNode(node){
				var result = NodeFilter.FILTER_SKIP, attrs, i, next;
				if(includeRole || !node.hasAttribute("role"))
				{
					attrs = node.attributes;
					for(i=0;i<attrs.length;i++)
					{
						next = attrs[i].name;
						if(!(next in global) && ARIA_ATTR_RE.test(next))
						{
							result = NodeFilter.FILTER_ACCEPT;
							break;
						}
					}
				}
				return result;
			}
			return result;
		}

		/*
		 * Helper for getElementsWithAriaAttr.
		 * Builds an XPath query that selects all nodes with no role with "aria-*" attributes that are not global.
		 * ./descendant-or-self::node()[not(@role)][@*[starts-with(name(), 'aria-') and not(name()='aria-label' or name()='aria-hidden' or etc etc etc)]]
		 */
		function buildAttributeQuery(includeRole)
		{
			var prop,
				global = aria.getSupported(),
				predicates = [],
				result = "./descendant-or-self::node()";
			if(!includeRole)
			{
				result += "[not(@role)]";
			}
			result += "[@*[starts-with(name(), 'aria-') and not({predicates})]]";
			for(prop in global)
			{
				predicates[predicates.length] = "name()='"+ prop + "'";
			}
			result = result.replace(/\{predicates\}/, predicates.join(" or "));
			return result;
		}
	}
	AriaUtils.call(aria);
	return aria;
});