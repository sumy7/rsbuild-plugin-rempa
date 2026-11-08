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

## Page Discovery

By default, the plugin discovers `config.json` files in `src/pages`. Each page should have an `index.tsx` entry alongside its configuration:

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

| Name           | Description                                                | Default                             |
| -------------- | ---------------------------------------------------------- | ----------------------------------- |
| `pagesPath`    | Page directory, relative to the project root.              | `src/pages`                         |
| `template`     | Default HTML template file.                                | Project or Rsbuild default template |
| `layout`       | Default layout component.                                  | A fragment wrapping the page        |
| `aliasAtToSrc` | Adds the `@` alias pointing to the project's `src` folder. | `true`                              |
| `locals`       | Whether to inject locals into template parameters.         | —                                   |
| `localsName`   | Name of the injected locals variable.                      | —                                   |

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
