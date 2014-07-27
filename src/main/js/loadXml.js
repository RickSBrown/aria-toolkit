define(function(){
	/**
	 * A REALLY basic xml loader.
	 * @param {string} url The location of the XML to load.
	 */
	function loadXml(url)
	{
		var xhr;
		if(window.XMLHttpRequest)
		{
			xhr = new XMLHttpRequest();
		}
		else
		{
			xhr = new ActiveXObject("Microsoft.XMLHTTP");
		}
		xhr.open("GET", url, false);
		xhr.send();
		return xhr.responseXML;
	}

	return loadXml;
});