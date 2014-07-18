/*
 * Chrome Extension for ARIA Validator.
 * This script is loaded by the summary page - it is a content-script.
 *
 * Copyright (C) 2014  Rick Brown
 */
(function(scope){
	scope.chrome.runtime.onMessage.addListener(messageEvent);
	scope.addEventListener("click", clickEvent, false);
	scope.addEventListener("keyup", keyEvent, false);

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

	function clickEvent($event)
	{
		var target = $event.target, container;
		if(target && target.classList.contains("zoom"))
		{
			container = target.parentNode;//a bit lazy
			container.classList.toggle("zoomed");
		}
	}

	function keyEvent($event)
	{
		var i, len, next, zoomed, keyCode = $event.keyCode;
		if(keyCode === 27)
		{
			zoomed = scope.document.querySelectorAll(".zoomed");
			for(i=0, len=zoomed.length; i<len; i++)
			{
				next = zoomed[i];
				next.classList.remove("zoomed");
			}
		}
	}
})(this);