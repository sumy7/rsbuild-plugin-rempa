import type { RsbuildPlugin, RsbuildPluginAPI } from "@rsbuild/core";
import { glob } from "glob";
import * as fs from "node:fs";
import * as path from "node:path";

export type PluginRempaOptions = {};

interface PageEntry {
  name: string;
  entryPath: string;
  layout: string;
  title: string;
  template: string;
  pageConfig: Record<string, any>;
}

function isFunction(func: any): boolean {
  return func && {}.toString.call(func) === "[object Function]";
}

const DEFAULT_MOUNT_ELEMENT_ID = "root";

function getDefaultTemplate(): string {
  const defaultTemplate1 = path.resolve(process.cwd(), "index.html");
  const defaultTemplate2 = path.resolve(process.cwd(), "public/index.html");
  if (fs.existsSync(defaultTemplate1)) {
    return defaultTemplate1;
  }
  if (fs.existsSync(defaultTemplate2)) {
    return defaultTemplate2;
  }
  return "";
}

function writeDefaultLayout(tmpPath: string): string {
  const defaultLayoutPath = path.resolve(tmpPath, "DefaultLayout.tsx");
  const defaultLayout = `import React from 'react';

const DefaultLayout: React.FC = ({ children }) => {
  return <>{children}</>;
};

export default DefaultLayout;
`
  fs.writeFileSync(defaultLayoutPath, defaultLayout);
  return defaultLayoutPath;
}

async function collectionEntryInfo(pagesPath: string): Promise<PageEntry[]> {
  const entries: PageEntry[] = [];
  // 查找目录下所有的 config.json 文件
  const files = await glob("**/config.json", { cwd: pagesPath });
  for (const file of files) {
    const name = file.replace(/\/config\.json$/, "");
    const pagePath = path.resolve(pagesPath, file);
    const entryPath = path.resolve(pagesPath, name, "index.tsx");
    const { layout, title, template, ...config } = JSON.parse(
      fs.readFileSync(pagePath, "utf-8")
    );
    entries.push({
      name,
      entryPath,
      layout: layout,
      title: title || "rsbuild",
      template: template ?? getDefaultTemplate(),
      pageConfig: {
        title: title || "rsbuild",
        mountElementId: DEFAULT_MOUNT_ELEMENT_ID,
        ...config,
      },
    });
  }
  return entries;
}

async function writeRuntimeEntryFile(
  pageEntry: PageEntry,
  runtimeEntryPath: string
) {
  const runtimeEntryFile = `// @ts-nocheck
import React from 'react';
import ReactDOM from 'react-dom';
import App from '${pageEntry.entryPath}';
import Layout from '${pageEntry.layout}';
ReactDOM.render(<Layout><App /></Layout>, document.getElementById('${
    pageEntry.pageConfig.mountElementId || DEFAULT_MOUNT_ELEMENT_ID
  }'));`;
  fs.writeFileSync(runtimeEntryPath, runtimeEntryFile);
}

export const pluginRempa = (
  options: PluginRempaOptions = {}
): RsbuildPlugin => ({
  name: "plugin-rempa",

  async setup(api: RsbuildPluginAPI) {
    console.log("Hello Rsbuild!", options);
    const tmpPath = path.resolve(
      process.cwd(),
      "node_modules",
      ".cache",
      "rsbuild-plugin-rempa"
    );
    console.log("tmpPath", tmpPath);
    if (!fs.existsSync(tmpPath)) {
      fs.mkdirSync(tmpPath, { recursive: true });
    }

    const defaultLayoutPath = writeDefaultLayout(tmpPath);

    const pagesPath = path.resolve(api.context.rootPath, "src", "pages");
    console.log("pagesPath", pagesPath);
    const entries = await collectionEntryInfo(pagesPath);
    console.log("entries", entries);

    for (const entry of entries) {
      entry.layout ??= defaultLayoutPath;
      console.log(entry.layout)
      const runtimeEntryPath = path.resolve(tmpPath, `${entry.name}.tsx`);
      await writeRuntimeEntryFile(entry, runtimeEntryPath);
    }

    api.modifyRsbuildConfig((config) => {
      config.source = config.source ?? {};
      config.source.alias = config.source.alias ?? {};
      // @ts-ignore
      config.source.alias["@"] = path.resolve(api.context.rootPath, "src");

      config.source.entry = config.source.entry ?? {};
      entries.forEach((entry) => {
        config.source!.entry![entry.name] = path.resolve(
          tmpPath,
          `${entry.name}.tsx`
        );
      });

      config.html = config.html ?? {};
      const beforeHtmlTitle = config.html.title ?? "rsbuild";
      config.html.title = ({ entryName, value }) => {
        const entry = entries.find((entry) => entry.name === entryName);
        if (entry) {
          return entry.title ?? "rsbuild";
        } else if (isFunction(beforeHtmlTitle)) {
          return (beforeHtmlTitle as any)({ entryName, value });
        } else {
          return beforeHtmlTitle;
        }
      };

      const beforeHtmlTemplateParameters = config.html.template ?? {};
      config.html.templateParameters = (options) => {
        const { entryName } = options;
        const entry = entries.find((entry) => entry.name === entryName);
        if (entry) {
          return entry?.pageConfig ?? {};
        } else if (isFunction(beforeHtmlTemplateParameters)) {
          return (beforeHtmlTemplateParameters as any)(options);
        } else {
          return beforeHtmlTemplateParameters;
        }
      };

      const beforeHtmlTemplate = config.html.template ?? getDefaultTemplate();
      config.html.template = ({ entryName, value }) => {
        const entry = entries.find((entry) => entry.name === entryName);
        if (entry) {
          return entry.template ?? getDefaultTemplate();
        } else if (isFunction(beforeHtmlTemplate)) {
          return (beforeHtmlTemplate as any)({ entryName, value });
        } else {
          return beforeHtmlTemplate;
        }
      };
    });
  },
});
