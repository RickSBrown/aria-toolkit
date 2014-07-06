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
			warnings = this.getWarnings(),
			passed = !warnings.length,
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
		result[result.length] = "<h2>Page Details</h2><dl><dt>URL</dt><dd>";
		result[result.length] = this.url;
		result[result.length] = "</dd><dt>Time</dt><dd>";
		result[result.length] = new Date();
		result[result.length] = "</dd></dl>";
		result[result.length] = "<h2>Roles Validated</h2>";
		if(roles.length)
		{
			result[result.length] = "<ul>";
			result = result.concat(roles.map(function(role){
				return ["<li>", role, "</li>"].join("");
			}));
			result[result.length] = "</ul>";
			if(warnings.length)
			{
				result[result.length] = "<h2>Warnings</h2><ul>";
				result = result.concat(warnings.map(function(message){
					return ["<li>", message.role, " ", message.msg, "</li>"].join("");
				}));
				result[result.length] = "</ul>";
			}
			else
			{
				result[result.length] = "<p>No issues detected - well done :)</p>";
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
	 * @param {Message|Message[]} message The message/s to add to the warnings.
	 */
	Summary.prototype.addWarnings = function(message){
		if(message)
		{
			if(message instanceof Message)
			{
				this.warnings[this.warnings.length] = message;
			}
			else if(message.length)
			{
				this.warnings = this.warnings.concat(message);
			}
		}
	};

	Summary.prototype.getWarnings = function(){
		return this.warnings;//return a copy instead to be safe?
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
		var i, next, getSet = [/*"Attrs", */"Roles", "Warnings"];
		for(i=0; i<getSet.length; i++)
		{
			next = getSet[i];
			this["add"+ next](summary["get" + next]());
		}
	};

	/**
	 *
	 * @constructor
	 */
	function Summary()
	{
		this.name = "";
		this.url = null;
		this.warnings = [];
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
			ARIA_ATTR_RE = /^aria\-/;

		/**
		 * Call ARIA.check to check the correctness of any ARIA roles and attributes used in this DOM.
		 * @param {Window} window The browser window.
		 * @return {Summary[]} A summary of ARIA usage within this document and any frames it contains.
		 * @example ARIA.check(document.body);
		 */
		$this.check = function(window)
		{
			var result = [], document, body, frames, i, next, frameSummary;
			try
			{
				if(window && ((document = window.document) && (body = document.body)))
				{
					next = checkByRole(body);
					next.url = window.location.href;
					result[result.length] = next;
					frames = window.frames;
					for(i=0; i<frames.length; i++)
					{
						try
						{
							frameSummary = $this.check(frames[i]);
							if(frameSummary && frameSummary.length)
							{
								result = result.concat(frameSummary);
							}
						}
						catch(ex)
						{
							console.info("Error checking frame");
						}
					}
				}
			}
			catch(ex)
			{
				console.warn("Can not access frame, it is probably from a different origin");
			}
			return result;
		};

		function checkByRole(element)
		{
			var result = new Summary(), role, next, i, messages, elements = element.querySelectorAll("[role]"), j, nextJ,
				tests = [checkInRequiredScope,
					checkContainsRequiredElements,
					checkRequiredAttributes,
					checkSupportsAllAttributes];
			for(i=elements.length-1; i>=0; i--)
			{
				next = elements[i];
				role = getRole(next);
				if(role)
				{
					result.addRoles(role);
					for(j=0; j<tests.length; j++)
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

		function checkRequiredAttributes(element, role, summary)
		{
			var result = new Summary(), prop, supported = $this.getSupported(role);
			for(prop in supported)
			{
				if(supported[prop] === $this.REQUIRED && !element.hasAttribute(prop))
				{
					result.addWarnings(new Message("missing required attribute: " + prop, role, element));
				}
			}
			return result;
		}

		function checkSupportsAllAttributes(element, role)
		{
			var supported = $this.getSupported(role),
				result = new Summary(), i, next, attributes;
			attributes = element.attributes;
			for(i=attributes.length-1; i>=0; i--)
			{
				next = attributes[i].name;
				if(ARIA_ATTR_RE.test(next))
				{
					//result.addAttrs(next);
					if(!(next in supported))
					{
						result.addWarnings(new Message("unsupported attribute: " + next, role, element));
					}
				}
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
				result.addWarnings(new Message("not in required scope: " + required.join(" | "), role, element));
			}
			return result;
		}

		/*
		 * TODO needs to be aware of descendant elements with roles that create boundaries?
		 */
		function checkContainsRequiredElements(element, role)
		{
			var i, next, required = $this.getMustContain(role),
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
				result.addWarnings(new Message("does not contain required roles: " + required.join(" | "), role, element));
			}
			return result;
		}
	}

})();
