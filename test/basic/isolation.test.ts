import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RsbuildConfig,
  RsbuildPlugin,
  RsbuildPluginAPI,
} from '@rsbuild/core';
import { expect, test } from 'rstack/test';
import { pluginRempa } from '../../src/index.js';

const cacheRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../node_modules/.cache/rsbuild-plugin-rempa/tests',
);

async function createFixture() {
  await mkdir(cacheRoot, { recursive: true });
  return mkdtemp(join(cacheRoot, 'isolation-'));
}

async function createPage(
  root: string,
  pagesPath = 'src/pages',
  marker = 'page',
) {
  const page = join(root, pagesPath, 'home');
  await mkdir(page, { recursive: true });
  await writeFile(join(page, 'config.json'), JSON.stringify({ title: marker }));
  await writeFile(join(page, 'index.tsx'), `export default '${marker}';`);
}

async function configure(
  plugin: RsbuildPlugin,
  root: string,
  cachePath = join(root, 'cache'),
) {
  let config: RsbuildConfig = {};
  const api = {
    context: { rootPath: root, cachePath, action: 'build' },
    modifyRsbuildConfig(modifier: (config: RsbuildConfig) => RsbuildConfig) {
      config = modifier(config);
    },
  } as unknown as RsbuildPluginAPI;
  await plugin.setup(api);
  return config;
}

function entryPath(config: RsbuildConfig): string {
  return config.source!.entry!.home as string;
}

test('no-argument configuration discovers pages and the template in the project root', async () => {
  const root = await createFixture();
  try {
    await createPage(root);
    await writeFile(join(root, 'index.html'), '<html>project template</html>');
    const config = await configure(pluginRempa(), root);
    expect(await readFile(entryPath(config), 'utf8')).toContain(
      join(root, 'src/pages/home/index.tsx'),
    );
    const template = config.html!.template as (data: {
      entryName: string;
    }) => string;
    expect(template({ entryName: 'home' })).toBe(join(root, 'index.html'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('separate plugin instances sharing a cache retain their own runtime entries', async () => {
  const root = await createFixture();
  try {
    await createPage(root, 'first', 'first');
    await createPage(root, 'second', 'second');
    const first = await configure(
      pluginRempa({ pagesPath: 'first', layout: '/first-layout.tsx' }),
      root,
    );
    const second = await configure(
      pluginRempa({ pagesPath: 'second', layout: '/second-layout.tsx' }),
      root,
    );
    expect(entryPath(first)).not.toBe(entryPath(second));
    expect(await readFile(entryPath(first), 'utf8')).toContain(
      '/first-layout.tsx',
    );
    expect(await readFile(entryPath(first), 'utf8')).toContain(
      join(root, 'first/home/index.tsx'),
    );
    expect(await readFile(entryPath(second), 'utf8')).toContain(
      '/second-layout.tsx',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('reusing a plugin across projects retains each project configuration', async () => {
  const fixture = await createFixture();
  try {
    const plugin = pluginRempa();
    const roots = [join(fixture, 'first'), join(fixture, 'second')];
    for (const root of roots) {
      await createPage(root);
      await writeFile(join(root, 'index.html'), root);
    }
    for (const [index, root] of roots.entries()) {
      await mkdir(join(root, 'node_modules/react'), { recursive: true });
      await writeFile(
        join(root, 'package.json'),
        JSON.stringify({ dependencies: { react: '*' } }),
      );
      await writeFile(
        join(root, 'node_modules/react/package.json'),
        JSON.stringify({ version: index === 0 ? '17.0.2' : '18.3.1' }),
      );
    }
    const first = await configure(
      plugin,
      roots[0],
      join(fixture, 'shared-cache'),
    );
    const second = await configure(
      plugin,
      roots[1],
      join(fixture, 'shared-cache'),
    );
    expect(await readFile(entryPath(first), 'utf8')).toContain(
      join(roots[0], 'src/pages/home/index.tsx'),
    );
    expect(await readFile(entryPath(second), 'utf8')).toContain(
      join(roots[1], 'src/pages/home/index.tsx'),
    );
    expect(await readFile(entryPath(first), 'utf8')).toContain(
      'ReactDOM.render(',
    );
    expect(await readFile(entryPath(second), 'utf8')).toContain(
      "from 'react-dom/client'",
    );
    expect(await readFile(entryPath(second), 'utf8')).toContain(
      'ReactDOM.createRoot(',
    );
    const firstTemplate = first.html!.template as (data: {
      entryName: string;
    }) => string;
    const secondTemplate = second.html!.template as (data: {
      entryName: string;
    }) => string;
    expect(firstTemplate({ entryName: 'home' })).toBe(
      join(roots[0], 'index.html'),
    );
    expect(secondTemplate({ entryName: 'home' })).toBe(
      join(roots[1], 'index.html'),
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('an empty project with no options does not create an entry', async () => {
  const root = await createFixture();
  try {
    const config = await configure(pluginRempa(), root);
    expect(config.source!.entry).toEqual({});
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
