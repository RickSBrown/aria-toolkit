/*
 * A string substitution util.
 * 
 * Copyright (C) 2014  Rick Brown
 */
define(function(){
	var REPLACE_RE = /\{(.+?)\}/g;
	/**
	 * Finds property names in curly braces in the template string and replaces them with corresponding properties
	 * from the object. If there is no corresponding property the curly brace token will be left unchanged.
	 * @param {string} s The template string.
	 * @param {Object} obj Object with properties used in the substitution.
	 * @return {string} The string with substituitions.
	 * @example replace("{verb} me {adverb}", {verb:"byte"});//returns "byte me {adverb}"
	 * @example replace("{verb} {verb} {verb}!", {verb:"jump"});//returns "jump jump jump!"
	 */
	function replace(s, obj)
	{
		var result = s;
		if(result && obj)
		{
			result = result.replace(REPLACE_RE, function(s, s1){
				var result;
				if(s1 && obj.hasOwnProperty(s1))
				{
					result = obj[s1];
				}
				else
				{
					result = s;
				}
				return result;
			});
		}
		return result;
	}
	return replace;
});