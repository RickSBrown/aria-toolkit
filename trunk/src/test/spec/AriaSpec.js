describe("ARIA", function() {
	/**
	 * These expected arrays are obtained by me manually extracting them from the RDF using xpath queries in OxygenXML.
	 * @type Array
	 */
	var ALL_ROLES = ["alert","alertdialog","application","article","banner","button","checkbox","columnheader","combobox","command","complementary","composite","contentinfo","definition","dialog","directory","document","form","grid","gridcell","group","heading","img","input","landmark","link","list","listbox","listitem","log","main","marquee","math","menu","menubar","menuitem","menuitemcheckbox","menuitemradio","navigation","note","option","presentation","progressbar","radio","radiogroup","range","region","roletype","row","rowgroup","rowheader","search","section","sectionhead","select","separator","scrollbar","slider","spinbutton","status","structure","tab","tablist","tabpanel","textbox","timer","toolbar","tooltip","tree","treegrid","treeitem","widget","window"],
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

	getScopeHelper("radio", []);
	getScopeHelper("button", []);
	getScopeHelper("menuitemcheckbox", ["menu", "menubar"]);
	getScopeHelper("row", ["grid", "rowgroup", "treegrid"]);
	getScopeHelper("foobar", []);

	function getScopeHelper(role, expected)
	{
		var message = "getScope for '" + role + "' role should return ";
		if(expected)
		{
			expected.sort();
			message += expected.length? expected.join() : "an empty array";
		}
		it(message, function() {
			var actual = ARIA.getScope(role);
			expect(actual.sort()).toEqual(expected);
		});
	}

});


