/*
 * Chrome Extension content script for ARIA Validator.
 *
 * Copyright (C) 2014  Rick Brown
 */
(function(scope){

	var options = {
		experimental: false
	};

	scope.chrome.storage.sync.get(options, updateOptions);
	scope.chrome.runtime.onMessage.addListener(messageEvent);
	scope.chrome.storage.onChanged.addListener(storageChangedEvent);

	function updateOptions(obj)
	{
		options = obj;
	}

	function storageChangedEvent(changes, namespace) {
		var key, storageChange;
		for(key in changes)
		{
			storageChange = changes[key];
			if(namespace === "sync")
			{
				options[key] = storageChange.newValue;
				console.log("Changed option: ", key, options[key]);
			}
		}
	}

	/*
	 * Receive messages from background.js
	 */
	function messageEvent(msg, sender, sendResponse){
		var html;
		if (msg.action && msg.action === "validate")
		{
			html = validateAria(msg.rdf);
			if(html && html.length)
			{
				sendResponse(html);
			}
		}
	}

	/**
	 * Validate ARIA on this page.
	 * @param {string} rdf The WAI-ARIA Taxonomy to use.
	 * @returns {string} HTML which describes the findings of the validation.
	 */
	function validateAria(rdf){
		var parser, rdfDom, summary, html = "";
		if(scope.ARIA)
		{
			if(!scope.ARIA.getRdf() && rdf)
			{
				parser = new DOMParser();
				rdfDom = parser.parseFromString(rdf, "text/xml");
				scope.ARIA.setRdf(rdfDom);
			}
			summary = scope.ARIA.check(window, options);
			if(summary && summary.length)
			{
				summary.forEach(function(next){
					html += next.toHtml();
				});
			}
		}
		else
		{
			alert("Something bad happened.");
		}
		return html;
	}
})(this);
