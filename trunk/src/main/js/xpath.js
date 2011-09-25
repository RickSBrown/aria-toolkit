/**
 * @param {string} expr The xpath expression
 * @param {boolean} firstMatch set to true to return a single node only
 * @param doc The XML dom to query
 * @return node or collection
 */
function query(expr, firstMatch, doc)
{
	var next, result, match, nsResolver;
	if(doc.ownerDocument)
	{
		doc = doc.ownerDocument;
	}
	if(doc.evaluate)
	{
		nsResolver = document.createNSResolver(doc.documentElement);
		if(firstMatch)
		{
			result = (doc.evaluate(expr, doc, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null)).singleNodeValue;
		}
		else
		{
			result = [];
			match = doc.evaluate(expr, doc, nsResolver, XPathResult.ANY_TYPE, null);
			while((next = match.iterateNext()))
			{
				result[result.length] = next;
			}
		}
	}
	else
	{
		ieNamespaceResolver(doc);
		if(firstMatch)
		{
			result = doc.selectSingleNode(expr);
		}
		else 
		{
			result = doc.selectNodes(expr);
		}
	}
	return result;
}

function ieNamespaceResolver(doc)
{
	var i, next, namespaceRe = /^xmlns/, namespaces = "",
		attributes = doc.documentElement.attributes;
	for(i=attributes.length - 1; i>=0; i--)
	{
		next = attributes[i];
		if(namespaceRe.test(next.name))
		{
			namespaces  += next.name + "='" + next.value + "' ";
		}
	}
	if(namespaces)
	{
		doc.setProperty("SelectionNamespaces", namespaces);
	}
}
