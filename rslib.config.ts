import { pluginTypeCheck } from "@rsbuild/plugin-type-check";
import { pluginNodePolyfill } from "@rsbuild/plugin-node-polyfill";
import { RsdoctorRspackPlugin } from "@rsdoctor/rspack-plugin";
import { defineConfig } from "@rslib/core";

// -----------------------------------------------------------------------------

export default defineConfig({
	lib: [
		// Node.js ESM
		{
			format: "esm",
			syntax: "es2022",
			dts: true,
			bundle: true,
			source: {
				tsconfigPath: './tsconfig.node.json'
			},
			output: {
				target: "node",
				distPath: {
					root: "./dist/node/"
				},
				minify: true,
				sourceMap: true,
				filename: {
					js: '[name].min.js'
				}
			}
		},
		// Node.js CommonJS
		{
			format: "cjs",
			syntax: "es2015",
			dts: false,
			bundle: true,
			source: {
				tsconfigPath: './tsconfig.node.json'
			},
			output: {
				target: "node",
				distPath: {
					root: "./dist/node/"
				},
				minify: true,
				sourceMap: true,
				filename: {
					js: '[name].min.js'
				}
			}
		},
		// Browser ESM
		{
			format: "esm",
			syntax: "es2022",
			dts: true,
			autoExternal: false,
			source: {
				tsconfigPath: './tsconfig.browser.json'
			},
			output: {
				target: "web",
				distPath: {
					root: "./dist/browser/"
				},
				minify: true,
				sourceMap: true,
				filename: {
					js: '[name].min.js'
				}
			}
		},
		// UMD for browser - BUNDLE everything
		{
			format: "umd",
			syntax: "es2015",
			dts: false,
			bundle: true,
			autoExternal: false, // Bundle dependencies
			umdName: "iotComm",
			source: {
				tsconfigPath: './tsconfig.browser.json'
			},
			output: {
				target: "web",
				distPath: {
					root: "./dist/umd/"
				},
				minify: true,
				sourceMap: true,
				filename: {
					js: '[name].min.js'
				}
			}
		}
	],
	output: {
		injectStyles: true,
		legalComments: "none"
	},
	source: {
		entry: {
			index: './src/client.ts'
		}
	},
	plugins: [
		pluginTypeCheck(),
		pluginNodePolyfill()
	],
	tools: {
		htmlPlugin: false,
		rspack: (_config, { appendPlugins }) => {
			if (process.env.RSDOCTOR) {
				appendPlugins(
					new RsdoctorRspackPlugin({
					})
				);
			}
		},
	},
});
