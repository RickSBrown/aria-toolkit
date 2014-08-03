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
require(["aria.utils"], function(aria){
	/**
	 * Creates an aria validator with numerous public methods to run checks and find elements of interest.
	 * TODO move the "find elements of interest" to a separate library since it is not a core part of validation.
	 * @this aria
	 * @exports ariavalidator
	 */
	function AriaValidator()
	{
		var $this = this,
			elementsThatAllowInputOrSelection = {input:true, select:true, textarea:true},//for the aria-required rules
			roleChecks = {//todo, pull experiments out of roleChecks?
				experiments:[
					//checkFirstRule,
					"checkSecondRule"
				],
				tests :["checkInRequiredScope",
					"checkContainsRequiredElements",
					"checkRequiredAttributes",
					"checkSupportsAllAttributes",
					"checkAriaOwns",
					"checkAbstractRole",
					"checkKnownRole"]
			},
			attributeChecks = {
				tests:["checkSupportsAllAttributes",
						"checkRequiredAttributes",
						"checkAriaOwns"]
			},
			ARIA_ATTR_RE = /^aria\-/,
			options = {};

		/* Making these granular validation routines public so other libraries can utilize */
		//this.checkFirstRule = checkFirstRule;

		/**
		 * Validator configuration options.
		 * @function
		 * @param {Object} opts Configuration options, as documented below:
		 * opts.attributes - if true run checks
		 * opts.experimental - if true run experimental tests
		 * opts.ids - if true check IDs (not a true aria test but critical to aria success)
		 */
		this.setValidatorOptions = function(opts){
			if(opts)
			{
				options = opts;
			}
		};

		/**
		 * Call ARIA.check to check the correctness of any ARIA roles and attributes used in this DOM.
		 * @function
		 * @param {Window} window The browser window.
		 * @return {Summary[]} A summary of ARIA usage within this document and any frames it contains.
		 * @example ARIA.check(window);
		 */
		this.check = function(window){
			var result = [], document, body, frames, i, next, frameSummary, attributeResult;
			if(window && ((document = window.document) && (body = document.body)))
			{
				next = this.checkByRole(body);
				next.url = window.location.href;
				result[result.length] = next;
				frames = window.frames;
				next.framesTotal = frames.length;
				if(options.ids)
				{
					next.merge(this.checkIds(document));
				}
				if(options.attributes)
				{
					attributeResult = this.checkByAttribute(body);
				}
				if(attributeResult)
				{
					next.merge(attributeResult);
				}
				for(i=0; i<frames.length; i++)
				{
					try
					{
						frameSummary = $this.check(frames[i]);
						if(frameSummary && frameSummary.length)
						{
							result = result.concat(frameSummary);
						}
						next.framesChecked++;
					}
					catch(ex)
					{
						console.warn("Can not access frame, it is probably from a different origin");
					}
				}
			}
			return result;
		};

		/**
		 * Runs role based checks.
		 * This is a top level check - it runs a number of the more fine grained checks and is ultimately a convenience method.
		 * @function
		 * @param {Element} element The element which scopes the checks.
		 * @return {Summary} Any failures or warnings.
		 */
		this.checkByRole = function(element){
			var result,
				elements = $this.getElementsWithRole(element);
			if(elements)
			{
				result = runChecks(elements, roleChecks, true);
			}
			else
			{
				result = new Summary();
			}
			return result;
		};

		/**
		 * Runs attribute based checks.
		 * This is a top level check - it runs a number of the more fine grained checks and is ultimately a convenience method.
		 * @function
		 * @param {Element} element The element which scopes the checks.
		 * @return {Summary} Any failures or warnings.
		 */
		this.checkByAttribute = function(element){
			var result,
				elements = $this.getElementsWithAriaAttr(element);
			if(elements)
			{
				result = runChecks(elements, attributeChecks, false);
			}
			return result;
		};

		/*
		 * Helper for top level checks (checkByAttribute, checkByRole)
		 */
		function runChecks(elements, checks, usesRole)
		{
			var result = new Summary(),
				tests = checks.tests, len = tests.length;
			if(options && options.experimental && checks.experiments)
			{
				tests = tests.concat(checks.experiments);
			}
			elements.forEach(function(element){
				var i, next, role;
				if(usesRole)
				{
					role = aria.getRole(element);
					if(role)
					{
						result.addRoles(role);
					}
				}
				else
				{
					role = aria.getImplicitRole(element) || null;
				}
				if(role || !usesRole)
				{
					for(i=0; i<len; i++)
					{
						next = tests[i];
						next = aria[next](element, role);
						result.merge(next);
					}
				}
			});
			return result;
		}

		/**
		 * Attempts to check: http://www.w3.org/TR/aria-in-html/#second
		 * In other words it checks that an HTML element with strong native semantics has not been overridden with a
		 * different role.
		 * @function
		 * @param {Element} element A DOM element with an ARIA role.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by
		 * minimizing DOM access).
		 * @return {Summary} Any failures or warnings.
		 * This check is not backed directly by the RDF.
		 */
		this.checkSecondRule = function(element, role){
			var result = new Summary(),
				tagName = element.tagName,
				strength, implicit;
			if(arguments.length === 1)
			{
				role = aria.getRole(element);
			}
			if(tagName && role)
			{
				strength = aria.getSemanticStrength(element);
				if(strength && strength === aria.getSemanticStrength.STRONG)
				{
					implicit = aria.getImplicitRole(element);
					if(implicit !== role)
					{
						result.addWarnings(new Message(" on " + tagName + " possibly violates <a target='_blank' href='http://www.w3.org/TR/aria-in-html/#second'>2nd rule</a>", role, element));
					}
				}
			}
			return result;
		};

		/**
		 * Attempts to check: http://www.w3.org/TR/aria-in-html/#second
		 * In other words it checks that an HTML element with strong native semantics has not been overridden with a
		 * different role.
		 *
		 * Actually this test is badly named now since I have extended it to check a few other things too.
		 * @function
		 * @param {Element} element A DOM element with an ARIA role.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by
		 * minimizing DOM access).
		 * @return {Summary} Any failures or warnings.
		 * This check is not backed directly by the RDF.
		 */
		function checkSecondRule(element, role)
		{
			var result = new Summary(),
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
					if(strength === aria.getSemanticStrength.SACRED)
					{
						result.addWarnings(new Message(" on 'special' element: " + tagName, role, element));
					}
					else if((implicit = aria.getImplicitRole(element)))
					{
						if(implicit === role)
						{
							result.addWarnings(new Message(" on element " + tagName + " may be redundant because it implicitly has this role", role, element));
						}
						else if(strength === aria.getSemanticStrength.STRONG)
						{
							result.addWarnings(new Message(" on " + tagName + " possibly violates <a target='_blank' href='http://www.w3.org/TR/aria-in-html/#second'>2nd rule</a>", role, element));
						}
					}
				}
			}
			return result;
		}

		/**
		 * Checks IDs within the context of this element. Looks for:
		 * - Duplicate IDs
		 * - IDs with illegal characters
		 * Not strictly speaking an ARIA check however ARIA does depend heavily on IDs being correctly implemented.
		 * Plus duplicate IDs are a pet hate of mine.
		 * @function
		 * @param {Element} element The element which scopes the check. This REALLY should be a document element (node type 9),
		 * it would be stupid to pass in anything else except for unit testing purposes.
		 *
		 * TODO assumes HTML5, check doctype and apply rules based on HTML version? But really, who writes HTML4 anymore?
		 */
		this.checkIds = function(element){
			var result = new Summary(), i, next, nextId, len, elements = element.querySelectorAll("[id]"), found = {};
			if(elements && (len = elements.length))
			{
				for(i=0; i<len; i++)
				{
					next = elements[i];
					nextId = next.id;
					if(nextId in found && found.hasOwnProperty(nextId))
					{
						result.addFailures(new Message("Found duplicate id '" + nextId + "'", null, next));
					}
					else if(nextId.indexOf(" ") >= 0)
					{
						result.addFailures(new Message("Found id '" + nextId + "' but IDs are not allowed to have space characters", null, next));
					}
					found[nextId] = 1;
				}
			}
			return result;
		};

		/**
		 * Check the implementation of the "aria-owns" attribute on this element regardless of whether the element
		 * has an ARIA role or not.
		 * - SHOULD not contain the element it owns
		 * - MUST not "aria-own" an id that is "aria-owned" somewhere else.
		 * @function
		 * @param {Element} element A DOM element to check.
		 * @return {Summary} Any failures or warnings.
		 *
		 * This check is not founded on the RDF but it is a solid check.
		 * TODO check that it does not own itself
		 */
		this.checkAriaOwns = function(element)
		{
			var attr="aria-owns", result = new Summary(), i, len, msg, next, nextElement, j, lenJ, nextJ, owners,
				owned = element.getAttribute(attr);
			if(owned)
			{
				owned = aria.splitAriaIdList(owned);//don't use "getOwned" because we care about duplicate listings even if they are not found in the DOM
				for(i=0, len=owned.length; i<len; i++)
				{
					next = owned[i];
					owners = $this.getOwner({
						id:next,
						ownerDocument: element.ownerDocument
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
									msg = new Message(" should not be used if the relationship is represented in the DOM: ", attr, element);
									result.addWarnings(msg);
								}
							}
						}
						else
						{
							msg = new Message(" references an element that is not present in the DOM: ", attr, next);
							result.addWarnings(msg);
						}
						if(lenJ > 1)
						{
							msg = new Message(" IDREF must not be owned by more than one element: " + next, attr, owners);
							result.addFailures(msg);
						}
					}
					else
					{
						console.log("This can not possibly happen");
					}
				}
			}
			return result;
		};

		/**
		 * Checks that an element has not implemented an abstract role.
		 * @function
		 * @param {Element} element A DOM element with an ARIA role.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by
		 * minimizing DOM access).
		 * @return {Summary} Any failures or warnings.
		 * This check is not backed directly by the RDF, the RDF does not mark abstract roles. It is solid as long
		 * as the RDF does not change.
		 */
		this.checkAbstractRole = function(element, role){
			var result = new Summary();
			if(arguments.length === 1)
			{
				role = aria.getRole(element);
			}
			if(aria.isAbstractRole(role))
			{
				result.addFailures(new Message(" Authors MUST NOT use abstract roles in content.", role, element));
			}
			return result;
		};

		/**
		 * Checks that an element has implemented all states and properties required for its role.
		 * @function
		 * @param {Element} element A DOM element with an ARIA role.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by
		 * minimizing DOM access).
		 * @return {Summary} Any failures or warnings.
		 */
		this.checkRequiredAttributes = function(element, role){
			var prop, nativelySupported, supported, result = new Summary();
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
					result.addFailures(new Message("missing required attribute: " + prop, role, element));
				}
			}
			return result;
		};

		/**
		 * Check that all the 'aria-*' attributes on this element are supported regardless of whether the element
		 * has an ARIA role or not.
		 * @function
		 * @param {Element} element The element we are checking for aria-* attributes.
		 * @param {string} [role] Optionally provide the element's role or a falsey value if it does not have one
		 * (this allows you to optimize performance by minimizing DOM access).
		 * @return {Summary} Any failures or warnings.
		 */
		this.checkSupportsAllAttributes = function(element, role){
			var supported, nativelySupported, message, i, next, attributes, result = new Summary();
			if(!role)
			{
				role = aria.getRole(element, true);
			}
			supported = $this.getSupported(role);
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
							message = new Message("unsupported attribute: " + next, role, element);
						}
						else
						{
							message = new Message("is not supported on this element (see " + buildSpecLink("global_states", true) + ")", next, element);
						}
						result.addFailures(message);
					}
					else if("aria-required" === next && isFormElement(element) && isNativelySupported(next, nativelySupported))//darn it a special case... if there are more special cases this should be externalized somehow
					{
						//see also https://www.w3.org/Bugs/Public/show_bug.cgi?id=26416
						message = new Message("is not allowed when 'an exactly equivalent native attribute is available'", next, element);
						result.addFailures(message);
					}
					else if(isNativelySupported(next, nativelySupported))
					{
						message = new Message("is unnecessary as an equivalent native attribute is available", next, element);
						result.addWarnings(message);
					}
				}
			}
			return result;
		};

		/**
		 * Is this attribute natively supported?
		 * @function
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

		/**
		 * Checks that an element has implemented a legitimate aria role.
		 * @function
		 * @param {Element} element A DOM element with an ARIA role.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by minimizing DOM access).
		 * @return {Summary} Any failures or warnings.
		 */
		this.checkKnownRole = function(element, role){
			var result = new Summary();
			if(arguments.length === 1)
			{
				role = aria.getRole(element);
			}
			if(role && !$this.hasRole(role))
			{
				result.addFailures(new Message("role does not exist in ARIA", role, element));
			}
			return result;
		};

		/**
		 * Checks that this element is in the required scope for its role.
		 * @function
		 * @param {Element} element A DOM element with an ARIA role.
		 * @param {string} [role] Optionally provide the element's role (this allows you to optimize performance by minimizing DOM access).
		 * @return {Summary} Any failures or warnings.
		 */
		this.checkInRequiredScope = function(element, role){
			var next, required, result = new Summary(), passed, owner, parent;
			if(arguments.length === 1)
			{
				role = aria.getRole(element);
			}
			required = $this.getScope(role);
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
				owner = $this.getOwner(element);
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
				result.addFailures(new Message("not in required scope: " + required.join(" | "), role, element));
			}
			return result;
		};

		/*
		 * TODO needs to be aware of descendant elements with roles that create boundaries?
		 * I think it does not need to contain ALL the roles.
		 * @function
		 */
		this.checkContainsRequiredElements = function(element, role){
			var i, j, required, busy, result = new Summary(), owned, next, passed, descendants;
			if(arguments.length === 1)
			{
				role = aria.getRole(element);
			}
			required = $this.getMustContain(role);
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
				owned = $this.getOwned(element);
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
					result.addFailures(new Message("does not contain required roles (but it is busy, maybe you need to wait longer?): " + required.join(" | "), role, element));
				}
				else
				{
					result.addFailures(new Message("does not contain required roles: " + required.join(" | "), role, element));
				}
			}
			return result;
		};
	}

	/**
	 * Builds the HTML to link back to the relevant ARIA spec at w3.org.
	 *
	 * @param {string} name The name of the aria attribute in question.
	 * @return {string} HTML markup for a link to the relevant spec.
	 */
	function buildSpecLink(name)
	{
		var ROLE_RE =/^[a-z]+$/ ,
			html;
		if(name && (name = name.trim()))//TODO validate that it's a genuine target in the spec?
		{
			if(ROLE_RE.test(name))
			{
				html = '<a target="_blank" href="http://www.w3.org/TR/wai-aria/roles#{name}">{name}</a>';
			}
			else
			{
				html = '<a target="_blank" href="http://www.w3.org/TR/wai-aria/states_and_properties#{name}">{name}</a>';
			}
			html = html.replace(/\{name\}/g, name);
		}
		else
		{
			html="";
		}
		return html;
	}

	Message.prototype.toString = function(){
		var source = elementToSource(this.element), result = ["<details><summary>"];
		if(this.role)
		{
			result[result.length] = buildSpecLink(this.role);
			result[result.length] = " ";
		}
		result[result.length] = this.msg;
		result[result.length] = "</summary><p>";
		result[result.length] = source;
		result[result.length] = "</p></details>";
		return result.join("");
	};

	/**
	 * Generates an HTML string which holds the escaped HTML for a given element surrounded with 'code' tags.
	 * @param {Element} element The DOM element we want to represent as HTML.
	 * @return {string} The source HTML for the given element wrapped in 'code' tags.
	 */
	function elementToSource(element)
	{
		var result = "", i;
		if(element)
		{
			if(element.nodeType === Node.ELEMENT_NODE)
			{
				result = element.outerHTML;
				result = result.replace(/</g, "&lt;").replace(/>/g, "&gt;");
				result = "<code>" + result + "</code>";
			}
			else if(element.length)
			{
				for(i=0; i<element.length; i++)
				{
					result += elementToSource(element[i]);
				}
			}
			else
			{
				result = element.toString();
			}
		}
		return result;
	}

	function messageToListItem(message)
	{
		return ["<li>", message.toString(), "</li>"].join("");
	}

	/**
	 *
	 * @constructor
	 */
	function Message(msg, name, element)
	{
		this.msg = msg;
		this.role = name;
		this.element = element;
	}

	Summary.addUnique = function(instance, name, value){
		var i;
		if(value && instance[name])
		{
			if(Array.isArray(value))
			{
				for(i=0; i<value.length; i++)
				{
					instance[name][value[i]] = true;
				}
			}
			else
			{
				instance[name][value] = true;
			}
		}
	};

	Summary.getUnique = function(instance, name){
		return Object.keys(instance[name]);
	};

	/*
	 * TODO is this a bit too specific to the Chrome Extension? Move out of the core validator?
	 */
	Summary.prototype.toHtml = function(){
		var roles = this.getRoles(),
			failures = this.getFailures(),
			warnings = this.getWarnings(),
			passed = !failures.length,
			cssClass = (passed? "pass": "fail"),
			result = ["<div class='validatorResults "];
		result[result.length] = cssClass;
		result[result.length] = "'>";
		result[result.length] = "<button class='zoom' title='Enlarge this section. Esc to unzoom.'>Zoom</button>";
		if(roles.length)
		{
			result[result.length] = "<h2>Result</h2><p class='result'>";
			result[result.length] = (passed? "Pass": "Fail");
			result[result.length] = "</p>";
		}
		result[result.length] = "<h2>Page Details</h2><dl><dt>URL</dt><dd><a href='";
		result[result.length] = this.url;
		result[result.length] = "' target='_blank'>";
		result[result.length] = this.url;
		result[result.length] = "</a></dd><dt>";
		if(this.framesTotal)
		{
			result[result.length] = "Frames Checked</dt><dd>";
			result[result.length] = this.framesChecked + "/" + this.framesTotal;
			result[result.length] = "</dd><dt>";
		}
		result[result.length] = "Time</dt><dd>";
		result[result.length] = new Date();
		result[result.length] = "</dd></dl>";
		result[result.length] = "<h2>Roles Validated</h2>";
		if(roles.length)
		{
			result[result.length] = "<ul class='roles'>";
			result = result.concat(roles.map(function(role){
				return ["<li>", role, "</li>"].join("");
			}));
			result[result.length] = "</ul>";
		}
		else
		{
			result[result.length] = "<p>No ARIA Roles found in this document</p>";
		}
		if(failures.length)
		{
			result[result.length] = "<h2>Problems</h2><ul class='issues fail'>";
			result[result.length] = messagesToList(failures);
			result[result.length] = "</ul>";
		}
		if(warnings.length)
		{
			result[result.length] = "<h2>Potential Issues</h2><ul class='issues warn'>";
			result[result.length] = messagesToList(warnings);
			result[result.length] = "</ul>";
		}
		result[result.length] = "</div>";
		return result.join("");
	};

	/**
	 * Messages to <li> items.
	 * @param {Message[]} messages
	 * @returns {string} The <li> elements of an HTML list
	 */
	function messagesToList(messages)
	{
		var result = [],
			dupCount = 0, i, next,
			strings = messages.map(messageToListItem);
		strings.sort();
		for(i=0; i<strings.length; i++)
		{
			next = strings[i];
			if(result[result.length - 1] === next)
			{
				dupCount++;
			}
			else
			{
				if(dupCount)
				{
					result[result.length - 1] = result[result.length - 1].replace("</li>", " (repeated " + dupCount + " more times)</li>");
					dupCount = 0;
				}
				result[result.length] = next;
			}
		}
		if(dupCount)
		{
			result[result.length - 1] = result[result.length - 1].replace("</li>", " (repeated " + dupCount + " more times)</li>");
			dupCount = 0;
		}
		return result.join("");
	}

	/**
	 * @param {Summary} instance The instance to hold the messages.
	 * @param {Message|Message[]} message The message/s to add.
	 * @param {number} [severity] By default will be 0 ('failure' message).
	 */
	function addMessages(instance, message, severity){
		var idx = (severity || 0),
			msgs = instance.messages[idx];
		if(message)
		{
			if(message instanceof Message)
			{
				if(msgs)
				{
					msgs[msgs.length] = message;
				}
				else
				{
					instance.messages[idx] = [message];
				}
			}
			else if(message.length)//weak test for array
			{
				if(msgs)
				{
					instance.messages[idx] = msgs.concat(message);
				}
				else
				{
					instance.messages[idx] = message;
				}
			}
		}
	};

	function getMessages(instance, severity){
		var idx = (severity || 0),
			result = instance.messages[idx] || (instance.messages[idx] = []);
		return result;//return a copy instead to be safe?
	};

	Summary.prototype.getFailures = function(){
		return getMessages(this, 0);
	};

	Summary.prototype.addFailures = function(message){
		return addMessages(this, message, 0);
	};

	Summary.prototype.getWarnings = function(){
		return getMessages(this, 1);
	};

	Summary.prototype.addWarnings = function(message){
		return addMessages(this, message, 1);
	};

	Summary.prototype.addRoles = function(role){
		Summary.addUnique(this, "roles", role);
	};

	/*Summary.prototype.addAttrs = function(attr){
		Summary.addUnique(this, "attrs", attr);
	};*/

	Summary.prototype.getRoles = function(){
		return Summary.getUnique(this, "roles");
	};

	/*Summary.prototype.getAttrs = function(){
		return Summary.getUnique(this, "attrs");
	};*/

	/**
	 * Merges a summary instance into this instance.
	 * @param summary the instance to merge from.
	 */
	Summary.prototype.merge = function(summary){
		var i, next, data, getSet = [/*"Attrs", */{suffix: "Roles"}, {suffix:"Failures"}, {suffix: "Warnings"}];
		if(summary)
		{
			for(i=0; i<getSet.length; i++)
			{
				next = getSet[i].suffix;
				data = summary["get" + next]();
				this["add"+ next](data);
			}
			this.framesTotal += summary.framesTotal;
			this.framesChecked += summary.framesChecked;
		}
		else
		{
			console.warn("Tried to merge null summary");
		}
	};

	/**
	 *
	 * @constructor
	 */
	function Summary()
	{
		this.framesTotal = 0;
		this.framesChecked = 0;
		this.name = "";
		this.url = null;
		this.messages = [];//multidimensional array - zero will be failure messages, one will be warnings etc
		this.roles = {};
		//this.attrs = {};
	}
	
	AriaValidator.call(aria);//mixin the public API of the AriaValidator to the base ARIA object.
	//return aria;
});