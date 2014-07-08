/*
 * Chrome Extension for ARIA Validator.
 * This script is loaded by the summary page - it is a content-script.
 *
 * Copyright (C) 2014  Rick Brown
 */
(function(scope){

	// Saves options to chrome.storage
	function saveOptions()
	{
		var experimental = scope.document.getElementById("experimental");
		experimental = (experimental && experimental.checked);
		scope.chrome.storage.sync.set({
			experimental: experimental
		},function() {
			var status = scope.document.getElementById("status");
			status.textContent = "Options saved.";
			setTimeout(function() {
				status.textContent = "";
			}, 750);
		});
	}

	function restoreOptions()
	{
		scope.chrome.storage.sync.get({
			experimental: false
		}, function(items) {
			var experimental = scope.document.getElementById("experimental");
			if(experimental)
			{
				experimental.checked = items.experimental;
			}
		});
	}

	scope.document.addEventListener("DOMContentLoaded", restoreOptions);
	scope.document.getElementById("save").addEventListener("click", saveOptions);
})(this);