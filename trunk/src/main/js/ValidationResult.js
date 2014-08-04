/*
 * Part of the aria validator.
 *
 * Copyright (C) 2014  Rick Brown
 */
define(["replace"], function(replace){

	var validationErrors;

	/**
	 *
	 * @param {Object} validationErrorTable The key property on the DTO will be used to look up information in this table.
	 */
	ValidationResult.setErrors = function(validationErrorTable){
		validationErrors = validationErrorTable;
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
			dto = this.getFormattedDto(formatters),
			result = replace(msg, dto);
		return result;
	};

	/**
	 * Retrieve a formatted version of the underlying DTO.
	 * @param {Object} [formatters] Where a property name on this object corresponds to a property name on the
	 * underlying DTO the value of that property will be used as a formatting function for the DTO.
	 * @return {Object} A copy of the DTO after all formatting functions have been applied.
	 */
	ValidationResult.prototype.getFormattedDto = function(formatters){
		var result = {}, i, next, nextVal,
			props = Object.keys(this.dto);
		for(i=0; i<props.length; i++)
		{
			next = props[i];
			nextVal = this.dto[next];
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
			result = validationErrors[this.key].msg;
		}
		return result;
	};

	/**
	 * Encapsulates the information about a single validation error.
	 *
	 * @param {Object} dto Information about the error. Can have any arbitrary properties in addition to those below:
	 * @param {string} dto.key The lookup key to find the validation error in 'validationErrors'.
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
			if(key && validationErrors[key] && validationErrors.hasOwnProperty(key))
			{
				error = validationErrors[key];
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