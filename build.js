/*
 * This is the build configuration for the aria layer files.
 * Properties will be expanded.
 * This is consumed by r.js which is initiated from the main Ant build.
 */
({
	baseUrl: "build/${js.debug.dir.name}",
	name: '../../libs/requirejs/almond',
	out: 'build/${js.debug.dir.name}/${layer.name.js}',
	//preserveLicenseComments: false,
	optimize: "none",//closure | none
	normalizeDirDefines: "all",
	//generateSourceMaps: true,
	wrap: {
		startFile: 'src/main/js/start.frag',
		endFile: 'src/main/js/end.frag'
	},
	include: ['${module.name}']
})