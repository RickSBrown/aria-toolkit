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
		//getScopeHelper("gridcell", ["TD"], "getConcept");
		//getScopeHelper("list", ["OL", "UL"], "getConcept");
		//getScopeHelper("listbox", ["SELECT"], "getConcept");
		//getScopeHelper("select", [], "getConcept");
		//getScopeHelper("separator", ["HR"], "getConcept");
		//getScopeHelper("textbox", ["TEXTAREA", "INPUT"], "getConcept");
		//getScopeHelper("button", ["BUTTON"], "getConcept");
		//getScopeHelper("BUTTON", ["button"], "getRelatedRole");
		//getScopeHelper("button", ["button"], "getRelatedRole");
		//getScopeHelper("TEXTAREA", ["textbox"], "getRelatedRole");
		//getScopeHelper("INPUT", ["checkbox","radio","textbox"], "getRelatedRole");
		//getScopeHelper("HR", ["separator"], "getRelatedRole");
		//getScopeHelper("select", ["combobox", "listbox"], "getRelatedRole");
		//getScopeHelper("div", [], "getRelatedRole");

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
				isArray = Array.isArray(role),
				message = method + " for '" + (isArray? role.join(): role) + "' role should return ";
			if(expected)
			{
				expected.sort();
				message += expected.length? expected.join() : "an empty array";
			}
			it(message, function() {
				var actual = isArray? ARIA[method].apply(ARIA, role) : ARIA[method](role);
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
		var validator = window.ARIA,
			validatorReady = !!validator.checkAriaOwns;
		
		it("should mixin validator methods to ARIA", function(done) {
			if(!validatorReady)
			{
				window.setTimeout(function(){
					validatorReady = !!validator.checkAriaOwns;
					expect(validatorReady).toBeTruthy();
					done();
				}, 1000);
			}
			else
			{
				done();
			}
		});

		it("checkAriaOwns on an element with no aria-owns should not report any problems", function() {
			checkHelper("fileMenu",0 ,0);
		});

		it("checkAriaOwns on an element with no aria-owns should not report any problems (not passing role)", function() {
			checkHelper("fileMenu", 0, 0, "", true);
		});

		it("checkAriaOwns an element with strange characters in ID should not throw exception", function() {
			checkHelper("ariaOwnsStrangeChars",0 ,0);
		});

		it("checkAriaOwns on an element with correctly implemented aria-owns should not report any problems", function() {
			checkHelper("cb1-edit",0 ,0);
		});

		it("checkAriaOwns on an element which is part of a duplicate own", function() {
			checkHelper("ownDuplicated",1 ,0);
		});

		it("checkAriaOwns on an element which is nested in the DOM", function() {
			checkHelper("ownNested", 0, 1);
		});

		it("checkContainsRequiredElements with multiple required and aria-owns", function() {
			checkHelper("cb1-edit", 0, 0, "checkContainsRequiredElements");
		});

		it("checkContainsRequiredElements with multiple required and aria-owns (not passing role)", function() {
			checkHelper("cb1-edit", 0, 0, "checkContainsRequiredElements", true);
		});

		it("checkContainsRequiredElements with single required and dom owns", function() {
			checkHelper("rg1", 0, 0, "checkContainsRequiredElements");
		});

		it("checkContainsRequiredElements with single required and dom owns and missing required nodes", function() {
			checkHelper("rg2", 1, 0, "checkContainsRequiredElements");
		});
		
		it("checkContainsRequiredElements with implicit roles", function() {
			checkHelper("implicitMustContainElement", 0, 0, "checkContainsRequiredElements");
		});

		it("checkInRequiredScope with single required and dom owns", function() {
			checkHelper("cb1-opt1", 0, 0, "checkInRequiredScope");
		});

		it("checkInRequiredScope with single required and dom owns (not passing role)", function() {
			checkHelper("cb1-opt1", 0, 0, "checkInRequiredScope", true);
		});

		it("checkInRequiredScope with multiple required and dom owns", function() {
			checkHelper("menuitem1", 0, 0, "checkInRequiredScope");
		});

		it("checkInRequiredScope not in correct scope", function() {
			checkHelper("menuitemFail", 1, 0, "checkInRequiredScope");
		});
		
		it("checkInRequiredScope with implicit scope", function() {
			checkHelper("explicitListItem", 0, 0, "checkInRequiredScope");
		});

		it("checkSupportsAllAttributes on mandatory attribute", function() {
			checkHelper("r1", 0, 0, "checkSupportsAllAttributes");
		});

		it("checkSupportsAllAttributes aria-required on aria listbox", function() {
			checkHelper("anElementWithARole", 0, 0, "checkSupportsAllAttributes");
		});

		it("checkSupportsAllAttributes aria-required on input", function() {
			checkHelper("ariarequiredoninput", 1, 0, "checkSupportsAllAttributes");//assumes you are runnings tests in an HTML5 browser.
		});

		it("checkSupportsAllAttributes aria-required on element with no role", function() {
			checkHelper("ariarequiredondiv", 1, 0, "checkSupportsAllAttributes");
		});

		it("checkSupportsAllAttributes aria-required on element with a role that does not support it", function() {
			checkHelper("ariarequiredonunsupportedrole", 1, 0, "checkSupportsAllAttributes");
		});

		it("checkSupportsAllAttributes on mandatory attribute (not passing role)", function() {
			checkHelper("r1", 0, 0, "checkSupportsAllAttributes", true);
		});

		it("checkSupportsAllAttributes on global attribute", function() {
			checkHelper("rg1", 0, 0, "checkSupportsAllAttributes");
		});

		it("checkSupportsAllAttributes on unsupported attribute", function() {
			checkHelper("menubar1", 1, 0, "checkSupportsAllAttributes");
		});

		it("checkRequiredAttributes on mandatory attribute", function() {
			checkHelper("r1", 0, 0, "checkRequiredAttributes");
		});

		it("checkRequiredAttributes on mandatory attribute (not passing role)", function() {
			checkHelper("r1", 0, 0, "checkRequiredAttributes", true);
		});

		it("checkRequiredAttributes on missing mandatory attribute", function() {
			checkHelper("checkbox1", 1, 0, "checkRequiredAttributes");
		});

//		it("checkFirstRule on option with option role", function() {
//			checkHelper("badOpt", 0, 1, "checkFirstRule");
//		});
//
//		it("checkFirstRule on option with option role (not passing role)", function() {
//			checkHelper("badOpt", 0, 1, "checkFirstRule", true);
//		});
//
//		it("checkFirstRule on li with radio role", function() {
//			checkHelper("r1", 0, 0, "checkFirstRule");
//		});

		it("checkSecondRule on heading with role", function() {
			checkHelper("badHeading", 0, 1, "checkSecondRule");
		});

		it("checkSecondRule on heading with role (not passing role)", function() {
			checkHelper("badHeading", 0, 1, "checkSecondRule", true);
		});

		it("checkIds on subtree with no duplicates", function(){
			checkHelper("cb1-list", 0, 0, "checkIds");
		});

		it("checkIds on subtree with no duplicates (not passing role)", function(){
			checkHelper("cb1-list", 0, 0, "checkIds", true);
		});

		it("checkIds on subtree with duplicates", function(){
			checkHelper("hasDuplicateIds", 1, 0, "checkIds");
		});

		it("checkIds on id with spaces", function(){
			checkHelper("idCheckSpace", 1, 0, "checkIds");
		});

		it("checkIds on document with issues", function(){
			checkHelper(document, 2, 0, "checkIds");
		});

		it("checkAbstractRole on an element with an abstract role", function(){
			checkHelper("abstractRoleUsed", 1, 0, "checkAbstractRole");
		});

		it("checkAbstractRole on an element with an abstract role (not passing role)", function(){
			checkHelper("abstractRoleUsed", 1, 0, "checkAbstractRole", true);
		});

		it("checkAbstractRole on an element with a widget role", function(){
			checkHelper("menuitem1", 0, 0, "checkAbstractRole");
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
					{id:"nonglobalAttrsRightImplicitRole", fail:0, warn:1},
					{id:"nonglobalAttrsWrongImplicitRole", fail:1, warn:0},
					{id:"implicitRoleImplicitStates", fail:0, warn:0},
					{id:"mixedAttrsAndInvalidRoles", fail:0, warn:0}
				],
				funcName = "checkByAttribute";
			attrChecks.forEach(function(check){
				if(!check.nocount)
				{
					failCountTotal += check.fail;
					warnCountTotal += check.warn;
				}
				it(funcName + " on element " + check.id, function(){
					checkHelper(check.id, check.fail, check.warn, funcName);
				});
				it(funcName + " on element " + check.id + " not passing role", function(){
					checkHelper(check.id, check.fail, check.warn, funcName, true);
				});
			});
			it(funcName + " on element attributeCheckTree passing role", function(){
				checkHelper("attributeCheckTree", failCountTotal, warnCountTotal, funcName);
			});
			it(funcName + " on element attributeCheckTree not passing role", function(){
				checkHelper("attributeCheckTree", failCountTotal, warnCountTotal, funcName, true);
			});
		})();

		function checkHelper(id, failCount, warnCount, funcName, excludeRole)
		{
			var method = funcName || "checkAriaOwns",
				element = id.constructor === String? document.getElementById(id) : id,
				result,
				warnings,
				failures;
			if(excludeRole)
			{
				result = validator[method](element, element.nodeType === Node.ELEMENT_NODE? element.getAttribute("role") : "");
			}
			else
			{
				result = validator[method](element);
			}
			warnings = result.getWarnings();
			failures = result.getFailures();
			expect(warnings.length).toEqual(warnCount);
			expect(failures.length).toEqual(failCount);
		}
	})();

	/* HELPER TESTS */
	(function(){
		//todo tests for getOwner and getOwned (though these are covered indirectly by other tests)

		elementsWithRoleHelper("roleCountContainer", 9);
		elementsWithRoleHelper("cb1-opt1", 0);//an element with a role does not return self
		elementsWithRoleHelper("anElementWithARole", 4);//an element with a role does not return self
		elementsWithRoleHelper("hasDuplicateIds", 0);
		elementsWithAriaAttrHelper("roleCountContainer", true, 4);
		elementsWithAriaAttrHelper("roleCountContainer", false, 3);
		elementsWithAriaAttrHelper("hasDuplicateIds", true, 0);
		elementsWithAriaAttrHelper("hasDuplicateIds", false, 0);

		function elementsWithAriaAttrHelper(id, inclusive, expectedLen)
		{
			it("getElementsWithAriaAttr " + (inclusive? "inclusive" : "exclusive") + " on '" + id + "' should return " + expectedLen + " elements", function() {
				var element = document.getElementById(id),
					actual = ARIA.getElementsWithAriaAttr(element, inclusive);
				expect(actual.length).toEqual(expectedLen);
			});
		}

		function elementsWithRoleHelper(id, expectedLen)
		{
			it("getElementsWithRole on '" + id + "' should return " + expectedLen + " elements", function() {
				var element = document.getElementById(id),
					actual = ARIA.getElementsWithRole(element);
				expect(actual.length).toEqual(expectedLen);
			});
		}
	})();
	
	(function(){
		//aria.utils tests - todo separate spec
		getRoleHelper(getElement("input"), "textbox", true);
		getRoleHelper(getElement("input", "text"), "textbox", true);
		getRoleHelper(getElement("input", "radio"), "radio", true);
		getRoleHelper(getElement("input", "button"), "button", true);
		getRoleHelper(getElement("input", "date"), "spinbutton", true);
		getRoleHelper(getElement("input", "email"), "textbox", true);
		getRoleHelper(getElement("input", "foo"), "textbox", true);
		getRoleHelper(getElement("input", "checkbox"), "checkbox", true);
		getRoleHelper(getElement("input", "password"), "textbox", true);
		getRoleHelper(getElement("input", "image"), "button", true);
		getRoleHelper(getElement("input", "number"), "spinbutton", true);
		getRoleHelper(getElement("input", "reset"), "button", true);
		getRoleHelper(getElement("input", "submit"), "button", true);
		getRoleHelper(getElement("input", "tel"), "textbox", true);
		getRoleHelper(getElement("input", "range"), "slider", true);
		getRoleHelper(getElement("textarea"), "textbox", true);
		getRoleHelper(getElement("progress"), "progressbar", true);
		getRoleHelper(getElement("option"), "option", true);
		getRoleHelper(getElement("button"), "button", true);
		getRoleHelper(getElement("button", "button"), "button", true);
		getRoleHelper(getElement("button", "submit"), "button", true);
		getRoleHelper(getElement("button", "foo"), "button", true);
		getRoleHelper(getElement("select"), "select", true);
		getRoleHelper(getElement("menu"), "menu", true);
		getRoleHelper(getElement("menuitem"), "menuitem", true);
		getRoleHelper(getElement("li"), null, true);
		
		it("getRole (implicit) on li in an ol", function() {
			var actual, element = document.createElement("ol");
			element = element.appendChild(document.createElement("li"));
			actual = ARIA.getRole(element, true);
			expect(actual).toEqual("listitem");
		});
		
		it("getRole (implicit) on li in a ul", function() {
			var actual, element = document.createElement("ul");
			element = element.appendChild(document.createElement("li"));
			actual = ARIA.getRole(element, true);
			expect(actual).toEqual("listitem");
		});
		
		it("getRole (implicit) on li in a menu", function() {
			var actual, element = document.createElement("menu");
			element = element.appendChild(document.createElement("li"));
			actual = ARIA.getRole(element, true);
			expect(actual).toEqual("menuitem");
		});
		
		it("getRole (implicit) on li in a ul in a menu", function() {
			var actual, element = document.createElement("menu");
			element = element.appendChild(document.createElement("ul"));
			element = element.appendChild(document.createElement("li"));
			actual = ARIA.getRole(element, true);
			expect(actual).toEqual("listitem");
		});
		
		it("getRole on li in a menu in an ol", function() {
			var actual, element = document.createElement("ol");
			element = element.appendChild(document.createElement("menu"));
			element = element.appendChild(document.createElement("li"));
			actual = ARIA.getRole(element, true);
			expect(actual).toEqual("menuitem");
		});
		
		function getElement(tag, type)
		{
			var result = document.createElement(tag);
			if(type)
			{
				result.setAttribute("type", type);
			}
			return result;
		}
		function getRoleHelper(element, expected, implicit)
		{
			var msg, elementString = element.tagName;
			if(element.hasAttribute("type"))
			{
				elementString += "." + element.getAttribute("type");
			}
			msg = ("getRole on '" + elementString + "' with 'implicit " + (implicit?"on":"off") + "' should return " + expected);
			it(msg, function() {
				var actual = ARIA.getRole(element, implicit);
				expect(actual).toEqual(expected);
			});
		}
	})();

});