import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRsbuild } from '@rsbuild/core';
import { expect, test } from 'rstack/test';
import { pluginRempa } from '../../src/index.js';

const playground = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../playground',
);

test('builds all configured pages with titles and the shared layout', async () => {
  const output = await mkdtemp(join(tmpdir(), 'rempa-test-'));
  try {
    const rsbuild = await createRsbuild({
      cwd: playground,
      rsbuildConfig: {
        plugins: [pluginRempa()],
        output: { distPath: { root: output } },
        logLevel: 'error',
      },
    });
    await rsbuild.build();
    const hello = await readFile(join(output, 'hello-world.html'), 'utf8');
    const pageA = await readFile(join(output, 'pageA.html'), 'utf8');
    const pageB = await readFile(join(output, 'pageB.html'), 'utf8');
    expect(hello).toContain('<title>Hello World</title>');
    expect(pageA).toContain('<title>pageA</title>');
    expect(pageB).toContain('<title>pageB</title>');
    expect(hello).toContain('<script');
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('serves generated page entries in development', async () => {
  const rsbuild = await createRsbuild({
    cwd: playground,
    rsbuildConfig: {
      plugins: [pluginRempa()],
      server: { port: 0, open: false },
      logLevel: 'error',
    },
  });
  const { server, urls } = await rsbuild.startDevServer();
  try {
    const response = await fetch(new URL('/hello-world.html', urls[0]));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>Hello World</title>');
  } finally {
    await server.close();
  }
});
