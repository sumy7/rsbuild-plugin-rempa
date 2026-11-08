import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import {
  createRsbuild,
  type RsbuildConfig,
  type RsbuildPluginAPI,
} from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { expect, test } from 'rstack/test';
import { pluginRempa } from '../../src/index.js';

const example = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../examples/vue',
);

async function runtimeFixture(layout?: string) {
  const root = await mkdtemp(join(tmpdir(), 'rempa-vue-runtime-'));
  await mkdir(join(root, 'src/pages'), { recursive: true });
  await writeFile(
    join(root, 'src/pages/config.json'),
    JSON.stringify({ mountElementId: 'app', layout }),
  );
  await writeFile(
    join(root, 'src/pages/index.vue'),
    '<template><h1>Home</h1></template>',
  );
  let config: RsbuildConfig = {};
  await pluginRempa({ framework: 'vue' }).setup({
    context: {
      rootPath: root,
      cachePath: join(root, 'cache'),
      action: 'build',
    },
    modifyRsbuildConfig(modifier: (config: RsbuildConfig) => RsbuildConfig) {
      config = modifier(config);
    },
  } as unknown as RsbuildPluginAPI);
  return { root, entry: config.source!.entry!.index as string };
}

for (const layout of [undefined, '@/Layout.vue']) {
  test(`Vue runtime mounts the page ${layout ? 'through the layout default slot' : 'without a layout'}`, async () => {
    const { root, entry } = await runtimeFixture(layout);
    try {
      const source = await readFile(entry, 'utf8');
      expect(entry).toMatch(/\.js$/);
      expect(source).toContain(join(root, 'src/pages/index.vue'));
      expect(source).not.toContain('react');
      const App = {};
      const Layout = {};
      const element = {};
      let mounted: unknown;
      let component: unknown;
      const context = {
        App,
        Layout,
        createApp(value: unknown) {
          component = value;
          return {
            mount(target: unknown) {
              mounted = target;
            },
          };
        },
        h(type: unknown, props?: unknown, slots?: unknown) {
          return { type, props, slots };
        },
        document: {
          getElementById(id: string) {
            expect(id).toBe('app');
            return element;
          },
        },
      };
      const executable = source.replace(/^import .*;\n/gm, '');
      runInNewContext(executable, context);
      expect(mounted).toBe(element);
      if (layout) {
        const rendered = (
          component as {
            render: () => {
              type: unknown;
              slots: { default: () => { type: unknown } };
            };
          }
        ).render();
        expect(rendered.type).toBe(Layout);
        expect(rendered.slots.default().type).toBe(App);
      } else {
        expect(component).toBe(App);
      }
      expect(() =>
        runInNewContext(executable, {
          ...context,
          document: { getElementById: () => null },
        }),
      ).toThrow('Missing mount element for page index');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('builds Vue SFC root, nested pages and shared layouts', async () => {
  const output = await mkdtemp(join(tmpdir(), 'rempa-vue-build-'));
  try {
    const rsbuild = await createRsbuild({
      cwd: example,
      rsbuildConfig: {
        plugins: [pluginVue(), pluginRempa({ layout: '@/layout/Layout.vue' })],
        output: { distPath: { root: output } },
        logLevel: 'error',
      },
    });
    await rsbuild.build();
    for (const [page, title] of [
      ['index', 'Vue Home'],
      ['about', 'About Vue'],
      ['admin/users', 'Vue Users'],
    ]) {
      const html = await readFile(join(output, `${page}.html`), 'utf8');
      expect(html).toContain(`<title>${title}</title>`);
      expect(html).toContain('<script');
      expect(html).toContain('id="root"');
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('serves Vue root and nested pages in development', async () => {
  const rsbuild = await createRsbuild({
    cwd: example,
    rsbuildConfig: {
      plugins: [pluginVue(), pluginRempa({ layout: '@/layout/Layout.vue' })],
      server: { port: 0, open: false },
      logLevel: 'error',
    },
  });
  const { server, urls } = await rsbuild.startDevServer();
  try {
    for (const [page, title] of [
      ['index', 'Vue Home'],
      ['admin/users', 'Vue Users'],
    ]) {
      const response = await fetch(new URL(`/${page}.html`, urls[0]));
      expect(response.status).toBe(200);
      expect(await response.text()).toContain(`<title>${title}</title>`);
    }
  } finally {
    await server.close();
  }
});
