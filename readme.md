# rsbuild-plugin-rempa

<p>
  <a href="https://npmjs.com/package/rsbuild-plugin-rempa">
    <img src="https://img.shields.io/npm/v/rsbuild-plugin-rempa?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
  <a href="https://npmcharts.com/compare/rsbuild-plugin-rempa?minimal=true"><img src="https://img.shields.io/npm/dm/rsbuild-plugin-rempa.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
</p>

An Rsbuild plugin to collect pages and generate a Multi-Page Application (MPA).

The plugin discovers page configurations, generates entry files, and applies page layouts and HTML templates automatically.

## Usage

Install:

```bash
npm add rsbuild-plugin-rempa -D
```

Add plugin to your `rsbuild.config.ts`:

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginRempa } from 'rsbuild-plugin-rempa';

export default defineConfig({
  plugins: [pluginReact(), pluginRempa()],
});
```

## Vue 3

Install Vue and its Rsbuild compiler plugin:

```bash
pnpm add vue
pnpm add -D @rsbuild/plugin-vue rsbuild-plugin-rempa
```

```ts
import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { pluginRempa } from 'rsbuild-plugin-rempa';

export default defineConfig({
  plugins: [pluginVue(), pluginRempa({ layout: '@/layout/Layout.vue' })],
});
```

Vue pages pair `config.json` with `index.vue`. The plugin mounts each page with
Vue 3 `createApp`; a layout receives the page through its default `<slot />`:

```vue
<template>
  <main><slot /></main>
</template>
```

Without a layout, the page mounts directly. The framework is detected from the
application's nearest `package.json`: `dependencies` and `devDependencies` are
checked first. Vue-only declarations select Vue even when a workspace also
installs React; if both are declared, React takes priority for compatibility.
When neither is declared, installed packages are resolved from the application
root (including workspace-hoisted dependencies), checking React before Vue.
If neither package can be resolved, React is used as the fallback.

Set `framework: 'vue'` or `framework: 'react'` to override detection. The example
above automatically selects Vue from its package dependencies. The matching
Rsbuild framework compiler plugin (`pluginVue()` or `pluginReact()`) is still
required.

The root pair `src/pages/config.json` and `src/pages/index.vue` generates
`index.html`; nested pairs such as `src/pages/admin/users/` generate
`admin/users.html`. Root and `src/pages/index/` configurations cannot coexist
because both generate `index.html`; duplicate outputs raise an error listing
the conflicting configuration files. Page-level `layout`, `template`, and `mountElementId` work
with either framework; custom templates must provide the mount element.

See [the Vue example](./examples/vue). From the repository root, run
`pnpm build`, then `pnpm --filter rempa-vue-example dev` or
`pnpm --filter rempa-vue-example build`.

## Page Discovery

By default, the plugin discovers `config.json` files in `src/pages`. Each React page should have an `index.tsx` entry alongside its configuration (Vue uses `index.vue`):

```text
src/pages/
  home/
    config.json
    index.tsx
  about/
    config.json
    index.tsx
```

This generates `home.html` and `about.html` with their own entry files.

## Options

Pass an options object to customize page discovery and shared defaults:

```ts
pluginRempa({
  pagesPath: 'src/pages',
  template: './src/template/index.html',
  layout: './src/layout/Layout.tsx',
  aliasAtToSrc: true,
  locals: true,
  localsName: 'pageData',
});
```

| Name           | Description                                                            | Default                                   |
| -------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| `framework`    | Optional override: `react` or `vue` (Vue 3).                           | Auto-detect from application dependencies |
| `pagesPath`    | Page directory, relative to the project root.                          | `src/pages`                               |
| `template`     | Default HTML template file.                                            | Project or Rsbuild default template       |
| `layout`       | Default layout component (`children` for React; default slot for Vue). | React fragment; direct mount for Vue      |
| `aliasAtToSrc` | Adds the `@` alias pointing to the project's `src` folder.             | `true`                                    |
| `locals`       | Whether to inject locals into template parameters.                     | —                                         |
| `localsName`   | Name of the injected locals variable.                                  | —                                         |

## Page Configuration

Use `config.json` to override settings for an individual page:

```json
{
  "title": "Home Page",
  "mountElementId": "root"
}
```

Supported properties:

- `template`: Path to the HTML template file.
- `layout`: Path to the page layout component.
- `title`: Page title. Defaults to the page name.
- `mountElementId`: ID of the element where the page is mounted. Defaults to `root`.

Additional properties are passed to the HTML template as `templateParameters`.

For a complete example, see the [playground](https://github.com/sumy7/rsbuild-plugin-rempa/tree/main/playground).

## License

MIT.
