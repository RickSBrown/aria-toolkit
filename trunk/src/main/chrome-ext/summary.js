/*
 * Chrome Extension for ARIA Validator.
 * This script is loaded by the summary page - it is a content-script.
 *
 * Copyright (C) 2014  Rick Brown
 */
(function(scope){
	scope.chrome.runtime.onMessage.addListener(messageEvent);

	/*
	 * Listen for events from background scripts.
	 * @param {type} msg
	 */
	function messageEvent(msg)
	{
		var container, html = msg? msg.html : "";
		if(html)
		{
			container = scope.document.querySelector(".validatorResults");
			if(container)
			{
				container.parentNode.removeChild(container);
			}
			scope.document.body.insertAdjacentHTML("beforeend", html);
			addCssClass(scope.document.body);
		}
	}

	/**
	 * Adds any additional css classes for styling purposes.
	 * The underlying validator engine does not know the specifics of the Chrome extension.
	 * @param {Element} body The body element.
	 */
	function addCssClass(body)
	{
		var i, next, elements = body.querySelectorAll("h1,h2,h3,dl,ul,p");
		for(i=0; i<elements.length; i++)
		{
			next = elements[i];
			next.classList.add("chrome-bootstrap");
		}
	}
})(this);