/*
 * Chrome Extension background script for ARIA Validator.
 *
 * Copyright (C) 2014  Rick Brown
 */
(function(scope){
	var rdf = loadXml("xml/aria-1.rdf"),
		ariahtml = loadXml("xml/aria-html.xml"),
		DEFAULT_OPTIONS = {
			ids: true,
			experimental: true,
			//ignorerequired: true,
			//requiredxornative: false,
			//requiredandnative: false,
			attributes: true
		};

	scope.chrome.extension.onMessage.addListener(messageEvent);

	function messageEvent(request, sender, sendResponse)
	{
		switch(request.action)
		{
			case "optionsmap":
				sendResponse(DEFAULT_OPTIONS);
				break;
			default:
				sendResponse({});
		}
	}

	/**
	 * Callback will be passed results from contentscript once the validation is complete.
	 * @param {string} html The html results from the validator.
	 * @returns Nothing! So there.
	 */
	function displayResults(html) {
		if(html && html.length)
		{
			scope.chrome.tabs.create({url : "summary.html"}, function(tab){
				tab.favIconUrl = "icon/48/Valide.png";
				window.setTimeout(function(){
					scope.chrome.tabs.sendMessage(tab.id, { html: html});
				}, 250);
			});
		}
		else
		{
			scope.console.log("No ARIA Validator results to display");
		}
	}

	/*
	 * Wait for user to clicky buttony thingy.
	 */
	scope.chrome.browserAction.onClicked.addListener(function(tab){
		scope.chrome.tabs.sendMessage(tab.id, { action: "validate", rdf:rdf, ariahtml:ariahtml}, displayResults);
	});

	/*
 	* A REALLY basic xml loader - leaving ActiveXObject in there for gits and shiggles - haha - I need a coffee break.
 	*/
	function loadXml(url)
	{
		var xhr;
		if(scope.XMLHttpRequest)
		{
			xhr = new XMLHttpRequest();
		}
		else
		{
			xhr = new ActiveXObject("Microsoft.XMLHTTP");
		}
		xhr.open("GET", url, false);
		xhr.send();
		return xhr.responseText;
	}
})(this);
