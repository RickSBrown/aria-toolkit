/**
 * This file contains unit tests for the core aria.js functionality AND aria.validator.js.
 *
 * TODO probably should split validator tests into a separate 'spec' file.
 *
 * Copyright (C) 2014  Rick Brown
 */
describe("ARIA", function() {

	/* CORE TESTS */
	(function(){
		/**
		 * These expected arrays are obtained by me manually extracting them from the RDF using xpath queries in OxygenXML.
		 * @type Array
		 */
		var globalStates = ["aria-atomic", "aria-busy", "aria-controls", "aria-describedby",
									"aria-disabled", "aria-dropeffect", "aria-flowto", "aria-grabbed",
									"aria-haspopup", "aria-hidden", "aria-invalid", "aria-label",
									"aria-labelledby", "aria-live", "aria-owns", "aria-relevant"],
			ALL_ROLES = ["alert","alertdialog","application","article","banner","button","checkbox","columnheader","combobox","command","complementary","composite","contentinfo","definition","dialog","directory","document","form","grid","gridcell","group","heading","img","input","landmark","link","list","listbox","listitem","log","main","marquee","math","menu","menubar","menuitem","menuitemcheckbox","menuitemradio","navigation","note","option","presentation","progressbar","radio","radiogroup","range","region","roletype","row","rowgroup","rowheader","search","section","sectionhead","select","separator","scrollbar","slider","spinbutton","status","structure","tab","tablist","tabpanel","textbox","timer","toolbar","tooltip","tree","treegrid","treeitem","widget","window"],
			SCOPE_ROLES = ["combobox","grid","list","listbox","menu","radiogroup","row","rowgroup","tablist","tree","treegrid"],
			REQUIRED_SCOPE_ROLES = ["columnheader", "gridcell", "listitem", "menuitem", "menuitemcheckbox", "menuitemradio", "row", "rowgroup", "rowheader", "tab", "treeitem"],
			ALL_ATTRIBUTES = ["aria-activedescendant", "aria-atomic", "aria-autocomplete", "aria-busy", "aria-checked", "aria-controls", "aria-describedby", "aria-disabled", "aria-dropeffect", "aria-expanded", "aria-flowto", "aria-grabbed", "aria-haspopup", "aria-hidden", "aria-invalid", "aria-label", "aria-labelledby", "aria-level", "aria-live", "aria-multiline", "aria-multiselectable", "aria-orientation", "aria-owns", "aria-posinset", "aria-pressed", "aria-readonly", "aria-relevant", "aria-required", "aria-selected", "aria-setsize", "aria-sort", "aria-valuemax", "aria-valuemin", "aria-valuenow", "aria-valuetext"];

		ALL_ROLES.sort();
		REQUIRED_SCOPE_ROLES.sort();//owl:Class[child::role:scope]/@rdf:ID
		SCOPE_ROLES.sort();//owl:Class[child::role:mustContain]/@rdf:ID

	//	beforeEach(function() {
	//
	//	});

		it("getScope with no arguments should list all aria roles that require a particular scope", function() {
			var actual = ARIA.getScope();
			actual.sort();
			expect(actual).toEqual(REQUIRED_SCOPE_ROLES);
		});

		// This fails because the RDF does not reflect the rules in documentation
		//getScopeHelper("menuitem", ["group", "menu", "menubar"]);
		//getScopeHelper("option", ["listbox"]);

		getScopeHelper("listitem", ["list"]);
		getScopeHelper("listbox", []);
		getScopeHelper("radio", []);
		getScopeHelper("button", []);
		getScopeHelper("menuitemcheckbox", ["menu", "menubar"]);
		getScopeHelper("row", ["grid", "rowgroup", "treegrid"]);
		getScopeHelper("foobar", []);
		getScopeHelper("listbox", ["option"], "getMustContain");
		getScopeHelper("combobox", ["listbox", "textbox"], "getMustContain");
		getScopeHelper("option", [], "getMustContain");
		getScopeHelper("checkbox", [], "getMustContain");
		getScopeHelper("menubar", ["menuitem", "menuitemcheckbox", "menuitemradio"], "getScopedTo");
		getScopeHelper("option", ["listbox"], "getScopedBy");

		getSupportedHelper("checkbox", [
			{name:"aria-checked", value:ARIA.REQUIRED},
			{name:"aria-selected", value:undefined}]);

		getSupportedHelper("", [{name:"aria-checked", value:undefined}]);/* Empty role should return all globals and nothing else */
		getSupportedHelper("*");/* Wildcard role should return all possible aria states and properties */
		getSupportedHelper("foobar", [{name:"aria-checked", value:undefined}]);/* Nonsense role should return all globals and nothing else */

		function getSupportedHelper(role, expected)
		{
			var actual = ARIA.getSupported(role), prop,
				message = " for '" + role + "' role should be ";
			if(role !== "*")
			{
				it("all roles should support global attributes", function() {
					globalStates.forEach(function(next){
						expect(actual[next]).toEqual(ARIA.SUPPORTED);
					});
				});

			}
			else
			{
				it("wildcard role should return all possible aria states and properties", function() {
					for(prop in actual)
					{
						expect(ALL_ATTRIBUTES.indexOf(prop)).toBeGreaterThan(-1);
					}
					ALL_ATTRIBUTES.forEach(function(next){
						expect(actual[next]).toEqual(ARIA.SUPPORTED);
					});
				});
			}
			if(expected)
			{
				expected.forEach(function(next){
					var msg = next.name + message + next.value;
					it(msg, function() {
						expect(actual[next.name]).toEqual(next.value);
					});
				});
			}
		}

		function getScopeHelper(role, expected, funcName)
		{
			var method = funcName || "getScope",
				message = method + " for '" + role + "' role should return ";
			if(expected)
			{
				expected.sort();
				message += expected.length? expected.join() : "an empty array";
			}
			it(message, function() {
				var actual = ARIA[method](role);
				expect(actual.sort()).toEqual(expected);
			});
		}

		ALL_ROLES.forEach(function(role){
			it("hasRole should return true for know role: " + role, function() {
				expect(ARIA.hasRole(role)).toEqual(true);
			});
		});

		["foobar", "", 0, false, null, undefined].forEach(function(role){
			it("hasRole should return false for: " + role, function() {
				expect(ARIA.hasRole(role)).toEqual(false);
			});
		});

	})();

	/* VALIDATOR TESTS */
	(function(){
		var validator = window.ARIA;

		it("_checkAriaOwns on an element with no aria-owns should not report any problems", function() {
			checkHelper("fileMenu",0 ,0);
		});

		it("_checkAriaOwns an element with strange characters in ID should not throw exception", function() {
			checkHelper("ariaOwnsStrangeChars",0 ,0);
		});

		it("_checkAriaOwns on an element with correctly implemented aria-owns should not report any problems", function() {
			checkHelper("cb1-edit",0 ,0);
		});

		it("_checkAriaOwns on an element which is part of a duplicate own", function() {
			checkHelper("ownDuplicated",1 ,0);
		});

		it("_checkAriaOwns on an element which is nested in the DOM", function() {
			checkHelper("ownNested", 0, 1);
		});

		it("_checkContainsRequiredElements with multiple required and aria-owns", function() {
			checkHelper("cb1-edit", 0, 0, "_checkContainsRequiredElements");
		});

		it("_checkContainsRequiredElements with single required and dom owns", function() {
			checkHelper("rg1", 0, 0, "_checkContainsRequiredElements");
		});

		it("_checkContainsRequiredElements with single required and dom owns and missing required nodes", function() {
			checkHelper("rg2", 1, 0, "_checkContainsRequiredElements");
		});

		it("_checkInRequiredScope with single required and dom owns", function() {
			checkHelper("cb1-opt1", 0, 0, "_checkInRequiredScope");
		});

		it("_checkInRequiredScope with multiple required and dom owns", function() {
			checkHelper("menuitem1", 0, 0, "_checkInRequiredScope");
		});

		it("_checkInRequiredScope not in correct scope", function() {
			checkHelper("menuitemFail", 1, 0, "_checkInRequiredScope");
		});

		it("_checkSupportsAllAttributes on mandatory attribute", function() {
			checkHelper("r1", 0, 0, "_checkSupportsAllAttributes");
		});

		it("_checkSupportsAllAttributes on global attribute", function() {
			checkHelper("rg1", 0, 0, "_checkSupportsAllAttributes");
		});

		it("_checkSupportsAllAttributes on unsupported attribute", function() {
			checkHelper("menubar1", 1, 0, "_checkSupportsAllAttributes");
		});

		it("_checkRequiredAttributes on mandatory attribute", function() {
			checkHelper("r1", 0, 0, "_checkRequiredAttributes");
		});

		it("_checkRequiredAttributes on missing mandatory attribute", function() {
			checkHelper("checkbox1", 1, 0, "_checkRequiredAttributes");
		});

		it("_checkFirstRule on option with option role", function() {
			checkHelper("badOpt", 0, 1, "_checkFirstRule");
		});

		it("_checkFirstRule on li with radio role", function() {
			checkHelper("r1", 0, 0, "_checkFirstRule");
		});

		it("_checkSecondRule on heading with role", function() {
			checkHelper("badHeading", 0, 1, "_checkSecondRule");
		});

		it("_checkIds on subtree with no duplicates", function(){
			checkHelper("cb1-list", 0, 0, "_checkIds");
		});

		it("_checkIds on subtree with duplicates", function(){
			checkHelper("hasDuplicateIds", 1, 0, "_checkIds");
		});

		it("_checkIds on id with spaces", function(){
			checkHelper("idCheckSpace", 1, 0, "_checkIds");
		});

		it("_checkIds on document with issues", function(){
			checkHelper(document, 2, 0, "_checkIds");
		});

		it("_checkAbstractRole on an element with an abstract role", function(){
			checkHelper("abstractRoleUsed", 1, 0, "_checkAbstractRole");
		});

		it("_checkAbstractRole on an element with a widget role", function(){
			checkHelper("menuitem1", 0, 0, "_checkAbstractRole");
		});

		(function(){
			var failCountTotal = 0,
				warnCountTotal = 0,
				attrChecks = [
					{id:"invalidAttrNoRole", fail:2, warn:0},
					{id:"invalidAttrAndGlobalAttrNoRole", fail:2, warn:0},
					{id:"invalidAttrAndGlobalAttrNoRoleAncestor", fail:2, warn:0, nocount:true},
					{id:"globalAttrsNoRole", fail:0, warn:0},
					{id:"globalAttrsAndRole", fail:0, warn:0},
					{id:"globalAttrsAndInvalidRole", fail:0, warn:0},
					{id:"nonglobalAttrsNoRole", fail:1, warn:0},
					{id:"nonglobalAttrsAndRole", fail:0, warn:0},
					{id:"nonglobalAttrsAndInvalidRole", fail:0, warn:0},
					{id:"mixedAttrsNoRole", fail:1, warn:0},
					{id:"mixedAttrsAndRole", fail:0, warn:0},
					{id:"mixedAttrsAndInvalidRoles", fail:0, warn:0}
				],
				funcName = "_checkByAttribute";
			attrChecks.forEach(function(check){
				if(!check.nocount)
				{
					failCountTotal += check.fail;
					warnCountTotal += warnCountTotal;
				}
				it(funcName + " on element " + check.id, function(){
					checkHelper(check.id, check.fail, check.warn, funcName);
				});
			});
			it(funcName + " on element " + "attributeCheckTree", function(){
				checkHelper("attributeCheckTree", failCountTotal, warnCountTotal, funcName);
			});

		})();

		function checkHelper(id, failCount, warnCount, funcName)
		{
			var method = funcName || "_checkAriaOwns",
				element = id.constructor === String? document.getElementById(id) : id,
				result = validator[method](element, element.nodeType === Node.ELEMENT_NODE? element.getAttribute("role") : ""),
				warnings = result.getWarnings(),
				failures = result.getFailures();
			expect(warnings.length).toEqual(warnCount);
			expect(failures.length).toEqual(failCount);
		}
	})();

});