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
