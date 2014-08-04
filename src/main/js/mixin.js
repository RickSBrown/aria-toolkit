/*
 * Simple but useful mixin functionality.
 *
 * Copyright (C) 2014  Rick Brown
 */
define(function(){
	/**
	 * A mixin utility function.
	 * If 'a' is null then a new object will be created.
	 * @param {Object} a The target objet - will receive properties from the donor.
	 * @param {Object} b The donor object - will donate its properties to the target.
	 * @return {Object} a The target object.
	 */
	return function(a, b)
	{
		var prop, target = (a || {});
		if(b)
		{
			for(prop in b)
			{
				if(!target[prop])
				{
					target[prop] = b[prop];
				}
			}
		}
		return target;
	};
});