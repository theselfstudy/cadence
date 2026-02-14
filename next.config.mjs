/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/cadence',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
