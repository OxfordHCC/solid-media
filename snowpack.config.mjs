import {readFileSync} from 'fs';
const packageJson = JSON.parse(readFileSync('./package.json'));

export default {
	mount: {
		src: '/',
	},
	routes: [
		{
			match: 'routes',
			src: '.*',
			dest: '/index.html',
		}
	],
	plugins: process.env.NODE_ENV === 'development' ? [
		'@snowpack/plugin-typescript',
	] : [],
	env: {
		HOMEPAGE: process.env.NODE_ENV === 'development' ? '' : new URL(packageJson.homepage).pathname,
  	},
	webDependencies: [
		"preact",
		"wouter-preact",
	],
};
