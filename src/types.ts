/**
 * 页面 entry 配置
 */
export interface PageEntry {
  // entry 名称
  name: string;
  // entry 的最终路径
  entryPath: string;
  // layout
  layout: string;
  // 标题
  title: string;
  // index.html 路径
  template: string;
  // 传递给 template 的配置
  pageConfig: Record<string, unknown>;
}

/**
 * 插件配置
 */
export type PluginRempaOptions = {
  /**
   * 默认的 template 路径
   */
  template?: string;
  /**
   * 默认的 layout 路径
   */
  layout?: string;
  /**
   * 生成 mpa 文件扫描的目录，相对于当前工作目录
   * @default src/pages
   */
  pagesPath?: string;
  /**
   * 是否自动注入 alias @ -> src
   * @default true
   */
  aliasAtToSrc?: boolean;
  /**
   * 是否注入 locals
   */
  locals?: boolean;
  /**
   * 注入的 locals 名称
   */
  localsName?: string;
};
