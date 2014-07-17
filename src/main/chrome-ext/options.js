/*
 * Chrome Extension for ARIA Validator.
 * This script is loaded by the summary page - it is a content-script.
 *
 * Copyright (C) 2014  Rick Brown
 */
(function(scope){
	var options = {
		ids: true,
		experimental: false
	};
	// Saves options to chrome.storage
	function saveOptions()
	{
		var id, element, values = {};
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

	function restoreOptions()
	{
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

	scope.document.addEventListener("DOMContentLoaded", restoreOptions);
	scope.document.getElementById("save").addEventListener("click", saveOptions);
})(this);