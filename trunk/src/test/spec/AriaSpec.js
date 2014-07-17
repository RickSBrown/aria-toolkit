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
			REQUIRED_SCOPE_ROLES = ["columnheader", "gridcell", "listitem", "menuitem", "menuitemcheckbox", "menuitemradio", "row", "rowgroup", "rowheader", "tab", "treeitem"];

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
		/* Empty role should return all globals and nothing else */
		getSupportedHelper("", [
			{name:"aria-checked", value:undefined}]);

		function getSupportedHelper(role, expected)
		{
			var actual = ARIA.getSupported(role),
				message = " for '" + role + "' role should be ";
			it("all roles should support global attributes", function() {
				globalStates.forEach(function(next){
					expect(actual[next]).toEqual(ARIA.SUPPORTED);
				});
			});
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

	})();

	/* VALIDATOR TESTS (probably should make this a separate 'spec' file */
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


