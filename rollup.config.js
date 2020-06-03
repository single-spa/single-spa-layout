import { terser } from "rollup-plugin-terser";
import fs from "fs";

const packageJson = JSON.parse(fs.readFileSync("./package.json"));

export default [
  createConfig("esm"),
  createConfig("system"),
  createConfig("umd"),
];

function createConfig(format) {
  return {
    input: "./src/single-spa-layout.js",
    output: {
      format,
      file: `dist/${format}/single-spa-layout.min.js`,
      name: format === "umd" ? "singleSpaLayout" : null,
      banner: `/* single-spa-layout@${packageJson.version} - ${format} */`,
      globals: {
        "single-spa": "singleSpa",
      },
    },
    external: ["single-spa"],
    plugins: [
      process.env.DEVELOPMENT !== "true" &&
        terser({
          compress: {
            passes: 2,
          },
          output: {
            comments(node, comment) {
              return comment.value.trim().startsWith("single-spa-layout@");
            },
          },
        }),
    ],
  };
}
