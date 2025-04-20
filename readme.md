# rsbuild-plugin-rempa

[![npm](https://img.shields.io/npm/dt/rsbuild-plugin-rempa.svg)](https://www.npmjs.com/package/rsbuild-plugin-rempa)  [![npm](https://img.shields.io/npm/v/rsbuild-plugin-rempa.svg)](https://www.npmjs.com/package/rsbuild-plugin-rempa) [![npm](https://img.shields.io/npm/l/rsbuild-plugin-rempa.svg)](https://www.npmjs.com/package/rsbuild-plugin-rempa)

A Rsbuild plugin designed to collect pages and generate a Multi-Page Application (MPA).

**Note: This plugin is currently under development, and its API may be subject to change.**

## Installation

Install the plugin via npm:

```bash
npm install rsbuild-plugin-rempa --save-dev
```

## Usage

Add the plugin to your `rsbuild` configuration file:

```typescript
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginRempa } from 'rsbuild-plugin-rempa';

export default defineConfig({
  plugins: [pluginReact(), pluginRempa()],
});
```

### Plugin Options

- `template` (string): Specifies the HTML template file to use for the generated pages. Defaults to the Rsbuild default template.
- `layout` (string): Defines the default layout path for the entry page. Defaults to `<>{children}</>`.

### Auto-Generated MPA

The plugin automatically generates entry files for each page based on the `config.json` files located in the `src/pages` directory.

Example `config.json`:

```json
{
  "title": "Index Page",
  "layout": "./layout.tsx"
}
```

Supported `config.json` options include:

- `template`: Path to the template file.
- `layout`: Path to the page layout.
- `title`: Title of the page.
- `mountElementId`: The ID of the DOM node where the page will be mounted. Defaults to `root`.
- Additional properties will be passed to the template as `templateParameters`.

## Example

For a working example, see the [playground](https://github.com/sumy7/rsbuild-plugin-rempa/tree/main/playground).

## License

MIT
