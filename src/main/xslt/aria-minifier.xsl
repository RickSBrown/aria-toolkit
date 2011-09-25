<?xml version="1.0"?>
<!--
	Remove insignificant whitespace and elements we are not interested in for this purpose.
	This will reduce the size of the aria taxonomy significantly, but the most important
	step is still to ensure that http compression is turned on.
 -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
	xmlns:role="http://www.w3.org/1999/xhtml/vocab#"
	xmlns:states="http://www.w3.org/2005/07/aaa#"
	xmlns:xsd="http://www.w3.org/2001/XMLSchema#"
	xmlns:dc="http://purl.org/dc/elements/1.1/#"
	xmlns:owl="http://www.w3.org/2002/07/owl#"
	xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
	xml:base="http://www.w3.org/WAI/ARIA/Schemata/aria-1">
	
	<xsl:strip-space elements="*"/>
	
	<xsl:template match="@*|node()">
		<xsl:copy>
			<xsl:apply-templates select="@*|node()"/>
		</xsl:copy>
	</xsl:template>
	
	<xsl:template match="role:baseConcept|role:nameFrom|rdfs:seeAlso|rdfs:comment"/>
	
</xsl:stylesheet>