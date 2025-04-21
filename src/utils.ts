import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import pkgUp from './compiled/pkg-up/index.js';
import semver from './compiled/semver/index.js';

/**
 * 判断是否是函数
 */
export function isFunction(func: unknown): boolean {
  return !!func && {}.toString.call(func) === '[object Function]';
}

/**
 * 获取 react 的版本号
 */
export const getReactVersion = (cwd: string): string | false => {
  const pkgPath = pkgUp.sync({ cwd });

  if (!pkgPath) {
    return false;
  }

  const pkgInfo = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = {
    ...pkgInfo.devDependencies,
    ...pkgInfo.dependencies,
  };

  if (typeof deps.react !== 'string') {
    return false;
  }
  try {
    const require = createRequire(import.meta.url);
    const reactPath = require.resolve('react/package.json', { paths: [cwd] });

    const reactVersion = JSON.parse(fs.readFileSync(reactPath, 'utf8')).version;

    return reactVersion;
  } catch (error) {
    console.error('Failed to resolve React version:', error);
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
