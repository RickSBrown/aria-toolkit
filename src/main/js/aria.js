/*
 * This is the core toolkit AMD module (https://github.com/amdjs/amdjs-api/blob/master/AMD.md).
 * 
 * It knows what is in the WAI-ARIA taxonomy (the RDF); nothing more, nothing less.
 * Since the taxonomy does not provide enough information for every situation it is highly probable that you will
 * require additional logic to do useful things in your application. That additional logic does NOT belong here,
 * create higher level modules that add functionality.
 * 
 * Copyright (C) 2011  Rick Brown
 */
define(["xpath", "loadXml", "replace"], function(query, loadXml, replace){
	var url = "${aria.rdf.url}";//The url where we can find the ARIA taxonomy
	/**
	 * Construct the core object which provides utility methods.
	 * This object is as lazy as possible - data structure creation is deferred until use where
	 * possible.
	 * 
	 * Creating more that one instance of this class is pointless and is considered an error.
	 * @constructor
	 */
	function Aria()
	{
		var aria = this,
			ANCHOR_ONLY_RE = /^.*?#(?:edef\-)?/,
			xmlDoc,
			baseRole,//at time of writing (and probably forever) this will be roleType
			instances = {},
			constructors = {};

		this.SUPPORTED = 1;
		this.REQUIRED = 2;

		this.getScope = getScopeFactory("role:scope");
		this.getMustContain = getScopeFactory("role:mustContain");
		this.getScopedTo = getScopedFactory("role:scope");
		this.getScopedBy = getScopedFactory("role:mustContain");

		/**
		 * Determine if this role is in the ARIA RDF.
		 * @param {string} role
		 * @returns {boolean} true if this role is in the ARIA RDF.
		 * @example hasRole("foobar");//returns false
		 * @example hasRole("combobox");//returns true (at time of writing but this could change with newer versions of ARIA)
		 */
		this.hasRole = function(role){
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

		this.setRdf = function(rdf){
			xmlDoc = rdf;
		};

		this.getRdf = function(){
			return xmlDoc;
		};

		/**
		 * Call to perform one-time initialisation routine
		 */
		function initialise()
		{
			if(!baseRole)
			{
				xmlDoc = xmlDoc || loadXml(url);
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
		this.getSupported = function(role)
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
				if(!role || !aria.hasRole(role))
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
			var cache = {},
				template = "//owl:Class[{name}[@rdf:resource='#{role}']]/@rdf:ID";
			if(nodeName)
			{
				template = replace(template, {name:nodeName});
			}
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
						expression = replace(template, {role:role});
						result = cache[role] = cleanRoles(query(expression, false, xmlDoc));
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
		 * Creates methods for getScope and getMustContain (and getConcept).
		 * @param {string|string[]} nodeName Child elements of owl:Class e.g. role:mustContain or role:scope
		 */
		function getScopeFactory(nodeName, predicate)
		{
			var isArray = Array.isArray(nodeName), cache = [];
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
				var i=0, result, next, nextResult, scoped;
				if(!role)
				{
					role = "*";
					scoped = true;
				}
				result = cache[role];
				if(!result)
				{
					initialise();
					do
					{
						next = isArray? nodeName[i++] : nodeName;
						if(scoped)
						{
							nextResult = getScopedRoles(next);
						}
						else
						{
							nextResult = getRoleNodes(role, false, next, predicate);
						}
						result = result? result.concat(nextResult) : nextResult;
					}
					while(isArray && i < nodeName.length);
					cache[role] = result;
				}
				return result;
			};
		}

		/**
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

		/**
		 * @param {string} [role] An ARIA role
		 * @param {boolean} [firstMatch] Set to true to return a single node only
		 * @param {string} child The name of a child element which refers to roles in an rdf:resource attribute
		 * @return {Array|Element} An array of matching nodes OR if firstMatch is true a single node. OR if
		 * child is provided then an array of strings representing ARIA roles.
		 */
		function getRoleNodes(role, firstMatch, child, predicate)
		{
			var result, xpathQuery = "//owl:Class";
			if(role)
			{
				xpathQuery += "[@rdf:ID='" + role + "']";
				if(child)
				{
					xpathQuery += "/" + child + "/@rdf:resource";
					if(predicate)
					{
						xpathQuery += predicate;
					}
				}
			}
			result = query(xpathQuery, firstMatch, xmlDoc);
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
				attrs = query(xpathQuery, false, xmlDoc),
				attrs = cleanRoles(attrs),
				result = {};
			for(i=attrs.length-1; i>=0; i--)
			{
				result[attrs[i]] = aria.SUPPORTED;//supported/required really meaningless here because there is no role context
			}
			return result;
		}

		/**
		 * @param {string} type either "role:scope" or "role:mustContain"
		 */
		function getScopedRoles(type)
		{
			var expression = "//owl:Class[count(" + type + ")>0]/@rdf:ID",
				result = query(expression, false, xmlDoc);
			return cleanRoles(result);
		}
		
		/**
		 * @param {Attribute[]} roles An array of attribute nodes
		 * @returns {string[]} The cleaned attribute values.
		 */
		function cleanRoles(roles)
		{
			return roles.map(function(next){
				return next.value.replace(ANCHOR_ONLY_RE, "");
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

			/**
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

			/**
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

			/**
			 * Creates a new "class" representing an ARIA role.
			 * @param {Array} required an array of strings representing ARIA properties/states required by this role
			 * @param {Array} supported an array of strings representing ARIA properties/states supported by this role
			 * @param {Array} superclassRoles an array of strings representing ARIA roles this role inherits from
			 */
			function constructorFactory(required, supported, superclassRoles)
			{
				var i, prop, len, superClass, result = /**@constructor*/function(){
						applyStates(this, required, aria.REQUIRED);
						applyStates(this, supported, aria.SUPPORTED);
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
	return new Aria();
});