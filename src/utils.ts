import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import pkgUp from './compiled/pkg-up/index.js';
import semver from './compiled/semver/index.js';

/**
 * 判断是否是函数
 */
export function isFunction(func: unknown): boolean {
  return !!func && {}.toString.call(func) === '[object Function]';
}

/** 从应用声明和安装的包自动选择框架，显式配置优先。 */
export function resolveFramework(
  cwd: string,
  framework?: 'react' | 'vue',
): 'react' | 'vue' {
  if (framework) {
    return framework;
  }
  const pkgPath = pkgUp.sync({ cwd });
  if (pkgPath) {
    const pkgInfo = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = { ...pkgInfo.devDependencies, ...pkgInfo.dependencies };
    if (typeof deps.react === 'string') {
      return 'react';
    }
    if (typeof deps.vue === 'string') {
      return 'vue';
    }
  }
  const require = createRequire(path.resolve(cwd, 'package.json'));
  for (const candidate of ['react', 'vue'] as const) {
    try {
      require.resolve(`${candidate}/package.json`, { paths: [cwd] });
      return candidate;
    } catch {
      // Continue with the other framework when the app cannot resolve this package.
    }
  }
  return 'react';
}

/** 获取应用实际安装的 React 版本，包括 workspace 提升的依赖。 */
export const getReactVersion = (cwd: string): string | false => {
  try {
    const require = createRequire(path.resolve(cwd, 'package.json'));
    const reactPath = require.resolve('react/package.json', { paths: [cwd] });
    return JSON.parse(fs.readFileSync(reactPath, 'utf8')).version;
  } catch {
    return false;
  }
};

/**
 * 判断 React 版本是否是 18
 */
export const isReact18 = (cwd: string = process.cwd()) => {
  const reactVersion = getReactVersion(cwd);

  if (!reactVersion) {
    return false;
  }
  const minVersion = semver.minVersion(reactVersion);
  return minVersion ? semver.gte(minVersion, '18.0.0') : false;
};
