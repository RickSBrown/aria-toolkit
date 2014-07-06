/*
 * Chrome Extension content script for ARIA Validator.
 *
 * Copyright (C) 2014  Rick Brown
 */
(function(scope){

	scope.chrome.runtime.onMessage.addListener(messageEvent);

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
})(this);
