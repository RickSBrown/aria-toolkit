/*
 * This is the build configuration for the aria core layer file.
 * This is consumed by r.js which is initiated from the main Ant build.
 */
({
	baseUrl: "build/js_debug",
	name: '../../libs/requirejs/almond',
	out: 'build/js_debug/aria-layer.js',
	//preserveLicenseComments: false,
	optimize: "none",//closure | none
	normalizeDirDefines: "all",
	//generateSourceMaps: true,
	wrap: {
		startFile: 'src/main/js/start.frag',
		endFile: 'src/main/js/end.frag'
	},
	include: ['aria']
})