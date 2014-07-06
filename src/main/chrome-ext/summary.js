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
		}
	}
})(this);