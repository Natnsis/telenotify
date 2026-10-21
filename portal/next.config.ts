import type { NextConfig } from 'next';

// The portal calls the API through /api/*, so session cookies stay first-party
// and no CORS setup is needed. Rewrites are fixed at build time, so API_URL
// must be set when building the production image.
const apiUrl = process.env.API_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
