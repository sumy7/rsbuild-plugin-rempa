/**
 * 判断是否是函数
 */
export function isFunction(func: unknown): boolean {
  return !!func && {}.toString.call(func) === '[object Function]';
}
