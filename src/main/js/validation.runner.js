/*
 * This file drives the aria validator.
 *
 * Copyright (C) 2014  Rick Brown
 */
require(["aria.validator", "replace", "mixin"], function(aria, replace, mixin){

	/**
	 * This sits on top of the core validator module and "drives" it to run checks on an HTML window and format the results as HTML.
	 * It is not intended for reuse and any genuinely useful utility methods should probably be refactored to another modules.
	 *
	 * @exports validationrunner
	 */
	function ValidationRunner()
	{
		var options = {},
			roleChecks = {
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
			};

		/**
		 * Validator configuration options.
		 * @function
		 * @param {Object} opts Configuration options, as documented below
		 *
		 * @param {boolean} [opts.attributes] if true find and check elements with aria attributes but no explicit aria role.
		 * @param {boolean} [opts.experimental] if true run experimental tests
		 * @param {boolean} [opts.ids] if true check IDs (not a true aria test but critical to aria success)
		 */
		this.setValidatorOptions = function(opts){
			if(opts)
			{
				options = opts;
			}
		};

		/**
		 * Check the conformance of ARIA roles and attributes used in on elements in this window.
		 * This is the highest level entry point to the validator; it is a convenience method to run all other checks.
		 * @function
		 * @param {Window} window The window which contains the DOM document to test (could be window, self, top, etc).
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
						frameSummary = this.check(frames[i]);
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
		 * Runs checks on elements which have an explicit ARIA role.
		 * This is a convenience method to run lower level checks.
		 * @function
		 * @param {Element} element The element which scopes the checks.
		 * @return {Summary} Any failures or warnings.
		 */
		this.checkByRole = function(element){
			var result,
				elements = this.getElementsWithRole(element);
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
		 * Runs checks on elements which have explicit ARIA attributes but no explicit role.
		 * This is a convenience method to run lower level checks.
		 * @function
		 * @param {Element} element The element which scopes the checks.
		 * @return {Summary} Any failures or warnings.
		 */
		this.checkByAttribute = function(element){
			var result,
				elements = this.getElementsWithAriaAttr(element);
			if(elements)
			{
				result = runChecks(elements, attributeChecks, false);
			}
			return result;
		};

		/*
		 * Helper for top level checks (checkByAttribute, checkByRole)
		 * Runs a number of checks and returns the combined result.
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
						result.add(next);
					}
				}
			});
			return result;
		}
	}//end ValidationRunner

	/**
	 * Builds the HTML to link back to the relevant ARIA spec at w3.org.
	 *
	 * @param {string|string[]} name The name/s of the aria attribute in question.
	 * @return {string} HTML markup for a link to the relevant spec.
	 */
	function buildSpecLink(name)
	{
		var html, ROLE_RE =/^[a-z]+$/;
		if(Array.isArray(name))
		{
			html = name.map(buildSpecLink);
			html = html.join("|");
		}
		else if(name && (name = name.trim()))//TODO validate that it's a genuine target in the spec?
		{
			if(ROLE_RE.test(name))
			{
				html = '<a target="_blank" href="http://www.w3.org/TR/wai-aria/roles#{name}">{name}</a>';
			}
			else
			{
				html = '<a target="_blank" href="http://www.w3.org/TR/wai-aria/states_and_properties#{name}">{name}</a>';
			}
			html = replace(html, {name: name});
		}
		else
		{
			html="";
		}
		return html;
	}

	/**
	 * Generates an HTML string which holds the escaped HTML for a given element surrounded with 'code' tags.
	 * @param {Element|Element[]} element The DOM element we want to represent as HTML.
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

	/*
	 * TODO is this a bit too specific to the Chrome Extension? Move out of the core validator?
	 */
	Summary.prototype.toHtml = function(){
		var roles = this.getRoles(),
			failures = this.get(aria.level.ERROR),
			warnings = this.get(aria.level.WARN),
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
			result[result.length] = validationResultsToList(failures);
			result[result.length] = "</ul>";
		}
		if(warnings.length)
		{
			result[result.length] = "<h2>Potential Issues</h2><ul class='issues warn'>";
			result[result.length] = validationResultsToList(warnings);
			result[result.length] = "</ul>";
		}
		result[result.length] = "</div>";
		return result.join("");
	};

	/**
	 * ValidationResults to an HTML list - exact duplicates are removed.
	 * @param {ValidationResult[]} validationResults
	 * @returns {string} The <li> elements of an HTML list.
	 */
	function validationResultsToList(validationResults)
	{
		var result = [],
			dupCount = 0, i, next,
			strings = validationResults.map(validationResultToListItem);
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

	function validationResultToListItem(validationResult)
	{
		var result, msg = validationResult.msg;
		if(!msg)
		{
			validationResult.msg = "<li><details><summary>" + validationResult.getMsg() + "</summary>{element}</details></li>";
		}
		result = validationResult.toString({
				elements:elementToSource,
				element: elementToSource,
				role: buildSpecLink,
				roles: buildSpecLink,
				attr: buildSpecLink,
				attrs: buildSpecLink
			});
		return result;
	}

	Summary.prototype.addRoles = function(role){
		Summary.addUnique(this, "roles", role);
	};

	/*Summary.prototype.addAttrs = function(attr){
		Summary.addUnique(this, "attrs", attr);
	};*/

	Summary.prototype.getRoles = function(){
		return Object.keys(this.roles);
	};

	/**
	 * Merges a summary instance into this instance.
	 * @param summary the instance to merge from.
	 */
	Summary.prototype.merge = function(summary){
		if(summary)
		{
			this.framesTotal += summary.framesTotal;
			this.framesChecked += summary.framesChecked;
			this.add(summary.results);
			mixin(this.roles, summary.roles);
		}
		else
		{
			console.warn("Tried to merge null summary");
		}
	};

	/**
	 * Add the result of validation checks
	 * @param {ValidationResult|ValidationResult[]} validationResult
	 */
	Summary.prototype.add = function(validationResult){
		if(validationResult)
		{
			this.results = this.results.concat(validationResult);
		}
	};

	/**
	 * Retrieve the validationResults from this summary.
	 * The returned result is a copy of the underlying store so you can modify it safely.
	 * @param {number} [level] If provided will only return instances at this severity level, otherwise all are returned.
	 * Levels are provided by the ariavalidator module and will be either: level.WARN or level.ERRROR.
	 * @return {ValidationResult[]} The validationResults held in this summary.
	 */
	Summary.prototype.get = function(level){
		var result = this.results;
		if(level || level === 0)
		{
			result = result.filter(function(validationResult){
				return validationResult.level === level;
			});
		}
		else
		{
			result  = result.concat();
		}
		return result;
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
		this.results = [];//multidimensional array - each index will hold a different severity level
		this.roles = {};
		//this.attrs = {};
	}

	ValidationRunner.call(aria);
});