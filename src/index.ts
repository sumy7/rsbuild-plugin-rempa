import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type RsbuildPlugin,
  type RsbuildPluginAPI,
  mergeRsbuildConfig,
} from '@rsbuild/core';
import { glob } from 'glob';
import type { PageEntry, PluginRempaOptions } from './types.js';
import { isReact18 } from './utils.js';

const DEFAULT_MOUNT_ELEMENT_ID = 'root';

function getDefaultTemplate(rootPath: string): string {
  const defaultTemplate1 = path.resolve(rootPath, 'index.html');
  const defaultTemplate2 = path.resolve(rootPath, 'public/index.html');
  if (fs.existsSync(defaultTemplate1)) {
    return defaultTemplate1;
  }
  if (fs.existsSync(defaultTemplate2)) {
    return defaultTemplate2;
  }
  return '';
}

function writeDefaultLayout(tmpPath: string): string {
  const defaultLayoutPath = path.resolve(tmpPath, 'DefaultLayout.tsx');
  const defaultLayout = `import React from 'react';

const DefaultLayout: React.FC = ({ children }) => {
  return <>{children}</>;
};

export default DefaultLayout;
`;
  fs.writeFileSync(defaultLayoutPath, defaultLayout);
  return defaultLayoutPath;
}

async function collectionEntryInfo(
  pagesPath: string,
  defaultTemplate: string,
): Promise<PageEntry[]> {
  const entries: PageEntry[] = [];
  // 查找目录下所有的 config.json 文件
  const files = await glob('**/config.json', { cwd: pagesPath });
  for (const file of files) {
    const name = file.replace(/\/config\.json$/, '');
    const pagePath = path.resolve(pagesPath, file);
    const entryPath = path.resolve(pagesPath, name, 'index.tsx');
    const { layout, title, template, ...config } = JSON.parse(
      fs.readFileSync(pagePath, 'utf-8'),
    );
    entries.push({
      name,
      entryPath,
      layout: layout,
      title: title || name,
      template: template ?? defaultTemplate,
      pageConfig: {
        title: title || name,
        mountElementId: DEFAULT_MOUNT_ELEMENT_ID,
        ...config,
      },
    });
  }
  return entries;
}

async function writeRuntimeEntryFile(
  pageEntry: PageEntry,
  runtimeEntryPath: string,
  rootPath: string,
) {
  const rootElement = `document.getElementById('${pageEntry.pageConfig.mountElementId || DEFAULT_MOUNT_ELEMENT_ID}')`;
  const useCreateRoot = isReact18(rootPath);
  const renderer = useCreateRoot
    ? `ReactDOM.createRoot(${rootElement}).render(<Layout><App /></Layout>);`
    : `ReactDOM.render(<Layout><App /></Layout>, ${rootElement});`;
  const reactDOMSource = useCreateRoot ? 'react-dom/client' : 'react-dom';

  const runtimeEntryFile = `// @ts-nocheck
import React from 'react';
import ReactDOM from '${reactDOMSource}';
import App from '${pageEntry.entryPath}';
import Layout from '${pageEntry.layout}';
${renderer}`.trimStart();
  fs.writeFileSync(runtimeEntryPath, runtimeEntryFile);
}

export const pluginRempa = (
  options: PluginRempaOptions = {},
): RsbuildPlugin => ({
  name: 'plugin-rempa',

  async setup(api: RsbuildPluginAPI) {
    const cachePath = path.resolve(
      api.context.cachePath,
      'rsbuild-plugin-rempa',
      `.${api.context.action || 'unknown'}`,
    );
    fs.mkdirSync(cachePath, { recursive: true });
    const tmpPath = fs.mkdtempSync(path.join(cachePath, 'instance-'));

    const defaultLayoutPath = options.layout ?? writeDefaultLayout(tmpPath);
    const defaultTemplate =
      options.template ?? getDefaultTemplate(api.context.rootPath);

    const pagesPath = options.pagesPath
      ? path.resolve(api.context.rootPath, options.pagesPath)
      : path.resolve(api.context.rootPath, 'src', 'pages');
    const entries = await collectionEntryInfo(pagesPath, defaultTemplate);

    for (const entry of entries) {
      entry.layout ??= defaultLayoutPath;
      const runtimeEntryPath = path.resolve(tmpPath, `${entry.name}.tsx`);
      await writeRuntimeEntryFile(
        entry,
        runtimeEntryPath,
        api.context.rootPath,
      );
    }

    api.modifyRsbuildConfig((config) => {
      const { aliasAtToSrc = true } = options;

      const mergedConfig = mergeRsbuildConfig(config, {
        // 自动注入 alias
        ...(aliasAtToSrc
          ? {
              resolve: {
                alias: {
                  '@': path.resolve(api.context.rootPath, 'src'),
                },
              },
            }
          : {}),
        source: {
          entry: entries.reduce(
            (acc, entry) => {
              acc[entry.name] = path.resolve(tmpPath, `${entry.name}.tsx`);
              return acc;
            },
            {} as Record<string, string>,
          ),
        },
        html: {
          title: ({ entryName, value }) => {
            const entry = entries.find((entry) => entry.name === entryName);
            if (entry) {
              return entry.title ?? entry.name;
            }
            return value;
          },
          templateParameters: (options) => {
            const { entryName } = options;
            const entry = entries.find((entry) => entry.name === entryName);
            if (entry) {
              const locals: Record<string, unknown> = {};
              if (options.locals ?? true) {
                // @ts-expect-error dynamic localsName
                locals[options.localsName ?? 'locals'] =
                  entry?.pageConfig ?? {};
              }
              return { ...(entry?.pageConfig ?? {}), ...locals };
            }
          },
          template: ({ entryName }) => {
            const entry = entries.find((entry) => entry.name === entryName);
            if (entry) {
              return entry.template ?? defaultTemplate;
            }
          },
        },
      });
      return mergedConfig;
    });
  },
});
