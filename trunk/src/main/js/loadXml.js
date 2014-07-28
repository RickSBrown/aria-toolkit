define(function(){
	/**
	 * A REALLY basic xml loader.
	 * @param {string} url The location of the XML to load.
	 */
	function loadXml(url)
	{
		var xhr, trident = (window.navigator.userAgent.indexOf(" Trident/") >= 0);
		if(window.XMLHttpRequest)
		{
			xhr = new XMLHttpRequest();
		}
		else if("ActiveXObject" in window)
		{
			xhr = new ActiveXObject("Microsoft.XMLHTTP");
		}
		xhr.open("GET", url, false);
		if(trident)
		{
			//Really only need to be here in IE10 and greater (trident >= 6)
			try{xhr.responseType = "msxml-document";} catch(ignore){}
		}
		xhr.send();
		return xhr.responseXML;
	}

	return loadXml;
});