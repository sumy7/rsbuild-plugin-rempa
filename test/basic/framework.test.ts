import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'rstack/test';
import { resolveFramework } from '../../src/utils.js';

// pnpm's test launcher sets a global NODE_PATH pointing at its own dependencies.
// Use native Node without that global fallback to test the application's installation.
async function resolveInstalled(root: string) {
  const utils = new URL('../../src/utils.ts', import.meta.url).href;
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { resolveFramework, getReactVersion, isReact18 } from ${JSON.stringify(utils)};
const root = ${JSON.stringify(root)};
console.log(JSON.stringify({ framework: resolveFramework(root), version: getReactVersion(root), modern: isReact18(root) }));`,
    ],
    { env: { ...process.env, NODE_PATH: '' } },
  );
  return JSON.parse(stdout);
}

async function manifest(root: string, value: Record<string, unknown>) {
  await mkdir(root, { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify(value));
}

async function installed(root: string, name: string, version = '3.5.0') {
  await manifest(join(root, 'node_modules', name), { name, version });
}

for (const [description, dependencies, devDependencies, expected] of [
  ['React dependency', { react: '^18.0.0' }, {}, 'react'],
  ['Vue dependency', { vue: '^3.0.0' }, {}, 'vue'],
  ['Vue development dependency', {}, { vue: '^3.0.0' }, 'vue'],
  ['both frameworks', { vue: '^3.0.0' }, { react: '^18.0.0' }, 'react'],
  ['neither framework', {}, {}, 'react'],
] as const) {
  test(`auto-detects ${description} from the application manifest`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'rempa-framework-'));
    try {
      await manifest(root, { dependencies, devDependencies });
      expect(resolveFramework(root)).toBe(expected);
      expect(resolveFramework(root, 'react')).toBe('react');
      expect(resolveFramework(root, 'vue')).toBe('vue');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('Vue workspace declaration takes priority over hoisted React', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rempa-framework-workspace-'));
  try {
    await manifest(root, { dependencies: { react: '^18.0.0' } });
    await installed(root, 'react', '18.3.1');
    const app = join(root, 'apps/vue');
    await manifest(app, { dependencies: { vue: '^3.0.0' } });
    await mkdir(join(app, 'src'), { recursive: true });
    expect(resolveFramework(app)).toBe('vue');
    expect(resolveFramework(join(app, 'src'))).toBe('vue');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('falls back to app-resolvable installed packages and detects hoisted React versions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rempa-framework-installed-'));
  try {
    const app = join(root, 'apps/app');
    await manifest(app, {});
    expect(await resolveInstalled(app)).toEqual({
      framework: 'react',
      version: false,
      modern: false,
    });
    await installed(root, 'vue');
    expect(await resolveInstalled(app)).toEqual({
      framework: 'vue',
      version: false,
      modern: false,
    });
    await installed(root, 'react', '17.0.2');
    expect(await resolveInstalled(app)).toEqual({
      framework: 'react',
      version: '17.0.2',
      modern: false,
    });
    await installed(root, 'react', '18.3.1');
    expect(await resolveInstalled(app)).toEqual({
      framework: 'react',
      version: '18.3.1',
      modern: true,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
