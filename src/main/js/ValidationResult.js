/*
 * Part of the aria validator.
 *
 * Copyright (C) 2014  Rick Brown
 */
define(["replace"], function(replace){
	/**
	 * validation error severity level.
	 * @property {number} ValidationResult.level.WARN A warning - not a showstopper.
	 * @property {number} ValidationResult.level.ERROR An error - implementation is non conforming.
	 */
	ValidationResult.level = {
			WARN: 0,
			ERROR: 1
		};

	/**
	 * @property {Object} results The validator must create a validation error with a key from this table.
	 */
	ValidationResult.results = {
			ABSTRACT_ROLE_USED: {
				msg: "{role} found - authors MUST NOT use abstract roles in content.",
				level: ValidationResult.level.ERROR
			},
			ARIA_OWNS_ALREADY_OWNED: {
				msg: "{attr} IDREF {id} must not be 'aria-owned' by more than one element",
				level: ValidationResult.level.ERROR
			},
			ARIA_OWNS_DESCENDANT: {
				msg: "{attr} should not be used if the relationship is represented in the DOM hierarchy",
				level: ValidationResult.level.WARN
			},
			ARIA_OWNS_NON_EXISTANT_ELEMENT: {
				msg: "{attr} references element '{id}' that is not present in the DOM",
				level: ValidationResult.level.WARN
			},
			ARIA_REQUIRED_ON_FORM_ELEMENT: {
				msg: "{attr} is not allowed when 'an exactly equivalent native attribute is available'.",
				level: ValidationResult.level.ERROR
			},
			DUPLICATE_ID: {
				msg: "Found duplicate id '{id}'",
				level: ValidationResult.level.ERROR
			},
			INVALID_ID: {
				msg: "Found id '{id}' but IDs are not allowed to have space characters",
				level: ValidationResult.level.ERROR
			},
			MISSING_REQUIRED_ROLES: {
				msg: "{role} does not contain required roles {roles}.",
				level: ValidationResult.level.ERROR
			},
			MISSING_REQUIRED_ROLES_BUSY: {
				msg: "{role} does not contain required roles {roles} (but it is busy, maybe you need to wait longer?).",
				level: ValidationResult.level.ERROR
			},
			NOT_IN_REQUIRED_SCOPE: {
				msg: "{role} not in required scope {roles}.",
				level: ValidationResult.level.ERROR
			},
			REDUNDANT_ATTR: {
				msg: "{attr} is unnecessary as an equivalent native attribute is available.",
				level: ValidationResult.level.WARN
			},
			REDUNDANT_ROLE: {
				msg: "{role} on element: '{tag}' may be redundant because it implicitly has this role",
				level: ValidationResult.level.WARN
			},
			REQUIRED_ATTR_MISSING: {
				msg: "{role} missing required attribute {attr}.",
				level: ValidationResult.level.ERROR
			},
			SPECIAL_ELEMENT_WITH_ROLE: {
				msg: "{role} on 'special' element '{tag}'",
				level: ValidationResult.level.WARN
			},
			STRONG_ELEMENT_DIFFERENT_ROLE: {
				msg: "{role} on element: '{tag}' is attempting to change strong native semantics (see <a target='_blank' href='http://www.w3.org/TR/aria-in-html/#second'>2nd rule</a>)",
				level: ValidationResult.level.WARN
			},
			UNKNOWN_ROLE: {
				msg: "{role} role does not exist in ARIA.",
				level: ValidationResult.level.ERROR
			},
			UNSUPPORTED_ATTR_FOR_ELEMENT: {
				msg: "{attr} is not supported on this element.",
				level: ValidationResult.level.ERROR
			},
			UNSUPPORTED_ATTR_FOR_ROLE: {
				msg: "{role} unsupported attribute {attr}.",
				level: ValidationResult.level.ERROR
			}
		};


	/**
	 * Retrieve the validationResults for this level.
	 * @param {ValidationResult[]} The results to filter by level.
	 * @param {number} level Will find instances at this severity level.
	 * @return {ValidationResult[]} The validationResults held in this summary.
	 */
	ValidationResult.filter = function(validationResults, level){
		var result = validationResults;
		if(level || level === 0)
		{
			result = validationResults.filter(function(validationResult){
				return validationResult.level === level;
			});
		}
		return result;
	};

	/**
	 * Retrieve the validation message to be displayed to the user.
	 * param {Object} [formatters] Where a property name on this object corresponds to a property name on the
	 * underlying DTO the value of that property will be used as a formatting function for the DTO.
	 * @return {string} The validation message.
	 * @function
	 */
	ValidationResult.prototype.toString = function(formatters){
		var msg = this.getMsg(),
			dto = getFormattedDto(this, formatters),
			result = replace(msg, dto);
		return result;
	};

	/**
	 * Retrieve a formatted version of the underlying DTO.
	 * @param instance The instance of ValidationResult
	 * @param {Object} [formatters] Where a property name on this object corresponds to a property name on the
	 * underlying DTO the value of that property will be used as a formatting function for the DTO.
	 * @return {Object} A copy of the DTO after all formatting functions have been applied.
	 */
	function getFormattedDto(instance, formatters){
		var result = {}, i, next, nextVal,
			props = Object.keys(instance.dto);
		for(i=0; i<props.length; i++)
		{
			next = props[i];
			nextVal = instance.dto[next];
			if(nextVal)
			{
				if(formatters && formatters.hasOwnProperty(next))
				{
					result[next] = formatters[next](nextVal);
				}
				else
				{
					result[next] = nextVal;
				}
			}
		}
		return result;
	};

	/**
	 * Will return either This instance's ".msg" property or, if not set,
	 * the underlying message template from the lookup table of validation errors.
	 * @return {string} The message for this validation result.
	 * @memberOf ValidationResult
	 */
	ValidationResult.prototype.getMsg = function(){
		var result = this.msg;
		if(!result)
		{
			result = ValidationResult.results[this.key].msg;
		}
		return result;
	};

	/**
	 * Encapsulates the information about a single validation error.
	 *
	 * @param {Object} dto Information about the error. Can have any arbitrary properties in addition to those below:
	 * @param {string} dto.key The lookup key to find the validation error in 'ValidationResult.results'.
	 * @param {string} [dto.role] The ARIA role in question.
	 * @param {string[]} [dto.roles] The ARIA roles in question.
	 * @param {string} [dto.attr] The ARIA attribute in question.
	 * @param {string[]} [dto.attrs] The ARIA attributes in question.
	 * @param {Element|NodeList} [dto.element] The element/s in question.
	 * @constructor
	 * 
	 * @exports ValidationResult
	 */
	function ValidationResult(dto)
	{
		var key, error;
		if(dto)
		{
			key = dto.key;
			if(key && ValidationResult.results[key] && ValidationResult.results.hasOwnProperty(key))
			{
				error = ValidationResult.results[key];
				this.level = error.level;
				this.key = key;
			}
			else
			{
				throw new Error("Could not find validation error " + key);
			}
			this.dto = dto;
		}
	}
	
	return ValidationResult;
});