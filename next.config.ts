import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // 配置静态导出（用于 GitHub Pages 等静态托管）
  output: 'export',
  // 图片优化配置（静态导出时禁用）
  images: {
    unoptimized: true,
  },
  // 路由配置
  trailingSlash: true,
  // GitHub Pages 部署到子路径时的配置（仅在构建时启用）
  ...(process.env.NODE_ENV === 'production' ? {
    basePath: '/voidpix',
    assetPrefix: '/voidpix',
  } : {}),
};

export default nextConfig;
