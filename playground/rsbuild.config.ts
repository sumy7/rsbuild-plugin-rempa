import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginRempa } from 'rsbuild-plugin-rempa';

export default defineConfig({
  plugins: [pluginReact(), pluginRempa()],
});
