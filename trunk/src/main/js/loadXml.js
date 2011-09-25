/**
 * A REALLY basic xml loader.
 */
function loadXml(url)
{
	var result, xhr;
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