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

	Message.prototype.toString = function(){
		return messageToString(this);
	};

	function messageToString(message)
	{
		return ["<li><a target='_blank' href='http://www.w3.org/TR/wai-aria/roles#", message.role, "'>", message.role, "</a> ", message.msg, "</li>"].join("");
	}

	/**
	 *
	 * @constructor
	 */
	function Message(msg, role, element)
	{
		this.msg = msg;
		this.role = role;
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

	Summary.prototype.toHtml = function(){
		var roles = this.getRoles(),
			dupCount = 0, next, i,
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
				result[result.length] = "<h2>Problems</h2><ul class='fail'>";
				result[result.length] = messagesToList(failures);
				result[result.length] = "</ul>";
			}
			if(warnings.length)
			{
				result[result.length] = "<h2>Potential Issues</h2><ul class='warn'>";
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
			strings = messages.map(messageToString);
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
		for(i=0; i<getSet.length; i++)
		{
			next = getSet[i].suffix;
			data = summary["get" + next]();
			this["add"+ next](data);
		}
		this.framesTotal += summary.framesTotal;
		this.framesChecked += summary.framesChecked;
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
				warns:[
					checkFirstRule,
					checkSecondRule
				],
				tests :[checkInRequiredScope,
					checkContainsRequiredElements,
					checkRequiredAttributes,
					checkSupportsAllAttributes]
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
			var result = [], document, body, frames, i, next, frameSummary;
			if(window && ((document = window.document) && (body = document.body)))
			{
				next = checkByRole(body);
				next.url = window.location.href;
				result[result.length] = next;
				frames = window.frames;
				next.framesTotal = frames.length;
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
				tests = tests.concat(roleChecks.warns);
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
				if(concepts.indexOf(tagName))
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
				result.addFailures(new Message("role does not exist in ARIA", role, element));
			}
			return result;
		}

		function checkInRequiredScope(element, role)
		{
			var next, required = $this.getScope(role), result = new Summary(), passed = !required.length;
			if(!passed)
			{
				while((element = element.parentNode))
				{
					next = getRole(element);
					if(next && required.indexOf(next) >= 0)
					{
						passed = true;
						break;
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
		 */
		function checkContainsRequiredElements(element, role)
		{
			var i, required = $this.getMustContain(role),
				result = new Summary(),
				passed = !required.length;
			if(!passed)
			{
				for(i=required.length-1; i>=0; i--)
				{
					if(element.querySelector("[role='" + required[i] + "']"))
					{
						passed = true;
						break;
					}
				}
			}
			if(!passed)
			{
				result.addFailures(new Message("does not contain required roles: " + required.join(" | "), role, element));
			}
			return result;
		}
	}

})();
