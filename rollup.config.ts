import { stripCode } from '@codecb/rollup-plugin-strip-code';
import babel, { RollupBabelInputPluginOptions } from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import { resolve } from 'node:path';
import { defineConfig, ModuleFormat } from 'rollup';
import { terser } from 'rollup-plugin-terser';
import ts from 'rollup-plugin-ts';
import pkg from './package.json';

const rootDir = process.cwd();
const isDev =
  process.env['ROLLUP_WATCH'] === 'true' ||
  process.env['NODE_ENV'] === 'development';

export type BundleTarget = 'browser' | 'server';

const createConfig = ({
  format,
  target,
}: {
  format: ModuleFormat;
  target: BundleTarget;
}) => {
  const inputFile =
    target === 'server'
      ? resolve(rootDir, 'src/server/index.ts')
      : resolve(rootDir, 'src/browser/index.ts');
  const extension =
    format === 'esm' || format === 'es' || format === 'module'
      ? 'mjs'
      : format === 'cjs' || format === 'commonjs'
      ? 'cjs'
      : 'js';
  const outputFile = resolve(rootDir, `dist/${format}/${target}.${extension}`);
  const babelOpts: RollupBabelInputPluginOptions =
    target === 'server'
      ? { babelHelpers: 'bundled', envName: 'server' }
      : { babelHelpers: 'bundled' };

  return defineConfig({
    input: inputFile,
    output: {
      banner: `/*! ${pkg.name}/${target}@${pkg.version} - ${format} format */`,
      file: outputFile,
      format,
      sourcemap: isDev,
    },
    external: ['merge2', /^node:*/, /^parse5.*/, 'single-spa'],
    plugins: [
      !isDev &&
        stripCode({ endComment: '#devOnlyEnd', startComment: '#devOnlyStart' }),
      ts({
        hook: {
          // There may be a bug in `rollup-plugin-ts` that make it unable to load `.d.mts` files.
          // So let's make it generate `.d.ts` files instead for now.
          // We could remove this after this is resolved by `rollup-plugin-ts`.
          outputPath: (path, kind) =>
            kind === 'declaration' || kind === 'declarationMap'
              ? path.replace(/\.d\.[mc]ts/, '.d.ts')
              : path,
        },
        tsconfig: resolve(
          rootDir,
          isDev ? 'tsconfig.dev.json' : 'tsconfig.json',
        ),
      }),
      replace({
        preventAssignment: true,
        values: {
          'process.env.BABEL_ENV': JSON.stringify('production'),
          'process.env.NODE_ENV': JSON.stringify(
            isDev ? 'development' : 'production',
          ),
        },
      }),
      babel(babelOpts),
      !isDev && terser({ compress: { passes: 2 } }),
    ],
    onwarn(warning, defaultHandler) {
      // Circular dependency between recursive render functions is intended
      if (!['CIRCULAR_DEPENDENCY'].includes(warning.code!))
        defaultHandler(warning);
    },
  });
};

export default [
  createConfig({ format: 'esm', target: 'browser' }),
  createConfig({ format: 'system', target: 'browser' }),
  createConfig({ format: 'cjs', target: 'server' }),
  createConfig({ format: 'esm', target: 'server' }),
];
