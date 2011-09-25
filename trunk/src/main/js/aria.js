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
		xmlDoc = config.loadXml(config.url),
		baseRole,//at time of writing (and probably forever) this will be roleType
		instances = {},
		constructors = {};

	$this.SUPPORTED = 1;
	$this.REQUIRED = 2;

	$this.getScope = getScopeFactory("role:scope");
	$this.getMustContain = getScopeFactory("role:mustContain");
	/**
	 * Find all the aria attributes supported/required by this element/role.
	 * Note that if role is anything other than a known ARIA role then the supported
	 * attributes will be the global ARIA attributes.
	 * @see http://www.w3.org/TR/wai-aria/states_and_properties#global_states
	 * 
	 * @param {string|Element} role An ARIA role or a DOM element
	 * @return {Object} an object whose properties are the supported attributes. The values of these properties
	 * will be either SUPPORTED or REQUIRED
	 * @example getSupported("checkbox");
	 */
	$this.getSupported = function(role)
	{
		var result, in$tance, F = function(){};
		if(role)
		{
			if(role.getAttribute)
			{
				role = role.getAttribute("role") || baseRole;
			}
		}
		else
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
		return result;
	};

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
		 * @param {string} role An ARIA role 
		 * @return {Array} An array of strings representing ARIA roles
		 * @example getScope("menuitem");
		 * @example getMustContain("menu");
		 */
		return function(role){
			return cache[role] || (cache[role] = getRoleNodes(role, false, nodeName));
		};
	}
	
	function getInstance(role)
	{
		var con$tructor, in$tance = instances[role];
		if(!baseRole)
		{
			buildConstructors();
		}
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
			result = result.map(function(next){
				return next.nodeValue.replace(ANCHOR_ONLY_RE, "");
			});
		}
		return result;
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
			var i, superclasses, required, supported,
				name = classElement.getAttribute("rdf:ID");
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
				window.console.log("Building constructor:", name);
				if(!baseRole)
				{
					window.console.log("Setting baseRole to:", name);
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