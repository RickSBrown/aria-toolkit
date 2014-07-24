/**
 * Creating more that one instance of this class is pointless and is considered an error.
 * @param {Object} config An object that provides helpers / data for this class
 * @param {Funtion} config.query @see query in xpath.js
 * @param {Function} config.loadXml @see loadXml in loadXml.js
 * @param {String} config.url The url where we can find the ARIA taxonomy
 * @constructor
 */
function ARIA(config)
{
	var $this = this,
		ANCHOR_ONLY_RE = /^.*?#/,
		HTML_CONCEPT_RE = /^.*?#edef-/,
		xmlDoc,
		baseRole,//at time of writing (and probably forever) this will be roleType
		conceptCache = [{}, {}],
		instances = {},
		constructors = {};

	$this.SUPPORTED = 1;
	$this.REQUIRED = 2;

	$this.getScope = getScopeFactory("role:scope");
	$this.getMustContain = getScopeFactory("role:mustContain");
	$this.getScopedTo = getScopedFactory("role:scope");
	$this.getScopedBy = getScopedFactory("role:mustContain");
	$this.getConcept = getConcept;

	/**
	 * Determine if this role is in the ARIA RDF.
	 * @param {string} role
	 * @returns {boolean} true if this role is in the ARIA RDF.
	 * @example hasRole("foobar");//returns false
	 * @example hasRole("combobox");//returns true (at time of writing but this could change with newer versions of ARIA)
	 */
	$this.hasRole = function(role){
		var result;
		if(role)
		{
			result = !!getInstance(role);
		}
		else
		{
			result = false;
		}
		return result;
	};

	$this.setRdf = function(rdf){
		xmlDoc = rdf;
	};
	$this.getRdf = function(){
		return xmlDoc;
	};

	/**
	 * Call to perform one-time initialisation routine
	 */
	function initialise()
	{
		if(!baseRole)
		{
			xmlDoc = xmlDoc || config.loadXml(config.url);
			buildConstructors();
		}
	}

	/**
	 * Find all the aria attributes supported/required by this element/role.
	 * Note that if role is anything other than a known ARIA role then the supported attributes will be the global ARIA attributes, except:
	 * if role is '*' all known aria states/properties will be returned.
	 * @see http://www.w3.org/TR/wai-aria/states_and_properties#global_states
	 *
	 * @param {string|Element} role An ARIA role or a DOM element
	 * @return {Object} an object whose properties are the supported attributes. The values of these properties will be either SUPPORTED or REQUIRED
	 * @example getSupported("checkbox");
	 */
	$this.getSupported = function(role)
	{
		var result, in$tance, F = function(){};
		initialise();
		if(role === "*")
		{
			result = getAllStates();
		}
		else
		{
			if(role && role.getAttribute)
			{
				role = role.getAttribute("role");
			}
			if(!role || !$this.hasRole(role))
			{
				role = baseRole;
			}
			in$tance = getInstance(role);
			if(in$tance)
			{
				/*
				 * we could return the actual instance (dangerous)
				 * or a clone (would have to clone it)
				 * or a new object that inherits all the properties
				 */
				F.prototype = in$tance;
				result = new F();
			}
		}
		return result;
	};

	function getScopedFactory(nodeName)
	{
		var cache = {};
		/**
		 * Given an ARIA role will find the container role/s (if any) which "contain" this role.
		 *
		 * This is to allow for asymetrical scoping in ARIA. For example, the role
		 * "menubar" is not required to contain anything, therefore:
		 * getMustContain("menubar") returns empty array
		 * However: getScopedTo("menubar") returns ["menuitem", "menuitemcheckbox", "menuitemradio"]
		 * This is useful when trying to determine what a particlar role SHOULD contain, not must
		 * contain (and not CAN contain because anything can contain anything).
		 * @param {string} [role] An ARIA role
		 * @return {Array} An array of strings representing ARIA roles
		 */
		return function getScopedTo(role)
		{
			var result, expression;
			if(role)
			{
				//owl:Class[child::role:scope[@rdf:resource='#role']]/@rdf:ID
				result = cache[role];
				if(!result)
				{
					initialise();
					expression = "//owl:Class[child::" + nodeName + "[@rdf:resource='#" + role + "']]/@rdf:ID";
					result = cache[role] = cleanRoles(config.query(expression, false, xmlDoc));
				}
			}
			else
			{
				throw new TypeError("role can not be null");
			}
			return result;
		};
	}

	/**
	 * Gets the related HTML concept.
	 * There are derived from "role:baseConcept" and "rdfs:seeAlso", though the latter can be disabled
	 * @param {string} role An ARIA role
	 * @param {boolean} [conceptOnly] If true will not include results from "rdfs:seeAlso"
	 * @return {String[]} An array of strings representing related HTML concepts
	 */
	function getConcept(role, conceptOnly)
	{
		var result, expression, cache = conceptCache[(conceptOnly? 1 : 0)];
		if(role)
		{
			//(//owl:Class[@rdf:ID="role"]/role:baseConcept|//owl:Class[@rdf:ID="role"]/rdfs:seeAlso)/@rdf:resource[contains(., 'html')]

			result = cache[role];
			if(!result)
			{
				initialise();
				expression = '(//owl:Class[@rdf:ID="' + role + '"]/role:baseConcept';
				if(!conceptOnly)
				{
					expression += '|//owl:Class[@rdf:ID="' + role + '"]/rdfs:seeAlso';
				}
				expression += ")/@rdf:resource[contains(., 'html')]";
				result = cache[role] = cleanHtmlRefs(config.query(expression, false, xmlDoc));
			}
		}
		else
		{
			throw new TypeError("role can not be null");
		}
		return result;
	}

	/*
	 * Creates methods for getScope and getMustContain.
	 * @param {string} nodeName Either role:mustContain or role:scope
	 */
	function getScopeFactory(nodeName)
	{
		var cache = [];
		/**
		 * getScope: Find the "Required Context Role" for this role
		 * getMustContain: Find the "Required Owned Elements" for this role
		 * @param {string} [role] An ARIA role OR if not provided will return ALL
		 *  roles that have a "Required Context Role" (for getScope) or ALL roles
		 *  that have "Required Owned Elements" (for getMustContain)
		 * @return {Array} An array of strings representing ARIA roles
		 * @example getScope("menuitem");
		 * @example getMustContain("menu");
		 */
		return function(role){
			var result;
			initialise();
			if(role)
			{
				result = cache[role] || (cache[role] = getRoleNodes(role, false, nodeName));
			}
			else
			{
				role = "*";
				result = cache[role] || (cache[role] = getScopedRoles(nodeName));
			}
			return result;
		};
	}

	/*
	 * @param {string} role An ARIA role
	 * @return {object} An instance the internal ARIA class for this role
	 * 	which stores aria property support information
	 */
	function getInstance(role)
	{
		var con$tructor, in$tance = instances[role];
		if(in$tance === undefined)
		{
			con$tructor = constructors[role];
			in$tance = con$tructor? (instances[role] = new con$tructor()) : null;
		}
		return in$tance;
	}

	/*
	 * @param {string} [role] An ARIA role
	 * @param {boolean} [firstMatch] Set to true to return a single node only
	 * @param {string} child The name of a child element which refers to roles in an rdf:resource attribute
	 * @return {Array|Element} An array of matching nodes OR if firstMatch is true a single node. OR if
	 * child is provided then an array of strings representing ARIA roles.
	 */
	function getRoleNodes(role, firstMatch, child)
	{
		var result, xpathQuery = "//owl:Class";
		if(role)
		{
			xpathQuery += "[@rdf:ID='" + role + "']";
			if(child)
			{
				xpathQuery += "/" + child + "/@rdf:resource";
			}
		}
		result = config.query(xpathQuery, firstMatch, xmlDoc);
		if(child)
		{
			result = cleanRoles(result);
		}
		return result;
	}

	/**
	 * Return a listing of every possible ARIA state or property.
	 * Nothing needs this... but it might?
	 * @returns {Object} Each property on the object is an aria state/property.
	 */
	function getAllStates()
	{
		var i, xpathQuery = "//role:requiredState/@rdf:resource|//role:supportedState/@rdf:resource",
			attrs = config.query(xpathQuery, false, xmlDoc),
			attrs = cleanRoles(attrs),
			result = {};
		for(i=attrs.length-1; i>=0; i--)
		{
			result[attrs[i]] = $this.SUPPORTED;//supported/required really meaningless here because there is no role context
		}
		return result;
	}

	/*
	 * @param {string} type either "role:scope" or "role:mustContain"
	 */
	function getScopedRoles(type)
	{
		var expression = "//owl:Class[count(" + type + ")>0]/@rdf:ID",
			result = config.query(expression, false, xmlDoc);
		return cleanRoles(result);
	}

	function cleanRoles(roles)
	{
		return clean(roles, ANCHOR_ONLY_RE);
	}

	function cleanHtmlRefs(refs)
	{
		return clean(refs, HTML_CONCEPT_RE);
	}

	/**
	 * @param {Attribute[]} attributes An array of attribute nodes
	 * @param {RegExp} re The regular expression to be used in a relace to clean the attribute value.
	 * @returns {string[]} The cleaned attribute values.
	 */
	function clean(attributes, re)
	{
		return attributes.map(function(next){
				return next.nodeValue.replace(re, "");
			});
	}

	/*
	 * Initialize the constructors
	 * Should only be called once.
	 */
	function buildConstructors()
	{
		var i, classes = getRoleNodes();
		for(i=0; i<classes.length; i++)
		{
			buildConstructor(classes[i]);
		}

		/*
		 * Build a JS "class" that represents an ARIA role.
		 * @param {Element} an owl:Class element from the ARIA taxonomy
		 */
		function buildConstructor(classElement)
		{
			var i, superclasses, required, supported, name;
			if(typeof classElement.getAttributeNS !== "undefined")
			{
				name = classElement.getAttributeNS("http://www.w3.org/1999/02/22-rdf-syntax-ns#", "ID");
			}
			else
			{
				name = classElement.getAttribute("rdf:ID");
			}
			if(!constructors[name])
			{
				superclasses = getRoleNodes(name, false, "rdfs:subClassOf");
				for(i = superclasses.length -1; i >= 0; i--)
				{
					buildConstructor(getRoleNodes(superclasses[i], true));
				}
				required = getRoleNodes(name, false, "role:requiredState");
				supported = getRoleNodes(name, false, "role:supportedState");
				constructors[name] = constructorFactory(required, supported, superclasses);
				//console.log("Building constructor:", name);
				if(!baseRole)
				{
					console.log("Setting baseRole to:", name);
					baseRole = name;
				}
			}
		}

		/*
		 * Add the ARIA states/properties to this object
		 * @param {Object} in$tance An instance of an ARIA class
		 * @param {Array} states An array of strings representing ARIA properties/states
		 * @param {Number} lvl One of the supportLvl enum
		 */
		function applyStates(in$tance, states, lvl)
		{
			var i;
			if(states)
			{
				for(i=states.length-1; i>=0; i--)
				{
					in$tance[states[i]] = lvl;
				}
			}
		}

		/*
		 * Creates a new "class" representing an ARIA role.
		 * @param {Array} required an array of strings representing ARIA properties/states required by this role
		 * @param {Array} supported an array of strings representing ARIA properties/states supported by this role
		 * @param {Array} superclassRoles an array of strings representing ARIA roles this role inherits from
		 */
		function constructorFactory(required, supported, superclassRoles)
		{
			var i, prop, len, superClass, result = /**@constructor*/function(){
					applyStates(this, required, $this.REQUIRED);
					applyStates(this, supported, $this.SUPPORTED);
			};
			try
			{
				if(superclassRoles)
				{
					len = superclassRoles.length;
					for(i=0; i<len; i++)
					{
						superClass = new constructors[superclassRoles[i]]();
						if(i === 0)
						{
							result.prototype = superClass;
						}
						else
						{
							for(prop in superClass)
							{
								if(!(prop in result.prototype))
								{
									result.prototype[prop] = superClass[prop];
								}
							}
						}
					}
				}
				return result;
			}
			finally
			{
					superclassRoles = null;
			}
		}
	}
}
