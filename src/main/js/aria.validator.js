/**
 * This file provides functionality to validate the DOM to ensure that:
 * - Elements with ARIA roles are in the correct scope
 * - Elements with ARIA roles contain the correct descendants
 * - ARIA attributes are validly assigned (they are on elements that correctly support them)
 * - Required ARIA attributes are present
 * The methods are added to the base instance of the ARIA class.
 *
 * Copyright (C) 2014  Rick Brown
 */
(function(){

	function buildSpecLink(name, attr)
	{

		var html;
		if(attr)
		{
			html = '<a target="_blank" href="http://www.w3.org/TR/wai-aria/states_and_properties#aria-owns#{name}">{name}</a>';
		}
		else
		{
			html = '<a target="_blank" href="http://www.w3.org/TR/wai-aria/roles#{name}">{name}</a>';
		}
		if(name)//TODO validate that it's a real target?
		{
			html = html.replace(/\{name\}/g, name);
		}
		return html;
	}

	Message.prototype.toString = function(){
		var source = elementToSource(this.element), result = ["<details><summary>"];
		if(this.role)
		{
			result[result.length] = buildSpecLink(this.role, this.isAttribute);
			result[result.length] = " ";
		}
		result[result.length] = this.msg;
		result[result.length] = "</summary><p>";
		result[result.length] = source;
		result[result.length] = "</p></details>";
		return result.join("");
	};

	function elementToSource(element)
	{
		var result, i;
		if(element)
		{
			if(element.nodeType === Node.ELEMENT_NODE)
			{
				result = element.outerHTML;
				result = result.replace(/</g, "&lt;").replace(/>/g, "&gt;");
				result = "<pre>" + result + "</pre>";
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
		else
		{
			result = "";
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
		this.isAttribute = false;
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

	Summary.prototype.toHtml = function(){
		var roles = this.getRoles(),
			failures = this.getFailures(),
			warnings = this.getWarnings(),
			passed = !failures.length,
			cssClass = (passed? "pass": "fail"),
			result = ["<div class='validatorResults "];
		result[result.length] = cssClass;
		result[result.length] = "'>";
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
		}
		else
		{
			result[result.length] = "<p>No ARIA Roles found in this document</p>";
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

	AriaValidator.call(window.ARIA);
	/**
	 * @this ARIA
	 */
	function AriaValidator()
	{
		var $this = this,
			roleChecks = {
				experiments:[
					checkFirstRule,
					checkSecondRule
				],
				tests :[checkInRequiredScope,
					checkContainsRequiredElements,
					checkRequiredAttributes,
					checkSupportsAllAttributes,
					checkAriaOwns]
			},
			ARIA_ATTR_RE = /^aria\-/,
			HIGHLY_SEMANTIC_HTML = {
				H1:"H1",
				H2:"H2",
				H3:"H3",
				H4:"H4",
				H5:"H5",
				H6:"H6"
			};

		/* TEST HOOKS - YEP, MAKING IT PUBLIC JUST FOR TESTING */
		$this._checkAriaOwns = checkAriaOwns;
		$this._checkContainsRequiredElements = checkContainsRequiredElements;
		$this._checkInRequiredScope = checkInRequiredScope;
		$this._checkSupportsAllAttributes = checkSupportsAllAttributes;
		$this._checkRequiredAttributes = checkRequiredAttributes;
		$this._checkFirstRule = checkFirstRule;
		$this._checkSecondRule = checkSecondRule;
		$this._checkIds = checkIds;

		/**
		 * Call ARIA.check to check the correctness of any ARIA roles and attributes used in this DOM.
		 * @param {Window} window The browser window.
		 * @param {Object} [options] Configuration options.
		 * options.experimental - if true run experimental tests
		 * @return {Summary[]} A summary of ARIA usage within this document and any frames it contains.
		 * @example ARIA.check(document.body);
		 */
		$this.check = function(window, options)
		{
			var result = [], document, body, frames, i, next, frameSummary, idResult;
			if(window && ((document = window.document) && (body = document.body)))
			{
				next = checkByRole(body);
				next.url = window.location.href;
				result[result.length] = next;
				frames = window.frames;
				next.framesTotal = frames.length;
				if(options.ids)
				{
					next.merge(checkIds(document));
				}
				for(i=0; i<frames.length; i++)
				{
					try
					{
						frameSummary = $this.check(frames[i], options);
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

		function checkByRole(element, options)
		{
			var result = new Summary(), role, next, i, elements = element.querySelectorAll("[role]"),
				lenJ, j, nextJ, tests = roleChecks.tests;
			if(options && options.experimental)
			{
				tests = tests.concat(roleChecks.experiments);
			}
			for(i=elements.length-1; i>=0; i--)
			{
				next = elements[i];
				role = getRole(next);
				if(role)//todo check if hasAttribute role but value is empty
				{
					result.addRoles(role);
					for(j=0, lenJ=tests.length; j<lenJ; j++)
					{
						nextJ = tests[j](next, role);
						if(nextJ)
						{
							result.merge(nextJ);
						}
					}
				}
			}
			return result;
		}

		function getRole(element)
		{
			var result;
			if(element.getAttribute)
			{
				result = element.getAttribute("role");
			}
			return result;
		}

		/*
		 * This is really difficult to test programatically - allow as optional check
		 */
		function checkFirstRule(element, role)
		{
			//http://www.w3.org/TR/aria-in-html/#first
			var result = new Summary(),
				concepts = $this.getConcept(role, true),
				tagName = element.tagName;
			if(tagName && concepts && concepts.length)
			{
				tagName = tagName.toUpperCase();
				if(concepts.indexOf(tagName) >= 0)
				{
					result.addWarnings(new Message(" on " + tagName + " possibly violates <a target='_blank' href='http://www.w3.org/TR/aria-in-html/#rule1'>1st rule</a>, consider native: " + concepts.join(), role, element));
				}
			};
			return result;
		}

		/*
		 * This is really difficult to test programatically - allow as optional check
		 */
		function checkSecondRule(element, role)
		{
			//http://www.w3.org/TR/aria-in-html/#second
			var result = new Summary(), tagName = element.tagName;
			if(tagName)
			{
				tagName = tagName.toUpperCase();
				if(HIGHLY_SEMANTIC_HTML.hasOwnProperty(tagName))
				{
					result.addWarnings(new Message(" on " + tagName + " possibly violates <a target='_blank' href='http://www.w3.org/TR/aria-in-html/#second'>2nd rule</a>", role, element));
				}
			}
			return result;
		}
		
		/*
		 * Not strictly speaking an ARIA check however ARIA does depend heavily on IDs being correctly implemented.
		 * Plus it is a pet hate of mine, duplicate IDs.
		 * @param {Document} element A document element (node type 9 off the top of my head)
		 */
		function checkIds(element)
		{
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
		}

		/*
		 * NON-RDF based but solid.
		 * TODO not really a role check - create a class of attribute checks
		 * Check the implementation of the "aria-owns" attribute on this element
		 * - SHOULD not contain the element it owns
		 * - MUST not "aria-own" an id that is "aria-owned" somewhere else.
		 */
		function checkAriaOwns(element, role)
		{
			var attr="aria-owns", result = new Summary(), i, len, msg, next, nextElement, j, lenJ, nextJ, owners, owned = element.getAttribute(attr);
			if(owned)
			{
				owned = splitAriaIdList(owned);//don't use "getOwned" because we care about duplicate listings even if they are not found in the DOM
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
									msg.isAttribute = true;
									result.addWarnings(msg);
								}
							}
						}
						else
						{
							msg = new Message(" references an element that is not present in the DOM: ", attr, next);
							msg.isAttribute = true;
							result.addWarnings(msg);
						}
						if(lenJ > 1)
						{
							msg = new Message(" IDREF must not be owned by more than one element: " + next, attr, owners);
							msg.isAttribute = true;
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
		}

		function checkRequiredAttributes(element, role)
		{
			var result = new Summary(), prop, supported = $this.getSupported(role);
			for(prop in supported)
			{
				if(supported[prop] === $this.REQUIRED && !element.hasAttribute(prop))
				{
					result.addFailures(new Message("missing required attribute: " + prop, role, element));
				}
			}
			return result;
		}

		function checkSupportsAllAttributes(element, role)
		{
			var supported = $this.getSupported(role),
				result = new Summary(), i, next, attributes;
			attributes = element.attributes;
			if(supported)//it is possible we have an unsupported role AND aria attributes - hence null check on supported
			{
				for(i=attributes.length-1; i>=0; i--)
				{
					next = attributes[i].name;
					if(ARIA_ATTR_RE.test(next))
					{
						//result.addAttrs(next);
						if(!(next in supported))
						{
							result.addFailures(new Message("unsupported attribute: " + next, role, element));
						}
					}
				}
			}
			else//it's not a real aria role
			{
				result.addFailures(new Message("role does not exist in ARIA", role, element));//TODO this is not the right place for this test
			}
			return result;
		}

		function checkInRequiredScope(element, role)
		{
			var next, required = $this.getScope(role), result = new Summary(), passed = !required.length, owner, parent;
			if(!passed)
			{
				parent = element;
				while((parent = parent.parentNode))
				{
					next = getRole(parent);
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
					next = getRole(owner);
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
		}

		/*
		 * TODO needs to be aware of descendant elements with roles that create boundaries?
		 * I think it does not need to contain ALL the roles.
		 */
		function checkContainsRequiredElements(element, role)
		{
			var i, j, required = $this.getMustContain(role),
				result = new Summary(), owned, next,
				passed = !required.length;
			if(!passed)
			{
				for(i=required.length-1; i>=0; i--)
				{
					next = required[i];
					if(element.querySelector("[role='" + next + "']"))
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
							if(getRole(next) === required[j])
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
				result.addFailures(new Message("does not contain required roles: " + required.join(" | "), role, element));
			}
			return result;
		}

		/**
		* Gets the element that "aria-owns" this element
		* @param {Element} element a DOM element
		* @param {boolean} showAll If true will return multiple owners, if found, even though this is invalid (result will be nodeList).
		* @return {Element|undefined}
		* 		the element which owns the passed in element (if any) or undefined if no owner found
		*/
		$this.getOwner = function(element, showAll)
		{
			var id = element.id, ownerQuery, result, document = element.ownerDocument;
			if(id)
			{
				id = id.replace(/'/g, "\\'");
				ownerQuery = "[aria-owns~='" + id  + "']";
				result = document.querySelectorAll(ownerQuery);
				if(!showAll)
				{
					if(result)
					{
						if(result.length > 1)
						{
							console.warn("Found more than one element which 'aria-owns' id ", id);
						}
						result = result[0];
					}
				}
			}
			return result;
		};
		/**
		 * Gets elements that are indirectly owned by a DOM element with "aria-owns".
		 * @param {Element} element a DOM element.
		 * @return {array} An array of elements owned by the element.
		 */
		$this.getOwned = function(element)
		{
			var ids = element.getAttribute("aria-owns"), result = [], i, len, owned, document = element.ownerDocument;
			if(ids)
			{
				ids = splitAriaIdList(ids);
				for(i = 0, len = ids.length; i < len; ++i)
				{
					owned = document.getElementById(ids[i]);
					if(owned)
					{
						result.push(owned);
					}
					else
					{
						console.warn("can not element specified in 'aria-owns' with id ", ids[i]);
					}
				}
			}
			return result;
		};

		function splitAriaIdList(val)
		{
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
		}

	}

})();
