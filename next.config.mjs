/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/ops',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/ops',
  },
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
};

export default nextConfig;
