/*
 * Chrome Extension for ARIA Validator.
 * This script is loaded by the summary page - it is a content-script.
 *
 * Copyright (C) 2014  Rick Brown
 */
(function(scope){
	var options;

	scope.document.addEventListener("DOMContentLoaded", initialize);

	function initialize()
	{
		scope.chrome.extension.sendMessage({action:"optionsmap"}, restoreOptions);
		scope.document.getElementById("save").addEventListener("click", saveOptions);
	}

//	function buildOptionList()
//	{
//		var i, result = {}, id, next, elements = document.querySelectorAll("input");
//		for(i=0; i<elements.length; i++)
//		{
//			next = elements[i];
//			id = next.id;
//			if(id)
//			{
//				if(next.type === "checkbox" || next.type === "radio")
//				{
//					result[id] = next.checked;
//				}
//				else
//				{
//					result[id] = next.value;
//				}
//			}
//		}
//		return result;
//	}

	// Saves options to chrome.storage
	function saveOptions()
	{
		var id, element, values = {};
		if(options)
		{
			for(id in options)
			{
				if(options.hasOwnProperty(id))
				{
					element = scope.document.getElementById(id);
					if(element)
					{
						values[id] = element.checked;
					}
				}
			}
			scope.chrome.storage.sync.set(values,function() {
				var status = scope.document.getElementById("status");
				status.textContent = "Options saved.";
				setTimeout(function() {
					status.textContent = "";
				}, 750);
			});
		}
		else
		{
			console.error("Options were not restored corrrectly");
		}
	}

	function restoreOptions(obj)
	{
		options = obj;
		scope.chrome.storage.sync.get(options, function(items) {
			var id, element;
			for(id in options)
			{
				if(options.hasOwnProperty(id))
				{
					element = scope.document.getElementById(id);
					if(element)
					{
						element.checked = items[id];
					}
				}
			}
		});
	}
})(this);