import { define } from 'rstack';

define.lib({
  lib: [
    {
      syntax: 'es2021',
      dts: true,
      // The vendored CommonJS modules reference __dirname.
      shims: { esm: { __dirname: true } },
    },
    { format: 'cjs', syntax: 'es2021' },
  ],
});

define.test({ env: { NODE_ENV: undefined } });
define.fmt({ singleQuote: true, ignorePatterns: ['src/compiled/**'] });
define.staged({
  '*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}': ['rs lint --fix', 'rs fmt'],
  '*.{json,json5,jsonc,md,mdx,css,scss,less,html,yml,yaml}': 'rs fmt',
});
define.lint(({ js, ts }) => [
  { ignores: ['src/compiled/**'] },
  js.configs.recommended,
  ts.configs.recommended,
]);
