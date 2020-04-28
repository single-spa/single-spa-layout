import { terser } from "rollup-plugin-terser";

export default [
  ...createConfig("esm"),
  ...createConfig("system"),
  ...createConfig("umd"),
];

function createConfig(format) {
  return [
    {
      input: "./src/single-spa-layout.js",
      output: {
        format,
        file: `dist/${format}/single-spa-layout.min.js`,
        name: format === "umd" ? "singleSpaLayout" : null,
      },
      plugins: [terser()],
    },
    {
      input: "./src/jsx-runtime.js",
      output: {
        format,
        file: `dist/${format}/jsx-runtime.js`,
        name: format === "umd" ? "singleSpaJsxRuntime" : null,
      },
    },
  ];
}
