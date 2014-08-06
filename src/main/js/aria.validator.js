/*
 * This file provides functionality to validate the DOM to ensure that:
 * - Elements with ARIA roles are in the correct scope
 * - Elements with ARIA roles contain the correct descendants
 * - ARIA attributes are validly assigned (they are on elements that correctly support them)
 * - Required ARIA attributes are present
 * The methods are "mixed-in" to the base aria toolkit class.
 *
 * Copyright (C) 2014  Rick Brown
 */
define(["aria.utils", "ValidationResult"], function(aria, ValidationResult){
	/**
	 * Provides conformance checking methods.
	 * 
	 * @exports ariavalidator
	 */
	function AriaValidator()
	{
		var elementsThatAllowInputOrSelection = {input:true, select:true, textarea:true},//for the aria-required rules
			ARIA_ATTR_RE = /^aria\-/;

		/**
		 * Checks that:
		 * <ul>
		 *  <li>an HTML element with strong native semantics has not been overridden with a different role</li>
		 *  <li>a 'special' HTML element has not been given an ARIA role</li>
		 *  <li>an HTML element has not been given an explicit ARIA role that it already possesses implicitly</li>
		 * </ul>
		 *
		 * Test is badly named now since I have extended it to check more than the "second rule".
		 * @function
		 * @param {Element} element A DOM element with an ARIA role.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by
		 * minimizing DOM access).
		 * @return {ValidationResult[]} Any failures or warnings.
		 *
		 * @example
		 *	var element = document.createElement("button");
		 *	element.setAttribute("role", "button");
		 *	aria.checkSecondRule(element);//this will flag a wartning because the "button" role is implicit on HTML button elements.
		 */
		this.checkSecondRule = function(element, role)
		{
			//This check is not backed directly by the RDF.
			var result = [],
				tagName = element.tagName,
				strength, implicit;
			if(arguments.length === 1)
			{
				role = aria.getRole(element);
			}
			if(tagName && role)
			{
				strength = aria.getSemanticStrength(element);
				if(strength)
				{
					if(strength === aria.semantic.SACRED)
					{
						result.push(new ValidationResult({key:"SPECIAL_ELEMENT_WITH_ROLE", tag:tagName, role:role, element:element}));
					}
					else if((implicit = aria.getImplicitRole(element)))
					{
						if(implicit === role)
						{
							result.push(new ValidationResult({key:"REDUNDANT_ROLE", tag: tagName, role:role, element:element}));
						}
						else if(strength === aria.semantic.STRONG)
						{
							result.push(new ValidationResult({key:"STRONG_ELEMENT_DIFFERENT_ROLE", tag: tagName, role:role, element:element}));
						}
					}
				}
			}
			return result;
		};

		/**
		 * Checks the implementation of IDs within the context of this element.
		 * This is not a true ARIA check however ARIA depends on IDs being correctly implemented.
		 * <br/>
		 * This check looks for:
		 * <ul>
		 * <li>Duplicate IDs</li>
		 * <li>IDs with illegal characters (according to HTML5 rules).</li>
		 * </ul>
		 * 
		 * @function
		 * @param {Element} element The element which scopes the check. This REALLY should be a document element (node type 9),
		 * it would be stupid to pass in anything else except for unit testing purposes.
		 * @return {ValidationResult[]} Any failures or warnings.
		 *
		 * @example
		 *	var element = document.createElement("div");
		 *	element.setAttribute("id", "kungfu");
		 *	element.appendChild(element.cloneNode());
		 *	element.appendChild(element.cloneNode());
		 *	aria.checkIds(element);//this will flag errors because there are duplicate IDs.
		 */
		this.checkIds = function(element){
			//TODO assumes HTML5, check doctype and apply rules based on HTML version? But really, who writes HTML4 anymore?
			var result = [], i, next, nextId, len, elements = element.querySelectorAll("[id]"), found = {};
			if(elements && (len = elements.length))
			{
				for(i=0; i<len; i++)
				{
					next = elements[i];
					nextId = next.id;
					if(nextId in found && found.hasOwnProperty(nextId))
					{
						result.push(new ValidationResult({key:"DUPLICATE_ID", id:nextId, element:next}));
					}
					else if(nextId.indexOf(" ") >= 0)
					{
						result.push(new ValidationResult({key:"INVALID_ID", id:nextId, element:next}));
					}
					found[nextId] = 1;
				}
			}
			return result;
		};

		/**
		 * Check the implementation of the "aria-owns" attribute on this element.
		 * This includes checking that:
		 * <ul>
		 *  <li>the element MUST not "aria-own" an id that is "aria-owned" somewhere else</li>
		 *  <li>the element it "aria-owns" actually exists in the DOM</li>
		 *  <li>the element SHOULD not contain the element it "aria-owns"</li>
		 * </ul>
		 * @function
		 * @param {Element} element A DOM element to check.
		 * @return {ValidationResult[]} Any failures or warnings.
		 *
		 * @example
		 *	var element = document.createElement("div");
		 *	element.setAttribute("aria-owns", "kungfu");
		 *	element = element.appendChild(document.createElement("span"));
		 *	element.setAttribute("id", "kungfu");
		 *	aria.checkAriaOwns(element);//this will flag a warning because the element "aria-owns" an element it implicitly owns in the DOM.
		 */
		this.checkAriaOwns = function(element)
		{
			//TODO check that it does not own itself
			var attr="aria-owns", result = [], i, len, next, nextElement, j, lenJ, nextJ, owners,
				document = element.ownerDocument,//deliberately shadow document to prevent silly errors in frames
				owned = element.getAttribute(attr);
			if(owned)
			{
				owned = aria.splitAriaIdList(owned);//don't use "getOwned" because we care about duplicate listings even if they are not found in the DOM
				for(i=0, len=owned.length; i<len; i++)
				{
					next = owned[i];
					owners = this.getOwner({
						id:next,
						ownerDocument: document
					}, true);
					if(owners)
					{
						lenJ=owners.length;
						nextElement = document.getElementById(next);
						if(nextElement)
						{
							for(j=0; j<lenJ; j++)
							{
								nextJ = owners[j];
								if(nextJ.compareDocumentPosition(nextElement) & Node.DOCUMENT_POSITION_CONTAINED_BY)
								{
									result.push(new ValidationResult({key: "ARIA_OWNS_DESCENDANT", attr:attr, element:element}));
								}
							}
						}
						else
						{
							result.push(new ValidationResult({key:"ARIA_OWNS_NON_EXISTANT_ELEMENT", attr:attr, id:next, element:element}));
						}
						if(lenJ > 1)
						{
							result.push(new ValidationResult({key:"ARIA_OWNS_ALREADY_OWNED", attr:attr, id:next, element:owners}));
						}
					}
					else
					{
						console.warn("This can not possibly happen");
					}
				}
			}
			return result;
		};

		/**
		 * Checks to ensure this element has not explicitly implemented an abstract role.
		 * @function
		 * @param {Element} element A DOM element with an ARIA role.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by minimizing DOM access).
		 * @return {ValidationResult[]} Any failures or warnings.
		 *
		 * @example
		 *	var element = document.createElement("span");
		 *	element.setAttribute("role", "input");
		 *	aria.checkAbstractRole(element);//this will flag errors because "input" is an abstract role.
		 */
		this.checkAbstractRole = function(element, role){
			//This check is not backed directly by the RDF, the RDF does not mark abstract roles. It is solid as long as the RDF does not change.
			var result = [];
			if(arguments.length === 1)
			{
				role = aria.getRole(element);
			}
			if(aria.isAbstractRole(role))
			{
				result.push(new ValidationResult({key:"ABSTRACT_ROLE_USED", role:role, element:element}));
			}
			return result;
		};

		/**
		 * Checks that an element has implemented all states and properties required for its role.
		 * @function
		 * @param {Element} element A DOM element.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by
		 * minimizing DOM access).
		 * @return {ValidationResult[]} Any failures or warnings.
		 *
		 * @example
		 *	var element = document.createElement("span");
		 *	element.setAttribute("role", "checkbox");
		 *	aria.checkRequiredAttributes(element);//this will flag errors because "checkbox" has a required state of "aria-checked".
		 */
		this.checkRequiredAttributes = function(element, role){
			var prop, nativelySupported, supported, result = [];
			if(!role)
			{
				role = aria.getRole(element, true);
			}
			supported = aria.getSupported(role);
			nativelySupported = aria.getNativelySupported(element);
			for(prop in supported)
			{
				if(supported[prop] === aria.REQUIRED && !(element.hasAttribute(prop) || isNativelySupported(prop, nativelySupported)))
				{
					result.push(new ValidationResult({key:"REQUIRED_ATTR_MISSING", role:role, attr:prop, element:element}));
				}
			}
			return result;
		};

		/**
		 * Checks:
		 * <ul>
		 *  <li>all the 'aria-*' attributes on this element are supported</li>
		 *  <li>aria attributes are not explicitly set on elements that implicitly provide the state/property</li>
		 * </ul>
		 * 
		 * @function
		 * @param {Element} element The element we are checking for aria-* attributes.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by minimizing DOM access).
		 * @return {ValidationResult[]} Any failures or warnings.
		 * @example
		 *	var element = document.createElement("span");
		 *	element.setAttribute("role", "checkbox");
		 *	element.setAttribute("aria-pressed", "true");
		 *	aria.checkSupportsAllAttributes(element);//this will flag errors because "checkbox" does not support "aria-pressed".
		 *
		 * @example
		 *	var element = document.createElement("input");
		 *	element.setAttribute("type", "checkbox");
		 *	element.setAttribute("aria-checked", "true");
		 *	aria.checkSupportsAllAttributes(element);//this will flag a warning because HTML input of type chekbox implicitly provides "aria-checked".
		 */
		this.checkSupportsAllAttributes = function(element, role){
			var supported, nativelySupported, i, next, attributes, result = [];
			if(!role)
			{
				role = aria.getRole(element, true);
			}
			supported = this.getSupported(role);
			nativelySupported = aria.getNativelySupported(element);
			attributes = element.attributes;
			for(i=attributes.length-1; i>=0; i--)
			{
				next = attributes[i].name;
				if(ARIA_ATTR_RE.test(next))
				{
					//result.addAttrs(next);
					if(!(next in supported))
					{

						if(role)
						{
							result.push(new ValidationResult({key:"UNSUPPORTED_ATTR_FOR_ROLE", role:role, attr:next, element:element}));
						}
						else
						{
							result.push(new ValidationResult({key:"UNSUPPORTED_ATTR_FOR_ELEMENT", attr:next, element:element}));
						}
					}
					else if("aria-required" === next && isFormElement(element) && isNativelySupported(next, nativelySupported))//darn it a special case... if there are more special cases this should be externalized somehow
					{
						//see also https://www.w3.org/Bugs/Public/show_bug.cgi?id=26416
						result.push(new ValidationResult({key:"ARIA_REQUIRED_ON_FORM_ELEMENT", attr:next, element:element}));
					}
					else if(isNativelySupported(next, nativelySupported))
					{
						result.push(new ValidationResult({key:"REDUNDANT_ATTR", attr:next, element:element}));
					}
				}
			}
			return result;
		};

		/**
		 * Checks that an element has implemented a legitimate aria role.
		 *
		 * @function
		 * @param {Element} element A DOM element with an ARIA role.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by minimizing DOM access).
		 * @return {ValidationResult[]} Any failures or warnings.
		 *
		 * @example
		 *	var element = document.createElement("span");
		 *	element.setAttribute("role", "kungfu");
		 *	aria.checkKnownRole(element);//this will flag errors because "kungfu" is not a legitimate aria role.
		 */
		this.checkKnownRole = function(element, role){
			var result = [];
			if(arguments.length === 1)
			{
				role = aria.getRole(element);
			}
			if(role && !this.hasRole(role))
			{
				result.push(new ValidationResult({key:"UNKNOWN_ROLE", role:role, element:element}));
			}
			return result;
		};

		/**
		 * Checks that this element is in the required scope for its role.
		 * @function
		 * @param {Element} element A DOM element with an ARIA role.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by minimizing DOM access).
		 * @return {ValidationResult[]} Any failures or warnings.
		 *
		 * @example
		 *	var element = document.createElement("span");
		 *	element.setAttribute("role", "tab");
		 *	aria.checkInRequiredScope(element);//this will flag errors because "tab" must be contained in "tablist".
		 */
		this.checkInRequiredScope = function(element, role){
			var next, required, result = [], passed, owner, parent;
			if(arguments.length === 1)
			{
				role = aria.getRole(element);
			}
			required = this.getScope(role);
			passed = !required.length;
			if(!passed)
			{
				parent = element;
				while((parent = parent.parentNode))
				{
					next = aria.getRole(parent, true);
					if(next && required.indexOf(next) >= 0)
					{
						passed = true;
						break;
					}
				}
			}
			if(!passed)
			{
				owner = this.getOwner(element);
				if(owner)
				{
					next = aria.getRole(owner, true);
					if(next && required.indexOf(next) >= 0)
					{
						//console.log("passed by being explicitly owned");
						passed = true;
					}
				}
			}
			if(!passed)
			{
				result.push(new ValidationResult({key:"NOT_IN_REQUIRED_SCOPE", role:role, roles:required, element:element}));
			}
			return result;
		};

		/**
		 * Checks that this element contains everything it "must contain".
		 * @function
		 * @param {Element} element A DOM element.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by minimizing DOM access).
		 * @return {ValidationResult[]} Any failures or warnings.
		 * @example
		 *	var element = document.createElement("div");
		 *	element.setAttribute("role", "listbox");
		 *	aria.checkContainsRequiredElements(element);//this will flag errors because it does not contain "option".
		 */
		this.checkContainsRequiredElements = function(element, role){
			//TODO needs to be aware of descendant elements with roles that create boundaries?
			var i, j, required, busy, result = [], owned, next, passed, descendants;
			if(arguments.length === 1)
			{
				role = aria.getRole(element);
			}
			required = this.getMustContain(role);
			passed = !required.length;
			if(!passed)
			{
				for(i=required.length-1; i>=0; i--)
				{
					next = required[i];
					descendants = aria.findDescendants(element, next);
					if(descendants && descendants.length)
					{
						passed = true;
						break;
					}
				}
			}
			if(!passed)
			{
				owned = this.getOwned(element);
				if(owned)
				{
					for(i=owned.length-1; i>=0; i--)
					{
						next = owned[i];
						for(j=required.length-1; j>=0; j--)
						{
							if(aria.getRole(next) === required[j])
							{
								//console.log("passed by explicit ownership");
								passed = true;
								break;
							}
						}
					}
				}
			}
			if(!passed)
			{
				busy = element.getAttribute("aria-busy");
				if(busy === "true")
				{
					result.push(new ValidationResult({key:"MISSING_REQUIRED_ROLES_BUSY", role:role, roles:required, element:element}));
				}
				else
				{
					result.push(new ValidationResult({key:"MISSING_REQUIRED_ROLES", role:role, roles:required, element:element}));
				}
			}
			return result;
		};
		
		/**
		 * Is this attribute natively supported?
		 *
		 * @param {string} attribute An aria attribute.
		 * @param {Object} nativelySupported The result of a call to aria.getNativelySupported.
		 * @return {boolean} true if this attribute is natively supported.
		 */
		function isNativelySupported(attribute, nativelySupported)
		{
			return (attribute in nativelySupported) && nativelySupported.hasOwnProperty(attribute);
		}

		/**
		 * Determine if this is a form elements that requires input or selection by the user.
		 * 
		 * @param {Element} element The element to check.
		 * @return {boolean} true if the element is a form element that requires input or selection.
		 */
		function isFormElement(element)
		{
			var result = false, tagName = element.tagName;
			if(tagName)
			{
				tagName = tagName.toLowerCase();
				result = elementsThatAllowInputOrSelection.hasOwnProperty(tagName);
			}
			return result;
		}
	}
	
	AriaValidator.call(aria);//mixin the public API of the AriaValidator to the base ARIA object.
	aria.ValidationResult = ValidationResult;//this is for non-AMD usage
	return aria;
});