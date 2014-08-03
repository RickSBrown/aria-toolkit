/*
 * Chrome Extension content script for ARIA Validator.
 *
 * Copyright (C) 2014  Rick Brown
 */
(function(scope){

	var options;

	scope.chrome.extension.sendMessage({action:"optionsmap"}, initialize);

	function initialize(options)
	{
		scope.chrome.storage.sync.get(options, updateOptions);
		scope.chrome.runtime.onMessage.addListener(messageEvent);
		scope.chrome.storage.onChanged.addListener(storageChangedEvent);
	}

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
			html = validateAria(msg.rdf, msg.ariahtml);
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
	function validateAria(rdf, ariahtml){
		var dom, summary, html = "";
		if(scope.ARIA)
		{
			if(!scope.ARIA.getRdf() && rdf && (dom = rehydrate(rdf)))
			{
				scope.ARIA.setRdf(dom);
			}
			if(!scope.ARIA.getXml() && ariahtml && (dom = rehydrate(ariahtml)))
			{
				scope.ARIA.setXml(dom);
			}
			scope.ARIA.setValidatorOptions(options);
			summary = scope.ARIA.check(window);
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
	
	/**
	 * Deserializes an XML String to an XML DOM.
	 * @param {string} xml Serialized XML.
	 * @return {DOM} An XML DOM object.
	 */
	function rehydrate(xml)
	{
		var result, parser;
		if(xml)
		{
			parser = new DOMParser();
			result = parser.parseFromString(xml, "text/xml");
		}
		return result;
	}
})(this);
