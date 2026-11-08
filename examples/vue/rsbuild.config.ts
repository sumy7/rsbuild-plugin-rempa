import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { pluginRempa } from 'rsbuild-plugin-rempa';

export default defineConfig({
  plugins: [pluginVue(), pluginRempa({ layout: '@/layout/Layout.vue' })],
});
