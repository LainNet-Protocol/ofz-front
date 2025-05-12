// Load environment variables from parent directory first
require('./config/load-env');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // This ensures Next.js generates HTML files for all your routes
  // in the static export
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
