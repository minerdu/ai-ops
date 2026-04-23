/**
 * Next.js basePath 工具
 *
 * 在多应用部署（/ops, /fran, /train, /growth）时，
 * 客户端 fetch 调用需要加上 basePath 前缀。
 *
 * 用法:
 *   import { apiFetch } from '@/lib/basePath';
 *   const res = await apiFetch('/api/customers');
 */

/** 当前应用的 basePath，由 next.config.mjs 定义 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * 带 basePath 前缀的 fetch 封装
 * @param {string} path  - 以 / 开头的路径，如 '/api/customers'
 * @param {RequestInit} options - fetch 选项
 */
export function apiFetch(path, options) {
  const url = path.startsWith('/') ? `${basePath}${path}` : path;
  return fetch(url, options);
}

export default basePath;
