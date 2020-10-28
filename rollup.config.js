import { terser } from "rollup-plugin-terser";
import babel from "@rollup/plugin-babel";
import fs from "fs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";

const packageJson = JSON.parse(fs.readFileSync("./package.json"));

export default [
  createConfig("esm"),
  createConfig("system"),
  createConfig("umd"),
  createConfig("umd", true),
  createConfig("esm", true),
];

function createConfig(format, server = false) {
  const babelOpts = server
    ? { babelHelpers: "bundled", envName: "server" }
    : { babelHelpers: "bundled" };

  return {
    input: `./src/single-spa-layout${server ? "-server" : ""}.js`,
    output: {
      format,
      file: `dist/${format}/single-spa-layout${server ? "-server" : ""}.min.${
        format === "umd" ? "c" : ""
      }js`,
      name: format === "umd" ? "singleSpaLayout" : null,
      banner: `/* single-spa-layout@${packageJson.version} - ${format} */`,
      globals: {
        "single-spa": "singleSpa",
      },
    },
    external: ["single-spa", "path", "fs", "stream", /^parse5.*/, "merge2"],
    plugins: [
      nodeResolve(),
      commonjs(),
      babel(babelOpts),
      replace({
        "process.env.BABEL_ENV": JSON.stringify("production"),
      }),
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
