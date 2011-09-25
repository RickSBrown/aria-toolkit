/**
 * This file provides functionality to validate the DOM to ensure that:
 * - Elements with ARIA roles are in the correct scope
 * - Elements with ARIA roles contain the correct descendants
 * - ARIA attributes are validly assigned (they are on elements that correctly support them)
 * - Required ARIA attributes are present
 * The methods are added to the base instance of the ARIA class.
 */
(function(){
	
	AriaValidator.call(window.ARIA);
	/**
	 * @this ARIA
	 */
	function AriaValidator()
	{
		var $this = this,
			ARIA_ATTR_RE = /^aria\-/;
		
		/**
		 * Call ARIA.isValid to check the correctness of any ARIA roles and attributes used in this DOM.
		 * @param {Element} A DOM element.
		 * @return {boolean} true if all is well
		 * @example ARIA.isValid(document.body);
		 */
		$this.isValid = function(element)
		{
			var result = true, role, next, i, elements = element.getElementsByTagName("*");
			for(i=elements.length-1; i>=0; i--)
			{
				next = elements[i];
				role = getRole(next);
				if(role)
				{
					if(!isInRequiredScope(next, role))
					{
						result = false;
						window.console.log("Not in required scope!", next);
					}
					if(!containsRequiredElements(next, role))
					{
						result = false;
						window.console.log("Does not contain required roles!", next);
					}
				}
				if(!hasRequiredAttributes(next, role))
				{
					result = false;
					window.console.log("Missing required attributes!", next);
				}
				if(!supportsAllAttributes(next, role))
				{
					result = false;
					window.console.log("Contains unsupported attributes!", next);
				}
			}
			return result;
		};
		
		function getRole(element)
		{
			var result;
			if(element.getAttribute)
			{
				result = element.getAttribute("role");
			}
			return result;
		}

		function hasRequiredAttributes(element, role)
		{
			var result = true, prop, supported = $this.getSupported(role);
			for(prop in supported)
			{
				if(supported[prop] === $this.REQUIRED)
				{
					if(!element.hasAttribute(prop))
					{
						window.console.log("Missing required attribute", prop);
						result = false;
						break;
					}
				}
			}
			return result;
		}
		
		function supportsAllAttributes(element, role)
		{
			var supported = $this.getSupported(role),
				result = true, i, next, attributes;
			attributes = element.attributes;
			for(i=attributes.length-1; i>=0; i--)
			{
				next = attributes[i].name;
				if(ARIA_ATTR_RE.test(next))
				{
					if(!(next in supported))
					{
						window.console.log("Unsupported attribute", next);
						result = false;
						break;
					}
				}
			}
			return result;
		}
		
		function isInRequiredScope(element, role)
		{
			var next, required = $this.getScope(role),
				result = !required.length;
			if(!result)
			{
				while((element = element.parentNode))
				{
					next = getRole(element);
					if(next && required.indexOf(next) >= 0)
					{
						result = true;
						break;
					}
				}
			}
			return result;
		}

		/*
		 * TODO needs to be aware of descendant elements with roles that create boundaries?
		 */
		function containsRequiredElements(element, role)
		{
			var i, next, required = $this.getMustContain(role),
				result = !required.length;
			if(!result)
			{
				for(i=required.length-1; i>=0; i--)
				{
					if(element.querySelector("[role='" + required[i] + "']"))
					{
						result = true;
						break;
					}
				}
			}
			return result;
		}
	}
	
})();